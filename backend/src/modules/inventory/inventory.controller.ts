import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { InventoryService } from './inventory.service';
import { generateExcelBuffer } from '../../common/utils/excel-generator';
import { rpt083Config } from '../../config/reports/rpt083.config';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('rpt083')
  async getInventoryRpt083(@Query() query: any) {
    const distributorId = query.distributorId || 1;
    return this.inventoryService.getInventoryRpt083Service(distributorId, query);
  }

  @Get('rpt083/export')
  async getInventoryRpt083Export(@Query() query: any, @Res() res: Response) {
    const distributorId = query.distributorId || 1;
    const data = await this.inventoryService.getInventoryRpt083ExportService(distributorId, query);

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString('en-GB');
    const metaData = { exportDate: dateStr };

    const buffer = await generateExcelBuffer(data, rpt083Config, metaData);

    res.setHeader('Content-Disposition', 'attachment; filename="BaoCaoTonKhoNPP.xlsx"');
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.send(buffer);
  }
}
