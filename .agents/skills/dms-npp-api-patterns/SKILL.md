---
name: dms-npp-api-patterns
description: >
  Hướng dẫn các mẫu code (patterns) chuẩn để viết API mới cho hệ thống DMS-NPP.
  Kích hoạt khi người dùng muốn thêm API endpoint mới, viết controller,
  thiết lập route, hoặc xử lý error trong backend.
---

# DMS-NPP API Development Patterns

## Quy trình thêm API mới (Bắt buộc theo thứ tự)

```
1. Tạo controller:  server/controllers/{tên}Controller.js
2. Tạo routes:      server/routes/{tên}Routes.js
3. Đăng ký vào:     server/index.js
4. Thêm hàm fetch:  src/services/api.js
```

---

## Mẫu Controller chuẩn

```js
// server/controllers/salesOrderController.js
import prisma from '../config/prisma.js';

// GET list với pagination và filter
export const getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, distributorId } = req.query;

    const where = {};
    if (status) where.status = status;
    if (distributorId) where.distributorId = BigInt(distributorId);

    const [orders, total] = await Promise.all([
      prisma.salesOrder.findMany({
        where,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          retailer: true,
          items: { include: { product: true } }
        }
      }),
      prisma.salesOrder.count({ where })
    ]);

    // Convert BigInt → String trước khi JSON.stringify
    const sanitized = orders.map(o => ({
      ...o,
      id: o.id.toString(),
      distributorId: o.distributorId.toString(),
      retailerId: o.retailerId.toString(),
      warehouseId: o.warehouseId.toString(),
      retailer: { ...o.retailer, id: o.retailer.id.toString() },
      items: o.items.map(i => ({
        ...i,
        id: i.id.toString(),
        productId: i.productId.toString()
      }))
    }));

    res.json({ data: sanitized, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('getOrders error:', error);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
};

// GET single by ID
export const getOrderById = async (req, res) => {
  try {
    const order = await prisma.salesOrder.findUnique({
      where: { id: BigInt(req.params.id) },
      include: {
        retailer: true,
        warehouse: true,
        items: { include: { product: true } },
        statusHistory: { orderBy: { changedAt: 'asc' } }
      }
    });

    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });

    res.json({
      ...order,
      id: order.id.toString(),
      // ... convert all BigInt fields
    });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
};

// POST create
export const createOrder = async (req, res) => {
  const { distributorId, retailerId, warehouseId, orderType, items } = req.body;

  try {
    // Validation
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Đơn hàng phải có ít nhất 1 sản phẩm' });
    }

    const order = await prisma.salesOrder.create({
      data: {
        orderCode: `SO-${Date.now()}`,  // Hoặc dùng hàm generate code riêng
        distributorId: BigInt(distributorId),
        retailerId: BigInt(retailerId),
        warehouseId: BigInt(warehouseId),
        orderType: orderType || 'LATER',
        items: {
          create: items.map(item => ({
            productId: BigInt(item.productId),
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            isPromotion: item.isPromotion || false
          }))
        }
      },
      include: { items: true }
    });

    res.status(201).json({ message: 'Tạo đơn hàng thành công', id: order.id.toString() });
  } catch (error) {
    console.error('createOrder error:', error);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
};

// PATCH update status
export const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { toStatus, changedById } = req.body;

  try {
    const order = await prisma.salesOrder.findUnique({ where: { id: BigInt(id) } });
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });

    await prisma.$transaction([
      prisma.salesOrder.update({
        where: { id: BigInt(id) },
        data: { status: toStatus }
      }),
      prisma.orderStatusHistory.create({
        data: {
          salesOrderId: BigInt(id),
          fromStatus: order.status,
          toStatus,
          changedById: changedById ? BigInt(changedById) : null
        }
      })
    ]);

    res.json({ message: 'Cập nhật trạng thái thành công' });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
};
```

---

## Mẫu Routes chuẩn

