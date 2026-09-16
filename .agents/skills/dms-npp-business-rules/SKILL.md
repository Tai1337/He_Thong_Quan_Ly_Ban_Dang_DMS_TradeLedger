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

## 2. Quy trình Đơn mua hàng & Nhập kho đặt hàng (Purchase Order & Inbound Receiving Flow)

```
[Lập Đơn mua hàng PO] → PO (WAITING_RECEIVE) + DeliveryTrip INBOUND (SHIPPING, D+3)
                         ↓
[Ngày D+3 Hàng về] → Kế toán/Thủ kho kiểm đếm thực tế
                         ↓
               Nhận một phần hay toàn bộ?
                ├── Nhận đủ: PO (COMPLETED) + Trip (COMPLETED)
                └── Nhận một phần: PO (PARTIALLY_RECEIVED) + Trip (SHIPPING)
```

**Quy tắc Nhập kho theo Chuyến xe hàng về (Inbound Goods Receiving):**
- Màn hình `/purchase/receiving`: Lọc các chuyến xe hàng về (`tripType: INBOUND`) đã đến hoặc quá ngày giao dự kiến (`expectedDeliveryDate <= TODAY`).
- Khi tiến hành Nhập kho (`POST /api/purchase/receiving/trips/:tripId/receive`):
  1. Cập nhật số lượng thực nhận tích lũy vào `purchase_order_items.quantity_received`.
  2. Tạo hoặc tìm kiếm `stock_lots`:
     - Trạng thái bắt buộc: `GOOD` (thuộc enum `StockStatus` gồm `GOOD`, `DEFECTIVE`, `EXPIRED`).
     - Ghi nhận `manufacture_date` (NSX) và `expiry_date` (HSD).
  3. Cập nhật tồn kho thực tế: Tăng `quantity_on_hand` trong bảng `stock_balances`.
  4. Ghi nhận giao dịch kho: Tạo bản ghi trong `inventory_transactions` với `direction: 'IN'`, `reference_type: 'PURCHASE_ORDER'`.
  5. Cập nhật trạng thái:
     - Nếu tất cả items trong PO đã nhận đủ (`quantity_received >= quantity`) → PO chuyển `COMPLETED`. Ngược lại nếu đã nhận $> 0$ → `PARTIALLY_RECEIVED`.
     - Nếu tất cả PO thuộc chuyến xe đã hoàn tất → Chuyến xe chuyển `COMPLETED`.

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

## 5. Quy trình Mua Hàng & Nhập Kho Đặt Hàng (Purchase Order Flow)

Quy trình vận hành mua hàng từ Nhà cung cấp:

```
[Lập Đơn PO] → [Xác nhận & Điều phối Chuyến xe] → [Vận chuyển D+3] → [Hàng Về Kho NPP]
  - Tạo PO theo NCC & Kho    - Lập lịch giao hàng      - Theo dõi hành trình      - Kiểm đếm thực tế
  - Trạng thái WAITING_RECEIVE - Gắn chuyến xe INBOUND - Trạng thái SHIPPING      - Cập nhật Lô/HSD & Tăng tồn
```

### Chi tiết các bước:
1. **Lập Đơn mua hàng (Purchase Order):**
   - NPP lập đơn mua hàng từ Nhà cung cấp, chỉ định kho nhận và danh sách SKU cần nhập.
   - PO được khởi tạo với trạng thái `WAITING_RECEIVE` cùng thông tin điều phối chuyến xe.

2. **Tiếp nhận & Nhập kho (Inbound Goods Receiving):**
   - Khi chuyến xe giao hàng đến kho NPP, thủ kho / kế toán kiểm đếm thực tế.
   - Nhập số lượng thực nhận cho từng SKU, cập nhật Lô hàng (Batch Code), Ngày sản xuất (MFG Date), Hạn sử dụng (EXP Date).
   - Hệ thống tự động tạo `inventory_transaction` loại `IN` và tăng tồn kho khả dụng theo lô (FEFO).


## 6. Phân quyền người dùng

| Role code | Quyền truy cập |
|-----------|---------------|
| ADMIN | Toàn quyền hệ thống, quản lý tất cả NPP |
| NPP_MANAGER | Quản lý trong phạm vi NPP của mình |
| SALES | Tạo đơn hàng, xem báo cáo NPP của mình |
| WAREHOUSE_KEEPER | Quản lý kho, nhận hàng, kiểm kê |
| DRIVER | Xem chuyến giao hàng của mình, xác nhận giao hàng |
| ASM | Xem và duyệt đơn mua/bán hàng, xem báo cáo toàn vùng |

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
