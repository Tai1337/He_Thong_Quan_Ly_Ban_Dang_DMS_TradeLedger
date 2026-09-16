import { Module } from '@nestjs/common';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { DeliveryTripService } from './delivery-trip.service';
import { DeliveryTripRepository } from './delivery-trip.repository';

@Module({
  controllers: [DeliveryController],
  providers: [DeliveryService, DeliveryTripService, DeliveryTripRepository],
  exports: [DeliveryService, DeliveryTripService, DeliveryTripRepository],
})
export class DeliveryModule {}
