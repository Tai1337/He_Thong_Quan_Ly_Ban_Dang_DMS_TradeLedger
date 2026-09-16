import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { SalesService } from './sales.service';
import { ReportService } from '../report/report.service';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller(['sales', 'sales-orders'])
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly reportService: ReportService,
  ) {}

  @Get('export')
  async exportSalesOrdersExcel(@Query() query: any, @Res() res: Response) {
    const distributorId = query.distributorId || 1;
    const { orders } = await this.reportService.getSalesOrdersForExport(
      distributorId,
      query,
    );

    const rows = orders.map((o: any) => {
      let orderTotal = 0;
      if (o.invoice) {
        orderTotal = Number(o.invoice.totalAmount);
      } else if (o.items && o.items.length > 0) {
        orderTotal = o.items.reduce(
          (sum: number, item: any) =>
            sum + Number(item.quantity) * Number(item.unitPrice),
          0,
        );
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
        totalAmount: orderTotal,
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
      { label: 'Tổng tiền (VNĐ)', key: 'totalAmount', width: 18, format: 'currency' },
    ];

    const buffer = await this.reportService.exportReportToExcel({
      title: 'DANH SÁCH ĐƠN HÀNG BÁN - DMS TRADE LEDGER',
      headers,
      data: rows,
    });

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Danh_Sach_Don_Hang.xlsx"',
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.send(buffer);
  }

  @Get('meta/options')
  async getSalesOrderMeta(@Query('distributorId') distributorId: any = 1) {
    return this.salesService.getSalesOrderMetadata(distributorId);
  }

  @Get('meta/available-trips')
  async getAvailableTrips(
    @Query('distributorId') distributorId: any = 1,
    @Query('warehouseId') warehouseId?: any,
  ) {
    const trips = await this.salesService.getAvailableDeliveryTrips(
      distributorId,
      warehouseId,
    );
    return { data: trips };
  }

  @Get('analytics/summary')
  async getSalesAnalytics(@Query() query: any) {
    const distributorId = query.distributorId || 1;
    return this.salesService.getSalesAnalytics(distributorId, query);
  }

  @Get()
  async getSalesOrders(@Query() query: any) {
    const distributorId = query.distributorId || 1;
    return this.salesService.getSalesOrdersWithKPIs(distributorId, query);
  }

  @Post()
  async createSalesOrder(@Body() body: any, @Query('distributorId') qDistId?: any) {
    const distributorId = qDistId || body.distributorId || 1;
    const createdById = body.createdById || 1;
    return this.salesService.createNewSalesOrder(body, distributorId, createdById);
  }

  @Post('bulk-confirm')
  async bulkConfirmOrders(@Body() body: any, @Query('distributorId') qDistId?: any) {
    const { orderIds, changedById } = body;
    const distributorId = qDistId || body.distributorId || 1;
    const userId = changedById || 1;
    return this.salesService.bulkConfirmOrders(orderIds, distributorId, userId);
  }

  @Get(':id')
  async getSalesOrderById(
    @Param('id') id: string,
    @Query('distributorId') distributorId: any = 1,
  ) {
    return this.salesService.getOrderDetail(id, distributorId);
  }

  @Patch(':id/submit')
  async submitOrder(
    @Param('id') id: string,
    @Body() body: any,
    @Query('distributorId') qDistId?: any,
  ) {
    const distributorId = qDistId || body.distributorId || 1;
    const userId = body.changedById || 1;
    return this.salesService.submitOrder(id, distributorId, userId);
  }

  @Patch(':id/confirm')
  async confirmOrder(
    @Param('id') id: string,
    @Body() body: any,
    @Query('distributorId') qDistId?: any,
  ) {
    const distributorId = qDistId || body.distributorId || 1;
    const changedById = body.changedById || 1;
    return this.salesService.confirmOrder(id, distributorId, changedById);
  }

  @Patch(':id/cancel')
  async cancelOrder(
    @Param('id') id: string,
    @Body() body: any,
    @Query('distributorId') qDistId?: any,
  ) {
    const { reason, changedById } = body;
    const distributorId = qDistId || body.distributorId || 1;
    const userId = changedById || 1;
    return this.salesService.cancelOrder(id, distributorId, userId, reason);
  }

  @Patch(':id/assign-trip')
  async assignTrip(
    @Param('id') id: string,
    @Body() body: any,
    @Query('distributorId') qDistId?: any,
  ) {
    const { tripId, changedById } = body;
    const distributorId = qDistId || body.distributorId || 1;
    const userId = changedById || 1;
    return this.salesService.assignDeliveryTrip(id, distributorId, tripId, userId);
  }

  @Patch(':id/unassign-trip')
  async unassignTrip(
    @Param('id') id: string,
    @Body() body: any,
    @Query('distributorId') qDistId?: any,
  ) {
    const { reason, changedById } = body;
    const distributorId = qDistId || body.distributorId || 1;
    const userId = changedById || 1;
    return this.salesService.unassignDeliveryTrip(id, distributorId, userId, reason);
  }

  @Patch(':id/confirm-delivery')
  async confirmDelivery(
    @Param('id') id: string,
    @Body() body: any,
    @Query('distributorId') qDistId?: any,
  ) {
    const { isSuccess = true, note, changedById } = body;
    const distributorId = qDistId || body.distributorId || 1;
    const userId = changedById || 1;
    return this.salesService.confirmDelivery(
      id,
      distributorId,
      userId,
      isSuccess,
      note,
    );
  }

  @Patch(':id/close')
  async closeOrder(
    @Param('id') id: string,
    @Body() body: any,
    @Query('distributorId') qDistId?: any,
  ) {
    const distributorId = qDistId || body.distributorId || 1;
    const userId = body.changedById || 1;
    return this.salesService.closeOrder(id, distributorId, userId);
  }

  @Post(':id/items')
  async addOrderItem(
    @Param('id') id: string,
    @Body() body: any,
    @Query('distributorId') qDistId?: any,
  ) {
    const distributorId = qDistId || body.distributorId || 1;
    const userId = body.changedById || 1;
    return this.salesService.addOrderItem(id, distributorId, userId, body);
  }

  @Put(':id/items/:itemId')
  async updateOrderItemQuantity(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: any,
    @Query('distributorId') qDistId?: any,
  ) {
    const { newQuantity, quantity, reason, changedById } = body;
    const finalQty = newQuantity !== undefined ? newQuantity : quantity;
    const distributorId = qDistId || body.distributorId || 1;
    const userId = changedById || 1;
    return this.salesService.updateOrderItemQuantity(
      id,
      itemId,
      finalQty,
      distributorId,
      userId,
      reason,
    );
  }

  @Delete(':id/items/:itemId')
  async removeOrderItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() body: any,
    @Query('distributorId') qDistId?: any,
  ) {
    const distributorId = qDistId || body?.distributorId || 1;
    const userId = body?.changedById || 1;
    return this.salesService.removeOrderItem(id, itemId, distributorId, userId);
  }
}
