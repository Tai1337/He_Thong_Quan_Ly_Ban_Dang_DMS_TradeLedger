import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';
import { getCategory } from '../constants';

export default function ExportButton({ expenses }) {
  const handleExport = () => {
    if (expenses.length === 0) {
      alert('Không có dữ liệu để xuất');
      return;
    }

    // Prepare data for Excel
    const dataToExport = expenses.map(expense => {
      const category = getCategory(expense.categoryId);
      return {
        'Ngày': expense.date,
        'Danh mục': category.name,
        'Số tiền (VNĐ)': expense.amount,
        'Ghi chú': expense.note || ''
      };
    });

    // Create a new workbook and add the worksheet
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    
    // Set column widths for better readability
    const wscols = [
      { wch: 15 }, // Ngày
      { wch: 20 }, // Danh mục
      { wch: 15 }, // Số tiền
      { wch: 40 }  // Ghi chú
    ];
    worksheet['!cols'] = wscols;

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Chi Tiêu');

    // Generate Excel file and trigger download
    const fileName = `Quan_Ly_Chi_Tieu_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <button className="btn btn-primary" onClick={handleExport} style={{ backgroundColor: '#10b981' }}>
      <Download size={18} />
      Xuất ra Excel
    </button>
  );
}
