import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import prisma from '../../prisma/prisma.client';
import {
  findSalesOrdersByDistributor,
  getTotalAvailableStock,
} from '../sales/sales-order.repository';

export interface ExcelHeaderDef {
  key: string;
  label: string;
  width?: number;
  format?: 'currency' | 'number' | string;
  align?: string;
}

export interface ExcelExportOptions {
  title: string;
  headers: ExcelHeaderDef[];
  data: any[];
  fileName?: string;
}

@Injectable()
export class ReportDataService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy dữ liệu cho RPT005: Báo cáo đơn hàng thiếu tồn kho
   * Hỗ trợ 2 chế độ: mode='missing_only' | 'all'
   */
  async getRpt005Data(distributorId: string | number | bigint, filters: any = {}) {
    const mode = filters.mode || 'missing_only';
    // Lấy toàn bộ đơn hàng phù hợp filter (bỏ giới hạn pagination cho báo cáo)
    const { orders } = await findSalesOrdersByDistributor(distributorId, {
      ...filters,
      page: 1,
      limit: 1000,
    });

    const productStockCache: Record<string, number> = {};
    const reportRows: any[] = [];

    for (const order of orders) {
      for (const item of order.items || []) {
        const prodId = item.productId.toString();
        if (productStockCache[prodId] === undefined) {
          productStockCache[prodId] = await getTotalAvailableStock(item.productId, order.warehouseId);
        }

        const orderQty = Number(item.quantity);
        const availableQty = productStockCache[prodId];
        const shortageQty = Math.max(0, orderQty - availableQty);
        const isShortage = shortageQty > 0;

        if (mode === 'missing_only' && !isShortage) {
          continue; // Bỏ qua nếu đủ tồn
        }

        reportRows.push({
          orderId: order.id.toString(),
          orderCode: order.orderCode,
          orderDate: new Date(order.createdAt).toLocaleDateString('vi-VN'),
          vnbhCode: order.createdBy?.username || '',
          vnbhName: order.createdBy?.fullName || '',
          retailerCode: order.retailer?.code || '',
          retailerName: order.retailer?.name || '',
          warehouseName: order.warehouse?.name || '',
          itemId: item.id.toString(),
          productId: item.productId.toString(),
          sku: item.product?.sku || '',
          productName: item.product?.name || '',
          unit: item.product?.unit || 'THÙNG',
          orderQty,
          availableQty,
          shortageQty,
          isShortage,
          unitPrice: Number(item.unitPrice),
          totalAmount: orderQty * Number(item.unitPrice),
          status: order.status,
        });
      }
    }

    return {
      mode,
      totalRecords: reportRows.length,
      shortageCount: reportRows.filter((r) => r.isShortage).length,
      data: reportRows,
    };
  }

  /**
   * Lấy dữ liệu cho RPT057: Báo cáo doanh số và sản lượng
   */
  async getRpt057Data(distributorId: string | number | bigint, filters: any = {}) {
    const { orders } = await findSalesOrdersByDistributor(distributorId, {
      ...filters,
      page: 1,
      limit: 2000,
    });

    // Gom nhóm theo VNBH
    const vnbhMap: Record<string, any> = {};

    for (const order of orders) {
      const vnbhKey = order.createdBy?.username || 'Chưa gán';
      const vnbhName = order.createdBy?.fullName || 'Chưa gán';

      if (!vnbhMap[vnbhKey]) {
        vnbhMap[vnbhKey] = {
          vnbhCode: vnbhKey,
          vnbhName,
          totalOrders: 0,
          totalQuantity: 0,
          totalAmount: 0,
        };
      }

      vnbhMap[vnbhKey].totalOrders += 1;

      for (const item of order.items || []) {
        const qty = Number(item.quantity);
        const price = Number(item.unitPrice);
        vnbhMap[vnbhKey].totalQuantity += qty;
        vnbhMap[vnbhKey].totalAmount += qty * price;
      }
    }

    return Object.values(vnbhMap);
  }

  /**
   * Lấy dữ liệu cho RPT006: Bảng kê chọn hàng xuất theo NVGH
   */
  async getRpt006Data(distributorId: string | number | bigint, filters: any = {}) {
    const { orders } = await findSalesOrdersByDistributor(distributorId, {
      ...filters,
      page: 1,
      limit: 2000,
    });

    // Gom theo Chuyến xe / NVGH
    const tripMap: Record<string, any> = {};

    for (const order of orders) {
      const tripCode = order.deliveryTrip?.tripCode || 'Chưa gán chuyến xe';
      const driverName = order.deliveryTrip?.driver?.fullName || 'Chưa phân tài xế';
      const driverPhone = order.deliveryTrip?.driver?.phone || '';

      if (!tripMap[tripCode]) {
        tripMap[tripCode] = {
          tripCode,
          driverName,
          driverPhone,
          items: {},
        };
      }

      for (const item of order.items || []) {
        const sku = item.product?.sku || 'N/A';
        if (!tripMap[tripCode].items[sku]) {
          tripMap[tripCode].items[sku] = {
            sku,
            productName: item.product?.name || '',
            unit: item.product?.unit || 'THÙNG',
            totalQuantity: 0,
            orders: [],
          };
        }
        tripMap[tripCode].items[sku].totalQuantity += Number(item.quantity);
        tripMap[tripCode].items[sku].orders.push({
          orderCode: order.orderCode,
          retailerName: order.retailer?.name,
          quantity: Number(item.quantity),
        });
      }
    }

    // Chuyển dạng danh sách phẳng dễ hiển thị
    const result: any[] = [];
    for (const trip of Object.values(tripMap)) {
      for (const item of Object.values(trip.items as Record<string, any>)) {
        result.push({
          tripCode: trip.tripCode,
          driverName: trip.driverName,
          driverPhone: trip.driverPhone,
          sku: item.sku,
          productName: item.productName,
          unit: item.unit,
          totalQuantity: item.totalQuantity,
          orderCount: item.orders.length,
        });
      }
    }

    return result;
  }

  /**
   * Lấy dữ liệu cho RPT061: Báo cáo line item
   */
  async getRpt061Data(distributorId: string | number | bigint, filters: any = {}) {
    const { orders } = await findSalesOrdersByDistributor(distributorId, {
      ...filters,
      page: 1,
      limit: 2000,
    });

    const rows: any[] = [];
    for (const order of orders) {
      for (const item of order.items || []) {
        const qty = Number(item.quantity);
        const price = Number(item.unitPrice);

        const lotsStr =
          (item.allocations || [])
            .map((a: any) => `${a.stockLot?.lotNumber || 'N/A'} (${a.quantity})`)
            .join(', ') || 'Chưa phân bổ';

        rows.push({
          orderCode: order.orderCode,
          orderDate: new Date(order.createdAt).toLocaleDateString('vi-VN'),
          retailerCode: order.retailer?.code || '',
          retailerName: order.retailer?.name || '',
          vnbhName: order.createdBy?.fullName || '',
          status: order.status,
          sku: item.product?.sku || '',
          productName: item.product?.name || '',
          unit: item.product?.unit || 'THÙNG',
          quantity: qty,
          unitPrice: price,
          totalAmount: qty * price,
          allocatedLots: lotsStr,
        });
      }
    }

    return rows;
  }

  /**
   * Xuất Excel chung với style chuẩn Enterprise
   */
  async exportReportToExcel({ title, headers, data, fileName }: ExcelExportOptions) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(title || 'Report');

    // Title row
    worksheet.mergeCells(1, 1, 1, headers.length);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = title.toUpperCase();
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1A73E8' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 30;

    // Subtitle / Date
    worksheet.mergeCells(2, 1, 2, headers.length);
    const dateCell = worksheet.getCell(2, 1);
    dateCell.value = `Thời gian xuất: ${new Date().toLocaleString('vi-VN')} | Đơn vị: DMS Trade Ledger`;
    dateCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF64748B' } };
    dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 20;

    // Header Row (Row 4)
    const headerRow = worksheet.getRow(4);
    headerRow.values = headers.map((h) => h.label);
    headerRow.height = 25;

    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E40AF' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Data Rows
    let rowIndex = 5;
    data.forEach((item, index) => {
      const row = worksheet.getRow(rowIndex);
      const rowValues = headers.map((h) => {
        if (h.key === '__stt') return index + 1;
        return item[h.key] !== undefined && item[h.key] !== null ? item[h.key] : '';
      });
      row.values = rowValues;

      // Highlight nếu có cờ isShortage
      const isShortage = item.isShortage;

      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 10 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };

        if (isShortage) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEE2E2' }, // Nhạt màu đỏ
          };
        }

        // Format số tiền nếu là cột tiền
        const colDef = headers[colNumber - 1];
        if (colDef && colDef.format === 'currency') {
          cell.numFmt = '#,##0';
          cell.alignment = { horizontal: 'right' };
        } else if (colDef && colDef.format === 'number') {
          cell.numFmt = '#,##0.00';
          cell.alignment = { horizontal: 'right' };
        } else if (colDef && colDef.align) {
          cell.alignment = { horizontal: colDef.align as any };
        }
      });

      row.commit();
      rowIndex++;
    });

    // Auto-fit column widths
    worksheet.columns.forEach((column, i) => {
      const header = headers[i];
      if (header && header.width) {
        column.width = header.width;
      } else {
        column.width = 18;
      }
    });

    return await workbook.xlsx.writeBuffer();
  }
}

// Standalone functions for backward compatibility
export const getRpt005Data = async (distributorId: string | number | bigint, filters: any = {}) => {
  const service = new ReportDataService(prisma as any);
  return service.getRpt005Data(distributorId, filters);
};

export const getRpt057Data = async (distributorId: string | number | bigint, filters: any = {}) => {
  const service = new ReportDataService(prisma as any);
  return service.getRpt057Data(distributorId, filters);
};

export const getRpt006Data = async (distributorId: string | number | bigint, filters: any = {}) => {
  const service = new ReportDataService(prisma as any);
  return service.getRpt006Data(distributorId, filters);
};

export const getRpt061Data = async (distributorId: string | number | bigint, filters: any = {}) => {
  const service = new ReportDataService(prisma as any);
  return service.getRpt061Data(distributorId, filters);
};

export const exportReportToExcel = async (options: ExcelExportOptions) => {
  const service = new ReportDataService(prisma as any);
  return service.exportReportToExcel(options);
};
