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
[11:00 Chốt PPO] → PO (WAITING_RECEIVE) + DeliveryTrip INBOUND (SHIPPING, D+3)
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

## 5. Quy trình Đề xuất Mua hàng Tự động & Chốt đơn (Automated PPO Flow)

Quy trình vận hành hàng ngày của hệ thống quản lý mua hàng PPO (Purchase Plan Order):

```
09:00                     09:00 - 11:00                      11:00                     D+3
[ROP Engine Phân Tích] → [Khung Giờ Vàng Kế Toán] → [Hệ Thống Tự Động Chốt Đơn] → [Hàng Về NPP]
  - Tự động sinh PPO       - Chỉ được GIẢM số lượng   - Gom nhóm theo NCC & Kho    - Nhập kho thực tế
  - Priority HIGH/MED/LOW  - CẤM TĂNG trên hệ thống   - Tạo PO (WAITING_RECEIVE)   - Cập nhật Lô/HSD
                           - Ngoài khung giờ: Khóa     - Tạo SO (ALLOCATED)         - Tăng tồn kho
                                                      - Tạo Chuyến xe D+3 (INBOUND)
```

### Chi tiết các mốc thời gian & Quy tắc bắt buộc:
1. **09:00 Hàng ngày – Kích hoạt ROP Engine:**
   - Hệ thống tự động quét các SKU có tồn khả dụng (Available = On Hand - Reserved) $\le$ Điểm đặt hàng lại (ROP = Safety Stock + Demand * LeadTime).
   - Tự động tạo các đề xuất mua hàng `ppo_suggestions` với trạng thái `NEW`, tính toán `suggested_qty` và xếp mức ưu tiên (`HIGH`, `MEDIUM`, `LOW`).

2. **09:00 - 11:00 – Khung giờ vàng Kế toán rà soát (Review Window):**
   - Kế toán NPP truy cập màn hình `/purchase/ppo` để kiểm tra các mặt hàng đề xuất.
   - **QUY TẮC BẤT BIẾN:** Kế toán **CHỈ ĐƯỢC PHÉP GIẢM** số lượng đặt hàng (`finalQty <= suggestedQty`).
   - Hệ thống chặn cứng: Nếu cố tình nhập $finalQty > suggestedQty$ $\to$ Ném lỗi validation 400 và UI không cho phép lưu.
   - **Lý do nghiệp vụ:** Mọi nhu cầu mua tăng thêm so với thuật toán ROP định mức phải được thỏa thuận ngoài hệ thống trước khi đặt bổ sung.
   - Ngoài khung giờ 09:00 - 11:00: Hệ thống tự động khóa tính năng chỉnh sửa số lượng (`windowStatus.isWindowActive = false`).

3. **11:00 Hàng ngày – Hệ thống tự động Chốt đơn (Auto Closing Engine):**
   - Hệ thống thu thập toàn bộ các đề xuất PPO đang ở trạng thái `NEW` hoặc `VIEWED`.
   - Gom nhóm (Group by) các đề xuất theo **Nhà cung cấp (`supplierId`)** và **Kho nhận (`warehouseId`)**.
   - Với mỗi nhóm, hệ thống tạo đồng bộ:
     * **01 Chuyến xe giao hàng INBOUND (`delivery_trips`):** `tripType = 'INBOUND'`, `status = 'SHIPPING'`, ngày dự kiến giao `expectedDeliveryDate = Today + 3 ngày` (Mô hình giao hàng $D+3$).
     * **01 Đơn đặt mua hàng (`purchase_orders`):** `status = 'WAITING_RECEIVE'`, gắn khóa ngoại `deliveryTripId` trỏ đến chuyến xe vừa tạo.
     * **01 Đơn bán hàng đối ứng (`sales_orders`):** `status = 'ALLOCATED'`, đại diện cho đơn xuất từ NCC sang NPP.
   - Chuyển toàn bộ các bản ghi `ppo_suggestions` đã chốt sang trạng thái `APPROVED` và gắn `purchaseOrderId`.


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
