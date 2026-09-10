---
name: dms-npp-ui-patterns
description: >
  Hướng dẫn các mẫu giao diện và component chuẩn cho hệ thống DMS-NPP.
  Kích hoạt khi người dùng muốn tạo trang mới, component mới, bảng danh sách,
  form nhập liệu, hay bất kỳ thứ gì liên quan đến giao diện người dùng React.
---

# DMS-NPP UI Component & Page Patterns

## Nguyên tắc thiết kế (Enterprise Dashboard Style)

- **Giao diện tổng thể:** Theo phong cách Enterprise Dashboard (tương tự như ảnh tham khảo), tối ưu cho hiển thị nhiều dữ liệu (dense data).
- **Màu chủ đạo:** Xanh dương (vd: `#1a73e8` hoặc `#3b82f6`) cho các nút/hành động chính, kết hợp nền trắng `#ffffff` cho vùng chứa dữ liệu và nền xám nhạt `#f4f6f8` cho body/background.
- **Font:** `Inter, system-ui, -apple-system, sans-serif`, kích thước font chữ nhỏ gọn (13px - 14px) phù hợp cho bảng biểu quản trị.
- **Border-radius:** Bo góc nhẹ nhàng: 4px hoặc 6px (input/button/dropdown), 8px (card). Nút action trên toolbar có thể bo tròn hoàn toàn (pill shape) ở một số trường hợp.
- **Shadow:** Đổ bóng nhẹ cho dropdown menu và card: `0 4px 12px rgba(0,0,0,0.08)`.
- **Thành phần UI đặc trưng (Bắt buộc tuân theo):**
  - **Top Navigation:** Thanh điều hướng ngang ở trên cùng (header) chứa logo và các menu/tab (Home, Task, Request...).
  - **Toolbar (Action & Filter Bar):** Nằm ngay trên bảng dữ liệu. Chứa các ô tìm kiếm, bộ lọc (dropdown, date picker) bên trái và các nút hành động (Add mới có icon dấu +, Export, Refresh) bên phải.
  - **Nút bấm (Buttons):** Nút chính (Primary) nền màu xanh, chữ trắng. Nút phụ (Secondary/Outline) viền xám, chữ đen/xám, có kèm icon.
  - **Bảng dữ liệu (Data Table):** 
    - Luôn có checkbox ở cột đầu tiên (để thao tác hàng loạt).
    - Viền các ô (border) mỏng `#e5e7eb`.
    - Dòng header có text in đậm vừa phải, nền trắng hoặc xám rất nhạt.
    - Dòng data có hiệu ứng khi hover.
    - Cột cuối cùng là cột Action, sử dụng icon 3 chấm dọc (kebab menu) để mở popup thao tác.
  - **Dropdown/Popup Menu:** Nền trắng, viền mỏng, có bóng đổ. Các mục bên trong có icon nhỏ bên trái chữ.
  - **Phân trang (Pagination):** Đặt ở góc dưới bên phải bảng, bao gồm: chọn số dòng trên trang (Items per page), thông tin hiển thị (VD: 1-50 of 100), và các nút điều hướng mũi tên.
- **Công nghệ (Tuyệt đối tuân thủ):**
  - **Không dùng Tailwind CSS** – dùng Vanilla CSS thuần cho mỗi component.
  - **Ngôn ngữ:** JSX (không phải TypeScript).

---

## Tiêu chuẩn Thiết kế Nâng cao (Tích hợp UI/UX Pro Max)

Dự án áp dụng bộ tiêu chuẩn thiết kế từ **UI/UX Pro Max Skill** dành riêng cho hệ thống **Enterprise B2B Supply Chain & Inventory Dashboard**:

### 1. Hệ thống Design Tokens (Định nghĩa tại `src/index.css`):
- **Brand & Base:**
  - Nền toàn trang: `--bg-color: #f8fafc;` (Clean Slate 50)
  - Vùng thẻ / Bảng: `--card-bg: #ffffff;` với viền `--border-color: #e2e8f0;`
  - Văn bản chính: `--text-primary: #0f172a;` (Slate 900, tương phản cực cao $\ge 7:1$)
  - Nút chính (CTA): `--primary-color: #1a73e8;` hover `--primary-hover: #1557b0;`
