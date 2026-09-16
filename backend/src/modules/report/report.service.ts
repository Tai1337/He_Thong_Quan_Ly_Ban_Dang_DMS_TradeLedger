import { Injectable } from '@nestjs/common';
import { ReportDataService, ExcelExportOptions } from './report-data.service';
import { findSalesOrdersByDistributor } from '../sales/sales-order.repository';

@Injectable()
export class ReportService {
  constructor(private readonly reportDataService: ReportDataService) {}

  async getRpt005Data(distributorId: any, query: any) {
    return this.reportDataService.getRpt005Data(distributorId, query);
  }

  async getRpt057Data(distributorId: any, query: any) {
    return this.reportDataService.getRpt057Data(distributorId, query);
  }

  async getRpt006Data(distributorId: any, query: any) {
    return this.reportDataService.getRpt006Data(distributorId, query);
  }

  async getRpt061Data(distributorId: any, query: any) {
    return this.reportDataService.getRpt061Data(distributorId, query);
  }

  async exportReportToExcel(options: ExcelExportOptions) {
    return this.reportDataService.exportReportToExcel(options);
  }

  async getSalesOrdersForExport(distributorId: any, query: any) {
    return findSalesOrdersByDistributor(distributorId, {
      ...query,
      page: 1,
      limit: 5000,
    });
  }
}

