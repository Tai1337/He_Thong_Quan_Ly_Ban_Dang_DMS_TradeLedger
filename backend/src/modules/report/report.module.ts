import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { ReportDataService } from './report-data.service';

@Module({
  controllers: [ReportController],
  providers: [ReportService, ReportDataService],
  exports: [ReportService, ReportDataService],
})
export class ReportModule {}

