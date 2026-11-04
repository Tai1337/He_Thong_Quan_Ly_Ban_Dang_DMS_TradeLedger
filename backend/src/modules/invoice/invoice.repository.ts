import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InvoiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getInvoices(distributorId: string | number, filters: any = {}) {
    const {
      page = 1,
      limit = 25,
      status,
      retailerId,
      search,
      fromDate,
      toDate,
    } = filters;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {
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
      const dateFilter: any = {};
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
      this.prisma.invoice.findMany({
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
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.aggregate({
        where: { distributorId: BigInt(distributorId) },
        _sum: {
          totalAmount: true,
          paidAmount: true,
        },
        _count: { id: true },
      }),
      this.prisma.invoice.aggregate({
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

    return {
      invoices,
      total,
      summary: {
        totalInvoices: totalAgg._count.id || 0,
        totalInvoiceAmount,
        totalPaidAmount,
        totalRemainingDebt,
        overdueCount: overdueAgg._count.id || 0,
        overdueDebt,
      },
    };
  }

  async getInvoiceById(id: string | number, distributorId: string | number) {
    return this.prisma.invoice.findFirst({
      where: {
        id: BigInt(id),
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
  }

  async recordPayment(
    invoiceId: string | number,
    distributorId: string | number,
    paymentData: { amount: number; paymentMethod: any; note?: string; paymentDate?: string },
  ) {
    const inv = await this.prisma.invoice.findFirst({
      where: { id: BigInt(invoiceId), distributorId: BigInt(distributorId) },
    });

    if (!inv) {
      throw new Error('Hoá đơn không tồn tại hoặc không thuộc quyền quản lý');
    }

    const payAmount = Number(paymentData.amount);
    if (payAmount <= 0) {
      throw new Error('Số tiền thanh toán phải lớn hơn 0');
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

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          invoiceId: inv.id,
          amount: payAmount,
          paymentMethod: paymentData.paymentMethod || 'CASH',
          paymentDate: paymentData.paymentDate ? new Date(paymentData.paymentDate) : new Date(),
          note: paymentData.note || '',
        },
      });

      const updatedInvoice = await tx.invoice.update({
        where: { id: inv.id },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus as any,
        },
        include: {
          payments: true,
          salesOrder: {
            include: { retailer: true },
          },
        },
      });

      return { payment, invoice: updatedInvoice };
    });
  }
}

