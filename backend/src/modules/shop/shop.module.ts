import { Module } from '@nestjs/common';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';
import { ShopPortalService } from './shop-portal.service';

@Module({
  controllers: [ShopController],
  providers: [ShopService, ShopPortalService],
  exports: [ShopService, ShopPortalService],
})
export class ShopModule {}

