import { Module } from '@nestjs/common';
import { PurchaseController } from './purchase.controller';
import { PurchaseService } from './purchase.service';
import { PurchaseOrderService } from './purchase-order.service';
import { PurchaseOrderRepository } from './purchase-order.repository';
import { PurchaseReceivingService } from './purchase-receiving.service';
import { PurchaseReceivingRepository } from './purchase-receiving.repository';

@Module({
  controllers: [PurchaseController],
  providers: [
    PurchaseService,
    PurchaseOrderService,
    PurchaseOrderRepository,
    PurchaseReceivingService,
    PurchaseReceivingRepository,
  ],
  exports: [
    PurchaseService,
    PurchaseOrderService,
    PurchaseOrderRepository,
    PurchaseReceivingService,
    PurchaseReceivingRepository,
  ],
})
export class PurchaseModule {}
