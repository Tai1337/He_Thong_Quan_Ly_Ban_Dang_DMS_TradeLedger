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
  private static readonly DEFAULT_ESTIMATED_COST_RATIO = 0.8;

  constructor(private readonly prisma: PrismaService) {}

  private resolveDeliveredQuantity(item: any): number {
    if (item.deliveredQuantity !== null && item.deliveredQuantity !== undefined) {
      return Math.max(0, Number(item.deliveredQuantity) || 0);
    }
    const ordered = Number(item.quantity) || 0;
    const failed = Number(item.failedQuantity) || 0;
    return Math.max(0, ordered - failed);
  }

  private async buildInboundCostMaps(distributorId: string | number | bigint) {
    const distId = BigInt(distributorId);
    const [inboundTxns, poItems] = await Promise.all([
      this.prisma.inventoryTransaction.findMany({
        where: {
          direction: 'IN',
          referenceType: 'PURCHASE_ORDER',
          warehouse: { distributorId: distId },
        },
        select: {
          lotId: true,
          quantity: true,
          unitPrice: true,
          stockLot: { select: { productId: true } },
        },
      }),
      this.prisma.purchaseOrderItem.findMany({
        where: {
          purchaseOrder: {
            distributorId: distId,
            status: { not: 'CANCELLED' },
          },
        },
        select: {
          productId: true,
          quantity: true,
          quantityReceived: true,
          unitPrice: true,
        },
      }),
    ]);

    const lotTotals = new Map<string, { value: number; qty: number }>();
    const prodTxnTotals = new Map<string, { value: number; qty: number }>();

    for (const txn of inboundTxns) {
      const qty = Number(txn.quantity) || 0;
      const price = Number(txn.unitPrice) || 0;
      if (qty <= 0 || price <= 0) continue;

      const lotKey = txn.lotId.toString();
      const prevLot = lotTotals.get(lotKey) || { value: 0, qty: 0 };
      lotTotals.set(lotKey, { value: prevLot.value + qty * price, qty: prevLot.qty + qty });

      const prodId = txn.stockLot?.productId?.toString();
      if (prodId) {
        const prevProd = prodTxnTotals.get(prodId) || { value: 0, qty: 0 };
        prodTxnTotals.set(prodId, { value: prevProd.value + qty * price, qty: prevProd.qty + qty });
      }
    }

    const prodPoTotals = new Map<string, { value: number; qty: number }>();
    for (const poi of poItems) {
      const qty = Number(poi.quantityReceived) > 0 ? Number(poi.quantityReceived) : Number(poi.quantity) || 0;
      const price = Number(poi.unitPrice) || 0;
      if (qty <= 0 || price <= 0) continue;

      const prodId = poi.productId.toString();
      const prev = prodPoTotals.get(prodId) || { value: 0, qty: 0 };
      prodPoTotals.set(prodId, { value: prev.value + qty * price, qty: prev.qty + qty });
    }

    const lotCostMap = new Map<string, number>();
    for (const [lotKey, agg] of lotTotals.entries()) {
      if (agg.qty > 0) lotCostMap.set(lotKey, agg.value / agg.qty);
    }

    const productCostMap = new Map<string, number>();
    for (const [prodId, agg] of prodTxnTotals.entries()) {
      if (agg.qty > 0) productCostMap.set(prodId, agg.value / agg.qty);
    }
    for (const [prodId, agg] of prodPoTotals.entries()) {
      if (!productCostMap.has(prodId) && agg.qty > 0) {
        productCostMap.set(prodId, agg.value / agg.qty);
      }
    }

    return { lotCostMap, productCostMap };
  }

  private resolveItemUnitCost(
    item: any,
    lotCostMap: Map<string, number>,
    productCostMap: Map<string, number>,
  ): { unitCost: number; source: 'LOT_ACTUAL' | 'PO_WEIGHTED_AVG' | 'ESTIMATED_80PCT' } {
    const sellingRef = Number(item.product?.basePrice || item.unitPrice || 0);
    const isDistinctActualCost = (cost?: number): cost is number =>
      Boolean(cost && cost > 0 && (sellingRef <= 0 || Math.abs(cost - sellingRef) > 0.01));

    const allocations = item.allocations || [];
    let allocCostSum = 0;
    let allocQtySum = 0;
    for (const alloc of allocations) {
      const lotCost = lotCostMap.get(alloc.lotId?.toString() || '');
      const allocQty = Number(alloc.quantity) || 0;
      if (isDistinctActualCost(lotCost) && allocQty > 0) {
        allocCostSum += allocQty * lotCost;
        allocQtySum += allocQty;
      }
    }
    if (allocQtySum > 0) {
      return { unitCost: allocCostSum / allocQtySum, source: 'LOT_ACTUAL' };
    }

    const prodCost = productCostMap.get(item.productId?.toString() || '');
    if (isDistinctActualCost(prodCost)) {
      return { unitCost: prodCost, source: 'PO_WEIGHTED_AVG' };
    }

    return {
      unitCost: Math.round(sellingRef * ReportDataService.DEFAULT_ESTIMATED_COST_RATIO * 100) / 100,
      source: 'ESTIMATED_80PCT',
    };
  }

  private classifyRetailerChannel(retailer: any): string {
    if (retailer?.channel) return retailer.channel;
    const name = (retailer?.name || '').toLowerCase();
    if (name.includes('siêu thị')) return 'Siêu thị Mini';
    if (name.includes('đại lý')) return 'Đại lý Sỉ';
    if (name.includes('tiện ích') || name.includes('24/7') || name.includes('bách hóa')) {
      return 'Cửa hàng Tiện lợi';
    }
    return 'Tiệm Tạp Hoá';
  }

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
   * Lấy dữ liệu cho RPT057: Báo cáo doanh số và sản lượng đa chiều
   * Hỗ trợ dimension: 'product' | 'retailer' | 'vnbh'
   */
  async getRpt057Data(distributorId: string | number | bigint, filters: any = {}) {
    const dimension = filters.dimension || 'product';

    const filterParams = {
      ...filters,
      page: 1,
      limit: 5000,
    };

    if (!filterParams.status) {
      filterParams.status = ['PENDING', 'SUBMITTED', 'ALLOCATED', 'SHIPPED', 'DELIVERED', 'INVOICED', 'PAID'];
    }

    const { orders } = await findSalesOrdersByDistributor(distributorId, filterParams);

    let totalRevenue = 0;
    let totalVolume = 0;
    const uniqueRetailerSet = new Set<string>();
    const uniqueProductSet = new Set<string>();
    const groupMap: Record<string, any> = {};

    for (const order of orders) {
      if (order.status === 'DELIVERY_FAILED' || order.status === 'CANCELLED') {
        continue;
      }

      const retailerId = order.retailer?.id?.toString() || 'unknown';
      const retailerCode = order.retailer?.code || 'N/A';
      const retailerName = order.retailer?.name || 'Khách vãng lai';
      const address = order.retailer?.address || '';
      const phone = order.retailer?.phone || '';
      uniqueRetailerSet.add(retailerId);

      const vnbhKey = order.createdBy?.username || 'Chưa gán';
      const vnbhName = order.createdBy?.fullName || 'Chưa gán';

      for (const item of (order.items || [])) {
        const pId = item.productId?.toString() || 'unknown';
        const sku = item.product?.sku || 'N/A';
        const productName = item.product?.name || 'Sản phẩm khác';
        const unit = item.product?.unit || 'Thùng';
        const retailUnit = item.product?.retailUnit || '';

        const qty = this.resolveDeliveredQuantity(item);
        if (qty <= 0) continue;

        const price = Number(item.unitPrice) || 0;
        const discount = Number(item.discountAmount) || 0;
        const isPromo = Boolean(item.isPromotion);
        const lineTotal = isPromo ? 0 : Math.max(0, qty * price - discount);

        totalRevenue += lineTotal;
        totalVolume += qty;
        uniqueProductSet.add(pId);

        let key = '';
        if (dimension === 'product') {
          key = pId;
          if (!groupMap[key]) {
            groupMap[key] = {
              productId: pId,
              sku,
              productName,
              unit,
              retailUnit,
              orderCount: 0,
              orderIds: new Set<string>(),
              totalQuantity: 0,
              totalAmount: 0,
            };
          }
          groupMap[key].orderIds.add(order.id.toString());
          groupMap[key].totalQuantity += qty;
          groupMap[key].totalAmount += lineTotal;
        } else if (dimension === 'retailer') {
          key = retailerId;
          if (!groupMap[key]) {
            groupMap[key] = {
              retailerId,
              retailerCode,
              retailerName,
              address,
              phone,
              orderCount: 0,
              orderIds: new Set<string>(),
              totalQuantity: 0,
              totalAmount: 0,
            };
          }
          groupMap[key].orderIds.add(order.id.toString());
          groupMap[key].totalQuantity += qty;
          groupMap[key].totalAmount += lineTotal;
        } else {
          key = vnbhKey;
          if (!groupMap[key]) {
            groupMap[key] = {
              vnbhCode: vnbhKey,
              vnbhName,
              orderCount: 0,
              orderIds: new Set<string>(),
              totalQuantity: 0,
              totalAmount: 0,
            };
          }
          groupMap[key].orderIds.add(order.id.toString());
          groupMap[key].totalQuantity += qty;
          groupMap[key].totalAmount += lineTotal;
        }
      }
    }

    const data = Object.values(groupMap).map((row: any) => {
      const orderCount = row.orderIds ? row.orderIds.size : row.orderCount;
      delete row.orderIds;
      const avgPrice = row.totalQuantity > 0 ? Math.round(row.totalAmount / row.totalQuantity) : 0;
      const revenueShare = totalRevenue > 0 ? Number(((row.totalAmount / totalRevenue) * 100).toFixed(2)) : 0;
      return {
        ...row,
        orderCount,
        totalOrders: orderCount,
        avgPrice,
        revenueShare,
      };
    }).sort((a: any, b: any) => b.totalAmount - a.totalAmount);

    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    return {
      summary: {
        totalRevenue: Math.round(totalRevenue),
        totalVolume,
        totalOrders,
        averageOrderValue,
        uniqueProducts: uniqueProductSet.size,
        uniqueRetailers: uniqueRetailerSet.size,
      },
      data,
      dimension,
    };
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
      limit: 3000,
    });

    const rows: any[] = [];
    for (const order of orders) {
      const isVoidOrder = order.status === 'CANCELLED' || order.status === 'DELIVERY_FAILED';
      for (const item of order.items || []) {
        const qty = isVoidOrder ? 0 : this.resolveDeliveredQuantity(item);
        const price = Number(item.unitPrice) || 0;
        const discount = Number(item.discountAmount) || 0;
        const isPromo = Boolean(item.isPromotion);
        const lineTotal = isPromo || isVoidOrder ? 0 : Math.max(0, qty * price - discount);

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
          discountAmount: discount,
          totalAmount: lineTotal,
          isPromotion: isPromo,
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

  async getProfitLossStatement(distributorId: string | number | bigint, filters: any = {}) {
    const fiscalYear = Number(filters.fiscalYear) || 2026;
    const startDate = new Date(fiscalYear, 0, 1);
    const endDate = new Date(fiscalYear, 11, 31, 23, 59, 59, 999);
    const realizedStatuses =
      filters.includePending === 'true'
        ? ['PENDING', 'SUBMITTED', 'ALLOCATED', 'SHIPPED', 'DELIVERED', 'INVOICED', 'PAID']
        : ['SHIPPED', 'DELIVERED', 'INVOICED', 'PAID'];

    const [salesOrders, { lotCostMap, productCostMap }] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where: {
          distributorId: BigInt(distributorId),
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          status: { in: realizedStatuses as any },
        },
        include: {
          items: {
            include: {
              product: true,
              allocations: true,
            },
          },
          invoice: true,
          retailer: true,
        },
      }),
      this.buildInboundCostMaps(BigInt(distributorId)),
    ]);

    const monthlyData: {
      [key: number]: {
        grossIncome: number;
        discounts: number;
        income: number;
        salesCogs: number;
        promoCogs: number;
        expense: number;
        netProfit: number;
      };
    } = {};
    for (let m = 0; m < 12; m++) {
      monthlyData[m] = {
        grossIncome: 0,
        discounts: 0,
        income: 0,
        salesCogs: 0,
        promoCogs: 0,
        expense: 0,
        netProfit: 0,
      };
    }

    let totalGrossRevenue = 0;
    let totalSalesRevenue = 0;
    let totalSalesCogs = 0;
    let totalPromoCogs = 0;
    let totalDiscounts = 0;
    let totalVatCollected = 0;
    const costSummary = { actualLotLines: 0, poAvgLines: 0, estimatedLines: 0 };
    const channelBreakdown: { [channel: string]: number } = {};

    salesOrders.forEach((so) => {
      const month = new Date(so.createdAt).getMonth();
      let orderGrossRevenue = 0;
      let orderLineDiscount = 0;
      let orderSalesCogs = 0;
      let orderPromoCogs = 0;
      let hasFailedQty = false;

      so.items?.forEach((it) => {
        if (Number(it.failedQuantity || 0) > 0) hasFailedQty = true;
        const effectiveQty = this.resolveDeliveredQuantity(it);
        if (effectiveQty <= 0) return;

        const isPromo = Boolean(it.isPromotion);
        if (!isPromo) {
          const lineGross = effectiveQty * (Number(it.unitPrice) || 0);
          const lineDiscount = Math.min(lineGross, Number(it.discountAmount || 0));
          orderGrossRevenue += lineGross;
          orderLineDiscount += lineDiscount;
        }

        const { unitCost, source } = this.resolveItemUnitCost(it, lotCostMap, productCostMap);
        if (source === 'LOT_ACTUAL') costSummary.actualLotLines += 1;
        else if (source === 'PO_WEIGHTED_AVG') costSummary.poAvgLines += 1;
        else costSummary.estimatedLines += 1;

        const lineCost = effectiveQty * unitCost;
        if (isPromo) {
          orderPromoCogs += lineCost;
        } else {
          orderSalesCogs += lineCost;
        }
      });

      const invoiceDiscount = so.invoice ? Number(so.invoice.invoiceDiscountAmount || 0) : 0;
      if (so.invoice && !hasFailedQty) {
        // Doanh thu thuần trên báo cáo KQKD không bao gồm VAT thu hộ
        orderGrossRevenue = Number(so.invoice.subtotal || orderGrossRevenue);
        totalVatCollected += Number(so.invoice.vatAmount || 0);
      }

      const orderDiscount = orderLineDiscount + invoiceDiscount;
      const orderNetRevenue = Math.max(0, orderGrossRevenue - orderDiscount);
      const orderTotalCost = orderSalesCogs + orderPromoCogs;

      totalGrossRevenue += orderGrossRevenue;
      totalDiscounts += orderDiscount;
      totalSalesRevenue += orderNetRevenue;
      totalSalesCogs += orderSalesCogs;
      totalPromoCogs += orderPromoCogs;

      if (monthlyData[month]) {
        monthlyData[month].grossIncome += orderGrossRevenue;
        monthlyData[month].discounts += orderDiscount;
        monthlyData[month].income += orderNetRevenue;
        monthlyData[month].salesCogs += orderSalesCogs;
        monthlyData[month].promoCogs += orderPromoCogs;
        monthlyData[month].expense += orderTotalCost;
        monthlyData[month].netProfit = monthlyData[month].income - monthlyData[month].expense;
      }

      const channel = this.classifyRetailerChannel(so.retailer);
      channelBreakdown[channel] = (channelBreakdown[channel] || 0) + orderNetRevenue;
    });

    const buildPeriodMetrics = (
      rawGrossIncome: number,
      rawDiscounts: number,
      rawSalesCogs: number,
      rawPromoCogs: number,
    ) => {
      const grossIncome = Math.round(rawGrossIncome);
      const discounts = Math.round(rawDiscounts);
      const income = Math.max(0, grossIncome - discounts);
      const salesCogs = Math.round(rawSalesCogs);
      const promoCogs = Math.round(rawPromoCogs);
      const expense = salesCogs + promoCogs;
      const netProfit = income - expense;
      const profitMargin = income > 0 ? Number(((netProfit / income) * 100).toFixed(1)) : 0;
      return { grossIncome, discounts, income, salesCogs, promoCogs, expense, netProfit, profitMargin };
    };

    const periodicity = filters.periodicity || 'Theo Quý';
    let chartData: any[] = [];

    if (periodicity === 'Theo Tháng') {
      chartData = Object.keys(monthlyData).map((mStr) => {
        const m = Number(mStr);
        const row = monthlyData[m];
        return {
          period: `Tháng ${m + 1}`,
          ...buildPeriodMetrics(row.grossIncome, row.discounts, row.salesCogs, row.promoCogs),
        };
      });
    } else {
      const quarters = [
        { label: `Quý 1 (${fiscalYear})`, months: [0, 1, 2] },
        { label: `Quý 2 (${fiscalYear})`, months: [3, 4, 5] },
        { label: `Quý 3 (${fiscalYear})`, months: [6, 7, 8] },
        { label: `Quý 4 (${fiscalYear})`, months: [9, 10, 11] },
      ];
      chartData = quarters.map((q) => ({
        period: q.label,
        ...buildPeriodMetrics(
          q.months.reduce((sum, m) => sum + monthlyData[m].grossIncome, 0),
          q.months.reduce((sum, m) => sum + monthlyData[m].discounts, 0),
          q.months.reduce((sum, m) => sum + monthlyData[m].salesCogs, 0),
          q.months.reduce((sum, m) => sum + monthlyData[m].promoCogs, 0),
        ),
      }));
    }

    const totalMetrics = buildPeriodMetrics(
      totalGrossRevenue,
      totalDiscounts,
      totalSalesCogs,
      totalPromoCogs,
    );

    return {
      equation: {
        grossIncome: totalMetrics.grossIncome,
        totalDiscounts: totalMetrics.discounts,
        totalIncome: totalMetrics.income,
        salesCogs: totalMetrics.salesCogs,
        promoCogs: totalMetrics.promoCogs,
        totalExpense: totalMetrics.expense,
        netProfit: totalMetrics.netProfit,
        profitMargin: totalMetrics.profitMargin,
        totalVatCollected: Math.round(totalVatCollected),
      },
      costSummary,
      chartData,
      channelBreakdown,
      totalOrdersCount: salesOrders.length,
      fiscalYear,
    };
  }

  async exportProfitLossExcel(distributorId: string | number | bigint, filters: any = {}) {
    const data = await this.getProfitLossStatement(distributorId, filters);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'DMS TradeLedger';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Báo Cáo Lãi Lỗ P&L', {
      views: [{ showGridLines: true }],
    });

    // Title
    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `BÁO CÁO KẾT QUẢ KINH DOANH P&L - NĂM TÀI CHÍNH ${data.fiscalYear}`;
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0066DA' },
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 36;

    // Equation summary rows
    sheet.addRow(['CHỈ TIÊU TÀI CHÍNH', 'GIÁ TRỊ (VNĐ)']);
    sheet.getRow(2).font = { name: 'Arial', size: 10, bold: true };

    sheet.addRow(['1. Doanh Thu Bán Hàng (trước chiết khấu)', data.equation.grossIncome]);
    sheet.addRow(['2. Chiết Khấu & Giảm Trừ Doanh Thu', data.equation.totalDiscounts]);
    sheet.addRow(['3. Doanh Thu Thuần (Net Revenue)', data.equation.totalIncome]);
    sheet.addRow(['4. Giá Vốn Hàng Bán (Sales COGS)', data.equation.salesCogs]);
    sheet.addRow(['5. Giá Vốn Hàng Tặng Khuyến Mãi (FOC)', data.equation.promoCogs]);
    sheet.addRow(['6. Tổng Giá Vốn (Total COGS)', data.equation.totalExpense]);
    sheet.addRow(['7. Lợi Nhuận Gộp / Thuần (Net Profit)', data.equation.netProfit]);
    sheet.addRow(['8. Tỷ Suất Lợi Nhuận (Profit Margin)', `${data.equation.profitMargin.toFixed(1)}%`]);

    // Trend table
    sheet.addRow([]);
    sheet.addRow([
      'KỲ BÁO CÁO',
      'DOANH THU THUẦN (VNĐ)',
      'CHIẾT KHẤU (VNĐ)',
      'GIÁ VỐN COGS (VNĐ)',
      'LỢI NHUẬN (VNĐ)',
      'BIÊN LN (%)',
    ]);
    const headerRow = sheet.getRow(12);
    headerRow.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF004CA3' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    data.chartData.forEach((item: any) => {
      sheet.addRow([
        item.period,
        item.income,
        item.discounts || 0,
        item.expense,
        item.netProfit,
        `${item.profitMargin}%`,
      ]);
    });

    sheet.columns.forEach((col) => {
      col.width = 24;
    });

    return await workbook.xlsx.writeBuffer();
  }

  /**
   * Lịch trình Vận hành DMS (Gantt):
   * - PO nhập hàng (dự kiến ngày nhận từ PO / chuyến inbound / D+3)
   * - Chuyến xe giao hàng bán (dự kiến giao xong D+1 khi tạo / xác nhận)
   * - Đơn bán hàng chờ xếp chuyến (dự kiến D+1)
   * - Lịch kiểm kê kho thực tế + tự động thêm lịch kiểm kê định kỳ đầu tháng (01-02)
   */
  async getOperationsGanttData(distributorId: string | number | bigint, filters: any = {}) {
    const distId = BigInt(distributorId);
    const now = new Date();

    const toDateKey = (d: Date): string => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const addDays = (d: Date, days: number): Date => {
      const copy = new Date(d);
      copy.setDate(copy.getDate() + days);
      return copy;
    };

    const rawMonth = typeof filters.month === 'string' && /^\d{4}-\d{2}$/.test(filters.month)
      ? filters.month
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [yearNum, monthNum] = rawMonth.split('-').map(Number);
    const monthStart = new Date(yearNum, monthNum - 1, 1);
    const monthEnd = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
    const daysInMonth = monthEnd.getDate();
    const monthStartKey = toDateKey(monthStart);
    const monthEndKey = toDateKey(monthEnd);
    const todayKey = toDateKey(now);

    const [purchaseOrders, deliveryTrips, unassignedSalesOrders, inventoryCounts, warehouses] =
      await Promise.all([
        this.prisma.purchaseOrder.findMany({
          where: {
            distributorId: distId,
            status: { not: 'CANCELLED' },
          },
          include: {
            supplier: true,
            warehouse: true,
            deliveryTrip: true,
            items: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 200,
        }),
        this.prisma.deliveryTrip.findMany({
          where: {
            distributorId: distId,
            tripType: 'OUTBOUND',
            status: { not: 'CANCELLED' },
          },
          include: {
            driver: true,
            warehouse: true,
            salesOrders: {
              include: { retailer: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 200,
        }),
        this.prisma.salesOrder.findMany({
          where: {
            distributorId: distId,
            deliveryTripId: null,
            status: { in: ['PENDING', 'SUBMITTED', 'ALLOCATED'] },
          },
          include: {
            retailer: true,
            warehouse: true,
            items: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 150,
        }),
        this.prisma.inventoryCount.findMany({
          where: {
            distributorId: distId,
            status: { not: 'CANCELLED' },
          },
          include: {
            warehouse: true,
            _count: { select: { items: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 150,
        }),
        this.prisma.warehouse.findMany({
          where: { distributorId: distId, status: true },
          orderBy: { id: 'asc' },
        }),
      ]);

    const tasks: any[] = [];

    // 1. Purchase Orders (INBOUND)
    for (const po of purchaseOrders) {
      const startObj = new Date(po.createdAt);
      const endRaw =
        po.deliveryTrip?.expectedDeliveryDate ||
        po.expectedDate ||
        addDays(startObj, 3);
      const endObj = new Date(endRaw) < startObj ? startObj : new Date(endRaw);

      const startKey = toDateKey(startObj);
      const endKey = toDateKey(endObj);

      const totalOrderedQty = (po.items || []).reduce((s: number, it: any) => s + Number(it.quantity || 0), 0);
      const totalReceivedQty = (po.items || []).reduce((s: number, it: any) => s + Number(it.quantityReceived || 0), 0);
      const receivedPct = totalOrderedQty > 0 ? Math.min(100, Math.round((totalReceivedQty / totalOrderedQty) * 100)) : 0;

      const progressMap: Record<string, number> = {
        DRAFT: 15,
        WAITING_RECEIVE: 45,
        PARTIALLY_RECEIVED: Math.max(55, receivedPct),
        COMPLETED: 100,
      };
      const statusLabelMap: Record<string, string> = {
        DRAFT: 'Nháp PO',
        WAITING_RECEIVE: 'Chờ hàng về',
        PARTIALLY_RECEIVED: 'Đang nhập kho',
        COMPLETED: 'Đã nhận đủ',
      };

      tasks.push({
        id: `PO-${po.id.toString()}`,
        entityId: po.id.toString(),
        code: po.poCode,
        type: 'PO_INBOUND',
        typeLabel: 'Nhập hàng NCC (PO)',
        title: `Nhận hàng ${po.supplier?.name || 'Nhà cung cấp'}`,
        subtitle: `${po.warehouse?.name || 'Kho NPP'} · ${totalOrderedQty} ĐVT`,
        status: po.status,
        statusLabel: statusLabelMap[po.status] || po.status,
        progress: progressMap[po.status] ?? 30,
        color: '#059669',
        startDate: startKey,
        endDate: endKey,
        assignee: po.warehouse?.name || 'Thủ kho',
        isAutoMonthly: false,
        linkPath: po.status === 'WAITING_RECEIVE' || po.status === 'PARTIALLY_RECEIVED'
          ? '/purchase/receiving'
          : '/purchase/purchase-orders',
        meta: {
          supplierName: po.supplier?.name || 'Chưa chọn NCC',
          warehouseName: po.warehouse?.name || '',
          totalOrderedQty,
          totalReceivedQty,
          tripCode: po.deliveryTrip?.tripCode || null,
          notes: po.notes || '',
        },
      });
    }

    // 2. Outbound Delivery Trips (D+1 default when created/confirmed)
    for (const trip of deliveryTrips) {
      const startObj = new Date(trip.departureTime || trip.createdAt);
      const fallbackDPlus1 = addDays(startObj, 1);
      const endRaw = trip.completedTime || trip.expectedDeliveryDate || fallbackDPlus1;
      const endObj = new Date(endRaw) < startObj ? fallbackDPlus1 : new Date(endRaw);

      const startKey = toDateKey(startObj);
      const endKey = toDateKey(endObj);

      const progressMap: Record<string, number> = {
        WAITING_CONFIRM: 20,
        WAITING_SHIP: 45,
        SHIPPING: 75,
        WAITING_CLOSE: 90,
        COMPLETED: 100,
        CLOSED: 100,
      };
      const statusLabelMap: Record<string, string> = {
        WAITING_CONFIRM: 'Chờ xác nhận xe',
        WAITING_SHIP: 'Đã xác nhận · Chờ xuất',
        SHIPPING: 'Đang giao hàng',
        WAITING_CLOSE: 'Chờ đối soát COD',
        COMPLETED: 'Giao xong',
        CLOSED: 'Đã đóng chuyến',
      };

      const ordersCount = trip.salesOrders?.length || 0;
      const driverName = trip.driver?.fullName || 'Chưa phân tài xế';

      tasks.push({
        id: `TRIP-${trip.id.toString()}`,
        entityId: trip.id.toString(),
        code: trip.tripCode,
        type: 'DELIVERY_OUTBOUND',
        typeLabel: 'Giao hàng bán (Chuyến xe)',
        title: `Giao hàng ${ordersCount} đơn · ${driverName}`,
        subtitle: `${trip.warehouse?.name || 'Kho NPP'}${trip.licensePlate ? ` · ${trip.licensePlate}` : ''}`,
        status: trip.status,
        statusLabel: statusLabelMap[trip.status] || trip.status,
        progress: progressMap[trip.status] ?? 25,
        color: '#0066da',
        startDate: startKey,
        endDate: endKey,
        assignee: driverName,
        isAutoMonthly: false,
        linkPath: '/logistics/delivery-trips',
        meta: {
          driverName,
          licensePlate: trip.licensePlate || '',
          warehouseName: trip.warehouse?.name || '',
          ordersCount,
          currentWeightKg: Number(trip.currentWeightKg || 0),
          maxWeightKg: Number(trip.maxWeightKg || 1500),
          orderCodes: (trip.salesOrders || []).map((o: any) => o.orderCode),
          notes: trip.notes || '',
        },
      });
    }

    // 3. Unassigned Sales Orders (need trip scheduling D+1)
    for (const so of unassignedSalesOrders) {
      const startObj = new Date(so.createdAt);
      const endObj = addDays(startObj, 1);
      const totalQty = (so.items || []).reduce((s: number, it: any) => s + Number(it.quantity || 0), 0);

      const statusLabelMap: Record<string, string> = {
        PENDING: 'Chờ duyệt đơn',
        SUBMITTED: 'Đã gửi · Chờ phân bổ',
        ALLOCATED: 'Đã phân bổ · Chờ xếp xe',
      };
      const progressMap: Record<string, number> = {
        PENDING: 15,
        SUBMITTED: 35,
        ALLOCATED: 60,
      };

      tasks.push({
        id: `SO-${so.id.toString()}`,
        entityId: so.id.toString(),
        code: so.orderCode,
        type: 'SALES_UNASSIGNED',
        typeLabel: 'Đơn bán chờ xếp chuyến',
        title: `Đơn ${so.retailer?.name || 'Đại lý'} (Chờ lên xe)`,
        subtitle: `${so.warehouse?.name || 'Kho NPP'} · ${totalQty} ĐVT`,
        status: so.status,
        statusLabel: statusLabelMap[so.status] || so.status,
        progress: progressMap[so.status] ?? 20,
        color: '#d97706',
        startDate: toDateKey(startObj),
        endDate: toDateKey(endObj),
        assignee: so.warehouse?.name || 'Điều phối viên',
        isAutoMonthly: false,
        linkPath: so.status === 'ALLOCATED' ? '/logistics/delivery-trips' : '/sales/sales-orders',
        meta: {
          retailerName: so.retailer?.name || '',
          warehouseName: so.warehouse?.name || '',
          totalQty,
          notes: so.deliveryNotes || '',
        },
      });
    }

    // 4. Actual Inventory Counts + Auto Start-of-Month Schedule (01 - 02)
    const monthlyCoveredWarehouses = new Set<string>();

    for (const cnt of inventoryCounts) {
      const startObj = new Date(cnt.createdAt);
      const endObj = addDays(startObj, 1);
      const startKey = toDateKey(startObj);
      const countMonth = startKey.slice(0, 7);

      if (cnt.countType === 'MONTHLY' && countMonth === rawMonth && cnt.warehouseId) {
        monthlyCoveredWarehouses.add(cnt.warehouseId.toString());
      }

      const progressMap: Record<string, number> = {
        DRAFT: 30,
        WAITING_APPROVAL: 75,
        APPROVED: 100,
        COMPLETED: 100,
        REJECTED: 40,
      };
      const statusLabelMap: Record<string, string> = {
        DRAFT: 'Đang kiểm đếm',
        WAITING_APPROVAL: 'Chờ duyệt kiểm kê',
        APPROVED: 'Đã duyệt cân đối',
        COMPLETED: 'Hoàn tất kiểm kê',
        REJECTED: 'Bị từ chối',
      };

      tasks.push({
        id: `COUNT-${cnt.id.toString()}`,
        entityId: cnt.id.toString(),
        code: cnt.countCode,
        type: 'INVENTORY_COUNT',
        typeLabel: 'Kiểm kê kho',
        title: `Kiểm kê ${cnt.countType === 'MONTHLY' ? 'định kỳ' : 'theo SKU'} · ${cnt.warehouse?.name || 'Kho NPP'}`,
        subtitle: `${cnt._count?.items || 0} lô kiểm đếm`,
        status: cnt.status,
        statusLabel: statusLabelMap[cnt.status] || cnt.status,
        progress: progressMap[cnt.status] ?? 30,
        color: '#7c3aed',
        startDate: startKey,
        endDate: toDateKey(endObj),
        assignee: cnt.warehouse?.name || 'Thủ kho',
        isAutoMonthly: false,
        linkPath: '/inventory/counts',
        meta: {
          warehouseId: cnt.warehouseId?.toString() || '',
          warehouseName: cnt.warehouse?.name || '',
          countType: cnt.countType,
          notes: cnt.notes || '',
        },
      });
    }

    const salesWarehouses = warehouses.filter((w: any) => w.type === 'SALES');
    const targetWarehouses = salesWarehouses.length > 0 ? salesWarehouses : warehouses.slice(0, 1);

    for (const wh of targetWarehouses) {
      if (monthlyCoveredWarehouses.has(wh.id.toString())) continue;

      const autoStart = `${rawMonth}-01`;
      const autoEnd = `${rawMonth}-02`;
      const isOverdue = todayKey > autoEnd;

      tasks.push({
        id: `AUTO-COUNT-${rawMonth}-${wh.id.toString()}`,
        entityId: null,
        code: `KK-${rawMonth.replace('-', '')}-01`,
        type: 'INVENTORY_COUNT',
        typeLabel: 'Kiểm kê đầu tháng (Tự động)',
        title: `Kiểm kê kho đầu tháng ${String(monthNum).padStart(2, '0')}/${yearNum} · ${wh.name}`,
        subtitle: `Lịch định kỳ đầu tháng (01–02/${String(monthNum).padStart(2, '0')}) · Chưa lập phiếu`,
        status: isOverdue ? 'OVERDUE' : 'SCHEDULED',
        statusLabel: isOverdue ? 'Quá hạn đầu tháng · Cần lập phiếu' : 'Lịch định kỳ đầu tháng',
        progress: 0,
        color: '#7c3aed',
        startDate: autoStart,
        endDate: autoEnd,
        assignee: wh.name,
        isAutoMonthly: true,
        linkPath: '/inventory/counts',
        meta: {
          warehouseId: wh.id.toString(),
          warehouseName: wh.name,
          countType: 'MONTHLY',
          notes: `Lịch kiểm kê kho định kỳ đầu tháng ${String(monthNum).padStart(2, '0')}/${yearNum} cho ${wh.name}.`,
        },
      });
    }

    // Filter tasks overlapping viewed month [monthStartKey .. monthEndKey]
    let visibleTasks = tasks.filter((t) => {
      const overlapsMonth = t.startDate <= monthEndKey && t.endDate >= monthStartKey;
      return overlapsMonth;
    });

    if (filters.type && filters.type !== 'ALL') {
      visibleTasks = visibleTasks.filter((t) => t.type === filters.type);
    }

    const priorityOrder: Record<string, number> = {
      INVENTORY_COUNT: 1,
      PO_INBOUND: 2,
      DELIVERY_OUTBOUND: 3,
      SALES_UNASSIGNED: 4,
    };

    visibleTasks.sort((a, b) => {
      if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
      return (priorityOrder[a.type] || 9) - (priorityOrder[b.type] || 9);
    });

    return {
      month: rawMonth,
      monthLabel: `Tháng ${monthNum}/${yearNum}`,
      daysInMonth,
      monthStartDate: monthStartKey,
      monthEndDate: monthEndKey,
      todayStr: todayKey,
      summary: {
        total: visibleTasks.length,
        poCount: visibleTasks.filter((t) => t.type === 'PO_INBOUND').length,
        tripCount: visibleTasks.filter((t) => t.type === 'DELIVERY_OUTBOUND').length,
        unassignedSoCount: visibleTasks.filter((t) => t.type === 'SALES_UNASSIGNED').length,
        countTaskCount: visibleTasks.filter((t) => t.type === 'INVENTORY_COUNT').length,
      },
      tasks: visibleTasks,
    };
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
