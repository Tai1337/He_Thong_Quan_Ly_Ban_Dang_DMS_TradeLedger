import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import prisma from '../../prisma/prisma.client';

export interface SalesOrderFilterParams {
  page?: number | string;
  limit?: number | string;
  startDate?: string | Date;
  endDate?: string | Date;
  dateType?: 'created' | 'expected' | string;
  warehouseId?: string | number | bigint;
  status?: string | string[];
  orderCode?: string;
  vnbhCode?: string;
  vnbhName?: string;
  retailer?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc' | string;
}

@Injectable()
export class SalesOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tìm danh sách đơn bán hàng theo Nhà Phân Phối và bộ lọc đa tiêu chí
   */
  async findSalesOrdersByDistributor(distributorId: string | number | bigint, filters: SalesOrderFilterParams = {}) {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      dateType = 'created',
      warehouseId,
      status,
      orderCode,
      vnbhCode,
      vnbhName,
      retailer,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const take = parseInt(String(limit), 10);
    const skip = (parseInt(String(page), 10) - 1) * take;

    const where: any = {
      distributorId: BigInt(distributorId),
    };

    if (warehouseId) {
      where.warehouseId = BigInt(warehouseId);
    }

    if (status) {
      let statusList: string[] = [];
      if (Array.isArray(status)) {
        statusList = status;
      } else if (typeof status === 'string') {
        statusList = status
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
      if (statusList.length === 1) {
        where.status = statusList[0];
      } else if (statusList.length > 1) {
        where.status = { in: statusList };
      }
    }

    if (orderCode && orderCode.trim()) {
      where.orderCode = {
        contains: orderCode.trim(),
      };
    }

    if (vnbhCode && vnbhCode.trim()) {
      where.createdBy = {
        ...where.createdBy,
        username: { contains: vnbhCode.trim() },
      };
    }

    if (vnbhName && vnbhName.trim()) {
      where.createdBy = {
        ...where.createdBy,
        fullName: { contains: vnbhName.trim() },
      };
    }

    if (retailer && retailer.trim()) {
      const term = retailer.trim();
      where.retailer = {
        OR: [{ code: { contains: term } }, { name: { contains: term } }],
      };
    }

    if (startDate || endDate) {
      const dateCondition: any = {};
      if (dateType === 'expected') {
        if (startDate) {
          const start = new Date(startDate);
          start.setDate(start.getDate() - 1);
          start.setHours(0, 0, 0, 0);
          dateCondition.gte = start;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setDate(end.getDate() - 1);
          end.setHours(23, 59, 59, 999);
          dateCondition.lte = end;
        }
      } else {
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          dateCondition.gte = start;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          dateCondition.lte = end;
        }
      }
      where.createdAt = dateCondition;
    }

    const orderBy: any = {};
    if (sortBy === 'orderCode' || sortBy === 'status' || sortBy === 'createdAt') {
      orderBy[sortBy] = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [orders, total] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          retailer: true,
          warehouse: true,
          deliveryTrip: {
            include: { driver: true },
          },
          createdBy: true,
          items: {
            include: {
              product: true,
              allocations: {
                include: { stockLot: true },
              },
            },
          },
          invoice: true,
          statusHistory: {
            include: { changedBy: true },
            orderBy: { changedAt: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.salesOrder.count({ where }),
    ]);

    return { orders, total };
  }

  /**
   * Lấy chi tiết đơn hàng bán theo ID và NPP
   */
  async findSalesOrderById(id: string | number | bigint, distributorId?: string | number | bigint) {
    const where: any = { id: BigInt(id) };
    if (distributorId) {
      where.distributorId = BigInt(distributorId);
    }

    return this.prisma.salesOrder.findFirst({
      where,
      include: {
        retailer: true,
        warehouse: true,
        deliveryTrip: {
          include: { driver: true },
        },
        createdBy: true,
        items: {
          include: {
            product: true,
            allocations: {
              include: { stockLot: true },
            },
          },
        },
        statusHistory: {
          include: { changedBy: true },
          orderBy: { changedAt: 'asc' },
        },
        invoice: true,
      },
    });
  }

  /**
   * Tìm các lô hàng còn HSD và khả dụng của sản phẩm theo FEFO
   */
  async findAvailableLotsByProduct(productId: string | number | bigint, warehouseId: string | number | bigint) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const lots = await this.prisma.stockLot.findMany({
      where: {
        productId: BigInt(productId),
        warehouseId: BigInt(warehouseId),
        status: 'GOOD',
        OR: [{ expiryDate: null }, { expiryDate: { gte: now } }],
      },
      include: {
        stockBalance: true,
      },
      orderBy: [
        { expiryDate: 'asc' },
        { id: 'asc' },
      ],
    });

    return lots.map((lot: any) => {
      const onHand = Number(lot.stockBalance?.quantityOnHand || 0);
      const reserved = Number(lot.stockBalance?.quantityReserved || 0);
      const available = Math.max(0, onHand - reserved);

      return {
        lotId: lot.id,
        lotNumber: lot.lotNumber,
        expiryDate: lot.expiryDate,
        manufactureDate: lot.manufactureDate,
        quantityOnHand: onHand,
        quantityReserved: reserved,
        quantityAvailable: available,
      };
    });
  }

  /**
   * Tính tổng tồn khả dụng của sản phẩm trong kho
   */
  async getTotalAvailableStock(productId: string | number | bigint, warehouseId: string | number | bigint) {
    const lots = await this.findAvailableLotsByProduct(productId, warehouseId);
    return lots.reduce((sum, l) => sum + l.quantityAvailable, 0);
  }

  /**
   * Tìm các chuyến xe khả dụng để gán đơn hàng
   */
  async findAvailableDeliveryTrips(distributorId: string | number | bigint, warehouseId?: string | number | bigint) {
    const where: any = {
      distributorId: BigInt(distributorId),
      tripType: 'OUTBOUND',
      status: { in: ['WAITING_CONFIRM', 'WAITING_SHIP', 'SHIPPING'] },
    };
    if (warehouseId) {
      where.warehouseId = BigInt(warehouseId);
    }

    return this.prisma.deliveryTrip.findMany({
      where,
      include: {
        driver: {
          select: { id: true, fullName: true, phone: true },
        },
        warehouse: {
          select: { id: true, name: true },
        },
        salesOrders: {
          select: { id: true, orderCode: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Lấy metadata danh sách khách hàng, kho xuất và sản phẩm kèm giá
   */
  async findSalesOrderMetaOptions(distributorId: string | number | bigint) {
    const [retailers, warehouses, products] = await Promise.all([
      this.prisma.retailer.findMany({
        where: { distributorId: BigInt(distributorId), status: true },
        select: { id: true, code: true, name: true, phone: true, address: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.warehouse.findMany({
        where: { distributorId: BigInt(distributorId), status: true },
        select: { id: true, code: true, name: true, type: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.findMany({
        where: { status: true },
        select: { id: true, sku: true, name: true, unit: true, basePrice: true, stdSku: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return { retailers, warehouses, products };
  }

  /**
   * Thống kê tổng quan đơn bán hàng theo trạng thái & doanh thu
   */
  async getSalesSummaryAnalytics(
    distributorId: string | number | bigint,
    { startDate, endDate }: { startDate?: string | Date; endDate?: string | Date },
  ) {
    const where: any = { distributorId: BigInt(distributorId) };
    if (startDate || endDate) {
      const createdAt: any = {};
      if (startDate) createdAt.gte = new Date(startDate);
      if (endDate) createdAt.lte = new Date(endDate);
      where.createdAt = createdAt;
    }

    const [statusCounts, totalRevenueAgg] = await Promise.all([
      this.prisma.salesOrder.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          distributorId: BigInt(distributorId),
          status: { in: ['PAID', 'PARTIALLY_PAID'] },
        },
        _sum: {
          totalAmount: true,
          paidAmount: true,
        },
      }),
    ]);

    return { statusCounts, totalRevenueAgg };
  }
}

// Standalone functions for backward compatibility
export const findSalesOrdersByDistributor = async (distributorId: string | number | bigint, filters: SalesOrderFilterParams = {}) => {
  const repo = new SalesOrderRepository(prisma as any);
  return repo.findSalesOrdersByDistributor(distributorId, filters);
};

export const findSalesOrderById = async (id: string | number | bigint, distributorId?: string | number | bigint) => {
  const repo = new SalesOrderRepository(prisma as any);
  return repo.findSalesOrderById(id, distributorId);
};

export const findAvailableLotsByProduct = async (productId: string | number | bigint, warehouseId: string | number | bigint) => {
  const repo = new SalesOrderRepository(prisma as any);
  return repo.findAvailableLotsByProduct(productId, warehouseId);
};

export const getTotalAvailableStock = async (productId: string | number | bigint, warehouseId: string | number | bigint) => {
  const repo = new SalesOrderRepository(prisma as any);
  return repo.getTotalAvailableStock(productId, warehouseId);
};

export const findAvailableDeliveryTrips = async (distributorId: string | number | bigint, warehouseId?: string | number | bigint) => {
  const repo = new SalesOrderRepository(prisma as any);
  return repo.findAvailableDeliveryTrips(distributorId, warehouseId);
};

export const findSalesOrderMetaOptions = async (distributorId: string | number | bigint) => {
  const repo = new SalesOrderRepository(prisma as any);
  return repo.findSalesOrderMetaOptions(distributorId);
};

export const getSalesSummaryAnalytics = async (distributorId: string | number | bigint, params: any) => {
  const repo = new SalesOrderRepository(prisma as any);
  return repo.getSalesSummaryAnalytics(distributorId, params);
};
