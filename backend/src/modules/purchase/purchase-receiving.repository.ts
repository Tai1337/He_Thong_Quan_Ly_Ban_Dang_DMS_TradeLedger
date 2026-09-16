import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import prisma from '../../prisma/prisma.client';

export interface InboundTripsFilters {
  status?: string;
  dateFilter?: 'TODAY_AND_PAST' | 'TODAY' | 'FUTURE' | string;
  search?: string;
  page?: number | string;
  limit?: number | string;
}

/**
 * Repository xử lý các truy vấn CSDL cho Chuyến xe hàng về (INBOUND Delivery Trips)
 */
@Injectable()
export class PurchaseReceivingRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tìm danh sách chuyến xe INBOUND có lọc và phân trang
   */
  async findInboundDeliveryTrips(distributorId: string | number | bigint, filters: InboundTripsFilters = {}) {
    const distId = BigInt(distributorId);
    const { status, dateFilter, search, page = 1, limit = 20 } = filters;

    const where: any = {
      distributorId: distId,
      tripType: 'INBOUND',
    };

    if (status && status !== 'ALL') {
      where.status = status;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateFilter === 'TODAY_AND_PAST') {
      where.expectedDeliveryDate = { lte: new Date() };
    } else if (dateFilter === 'TODAY') {
      const startOfToday = new Date(today);
      const endOfToday = new Date(today);
      endOfToday.setHours(23, 59, 59, 999);
      where.expectedDeliveryDate = {
        gte: startOfToday,
        lte: endOfToday,
      };
    } else if (dateFilter === 'FUTURE') {
      where.expectedDeliveryDate = { gt: new Date() };
    }

    if (search) {
      where.OR = [
        { tripCode: { contains: search } },
        { supplier: { name: { contains: search } } },
        { purchaseOrders: { some: { poCode: { contains: search } } } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [total, trips] = await Promise.all([
      this.prisma.deliveryTrip.count({ where }),
      this.prisma.deliveryTrip.findMany({
        where,
        skip,
        take,
        orderBy: { expectedDeliveryDate: 'asc' },
        include: {
          supplier: true,
          warehouse: true,
          driver: true,
          purchaseOrders: {
            include: {
              items: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return { total, trips, page: Number(page), limit: Number(limit) };
  }

  /**
   * Lấy chi tiết 1 chuyến xe INBOUND theo ID
   */
  async findInboundTripById(tripId: string | number | bigint, distributorId: string | number | bigint) {
    const distId = BigInt(distributorId);
    return this.prisma.deliveryTrip.findFirst({
      where: {
        id: BigInt(tripId),
        distributorId: distId,
        tripType: 'INBOUND',
      },
      include: {
        supplier: true,
        warehouse: true,
        driver: true,
        purchaseOrders: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Lấy chuyến xe INBOUND kèm PO và PO items phục vụ transaction Nhập kho
   */
  async findInboundTripForReceiving(tripId: string | number | bigint, distributorId: string | number | bigint) {
    const distId = BigInt(distributorId);
    return this.prisma.deliveryTrip.findFirst({
      where: {
        id: BigInt(tripId),
        distributorId: distId,
        tripType: 'INBOUND',
      },
      include: {
        purchaseOrders: {
          include: {
            items: true,
          },
        },
        warehouse: true,
      },
    });
  }
}

// Standalone functions for backward compatibility
export const findInboundDeliveryTrips = async (distributorId: string | number | bigint, filters: InboundTripsFilters = {}) => {
  const repo = new PurchaseReceivingRepository(prisma as any);
  return repo.findInboundDeliveryTrips(distributorId, filters);
};

export const findInboundTripById = async (tripId: string | number | bigint, distributorId: string | number | bigint) => {
  const repo = new PurchaseReceivingRepository(prisma as any);
  return repo.findInboundTripById(tripId, distributorId);
};

export const findInboundTripForReceiving = async (tripId: string | number | bigint, distributorId: string | number | bigint) => {
  const repo = new PurchaseReceivingRepository(prisma as any);
  return repo.findInboundTripForReceiving(tripId, distributorId);
};
