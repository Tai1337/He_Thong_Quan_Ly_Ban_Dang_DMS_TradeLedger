import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  Query,
  Res,
  Req,
} from '@nestjs/common';
import { Response } from 'express';
import { InventoryCountService } from './inventory-count.service';
import { CreateInventoryCountDto } from './dto/create-inventory-count.dto';
import { UpdateCountItemsDto } from './dto/update-count-items.dto';
import { QueryCountDto } from './dto/query-count.dto';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('inventory/counts')
export class InventoryCountController {
  constructor(private readonly countService: InventoryCountService) {}

  @Get()
  async getCounts(@Query() query: QueryCountDto) {
    const distributorId = query.distributorId || 1;
    return this.countService.getCounts(distributorId, query);
  }

  @Get(':id')
  async getCountById(@Param('id') id: string, @Query('distributorId') distributorIdQuery?: string) {
    const distributorId = distributorIdQuery || 1;
    return this.countService.getCountById(id, distributorId);
  }

  @Post()
  async createCount(@Body() dto: CreateInventoryCountDto, @Query('distributorId') distributorIdQuery?: string) {
    const distributorId = dto.distributorId || distributorIdQuery || 1;
    return this.countService.createCount(distributorId, dto);
  }

  @Put(':id/items')
  async updateCountItems(
    @Param('id') id: string,
    @Body() dto: UpdateCountItemsDto,
    @Query('distributorId') distributorIdQuery?: string,
  ) {
    const distributorId = distributorIdQuery || 1;
    return this.countService.updateCountItems(id, distributorId, dto);
  }

  @Patch(':id/submit')
  async submitCount(@Param('id') id: string, @Query('distributorId') distributorIdQuery?: string) {
    const distributorId = distributorIdQuery || 1;
    return this.countService.submitCount(id, distributorId);
  }

  @Patch(':id/approve')
  async approveCount(
    @Param('id') id: string,
    @Body('userId') userIdBody?: string | number,
    @Query('distributorId') distributorIdQuery?: string,
  ) {
    const distributorId = distributorIdQuery || 1;
    return this.countService.approveCount(id, distributorId, userIdBody);
  }

  @Patch(':id/reject')
  async rejectCount(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Query('distributorId') distributorIdQuery?: string,
  ) {
    const distributorId = distributorIdQuery || 1;
    return this.countService.rejectCount(id, distributorId, reason);
  }

  @Patch(':id/cancel')
  async cancelCount(@Param('id') id: string, @Query('distributorId') distributorIdQuery?: string) {
    const distributorId = distributorIdQuery || 1;
    return this.countService.cancelCount(id, distributorId);
  }

  @Get(':id/export')
  async exportCountExcel(
    @Param('id') id: string,
    @Query('distributorId') distributorIdQuery: string,
    @Res() res: Response,
  ) {
    const distributorId = distributorIdQuery || 1;
    const buffer = await this.countService.exportCountExcel(id, distributorId);

    res.setHeader('Content-Disposition', `attachment; filename="BienBanKiemKe_${id}.xlsx"`);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.send(buffer);
  }
}
