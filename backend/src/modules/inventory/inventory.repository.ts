import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InventoryRepository {
  constructor(private prisma: PrismaService) {}

  async getInventoryLotsRpt083(distributorId: string | number, filters: any = {}) {
    const {
      page = 1,
      limit = 50,
      warehouseId,
      status,
      lotNumber,
      searchProduct,
      stockFilter,
      dateType,
      fromDate,
      toDate,
      productType,
      locationName,
    } = filters;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      warehouse: {
        distributorId: BigInt(distributorId),
      },
    };

    if (warehouseId) where.warehouseId = BigInt(warehouseId);
    if (status) where.status = status;
    if (lotNumber) where.lotNumber = { contains: lotNumber };

    if (locationName) {
      where.locationName = { contains: locationName };
    }

    if (stockFilter === 'POSITIVE') {
      where.stockBalance = { quantityOnHand: { gt: 0 } };
    } else if (stockFilter === 'ZERO') {
      where.stockBalance = { quantityOnHand: { equals: 0 } };
    }

    if (dateType && (fromDate || toDate)) {
      const dateQuery: any = {};
      if (fromDate) dateQuery.gte = new Date(fromDate);
      if (toDate) {
        const t = new Date(toDate);
        t.setUTCHours(23, 59, 59, 999);
        dateQuery.lte = t;
      }

      if (dateType === 'MFG') {
        where.manufactureDate = dateQuery;
      } else if (dateType === 'EXP') {
        where.expiryDate = dateQuery;
      }
    }

    const productQuery: any = {};
    if (productType) {
      productQuery.productType = productType;
    }

    if (searchProduct) {
      productQuery.OR = [
        { sku: { contains: searchProduct } },
        { name: { contains: searchProduct } },
      ];
    }

    if (Object.keys(productQuery).length > 0) {
      where.product = productQuery;
    }

    const [lots, total] = await Promise.all([
      this.prisma.stockLot.findMany({
        where,
        skip,
        take: parseInt(limit, 10),
        include: {
          product: {
            include: {
              category: true,
            },
          },
          stockBalance: true,
          warehouse: {
            include: {
              distributor: true,
            },
          },
        },
        orderBy: {
          manufactureDate: 'desc',
        },
      }),
      this.prisma.stockLot.count({ where }),
    ]);

    return { lots, total };
  }

  async getInventoryTransactions(distributorId: string | number, filters: any = {}) {
    const {
      page = 1,
      limit = 25,
      warehouseId,
      direction,
      referenceType,
      search,
      fromDate,
      toDate,
      productId,
    } = filters;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      warehouse: {
        distributorId: BigInt(distributorId),
      },
    };

    if (warehouseId) {
      where.warehouseId = BigInt(warehouseId);
    }

    if (direction && ['IN', 'OUT'].includes(direction)) {
      where.direction = direction;
    }

    if (referenceType) {
      where.referenceType = referenceType;
    }

    if (productId) {
      where.stockLot = {
        productId: BigInt(productId),
      };
    }

    if (fromDate || toDate) {
      const dateFilter: any = {};
      if (fromDate) {
        dateFilter.gte = new Date(fromDate);
      }
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
      where.createdAt = dateFilter;
    }

    if (search && String(search).trim() !== '') {
      const s = String(search).trim();
      where.OR = [
        { transactionCode: { contains: s } },
        { stockLot: { lotNumber: { contains: s } } },
        { stockLot: { product: { name: { contains: s } } } },
        { stockLot: { product: { sku: { contains: s } } } },
      ];
    }

    const [transactions, total, inCount, outCount] = await Promise.all([
      this.prisma.inventoryTransaction.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          stockLot: {
            include: {
              product: {
                include: {
                  category: true,
                },
              },
            },
          },
          warehouse: true,
          createdBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.inventoryTransaction.count({ where }),
      this.prisma.inventoryTransaction.aggregate({
        where: { ...where, direction: 'IN' },
        _sum: { quantity: true },
        _count: { id: true },
      }),
      this.prisma.inventoryTransaction.aggregate({
        where: { ...where, direction: 'OUT' },
        _sum: { quantity: true },
        _count: { id: true },
      }),
    ]);

    // Batch resolve reference codes
    const soIds = transactions
      .filter((t) => t.referenceType === 'SALES_ORDER' && t.referenceId)
      .map((t) => t.referenceId);
    const poIds = transactions
      .filter((t) => t.referenceType === 'PURCHASE_ORDER' && t.referenceId)
      .map((t) => t.referenceId);
    const countIds = transactions
      .filter((t) => t.referenceType === 'INVENTORY_COUNT' && t.referenceId)
      .map((t) => t.referenceId);
    const adjIds = transactions
      .filter((t) => t.referenceType === 'INVENTORY_ADJUSTMENT' && t.referenceId)
      .map((t) => t.referenceId);

    const [salesOrders, purchaseOrders, inventoryCounts, adjustments] = await Promise.all([
      soIds.length
        ? this.prisma.salesOrder.findMany({
            where: { id: { in: soIds } },
            select: { id: true, orderCode: true },
          })
        : [],
      poIds.length
        ? this.prisma.purchaseOrder.findMany({
            where: { id: { in: poIds } },
            select: { id: true, poCode: true },
          })
        : [],
      countIds.length
        ? this.prisma.inventoryCount.findMany({
            where: { id: { in: countIds } },
            select: { id: true, countCode: true },
          })
        : [],
      adjIds.length
        ? this.prisma.inventoryAdjustment.findMany({
            where: { id: { in: adjIds } },
            select: { id: true, adjustmentCode: true },
          })
        : [],
    ]);

    const soMap = new Map<string, string>();
    salesOrders.forEach((s) => soMap.set(s.id.toString(), s.orderCode));

    const poMap = new Map<string, string>();
    purchaseOrders.forEach((p) => poMap.set(p.id.toString(), p.poCode));

    const countMap = new Map<string, string>();
    inventoryCounts.forEach((c) => countMap.set(c.id.toString(), c.countCode));

    const adjMap = new Map<string, string>();
    adjustments.forEach((a) => adjMap.set(a.id.toString(), a.adjustmentCode));

    const enrichedTransactions = transactions.map((t) => {
      let refCode = '';
      const refIdStr = t.referenceId?.toString() || '';
      if (t.referenceType === 'SALES_ORDER') refCode = soMap.get(refIdStr) || (refIdStr ? `SO#${refIdStr}` : '');
      else if (t.referenceType === 'PURCHASE_ORDER') refCode = poMap.get(refIdStr) || (refIdStr ? `PO#${refIdStr}` : '');
      else if (t.referenceType === 'INVENTORY_COUNT') refCode = countMap.get(refIdStr) || (refIdStr ? `CNT#${refIdStr}` : '');
      else if (t.referenceType === 'INVENTORY_ADJUSTMENT') refCode = adjMap.get(refIdStr) || (refIdStr ? `ADJ#${refIdStr}` : '');
      else if (refIdStr) refCode = `#${refIdStr}`;

      return {
        ...t,
        referenceCode: refCode,
      };
    });

    return {
      transactions: enrichedTransactions,
      total,
      summary: {
        totalTransactions: total,
        totalInQty: Number(inCount._sum.quantity || 0),
        totalInCount: inCount._count.id || 0,
        totalOutQty: Number(outCount._sum.quantity || 0),
        totalOutCount: outCount._count.id || 0,
      },
    };
  }
}
