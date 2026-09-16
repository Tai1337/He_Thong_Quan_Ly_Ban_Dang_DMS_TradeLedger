---
name: dms-npp-database-schema
description: >
  Cung cấp chi tiết 27 bảng CSDL của hệ thống DMS-NPP.
  Kích hoạt khi người dùng hỏi về cấu trúc database, cần viết Prisma query,
  cần hiểu quan hệ giữa các bảng, hoặc cần thêm/sửa trường trong schema.
---

# DMS-NPP Database Schema Reference

Toàn bộ schema được định nghĩa tại: `backend/prisma/schema.prisma`  
Database: MySQL, db name: `dms_npp` (Tổng cộng 39 bảng)

---

## Nhóm 1: Danh mục (Master Data)

### `roles` – Vai trò người dùng
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | BigInt PK | Auto increment |
| code | VarChar(30) UNIQUE | Ví dụ: ADMIN, SALES, DRIVER |
| name | VarChar(100) | Tên vai trò |
| created_at | DateTime | |

### `distributors` – Nhà phân phối (NPP)
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | BigInt PK | |
| code | VarChar(20) UNIQUE | Mã NPP |
| name | VarChar(200) | |
| address | VarChar(255)? | |
| phone | VarChar(20)? | |
| status | Boolean | true = hoạt động |
| created_at / updated_at | DateTime | |

### `users` – Người dùng hệ thống
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | BigInt PK | |
| distributor_id | BigInt? FK | null nếu là user hệ thống |
| role_id | BigInt FK | → roles.id |
| username | VarChar(50) UNIQUE | Dùng để đăng nhập |
| password_hash | VarChar(255) | bcrypt hash |
| full_name | VarChar(150) | |
| phone | VarChar(20)? | |
| email | VarChar(255)? | |
| status | Boolean | true = active |
| created_at / updated_at | DateTime | |

### `product_categories` – Danh mục sản phẩm (cây phân cấp)
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | BigInt PK | |
| name | VarChar(150) | |
| parent_id | BigInt? FK | Self-reference: → product_categories.id |

### `products` – Sản phẩm (SKU)
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | BigInt PK | |
| sku | VarChar(30) UNIQUE | Mã SKU |
| name | VarChar(200) | |
| category_id | BigInt? FK | → product_categories.id |
| unit | VarChar(20) | Mặc định: THÙNG |
| base_price | Decimal(14,2) | |
| status | Boolean | |
| created_at / updated_at | DateTime | |

### `suppliers` – Nhà cung cấp
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | BigInt PK | |
| code | VarChar(20) UNIQUE | |
| name | VarChar(200) | |
| address | VarChar(255)? | |
| phone | VarChar(20)? | |
| status | Boolean | |

### `retailers` – Đại lý / Điểm bán lẻ
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | BigInt PK | |
| distributor_id | BigInt FK | → distributors.id |
| code | VarChar(20) | UNIQUE với distributor |
| name | VarChar(200) | |
| address | VarChar(255)? | |
| phone | VarChar(20)? | |
| status | Boolean | |
| latitude | Decimal(10,7)? | **[Cải tiến]** Toạ độ |
| longitude | Decimal(10,7)? | **[Cải tiến]** Kinh độ |

### `warehouses` – Kho hàng
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | BigInt PK | |
| distributor_id | BigInt FK | → distributors.id |
| code | VarChar(30) | UNIQUE với distributor |
| name | VarChar(150) | |
| type | WarehouseType | SALES, HOLDING, VANSALE, DELIVERY |
| status | Boolean | |
| latitude | Decimal(10,7)? | **[Cải tiến]** Toạ độ |
| longitude | Decimal(10,7)? | **[Cải tiến]** Kinh độ |

---

## Nhóm 2: Tồn kho (Inventory)

### `stock_lots` – Lô hàng (tracking theo lô)
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | BigInt PK | |
| product_id | BigInt FK | → products.id |
| warehouse_id | BigInt FK | → warehouses.id |
| lot_number | VarChar(50) | Số lô |
| manufacture_date | Date? | Ngày SX |
| expiry_date | Date? | Ngày HSD |
| status | StockStatus | GOOD, DEFECTIVE, EXPIRED |
| UNIQUE | (product_id, warehouse_id, lot_number) | **[Cải tiến]** Bỏ status ra khỏi UNIQUE - đổi trạng thái bằng UPDATE thay vì tạo dòng mới |

