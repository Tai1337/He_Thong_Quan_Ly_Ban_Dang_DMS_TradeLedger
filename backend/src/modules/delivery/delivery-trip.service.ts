import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import prisma from '../../prisma/prisma.client';
import {
  DeliveryTripRepository,
  findDeliveryTrips,
  findDeliveryTripById,
  findAllocatedOrdersForDispatch,
  createDeliveryTripRecord,
  updateDeliveryTripRecord,
} from './delivery-trip.repository';

const DEFAULT_PRODUCT_WEIGHT = 10.0; // Mặc định 10kg/thùng nếu sản phẩm chưa nhập weightKg

const formatNumber = (num: any): number => Number(num || 0);

// Helper sinh mã chuyến xe
const generateTripCode = (): string => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TRIP-${dateStr}-${rand}`;
};

/**
 * Tính tổng trọng lượng (kg) của một đơn hàng dựa trên số lượng thùng và weightKg của sản phẩm
 */
export const calculateOrderWeight = (order: any): number => {
  if (!order || !order.items) return 0;
  return order.items.reduce((total: number, item: any) => {
    const qty = formatNumber(item.quantity);
    const weight = formatNumber(item.product?.weightKg) || DEFAULT_PRODUCT_WEIGHT;
    return total + qty * weight;
  }, 0);
};

export interface GetDeliveryTripsParams {
  distributorId?: string | number | bigint;
  status?: string;
  tripType?: string;
  warehouseId?: string | number | bigint;
  search?: string;
  page?: number | string;
  limit?: number | string;
}

export interface CreateDeliveryTripParams {
  distributorId?: string | number | bigint;
  warehouseId: string | number | bigint;
  driverId?: string | number | bigint;
  licensePlate?: string;
  maxWeightKg?: number | string;
  expectedDeliveryDate?: string | Date;
  notes?: string;
}

export interface DispatchOrdersParams {
  tripId: string | number | bigint;
  distributorId?: string | number | bigint;
  orderIds: (string | number | bigint)[];
  changedById?: string | number | bigint;
}

export interface RemoveOrderParams {
  tripId: string | number | bigint;
  orderId: string | number | bigint;
  distributorId?: string | number | bigint;
  changedById?: string | number | bigint;
  reason?: string;
}

export interface UpdateTripStatusParams {
  tripId: string | number | bigint;
  distributorId?: string | number | bigint;
  toStatus: string;
  changedById?: string | number | bigint;
  notes?: string;
}

export interface ConfirmStopDeliveryParams {
  tripId: string | number | bigint;
  orderId: string | number | bigint;
  distributorId?: string | number | bigint;
  deliveryResult: 'DELIVERED_FULL' | 'DELIVERED_PARTIAL' | 'DELIVERY_FAILED';
  itemsDelivery?: Array<{ itemId: string | number | bigint; deliveredQty: number; failedReason?: string }>;
  notes?: string;
  changedById?: string | number | bigint;
}

export interface CloseDeliveryTripParams {
  tripId: string | number | bigint;
  distributorId?: string | number | bigint;
  codHandedOver?: number;
  closeNotes?: string;
  closedById?: string | number | bigint;
}

@Injectable()
export class DeliveryTripService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly deliveryTripRepo: DeliveryTripRepository,
  ) {}

  /**
   * 1. Lấy danh sách chuyến xe với thông số tải trọng và tỷ lệ lấp đầy
   */
  async getDeliveryTrips({
    distributorId = 1,
    status,
    tripType,
    warehouseId,
    search,
    page = 1,
    limit = 15,
  }: GetDeliveryTripsParams) {
    const { total, trips, page: currPage, limit: currLimit } = await this.deliveryTripRepo.findDeliveryTrips({
      distributorId,
      status,
      tripType,
      warehouseId,
      search,
      page,
      limit,
    });

    const sanitized = trips.map((trip: any) => {
      const maxWeight = formatNumber(trip.maxWeightKg) || 1500;

      let calculatedWeight = 0;
      let totalItems = 0;
      (trip.salesOrders || []).forEach((order: any) => {
        calculatedWeight += calculateOrderWeight(order);
        totalItems += (order.items || []).reduce((sum: number, it: any) => sum + formatNumber(it.quantity), 0);
      });

      const currentWeight = calculatedWeight > 0 ? calculatedWeight : formatNumber(trip.currentWeightKg);
      const loadPercentage = maxWeight > 0 ? Math.min(100, Math.round((currentWeight / maxWeight) * 100)) : 0;
      const isOverweight = currentWeight > maxWeight;

      return {
        id: trip.id.toString(),
        tripCode: trip.tripCode,
        tripType: trip.tripType,
        status: trip.status,
        licensePlate: trip.licensePlate || 'Chưa có biển số',
        maxWeightKg: maxWeight,
        currentWeightKg: Math.round(currentWeight * 10) / 10,
        loadPercentage,
        isOverweight,
        notes: trip.notes || '',
        expectedDeliveryDate: trip.expectedDeliveryDate ? trip.expectedDeliveryDate.toISOString().slice(0, 10) : null,
        departureTime: trip.departureTime ? trip.departureTime.toISOString() : null,
        completedTime: trip.completedTime ? trip.completedTime.toISOString() : null,
        createdAt: trip.createdAt,
        driver: trip.driver
          ? {
              id: trip.driver.id.toString(),
              fullName: trip.driver.fullName,
              phone: trip.driver.phone || '',
            }
          : null,
        warehouse: trip.warehouse
          ? {
              id: trip.warehouse.id.toString(),
              code: trip.warehouse.code,
              name: trip.warehouse.name,
            }
          : null,
        supplier: trip.supplier
          ? {
              id: trip.supplier.id.toString(),
              code: trip.supplier.code,
              name: trip.supplier.name,
            }
          : null,
        ordersCount: (trip.salesOrders || []).length + (trip.purchaseOrders || []).length,
        totalPackagesCount: totalItems,
      };
    });

    return {
      data: sanitized,
      total,
      page: currPage,
      limit: currLimit,
    };
  }

  /**
   * 2. Lấy chi tiết chuyến xe kèm danh sách đơn hàng và thông số lô hàng
   */
  async getDeliveryTripDetail(tripId: string | number | bigint, distributorId: string | number | bigint = 1) {
    const trip = await this.deliveryTripRepo.findDeliveryTripById(tripId, distributorId);
    if (!trip) return null;

    const maxWeight = formatNumber(trip.maxWeightKg) || 1500;
    let totalCalculatedWeight = 0;
    let totalPackages = 0;

    const orders = (trip.salesOrders || []).map((order: any) => {
      const orderWeight = calculateOrderWeight(order);
      totalCalculatedWeight += orderWeight;

      const items = (order.items || []).map((it: any) => {
        const itemQty = formatNumber(it.quantity);
        totalPackages += itemQty;
        const unitWeight = formatNumber(it.product?.weightKg) || DEFAULT_PRODUCT_WEIGHT;

        const lotAllocations = (it.allocations || []).map((alloc: any) => ({
          id: alloc.id.toString(),
          lotNumber: alloc.stockLot?.lotNumber || 'N/A',
          quantityAllocated: formatNumber(alloc.quantity),
          expiryDate: alloc.stockLot?.expiryDate ? alloc.stockLot.expiryDate.toISOString().slice(0, 10) : null,
          locationCode: alloc.stockLot?.locationCode || 'Mặc định',
        }));

        return {
          id: it.id.toString(),
          productId: it.productId.toString(),
          productName: it.product?.name || 'Sản phẩm',
          productSku: it.product?.sku || '',
          unit: it.product?.unit || 'THÙNG',
          quantity: itemQty,
          deliveredQuantity: it.deliveredQuantity !== null ? formatNumber(it.deliveredQuantity) : null,
          failedQuantity: it.failedQuantity !== null ? formatNumber(it.failedQuantity) : 0,
          unitPrice: formatNumber(it.unitPrice),
          unitWeightKg: unitWeight,
          totalWeightKg: Math.round(itemQty * unitWeight * 10) / 10,
          allocations: lotAllocations,
        };
      });

      return {
        id: order.id.toString(),
        orderCode: order.orderCode,
        status: order.status,
        deliveryNotes: order.deliveryNotes || '',
        orderWeightKg: Math.round(orderWeight * 10) / 10,
        retailer: order.retailer
          ? {
              id: order.retailer.id.toString(),
              name: order.retailer.name,
              code: order.retailer.code,
              address: order.retailer.address || '',
              phone: order.retailer.phone || '',
            }
          : null,
        items,
      };
    });

    const currentWeight = Math.round(totalCalculatedWeight * 10) / 10;
    const loadPercentage = maxWeight > 0 ? Math.min(100, Math.round((currentWeight / maxWeight) * 100)) : 0;

    return {
      id: trip.id.toString(),
      tripCode: trip.tripCode,
      tripType: trip.tripType,
      status: trip.status,
      licensePlate: trip.licensePlate || '',
      maxWeightKg: maxWeight,
      currentWeightKg: currentWeight,
      loadPercentage,
      isOverweight: currentWeight > maxWeight,
      notes: trip.notes || '',
      expectedDeliveryDate: trip.expectedDeliveryDate ? trip.expectedDeliveryDate.toISOString().slice(0, 10) : null,
      departureTime: trip.departureTime ? trip.departureTime.toISOString() : null,
      completedTime: trip.completedTime ? trip.completedTime.toISOString() : null,
      closedTime: trip.closedTime ? trip.closedTime.toISOString() : null,
      totalCodCollected: formatNumber(trip.totalCodCollected),
      codHandedOver: formatNumber(trip.codHandedOver),
      closeNotes: trip.closeNotes || '',
      createdAt: trip.createdAt,
      driver: trip.driver
        ? {
            id: trip.driver.id.toString(),
            fullName: trip.driver.fullName,
            phone: trip.driver.phone || '',
          }
        : null,
      warehouse: trip.warehouse
        ? {
            id: trip.warehouse.id.toString(),
            code: trip.warehouse.code,
            name: trip.warehouse.name,
          }
        : null,
      orders,
      summary: {
        totalOrders: orders.length,
        totalPackages,
        currentWeightKg: currentWeight,
        maxWeightKg: maxWeight,
        loadPercentage,
        remainingCapacityKg: Math.max(0, Math.round((maxWeight - currentWeight) * 10) / 10),
      },
    };
  }

  /**
   * 3. Lấy danh sách các đơn hàng ALLOCATED sẵn sàng xếp lên xe
   */
  async getDispatchableOrders(distributorId: string | number | bigint = 1, warehouseId: string | number | bigint = null) {
    const orders = await this.deliveryTripRepo.findAllocatedOrdersForDispatch(distributorId, warehouseId);

    return orders.map((order: any) => {
      const orderWeight = calculateOrderWeight(order);
      const totalPackages = (order.items || []).reduce((acc: number, it: any) => acc + formatNumber(it.quantity), 0);

      const lotSummarySet = new Set();
      (order.items || []).forEach((it: any) => {
        (it.allocations || []).forEach((alloc: any) => {
          if (alloc.stockLot?.lotNumber) {
            lotSummarySet.add(alloc.stockLot.lotNumber);
          }
        });
      });

      return {
        id: order.id.toString(),
        orderCode: order.orderCode,
        status: order.status,
        warehouseId: order.warehouseId.toString(),
        warehouseName: order.warehouse?.name || '',
        retailer: {
          id: order.retailer?.id ? order.retailer.id.toString() : '',
          code: order.retailer?.code || '',
          name: order.retailer?.name || 'Khách lẻ',
          address: order.retailer?.address || '',
          phone: order.retailer?.phone || '',
        },
        totalPackages,
        orderWeightKg: Math.round(orderWeight * 10) / 10,
        lotNumbers: Array.from(lotSummarySet),
        createdAt: order.createdAt,
      };
    });
  }

  /**
   * 4. Tạo chuyến xe OUTBOUND mới
   */
  async createDeliveryTrip({
    distributorId = 1,
    warehouseId,
    driverId,
    licensePlate,
    maxWeightKg = 1500,
    expectedDeliveryDate,
    notes,
  }: CreateDeliveryTripParams) {
    if (!warehouseId) {
      throw new Error('Vui lòng chọn kho xuất hàng');
    }

    const tripCode = generateTripCode();
    const maxWeight = Number(maxWeightKg) || 1500;

    const newTrip = await this.deliveryTripRepo.createDeliveryTripRecord({
      tripCode,
      tripType: 'OUTBOUND',
      distributorId: BigInt(distributorId),
      warehouseId: BigInt(warehouseId),
      driverId: driverId ? BigInt(driverId) : null,
      licensePlate: licensePlate ? licensePlate.trim().toUpperCase() : null,
      maxWeightKg: maxWeight,
      currentWeightKg: 0,
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : new Date(),
      status: 'WAITING_CONFIRM',
      notes: notes ? notes.trim() : null,
    });

    return {
      id: newTrip.id.toString(),
      tripCode: newTrip.tripCode,
      message: `Đã khởi tạo chuyến xe ${newTrip.tripCode} thành công`,
    };
  }

  /**
   * 5. Đưa các đơn hàng lên chuyến xe
   */
  async dispatchOrdersToTrip({ tripId, distributorId = 1, orderIds = [], changedById = null }: DispatchOrdersParams) {
    if (!orderIds || orderIds.length === 0) {
      throw new Error('Vui lòng chọn ít nhất 1 đơn hàng để xếp lên xe');
    }

    return this.prismaService.$transaction(async (tx: any) => {
      const trip = await tx.deliveryTrip.findFirst({
        where: {
          id: BigInt(tripId),
          distributorId: BigInt(distributorId),
        },
        include: {
          driver: true,
          salesOrders: {
            include: {
              items: {
                include: { product: true },
              },
            },
          },
        },
      });

      if (!trip) throw new Error('Không tìm thấy chuyến xe vận chuyển');
      if (trip.status === 'SHIPPING') {
        throw new Error('Chuyến xe đang trên đường giao hàng (SHIPPING), không thể xếp thêm đơn');
      }
      if (trip.status === 'COMPLETED' || trip.status === 'CLOSED' || trip.status === 'CANCELLED') {
        throw new Error(`Chuyến xe đã ở trạng thái ${trip.status}, không thể xếp thêm đơn hàng`);
      }

      let existingWeight = 0;
      (trip.salesOrders || []).forEach((o: any) => {
        existingWeight += calculateOrderWeight(o);
      });

      const ordersToDispatch = await tx.salesOrder.findMany({
        where: {
          id: { in: orderIds.map((id) => BigInt(id)) },
          distributorId: BigInt(distributorId),
        },
        include: {
          retailer: true,
          items: {
            include: {
              product: true,
              allocations: {
                include: { stockLot: true },
              },
            },
          },
        },
      });

      if (ordersToDispatch.length !== orderIds.length) {
        throw new Error('Một số đơn hàng được chọn không hợp lệ hoặc không thuộc NPP này');
      }

      let addedWeight = 0;
      for (const order of ordersToDispatch) {
        if (order.warehouseId.toString() !== trip.warehouseId.toString()) {
          throw new Error(`Đơn hàng ${order.orderCode} thuộc kho khác với kho của chuyến xe`);
        }
        if (order.status !== 'ALLOCATED') {
          throw new Error(
            `Đơn hàng ${order.orderCode} không ở trạng thái "Chờ giao" (ALLOCATED). Trạng thái: ${order.status}`,
          );
        }
        if (order.deliveryTripId && order.deliveryTripId.toString() !== trip.id.toString()) {
          throw new Error(`Đơn hàng ${order.orderCode} đã được gán vào chuyến xe khác`);
        }

        addedWeight += calculateOrderWeight(order);
      }

      const totalWeightAfterAdd = existingWeight + addedWeight;
      const maxCapacity = formatNumber(trip.maxWeightKg) || 1500;

      if (totalWeightAfterAdd > maxCapacity * 1.1) {
        throw new Error(
          `Xếp đơn không thành công: Tổng trọng lượng (${Math.round(totalWeightAfterAdd)} kg) vượt quá tải trọng xe cho phép (${maxCapacity} kg). Vui lòng chọn xe tải trọng lớn hơn hoặc giảm bớt đơn hàng.`,
        );
      }

      for (const order of ordersToDispatch) {
        await tx.salesOrder.update({
          where: { id: order.id },
          data: {
            deliveryTripId: trip.id,
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            salesOrderId: order.id,
            fromStatus: 'ALLOCATED',
            toStatus: 'ALLOCATED',
            changedById: changedById ? BigInt(changedById) : null,
            notes: `Đã xếp lên xe tải [${trip.licensePlate || trip.tripCode}] - Trọng lượng đơn: ${Math.round(calculateOrderWeight(order))} kg.`,
          },
        });
      }

      await tx.deliveryTrip.update({
        where: { id: trip.id },
        data: {
          currentWeightKg: totalWeightAfterAdd,
        },
      });

      return {
        success: true,
        message: `Đã xếp ${ordersToDispatch.length} đơn hàng lên chuyến xe ${trip.tripCode}. Tổng tải trọng hiện tại: ${Math.round(totalWeightAfterAdd)} / ${maxCapacity} kg.`,
        currentWeightKg: Math.round(totalWeightAfterAdd),
        maxWeightKg: maxCapacity,
      };
    });
  }

  /**
   * 6. Gỡ đơn hàng khỏi chuyến xe
   */
  async removeOrderFromTrip({
    tripId,
    orderId,
    distributorId = 1,
    changedById = null,
    reason = 'Điều chuyển sang chuyến xe khác',
  }: RemoveOrderParams) {
    return this.prismaService.$transaction(async (tx: any) => {
      const trip = await tx.deliveryTrip.findFirst({
        where: {
          id: BigInt(tripId),
          distributorId: BigInt(distributorId),
        },
      });

      if (!trip) throw new Error('Không tìm thấy chuyến xe vận chuyển');
      if (trip.status === 'SHIPPING') {
        throw new Error('Chuyến xe đang trên đường giao hàng (SHIPPING), không thể gỡ đơn hàng ra khỏi xe!');
      }
      if (trip.status === 'COMPLETED' || trip.status === 'CLOSED') {
        throw new Error('Chuyến xe đã hoàn tất/đóng, không thể gỡ đơn hàng!');
      }

      const order = await tx.salesOrder.findFirst({
        where: {
          id: BigInt(orderId),
          distributorId: BigInt(distributorId),
          deliveryTripId: BigInt(tripId),
        },
        include: {
          deliveryTrip: true,
          items: { include: { product: true } },
        },
      });

      if (!order) throw new Error('Không tìm thấy đơn hàng trong chuyến xe này');
      if (order.status === 'SHIPPED') {
        throw new Error('Đơn hàng đang trong trạng thái vận chuyển (SHIPPED), không thể gỡ khỏi chuyến xe!');
      }
      if (order.status === 'DELIVERED' || order.status === 'COMPLETED' || order.status === 'DELIVERY_FAILED') {
        throw new Error(`Đơn hàng đã hoàn tất (${order.status}), không thể gỡ khỏi chuyến xe`);
      }

      const orderWeight = calculateOrderWeight(order);

      await tx.salesOrder.update({
        where: { id: order.id },
        data: {
          deliveryTripId: null,
          status: 'ALLOCATED',
        },
      });

      const newWeight = Math.max(0, formatNumber(trip.currentWeightKg) - orderWeight);
      await tx.deliveryTrip.update({
        where: { id: trip.id },
        data: { currentWeightKg: newWeight },
      });

      await tx.orderStatusHistory.create({
        data: {
          salesOrderId: order.id,
          fromStatus: order.status,
          toStatus: 'ALLOCATED',
          changedById: changedById ? BigInt(changedById) : null,
          reason,
          notes: `Gỡ khỏi chuyến xe [${trip.tripCode}], giảm tải ${Math.round(orderWeight)} kg.`,
        },
      });

      return {
        success: true,
        message: `Đã gỡ đơn hàng ${order.orderCode} khỏi chuyến xe`,
        newWeightKg: Math.round(newWeight),
      };
    });
  }

  /**
   * 7. Cập nhật trạng thái chuyến xe
   */
  async updateTripStatus({ tripId, distributorId = 1, toStatus, changedById = null, notes = '' }: UpdateTripStatusParams) {
    return this.prismaService.$transaction(async (tx: any) => {
      const trip = await tx.deliveryTrip.findFirst({
        where: {
          id: BigInt(tripId),
          distributorId: BigInt(distributorId),
        },
        include: {
          salesOrders: true,
        },
      });

      if (!trip) throw new Error('Không tìm thấy chuyến xe vận chuyển');

      const updateData: any = { status: toStatus };

      if (toStatus === 'WAITING_SHIP') {
        if (trip.salesOrders.length === 0) {
          throw new Error('Chuyến xe chưa có đơn hàng nào, vui lòng xếp đơn trước khi xác nhận xe');
        }
      }

      if (toStatus === 'SHIPPING') {
        if (trip.salesOrders.length === 0) {
          throw new Error('Chuyến xe chưa có đơn hàng nào, không thể xuất bến');
        }
        updateData.departureTime = new Date();

        for (const order of trip.salesOrders) {
          if (order.status === 'ALLOCATED') {
            await tx.salesOrder.update({
              where: { id: order.id },
              data: { status: 'SHIPPED' },
            });

            await tx.orderStatusHistory.create({
              data: {
                salesOrderId: order.id,
                fromStatus: 'ALLOCATED',
                toStatus: 'SHIPPED',
                changedById: changedById ? BigInt(changedById) : null,
                notes: `Chuyến xe [${trip.tripCode}] đã xuất bến. Đang vận chuyển đến điểm giao.`,
              },
            });
          }
        }
      }

      if (toStatus === 'COMPLETED') {
        updateData.completedTime = new Date();

        const pendingShippedOrders = trip.salesOrders.filter((o: any) => o.status === 'SHIPPED');
        for (const order of pendingShippedOrders) {
          await tx.salesOrder.update({
            where: { id: order.id },
            data: { status: 'DELIVERED', deliveryNotes: 'Xác nhận hoàn tất theo chuyến xe' },
          });

          await tx.orderStatusHistory.create({
            data: {
              salesOrderId: order.id,
              fromStatus: 'SHIPPED',
              toStatus: 'DELIVERED',
              changedById: changedById ? BigInt(changedById) : null,
              notes: `Chuyến xe [${trip.tripCode}] hoàn tất. Đơn hàng tự động xác nhận đã giao.`,
            },
          });
        }
      }

      if (toStatus === 'CANCELLED') {
        if (trip.status === 'SHIPPING') {
          throw new Error('Xe đang trên đường giao hàng (SHIPPING), không thể hủy chuyến trực tiếp');
        }
        for (const order of trip.salesOrders) {
          await tx.salesOrder.update({
            where: { id: order.id },
            data: { deliveryTripId: null, status: 'ALLOCATED' },
          });

          await tx.orderStatusHistory.create({
            data: {
              salesOrderId: order.id,
              fromStatus: order.status,
              toStatus: 'ALLOCATED',
              changedById: changedById ? BigInt(changedById) : null,
              reason: 'Hủy chuyến xe',
              notes: `Chuyến xe [${trip.tripCode}] bị hủy. Hoàn đơn về hàng đợi bốc xếp.`,
            },
          });
        }
        updateData.currentWeightKg = 0;
      }

      const updated = await tx.deliveryTrip.update({
        where: { id: trip.id },
        data: updateData,
      });

      return {
        success: true,
        message: `Đã chuyển trạng thái chuyến xe sang ${toStatus}`,
        tripStatus: updated.status,
      };
    });
  }

  /**
   * 8. Lập Bảng kê bốc hàng & Số Lô
   */
  async getTripCargoManifest(tripId: string | number | bigint, distributorId: string | number | bigint = 1) {
    const trip = await this.deliveryTripRepo.findDeliveryTripById(tripId, distributorId);
    if (!trip) return null;

    const lotMap = new Map();
    const retailerStops: any[] = [];

    (trip.salesOrders || []).forEach((order: any, index: number) => {
      const itemsFormatted = (order.items || []).map((it: any) => ({
        id: it.id.toString(),
        productId: it.productId.toString(),
        productName: it.product?.name || 'Sản phẩm',
        productSku: it.product?.sku || '',
        unit: it.product?.unit || 'THÙNG',
        quantity: formatNumber(it.quantity),
        deliveredQuantity: it.deliveredQuantity !== null ? formatNumber(it.deliveredQuantity) : null,
        failedQuantity: it.failedQuantity !== null ? formatNumber(it.failedQuantity) : 0,
        unitPrice: formatNumber(it.unitPrice),
      }));

      retailerStops.push({
        stopNumber: index + 1,
        orderId: order.id.toString(),
        orderCode: order.orderCode,
        status: order.status,
        deliveryNotes: order.deliveryNotes || '',
        retailerName: order.retailer?.name || 'Khách lẻ',
        address: order.retailer?.address || '',
        phone: order.retailer?.phone || '',
        itemsCount: itemsFormatted.length,
        orderWeightKg: calculateOrderWeight(order),
        items: itemsFormatted,
      });

      (order.items || []).forEach((item: any) => {
        const p = item.product;
        (item.allocations || []).forEach((alloc: any) => {
          const lot = alloc.stockLot;
          const key = `${p.id}_${lot ? lot.lotNumber : 'DEFAULT'}`;

          if (!lotMap.has(key)) {
            lotMap.set(key, {
              productId: p.id.toString(),
              productSku: p.sku,
              productName: p.name,
              unit: p.unit || 'THÙNG',
              lotNumber: lot?.lotNumber || 'Lô mặc định',
              expiryDate: lot?.expiryDate ? lot.expiryDate.toISOString().slice(0, 10) : 'N/A',
              locationCode: lot?.locationCode || 'KHO-A',
              locationName: lot?.locationName || 'Dãy kệ 01',
              totalQuantity: 0,
              unitWeightKg: formatNumber(p.weightKg) || DEFAULT_PRODUCT_WEIGHT,
            });
          }

          const entry = lotMap.get(key);
          entry.totalQuantity += formatNumber(alloc.quantity);
        });
      });
    });

    const manifestItems = Array.from(lotMap.values()).map((item: any) => ({
      ...item,
      totalWeightKg: Math.round(item.totalQuantity * item.unitWeightKg * 10) / 10,
    }));

    const totalTripWeight = manifestItems.reduce((acc: number, it: any) => acc + it.totalWeightKg, 0);
    const totalPackages = manifestItems.reduce((acc: number, it: any) => acc + it.totalQuantity, 0);

    return {
      tripId: trip.id.toString(),
      tripCode: trip.tripCode,
      licensePlate: trip.licensePlate || '',
      driverName: trip.driver?.fullName || 'Chưa gán',
      driverPhone: trip.driver?.phone || '',
      warehouseName: trip.warehouse?.name || '',
      departureTime: trip.departureTime ? trip.departureTime.toISOString() : null,
      totalTripWeightKg: Math.round(totalTripWeight * 10) / 10,
      maxWeightKg: formatNumber(trip.maxWeightKg),
      totalPackages,
      retailerStops,
      cargoByLot: manifestItems,
    };
  }

  /**
   * 9. Xác nhận kết quả giao hàng tại từng điểm
   */
  async confirmStopDelivery({
    tripId,
    orderId,
    distributorId = 1,
    deliveryResult,
    itemsDelivery = [],
    notes = '',
    changedById = null,
  }: ConfirmStopDeliveryParams) {
    if (!tripId || !orderId) {
      throw new Error('tripId và orderId là bắt buộc');
    }

    if (!['DELIVERED_FULL', 'DELIVERED_PARTIAL', 'DELIVERY_FAILED'].includes(deliveryResult)) {
      throw new Error('Kết quả giao hàng không hợp lệ (phải là DELIVERED_FULL, DELIVERED_PARTIAL hoặc DELIVERY_FAILED)');
    }

    return this.prismaService.$transaction(async (tx: any) => {
      const trip = await tx.deliveryTrip.findFirst({
        where: {
          id: BigInt(tripId),
          distributorId: BigInt(distributorId),
        },
        include: {
          salesOrders: {
            select: { id: true, status: true },
          },
        },
      });

      if (!trip) throw new Error('Không tìm thấy chuyến xe vận chuyển');
      if (trip.status !== 'SHIPPING') {
        throw new Error(
          `Chuyến xe đang ở trạng thái [${trip.status}], chỉ có thể xác nhận giao hàng khi xe đang ở trạng thái "Đang giao hàng" (SHIPPING)`,
        );
      }

      const order = await tx.salesOrder.findFirst({
        where: {
          id: BigInt(orderId),
          distributorId: BigInt(distributorId),
          deliveryTripId: trip.id,
        },
        include: {
          retailer: true,
          items: {
            include: {
              product: true,
              allocations: {
                include: { stockLot: true },
              },
            },
          },
        },
      });

      if (!order) throw new Error('Không tìm thấy đơn hàng trên chuyến xe này');
      if (order.status !== 'SHIPPED') {
        throw new Error(
          `Đơn hàng hiện ở trạng thái [${order.status}], không thể xác nhận giao. Chỉ đơn hàng đang "SHIPPED" mới được xác nhận.`,
        );
      }

      if (deliveryResult === 'DELIVERED_FULL') {
        for (const item of order.items) {
          const itemQty = formatNumber(item.quantity);

          await tx.salesOrderItem.update({
            where: { id: item.id },
            data: {
              deliveredQuantity: itemQty,
              failedQuantity: 0,
            },
          });

          for (const alloc of item.allocations || []) {
            const allocQty = formatNumber(alloc.quantity);

            await tx.stockBalance.update({
              where: { lotId: alloc.lotId },
              data: {
                quantityOnHand: { decrement: allocQty },
                quantityReserved: { decrement: allocQty },
              },
            });

            await tx.inventoryTransaction.create({
              data: {
                transactionCode: `TXN-OUT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
                direction: 'OUT',
                lotId: alloc.lotId,
                warehouseId: order.warehouseId,
                quantity: allocQty,
                unitPrice: item.unitPrice,
                referenceType: 'SALES_ORDER',
                referenceId: order.id,
                createdById: changedById ? BigInt(changedById) : null,
              },
            });
          }
        }

        await tx.salesOrder.update({
          where: { id: order.id },
          data: {
            status: 'DELIVERED',
            deliveryNotes: notes || 'Giao hàng thành công đủ 100%',
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            salesOrderId: order.id,
            fromStatus: 'SHIPPED',
            toStatus: 'DELIVERED',
            changedById: changedById ? BigInt(changedById) : null,
            notes: notes ? `Giao đủ 100%: ${notes}` : 'Đại lý đã nhận đủ hàng 100% thành công.',
          },
        });
      } else if (deliveryResult === 'DELIVERED_PARTIAL') {
        let totalDeliveredItemsCount = 0;
        let totalFailedItemsCount = 0;

        for (const item of order.items) {
          const orderedQty = formatNumber(item.quantity);
          const inputItem = (itemsDelivery || []).find((it: any) => it.itemId.toString() === item.id.toString());
          let deliveredQty = inputItem !== undefined ? Math.max(0, formatNumber(inputItem.deliveredQty)) : orderedQty;
          if (deliveredQty > orderedQty) deliveredQty = orderedQty;
          const failedQty = Math.max(0, Math.round((orderedQty - deliveredQty) * 100) / 100);

          totalDeliveredItemsCount += deliveredQty;
          totalFailedItemsCount += failedQty;

          await tx.salesOrderItem.update({
            where: { id: item.id },
            data: {
              deliveredQuantity: deliveredQty,
              failedQuantity: failedQty,
            },
          });

          let remainingToDeduct = deliveredQty;
          for (const alloc of item.allocations || []) {
            const allocQty = formatNumber(alloc.quantity);
            const allocDelivered = Math.min(remainingToDeduct, allocQty);
            remainingToDeduct = Math.max(0, remainingToDeduct - allocDelivered);

            const balanceUpdate: any = {
              quantityReserved: { decrement: allocQty },
            };
            if (allocDelivered > 0) {
              balanceUpdate.quantityOnHand = { decrement: allocDelivered };
            }

            await tx.stockBalance.update({
              where: { lotId: alloc.lotId },
              data: balanceUpdate,
            });

            if (allocDelivered > 0) {
              await tx.inventoryTransaction.create({
                data: {
                  transactionCode: `TXN-OUT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
                  direction: 'OUT',
                  lotId: alloc.lotId,
                  warehouseId: order.warehouseId,
                  quantity: allocDelivered,
                  unitPrice: item.unitPrice,
                  referenceType: 'SALES_ORDER',
                  referenceId: order.id,
                  createdById: changedById ? BigInt(changedById) : null,
                },
              });
            }
          }
        }

        const noteContent = `Giao một phần (Thực giao: ${totalDeliveredItemsCount} thùng, rớt: ${totalFailedItemsCount} thùng). ${notes ? `Lý do: ${notes}` : ''}`;

        await tx.salesOrder.update({
          where: { id: order.id },
          data: {
            status: 'DELIVERED',
            deliveryNotes: noteContent,
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            salesOrderId: order.id,
            fromStatus: 'SHIPPED',
            toStatus: 'DELIVERED',
            changedById: changedById ? BigInt(changedById) : null,
            reason: 'Giao một phần (đơn rớt mặt hàng)',
            notes: `${noteContent}. Số lượng rớt đã được hoàn về tồn khả dụng trong kho.`,
          },
        });
      } else if (deliveryResult === 'DELIVERY_FAILED') {
        for (const item of order.items) {
          const itemQty = formatNumber(item.quantity);

          await tx.salesOrderItem.update({
            where: { id: item.id },
            data: {
              deliveredQuantity: 0,
              failedQuantity: itemQty,
            },
          });

          for (const alloc of item.allocations || []) {
            const allocQty = formatNumber(alloc.quantity);

            await tx.stockBalance.update({
              where: { lotId: alloc.lotId },
              data: {
                quantityReserved: { decrement: allocQty },
              },
            });
          }
        }

        const failureNote = `Giao thất bại: ${notes || 'Đại lý từ chối nhận hoặc không liên lạc được'}`;

        await tx.salesOrder.update({
          where: { id: order.id },
          data: {
            status: 'DELIVERY_FAILED',
            deliveryNotes: failureNote,
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            salesOrderId: order.id,
            fromStatus: 'SHIPPED',
            toStatus: 'DELIVERY_FAILED',
            changedById: changedById ? BigInt(changedById) : null,
            reason: notes || 'Khách không nhận hàng',
            notes: `${failureNote}. Toàn bộ hàng hóa trên xe được mang trả về kho, đã giải phóng tồn kho giữ chỗ.`,
          },
        });
      }

      const allOrdersOnTrip = await tx.salesOrder.findMany({
        where: { deliveryTripId: trip.id },
        select: { id: true, status: true },
      });

      const pendingShippedCount = allOrdersOnTrip.filter((o: any) => o.status === 'SHIPPED').length;
      let tripCompleted = false;

      if (pendingShippedCount === 0) {
        await tx.deliveryTrip.update({
          where: { id: trip.id },
          data: {
            status: 'COMPLETED',
            completedTime: new Date(),
          },
        });
        tripCompleted = true;
      }

      return {
        success: true,
        message: `Đã xác nhận kết quả giao hàng cho đơn ${order.orderCode} (${deliveryResult})`,
        orderStatus: deliveryResult === 'DELIVERY_FAILED' ? 'DELIVERY_FAILED' : 'DELIVERED',
        tripCompleted,
        remainingPendingStops: pendingShippedCount,
      };
    });
  }

  /**
   * 10. Lấy bảng tổng hợp hàng rớt & quyết toán COD
   */
  async getTripReturnSummary(tripId: string | number | bigint, distributorId: string | number | bigint = 1) {
    const trip = await this.deliveryTripRepo.findDeliveryTripById(tripId, distributorId);
    if (!trip) throw new Error('Không tìm thấy chuyến xe vận chuyển');

    let totalOrderValueOriginal = 0;
    let totalCodExpected = 0;
    let totalDroppedValue = 0;
    let totalReturnedPackages = 0;

    const returnedItems: any[] = [];
    const skuSummaryMap = new Map();

    (trip.salesOrders || []).forEach((order: any) => {
      (order.items || []).forEach((item: any) => {
        const unitPrice = formatNumber(item.unitPrice);
        const orderedQty = formatNumber(item.quantity);
        const deliveredQty = item.deliveredQuantity !== null ? formatNumber(item.deliveredQuantity) : orderedQty;
        const failedQty = formatNumber(item.failedQuantity) || Math.max(0, orderedQty - deliveredQty);

        const orderLineTotal = orderedQty * unitPrice;
        const actualLineTotal = deliveredQty * unitPrice;
        const droppedLineTotal = failedQty * unitPrice;

        totalOrderValueOriginal += orderLineTotal;
        totalCodExpected += actualLineTotal;
        totalDroppedValue += droppedLineTotal;

        if (failedQty > 0 || order.status === 'DELIVERY_FAILED') {
          totalReturnedPackages += failedQty;

          const returnItemObj = {
            itemId: item.id.toString(),
            orderId: order.id.toString(),
            orderCode: order.orderCode,
            retailerName: order.retailer?.name || 'Khách lẻ',
            retailerPhone: order.retailer?.phone || '',
            productId: item.productId.toString(),
            productSku: item.product?.sku || '',
            productName: item.product?.name || 'Sản phẩm',
            unit: item.product?.unit || 'THÙNG',
            orderedQty,
            deliveredQty,
            failedQty,
            unitPrice,
            droppedValue: droppedLineTotal,
            reason: order.deliveryNotes || 'Khách không nhận',
          };

          returnedItems.push(returnItemObj);

          const skuKey = item.productId.toString();
          if (!skuSummaryMap.has(skuKey)) {
            skuSummaryMap.set(skuKey, {
              productId: skuKey,
              productSku: item.product?.sku || '',
              productName: item.product?.name || 'Sản phẩm',
              unit: item.product?.unit || 'THÙNG',
              totalReturnedQty: 0,
              totalReturnedValue: 0,
            });
          }
          const skuEntry = skuSummaryMap.get(skuKey);
          skuEntry.totalReturnedQty += failedQty;
          skuEntry.totalReturnedValue += droppedLineTotal;
        }
      });
    });

    return {
      trip: {
        id: trip.id.toString(),
        tripCode: trip.tripCode,
        licensePlate: trip.licensePlate || '',
        status: trip.status,
        driverName: trip.driver?.fullName || 'Chưa phân công',
        driverPhone: trip.driver?.phone || '',
        warehouseName: trip.warehouse?.name || '',
        departureTime: trip.departureTime ? trip.departureTime.toISOString() : null,
        completedTime: trip.completedTime ? trip.completedTime.toISOString() : null,
        closedTime: trip.closedTime ? trip.closedTime.toISOString() : null,
        totalCodCollected: formatNumber(trip.totalCodCollected),
        codHandedOver: formatNumber(trip.codHandedOver),
        closeNotes: trip.closeNotes || '',
      },
      returnedItems,
      returnedItemsSummaryBySku: Array.from(skuSummaryMap.values()),
      totalReturnedPackages: Math.round(totalReturnedPackages * 10) / 10,
      totalReturnedValue: Math.round(totalDroppedValue),
      codSummary: {
        totalOrderValueOriginal: Math.round(totalOrderValueOriginal),
        totalDroppedValue: Math.round(totalDroppedValue),
        totalCodExpected: Math.round(totalCodExpected),
        codHandedOver: formatNumber(trip.codHandedOver) || Math.round(totalCodExpected),
      },
    };
  }

  /**
   * 11. Bàn giao hàng rớt về kho & Quyết toán COD để Đóng chuyến xe
   */
  async closeDeliveryTrip({
    tripId,
    distributorId = 1,
    codHandedOver,
    closeNotes = '',
    closedById = null,
  }: CloseDeliveryTripParams) {
    return this.prismaService.$transaction(async (tx: any) => {
      const trip = await tx.deliveryTrip.findFirst({
        where: {
          id: BigInt(tripId),
          distributorId: BigInt(distributorId),
        },
        include: {
          salesOrders: {
            include: {
              items: true,
            },
          },
        },
      });

      if (!trip) throw new Error('Không tìm thấy chuyến xe vận chuyển');
      if (trip.status === 'CLOSED') {
        throw new Error('Chuyến xe này đã được đóng (CLOSED) trước đó!');
      }
      if (trip.status !== 'COMPLETED') {
        throw new Error(
          `Chuyến xe hiện ở trạng thái [${trip.status}]. Chỉ chuyến xe đã hoàn tất giao hàng (COMPLETED) mới được làm thủ tục hạ tải & đóng chuyến!`,
        );
      }

      let calculatedCod = 0;
      (trip.salesOrders || []).forEach((order: any) => {
        if (order.status === 'DELIVERED') {
          (order.items || []).forEach((it: any) => {
            const qty = it.deliveredQuantity !== null ? formatNumber(it.deliveredQuantity) : formatNumber(it.quantity);
            calculatedCod += qty * formatNumber(it.unitPrice);
          });
        }
      });

      const finalHandedOver = codHandedOver !== undefined && codHandedOver !== null ? Number(codHandedOver) : calculatedCod;

      const updatedTrip = await tx.deliveryTrip.update({
        where: { id: trip.id },
        data: {
          status: 'CLOSED',
          closedTime: new Date(),
          closedById: closedById ? BigInt(closedById) : null,
          totalCodCollected: calculatedCod,
          codHandedOver: finalHandedOver,
          closeNotes: closeNotes
            ? closeNotes.trim()
            : 'Đã hoàn tất bàn giao hàng rớt nhập kho và quyết toán tiền COD đóng chuyến.',
        },
      });

      return {
        success: true,
        message: `Đã hoàn tất bàn giao và đóng chuyến xe ${trip.tripCode} (CLOSED)`,
        tripStatus: updatedTrip.status,
        closedTime: updatedTrip.closedTime,
        totalCodCollected: calculatedCod,
        codHandedOver: finalHandedOver,
      };
    });
  }
}

// Standalone functions for backward compatibility with existing callers
export const getDeliveryTripsService = async (params: GetDeliveryTripsParams) => {
  const repo = new DeliveryTripRepository(prisma as any);
  const service = new DeliveryTripService(prisma as any, repo);
  return service.getDeliveryTrips(params);
};

export const getDeliveryTripDetailService = async (tripId: string | number | bigint, distributorId: string | number | bigint = 1) => {
  const repo = new DeliveryTripRepository(prisma as any);
  const service = new DeliveryTripService(prisma as any, repo);
  return service.getDeliveryTripDetail(tripId, distributorId);
};

export const getDispatchableOrdersService = async (distributorId: string | number | bigint = 1, warehouseId: string | number | bigint = null) => {
  const repo = new DeliveryTripRepository(prisma as any);
  const service = new DeliveryTripService(prisma as any, repo);
  return service.getDispatchableOrders(distributorId, warehouseId);
};

export const createDeliveryTripService = async (params: CreateDeliveryTripParams) => {
  const repo = new DeliveryTripRepository(prisma as any);
  const service = new DeliveryTripService(prisma as any, repo);
  return service.createDeliveryTrip(params);
};

export const dispatchOrdersToTripService = async (params: DispatchOrdersParams) => {
  const repo = new DeliveryTripRepository(prisma as any);
  const service = new DeliveryTripService(prisma as any, repo);
  return service.dispatchOrdersToTrip(params);
};

export const removeOrderFromTripService = async (params: RemoveOrderParams) => {
  const repo = new DeliveryTripRepository(prisma as any);
  const service = new DeliveryTripService(prisma as any, repo);
  return service.removeOrderFromTrip(params);
};

export const updateTripStatusService = async (params: UpdateTripStatusParams) => {
  const repo = new DeliveryTripRepository(prisma as any);
  const service = new DeliveryTripService(prisma as any, repo);
  return service.updateTripStatus(params);
};

export const getTripCargoManifestService = async (tripId: string | number | bigint, distributorId: string | number | bigint = 1) => {
  const repo = new DeliveryTripRepository(prisma as any);
  const service = new DeliveryTripService(prisma as any, repo);
  return service.getTripCargoManifest(tripId, distributorId);
};

export const confirmStopDeliveryService = async (params: ConfirmStopDeliveryParams) => {
  const repo = new DeliveryTripRepository(prisma as any);
  const service = new DeliveryTripService(prisma as any, repo);
  return service.confirmStopDelivery(params);
};

export const getTripReturnSummaryService = async (tripId: string | number | bigint, distributorId: string | number | bigint = 1) => {
  const repo = new DeliveryTripRepository(prisma as any);
  const service = new DeliveryTripService(prisma as any, repo);
  return service.getTripReturnSummary(tripId, distributorId);
};

export const closeDeliveryTripService = async (params: CloseDeliveryTripParams) => {
  const repo = new DeliveryTripRepository(prisma as any);
  const service = new DeliveryTripService(prisma as any, repo);
  return service.closeDeliveryTrip(params);
};
