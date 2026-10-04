import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './inventory.repository';
import { InventoryCountController } from './inventory-count.controller';
import { InventoryCountService } from './inventory-count.service';
import { InventoryCountRepository } from './inventory-count.repository';

@Module({
  controllers: [InventoryController, InventoryCountController],
  providers: [
    InventoryService,
    InventoryRepository,
    InventoryCountService,
    InventoryCountRepository,
  ],
  exports: [
    InventoryService,
    InventoryRepository,
    InventoryCountService,
    InventoryCountRepository,
  ],
})
export class InventoryModule {}