### `stock_balances` – Số dư tồn kho theo lô
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| lot_id | BigInt PK FK | → stock_lots.id (1-1) |
| quantity_on_hand | Decimal(14,2) | Tổng tồn thực tế |
| quantity_reserved | Decimal(14,2) | Đang giữ chỗ (SO đã ALLOCATED chưa SHIPPED) |
| updated_at | DateTime | |

> **[Cải tiến]** Tồn khả dụng = `quantity_on_hand - quantity_reserved` (tính trong app, không lưu vào DB)

### `inventory_transactions` – Giao dịch nhập/xuất kho
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | BigInt PK | |
| transaction_code | VarChar(30) UNIQUE | |
| direction | TxnDirection | IN, OUT |
| lot_id | BigInt FK | → stock_lots.id |
| warehouse_id | BigInt FK | → warehouses.id |
| quantity | Decimal(14,2) | |
| unit_price | Decimal(14,2) | |
| reference_type | InventoryReferenceType | **[Cải tiến]** Enum thay vì VARCHAR tự do: SALES_ORDER, PURCHASE_ORDER, STOCK_TRANSFER, INVENTORY_ADJUSTMENT, INVENTORY_COUNT, PURCHASE_RETURN, MANUAL |
| reference_id | BigInt | ID của chứng từ gốc |
| created_by | BigInt? FK | → users.id |
| created_at | DateTime | |

---

## Nhóm 3: Đơn hàng bán (Sales)

### `sales_orders` – Đơn hàng bán (SO)
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | BigInt PK | |
| order_code | VarChar(30) UNIQUE | |
| distributor_id | BigInt FK | → distributors.id |
| retailer_id | BigInt FK | → retailers.id |
| warehouse_id | BigInt FK | → warehouses.id |
| order_type | OrderType | IMMEDIATE, LATER |
| status | SalesOrderStatus | PENDING → PAID |
| delivery_trip_id | BigInt? FK | → delivery_trips.id |
| created_by | BigInt? FK | → users.id |
| created_at / updated_at | DateTime | |

### `sales_order_items` – Chi tiết đơn hàng bán
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | BigInt PK | |
| sales_order_id | BigInt FK | → sales_orders.id (Cascade) |
| product_id | BigInt FK | → products.id |
| quantity | Decimal(14,2) | |
| unit_price | Decimal(14,2) | |
| is_promotion | Boolean | Hàng khuyến mãi |

### `order_status_history` – Lịch sử trạng thái đơn hàng
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | BigInt PK | |
| sales_order_id | BigInt FK | → sales_orders.id (Cascade) |
| from_status | SalesOrderStatus? | |
| to_status | SalesOrderStatus | |
| changed_by | BigInt? FK | → users.id |
| changed_at | DateTime | |

---

## Nhóm 4: Mua hàng (Purchase)

### `purchase_orders` – Lệnh mua hàng (PO)
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | BigInt PK | |
| po_code | VarChar(30) UNIQUE | Định dạng PO-YYYYMMDD-XXXX |
| distributor_id | BigInt FK | → distributors.id |
| warehouse_id | BigInt FK | → warehouses.id |
| supplier_id | BigInt? FK | → suppliers.id – Nhà cung cấp của đơn |
| delivery_trip_id | BigInt? FK | **[Cải tiến]** → delivery_trips.id – Chuyến xe vận chuyển hàng về |
| sales_order_id | BigInt? FK | **[Cải tiến]** → sales_orders.id – Đơn bán đối ứng từ NCC sang NPP |
| status | POStatus | WAITING_RECEIVE, PARTIALLY_RECEIVED, COMPLETED, CANCELLED |
| expected_date | Date? | |
| created_at / updated_at | DateTime | |

### `purchase_order_items` – Chi tiết PO
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | BigInt PK | |
| purchase_order_id | BigInt FK | Cascade → purchase_orders.id |
| product_id | BigInt FK | → products.id |
| quantity | Decimal(14,2) | Số lượng đặt mua |
| quantity_received | Decimal(14,2) | **[Cải tiến]** Số lượng thực nhận tích lũy tại kho |
| unit_price | Decimal(14,2) | Đơn giá |

### `purchase_returns` – Trả hàng nhà cung cấp (POR)
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | BigInt PK | |
| por_code | VarChar(30) UNIQUE | |
| distributor_id / supplier_id / warehouse_id | BigInt FK | |
| status | PORStatus | DRAFT → COMPLETED |
| expected_date | Date? | |
| created_at | DateTime | |

