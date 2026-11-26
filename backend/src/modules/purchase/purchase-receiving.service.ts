import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import prisma from '../../prisma/prisma.client';
import {
  PurchaseReceivingRepository,
  InboundTripsFilters,
  findInboundDeliveryTrips,
  findInboundTripById,
  findInboundTripForReceiving,
} from './purchase-receiving.repository';
import { ReceiveTripGoodsDto } from './dto/receive-purchase.dto';
import {
  executeReceiveLinesInTx,
  normalizeAndValidateReceiveLines,
} from './purchase-receiving.helper';

const formatNumber = (num: any): number => Number(num || 0);

@Injectable()
export class PurchaseReceivingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly purchaseReceivingRepo: PurchaseReceivingRepository,
  ) {}

  /**
   * Lấy danh sách các chuyến xe INBOUND (Hàng NCC về NPP) đến ngày giao dự kiến (D+3)
   */
  async getInboundDeliveryTrips(distributorId: string | number | bigint = 1, filters: InboundTripsFilters = {}) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { total, trips, page, limit } = await this.purchaseReceivingRepo.findInboundDeliveryTrips(
      distributorId,
      filters,
    );

    const sanitizedTrips = trips.map((trip: any) => {
      let totalOrderedQty = 0;
      let totalReceivedQty = 0;
      let totalItemsCount = 0;
      const poList: any[] = [];

      (trip.purchaseOrders || []).forEach((po: any) => {
        poList.push({
          id: po.id.toString(),
          poCode: po.poCode,
          status: po.status,
        });

        (po.items || []).forEach((item: any) => {
          totalItemsCount += 1;
          totalOrderedQty += formatNumber(item.quantity);
          totalReceivedQty += formatNumber(item.quantityReceived);
        });
      });

      const expDate = trip.expectedDeliveryDate ? new Date(trip.expectedDeliveryDate) : null;
      const isDue = expDate ? expDate <= today : false;
      const percent =
        totalOrderedQty > 0 ? Math.min(100, Math.round((totalReceivedQty / totalOrderedQty) * 100)) : 0;

      return {
        id: trip.id.toString(),
        tripCode: trip.tripCode,
        tripType: trip.tripType,
        status: trip.status,
        expectedDeliveryDate: trip.expectedDeliveryDate
          ? trip.expectedDeliveryDate.toISOString().slice(0, 10)
          : null,
        isDueForReceiving: isDue,
        createdAt: trip.createdAt,
        supplier: trip.supplier
          ? {
              id: trip.supplier.id.toString(),
              code: trip.supplier.code,
              name: trip.supplier.name,
              phone: trip.supplier.phone,
            }
          : null,
        warehouse: trip.warehouse
          ? {
              id: trip.warehouse.id.toString(),
              code: trip.warehouse.code,
              name: trip.warehouse.name,
            }
          : null,
        driver: trip.driver
          ? {
              id: trip.driver.id.toString(),
              fullName: trip.driver.fullName,
            }
          : null,
        purchaseOrders: poList,
        metrics: {
          totalItemsCount,
          totalOrderedQty,
          totalReceivedQty,
          remainingQty: Math.max(0, totalOrderedQty - totalReceivedQty),
          receivingPercentage: percent,
        },
      };
    });

    return {
      data: sanitizedTrips,
      total,
      page: Number(page),
      limit: Number(limit),
    };
  }

  /**
   * Lấy thông tin chi tiết 1 Chuyến xe hàng về và các mặt hàng cần nhập kho
   */
  async getInboundTripDetail(tripId: string | number | bigint, distributorId: string | number | bigint = 1) {
    const trip = await this.purchaseReceivingRepo.findInboundTripById(tripId, distributorId);

    if (!trip) return null;

    const itemsToReceive: any[] = [];
    (trip.purchaseOrders || []).forEach((po: any) => {
      (po.items || []).forEach((it: any) => {
        const qty = formatNumber(it.quantity);
        const received = formatNumber(it.quantityReceived);
        const remaining = Math.max(0, qty - received);

        itemsToReceive.push({
          purchaseOrderId: po.id.toString(),
          poCode: po.poCode,
          poItemId: it.id.toString(),
          productId: it.productId.toString(),
          productName: it.product?.name || 'Sản phẩm',
          productSku: it.product?.sku || '',
          unit: it.product?.unit || 'THÙNG',
          unitPrice: formatNumber(it.unitPrice),
          quantityOrdered: qty,
          quantityReceived: received,
          quantityRemaining: remaining,
        });
      });
    });

    return {
      id: trip.id.toString(),
      tripCode: trip.tripCode,
      tripType: trip.tripType,
      status: trip.status,
      expectedDeliveryDate: trip.expectedDeliveryDate
        ? trip.expectedDeliveryDate.toISOString().slice(0, 10)
        : null,
      supplier: trip.supplier
        ? {
            id: trip.supplier.id.toString(),
            name: trip.supplier.name,
            code: trip.supplier.code,
          }
        : null,
      warehouse: trip.warehouse
        ? {
            id: trip.warehouse.id.toString(),
            name: trip.warehouse.name,
          }
        : null,
      items: itemsToReceive,
    };
  }

  /**
   * Thực hiện Nhập kho theo Chuyến xe
   */
  async receiveTripGoods({
    tripId,
    distributorId = 1,
    receivedItems = [],
    userId = null,
    notes = null,
  }: ReceiveTripGoodsDto) {
    const trip = await this.purchaseReceivingRepo.findInboundTripForReceiving(tripId, distributorId);

    if (!trip) {
      throw new NotFoundException({ error: 'Không tìm thấy chuyến xe hàng về' });
    }
    if (trip.status === 'CANCELLED') {
      throw new BadRequestException({ error: 'Chuyến xe đã bị hủy, không thể nhập kho' });
    }
    if (trip.status === 'COMPLETED') {
      throw new BadRequestException({ error: 'Chuyến xe này đã hoàn tất nhập kho trước đó' });
    }

    const poItemsMap = new Map<string, any>();
    for (const po of trip.purchaseOrders || []) {
      if (po.status === 'CANCELLED' || po.status === 'DRAFT') continue;
      for (const item of po.items || []) {
        poItemsMap.set(item.id.toString(), {
          ...item,
          purchaseOrderId: po.id,
        });
      }
    }

    if (poItemsMap.size === 0) {
      throw new BadRequestException({ error: 'Chuyến xe chưa có đơn đặt hàng hợp lệ ở trạng thái chờ nhận' });
    }

    // Bổ sung product info nếu repository chưa include product trong findInboundTripForReceiving
    const normalizedLines = normalizeAndValidateReceiveLines(receivedItems, poItemsMap);

    const warehouseId = trip.warehouseId;

    const result = await this.prisma.$transaction(async (tx: any) => {
      const txResult = await executeReceiveLinesInTx({
        tx,
        warehouseId,
        userId,
        lines: normalizedLines,
        poItemsMap,
        historyNotePrefix: `Nhập kho từ chuyến xe ${trip.tripCode}`,
        customNotes: notes,
      });

      return {
        updatedTripStatus: txResult.syncedTripStatus || trip.status,
        processedItemsCount: txResult.processedItems.length,
        processedItems: txResult.processedItems,
      };
    });

    return {
      success: true,
      message: `Đã hoàn tất nhập kho cho chuyến xe ${trip.tripCode}. Tồn kho đã được ghi nhận vào hệ thống.`,
      ...result,
    };
  }
}

// Standalone functions for backward compatibility
export const getInboundDeliveryTripsService = async (distributorId: string | number | bigint = 1, filters: InboundTripsFilters = {}) => {
  const repo = new PurchaseReceivingRepository(prisma as any);
  const service = new PurchaseReceivingService(prisma as any, repo);
  return service.getInboundDeliveryTrips(distributorId, filters);
};

export const getInboundTripDetailService = async (tripId: string | number | bigint, distributorId: string | number | bigint = 1) => {
  const repo = new PurchaseReceivingRepository(prisma as any);
  const service = new PurchaseReceivingService(prisma as any, repo);
  return service.getInboundTripDetail(tripId, distributorId);
};

export const receiveTripGoodsService = async (payload: ReceiveTripGoodsDto) => {
  const repo = new PurchaseReceivingRepository(prisma as any);
  const service = new PurchaseReceivingService(prisma as any, repo);
  return service.receiveTripGoods(payload);
};
