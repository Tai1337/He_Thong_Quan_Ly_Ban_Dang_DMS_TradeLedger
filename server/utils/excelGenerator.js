import ExcelJS from 'exceljs';
import path from 'path';

/**
 * Hàm generic sinh ra file Excel Buffer từ cấu hình và template bằng ExcelJS.
 * Hỗ trợ Template Placeholders (VD: {{exportDate}}) và nạp mảng dữ liệu.
 * 
 * @param {Array} data - Mảng các object dữ liệu (ví dụ: [{ name: 'A', price: 100 }])
 * @param {Object} config - Cấu hình báo cáo { templateFile, dataStartRow, columns }
 * @param {Object} metaData - Dữ liệu động để thay thế vào Placeholders
 * @returns {Buffer} Buffer của file Excel để stream về client
 */
export const generateExcelBuffer = async (data, config, metaData = {}) => {
  const { templateFile, dataStartRow, columns } = config;
  
  // 1. Tải Template file
  const templatePath = path.join(process.cwd(), 'server', 'templates', templateFile);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  
  const worksheet = workbook.worksheets[0]; // Mặc định dùng sheet đầu tiên

  // 2. Scan và Replace Placeholders (VD: {{exportDate}}) trong các dòng trên dataStartRow
  for (let i = 1; i <= Math.max(dataStartRow, worksheet.rowCount); i++) {
    const row = worksheet.getRow(i);
    row.eachCell((cell) => {
      if (cell.value && typeof cell.value === 'string') {
        let newValue = cell.value;
        // Duyệt qua tất cả các key trong metaData để tìm và thay thế
        for (const [key, value] of Object.entries(metaData)) {
          const placeholder = `{{${key}}}`;
          if (newValue.includes(placeholder)) {
            newValue = newValue.replace(new RegExp(placeholder, 'g'), value);
          }
        }
        if (newValue !== cell.value) {
          cell.value = newValue;
        }
      }
    });
  }

  // Lấy định dạng của một dòng (mặc định lấy dòng dataStartRow nếu đã có dữ liệu mẫu, 
  // hoặc dòng ngay trên đó để làm style cho các dòng mới)
  // Thực tế ta cứ tạo row mới và copy style từ cột.
  // Nhưng đơn giản hơn: cứ gán giá trị theo thứ tự cột của config.

  // 3. Đổ danh sách dữ liệu từ dataStartRow
  let currentRow = dataStartRow;
  
  data.forEach(item => {
    const row = worksheet.getRow(currentRow);
    
    // Gán dữ liệu vào các cột (Dựa trên config.columns)
    columns.forEach((col, index) => {
      // ExcelJS dùng cột đánh chỉ số từ 1
      const cell = row.getCell(index + 1);
      const val = item[col.key];
      cell.value = val !== undefined && val !== null ? val : '';
      
      // Không copy style từ dòng header vì sẽ bị dính màu nền và chữ in đậm
      // Thay vào đó, tự động đóng khung viền mỏng (thin border) cho tất cả các ô dữ liệu
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      
      // Có thể copy alignment từ dòng header nếu muốn căn giữa/trái/phải giống header
      // const headerCell = worksheet.getRow(dataStartRow - 1).getCell(index + 1);
      // if (headerCell.alignment) cell.alignment = headerCell.alignment;
    });
    
    row.commit();
    currentRow++;
  });

  // 4. Build ra dạng Buffer và trả về
  return await workbook.xlsx.writeBuffer();
};