### `purchase_return_items` – Chi tiết POR
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | BigInt PK | |
| purchase_return_id | BigInt FK | Cascade |
| product_id | BigInt FK | |
| quantity | Decimal(14,2) | |
| confirmed_price | Decimal(14,2)? | |

---

## Nhóm 5: Vận chuyển & Điều phối kho

### `delivery_trips` – Chuyến giao nhận hàng (Inbound & Outbound)
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | BigInt PK | |
| trip_code | VarChar(30) UNIQUE | Định dạng TRIP-IN-... hoặc TRIP-OUT-... |
| trip_type | TripType | **[Cải tiến]** INBOUND (NCC về NPP), OUTBOUND (NPP đi Đại lý) |
| distributor_id | BigInt FK | → distributors.id |
| warehouse_id | BigInt FK | → warehouses.id |
| supplier_id | BigInt? FK | **[Cải tiến]** → suppliers.id (dành cho chuyến INBOUND) |
| driver_id | BigInt? FK | → users.id |
| expected_delivery_date | DateTime? | **[Cải tiến]** Ngày dự kiến giao hàng đến NPP ($D+3$) |
| status | TripStatus | WAITING_CONFIRM, ASSIGNED, SHIPPING, DELIVERED, COMPLETED, CLOSED |
| created_at / updated_at | DateTime | |
| Quan hệ | purchaseOrders | 1 Chuyến xe INBOUND chứa 1 hoặc nhiều PurchaseOrder |

### `stock_transfers` – Điều phối tồn kho
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | BigInt PK | |
| transfer_code | VarChar(30) UNIQUE | |
| transfer_type | TransferType | |
| from_distributor_id / to_distributor_id | BigInt FK | |
| from_warehouse_id / to_warehouse_id | BigInt FK | |
| status | DocStatus | |
| created_at | DateTime | |

### `stock_transfer_items` – Chi tiết điều phối
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | BigInt PK | |
| transfer_id | BigInt FK | Cascade |
| product_id | BigInt FK | |
| quantity | Decimal(14,2) | |

---

## Nhóm 6: Kiểm kê & Điều chỉnh

### `inventory_adjustments` – Điều chỉnh kho
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | BigInt PK | |
| adjustment_code | VarChar(30) UNIQUE | |
| distributor_id / warehouse_id | BigInt FK | |
| adjustment_type | AdjustmentType | IMPORT, EXPORT, STATUS_CHANGE, SKU_CHANGE |
| status | DocStatus | |
| reason | VarChar(255)? | |
| created_by | BigInt? FK | → users.id |
| created_at | DateTime | |

### `inventory_adjustment_items` – Chi tiết điều chỉnh
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | BigInt PK | |
| adjustment_id | BigInt FK | Cascade |
| lot_id | BigInt FK | |
| quantity | Decimal(14,2) | |
| from_status / to_status | StockStatus? | |
| new_product_id | BigInt? FK | Dùng khi SKU_CHANGE |

### `inventory_counts` – Phiếu kiểm kê
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | BigInt PK | |
| count_code | VarChar(30) UNIQUE | |
| distributor_id / warehouse_id | BigInt FK | |
| count_type | CountType | MONTHLY, BY_SKU |
| status | DocStatus | |
| created_at | DateTime | |

### `inventory_count_items` – Chi tiết kiểm kê
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | BigInt PK | |
| count_id | BigInt FK | Cascade |
| lot_id | BigInt FK | |
| system_quantity | Decimal(14,2) | Tồn theo hệ thống |
| actual_quantity | Decimal(14,2)? | Tồn thực đếm |
| variance | Decimal(14,2)? | = actual - system |

---

## Nhóm 7: Hoá đơn & Thanh toán [CẢI TIẾN]

### `invoices` – Hoá đơn bán hàng
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | BigInt PK | |
| invoice_code | VarChar(30) UNIQUE | |
| sales_order_id | BigInt FK UNIQUE | → sales_orders.id (1-1) |
| distributor_id | BigInt FK | → distributors.id |
| invoice_date | Date | Ngày xuất hoá đơn |
| due_date | Date | Hạn công nợ |
| subtotal | Decimal(14,2) | Giá trị trước thuế |
| vat_rate | Decimal(5,4) | Mặc định 0.10 (10%) |
| vat_amount | Decimal(14,2) | Tiền thuế |
| total_amount | Decimal(14,2) | Tổng cộng |
| paid_amount | Decimal(14,2) | Đã thu |
| status | InvoiceStatus | UNPAID, PARTIALLY_PAID, PAID, OVERDUE |
| created_at / updated_at | DateTime | |

