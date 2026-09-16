import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ReportService } from './report.service';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('rpt005')
  async getRpt005(@Query() query: any, @Res() res: Response) {
    const distributorId = query.distributorId || 1;
    const isExport = query.export === 'excel';
    const result = await this.reportService.getRpt005Data(distributorId, query);

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
        { label: 'Trạng thái', key: 'status', width: 14, align: 'center' },
      ];

      const buffer = await this.reportService.exportReportToExcel({
        title: `RPT005 - BÁO CÁO ĐƠN HÀNG THIẾU TỒN KHO (${result.mode === 'missing_only' ? 'CHỈ HÀNG THIẾU' : 'TẤT CẢ'})`,
        headers,
        data: result.data,
      });

      res.setHeader(
        'Content-Disposition',
        'attachment; filename="RPT005_Don_Hang_Thieu_Ton.xlsx"',
      );
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      return res.send(buffer);
    }

    return res.status(200).json(result);
  }

  @Get('rpt057')
  async getRpt057(@Query() query: any, @Res() res: Response) {
    const distributorId = query.distributorId || 1;
    const isExport = query.export === 'excel';
    const data = await this.reportService.getRpt057Data(distributorId, query);

    if (isExport) {
      const headers = [
        { label: 'STT', key: '__stt', width: 6, align: 'center' },
        { label: 'Mã VNBH', key: 'vnbhCode', width: 16 },
        { label: 'Họ tên VNBH', key: 'vnbhName', width: 26 },
        { label: 'Tổng số đơn', key: 'totalOrders', width: 14, format: 'number' },
        {
          label: 'Tổng sản lượng (Thùng)',
          key: 'totalQuantity',
          width: 22,
          format: 'number',
        },
        {
          label: 'Tổng doanh số (VNĐ)',
          key: 'totalAmount',
          width: 22,
          format: 'currency',
        },
      ];

      const buffer = await this.reportService.exportReportToExcel({
        title: 'RPT057 - BÁO CÁO DOANH SỐ VÀ SẢN LƯỢNG THEO VNBH',
        headers,
        data,
      });

      res.setHeader(
        'Content-Disposition',
        'attachment; filename="RPT057_Doanh_So_San_Luong.xlsx"',
      );
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      return res.send(buffer);
    }

    return res.status(200).json({ data });
  }

  @Get('rpt006')
  async getRpt006(@Query() query: any, @Res() res: Response) {
    const distributorId = query.distributorId || 1;
    const isExport = query.export === 'excel';
    const data = await this.reportService.getRpt006Data(distributorId, query);

    if (isExport) {
      const headers = [
        { label: 'STT', key: '__stt', width: 6, align: 'center' },
        { label: 'Mã chuyến xe', key: 'tripCode', width: 20 },
        { label: 'Tài xế / NVGH', key: 'driverName', width: 24 },
        { label: 'Số điện thoại', key: 'driverPhone', width: 16 },
        { label: 'Mã SKU', key: 'sku', width: 16 },
        { label: 'Tên sản phẩm', key: 'productName', width: 32 },
        { label: 'ĐVT', key: 'unit', width: 10, align: 'center' },
        {
          label: 'Số lượng xuất',
          key: 'totalQuantity',
          width: 16,
          format: 'number',
        },
        { label: 'Số đơn giao', key: 'orderCount', width: 14, format: 'number' },
      ];

      const buffer = await this.reportService.exportReportToExcel({
        title: 'RPT006 - BẢNG KÊ CHỌN HÀNG XUẤT THEO NVGH',
        headers,
        data,
      });

      res.setHeader(
        'Content-Disposition',
        'attachment; filename="RPT006_Bang_Ke_Chon_Hang_Xuat.xlsx"',
      );
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      return res.send(buffer);
    }

    return res.status(200).json({ data });
  }

  @Get('rpt061')
  async getRpt061(@Query() query: any, @Res() res: Response) {
    const distributorId = query.distributorId || 1;
    const isExport = query.export === 'excel';
    const data = await this.reportService.getRpt061Data(distributorId, query);

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
        {
          label: 'Thành tiền (VNĐ)',
          key: 'totalAmount',
          width: 18,
          format: 'currency',
        },
        { label: 'Lô hàng phân bổ', key: 'allocatedLots', width: 26 },
        { label: 'Trạng thái', key: 'status', width: 14, align: 'center' },
      ];

      const buffer = await this.reportService.exportReportToExcel({
        title: 'RPT061 - BÁO CÁO CHI TIẾT DÒNG HÀNG (LINE ITEM)',
        headers,
        data,
      });

      res.setHeader(
        'Content-Disposition',
        'attachment; filename="RPT061_Bao_Cao_Line_Item.xlsx"',
      );
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      return res.send(buffer);
    }

    return res.status(200).json({ data });
  }
}
