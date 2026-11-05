import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Post, Put, Query } from '@nestjs/common';
import { SalesRouteService } from './sales-route.service';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('sales-routes')
export class SalesRouteController {
  constructor(private readonly salesRouteService: SalesRouteService) {}

  @Get()
  async getRoutes(
    @Query('distributorId') distributorId?: string,
    @Query('salesRepId') salesRepId?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.salesRouteService.getRoutes(distributorId, salesRepId, includeInactive);
  }

  @Get('weekly')
  async getWeekly(
    @Query('distributorId') distributorId?: string,
    @Query('salesRepId') salesRepId?: string,
  ) {
    return this.salesRouteService.getWeekly(distributorId, salesRepId);
  }

  @Post()
  async createRoute(
    @Body()
    body: {
      distributorId?: string;
      name: string;
      salesRepId: string;
      notes?: string;
      stops?: Array<{ retailerId: string; weekday: number; visitOrder?: number }>;
    },
  ) {
    try {
      return await this.salesRouteService.createRoute(body);
    } catch (error: any) {
      if (error.message?.includes('Cần nhập')) throw new BadRequestException(error.message);
      throw error;
    }
  }

  @Put(':id')
  async updateRoute(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      salesRepId?: string;
      notes?: string;
      status?: boolean;
      stops?: Array<{ retailerId: string; weekday: number; visitOrder?: number }>;
    },
  ) {
    try {
      return await this.salesRouteService.updateRoute(id, body);
    } catch (error: any) {
      if (error.message?.includes('Không tìm thấy')) throw new NotFoundException(error.message);
      throw error;
    }
  }

  @Delete(':id')
  async deleteRoute(@Param('id') id: string) {
    try {
      return await this.salesRouteService.deleteRoute(id);
    } catch (error: any) {
      if (error.message?.includes('Không tìm thấy')) throw new NotFoundException(error.message);
      throw error;
    }
  }
}
