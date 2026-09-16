import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { SalesOrderService } from './sales-order.service';
import { SalesOrderRepository } from './sales-order.repository';
import { ReportModule } from '../report/report.module';

@Module({
  imports: [ReportModule],
  controllers: [SalesController],
  providers: [SalesService, SalesOrderService, SalesOrderRepository],
  exports: [SalesService, SalesOrderService, SalesOrderRepository],
})
export class SalesModule {}
