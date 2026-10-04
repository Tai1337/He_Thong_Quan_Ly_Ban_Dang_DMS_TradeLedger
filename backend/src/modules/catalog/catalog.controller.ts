import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { Public } from '../../common/decorators/public.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Public()
@Controller(['catalog', 'master'])
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('warehouses')
  async getWarehouses(@Query('distributorId') distributorId?: string) {
    return this.catalogService.getWarehouses(distributorId);
  }

  @Get('retailers')
  async getRetailers(
    @Query('distributorId') distributorId?: string,
    @Query('search') search?: string,
  ) {
    return this.catalogService.getRetailers(distributorId, search);
  }

  @Get('delivery-trips')
  async getDeliveryTrips(@Query('distributorId') distributorId?: string) {
    return this.catalogService.getDeliveryTrips(distributorId);
  }

  @Get('sales-reps')
  async getSalesReps(@Query('distributorId') distributorId?: string) {
    return this.catalogService.getSalesReps(distributorId);
  }

  @Get('products')
  async getProducts(@Query('search') search?: string) {
    return this.catalogService.getProducts(search);
  }

  @Get('suppliers')
  async getSuppliers(@Query('search') search?: string) {
    return this.catalogService.getSuppliers(search);
  }

  @Post('products')
  async createProduct(@Body() createProductDto: CreateProductDto) {
    return this.catalogService.createProduct(createProductDto);
  }

  @Put('products/:id')
  async updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.catalogService.updateProduct(id, updateProductDto);
  }
}
