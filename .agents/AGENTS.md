---
name: dms-npp-agents-rules
description: >
  Quy tắc hành vi bắt buộc cho AI agent khi làm việc trong dự án DMS-NPP.
  Kích hoạt với mọi thao tác lập trình trong dự án này.
---

# DMS-NPP Agent Rules

## Quy tắc tuyệt đối (KHÔNG ĐƯỢC vi phạm)

1. **ESM Only:** Luôn dùng `import/export`. KHÔNG BAO GIỜ dùng `require()` hoặc `module.exports`.
2. **PrismaClient Singleton:** KHÔNG khởi tạo `new PrismaClient()` trong controller hay route. Luôn `import prisma from '../config/prisma.js'`.
3. **BigInt Serialization:** Mọi trường BigInt từ Prisma phải `.toString()` trước khi gửi JSON response.
4. **Data Isolation:** Mọi query đọc dữ liệu phải filter theo `distributorId` (trừ ADMIN role).
5. **API qua services:** KHÔNG gọi `fetch()` trực tiếp trong React component. Phải tạo hàm trong `src/services/api.js`.
6. **CSS riêng:** Mỗi page/component có file CSS riêng. KHÔNG viết style inline dài hoặc CSS global cho component.
7. **Không dùng TypeScript:** Frontend dùng `.jsx`. Backend dùng `.js`. KHÔNG tạo file `.ts` hay `.tsx`.
8. **Không dùng Tailwind:** KHÔNG dùng class Tailwind. Dùng Vanilla CSS thuần.

## Quy tắc lập trình

- **Tên file:** camelCase cho JS, PascalCase cho JSX component
- **Tên component:** PascalCase (VD: `SalesOrderList`)
- **Tên hàm:** camelCase bắt đầu bằng động từ (VD: `getOrders`, `createOrder`, `handleSubmit`)
- **Tên route API:** kebab-case (VD: `/api/sales-orders`, `/api/delivery-trips`)
- **Error handling:** Luôn có `try/catch` trong controller. Luôn hiển thị lỗi rõ ràng cho người dùng.
- **Console.log:** KHÔNG để lại `console.log` trong code production (chỉ dùng `console.error` khi cần)

## Thứ tự ưu tiên khi giải quyết vấn đề

1. Đọc KI (Knowledge Items) và Skill files trước khi code
2. Tuân theo cấu trúc thư mục đã quy định
3. Tái sử dụng code đã có trước khi viết mới
4. Giữ nguyên hành vi hiện tại khi refactor

---

## Nguyên tắc SOLID (Bắt buộc áp dụng)

### S – Single Responsibility Principle
- Mỗi file/module chỉ làm **một việc duy nhất**.
- Controller chỉ xử lý HTTP request/response. Logic nghiệp vụ phức tạp → tách ra **service layer** riêng.
- Ví dụ: Nếu `authController.js` phải xử lý cả logic gửi email, tạo JWT thì PHẢI tách ra `authService.js`.

### O – Open/Closed Principle
- Code phải **mở để mở rộng, đóng để sửa đổi**.
- Thêm tính năng mới → thêm file/hàm mới, KHÔNG sửa vào code đang hoạt động tốt.
- Ví dụ: Thêm loại chứng từ mới → tạo controller/route mới, không sửa vào các controller hiện có.

### L – Liskov Substitution Principle
- Các hàm xử lý danh sách phải hoạt động nhất quán: cùng kiểu input → cùng kiểu output.
- Các hàm `getXxx` luôn trả về `{ data, total, page, limit }` – KHÔNG thay đổi shape giữa các API.

### I – Interface Segregation Principle
- Không truyền object lớn chứa nhiều field không cần thiết vào hàm.
- Hàm chỉ nhận đúng những param nó cần (destructure rõ ràng).
- Ví dụ: `createOrder({ distributorId, retailerId, items })` thay vì `createOrder(req.body)`.

### D – Dependency Inversion Principle
- Controller KHÔNG phụ thuộc trực tiếp vào `prisma` object.
- Luôn import từ `../config/prisma.js` (singleton). Trong tương lai dễ mock khi test.
- `src/services/api.js` là lớp trung gian giữa component và server – component KHÔNG gọi fetch trực tiếp.

---

## Design Patterns ưu tiên áp dụng

### 1. Repository Pattern (Backend)
Khi logic query Prisma phức tạp (nhiều include, filter, transform), tách ra file riêng:
```
server/
└── repositories/
    └── salesOrderRepository.js  ← Chứa tất cả Prisma query cho SalesOrder
```
```js
// server/repositories/salesOrderRepository.js
import prisma from '../config/prisma.js';

export const findOrdersByDistributor = (distributorId, { page, limit, status }) =>
  prisma.salesOrder.findMany({
    where: { distributorId: BigInt(distributorId), ...(status && { status }) },
    skip: (page - 1) * limit,
    take: limit,
    include: { retailer: true, items: true }
  });
```

### 2. Service Layer Pattern (Backend)
Khi 1 action cần nhiều bước (transaction, emit socket, ghi log), tách ra service:
```
server/
└── services/
    └── salesOrderService.js  ← Orchestrate: gọi repo + emit socket + ...
```
```js
// Controller chỉ gọi service, không biết chi tiết bên trong
export const createOrder = async (req, res) => {
  try {
    const order = await salesOrderService.createNewOrder(req.body);
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
```

### 3. Custom Hook Pattern (Frontend)
Tách logic fetch + state ra khỏi component UI bằng custom hook:
```js
// src/hooks/useSalesOrders.js
import { useState, useEffect } from 'react';
import { getSalesOrders } from '../services/api';

export const useSalesOrders = (filters) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    getSalesOrders(filters)
      .then(r => setOrders(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [JSON.stringify(filters)]);

  return { orders, loading, error };
};

// Trong component: chỉ còn UI logic
const SalesOrders = () => {
  const { orders, loading, error } = useSalesOrders({ page: 1 });
  // ...render
};
```

### 4. Strategy Pattern (Nghiệp vụ)
Khi có nhiều loại xử lý khác nhau cho cùng 1 hành động (VD: nhiều loại AdjustmentType), dùng strategy:
```js
const adjustmentStrategies = {
  IMPORT: handleImport,
  EXPORT: handleExport,
  STATUS_CHANGE: handleStatusChange,
  SKU_CHANGE: handleSkuChange,
};

const strategy = adjustmentStrategies[adjustmentType];
if (!strategy) throw new Error(`Loại điều chỉnh không hợp lệ: ${adjustmentType}`);
await strategy(adjustmentData, prisma);
```

### 5. Guard Clause Pattern
Tránh if lồng nhau sâu bằng cách return sớm khi điều kiện không hợp lệ:
```js
// ✅ Đúng – Guard clauses
export const createOrder = async (req, res) => {
  const { items } = req.body;
  if (!items || items.length === 0)
    return res.status(400).json({ error: 'Đơn hàng phải có ít nhất 1 sản phẩm' });

  const warehouse = await prisma.warehouse.findUnique({ where: { id: BigInt(warehouseId) } });
  if (!warehouse)
    return res.status(404).json({ error: 'Kho hàng không tồn tại' });

  if (!warehouse.status)
    return res.status(400).json({ error: 'Kho hàng đang bị vô hiệu hóa' });

  // Happy path – không bị lồng sâu
  const order = await prisma.salesOrder.create({ ... });
  res.status(201).json(order);
};
```
