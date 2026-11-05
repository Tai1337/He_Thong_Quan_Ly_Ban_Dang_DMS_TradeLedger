import { Module } from '@nestjs/common';
import { SalesRouteController } from './sales-route.controller';
import { SalesRouteService } from './sales-route.service';

@Module({
  controllers: [SalesRouteController],
  providers: [SalesRouteService],
  exports: [SalesRouteService],
})
export class SalesRouteModule {}
