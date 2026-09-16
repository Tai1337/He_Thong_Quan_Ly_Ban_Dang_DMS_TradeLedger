import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import prisma from '../../prisma/prisma.client';

export interface PurchaseOrderFilters {
  poCode?: string;
  supplierId?: string | number | bigint;
  warehouseId?: string | number | bigint;
  status?: string | string[];
  dateFrom?: string | Date;
  dateTo?: string | Date;
  page?: number | string;
  limit?: number | string;
}

/**
 * Xây dựng where clause theo filter
 */
export const buildPOWhereClause = (distributorId?: string | number | bigint, filters: PurchaseOrderFilters = {}) => {
  const where: any = {};

  if (distributorId) {
    where.distributorId = BigInt(distributorId);
  }

  if (filters.poCode && filters.poCode.trim()) {
    where.poCode = { contains: filters.poCode.trim() };
  }

  if (filters.supplierId) {
    where.supplierId = BigInt(filters.supplierId);
  }

  if (filters.warehouseId) {
    where.warehouseId = BigInt(filters.warehouseId);
  }

  if (filters.status) {
    if (Array.isArray(filters.status)) {
      where.status = { in: filters.status };
    } else if (typeof filters.status === 'string') {
      const parts = filters.status
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (parts.length > 1) {
        where.status = { in: parts };
      } else if (parts.length === 1) {
        where.status = parts[0];
      }
    }
  }

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      from.setHours(0, 0, 0, 0);
      where.createdAt.gte = from;
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      where.createdAt.lte = to;
    }
  }

  return where;
};

@Injectable()
export class PurchaseOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tìm danh sách đơn mua PO có phân trang
   */
  async findPurchaseOrders(distributorId?: string | number | bigint, filters: PurchaseOrderFilters = {}) {
    const where = buildPOWhereClause(distributorId, filters);
    const page = parseInt(String(filters.page || 1), 10);
    const limit = parseInt(String(filters.limit || 20), 10);
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: true,
          warehouse: true,
          createdBy: {
            select: { id: true, fullName: true, username: true },
          },
          items: {
            include: {
              product: true,
            },
          },
        },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return { orders, total, page, limit };
  }

  /**
   * Lấy tất cả đơn mua theo filter (phục vụ xuất Excel)
   */
  async findAllPurchaseOrdersForExport(distributorId?: string | number | bigint, filters: PurchaseOrderFilters = {}) {
    const where = buildPOWhereClause(distributorId, filters);

    return this.prisma.purchaseOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: true,
        warehouse: true,
        createdBy: {
          select: { id: true, fullName: true, username: true },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  /**
   * Tìm chi tiết một đơn PO theo ID
   */
  async findPurchaseOrderById(id: string | number | bigint, distributorId?: string | number | bigint) {
    const where: any = { id: BigInt(id) };
    if (distributorId) {
      where.distributorId = BigInt(distributorId);
    }

    return this.prisma.purchaseOrder.findFirst({
      where,
      include: {
        supplier: true,
        warehouse: true,
        createdBy: {
          select: { id: true, fullName: true, username: true, email: true },
        },
        items: {
          include: {
            product: true,
          },
          orderBy: { id: 'asc' },
        },
        statusHistory: {
          include: {
            changedBy: {
              select: { id: true, fullName: true, username: true },
            },
          },
          orderBy: { changedAt: 'desc' },
        },
      },
    });
  }

  /**
   * Lấy danh sách PO và line items có chênh lệch giữa số lượng nhận và số lượng đặt
   */
  async findPurchaseOrderDiscrepancies(distributorId?: string | number | bigint, filters: PurchaseOrderFilters = {}) {
    const where = buildPOWhereClause(distributorId, filters);

    where.status = {
      in: ['WAITING_RECEIVE', 'PARTIALLY_RECEIVED', 'COMPLETED'],
    };

    const orders = await this.prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: true,
        warehouse: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const discrepancies: any[] = [];

    for (const order of orders) {
      const diffItems = order.items.filter((item: any) => {
        const ordered = Number(item.quantity);
        const received = Number(item.quantityReceived || 0);
        return ordered !== received;
      });

      if (diffItems.length > 0) {
        discrepancies.push({
          ...order,
          discrepantItems: diffItems,
        });
      }
    }

    return discrepancies;
  }
}

// Standalone functions for backward compatibility
export const findPurchaseOrders = async (distributorId?: string | number | bigint, filters: PurchaseOrderFilters = {}) => {
  const repo = new PurchaseOrderRepository(prisma as any);
  return repo.findPurchaseOrders(distributorId, filters);
};

export const findAllPurchaseOrdersForExport = async (distributorId?: string | number | bigint, filters: PurchaseOrderFilters = {}) => {
  const repo = new PurchaseOrderRepository(prisma as any);
  return repo.findAllPurchaseOrdersForExport(distributorId, filters);
};

export const findPurchaseOrderById = async (id: string | number | bigint, distributorId?: string | number | bigint) => {
  const repo = new PurchaseOrderRepository(prisma as any);
  return repo.findPurchaseOrderById(id, distributorId);
};

export const findPurchaseOrderDiscrepancies = async (distributorId?: string | number | bigint, filters: PurchaseOrderFilters = {}) => {
  const repo = new PurchaseOrderRepository(prisma as any);
  return repo.findPurchaseOrderDiscrepancies(distributorId, filters);
};
