import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ShopService } from './shop.service';
import { Public } from '../../common/decorators/public.decorator';

@Public()
@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Post('auth/register')
  async register(@Body() body: any) {
    const customer = await this.shopService.registerCustomer(body);
    return {
      success: true,
      message: 'Đăng ký tài khoản thành công',
      customer,
    };
  }

  @Post('auth/login')
  async login(@Body() body: any) {
    const { phone, password } = body;
    const customer = await this.shopService.loginCustomer(phone, password);
    return {
      success: true,
      message: 'Đăng nhập thành công',
      customer,
    };
  }

  @Get('auth/profile/:customerId')
  async getProfile(@Param('customerId') customerId: string) {
    const customer = await this.shopService.getCustomerProfile(customerId);
    return {
      success: true,
      customer,
    };
  }

  @Get('products')
  async getProducts(@Query() query: any) {
    const { categoryId, search, accountType, cursor, limit } = query;
    const result = await this.shopService.getShopProducts({
      categoryId,
      search,
      accountType,
      cursor,
      limit: limit ? Number(limit) : 16,
    });
    return {
      success: true,
      data: result.items,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
      totalCount: result.totalCount,
    };
  }

  @Get('categories')
  async getCategories() {
    const categories = await this.shopService.getShopCategories();
    return {
      success: true,
      data: categories,
    };
  }

  @Get('products/:id')
  async getProductDetail(
    @Param('id') id: string,
    @Query('accountType') accountType?: string,
  ) {
    const product = await this.shopService.getShopProductDetail(id, accountType);
    return {
      success: true,
      data: product,
    };
  }

  @Post('orders')
  async placeOrder(@Body() body: any) {
    const order = await this.shopService.placeShopOrder(body);
    return {
      success: true,
      message: 'Đặt hàng thành công',
      order,
    };
  }

  @Get('my-orders/:customerId')
  async getMyOrders(@Param('customerId') customerId: string) {
    const orders = await this.shopService.getCustomerOrders(customerId);
    return {
      success: true,
      data: orders,
    };
  }

  @Get('orders/:orderCode')
  async getOrderDetail(@Param('orderCode') orderCode: string) {
    const order = await this.shopService.getOrderDetailByCode(orderCode);
    return {
      success: true,
      data: order,
    };
  }
}
