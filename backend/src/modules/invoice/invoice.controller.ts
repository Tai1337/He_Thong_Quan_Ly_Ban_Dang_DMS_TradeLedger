import { Controller, Get, Post, Param, Body, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { InvoiceService } from './invoice.service';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  async getInvoices(@Query() query: any) {
    const distributorId = query.distributorId || 1;
    return this.invoiceService.getInvoices(distributorId, query);
  }

  @Get('export')
  async exportInvoices(@Query() query: any, @Res() res: Response) {
    const distributorId = query.distributorId || 1;
    const buffer = await this.invoiceService.exportInvoicesExcel(distributorId, query);

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    res.setHeader('Content-Disposition', `attachment; filename="So_Cong_No_Hoa_Don_${dateStr}.xlsx"`);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.send(buffer);
  }

  @Get(':id')
  async getInvoiceById(@Param('id') id: string, @Query('distributorId') distributorIdQuery?: string) {
    const distributorId = distributorIdQuery || 1;
    return this.invoiceService.getInvoiceById(id, distributorId);
  }

  @Post(':id/payments')
  async recordPayment(
    @Param('id') id: string,
    @Body() body: any,
    @Query('distributorId') distributorIdQuery?: string,
  ) {
    const distributorId = body.distributorId || distributorIdQuery || 1;
    return this.invoiceService.recordPayment(id, distributorId, body);
  }
}

