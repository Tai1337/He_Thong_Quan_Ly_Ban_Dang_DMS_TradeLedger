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
} from '@nestjs/common';
import { Response } from 'express';
import { InventoryCountService } from './inventory-count.service';
import { CreateInventoryCountDto } from './dto/create-inventory-count.dto';
import { UpdateCountItemsDto } from './dto/update-count-items.dto';
import { QueryCountDto } from './dto/query-count.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('inventory/counts')
export class InventoryCountController {
  constructor(private readonly countService: InventoryCountService) {}

  private resolveDistributorId(user: any, fallback?: string | number) {
    return user?.distributorId || fallback || 1;
  }

  @Get()
  @Roles('ADMIN', 'WAREHOUSE_KEEPER')
  async getCounts(@Query() query: QueryCountDto, @CurrentUser() user: any) {
    const distributorId = this.resolveDistributorId(user, query.distributorId);
    return this.countService.getCounts(distributorId, query);
  }

  @Get('warehouse-skus')
  @Roles('ADMIN', 'WAREHOUSE_KEEPER')
  async getWarehouseSkus(
    @Query('warehouseId') warehouseId: string,
    @Query('distributorId') distributorIdQuery: string,
    @CurrentUser() user: any,
  ) {
    const distributorId = this.resolveDistributorId(user, distributorIdQuery);
    return this.countService.getWarehouseSkus(distributorId, warehouseId);
  }

  @Get(':id')
  @Roles('ADMIN', 'WAREHOUSE_KEEPER')
  async getCountById(
    @Param('id') id: string,
    @Query('distributorId') distributorIdQuery: string,
    @CurrentUser() user: any,
  ) {
    const distributorId = this.resolveDistributorId(user, distributorIdQuery);
    return this.countService.getCountById(id, distributorId);
  }

  @Post()
  @Roles('ADMIN')
  async createCount(
    @Body() dto: CreateInventoryCountDto,
    @Query('distributorId') distributorIdQuery: string,
    @CurrentUser() user: any,
  ) {
    const distributorId = dto.distributorId || this.resolveDistributorId(user, distributorIdQuery);
    if (!dto.createdById && user?.id) {
      dto.createdById = user.id;
    }
    return this.countService.createCount(distributorId, dto);
  }

  @Put(':id/items')
  @Roles('ADMIN', 'WAREHOUSE_KEEPER')
  async updateCountItems(
    @Param('id') id: string,
    @Body() dto: UpdateCountItemsDto,
    @Query('distributorId') distributorIdQuery: string,
    @CurrentUser() user: any,
  ) {
    const distributorId = this.resolveDistributorId(user, distributorIdQuery);
    return this.countService.updateCountItems(id, distributorId, dto);
  }

  @Patch(':id/submit')
  @Roles('ADMIN', 'WAREHOUSE_KEEPER')
  async submitCount(
    @Param('id') id: string,
    @Query('distributorId') distributorIdQuery: string,
    @CurrentUser() user: any,
  ) {
    const distributorId = this.resolveDistributorId(user, distributorIdQuery);
    return this.countService.submitCount(id, distributorId, user?.id);
  }

  @Patch(':id/approve')
  @Roles('ADMIN')
  async approveCount(
    @Param('id') id: string,
    @Body('userId') userIdBody: string | number,
    @Query('distributorId') distributorIdQuery: string,
    @CurrentUser() user: any,
  ) {
    const distributorId = this.resolveDistributorId(user, distributorIdQuery);
    const approvedById = userIdBody || user?.id;
    return this.countService.approveCount(id, distributorId, approvedById);
  }

  @Patch(':id/reject')
  @Roles('ADMIN')
  async rejectCount(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Query('distributorId') distributorIdQuery: string,
    @CurrentUser() user: any,
  ) {
    const distributorId = this.resolveDistributorId(user, distributorIdQuery);
    return this.countService.rejectCount(id, distributorId, reason, user?.id);
  }

  @Patch(':id/cancel')
  @Roles('ADMIN')
  async cancelCount(
    @Param('id') id: string,
    @Query('distributorId') distributorIdQuery: string,
    @CurrentUser() user: any,
  ) {
    const distributorId = this.resolveDistributorId(user, distributorIdQuery);
    return this.countService.cancelCount(id, distributorId);
  }

  @Get(':id/export')
  @Roles('ADMIN', 'WAREHOUSE_KEEPER')
  async exportCountExcel(
    @Param('id') id: string,
    @Query('distributorId') distributorIdQuery: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const distributorId = this.resolveDistributorId(user, distributorIdQuery);
    const buffer = await this.countService.exportCountExcel(id, distributorId);

    res.setHeader('Content-Disposition', `attachment; filename="BienBanKiemKe_${id}.xlsx"`);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.send(buffer);
  }
}
