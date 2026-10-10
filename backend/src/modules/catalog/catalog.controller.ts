import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { Public } from '../../common/decorators/public.decorator';

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

  @Get('categories')
  async getCategories() {
    return this.catalogService.getCategories();
  }

  @Get('admin/products')
  async getAdminProducts(
    @Query('search') search?: string,
    @Query('productType') productType?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.catalogService.getAdminProducts({ search, productType, categoryId });
  }

  @Post('admin/products')
  async createAdminProduct(@Body() body: any) {
    try {
      const product = await this.catalogService.createAdminProduct(body);
      return {
        success: true,
        message: 'Tạo sản phẩm mới thành công',
        data: product,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Lỗi khi tạo sản phẩm mới',
      };
    }
  }

  @Post('admin/products/:id/sample-allocations')
  async allocateSamples(
    @Param('id') id: string,
    @Body() body: { allocations: Array<{ retailerId: string; allocatedQty: number }> },
  ) {
    try {
      const results = await this.catalogService.allocateSamples(id, body.allocations);
      return {
        success: true,
        message: 'Phân bổ hàng mẫu về các cửa hàng thành công',
        data: results,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Lỗi khi phân bổ hàng mẫu',
      };
    }
  }

  @Put('admin/products/sample-allocations/:allocationId/feedback')
  async updateSampleFeedback(
    @Param('allocationId') allocationId: string,
    @Body()
    body: {
      testedCount: number;
      likedCount: number;
      storePreorderQty: number;
      feedbackNotes?: string;
    },
  ) {
    try {
      const result = await this.catalogService.updateSampleFeedback(allocationId, body);
      return {
        success: true,
        message: 'Cập nhật phản hồi dùng thử và nhu cầu đặt thử thành công',
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Lỗi khi cập nhật phản hồi',
      };
    }
  }

  @Patch('admin/products/:id/approve-commercial')
  async approveCommercial(@Param('id') id: string) {
    try {
      const result = await this.catalogService.approveSampleToCommercial(id);
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Lỗi khi duyệt mở bán chính thức',
      };
    }
  }

  @Patch('admin/products/:id/reject-sample')
  async rejectSample(
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    try {
      const result = await this.catalogService.rejectSample(id, body?.reason || '');
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Lỗi khi từ chối mẫu',
      };
    }
  }
}

