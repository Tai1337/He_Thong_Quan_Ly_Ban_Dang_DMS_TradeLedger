import { getInventoryRpt083Service, getInventoryRpt083ExportService } from '../services/inventoryService.js';
import { generateExcelBuffer } from '../utils/excelGenerator.js';
import { rpt083Config } from '../config/reports/rpt083.config.js';

export const getInventoryRpt083 = async (req, res) => {
  try {
    const distributorId = req.query.distributorId || 1; 
    const result = await getInventoryRpt083Service(distributorId, req.query);
    res.json(result);
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu tồn kho:', error);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

export const getInventoryRpt083Export = async (req, res) => {
  try {
    const distributorId = req.query.distributorId || 1;
    const data = await getInventoryRpt083ExportService(distributorId, req.query);

    // Chuẩn bị MetaData cho Placeholders
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString('en-GB');
    const metaData = {
      exportDate: dateStr
    };

    // 2. Dùng bộ đúc vạn năng (Data-Driven + Template Placeholders)
    const buffer = await generateExcelBuffer(data, rpt083Config, metaData);

    // 3. Trả về cho Client
    res.setHeader('Content-Disposition', 'attachment; filename="BaoCaoTonKhoNPP.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting inventory rpt083:', error);
    res.status(500).json({ error: error.message || 'Lỗi server khi xuất file' });
  }
};
