import ExcelJS from 'exceljs';
import path from 'path';

async function prepTemplate() {
  const filePath = path.join(process.cwd(), 'server', 'templates', 'template_rpt083.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  
  const worksheet = workbook.worksheets[0];
  
  // Set placeholder for date
  worksheet.getCell('A2').value = '{{exportDate}}';
  
  // Remove all rows from row 5 onwards
  const rowCount = worksheet.rowCount;
  if (rowCount >= 5) {
    worksheet.spliceRows(5, rowCount - 4);
  }
  
  await workbook.xlsx.writeFile(filePath);
  console.log('Template prepared successfully!');
}

prepTemplate().catch(console.error);
