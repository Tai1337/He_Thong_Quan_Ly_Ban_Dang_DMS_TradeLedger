import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { PurchaseService } from './purchase.service';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller()
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  // ==========================================
  // 1. PURCHASE ORDERS (PO)
  // ==========================================

  @Get(['purchase-orders', 'purchase/orders'])
  async getPurchaseOrders(@Query() query: any) {
    const { distributorId = 1, ...filters } = query;
    return this.purchaseService.getPurchaseOrders(distributorId, filters);
  }

  @Get(['purchase-orders/discrepancies', 'purchase/orders/discrepancies'])
  async getDiscrepancies(@Query() query: any) {
    const { distributorId = 1, ...filters } = query;
    return this.purchaseService.getDiscrepancies(distributorId, filters);
  }

  @Get(['purchase-orders/export', 'purchase/orders/export'])
  async exportExcel(@Query() query: any, @Res() res: Response) {
    const { distributorId = 1, ...filters } = query;
    const workbook: any = await this.purchaseService.exportExcel(distributorId, filters);

    const filename = `DanhSachPO_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  }

  @Get(['purchase-orders/:id', 'purchase/orders/:id'])
  async getPurchaseOrderById(
    @Param('id') id: string,
    @Query('distributorId') distributorId: any = 1,
  ) {
    return this.purchaseService.getPurchaseOrderById(id, distributorId);
  }

  @Post(['purchase-orders', 'purchase/orders'])
  async createPurchaseOrder(@Body() body: any) {
    return this.purchaseService.createPurchaseOrder(body);
  }

  @Patch(['purchase-orders/:id', 'purchase/orders/:id'])
  async updatePurchaseOrder(@Param('id') id: string, @Body() body: any) {
    return this.purchaseService.updatePurchaseOrder(id, body);
  }

  @Patch(['purchase-orders/:id/send', 'purchase/orders/:id/send'])
  async sendPurchaseOrder(@Param('id') id: string, @Body() body: any) {
    return this.purchaseService.sendPurchaseOrder(id, body);
  }

  @Patch(['purchase-orders/:id/cancel', 'purchase/orders/:id/cancel'])
  async cancelPurchaseOrder(@Param('id') id: string, @Body() body: any) {
    return this.purchaseService.cancelPurchaseOrder(id, body);
  }

  @Post(['purchase-orders/:id/receive', 'purchase/orders/:id/receive'])
  async receiveGoods(@Param('id') id: string, @Body() body: any) {
    return this.purchaseService.receiveGoods(id, body);
  }

  @Patch(['purchase-orders/:id/close-partial', 'purchase/orders/:id/close-partial'])
  async closePartialPurchaseOrder(@Param('id') id: string, @Body() body: any) {
    return this.purchaseService.closePartialPurchaseOrder(id, body);
  }

  // ==========================================
  // 2. PURCHASE RECEIVING (NHẬP KHO CHUYẾN XE)
  // ==========================================

  @Get('purchase/receiving/trips')
  async getInboundDeliveryTrips(@Query() query: any) {
    const { distributorId = 1, ...filters } = query;
    return this.purchaseService.getInboundDeliveryTrips(distributorId, filters);
  }

  @Get('purchase/receiving/trips/:tripId')
  async getInboundTripDetail(
    @Param('tripId') tripId: string,
    @Query('distributorId') distributorId: any = 1,
  ) {
    return this.purchaseService.getInboundTripDetail(tripId, distributorId);
  }

  @Post('purchase/receiving/trips/:tripId/receive')
  async receiveTripGoods(@Param('tripId') tripId: string, @Body() body: any) {
    const { distributorId = 1, receivedItems, userId } = body;
    return this.purchaseService.receiveTripGoods({
      tripId,
      distributorId,
      receivedItems,
      userId,
    });
  }
}
