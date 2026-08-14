---
name: dms-npp-report-patterns
description: >
  Hướng dẫn các Design Patterns (Data-Driven, Strategy, Template Method) chuẩn để xây dựng báo cáo (RPT) và tính năng Xuất Excel trong dự án DMS-NPP. Kích hoạt khi người dùng muốn tạo báo cáo mới hoặc xuất file Excel.
---

# DMS-NPP Report & Excel Export Patterns

Khi xây dựng một báo cáo mới (ví dụ RPT084, RPT085...) có tính năng xuất file Excel, tuyệt đối **không code logic xuất file Excel thủ công**. Hãy sử dụng kiến trúc **Template-Based Excel Generation** với `exceljs` để đảm bảo giữ nguyên 100% định dạng file mẫu.

## 1. Chuẩn bị File Mẫu (Template)
Mỗi báo cáo phải có một file Excel mẫu chứa sẵn giao diện, màu sắc, viền, font chữ.
- **Location**: `server/templates/template_rpt[XXX].xlsx`
- **Lưu ý**: Đối với các thông tin động (Ngày xuất, Tên người xuất), sử dụng thẻ Placeholder dạng `{{tên_biến}}` (VD: `{{exportDate}}`) trực tiếp trên file Excel. Xóa sạch các dòng dữ liệu mẫu, chỉ để lại tiêu đề cột.

## 2. Cấu hình Báo cáo (Config)
Mỗi báo cáo phải có một file config định nghĩa quy tắc đúc file.

**Location**: `server/config/reports/rpt[XXX].config.js`

```javascript
export const rptXXXConfig = {
  templateFile: 'template_rptXXX.xlsx', // Tên file mẫu trong thư mục templates
  dataStartRow: 5, // Dòng bắt đầu đổ mảng dữ liệu trong Excel (tính từ 1)
  columns: [
    { header: "Mã nhà phân phối", key: "distCode" },
    { header: "Nhà phân phối", key: "distName" },
    { header: "Tên sản phẩm", key: "productName" }
    // ... các cột khác
  ]
};
```

## 3. Dữ liệu thô (Raw Data Service)
Hàm Service chuyên dụng để xuất Excel chỉ trả về mảng Object chứa Data thô (raw data). Tuyệt đối không xử lý mảng 2 chiều ở đây.

**Location**: `server/services/[TênNghiệpVụ]Service.js`

```javascript
export const get[TênBáoCáo]ExportService = async (filters) => {
  const data = await queryDatabase(filters);
  
  return data.map(item => ({
    distCode: item.distributor.code,
    distName: item.distributor.name,
    productName: item.product.name,
    // ... các trường tương ứng với biến 'key' trong config
  }));
};
```

## 4. Lắp ráp và Đúc Excel (Controller)
Sử dụng "Cỗ máy đúc vạn năng" (`generateExcelBuffer`) để tự động đọc file mẫu, thay thế các biến `{{...}}` và đổ danh sách dữ liệu.

**Location**: `server/controllers/[TênNghiệpVụ]Controller.js`

```javascript
import { get[TênBáoCáo]ExportService } from '../services/[TênNghiệpVụ]Service.js';
import { generateExcelBuffer } from '../utils/excelGenerator.js';
import { rptXXXConfig } from '../config/reports/rptXXX.config.js';

export const export[TênBáoCáo] = async (req, res) => {
  try {
    // 1. Lấy Raw Data
    const data = await get[TênBáoCáo]ExportService(req.query);

    // 2. Chuẩn bị MetaData cho Placeholders (VD: thay {{exportDate}})
    const metaData = {
      exportDate: new Date().toLocaleString('en-GB')
    };

    // 3. Đưa vào Cỗ máy đúc
    const buffer = await generateExcelBuffer(data, rptXXXConfig, metaData);

    // 4. Trả về Client
    res.setHeader('Content-Disposition', 'attachment; filename="TenFile.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

## Nguyên lý (Tại sao dùng cách này?)
1. **Template-Based**: Tách biệt hoàn toàn việc thiết kế UI/Định dạng Excel ra khỏi code logic. User có thể tự thiết kế file mẫu và ném vào hệ thống.
2. **Data-Driven Configuration**: Đẩy cấu hình (dòng bắt đầu đổ dữ liệu, tên template, cột map) ra file config giúp "Cỗ máy đúc" trở nên vạn năng, không bao giờ cần sửa đổi logic bên trong.
3. **Dynamic Placeholders**: Sử dụng cú pháp `{{...}}` giúp xử lý gọn gàng các thông tin động nằm ngoài bảng dữ liệu.
