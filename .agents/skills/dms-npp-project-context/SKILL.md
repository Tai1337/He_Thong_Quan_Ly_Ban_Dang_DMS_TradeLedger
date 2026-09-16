---
name: dms-npp-project-context
description: >
  Cung cấp toàn bộ ngữ cảnh dự án DMS-NPP (Distributor Management System - Nhà Phân Phối).
  Kích hoạt khi người dùng hỏi về dự án, muốn thêm tính năng, viết API, tạo component,
  hoặc làm bất cứ điều gì liên quan đến codebase DMS-NPP.
---

# DMS-NPP Project Context Skill

## Tổng quan dự án

**Tên:** DMS-NPP (Hệ thống Quản lý Nhà Phân Phối)  
**Mục tiêu:** Quản lý toàn bộ nghiệp vụ của hệ thống nhà phân phối: từ đơn hàng bán lẻ, kho hàng, vận chuyển, đến báo cáo và phân tích.

## Stack công nghệ

### Frontend
- **Framework:** React 19 + Vite 8
- **Routing:** `react-router-dom` v7
- **UI Icons:** `lucide-react`
- **Charts:** `recharts`
- **Real-time:** `socket.io-client`
- **Language:** JavaScript (JSX) – **KHÔNG dùng TypeScript cho frontend**
- **CSS:** Vanilla CSS thuần, **KHÔNG dùng Tailwind**

### Backend
- **Runtime:** Node.js (ESM modules, `"type": "module"` trong package.json)
- **Framework:** Express v5
- **Real-time:** `socket.io` v4
- **ORM:** Prisma v6.4 với MySQL
- **Auth:** `bcryptjs`
- **CORS:** `cors`

### Database
- **MySQL** chạy local port `3306`, database `dms_npp`
- **Prisma schema:** `prisma/schema.prisma`

## Cấu trúc thư mục chuẩn

```
Quanlychitieu/
├── server/                    # Backend Node.js (MVC pattern)
│   ├── index.js               # Entry point: Express + Socket.io setup
│   ├── config/
│   │   └── prisma.js          # PrismaClient singleton
│   ├── controllers/           # Business logic (authController.js, ...)
│   ├── routes/                # Express router (authRoutes.js, ...)
│   └── socket/
│       └── index.js           # WebSocket event handlers
│
├── prisma/
│   ├── schema.prisma          # Database schema (27 tables)
│   └── seed.js                # Seed data script
│
├── src/                       # Frontend React
│   ├── main.jsx
│   ├── App.jsx                # Router + Auth Guard + Socket.io listener
│   ├── index.css
│   ├── pages/                 # Mỗi màn hình = 1 thư mục riêng
│   │   ├── Login/
│   │   │   ├── Login.jsx
│   │   │   └── Login.css
│   │   └── Dashboard/
│   │       └── Dashboard.jsx
│   ├── components/            # Shared components (dùng lại nhiều nơi)
│   │   ├── DashboardCards.jsx
│   │   ├── ExpenseForm.jsx
│   │   ├── ExpenseList.jsx
│   │   └── ExportButton.jsx
│   └── services/
│       └── api.js             # Tất cả HTTP calls tập trung ở đây
│
├── public/
│   └── login-banner.png
├── package.json
├── vite.config.js
└── .env                       # DATABASE_URL=mysql://root:2732500@localhost:3306/dms_npp
```

## Quy tắc quan trọng khi code

### Backend
1. **Luôn dùng ESM:** `import/export` không phải `require/module.exports`
2. **PrismaClient:** KHÔNG khởi tạo mới. Luôn import từ `../config/prisma.js`
3. **Import PrismaClient trong config:** Dùng dạng default import vì CJS interop:
   ```js
   import pkg from '@prisma/client';
   const { PrismaClient } = pkg;
   ```
4. **BigInt:** Khi trả JSON từ Prisma, phải convert BigInt sang String:
   ```js
   id: user.id.toString()
   ```
5. **WebSocket FORCE_LOGOUT:** Logic nằm trong `server/socket/index.js`. Controller gọi `activeSockets` từ đó.
6. **Route mới:** Tạo file trong `server/routes/`, controller trong `server/controllers/`, đăng ký vào `server/index.js`.

### Frontend
1. **Route mới:** Tạo thư mục trong `src/pages/TenTrang/TenTrang.jsx`
2. **API calls:** KHÔNG fetch trực tiếp URL trong component. Luôn tạo hàm trong `src/services/api.js` rồi import
3. **API base URL:** `http://localhost:3001/api` (đã định nghĩa trong `api.js`)
4. **Import CSS:** Mỗi page/component có file CSS riêng, import trực tiếp trong file JSX đó
5. **Auth Guard:** Đã cấu hình trong `App.jsx`. Route mới chỉ cần thêm `<Route>` tương ứng

## Các Enum trong hệ thống

| Enum | Giá trị |
|------|---------|
| `WarehouseType` | SALES, HOLDING, VANSALE, DELIVERY |
| `StockStatus` | GOOD, DEFECTIVE, EXPIRED |
| `TxnDirection` | IN, OUT |
| `OrderType` | IMMEDIATE, LATER |
| `SalesOrderStatus` | PENDING, SUBMITTED, ALLOCATED, SHIPPED, DELIVERED, INVOICED, PAID, CANCELLED |
| `POStatus` | WAITING_RECEIVE, PARTIALLY_RECEIVED, COMPLETED, CANCELLED |
| `TripStatus` | WAITING_CONFIRM, WAITING_SHIP, SHIPPING, COMPLETED, CLOSED, CANCELLED |
| `AdjustmentType` | IMPORT, EXPORT, STATUS_CHANGE, SKU_CHANGE |
| `DocStatus` | DRAFT, WAITING_APPROVAL, APPROVED, COMPLETED, REJECTED, CANCELLED |
| `PORStatus` | DRAFT, WAITING_APPROVAL, WAITING_PRICE, CONFIRMED, SO_CREATED, COMPLETED, REJECTED |
| `TransferType` | VANSALE_TRANSFER, INTERNAL_LOCATION, INTERNAL_WAREHOUSE, EXTERNAL_NPP |
| `CountType` | MONTHLY, BY_SKU |

## Cách chạy dự án

```bash
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend  
npm run dev

# Tạo/reset dữ liệu mẫu
npx prisma db seed

# Cập nhật schema DB
npx prisma db push
```

## Tài khoản test mặc định
- **Email:** `admin@example.com`
- **Mật khẩu:** `123456`
