import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { PromotionService } from './promotion.service';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('promotions')
export class PromotionController {
  constructor(private readonly promotionService: PromotionService) {}

  @Get()
  async getPromotions(@Query() query: any) {
    const { distributorId = 1, ...filters } = query;
    return this.promotionService.getPromotions(distributorId, filters);
  }

  @Get(':id')
  async getPromotionById(
    @Param('id') id: string,
    @Query('distributorId') distributorId: any = 1,
  ) {
    return this.promotionService.getPromotionById(id, distributorId);
  }

  @Post()
  async createPromotion(@Body() body: any, @Query('distributorId') qDistId?: any) {
    const distributorId = qDistId || body.distributorId || 1;
    return this.promotionService.createPromotion(distributorId, body);
  }

  @Patch(':id')
  async updatePromotion(
    @Param('id') id: string,
    @Body() body: any,
    @Query('distributorId') qDistId?: any,
  ) {
    const distributorId = qDistId || body.distributorId || 1;
    return this.promotionService.updatePromotion(id, distributorId, body);
  }
}