- **Màu trạng thái ngữ nghĩa (Semantic Feedback):**
  - Thành công (Đã duyệt / Hoàn tất): Text `--color-success: #16a34a;`, Nền badge `--color-success-bg: #f0fdf4;`, Viền `--color-success-border: #bbf7d0;`
  - Cảnh báo (Đến hạn D+3 / Chờ duyệt): Text `--color-warning: #d97706;`, Nền badge `--color-warning-bg: #fffbeb;`, Viền `--color-warning-border: #fde68a;`
  - Nguy hiểm (Hủy / Lỗi / Quá hạn): Text `--color-danger: #dc2626;`, Nền badge `--color-danger-bg: #fef2f2;`, Viền `--color-danger-border: #fecaca;`
  - Thông tin (Mới / Đang giao): Text `--color-info: #0284c7;`, Nền badge `--color-info-bg: #f0f9ff;`, Viền `--color-info-border: #bae6fd;`

### 2. Danh sách kiểm tra chất lượng trước khi bàn giao (Pre-Delivery QA Checklist):
- [ ] **100% SVG Icons:** Sử dụng `lucide-react` (kích thước đồng nhất 16px - 20px). **TUYỆT ĐỐI KHÔNG dùng emoji làm icon**.
- [ ] **Cursor Pointer:** Đảm bảo `cursor: pointer` trên tất cả nút bấm, thẻ có thể click, checkbox và liên kết.
- [ ] **Chuyển động mượt (Micro-transitions):** Thêm transition từ `150ms - 250ms cubic-bezier(0.4, 0, 0.2, 1)` cho các hiệu ứng hover, focus, đóng/mở modal.
- [ ] **Độ tương phản (Contrast Ratio):** Văn bản trên nền luôn đạt tối thiểu `4.5:1` (chuẩn WCAG AA). Không để chữ xám mờ trên nền xám nhạt.
- [ ] **Hiển thị Responsive:** Đảm bảo trang hiển thị tốt từ Laptop (1024px, 1280px) đến Desktop màn rộng (1440px+).
- [ ] **Data Dense Table:** Bảng dữ liệu có header cố định, hỗ trợ phân trang hoặc cuộn dọc mượt mà.

### 3. Anti-Patterns BẮT BUỘC TRÁNH:
- ❌ Không dùng gradient tím/hồng màu mè "kiểu AI" trong phần mềm quản trị doanh nghiệp.
- ❌ Không để nút bấm không có trạng thái hover / focus / active.
- ❌ Không dùng chiều rộng cố định (Fixed px width) gây tràn ngang màn hình (horizontal scroll).

### 4. Công cụ tra cứu Design Intelligence:
Để tìm kiếm các bảng màu, phong cách, và quy tắc UX chuyên sâu cho màn hình mới, chạy lệnh:
```bash
# Tra cứu phong cách hoặc bảng màu
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "<từ khóa>" --domain <style|color|ux|typography>

# Tạo trọn gói Design System cho một chủ đề/ngành
python3 .agents/skills/ui-ux-pro-max/scripts/search.py "<chủ đề>" --design-system
```

---

## Cấu trúc trang chuẩn

```
src/pages/TenTrang/
├── TenTrang.jsx    # Component chính
└── TenTrang.css    # Style riêng
```

---

## Mẫu Trang danh sách chuẩn (List Page with Custom Hook Pattern)

Theo quy tắc DMS-NPP, **TUYỆT ĐỐI KHÔNG** viết logic `fetch()` hoặc quản lý `loading/error` lặp lại trực tiếp trong Component. Phải tách ra Custom Hook trong `src/hooks/use{Entity}.js`:

```jsx
// src/pages/SalesOrders/SalesOrders.jsx
import { useState } from 'react';
import { useSalesOrders } from '../../hooks/useSalesOrders';
import './SalesOrders.css';

const SalesOrders = () => {
  const [filters, setFilters] = useState({ page: 1, limit: 20 });
  const { orders, total, loading, error, refetch } = useSalesOrders(filters);

  if (loading) return <div className="page-loading">Đang tải...</div>;
  if (error) return <div className="page-error">{error}</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Danh sách Đơn hàng</h1>
        <button className="btn btn-primary" onClick={() => {}}>
          + Tạo đơn hàng
        </button>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Đại lý</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id}>
                <td>{order.orderCode}</td>
                <td>{order.retailer?.name}</td>
                <td>
                  <span className={`status-badge status-${order.status.toLowerCase()}`}>
                    {order.status}
                  </span>
                </td>
                <td>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</td>
                <td>
                  <button className="btn btn-sm btn-outline">Xem</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹ Trước</button>
          <span>Trang {page} / {Math.ceil(total / 20)}</span>
          <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>Sau ›</button>
        </div>
      </div>
    </div>
  );
};

export default SalesOrders;
```

