import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { EventsModule } from './events/events.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { SalesModule } from './modules/sales/sales.module';
import { PromotionModule } from './modules/promotion/promotion.module';
import { PurchaseModule } from './modules/purchase/purchase.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { ReportModule } from './modules/report/report.module';
import { ShopModule } from './modules/shop/shop.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { BigIntInterceptor } from './common/interceptors/bigint.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    PrismaModule,
    EventsModule,
    AuthModule,
    CatalogModule,
    InventoryModule,
    SalesModule,
    PromotionModule,
    PurchaseModule,
    DeliveryModule,
    ReportModule,
    ShopModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: BigIntInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
