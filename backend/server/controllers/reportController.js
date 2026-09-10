import * as reportService from '../services/reportService.js';
import { findSalesOrdersByDistributor } from '../repositories/salesOrderRepository.js';

export const getRpt005 = async (req, res) => {
  try {
    const distributorId = req.query.distributorId || 1;
    const isExport = req.query.export === 'excel';
    const result = await reportService.getRpt005Data(distributorId, req.query);

    if (isExport) {
      const headers = [
        { label: 'STT', key: '__stt', width: 6, align: 'center' },
        { label: 'Mã đơn hàng', key: 'orderCode', width: 18 },
        { label: 'Ngày đặt', key: 'orderDate', width: 14, align: 'center' },
        { label: 'Khách hàng', key: 'retailerName', width: 28 },
        { label: 'VNBH', key: 'vnbhName', width: 20 },
        { label: 'Mã SKU', key: 'sku', width: 16 },
        { label: 'Tên sản phẩm', key: 'productName', width: 32 },
        { label: 'ĐVT', key: 'unit', width: 10, align: 'center' },
        { label: 'Số lượng đặt', key: 'orderQty', width: 14, format: 'number' },
        { label: 'Tồn khả dụng', key: 'availableQty', width: 14, format: 'number' },
        { label: 'Số lượng thiếu', key: 'shortageQty', width: 14, format: 'number' },
        { label: 'Trạng thái', key: 'status', width: 14, align: 'center' }
      ];

      const buffer = await reportService.exportReportToExcel({
        title: `RPT005 - BÁO CÁO ĐƠN HÀNG THIẾU TỒN KHO (${result.mode === 'missing_only' ? 'CHỈ HÀNG THIẾU' : 'TẤT CẢ'})`,
        headers,
        data: result.data
      });

      res.setHeader('Content-Disposition', 'attachment; filename="RPT005_Don_Hang_Thieu_Ton.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.send(buffer);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getRpt005:', error);
    res.status(500).json({ error: error.message || 'Lỗi xuất báo cáo RPT005' });
  }
};

export const getRpt057 = async (req, res) => {
  try {
    const distributorId = req.query.distributorId || 1;
    const isExport = req.query.export === 'excel';
    const data = await reportService.getRpt057Data(distributorId, req.query);

    if (isExport) {
      const headers = [
        { label: 'STT', key: '__stt', width: 6, align: 'center' },
        { label: 'Mã VNBH', key: 'vnbhCode', width: 16 },
        { label: 'Họ tên VNBH', key: 'vnbhName', width: 26 },
        { label: 'Tổng số đơn', key: 'totalOrders', width: 14, format: 'number' },
        { label: 'Tổng sản lượng (Thùng)', key: 'totalQuantity', width: 22, format: 'number' },
        { label: 'Tổng doanh số (VNĐ)', key: 'totalAmount', width: 22, format: 'currency' }
      ];

      const buffer = await reportService.exportReportToExcel({
        title: 'RPT057 - BÁO CÁO DOANH SỐ VÀ SẢN LƯỢNG THEO VNBH',
        headers,
        data
      });

      res.setHeader('Content-Disposition', 'attachment; filename="RPT057_Doanh_So_San_Luong.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.send(buffer);
    }

    res.status(200).json({ data });
  } catch (error) {
    console.error('Error in getRpt057:', error);
    res.status(500).json({ error: error.message || 'Lỗi báo cáo RPT057' });
  }
};

export const getRpt006 = async (req, res) => {
  try {
    const distributorId = req.query.distributorId || 1;
    const isExport = req.query.export === 'excel';
    const data = await reportService.getRpt006Data(distributorId, req.query);

    if (isExport) {
      const headers = [
        { label: 'STT', key: '__stt', width: 6, align: 'center' },
        { label: 'Mã chuyến xe', key: 'tripCode', width: 20 },
        { label: 'Tài xế / NVGH', key: 'driverName', width: 24 },
        { label: 'Số điện thoại', key: 'driverPhone', width: 16 },
        { label: 'Mã SKU', key: 'sku', width: 16 },
        { label: 'Tên sản phẩm', key: 'productName', width: 32 },
        { label: 'ĐVT', key: 'unit', width: 10, align: 'center' },
        { label: 'Số lượng xuất', key: 'totalQuantity', width: 16, format: 'number' },
        { label: 'Số đơn giao', key: 'orderCount', width: 14, format: 'number' }
      ];

      const buffer = await reportService.exportReportToExcel({
        title: 'RPT006 - BẢNG KÊ CHỌN HÀNG XUẤT THEO NVGH',
        headers,
        data
      });

      res.setHeader('Content-Disposition', 'attachment; filename="RPT006_Bang_Ke_Chon_Hang_Xuat.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.send(buffer);
    }

    res.status(200).json({ data });
  } catch (error) {
    console.error('Error in getRpt006:', error);
    res.status(500).json({ error: error.message || 'Lỗi báo cáo RPT006' });
  }
};

export const getRpt061 = async (req, res) => {
  try {
    const distributorId = req.query.distributorId || 1;
    const isExport = req.query.export === 'excel';
    const data = await reportService.getRpt061Data(distributorId, req.query);

    if (isExport) {
      const headers = [
        { label: 'STT', key: '__stt', width: 6, align: 'center' },
        { label: 'Mã đơn hàng', key: 'orderCode', width: 18 },
        { label: 'Ngày đặt', key: 'orderDate', width: 14, align: 'center' },
        { label: 'Khách hàng', key: 'retailerName', width: 28 },
        { label: 'VNBH', key: 'vnbhName', width: 20 },
        { label: 'Mã SKU', key: 'sku', width: 16 },
        { label: 'Tên sản phẩm', key: 'productName', width: 32 },
        { label: 'ĐVT', key: 'unit', width: 10, align: 'center' },
        { label: 'Số lượng', key: 'quantity', width: 14, format: 'number' },
        { label: 'Đơn giá (VNĐ)', key: 'unitPrice', width: 16, format: 'currency' },
        { label: 'Thành tiền (VNĐ)', key: 'totalAmount', width: 18, format: 'currency' },
        { label: 'Lô hàng phân bổ', key: 'allocatedLots', width: 26 },
        { label: 'Trạng thái', key: 'status', width: 14, align: 'center' }
      ];

      const buffer = await reportService.exportReportToExcel({
        title: 'RPT061 - BÁO CÁO CHI TIẾT DÒNG HÀNG (LINE ITEM)',
        headers,
        data
      });

      res.setHeader('Content-Disposition', 'attachment; filename="RPT061_Bao_Cao_Line_Item.xlsx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.send(buffer);
    }

    res.status(200).json({ data });
  } catch (error) {
    console.error('Error in getRpt061:', error);
    res.status(500).json({ error: error.message || 'Lỗi báo cáo RPT061' });
  }
};

export const exportSalesOrdersExcel = async (req, res) => {
  try {
    const distributorId = req.query.distributorId || 1;
    const { orders } = await findSalesOrdersByDistributor(distributorId, {
      ...req.query,
      page: 1,
      limit: 5000
    });

    const rows = orders.map(o => {
      let orderTotal = 0;
      if (o.invoice) {
        orderTotal = Number(o.invoice.totalAmount);
      } else if (o.items && o.items.length > 0) {
        orderTotal = o.items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
      }

      const expectedDate = new Date(o.createdAt);
      expectedDate.setDate(expectedDate.getDate() + 1);

      return {
        orderCode: o.orderCode,
        createdAt: new Date(o.createdAt).toLocaleDateString('vi-VN'),
        expectedDate: expectedDate.toLocaleDateString('vi-VN'),
        retailerCode: o.retailer?.code || '',
        retailerName: o.retailer?.name || '',
        retailerAddress: o.retailer?.address || '',
        vnbhName: o.createdBy?.fullName || '',
        tripCode: o.deliveryTrip?.tripCode || 'Chưa gán',
        status: o.status,
        itemCount: o.items?.length || 0,
        totalAmount: orderTotal
      };
    });

    const headers = [
      { label: 'STT', key: '__stt', width: 6, align: 'center' },
      { label: 'Mã đơn hàng', key: 'orderCode', width: 18 },
      { label: 'Ngày tạo', key: 'createdAt', width: 14, align: 'center' },
      { label: 'Ngày giao dự kiến', key: 'expectedDate', width: 16, align: 'center' },
      { label: 'Mã đại lý', key: 'retailerCode', width: 14 },
      { label: 'Tên đại lý', key: 'retailerName', width: 28 },
      { label: 'Địa chỉ giao hàng', key: 'retailerAddress', width: 34 },
      { label: 'VNBH', key: 'vnbhName', width: 20 },
      { label: 'Chuyến xe', key: 'tripCode', width: 16 },
      { label: 'Trạng thái', key: 'status', width: 14, align: 'center' },
      { label: 'Số mặt hàng', key: 'itemCount', width: 14, format: 'number' },
      { label: 'Tổng tiền (VNĐ)', key: 'totalAmount', width: 18, format: 'currency' }
    ];

    const buffer = await reportService.exportReportToExcel({
      title: 'DANH SÁCH ĐƠN HÀNG BÁN - DMS TRADE LEDGER',
      headers,
      data: rows
    });

    res.setHeader('Content-Disposition', 'attachment; filename="Danh_Sach_Don_Hang.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Error in exportSalesOrdersExcel:', error);
    res.status(500).json({ error: error.message || 'Lỗi xuất file Excel' });
  }
};