---

## Mẫu CSS chuẩn cho trang

```css
/* src/pages/SalesOrders/SalesOrders.css */
.page-container {
  padding: 24px;
  max-width: 1280px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: #202124;
  margin: 0;
}

.table-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.data-table thead th {
  background: #f8f9fa;
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: #5f6368;
  border-bottom: 1px solid #e8eaed;
  white-space: nowrap;
}

.data-table tbody td {
  padding: 12px 16px;
  border-bottom: 1px solid #f1f3f4;
  color: #202124;
}

.data-table tbody tr:hover {
  background: #f8f9fa;
}

.data-table tbody tr:last-child td {
  border-bottom: none;
}

/* Status badges */
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.status-pending    { background: #fef9c3; color: #854d0e; }
.status-submitted  { background: #dbeafe; color: #1e40af; }
.status-allocated  { background: #e0e7ff; color: #3730a3; }
.status-shipped    { background: #d1fae5; color: #065f46; }
.status-delivered  { background: #bbf7d0; color: #14532d; }
.status-invoiced   { background: #fde8d8; color: #9a3412; }
.status-paid       { background: #dcfce7; color: #166534; }
.status-cancelled  { background: #f1f3f4; color: #9aa0a6; }

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
}

.btn-primary {
  background: #1a73e8;
  color: white;
}

.btn-primary:hover { background: #1557b0; }

.btn-outline {
  background: transparent;
  border: 1px solid #dadce0;
  color: #5f6368;
}

.btn-outline:hover { background: #f8f9fa; }

.btn-sm { padding: 4px 10px; font-size: 12px; }

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px;
  font-size: 14px;
  color: #5f6368;
}

.pagination button {
  padding: 6px 12px;
  border: 1px solid #dadce0;
  background: white;
  border-radius: 4px;
  cursor: pointer;
}

.pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Loading & Error */
.page-loading, .page-error {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-size: 16px;
  color: #5f6368;
}

.page-error { color: #ef4444; }
```

---

## Mẫu Form nhập liệu

```jsx
const [formData, setFormData] = useState({
  distributorId: '',
  retailerId: '',
  items: []
});

const handleChange = (field) => (e) => {
  setFormData(prev => ({ ...prev, [field]: e.target.value }));
};

// JSX Form
<form onSubmit={handleSubmit} className="form-container">
  <div className="form-group">
    <label className="form-label">Đại lý</label>
    <select
      className="form-select"
      value={formData.retailerId}
      onChange={handleChange('retailerId')}
      required
    >
      <option value="">-- Chọn đại lý --</option>
      {retailers.map(r => (
        <option key={r.id} value={r.id}>{r.name}</option>
      ))}
    </select>
  </div>
  
  <div className="form-actions">
    <button type="button" className="btn btn-outline" onClick={onCancel}>Hủy</button>
    <button type="submit" className="btn btn-primary">Lưu</button>
  </div>
</form>
```

---

## Cách thêm trang mới vào Router

```jsx
// src/App.jsx – thêm Route mới
import SalesOrders from './pages/SalesOrders/SalesOrders';

// Trong <Routes>:
<Route path="/sales-orders" element={user ? <SalesOrders /> : <Navigate to="/login" />} />
```

---

## Sidebar Navigation (Gợi ý structure)

Khi xây dựng sidebar, nhóm các trang theo nghiệp vụ:

```
📦 Bán hàng
  - Danh sách đơn hàng (/sales-orders)
  - Tạo đơn hàng (/sales-orders/new)
  - Chuyến giao hàng (/delivery-trips)

🏭 Mua hàng
  - Lệnh mua hàng (/purchase-orders)
  - Trả hàng (/purchase-returns)
  - Đề nghị đặt hàng (/purchase-plans)

🏗️ Kho hàng
  - Tồn kho (/inventory)
  - Điều chỉnh kho (/adjustments)
  - Kiểm kê (/inventory-counts)
  - Điều phối (/stock-transfers)

📊 Danh mục
  - Sản phẩm (/products)
  - Đại lý (/retailers)
  - Kho (/warehouses)
  - Nhà cung cấp (/suppliers)

👥 Hệ thống
  - Người dùng (/users)
  - Phân quyền (/roles)
  - Nhà phân phối (/distributors)
```
