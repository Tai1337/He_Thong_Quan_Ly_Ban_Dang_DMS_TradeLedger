import ExcelJS from 'exceljs';
import prisma from '../config/prisma.js';

export const getInvoices = async (req, res) => {
  try {
    const distributorId = req.query.distributorId || 1;
    const {
      page = 1,
      limit = 25,
      status,
      retailerId,
      search,
      fromDate,
      toDate,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where = {
      distributorId: BigInt(distributorId),
    };

    if (status && status !== 'ALL') {
      if (status === 'OVERDUE') {
        where.dueDate = { lt: new Date() };
        where.status = { not: 'PAID' };
      } else {
        where.status = status;
      }
    }

    if (retailerId) {
      where.salesOrder = { retailerId: BigInt(retailerId) };
    }

    if (fromDate || toDate) {
      const dateFilter = {};
      if (fromDate) dateFilter.gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
      where.invoiceDate = dateFilter;
    }

    if (search && String(search).trim() !== '') {
      const s = String(search).trim();
      where.OR = [
        { invoiceCode: { contains: s } },
        { salesOrder: { orderCode: { contains: s } } },
        { salesOrder: { retailer: { name: { contains: s } } } },
      ];
    }

    const [invoices, total, totalAgg, overdueAgg] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          salesOrder: {
            include: {
              retailer: true,
            },
          },
          payments: {
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: {
          invoiceDate: 'desc',
        },
      }),
      prisma.invoice.count({ where }),
      prisma.invoice.aggregate({
        where: { distributorId: BigInt(distributorId) },
        _sum: {
          totalAmount: true,
          paidAmount: true,
        },
        _count: { id: true },
      }),
      prisma.invoice.aggregate({
        where: {
          distributorId: BigInt(distributorId),
          dueDate: { lt: new Date() },
          status: { not: 'PAID' },
        },
        _sum: {
          totalAmount: true,
          paidAmount: true,
        },
        _count: { id: true },
      }),
    ]);

    const totalInvoiceAmount = Number(totalAgg._sum.totalAmount || 0);
    const totalPaidAmount = Number(totalAgg._sum.paidAmount || 0);
    const totalRemainingDebt = Math.max(0, totalInvoiceAmount - totalPaidAmount);

    const overdueTotal = Number(overdueAgg._sum.totalAmount || 0);
    const overduePaid = Number(overdueAgg._sum.paidAmount || 0);
    const overdueDebt = Math.max(0, overdueTotal - overduePaid);

    const now = new Date();
    const formattedData = invoices.map((inv) => {
      const totalAmt = Number(inv.totalAmount);
      const paidAmt = Number(inv.paidAmount);
      const remainingDebt = Math.max(0, totalAmt - paidAmt);
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
        totalAmount: totalAmt,
        paidAmount: paidAmt,
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

    res.json({
      data: formattedData,
      summary: {
        totalInvoices: totalAgg._count.id || 0,
        totalInvoiceAmount,
        totalPaidAmount,
        totalRemainingDebt,
        overdueCount: overdueAgg._count.id || 0,
        overdueDebt,
      },
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)) || 1,
      },
    });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách hoá đơn:', error);
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
};

export const getInvoiceById = async (req, res) => {
  try {
    const distributorId = req.query.distributorId || 1;
    const inv = await prisma.invoice.findFirst({
      where: {
        id: BigInt(req.params.id),
        distributorId: BigInt(distributorId),
      },
      include: {
        salesOrder: {
          include: {
            retailer: true,
            items: {
              include: {
                product: true,
              },
            },
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!inv) {
      return res.status(404).json({ error: 'Không tìm thấy hoá đơn' });
    }

    const totalAmt = Number(inv.totalAmount);
    const paidAmt = Number(inv.paidAmount);
    const remainingDebt = Math.max(0, totalAmt - paidAmt);
    const now = new Date();
    const isOverdue = new Date(inv.dueDate) < now && inv.status !== 'PAID';

    res.json({
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
      totalAmount: totalAmt,
      paidAmount: paidAmt,
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
    });
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết hoá đơn:', error);
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
};

export const recordPayment = async (req, res) => {
  try {
    const distributorId = req.body.distributorId || req.query.distributorId || 1;
    const invoiceId = req.params.id;
    const { amount, paymentMethod, paymentDate, note } = req.body;

    const inv = await prisma.invoice.findFirst({
      where: { id: BigInt(invoiceId), distributorId: BigInt(distributorId) },
    });

    if (!inv) {
      return res.status(404).json({ error: 'Hoá đơn không tồn tại' });
    }

    const payAmount = Number(amount);
    if (payAmount <= 0) {
      return res.status(400).json({ error: 'Số tiền thanh toán phải lớn hơn 0' });
    }

    const currentPaid = Number(inv.paidAmount);
    const totalAmount = Number(inv.totalAmount);
    const newPaidAmount = currentPaid + payAmount;

    let newStatus = inv.status;
    if (newPaidAmount >= totalAmount) {
      newStatus = 'PAID';
    } else {
      newStatus = 'PARTIALLY_PAID';
    }

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          invoiceId: inv.id,
          amount: payAmount,
          paymentMethod: paymentMethod || 'CASH',
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          note: note || '',
        },
      });

      const updatedInvoice = await tx.invoice.update({
        where: { id: inv.id },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
        },
      });

      return { payment, invoice: updatedInvoice };
    });

    res.json({
      success: true,
      message: 'Ghi nhận thanh toán thành công',
      payment: {
        id: result.payment.id.toString(),
        amount: Number(result.payment.amount),
        paymentMethod: result.payment.paymentMethod,
        paymentDate: result.payment.paymentDate,
        note: result.payment.note,
      },
      invoice: {
        id: result.invoice.id.toString(),
        paidAmount: Number(result.invoice.paidAmount),
        status: result.invoice.status,
      },
    });
  } catch (error) {
    console.error('Lỗi khi ghi nhận thanh toán:', error);
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
};

export const exportInvoices = async (req, res) => {
  try {
    const distributorId = req.query.distributorId || 1;
    const invoices = await prisma.invoice.findMany({
      where: { distributorId: BigInt(distributorId) },
      include: {
        salesOrder: {
          include: { retailer: true },
        },
      },
      orderBy: { invoiceDate: 'desc' },
      take: 10000,
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'DMS TradeLedger';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Sổ Công Nợ Hoá Đơn', {
      views: [{ showGridLines: true }],
    });

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
        inv.status === 'PAID' ? 'Đã thanh toán' : inv.status === 'PARTIALLY_PAID' ? 'Thanh toán 1 phần' : 'Chưa thanh toán',
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

    const nowFile = new Date();
    const dateStr = nowFile.toISOString().slice(0, 10).replace(/-/g, '');
    res.setHeader('Content-Disposition', `attachment; filename="So_Cong_No_Hoa_Don_${dateStr}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const buffer = await workbook.xlsx.writeBuffer();
    res.send(buffer);
  } catch (error) {
    console.error('Lỗi khi xuất file Excel hoá đơn:', error);
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
};