```js
// server/routes/salesOrderRoutes.js
import express from 'express';
import { getOrders, getOrderById, createOrder, updateOrderStatus } from '../controllers/salesOrderController.js';

const router = express.Router();

export const setupSalesOrderRoutes = () => {
  router.get('/', getOrders);
  router.get('/:id', getOrderById);
  router.post('/', createOrder);
  router.patch('/:id/status', updateOrderStatus);
  return router;
};

export default router;
```

---

## Đăng ký route vào server/index.js

```js
// server/index.js – thêm vào phần Routes
import { setupSalesOrderRoutes } from './routes/salesOrderRoutes.js';

// Dưới dòng setupAuthRoutes:
app.use('/api/sales-orders', setupSalesOrderRoutes());
```

---

## Mẫu API service chuẩn (Frontend)

```js
// src/services/api.js – thêm các hàm mới
const API_URL = 'http://localhost:3001/api';

export const getSalesOrders = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_URL}/sales-orders?${query}`);
  if (!res.ok) throw new Error('Lỗi tải danh sách đơn hàng');
  return res.json();
};

export const createSalesOrder = async (data) => {
  const res = await fetch(`${API_URL}/sales-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json;
};
```

---

## Các lưu ý quan trọng

### BigInt conversion
```js
// Luôn convert khi nhận từ request
const id = BigInt(req.params.id);

// Luôn convert khi gửi response
const response = { id: record.id.toString() };
```

### Prisma Transaction
```js
// Dùng transaction khi cần cập nhật nhiều bảng cùng lúc
await prisma.$transaction([
  prisma.bảng1.update(...),
  prisma.bảng2.create(...)
]);
```

### Naming convention cho API endpoints
| Hành động | Method | Endpoint |
|-----------|--------|----------|
| Lấy danh sách | GET | `/api/sales-orders` |
| Lấy chi tiết | GET | `/api/sales-orders/:id` |
| Tạo mới | POST | `/api/sales-orders` |
| Cập nhật | PUT | `/api/sales-orders/:id` |
| Cập nhật trạng thái | PATCH | `/api/sales-orders/:id/status` |
| Xóa mềm | DELETE | `/api/sales-orders/:id` |
| Danh sách chuyến xe hàng về (D+3) | GET | `/api/purchase/receiving/trips` |
| Chi tiết chuyến xe hàng về | GET | `/api/purchase/receiving/trips/:tripId` |
| Nhập kho thực tế chuyến xe | POST | `/api/purchase/receiving/trips/:tripId/receive` |

---

## Chuẩn Kiến Trúc Phân Tầng 3-Tier (Clean Architecture)

Để đảm bảo tuân thủ nghiêm ngặt nguyên tắc SOLID và Design Patterns, mọi tính năng backend PHẢI tuân thủ luồng:

```
[HTTP Request] 
      ↓
[Routes]         → server/routes/{entity}Routes.js
      ↓
[Controller]     → server/controllers/{entity}Controller.js (Parse req, Guard clauses, Gọi Service, Format res)
      ↓
[Service Layer]  → server/services/{entity}Service.js (Nghiệp vụ, Transaction, Rule checking)
      ↓
[Repository]     → server/repositories/{entity}Repository.js (Prisma queries, Data Isolation theo distributorId)
      ↓
[Database MySQL]
```

### Phía Frontend:
```
[React Page / View Component] (Chỉ hiển thị UI & kích hoạt action)
      ↓
[Custom Hook]    → src/hooks/use{Entity}.js (Quản lý state, loading, error, refetch)
      ↓
[API Service]    → src/services/api.js (fetch HTTP sang Backend)
```

### Quy tắc đặt tên file
- Controller: `camelCase` + `Controller.js` (VD: `salesOrderController.js`, `purchaseReceivingController.js`)
- Routes: `camelCase` + `Routes.js` (VD: `salesOrderRoutes.js`, `purchaseReceivingRoutes.js`)
- Services: `camelCase` + `Service.js` (VD: `salesOrderService.js`, `purchaseReceivingService.js`)
- Repositories: `camelCase` + `Repository.js` (VD: `salesOrderRepository.js`, `purchaseReceivingRepository.js`)
- Frontend Hooks: `use` + `PascalCase.js` (VD: `useSalesOrders.js`, `useInboundDeliveryTrips.js`)

