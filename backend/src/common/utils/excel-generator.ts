import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

export const generateExcelBuffer = async (data: any[], config: any, metaData: Record<string, any> = {}) => {
  const { templateFile, dataStartRow, columns } = config;

  const candidates = [
    path.resolve(process.cwd(), 'templates', templateFile),
    path.resolve(process.cwd(), 'src', 'templates', templateFile),
    path.resolve(__dirname, '../../templates', templateFile),
  ];
  const templatePath = candidates.find((p) => fs.existsSync(p)) || candidates[0];
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const worksheet = workbook.worksheets[0];

  for (let i = 1; i <= Math.max(dataStartRow, worksheet.rowCount); i++) {
    const row = worksheet.getRow(i);
    row.eachCell((cell) => {
      if (cell.value && typeof cell.value === 'string') {
        let newValue = cell.value;
        for (const [key, value] of Object.entries(metaData)) {
          const placeholder = `{{${key}}}`;
          if (newValue.includes(placeholder)) {
            newValue = newValue.replace(new RegExp(placeholder, 'g'), String(value));
          }
        }
        if (newValue !== cell.value) {
          cell.value = newValue;
        }
      }
    });
  }

  let currentRow = dataStartRow;

  data.forEach((item) => {
    const row = worksheet.getRow(currentRow);

    columns.forEach((col: any, index: number) => {
      const cell = row.getCell(index + 1);
      const val = item[col.key];
      cell.value = val !== undefined && val !== null ? val : '';

      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    row.commit();
    currentRow++;
  });

  return await workbook.xlsx.writeBuffer();
};