### `payments` – Lịch sử thanh toán
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | BigInt PK | |
| invoice_id | BigInt FK | → invoices.id |
| amount | Decimal(14,2) | Số tiền thanh toán |
| payment_method | PaymentMethod | CASH, BANK_TRANSFER, CHECK |
| payment_date | Date | Ngày thanh toán |
| note | VarChar(255)? | |
| created_at | DateTime | |

---

## Nhóm 8: Khuyến mãi [Đa Hình 4 Chiến Lược]

Hỗ trợ 4 loại chương trình khuyến mãi theo `promotion_type`: `PERCENTAGE`, `COMBO`, `BUY_N_GET_M`, `INVOICE_DISCOUNT`.

### `promotions` – Bảng khuyến mãi gốc
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | BigInt PK | |
| distributor_id | BigInt FK | → distributors.id |
| promotion_type | PromotionType | PERCENTAGE, COMBO, BUY_N_GET_M, INVOICE_DISCOUNT |
| name | VarChar(200) | Tên chương trình KM |
| description | Text? | Mô tả chi tiết |
| start_date / end_date | Date | Thời gian áp dụng |
| status | Boolean | |
| created_at / updated_at | DateTime | |

### Các bảng chi tiết theo từng loại khuyến mãi:
- `promotion_percentage_discounts`: Giảm `%` theo dòng sản phẩm (kèm `max_quantity_per_order`).
- `promotion_percentage_products`: Phạm vi sản phẩm áp dụng giảm `%`.
- `promotion_combos`: Bán combo với giá cố định `combo_price`.
- `promotion_combo_items`: Danh sách sản phẩm & số lượng trong combo.
- `promotion_buy_n_get_m`: Mua N tặng M (`buy_quantity`, `free_quantity`).
- `promotion_buy_n_get_m_items`: Cặp sản phẩm mua và sản phẩm tặng kèm.
- `promotion_invoice_discounts`: Giảm giá trên tổng đơn hàng (`min_order_amount`, `discount_percent`, `discount_amount`).

---

## Các quy tắc Prisma query quan trọng

```js
// ✅ Đúng - Convert BigInt
const result = await prisma.salesOrder.findMany();
return result.map(r => ({ ...r, id: r.id.toString() }));

// ✅ Đúng - Include relations
const order = await prisma.salesOrder.findUnique({
  where: { id: BigInt(req.params.id) },
  include: { items: { include: { product: true } }, retailer: true }
});

// ✅ Đúng - Filter theo distributor (data isolation)
const orders = await prisma.salesOrder.findMany({
  where: { distributorId: BigInt(user.distributorId) }
});

// ✅ Đúng - Pagination
const page = parseInt(req.query.page) || 1;
const limit = 20;
const orders = await prisma.salesOrder.findMany({
  skip: (page - 1) * limit,
  take: limit,
  orderBy: { createdAt: 'desc' }
});

// ✅ Đúng - Kiểm tra tồn kho khả dụng (tránh oversell)
const balance = await prisma.stockBalance.findUnique({ where: { lotId: BigInt(lotId) } });
const available = balance.quantityOnHand - balance.quantityReserved;
if (available < requiredQty) throw new Error('Tồn kho không đủ');
```

```js
// ✅ Đúng - Convert BigInt
const result = await prisma.salesOrder.findMany();
return result.map(r => ({ ...r, id: r.id.toString() }));

// ✅ Đúng - Include relations
const order = await prisma.salesOrder.findUnique({
  where: { id: BigInt(req.params.id) },
  include: { items: { include: { product: true } }, retailer: true }
});

// ✅ Đúng - Filter theo distributor (data isolation)
const orders = await prisma.salesOrder.findMany({
  where: { distributorId: BigInt(user.distributorId) }
});

// ✅ Đúng - Pagination
const page = parseInt(req.query.page) || 1;
const limit = 20;
const orders = await prisma.salesOrder.findMany({
  skip: (page - 1) * limit,
  take: limit,
  orderBy: { createdAt: 'desc' }
});
```
