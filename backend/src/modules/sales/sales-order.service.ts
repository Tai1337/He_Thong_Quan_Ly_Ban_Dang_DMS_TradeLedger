import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import prisma from '../../prisma/prisma.client';
import {
  SalesOrderRepository,
  SalesOrderFilterParams,
  findSalesOrdersByDistributor,
  findSalesOrderById,
  findAvailableLotsByProduct,
  getTotalAvailableStock,
  findAvailableDeliveryTrips,
  findSalesOrderMetaOptions,
  getSalesSummaryAnalytics,
} from './sales-order.repository';

export interface CreateSalesOrderDto {
  retailerId: string | number | bigint;
  warehouseId: string | number | bigint;
  orderType?: string;
  items: Array<{
    productId: string | number | bigint;
    quantity?: number;
    orderedQuantity?: number;
    unitPrice?: number;
    isPromotion?: boolean;
  }>;
  notes?: string;
  orderDate?: string | Date;
  expectedDeliveryDate?: string | Date;
}

export interface InvoiceDataDto {
  vatRate?: number;
  dueDate?: string | Date;
}

export interface PaymentDataDto {
  amount: number;
  paymentMethod?: string;
  paymentDate?: string | Date;
  note?: string;
}

@Injectable()
export class SalesOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly salesOrderRepo: SalesOrderRepository,
  ) {}

  /**
   * Lấy danh sách đơn hàng kèm KPIs và kiểm tra tồn kho
   */
  async getSalesOrdersWithKPIs(distributorId: string | number | bigint, filters: SalesOrderFilterParams = {}) {
    const { orders, total } = await this.salesOrderRepo.findSalesOrdersByDistributor(distributorId, filters);

    let totalAmount = 0;
    let totalDiscount = 0;

    const productStockCache: Record<string, number> = {};

    const formattedOrders = await Promise.all(
      orders.map(async (order: any) => {
        const expectedDate = new Date(order.createdAt);
        expectedDate.setDate(expectedDate.getDate() + 1);

        let orderTotal = 0;
        let isShortage = false;

        if (order.invoice) {
          orderTotal = Number(order.invoice.totalAmount);
        } else if (order.items && order.items.length > 0) {
          orderTotal = order.items.reduce(
            (sum: number, item: any) => sum + Number(item.quantity) * Number(item.unitPrice),
            0,
          );
        }

        if (order.status === 'PENDING' || order.status === 'SUBMITTED') {
          for (const item of order.items || []) {
            const qty = Number(item.quantity);
            if (qty <= 0) continue;
            const prodId = item.productId.toString();
            if (productStockCache[prodId] === undefined) {
              productStockCache[prodId] = await this.salesOrderRepo.getTotalAvailableStock(
                item.productId,
                order.warehouseId,
              );
            }
            if (qty > productStockCache[prodId]) {
              isShortage = true;
            }
          }
        } else if (order.status === 'ALLOCATED') {
          for (const item of order.items || []) {
            const qty = Number(item.quantity);
            if (qty <= 0) continue;
            const allocatedQty = (item.allocations || []).reduce((s: number, a: any) => s + Number(a.quantity), 0);
            if (allocatedQty < qty) {
              isShortage = true;
            }
          }
        }

        const orderDiscount = 0;
        totalAmount += orderTotal;
        totalDiscount += orderDiscount;

        return {
          id: order.id.toString(),
          orderCode: order.orderCode,
          retailerId: order.retailerId.toString(),
          retailerCode: order.retailer?.code || '',
          retailerName: order.retailer?.name || '',
          address: order.retailer?.address || '',
          phone: order.retailer?.phone || '',
          warehouseId: order.warehouseId.toString(),
          warehouseName: order.warehouse?.name || '',
          vnbhCode: order.createdBy?.username || 'N/A',
          vnbhName: order.createdBy?.fullName || 'Chưa phân bổ',
          createdAt: order.createdAt.toISOString(),
          expectedDate: expectedDate.toISOString(),
          truckCode: order.deliveryTrip?.tripCode || 'Chưa điều phối',
          tripId: order.deliveryTripId ? order.deliveryTripId.toString() : null,
          driverName: order.deliveryTrip?.driver?.fullName || '',
          status: order.status,
          stockStatus: isShortage ? 'Thiếu tồn' : 'Đủ tồn',
          isShortage,
          totalAmount: orderTotal,
          discount: orderDiscount,
          itemCount: order.items?.length || 0,
          orderType: order.orderType,
        };
      }),
    );

    const unclosedOrdersList = await this.prisma.salesOrder.findMany({
      where: {
        distributorId: BigInt(distributorId),
        status: { in: ['DELIVERED', 'INVOICED'] },
      },
      include: { items: true, invoice: true },
    });

    const unclosedOrdersCount = unclosedOrdersList.length;
    const unclosedOrdersAmount = unclosedOrdersList.reduce((sum: number, o: any) => {
      if (o.invoice) return sum + Number(o.invoice.totalAmount);
      return sum + (o.items || []).reduce((s: number, it: any) => s + Number(it.quantity) * Number(it.unitPrice), 0);
    }, 0);

    let filteredData = formattedOrders;
    if ((filters as any).stockFilter === 'enough') {
      filteredData = formattedOrders.filter((o) => !o.isShortage);
    } else if ((filters as any).stockFilter === 'shortage') {
      filteredData = formattedOrders.filter((o) => o.isShortage);
    }

    return {
      data: filteredData,
      kpis: {
        totalOrders: total,
        totalAmount,
        totalDiscount,
        totalOrderValue: totalAmount - totalDiscount,
        totalTons: (totalAmount / 50000000).toFixed(4),
        totalCbm: (totalAmount / 30000000).toFixed(4),
        unclosedOrdersCount,
        unclosedOrdersAmount,
      },
      pagination: {
        total,
        page: parseInt(String(filters.page || 1), 10),
        limit: parseInt(String(filters.limit || 10), 10),
      },
    };
  }

  /**
   * Lấy chi tiết đơn hàng theo ID
   */
  async getOrderDetail(id: string | number | bigint, distributorId?: string | number | bigint) {
    const order = await this.salesOrderRepo.findSalesOrderById(id, distributorId);
    if (!order) {
      throw new Error('Không tìm thấy đơn hàng hoặc bạn không có quyền truy cập');
    }

    const expectedDate = new Date(order.createdAt);
    expectedDate.setDate(expectedDate.getDate() + 1);

    let totalAmount = 0;
    const items = await Promise.all(
      order.items.map(async (item: any) => {
        const qty = Number(item.quantity);
        const price = Number(item.unitPrice);
        const lineTotal = qty * price;
        totalAmount += lineTotal;

        const availableStock = await this.salesOrderRepo.getTotalAvailableStock(item.productId, order.warehouseId);

        const allocations = (item.allocations || []).map((alloc: any) => ({
          id: alloc.id.toString(),
          lotId: alloc.lotId.toString(),
          lotNumber: alloc.stockLot?.lotNumber || 'N/A',
          expiryDate: alloc.stockLot?.expiryDate,
          manufactureDate: alloc.stockLot?.manufactureDate,
          quantity: Number(alloc.quantity),
        }));

        return {
          id: item.id.toString(),
          productId: item.productId.toString(),
          productSku: item.product?.sku || '',
          productName: item.product?.name || '',
          unit: item.product?.unit || 'THÙNG',
          quantity: qty,
          unitPrice: price,
          totalAmount: lineTotal,
          isPromotion: item.isPromotion,
          availableStock,
          isShortage: qty > availableStock,
          allocations,
        };
      }),
    );

    const statusHistory = (order.statusHistory || []).map((h: any) => ({
      id: h.id.toString(),
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      changedBy: h.changedBy?.fullName || h.changedBy?.username || 'Hệ thống',
      changedAt: h.changedAt,
      reason: h.reason || '',
      notes: h.notes || '',
    }));

    return {
      id: order.id.toString(),
      orderCode: order.orderCode,
      distributorId: order.distributorId.toString(),
      warehouseId: order.warehouseId.toString(),
      warehouseName: order.warehouse?.name || '',
      retailerId: order.retailerId.toString(),
      retailerCode: order.retailer?.code || '',
      retailerName: order.retailer?.name || '',
      retailerPhone: order.retailer?.phone || '',
      retailerAddress: order.retailer?.address || '',
      vnbhCode: order.createdBy?.username || '',
      vnbhName: order.createdBy?.fullName || '',
      createdAt: order.createdAt,
      expectedDate,
      status: order.status,
      orderType: order.orderType,
      deliveryTrip: order.deliveryTrip
        ? {
            id: order.deliveryTrip.id.toString(),
            tripCode: order.deliveryTrip.tripCode,
            driverName: order.deliveryTrip.driver?.fullName || '',
            driverPhone: order.deliveryTrip.driver?.phone || '',
            status: order.deliveryTrip.status,
          }
        : null,
      totalAmount,
      items,
      statusHistory,
    };
  }

  /**
   * Xác nhận đơn hàng & Phân bổ tồn kho theo quy tắc FEFO
   */
  async confirmOrder(
    orderId: string | number | bigint,
    distributorId?: string | number | bigint,
    changedById?: string | number | bigint,
  ) {
    return this.prisma.$transaction(async (tx: any) => {
      const order = await tx.salesOrder.findFirst({
        where: {
          id: BigInt(orderId),
          ...(distributorId ? { distributorId: BigInt(distributorId) } : {}),
        },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      if (!order) {
        throw new Error('Đơn hàng không tồn tại hoặc không thuộc quyền quản lý');
      }

      if (order.status !== 'PENDING' && order.status !== 'SUBMITTED') {
        throw new Error(
          `Đơn hàng đang ở trạng thái "${order.status}", chỉ có thể xác nhận đơn ở trạng thái "Chờ duyệt" (PENDING hoặc SUBMITTED)`,
        );
      }

      if (!order.items || order.items.length === 0) {
        throw new Error('Đơn hàng không có sản phẩm để xác nhận');
      }

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      let validItemsToAllocate = 0;

      for (const item of order.items) {
        const requiredQty = Number(item.quantity);
        if (requiredQty <= 0) continue;
        validItemsToAllocate++;

        const lots = await tx.stockLot.findMany({
          where: {
            productId: item.productId,
            warehouseId: order.warehouseId,
            status: 'GOOD',
            OR: [{ expiryDate: null }, { expiryDate: { gte: now } }],
          },
          include: { stockBalance: true },
          orderBy: [{ expiryDate: 'asc' }, { id: 'asc' }],
        });

        let totalAvailable = 0;
        const validLots: any[] = [];
        for (const lot of lots) {
          const onHand = Number(lot.stockBalance?.quantityOnHand || 0);
          const reserved = Number(lot.stockBalance?.quantityReserved || 0);
          const available = Math.max(0, onHand - reserved);
          if (available > 0) {
            validLots.push({ lot, available });
            totalAvailable += available;
          }
        }

        if (totalAvailable < requiredQty) {
          throw new Error(
            `Sản phẩm "${item.product.name}" (SKU: ${item.product.sku}) không đủ tồn kho khả dụng để xác nhận đơn. Yêu cầu: ${requiredQty}, Tồn khả dụng hiện tại: ${totalAvailable}. Vui lòng rà soát điều chỉnh qua RPT005 hoặc nhập thêm hàng!`,
          );
        }

        let remainingQty = requiredQty;
        for (const { lot, available } of validLots) {
          if (remainingQty <= 0) break;
          const allocateQty = Math.min(available, remainingQty);

          await tx.salesOrderItemAllocation.create({
            data: {
              salesOrderItemId: item.id,
              lotId: lot.id,
              quantity: allocateQty,
            },
          });

          await tx.stockBalance.update({
            where: { lotId: lot.id },
            data: {
              quantityReserved: {
                increment: allocateQty,
              },
            },
          });

          remainingQty -= allocateQty;
        }
      }

      if (validItemsToAllocate === 0) {
        throw new Error(
          'Đơn hàng không có sản phẩm nào có số lượng > 0 để phân bổ lô. Vui lòng thêm sản phẩm hoặc huỷ đơn hàng này.',
        );
      }

      await tx.salesOrder.update({
        where: { id: order.id },
        data: { status: 'ALLOCATED' },
      });

      await tx.orderStatusHistory.create({
        data: {
          salesOrderId: order.id,
          fromStatus: order.status,
          toStatus: 'ALLOCATED',
          changedById: changedById ? BigInt(changedById) : null,
          notes: 'Xác nhận đơn và tự động phân bổ lô theo FEFO (giữ chỗ Reserved Stock)',
        },
      });

      return {
        success: true,
        message: 'Xác nhận đơn hàng và phân bổ lô thành công',
        orderId: order.id.toString(),
        status: 'ALLOCATED',
      };
    });
  }

  /**
   * Xác nhận hàng loạt nhiều đơn hàng
   */
  async bulkConfirmOrders(
    orderIds: (string | number | bigint)[],
    distributorId?: string | number | bigint,
    changedById?: string | number | bigint,
  ) {
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      throw new Error('Vui lòng chọn ít nhất một đơn hàng để xác nhận');
    }

    const results: { success: any[]; failed: any[] } = {
      success: [],
      failed: [],
    };

    for (const id of orderIds) {
      try {
        await this.confirmOrder(id, distributorId, changedById);
        results.success.push(id);
      } catch (err: any) {
        results.failed.push({
          id,
          error: err.message,
        });
      }
    }

    return {
      total: orderIds.length,
      successCount: results.success.length,
      failedCount: results.failed.length,
      results,
    };
  }

  /**
   * Huỷ đơn hàng bán & Hoàn trả tồn kho đã giữ chỗ (Reserved Stock)
   */
  async cancelOrder(
    orderId: string | number | bigint,
    distributorId?: string | number | bigint,
    changedById?: string | number | bigint,
    reason: string = '',
  ) {
    if (!reason || !reason.trim()) {
      throw new Error('Vui lòng nhập lý do huỷ đơn hàng');
    }

    return this.prisma.$transaction(async (tx: any) => {
      const order = await tx.salesOrder.findFirst({
        where: {
          id: BigInt(orderId),
          ...(distributorId ? { distributorId: BigInt(distributorId) } : {}),
        },
        include: {
          items: {
            include: {
              allocations: true,
            },
          },
        },
      });

      if (!order) {
        throw new Error('Đơn hàng không tồn tại hoặc không thuộc quyền quản lý');
      }

      if (order.status !== 'PENDING' && order.status !== 'ALLOCATED') {
        throw new Error(
          `Không thể huỷ đơn hàng đang ở trạng thái "${order.status}". Chỉ được huỷ khi chưa bàn giao xe (Đã gửi đơn hoặc Chờ giao)`,
        );
      }

      if (order.status === 'ALLOCATED') {
        for (const item of order.items) {
          for (const alloc of item.allocations || []) {
            await tx.stockBalance.update({
              where: { lotId: alloc.lotId },
              data: {
                quantityReserved: {
                  decrement: alloc.quantity,
                },
              },
            });
          }
          await tx.salesOrderItemAllocation.deleteMany({
            where: { salesOrderItemId: item.id },
          });
        }
      }

      await tx.salesOrder.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      });

      await tx.orderStatusHistory.create({
        data: {
          salesOrderId: order.id,
          fromStatus: order.status,
          toStatus: 'CANCELLED',
          changedById: changedById ? BigInt(changedById) : null,
          reason: reason.trim(),
          notes: `Huỷ đơn hàng: ${reason.trim()}`,
        },
      });

      return {
        success: true,
        message: 'Huỷ đơn hàng thành công và đã hoàn trả tồn kho giữ chỗ',
        orderId: order.id.toString(),
        status: 'CANCELLED',
      };
    });
  }

  /**
   * Gán chuyến xe giao hàng (ALLOCATED -> SHIPPED)
   */
  async assignDeliveryTrip(
    orderId: string | number | bigint,
    distributorId?: string | number | bigint,
    tripId?: string | number | bigint,
    changedById?: string | number | bigint,
  ) {
    if (!tripId) {
      throw new Error('Vui lòng chọn chuyến xe giao hàng');
    }

    return this.prisma.$transaction(async (tx: any) => {
      const order = await tx.salesOrder.findFirst({
        where: {
          id: BigInt(orderId),
          ...(distributorId ? { distributorId: BigInt(distributorId) } : {}),
        },
      });

      if (!order) {
        throw new Error('Không tìm thấy đơn hàng');
      }

      if (order.status !== 'ALLOCATED') {
        throw new Error(
          `Chỉ có thể gán chuyến xe cho đơn hàng ở trạng thái "Chờ giao" (ALLOCATED). Trạng thái hiện tại: ${order.status}`,
        );
      }

      const trip = await tx.deliveryTrip.findUnique({
        where: { id: BigInt(tripId) },
        include: { driver: true },
      });

      if (!trip) {
        throw new Error('Chuyến xe không tồn tại');
      }

      await tx.salesOrder.update({
        where: { id: order.id },
        data: {
          deliveryTripId: trip.id,
          status: 'SHIPPED',
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          salesOrderId: order.id,
          fromStatus: 'ALLOCATED',
          toStatus: 'SHIPPED',
          changedById: changedById ? BigInt(changedById) : null,
          notes: `Gán vào chuyến xe [${trip.tripCode}] - Tài xế: ${trip.driver?.fullName || 'Chưa gán'}`,
        },
      });

      return {
        success: true,
        message: `Đã gán đơn hàng vào chuyến xe ${trip.tripCode} và chuyển sang Đang giao`,
        orderId: order.id.toString(),
        status: 'SHIPPED',
      };
    });
  }

  /**
   * Xác nhận giao hàng thành công (SHIPPED -> DELIVERED)
   */
  async confirmDelivery(
    orderId: string | number | bigint,
    distributorId?: string | number | bigint,
    changedById?: string | number | bigint,
    isSuccess: boolean = true,
    note: string = '',
  ) {
    return this.prisma.$transaction(async (tx: any) => {
      const order = await tx.salesOrder.findFirst({
        where: {
          id: BigInt(orderId),
          ...(distributorId ? { distributorId: BigInt(distributorId) } : {}),
        },
        include: {
          items: {
            include: {
              allocations: true,
              product: true,
            },
          },
        },
      });

      if (!order) {
        throw new Error('Không tìm thấy đơn hàng');
      }

      if (order.status !== 'SHIPPED') {
        throw new Error(
          `Chỉ có thể xác nhận giao hàng cho đơn đang ở trạng thái "Đang giao" (SHIPPED). Trạng thái hiện tại: ${order.status}`,
        );
      }

      if (!isSuccess) {
        await tx.salesOrder.update({
          where: { id: order.id },
          data: {
            status: 'ALLOCATED',
            deliveryTripId: null,
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            salesOrderId: order.id,
            fromStatus: 'SHIPPED',
            toStatus: 'ALLOCATED',
            changedById: changedById ? BigInt(changedById) : null,
            notes: `Giao hàng thất bại: ${note || 'Khách hàng không nhận hàng'}`,
          },
        });

        return {
          success: true,
          message: 'Đã cập nhật giao hàng thất bại, hoàn về Chờ giao',
          status: 'ALLOCATED',
        };
      }

      for (const item of order.items) {
        for (const alloc of item.allocations || []) {
          const qty = Number(alloc.quantity);

          await tx.stockBalance.update({
            where: { lotId: alloc.lotId },
            data: {
              quantityOnHand: { decrement: qty },
              quantityReserved: { decrement: qty },
            },
          });

          const txnCode = `TXN-OUT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          await tx.inventoryTransaction.create({
            data: {
              transactionCode: txnCode,
              direction: 'OUT',
              lotId: alloc.lotId,
              warehouseId: order.warehouseId,
              quantity: qty,
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
        data: { status: 'DELIVERED' },
      });

      await tx.orderStatusHistory.create({
        data: {
          salesOrderId: order.id,
          fromStatus: 'SHIPPED',
          toStatus: 'DELIVERED',
          changedById: changedById ? BigInt(changedById) : null,
          notes: 'Xác nhận giao hàng thành công đến đại lý / điểm bán',
        },
      });

      return {
        success: true,
        message: 'Xác nhận giao hàng thành công và đã xuất kho vật lý',
        orderId: order.id.toString(),
        status: 'DELIVERED',
      };
    });
  }

  /**
   * Đóng đơn hàng sau khi đối soát (DELIVERED -> PAID)
   */
  async closeOrder(
    orderId: string | number | bigint,
    distributorId?: string | number | bigint,
    changedById?: string | number | bigint,
  ) {
    const order = await this.prisma.salesOrder.findFirst({
      where: {
        id: BigInt(orderId),
        ...(distributorId ? { distributorId: BigInt(distributorId) } : {}),
      },
    });

    if (!order) {
      throw new Error('Không tìm thấy đơn hàng');
    }

    if (order.status !== 'DELIVERED') {
      throw new Error(
        `Chỉ có thể đóng đơn hàng khi đã ở trạng thái "Đã giao" (DELIVERED). Trạng thái hiện tại: ${order.status}`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.salesOrder.update({
        where: { id: order.id },
        data: { status: 'PAID' },
      }),
      this.prisma.orderStatusHistory.create({
        data: {
          salesOrderId: order.id,
          fromStatus: 'DELIVERED',
          toStatus: 'PAID',
          changedById: changedById ? BigInt(changedById) : null,
          notes: 'Đối soát công nợ / thanh toán hoàn tất - Đóng đơn hàng',
        },
      }),
    ]);

    return {
      success: true,
      message: 'Đã đóng đơn hàng thành công',
      orderId: order.id.toString(),
      status: 'PAID',
    };
  }

  /**
   * Tái phân bổ lô hàng theo FEFO cho đơn hàng
   */
  private async reallocateLotsForOrder(tx: any, orderId: any) {
    const order = await tx.salesOrder.findUnique({
      where: { id: BigInt(orderId) },
      include: {
        items: {
          include: {
            product: true,
            allocations: true,
          },
        },
      },
    });

    if (!order) throw new Error('Không tìm thấy đơn hàng');

    for (const item of order.items) {
      for (const alloc of item.allocations || []) {
        await tx.stockBalance.update({
          where: { lotId: alloc.lotId },
          data: {
            quantityReserved: {
              decrement: alloc.quantity,
            },
          },
        });
      }
      await tx.salesOrderItemAllocation.deleteMany({
        where: { salesOrderItemId: item.id },
      });
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (const item of order.items) {
      const requiredQty = Number(item.quantity);
      if (requiredQty <= 0) continue;

      const lots = await tx.stockLot.findMany({
        where: {
          productId: item.productId,
          warehouseId: order.warehouseId,
          status: 'GOOD',
          OR: [{ expiryDate: null }, { expiryDate: { gte: now } }],
        },
        include: { stockBalance: true },
        orderBy: [{ expiryDate: 'asc' }, { id: 'asc' }],
      });

      let totalAvailable = 0;
      const validLots: any[] = [];
      for (const lot of lots) {
        const onHand = Number(lot.stockBalance?.quantityOnHand || 0);
        const reserved = Number(lot.stockBalance?.quantityReserved || 0);
        const available = Math.max(0, onHand - reserved);
        if (available > 0) {
          validLots.push({ lot, available });
          totalAvailable += available;
        }
      }

      if (totalAvailable < requiredQty) {
        throw new Error(
          `Sản phẩm "${item.product.name}" (SKU: ${item.product.sku}) không đủ tồn kho khả dụng để phân bổ. Yêu cầu: ${requiredQty}, Tồn khả dụng hiện tại: ${totalAvailable}`,
        );
      }

      let remainingQty = requiredQty;
      for (const { lot, available } of validLots) {
        if (remainingQty <= 0) break;
        const allocateQty = Math.min(available, remainingQty);

        await tx.salesOrderItemAllocation.create({
          data: {
            salesOrderItemId: item.id,
            lotId: lot.id,
            quantity: allocateQty,
          },
        });

        await tx.stockBalance.update({
          where: { lotId: lot.id },
          data: {
            quantityReserved: {
              increment: allocateQty,
            },
          },
        });

        remainingQty -= allocateQty;
      }
    }
  }

  /**
   * Chỉnh sửa số lượng sản phẩm trên đơn hàng
   */
  async updateOrderItemQuantity(
    orderId: string | number | bigint,
    itemId: string | number | bigint,
    newQuantity: number | string,
    distributorId?: string | number | bigint,
    changedById?: string | number | bigint,
    reason: string = '',
  ) {
    const qty = Number(newQuantity);
    if (isNaN(qty) || qty < 0) {
      throw new Error('Số lượng sản phẩm không hợp lệ (phải từ 0 trở lên)');
    }

    return this.prisma.$transaction(async (tx: any) => {
      const order = await tx.salesOrder.findFirst({
        where: {
          id: BigInt(orderId),
          ...(distributorId ? { distributorId: BigInt(distributorId) } : {}),
        },
      });

      if (!order) throw new Error('Không tìm thấy đơn hàng');

      if (order.deliveryTripId) {
        throw new Error('Đơn hàng đã được gán vào chuyến xe giao hàng, không thể chỉnh sửa!');
      }

      if (order.status !== 'PENDING' && order.status !== 'SUBMITTED' && order.status !== 'ALLOCATED') {
        throw new Error(
          'Chỉ được chỉnh sửa số lượng khi đơn hàng ở trạng thái "Chờ duyệt" hoặc "Chờ giao" (chưa gán chuyến xe)',
        );
      }

      const item = await tx.salesOrderItem.findUnique({
        where: { id: BigInt(itemId) },
        include: { product: true },
      });

      if (!item) throw new Error('Không tìm thấy dòng sản phẩm trong đơn');

      const oldQty = Number(item.quantity);

      await tx.salesOrderItem.update({
        where: { id: item.id },
        data: { quantity: qty },
      });

      if (order.status === 'ALLOCATED') {
        await this.reallocateLotsForOrder(tx, order.id);
      }

      const noteText =
        qty === 0
          ? `Điều chỉnh số lượng SP [${item.product.name}] từ ${oldQty} về 0 (Cắt giảm do hết tồn kho). Lý do: ${reason || 'Hết hàng'}`
          : `Điều chỉnh số lượng SP [${item.product.name}] từ ${oldQty} thành ${qty}. Lý do: ${reason || 'Kế toán điều chỉnh số lượng'}`;

      await tx.orderStatusHistory.create({
        data: {
          salesOrderId: order.id,
          fromStatus: order.status,
          toStatus: order.status,
          changedById: changedById ? BigInt(changedById) : null,
          notes: noteText,
        },
      });

      return {
        success: true,
        message: qty === 0 ? 'Đã cắt giảm số lượng sản phẩm về 0 thành công' : 'Cập nhật số lượng sản phẩm thành công',
        oldQuantity: oldQty,
        newQuantity: qty,
      };
    });
  }

  /**
   * Tạo mới đơn đặt hàng bán
   */
  async createNewSalesOrder(
    orderData: CreateSalesOrderDto,
    distributorId: string | number | bigint,
    createdById?: string | number | bigint,
  ) {
    const { retailerId, warehouseId, orderType = 'LATER', items, notes, orderDate } = orderData;

    if (!retailerId) throw new Error('Vui lòng chọn khách hàng / đại lý');
    if (!warehouseId) throw new Error('Vui lòng chọn kho xuất hàng');
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Đơn hàng phải có ít nhất 1 sản phẩm');
    }

    const date = orderDate ? new Date(orderDate) : new Date();
    const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(10000 + Math.random() * 90000);
    const orderCode = `SO-${yyyymmdd}-${rand}`;

    return this.prisma.$transaction(async (tx: any) => {
      const order = await tx.salesOrder.create({
        data: {
          orderCode,
          distributorId: BigInt(distributorId),
          warehouseId: BigInt(warehouseId),
          retailerId: BigInt(retailerId),
          orderType: orderType || 'LATER',
          status: 'PENDING',
          createdById: createdById ? BigInt(createdById) : null,
          createdAt: date,
          items: {
            create: items.map((it) => {
              const qty = Number(it.quantity ?? it.orderedQuantity ?? 1);
              const price = Number(it.unitPrice ?? 0);
              return {
                product: { connect: { id: BigInt(it.productId) } },
                quantity: isNaN(qty) || qty <= 0 ? 1 : qty,
                unitPrice: isNaN(price) ? 0 : price,
                isPromotion: Boolean(it.isPromotion),
              };
            }),
          },
        },
        include: {
          retailer: true,
          items: { include: { product: true } },
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          salesOrderId: order.id,
          fromStatus: null,
          toStatus: 'PENDING',
          changedById: createdById ? BigInt(createdById) : null,
          notes: `Tạo mới đơn đặt hàng bán (Biểu mẫu BH_BM1)${notes ? `. Ghi chú: ${notes}` : ''}`,
        },
      });

      return {
        success: true,
        message: 'Tạo đơn đặt hàng bán thành công',
        data: {
          id: order.id.toString(),
          orderCode: order.orderCode,
          status: order.status,
          totalAmount: order.items.reduce(
            (sum: number, it: any) => sum + Number(it.quantity) * Number(it.unitPrice),
            0,
          ),
        },
      };
    });
  }

  /**
   * Nộp đơn hàng để duyệt (PENDING -> SUBMITTED)
   */
  async submitOrder(
    orderId: string | number | bigint,
    distributorId?: string | number | bigint,
    changedById?: string | number | bigint,
  ) {
    return this.prisma.$transaction(async (tx: any) => {
      const order = await tx.salesOrder.findFirst({
        where: {
          id: BigInt(orderId),
          ...(distributorId ? { distributorId: BigInt(distributorId) } : {}),
        },
      });

      if (!order) throw new Error('Không tìm thấy đơn hàng');
      if (order.status !== 'PENDING') {
        throw new Error(
          `Chỉ có thể nộp duyệt đơn hàng ở trạng thái "Mới tạo" (PENDING). Trạng thái hiện tại: ${order.status}`,
        );
      }

      await tx.salesOrder.update({
        where: { id: order.id },
        data: { status: 'SUBMITTED' },
      });

      await tx.orderStatusHistory.create({
        data: {
          salesOrderId: order.id,
          fromStatus: 'PENDING',
          toStatus: 'SUBMITTED',
          changedById: changedById ? BigInt(changedById) : null,
          notes: 'Nhân viên bán hàng nộp đơn chờ thủ kho/kế toán xác nhận phân bổ',
        },
      });

      return {
        success: true,
        message: 'Nộp đơn hàng thành công, chuyển sang Chờ duyệt (SUBMITTED)',
        orderId: order.id.toString(),
        status: 'SUBMITTED',
      };
    });
  }

  /**
   * Hủy gán chuyến xe giao hàng (SHIPPED -> ALLOCATED)
   */
  async unassignDeliveryTrip(
    orderId: string | number | bigint,
    distributorId?: string | number | bigint,
    changedById?: string | number | bigint,
    reason: string = '',
  ) {
    return this.prisma.$transaction(async (tx: any) => {
      const order = await tx.salesOrder.findFirst({
        where: {
          id: BigInt(orderId),
          ...(distributorId ? { distributorId: BigInt(distributorId) } : {}),
        },
        include: { deliveryTrip: true },
      });

      if (!order) throw new Error('Không tìm thấy đơn hàng');
      if (order.status !== 'SHIPPED') {
        throw new Error(
          `Chỉ có thể huỷ gán chuyến xe cho đơn hàng đang ở trạng thái "Đang giao" (SHIPPED). Trạng thái hiện tại: ${order.status}`,
        );
      }

      const oldTripCode = order.deliveryTrip?.tripCode || '';

      await tx.salesOrder.update({
        where: { id: order.id },
        data: {
          deliveryTripId: null,
          status: 'ALLOCATED',
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          salesOrderId: order.id,
          fromStatus: 'SHIPPED',
          toStatus: 'ALLOCATED',
          changedById: changedById ? BigInt(changedById) : null,
          reason: reason.trim() || 'Hủy gán chuyến xe',
          notes: `Hủy gán khỏi chuyến xe [${oldTripCode}], hoàn về Chờ giao (ALLOCATED)`,
        },
      });

      return {
        success: true,
        message: 'Đã gỡ đơn hàng khỏi chuyến xe và hoàn về Chờ giao',
        orderId: order.id.toString(),
        status: 'ALLOCATED',
      };
    });
  }

  /**
   * Thêm sản phẩm vào đơn hàng
   */
  async addOrderItem(
    orderId: string | number | bigint,
    distributorId?: string | number | bigint,
    changedById?: string | number | bigint,
    itemData: any = {},
  ) {
    const { productId, quantity = 1, unitPrice = 0, isPromotion = false } = itemData;
    const qty = Number(quantity);
    const price = Number(unitPrice);

    if (!productId) throw new Error('Vui lòng chọn sản phẩm');
    if (isNaN(qty) || qty <= 0) throw new Error('Số lượng sản phẩm phải lớn hơn 0');

    return this.prisma.$transaction(async (tx: any) => {
      const order = await tx.salesOrder.findFirst({
        where: {
          id: BigInt(orderId),
          ...(distributorId ? { distributorId: BigInt(distributorId) } : {}),
        },
      });

      if (!order) throw new Error('Không tìm thấy đơn hàng');

      if (order.deliveryTripId) {
        throw new Error('Đơn hàng đã được gán vào chuyến xe giao hàng, không thể chỉnh sửa!');
      }

      if (order.status !== 'PENDING' && order.status !== 'SUBMITTED' && order.status !== 'ALLOCATED') {
        throw new Error(
          'Chỉ có thể thêm sản phẩm khi đơn hàng ở trạng thái "Chờ duyệt" hoặc "Chờ giao" (chưa gán chuyến xe)',
        );
      }

      const product = await tx.product.findUnique({
        where: { id: BigInt(productId) },
      });
      if (!product) throw new Error('Sản phẩm không tồn tại');

      const existing = await tx.salesOrderItem.findUnique({
        where: {
          salesOrderId_productId: {
            salesOrderId: order.id,
            productId: product.id,
          },
        },
      });

      let savedItem;
      if (existing) {
        savedItem = await tx.salesOrderItem.update({
          where: { id: existing.id },
          data: {
            quantity: { increment: qty },
          },
        });
      } else {
        savedItem = await tx.salesOrderItem.create({
          data: {
            salesOrderId: order.id,
            productId: product.id,
            quantity: qty,
            unitPrice: price > 0 ? price : Number(product.basePrice),
            isPromotion: Boolean(isPromotion),
          },
        });
      }

      if (order.status === 'ALLOCATED') {
        await this.reallocateLotsForOrder(tx, order.id);
      }

      await tx.orderStatusHistory.create({
        data: {
          salesOrderId: order.id,
          fromStatus: order.status,
          toStatus: order.status,
          changedById: changedById ? BigInt(changedById) : null,
          notes: `Thêm sản phẩm [${product.name}] - SL: ${qty}`,
        },
      });

      return {
        success: true,
        message: 'Thêm sản phẩm vào đơn hàng thành công',
        itemId: savedItem.id.toString(),
      };
    });
  }

  /**
   * Xoá sản phẩm khỏi đơn hàng
   */
  async removeOrderItem(
    orderId: string | number | bigint,
    itemId: string | number | bigint,
    distributorId?: string | number | bigint,
    changedById?: string | number | bigint,
  ) {
    return this.prisma.$transaction(async (tx: any) => {
      const order = await tx.salesOrder.findFirst({
        where: {
          id: BigInt(orderId),
          ...(distributorId ? { distributorId: BigInt(distributorId) } : {}),
        },
        include: { items: true },
      });

      if (!order) throw new Error('Không tìm thấy đơn hàng');

      if (order.deliveryTripId) {
        throw new Error('Đơn hàng đã được gán vào chuyến xe giao hàng, không thể chỉnh sửa!');
      }

      if (order.status !== 'PENDING' && order.status !== 'SUBMITTED' && order.status !== 'ALLOCATED') {
        throw new Error(
          'Chỉ có thể xoá sản phẩm khi đơn hàng ở trạng thái "Chờ duyệt" hoặc "Chờ giao" (chưa gán chuyến xe)',
        );
      }

      if (order.items.length <= 1) {
        throw new Error('Đơn hàng phải có ít nhất 1 sản phẩm. Không thể xoá hết');
      }

      const item = await tx.salesOrderItem.findUnique({
        where: { id: BigInt(itemId) },
        include: { product: true },
      });

      if (!item || item.salesOrderId !== order.id) {
        throw new Error('Không tìm thấy dòng sản phẩm trong đơn');
      }

      if (order.status === 'ALLOCATED') {
        const allocs = await tx.salesOrderItemAllocation.findMany({
          where: { salesOrderItemId: item.id },
        });
        for (const alloc of allocs) {
          await tx.stockBalance.update({
            where: { lotId: alloc.lotId },
            data: {
              quantityReserved: {
                decrement: alloc.quantity,
              },
            },
          });
        }
        await tx.salesOrderItemAllocation.deleteMany({
          where: { salesOrderItemId: item.id },
        });
      }

      await tx.salesOrderItem.delete({
        where: { id: item.id },
      });

      if (order.status === 'ALLOCATED') {
        await this.reallocateLotsForOrder(tx, order.id);
      }

      await tx.orderStatusHistory.create({
        data: {
          salesOrderId: order.id,
          fromStatus: order.status,
          toStatus: order.status,
          changedById: changedById ? BigInt(changedById) : null,
          notes: `Xoá sản phẩm [${item.product?.name || 'N/A'}] khỏi đơn hàng`,
        },
      });

      return {
        success: true,
        message: 'Xoá sản phẩm khỏi đơn hàng thành công',
      };
    });
  }

  /**
   * Lấy danh sách chuyến xe khả dụng
   */
  async getAvailableDeliveryTrips(distributorId: string | number | bigint, warehouseId?: string | number | bigint) {
    const trips = await this.salesOrderRepo.findAvailableDeliveryTrips(distributorId, warehouseId);

    return trips.map((t: any) => ({
      id: t.id.toString(),
      tripCode: t.tripCode,
      driverName: t.driver?.fullName || 'Chưa gán tài xế',
      driverPhone: t.driver?.phone || '',
      warehouseName: t.warehouse?.name || '',
      status: t.status,
      orderCount: t.salesOrders?.length || 0,
    }));
  }

  /**
   * Lấy metadata phục vụ form tạo/sửa đơn hàng
   */
  async getSalesOrderMetadata(distributorId: string | number | bigint) {
    const { retailers, warehouses, products } = await this.salesOrderRepo.findSalesOrderMetaOptions(distributorId);

    const defaultWarehouseId = warehouses[0]?.id;

    const productsWithStock = await Promise.all(
      products.map(async (p: any) => {
        let availableStock = 0;
        if (defaultWarehouseId) {
          availableStock = await this.salesOrderRepo.getTotalAvailableStock(p.id, defaultWarehouseId);
        }
        return {
          id: p.id.toString(),
          sku: p.sku,
          name: p.name,
          unit: p.unit,
          basePrice: Number(p.basePrice),
          availableStock,
        };
      }),
    );

    return {
      retailers: retailers.map((r: any) => ({
        id: r.id.toString(),
        code: r.code,
        name: r.name,
        phone: r.phone || '',
        address: r.address || '',
      })),
      warehouses: warehouses.map((w: any) => ({
        id: w.id.toString(),
        code: w.code,
        name: w.name,
        type: w.type,
      })),
      products: productsWithStock,
    };
  }

  /**
   * Lấy báo cáo thống kê bán hàng
   */
  async getSalesAnalytics(distributorId: string | number | bigint, query: any = {}) {
    const { statusCounts, totalRevenueAgg } = await this.salesOrderRepo.getSalesSummaryAnalytics(distributorId, query);

    const statusMap: Record<string, number> = {};
    statusCounts.forEach((s: any) => {
      statusMap[s.status] = s._count.id;
    });

    return {
      statusCounts: statusMap,
      totalRevenue: Number(totalRevenueAgg._sum?.totalAmount || 0),
      totalPaid: Number(totalRevenueAgg._sum?.paidAmount || 0),
      totalDebt: Math.max(
        0,
        Number(totalRevenueAgg._sum?.totalAmount || 0) - Number(totalRevenueAgg._sum?.paidAmount || 0),
      ),
    };
  }
}

// Standalone functions for backward compatibility
export const getSalesOrdersWithKPIs = async (distributorId: string | number | bigint, filters: any = {}) => {
  const repo = new SalesOrderRepository(prisma as any);
  const service = new SalesOrderService(prisma as any, repo);
  return service.getSalesOrdersWithKPIs(distributorId, filters);
};

export const getOrderDetail = async (id: string | number | bigint, distributorId?: string | number | bigint) => {
  const repo = new SalesOrderRepository(prisma as any);
  const service = new SalesOrderService(prisma as any, repo);
  return service.getOrderDetail(id, distributorId);
};

export const confirmOrder = async (orderId: string | number | bigint, distributorId?: string | number | bigint, changedById?: string | number | bigint) => {
  const repo = new SalesOrderRepository(prisma as any);
  const service = new SalesOrderService(prisma as any, repo);
  return service.confirmOrder(orderId, distributorId, changedById);
};

export const bulkConfirmOrders = async (orderIds: any[], distributorId?: string | number | bigint, changedById?: string | number | bigint) => {
  const repo = new SalesOrderRepository(prisma as any);
  const service = new SalesOrderService(prisma as any, repo);
  return service.bulkConfirmOrders(orderIds, distributorId, changedById);
};

export const cancelOrder = async (orderId: string | number | bigint, distributorId?: string | number | bigint, changedById?: string | number | bigint, reason: string = '') => {
  const repo = new SalesOrderRepository(prisma as any);
  const service = new SalesOrderService(prisma as any, repo);
  return service.cancelOrder(orderId, distributorId, changedById, reason);
};

export const assignDeliveryTrip = async (orderId: string | number | bigint, distributorId?: string | number | bigint, tripId?: string | number | bigint, changedById?: string | number | bigint) => {
  const repo = new SalesOrderRepository(prisma as any);
  const service = new SalesOrderService(prisma as any, repo);
  return service.assignDeliveryTrip(orderId, distributorId, tripId, changedById);
};

export const confirmDelivery = async (orderId: string | number | bigint, distributorId?: string | number | bigint, changedById?: string | number | bigint, isSuccess: boolean = true, note: string = '') => {
  const repo = new SalesOrderRepository(prisma as any);
  const service = new SalesOrderService(prisma as any, repo);
  return service.confirmDelivery(orderId, distributorId, changedById, isSuccess, note);
};

export const closeOrder = async (orderId: string | number | bigint, distributorId?: string | number | bigint, changedById?: string | number | bigint) => {
  const repo = new SalesOrderRepository(prisma as any);
  const service = new SalesOrderService(prisma as any, repo);
  return service.closeOrder(orderId, distributorId, changedById);
};

export const updateOrderItemQuantity = async (orderId: string | number | bigint, itemId: string | number | bigint, newQuantity: any, distributorId?: string | number | bigint, changedById?: string | number | bigint, reason: string = '') => {
  const repo = new SalesOrderRepository(prisma as any);
  const service = new SalesOrderService(prisma as any, repo);
  return service.updateOrderItemQuantity(orderId, itemId, newQuantity, distributorId, changedById, reason);
};

export const createNewSalesOrder = async (orderData: any, distributorId: string | number | bigint, createdById?: string | number | bigint) => {
  const repo = new SalesOrderRepository(prisma as any);
  const service = new SalesOrderService(prisma as any, repo);
  return service.createNewSalesOrder(orderData, distributorId, createdById);
};

export const submitOrder = async (orderId: string | number | bigint, distributorId?: string | number | bigint, changedById?: string | number | bigint) => {
  const repo = new SalesOrderRepository(prisma as any);
  const service = new SalesOrderService(prisma as any, repo);
  return service.submitOrder(orderId, distributorId, changedById);
};

export const unassignDeliveryTrip = async (orderId: string | number | bigint, distributorId?: string | number | bigint, changedById?: string | number | bigint, reason: string = '') => {
  const repo = new SalesOrderRepository(prisma as any);
  const service = new SalesOrderService(prisma as any, repo);
  return service.unassignDeliveryTrip(orderId, distributorId, changedById, reason);
};

export const addOrderItem = async (orderId: string | number | bigint, distributorId?: string | number | bigint, changedById?: string | number | bigint, itemData: any = {}) => {
  const repo = new SalesOrderRepository(prisma as any);
  const service = new SalesOrderService(prisma as any, repo);
  return service.addOrderItem(orderId, distributorId, changedById, itemData);
};

export const removeOrderItem = async (orderId: string | number | bigint, itemId: string | number | bigint, distributorId?: string | number | bigint, changedById?: string | number | bigint) => {
  const repo = new SalesOrderRepository(prisma as any);
  const service = new SalesOrderService(prisma as any, repo);
  return service.removeOrderItem(orderId, itemId, distributorId, changedById);
};

export const getAvailableDeliveryTrips = async (distributorId: string | number | bigint, warehouseId?: string | number | bigint) => {
  const repo = new SalesOrderRepository(prisma as any);
  const service = new SalesOrderService(prisma as any, repo);
  return service.getAvailableDeliveryTrips(distributorId, warehouseId);
};

export const getSalesOrderMetadata = async (distributorId: string | number | bigint) => {
  const repo = new SalesOrderRepository(prisma as any);
  const service = new SalesOrderService(prisma as any, repo);
  return service.getSalesOrderMetadata(distributorId);
};

export const getSalesAnalytics = async (distributorId: string | number | bigint, query: any = {}) => {
  const repo = new SalesOrderRepository(prisma as any);
  const service = new SalesOrderService(prisma as any, repo);
  return service.getSalesAnalytics(distributorId, query);
};
