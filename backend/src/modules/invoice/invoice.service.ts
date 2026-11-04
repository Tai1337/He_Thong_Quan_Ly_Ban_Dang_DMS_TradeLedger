import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { InvoiceRepository } from './invoice.repository';

@Injectable()
export class InvoiceService {
  constructor(private readonly invoiceRepository: InvoiceRepository) {}

  async getInvoices(distributorId: string | number, filters: any) {
    const page = parseInt(filters.page || 1, 10);
    const limit = parseInt(filters.limit || 25, 10);

    const { invoices, total, summary } = await this.invoiceRepository.getInvoices(
      distributorId,
      { ...filters, page, limit },
    );

    const now = new Date();

    const formattedData = invoices.map((inv) => {
      const totalAmount = Number(inv.totalAmount);
      const paidAmount = Number(inv.paidAmount);
      const remainingDebt = Math.max(0, totalAmount - paidAmount);
      const isOverdue = new Date(inv.dueDate) < now && inv.status !== 'PAID';

      return {
        id: inv.id.toString(),
        invoiceCode: inv.invoiceCode,
        salesOrderId: inv.salesOrderId?.toString(),
        orderCode: inv.salesOrder?.orderCode || '',
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        isOverdue,
        subtotal: Number(inv.subtotal),
        vatRate: Number(inv.vatRate),
        vatAmount: Number(inv.vatAmount),
        discountAmount: Number(inv.invoiceDiscountAmount || 0),
        totalAmount,
        paidAmount,
        remainingDebt,
        status: isOverdue && inv.status === 'UNPAID' ? 'OVERDUE' : inv.status,
        retailer: {
          id: inv.salesOrder?.retailer?.id?.toString(),
          code: inv.salesOrder?.retailer?.code || '',
          name: inv.salesOrder?.retailer?.name || '',
          phone: inv.salesOrder?.retailer?.phone || '',
          address: inv.salesOrder?.retailer?.address || '',
        },
        paymentCount: inv.payments?.length || 0,
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

  async getInvoiceById(id: string | number, distributorId: string | number) {
    const inv = await this.invoiceRepository.getInvoiceById(id, distributorId);
    if (!inv) return null;

    const totalAmount = Number(inv.totalAmount);
    const paidAmount = Number(inv.paidAmount);
    const remainingDebt = Math.max(0, totalAmount - paidAmount);
    const now = new Date();
    const isOverdue = new Date(inv.dueDate) < now && inv.status !== 'PAID';

    return {
      id: inv.id.toString(),
      invoiceCode: inv.invoiceCode,
      salesOrderId: inv.salesOrderId?.toString(),
      orderCode: inv.salesOrder?.orderCode || '',
      invoiceDate: inv.invoiceDate,
      dueDate: inv.dueDate,
      isOverdue,
      subtotal: Number(inv.subtotal),
      vatRate: Number(inv.vatRate),
      vatAmount: Number(inv.vatAmount),
      discountAmount: Number(inv.invoiceDiscountAmount || 0),
      totalAmount,
      paidAmount,
      remainingDebt,
      status: isOverdue && inv.status === 'UNPAID' ? 'OVERDUE' : inv.status,
      retailer: {
        id: inv.salesOrder?.retailer?.id?.toString(),
        code: inv.salesOrder?.retailer?.code || '',
        name: inv.salesOrder?.retailer?.name || '',
        phone: inv.salesOrder?.retailer?.phone || '',
        address: inv.salesOrder?.retailer?.address || '',
      },
      orderItems: (inv.salesOrder?.items || []).map((it) => ({
        id: it.id.toString(),
        productName: it.product?.name || '',
        sku: it.product?.sku || '',
        unit: it.product?.unit || 'Thùng',
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        totalPrice: Number(it.quantity) * Number(it.unitPrice),
      })),
      payments: (inv.payments || []).map((p) => ({
        id: p.id.toString(),
        amount: Number(p.amount),
        paymentMethod: p.paymentMethod,
        paymentDate: p.paymentDate,
        note: p.note,
        createdAt: p.createdAt,
      })),
    };
  }

  async recordPayment(
    invoiceId: string | number,
    distributorId: string | number,
    paymentData: { amount: number; paymentMethod: any; note?: string; paymentDate?: string },
  ) {
    const res = await this.invoiceRepository.recordPayment(invoiceId, distributorId, paymentData);
    return {
      success: true,
      message: 'Ghi nhận thanh toán thành công',
      payment: {
        id: res.payment.id.toString(),
        amount: Number(res.payment.amount),
        paymentMethod: res.payment.paymentMethod,
        paymentDate: res.payment.paymentDate,
        note: res.payment.note,
      },
      invoice: {
        id: res.invoice.id.toString(),
        paidAmount: Number(res.invoice.paidAmount),
        status: res.invoice.status,
      },
    };
  }

  async exportInvoicesExcel(distributorId: string | number, filters: any) {
    const exportFilters = { ...filters, page: 1, limit: 100000 };
    const { invoices } = await this.invoiceRepository.getInvoices(distributorId, exportFilters);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'DMS TradeLedger';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Sổ Công Nợ Hoá Đơn', {
      views: [{ showGridLines: true }],
    });

    // Title
    sheet.mergeCells('A1:K1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'SỔ THEO DÕI HOÁ ĐƠN BÁN HÀNG & CÔNG NỢ ĐẠI LÝ';
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF059669' },
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 36;

    const headers = [
      'STT',
      'Mã Hoá Đơn',
      'Mã Đơn Bán (SO)',
      'Tên Đại Lý / Khách Hàng',
      'Ngày Lập HĐ',
      'Hạn Thanh Toán',
      'Tổng Tiền (VNĐ)',
      'Đã Thu (VNĐ)',
      'Còn Nợ (VNĐ)',
      'Trạng Thái',
      'Tình Trạng Hạn Nợ',
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
    });

    const now = new Date();

    invoices.forEach((inv, idx) => {
      const totalAmount = Number(inv.totalAmount);
      const paidAmount = Number(inv.paidAmount);
      const remainingDebt = Math.max(0, totalAmount - paidAmount);
      const isOverdue = new Date(inv.dueDate) < now && inv.status !== 'PAID';

      const getStatusLabel = (s: string) => {
        switch (s) {
          case 'PAID': return 'Đã thanh toán';
          case 'PARTIALLY_PAID': return 'Thanh toán 1 phần';
          case 'UNPAID': return 'Chưa thanh toán';
          default: return s;
        }
      };

      const row = sheet.addRow([
        idx + 1,
        inv.invoiceCode,
        inv.salesOrder?.orderCode || '',
        inv.salesOrder?.retailer?.name || '',
        new Date(inv.invoiceDate).toLocaleDateString('vi-VN'),
        new Date(inv.dueDate).toLocaleDateString('vi-VN'),
        totalAmount,
        paidAmount,
        remainingDebt,
        getStatusLabel(inv.status),
        isOverdue ? 'QUÁ HẠN' : 'Trong hạn',
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

        if ([7, 8, 9].includes(colNum)) {
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
          cell.numFmt = '#,##0';
        }
        if ([1, 5, 6, 10, 11].includes(colNum)) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
      });
    });

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
      col.width = Math.min(Math.max(maxLen + 4, 12), 35);
    });

    return await workbook.xlsx.writeBuffer();
  }
}
