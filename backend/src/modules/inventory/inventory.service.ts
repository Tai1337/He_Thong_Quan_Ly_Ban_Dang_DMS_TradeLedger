import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { InventoryRepository } from './inventory.repository';

@Injectable()
export class InventoryService {
  constructor(private inventoryRepository: InventoryRepository) {}

  async getInventoryRpt083Service(distributorId: string | number, filters: any) {
    const { lots, total } = await this.inventoryRepository.getInventoryLotsRpt083(
      distributorId,
      filters,
    );

    const formattedData = lots.map((lot, index) => {
      const totalSmallQty = lot.stockBalance ? Number(lot.stockBalance.quantityOnHand) : 0;
      const conversionRate = lot.product.conversionRate || 1;

      const qtyBig = Math.floor(totalSmallQty / conversionRate);
      const qtySmall = totalSmallQty % conversionRate;

      const price = Number(lot.product.basePrice || 0);
      const amount = totalSmallQty * price;

      const mfgDate = lot.manufactureDate
        ? new Date(lot.manufactureDate).toLocaleDateString('en-GB')
        : '';

      return {
        id: lot.id.toString(),
        index: index + 1,
        productCode: lot.product.sku,
        productName: lot.product.name,
        type: lot.product.productType || 'FG',
        qtyBig: qtyBig,
        qtySmall: qtySmall,
        unitBig: lot.product.unit || 'Thùng',
        unitSmall: lot.product.retailUnit || 'Gói',
        totalSmall: totalSmallQty,
        price: price,
        amount: amount,
        actualBig: null,
        actualSmall: null,
        status: lot.status,
        lotNumber: lot.lotNumber,
        mfgDate: mfgDate,
      };
    });

    return {
      data: formattedData,
      pagination: {
        total,
        page: parseInt(filters.page || 1, 10),
        limit: parseInt(filters.limit || 50, 10),
      },
    };
  }

  async getInventoryRpt083ExportService(distributorId: string | number, filters: any) {
    const allFilters = { ...filters };
    delete allFilters.page;
    delete allFilters.limit;
    allFilters.limit = 100000;

    const { lots } = await this.inventoryRepository.getInventoryLotsRpt083(
      distributorId,
      allFilters,
    );

    return lots.map((lot) => {
      const totalSmallQty = lot.stockBalance ? Number(lot.stockBalance.quantityOnHand) : 0;
      const conversionRate = lot.product.conversionRate || 1;
      const qtyBig = Math.floor(totalSmallQty / conversionRate);
      const qtySmall = totalSmallQty % conversionRate;
      const price = Number(lot.product.basePrice || 0);
      const amount = totalSmallQty * price;

      const formatDate = (d: any) => (d ? new Date(d).toLocaleDateString('en-GB') : '');
      const formatDateTime = (d: any) => {
        if (!d) return '';
        const dt = new Date(d);
        return dt.toLocaleDateString('en-GB') + ' ' + dt.toLocaleTimeString('en-GB');
      };

      return {
        distCode: lot.warehouse?.distributor?.code || 'NPP-TEST',
        distName: lot.warehouse?.distributor?.name || 'Nhà Phân Phối Test',
        channel: lot.warehouse?.distributor?.channel || 'Truyền thống',
        warehouseCode: lot.warehouse?.code || '',
        warehouseName: lot.warehouse?.name || '',
        region: lot.warehouse?.distributor?.region || '',
        status: lot.status === 'GOOD' ? 'Good' : 'Defective',
        sku: lot.product.sku,
        productName: lot.product.name,
        lotNumber: lot.lotNumber,
        mfgDate: formatDate(lot.manufactureDate),
        expDate: formatDate(lot.expiryDate),
        unitBig: lot.product.unit || 'Thùng',
        unitSmall: lot.product.retailUnit || 'Gói',
        productType: lot.product.productType || 'FG',
        subDivision: lot.product.category?.name || '',
        stdSku: lot.product.stdSku || '',
        stdSkuName: lot.product.stdSkuName || '',
        groupStdSku: lot.product.groupStdSku || '',
        saleStatus: lot.product.status ? 'Đang bán' : 'Ngừng bán',
        price: price,
        conversionRate: conversionRate,
        qtyBig: qtyBig,
        qtySmall: qtySmall,
        totalSmallQty: totalSmallQty,
        amount: amount,
        locationType:
          lot.warehouse?.type === 'SALES'
            ? 'Kho hàng bán'
            : lot.warehouse?.type === 'VANSALE'
            ? 'Kho hàng NVBH'
            : 'Khác',
        locationCode: lot.locationCode || '',
        locationName: lot.locationName || '',
        updatedBy: 'System',
        updatedAt: formatDateTime(new Date()),
      };
    });
  }

