---
name: dms-npp-business-rules
description: >
  Tài liệu hóa các quy tắc nghiệp vụ quan trọng của hệ thống DMS-NPP.
  Kích hoạt khi người dùng cần hiểu luồng xử lý đơn hàng, quy trình kho hàng,
  logic phân quyền, hay bất kỳ quy tắc nghiệp vụ nào của hệ thống.
---

# DMS-NPP Business Rules

## 1. Quy trình Đơn hàng bán (Sales Order Flow)

```
PENDING → SUBMITTED → ALLOCATED → SHIPPED → DELIVERED → INVOICED → PAID
                                                                   ↘ CANCELLED (từ bất kỳ bước nào)
```

| Trạng thái | Ý nghĩa | Ai thực hiện |
|-----------|---------|-------------|
| PENDING | Vừa tạo, chờ xác nhận | Hệ thống tự tạo |
| SUBMITTED | Đã submit, chờ phân bổ kho | Sale person |
| ALLOCATED | Đã phân bổ lô hàng | Thủ kho |
| SHIPPED | Đã giao cho tài xế | Thủ kho / Điều phối |
| DELIVERED | Đã giao đến đại lý | Tài xế xác nhận |
| INVOICED | Đã xuất hóa đơn | Kế toán |
| PAID | Đã thanh toán | Kế toán |
| CANCELLED | Hủy đơn | Quản lý |

**Quy tắc bắt buộc:**
- Mỗi thay đổi trạng thái PHẢI ghi vào `order_status_history`
- Khi ALLOCATED: trừ tồn kho (`stock_balances`) và tạo `inventory_transaction` (direction: OUT)
- Khi CANCELLED sau ALLOCATED: hoàn kho lại (direction: IN)

---

## 2. Quy trình Đơn mua hàng (Purchase Order Flow)

```
WAITING_RECEIVE → PARTIALLY_RECEIVED → COMPLETED
                                     ↘ CANCELLED
```

**Quy tắc:**
- Khi nhận hàng: tạo `stock_lot` (nếu chưa có), cập nhật `stock_balances`, tạo `inventory_transaction` (direction: IN)
- Nếu số lượng nhận < đặt hàng → PARTIALLY_RECEIVED
- Nếu đủ hoặc hết → COMPLETED

---

## 3. Quy trình Kiểm kê (Inventory Count Flow)

```
DRAFT → WAITING_APPROVAL → APPROVED → COMPLETED
                        ↘ REJECTED
```

**Quy tắc:**
- Khi APPROVED: hệ thống tự động tạo `inventory_adjustment` để điều chỉnh `stock_balances` theo `actual_quantity`
- `variance = actual_quantity - system_quantity`
- Variance âm → xuất kho, Variance dương → nhập kho

---

## 4. Quy trình Điều phối kho (Stock Transfer Flow)

```
DRAFT → WAITING_APPROVAL → APPROVED → COMPLETED
                        ↘ REJECTED
```

**Quy tắc:**
- Khi APPROVED: trừ `stock_balances` tại `from_warehouse`, cộng vào `to_warehouse`
- Phải tạo 2 `inventory_transaction`: 1 OUT tại from, 1 IN tại to

---

## 5. Quy trình Đề nghị đặt hàng (PPO Flow)

```
PROPOSED → NPP_CONFIRMED → ASM_CONFIRMED → PO_CREATED
                       ↘ CANCELLED
```

**Quy tắc:**
- NPP xác nhận số lượng của mình
- ASM có thể điều chỉnh số lượng (`adjusted_quantity`)
- Khi ASM_CONFIRMED → tự động tạo `purchase_order`

---

## 6. Phân quyền người dùng

| Role code | Quyền truy cập |
|-----------|---------------|
| ADMIN | Toàn quyền hệ thống, quản lý tất cả NPP |
| NPP_MANAGER | Quản lý trong phạm vi NPP của mình |
| SALES | Tạo đơn hàng, xem báo cáo NPP của mình |
| WAREHOUSE_KEEPER | Quản lý kho, nhận hàng, kiểm kê |
| DRIVER | Xem chuyến giao hàng của mình, xác nhận giao hàng |
| ASM | Xem và duyệt PPO, xem báo cáo toàn vùng |

**Quy tắc data isolation (cực kỳ quan trọng):**
- User có `distributor_id` chỉ được xem/thao tác dữ liệu của NPP đó
- ADMIN không có `distributor_id`, được xem toàn bộ
- Mọi query phải filter theo `distributorId` nếu user không phải ADMIN

---

## 7. Đăng nhập độc quyền (Single Session)

- Mỗi tài khoản chỉ được đăng nhập từ **1 thiết bị duy nhất**
- Khi đăng nhập thiết bị mới → thiết bị cũ nhận `FORCE_LOGOUT` qua WebSocket
- Thiết bị cũ phải về trang đăng nhập ngay lập tức

---

## 8. Quy tắc tạo mã chứng từ (Document Code)

Tất cả mã chứng từ phải unique và theo format:

| Chứng từ | Format | Ví dụ |
|----------|--------|-------|
| Sales Order | `SO-YYYYMMDD-XXXXX` | SO-20260808-00001 |
| Purchase Order | `PO-YYYYMMDD-XXXXX` | PO-20260808-00001 |
| Delivery Trip | `TRIP-YYYYMMDD-XXXXX` | TRIP-20260808-00001 |
| Purchase Return | `POR-YYYYMMDD-XXXXX` | POR-20260808-00001 |
| Stock Transfer | `TRANS-YYYYMMDD-XXXXX` | TRANS-20260808-00001 |
| Inventory Adjustment | `ADJ-YYYYMMDD-XXXXX` | ADJ-20260808-00001 |
| Inventory Count | `COUNT-YYYYMMDD-XXXXX` | COUNT-20260808-00001 |
| Purchase Plan Order | `PPO-YYYYMMDD-XXXXX` | PPO-20260808-00001 |

```js
// Helper function tạo mã chứng từ
const generateCode = (prefix) => {
  const date = new Date();
  const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  return `${prefix}-${yyyymmdd}-${rand}`;
};
```

---

## 9. Tracking tồn kho (Inventory Tracking Rules)

- Tồn kho được theo dõi theo **lô (lot)**: mỗi sản phẩm + kho + số lô = 1 `stock_lot`
- `stock_balances` là bảng lưu số dư hiện tại (denormalized, dùng để query nhanh)
- `inventory_transactions` là lịch sử toàn bộ biến động (không bao giờ xóa)
- Tổng IN - tổng OUT của 1 lot PHẢI luôn bằng `stock_balances.quantity`

---

## 10. Quy tắc hàng hết hạn (Expiry Management)

- Hàng có `expiry_date` < ngày hiện tại → status phải là `EXPIRED` (không thể bán)
- Hàng `status = DEFECTIVE` → không thể bán, chỉ có thể trả lại hoặc hủy
- Khi bán hàng (ALLOCATED) → ưu tiên lấy lô có `expiry_date` gần nhất (FEFO: First Expired First Out)