  async getTransactionsService(distributorId: string | number, filters: any) {
    const page = parseInt(filters.page || 1, 10);
    const limit = parseInt(filters.limit || 25, 10);

    const { transactions, total, summary } = await this.inventoryRepository.getInventoryTransactions(
      distributorId,
      { ...filters, page, limit },
    );

    const formattedData = transactions.map((t) => {
      const qty = Number(t.quantity);
      const price = Number(t.unitPrice || 0);
      const amount = qty * price;

      return {
        id: t.id.toString(),
        transactionCode: t.transactionCode,
        direction: t.direction,
        quantity: qty,
        unitPrice: price,
        totalAmount: amount,
        referenceType: t.referenceType,
        referenceId: t.referenceId ? t.referenceId.toString() : null,
        referenceCode: t.referenceCode,
        createdAt: t.createdAt,
        stockLot: {
          id: t.stockLot?.id?.toString(),
          lotNumber: t.stockLot?.lotNumber || '',
          manufactureDate: t.stockLot?.manufactureDate,
          expiryDate: t.stockLot?.expiryDate,
          status: t.stockLot?.status,
        },
        product: {
          id: t.stockLot?.product?.id?.toString(),
          sku: t.stockLot?.product?.sku || '',
          name: t.stockLot?.product?.name || '',
          unit: t.stockLot?.product?.unit || 'Thùng',
          retailUnit: t.stockLot?.product?.retailUnit || 'Gói',
          conversionRate: t.stockLot?.product?.conversionRate || 1,
          categoryName: t.stockLot?.product?.category?.name || '',
        },
        warehouse: {
          id: t.warehouse?.id?.toString(),
          code: t.warehouse?.code || '',
          name: t.warehouse?.name || '',
        },
        createdBy: {
          id: t.createdBy?.id?.toString(),
          fullName: t.createdBy?.fullName || 'Hệ thống',
          email: t.createdBy?.email || '',
        },
      };
    });

    return {
      data: formattedData,
      summary,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async exportTransactionsExcelService(distributorId: string | number, filters: any) {
    const exportFilters = { ...filters, page: 1, limit: 100000 };
    const { transactions } = await this.inventoryRepository.getInventoryTransactions(
      distributorId,
      exportFilters,
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'DMS TradeLedger';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Giao Dịch Kho', {
      views: [{ showGridLines: true }],
    });

    // Title Row
    sheet.mergeCells('A1:N1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'SỔ NHẬT KÝ GIAO DỊCH XUẤT NHẬP KHO (INVENTORY TRANSACTIONS)';
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF059669' },
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 36;

    // Subtitle / Metadata Row
    sheet.mergeCells('A2:N2');
    const metaCell = sheet.getCell('A2');
    const now = new Date();
    metaCell.value = `Thời gian xuất báo cáo: ${now.toLocaleDateString('vi-VN')} ${now.toLocaleTimeString('vi-VN')}`;
    metaCell.font = { name: 'Arial', size: 10, italic: true };
    metaCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(2).height = 20;

    // Table Headers
    const headers = [
      'STT',
      'Thời gian',
      'Mã giao dịch',
      'Chiều GD',
      'Nghiệp vụ',
      'Mã chứng từ',
      'Kho hàng',
      'Mã SKU',
      'Tên sản phẩm',
      'Quy cách',
      'Số Lô (Lot)',
      'Hạn dùng (Exp)',
      'Số lượng',
      'Người thực hiện',
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF065F46' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };
    });

    const getRefTypeName = (type: string) => {
      switch (type) {
        case 'PURCHASE_ORDER': return 'Nhập mua hàng NCC';
        case 'SALES_ORDER': return 'Xuất kho bán hàng';
        case 'INVENTORY_COUNT': return 'Cân đối kiểm kê';
        case 'INVENTORY_ADJUSTMENT': return 'Điều chỉnh tồn kho';
        case 'STOCK_TRANSFER': return 'Điều chuyển kho';
        case 'PURCHASE_RETURN': return 'Trả hàng NCC';
        default: return type || 'Thủ công';
      }
    };

    transactions.forEach((t, idx) => {
      const d = t.createdAt ? new Date(t.createdAt) : new Date();
      const timeStr = `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
      const expStr = t.stockLot?.expiryDate ? new Date(t.stockLot.expiryDate).toLocaleDateString('vi-VN') : '';
      const isIN = t.direction === 'IN';

      const row = sheet.addRow([
        idx + 1,
        timeStr,
        t.transactionCode,
        isIN ? 'NHẬP KHO' : 'XUẤT KHO',
        getRefTypeName(t.referenceType),
        t.referenceCode || '',
        t.warehouse?.name || '',
        t.stockLot?.product?.sku || '',
        t.stockLot?.product?.name || '',
        t.stockLot?.product?.unit || 'Thùng',
        t.stockLot?.lotNumber || '',
        expStr,
        Number(t.quantity),
        t.createdBy?.fullName || 'Hệ thống',
      ]);

      row.height = 22;
      row.eachCell((cell, colNum) => {
        cell.font = { name: 'Arial', size: 9.5 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
        cell.alignment = { vertical: 'middle' };

        // Highlight direction column
        if (colNum === 4) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.font = {
            name: 'Arial',
            size: 9.5,
            bold: true,
            color: { argb: isIN ? 'FF059669' : 'FFDC2626' },
          };
        }

        // Align numbers
        if (colNum === 1 || colNum === 11 || colNum === 12) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
        if (colNum === 13) {
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
          cell.numFmt = '#,##0';
        }
      });
    });

    // Auto-fit column widths
    sheet.columns.forEach((col, idx) => {
      let maxLen = headers[idx]?.length || 10;
      sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber > 2) {
          const val = row.getCell(idx + 1).value;
          if (val) {
            const strLen = String(val).length;
            if (strLen > maxLen) maxLen = strLen;
          }
        }
      });
      col.width = Math.min(Math.max(maxLen + 4, 10), 38);
    });

    return await workbook.xlsx.writeBuffer();
  }
}
