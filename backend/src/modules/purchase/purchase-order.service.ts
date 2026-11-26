import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import prisma from '../../prisma/prisma.client';
import ExcelJS from 'exceljs';
import {
  PurchaseOrderRepository,
  PurchaseOrderFilters,
  findPurchaseOrders,
  findAllPurchaseOrdersForExport,
  findPurchaseOrderById,
  findPurchaseOrderDiscrepancies,
} from './purchase-order.repository';
import {
  CreatePurchaseOrderDto,
  PurchaseOrderItemInputDto,
  UpdatePurchaseOrderDto,
} from './dto/create-purchase-order.dto';
import {
  executeReceiveLinesInTx,
  normalizeAndValidateReceiveLines,
} from './purchase-receiving.helper';

// Helper format số tiền VNĐ
const formatNumber = (num: any): number => Number(num || 0);

const getDefaultDPlus3Date = (): Date => {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d;
};

/**
 * Format PO entity sang JSON an toàn (BigInt -> String, Decimal -> Number)
 */
export const sanitizePurchaseOrder = (order: any) => {
  if (!order) return null;

  const totalOrderedQty = order.items?.reduce((sum: number, item: any) => sum + formatNumber(item.quantity), 0) || 0;
  const totalReceivedQty = order.items?.reduce((sum: number, item: any) => sum + formatNumber(item.quantityReceived), 0) || 0;
  const totalAmount =
    order.items?.reduce((sum: number, item: any) => {
      return sum + formatNumber(item.quantity) * formatNumber(item.unitPrice);
    }, 0) || 0;
  const totalReceivedAmount =
    order.items?.reduce((sum: number, item: any) => {
      return sum + formatNumber(item.quantityReceived) * formatNumber(item.unitPrice);
    }, 0) || 0;
  const totalWeightKg =
    order.items?.reduce((sum: number, item: any) => {
      return sum + formatNumber(item.quantity) * formatNumber(item.product?.weightKg || 10);
    }, 0) || 0;

  const receivedPercentage =
    totalOrderedQty > 0 ? Math.min(100, Math.round((totalReceivedQty / totalOrderedQty) * 100)) : 0;

  return {
    id: order.id.toString(),
    poCode: order.poCode,
    distributorId: order.distributorId.toString(),
    warehouseId: order.warehouseId.toString(),
    supplierId: order.supplierId ? order.supplierId.toString() : null,
    deliveryTripId: order.deliveryTripId ? order.deliveryTripId.toString() : null,
    status: order.status,
    expectedDate: order.expectedDate ? order.expectedDate.toISOString().slice(0, 10) : null,
    notes: order.notes,
    cancelReason: order.cancelReason,
    closeReason: order.closeReason,
    createdById: order.createdById ? order.createdById.toString() : null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    supplier: order.supplier
      ? {
          id: order.supplier.id.toString(),
          code: order.supplier.code,
          name: order.supplier.name,
          phone: order.supplier.phone,
          address: order.supplier.address,
        }
      : null,
    warehouse: order.warehouse
      ? {
          id: order.warehouse.id.toString(),
          code: order.warehouse.code,
          name: order.warehouse.name,
          type: order.warehouse.type,
        }
      : null,
    deliveryTrip: order.deliveryTrip
      ? {
          id: order.deliveryTrip.id.toString(),
          tripCode: order.deliveryTrip.tripCode,
          tripType: order.deliveryTrip.tripType,
          status: order.deliveryTrip.status,
          expectedDeliveryDate: order.deliveryTrip.expectedDeliveryDate
            ? order.deliveryTrip.expectedDeliveryDate.toISOString().slice(0, 10)
            : null,
          driver: order.deliveryTrip.driver
            ? {
                id: order.deliveryTrip.driver.id.toString(),
                fullName: order.deliveryTrip.driver.fullName,
              }
            : null,
        }
      : null,
    createdBy: order.createdBy
      ? {
          id: order.createdBy.id.toString(),
          fullName: order.createdBy.fullName,
          username: order.createdBy.username,
        }
      : null,
    items: (order.items || []).map((item: any) => {
      const qty = formatNumber(item.quantity);
      const received = formatNumber(item.quantityReceived);
      const price = formatNumber(item.unitPrice);
      const lineTotal = qty * price;
      const percent = qty > 0 ? Math.min(100, Math.round((received / qty) * 100)) : 0;

      return {
        id: item.id.toString(),
        purchaseOrderId: item.purchaseOrderId.toString(),
        productId: item.productId.toString(),
        quantity: qty,
        quantityReceived: received,
        quantityRemaining: Math.max(0, qty - received),
        unitPrice: price,
        lineTotal,
        receivedPercentage: percent,
        product: item.product
          ? {
              id: item.product.id.toString(),
              sku: item.product.sku,
              name: item.product.name,
              unit: item.product.unit,
              retailUnit: item.product.retailUnit,
              conversionRate: formatNumber(item.product.conversionRate || 1),
              weightKg: formatNumber(item.product.weightKg || 10),
              basePrice: formatNumber(item.product.basePrice),
            }
          : null,
      };
    }),
    statusHistory: (order.statusHistory || []).map((sh: any) => ({
      id: sh.id.toString(),
      purchaseOrderId: sh.purchaseOrderId.toString(),
      fromStatus: sh.fromStatus,
      toStatus: sh.toStatus,
      changedById: sh.changedById ? sh.changedById.toString() : null,
      changedAt: sh.changedAt,
      notes: sh.notes,
      changedBy: sh.changedBy
        ? {
            id: sh.changedBy.id.toString(),
            fullName: sh.changedBy.fullName,
            username: sh.changedBy.username,
          }
        : null,
    })),
    inboundTransactions: (order.inboundTransactions || []).map((txn: any) => ({
      id: txn.id.toString(),
      transactionCode: txn.transactionCode,
      direction: txn.direction,
      quantity: formatNumber(txn.quantity),
      unitPrice: formatNumber(txn.unitPrice),
      createdAt: txn.createdAt,
      warehouse: txn.warehouse
        ? {
            id: txn.warehouse.id.toString(),
            code: txn.warehouse.code,
            name: txn.warehouse.name,
          }
        : null,
      stockLot: txn.stockLot
        ? {
            id: txn.stockLot.id.toString(),
            productId: txn.stockLot.productId.toString(),
            lotNumber: txn.stockLot.lotNumber,
            manufactureDate: txn.stockLot.manufactureDate
              ? txn.stockLot.manufactureDate.toISOString().slice(0, 10)
              : null,
            expiryDate: txn.stockLot.expiryDate ? txn.stockLot.expiryDate.toISOString().slice(0, 10) : null,
            locationCode: txn.stockLot.locationCode || 'KHO-A1',
            status: txn.stockLot.status,
          }
        : null,
      createdBy: txn.createdBy
        ? {
            id: txn.createdBy.id.toString(),
            fullName: txn.createdBy.fullName,
            username: txn.createdBy.username,
          }
        : null,
    })),
    metrics: {
      totalOrderedQty,
      totalReceivedQty,
      totalRemainingQty: Math.max(0, totalOrderedQty - totalReceivedQty),
      totalAmount,
      totalReceivedAmount,
      totalWeightKg: Math.round(totalWeightKg * 100) / 100,
      receivedPercentage,
    },
  };
};

@Injectable()
export class PurchaseOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly purchaseOrderRepo: PurchaseOrderRepository,
  ) {}

  /**
   * Service lấy danh sách PO kèm KPI tổng quan
   */
  async getPurchaseOrders(distributorId?: string | number | bigint, filters: PurchaseOrderFilters = {}) {
    const { orders, total, page, limit } = await this.purchaseOrderRepo.findPurchaseOrders(distributorId, filters);

    const sanitizedOrders = orders.map(sanitizePurchaseOrder);

    const whereDist: any = distributorId ? { distributorId: BigInt(distributorId) } : {};
    const allOrdersSummary = await this.prisma.purchaseOrder.groupBy({
      by: ['status'],
      where: whereDist,
      _count: { id: true },
    });

    const countByStatus: Record<string, number> = {
      DRAFT: 0,
      WAITING_RECEIVE: 0,
      PARTIALLY_RECEIVED: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };

    allOrdersSummary.forEach((row: any) => {
      if (countByStatus[row.status] !== undefined) {
        countByStatus[row.status] = row._count.id;
      }
    });

    const totalAllOrders = Object.values(countByStatus).reduce((a, b) => a + b, 0);

    return {
      data: sanitizedOrders,
      total,
      page,
      limit,
      summary: {
        totalOrders: totalAllOrders,
        ...countByStatus,
      },
    };
  }

  /**
   * Service lấy chi tiết một PO
   */
  async getPurchaseOrderById(id: string | number | bigint, distributorId?: string | number | bigint) {
    const order = await this.purchaseOrderRepo.findPurchaseOrderById(id, distributorId);
    if (!order) return null;
    return sanitizePurchaseOrder(order);
  }

  /**
   * Hợp nhất các dòng trùng productId (tránh lỗi P2002) và kiểm tra số lượng/đơn giá
   */
  private mergeAndValidateItems(items: PurchaseOrderItemInputDto[]) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException({ error: 'Đơn đặt hàng phải có ít nhất 1 sản phẩm' });
    }

    const merged = new Map<string, { productId: bigint; quantity: number; unitPrice: number }>();

    for (const raw of items) {
      if (!raw.productId) {
        throw new BadRequestException({ error: 'Có dòng sản phẩm chưa chọn mã SKU' });
      }
      const qty = Number(raw.quantity || 0);
      const price = Number(raw.unitPrice || 0);

      if (qty <= 0) {
        throw new BadRequestException({ error: 'Số lượng đặt mua phải lớn hơn 0' });
      }
      if (price < 0) {
        throw new BadRequestException({ error: 'Đơn giá nhập không được âm' });
      }

      const key = String(raw.productId);
      const existing = merged.get(key);
      if (existing) {
        existing.quantity += qty;
        if (price > 0) existing.unitPrice = price;
      } else {
        merged.set(key, {
          productId: BigInt(raw.productId),
          quantity: qty,
          unitPrice: price,
        });
      }
    }

    return Array.from(merged.values());
  }

  /**
   * Đảm bảo PO ở trạng thái WAITING_RECEIVE luôn có Chuyến xe INBOUND (D+3) đi kèm
   */
  private async ensureInboundDeliveryTripTx(tx: any, order: any) {
    if (order.deliveryTripId) {
      const existingTrip = await tx.deliveryTrip.findUnique({ where: { id: order.deliveryTripId } });
      if (existingTrip) return existingTrip;
    }

    const expectedDate = order.expectedDate ? new Date(order.expectedDate) : getDefaultDPlus3Date();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const tripCode = `TRIP-IN-${dateStr}-${randSuffix}`;

    const totalWeightKg = (order.items || []).reduce((sum: number, item: any) => {
      return sum + formatNumber(item.quantity) * formatNumber(item.product?.weightKg || 10);
    }, 0);

    const trip = await tx.deliveryTrip.create({
      data: {
        tripCode,
        tripType: 'INBOUND',
        distributorId: order.distributorId,
        warehouseId: order.warehouseId,
        supplierId: order.supplierId || null,
        expectedDeliveryDate: expectedDate,
        currentWeightKg: Math.round(totalWeightKg * 100) / 100,
        status: 'SHIPPING',
        notes: `Chuyến nhập hàng NCC cho đơn ${order.poCode}`,
      },
    });

    await tx.purchaseOrder.update({
      where: { id: order.id },
      data: {
        deliveryTripId: trip.id,
        expectedDate: order.expectedDate || expectedDate,
      },
    });

    return trip;
  }

  /**
   * Lấy gợi ý nhập hàng theo tồn kho hiện tại của kho nhận hàng
   */
  async getReplenishmentSuggestions(distributorId: string | number | bigint = 1, warehouseId?: string | number | bigint) {
    return this.purchaseOrderRepo.findReplenishmentStockByWarehouse(distributorId, warehouseId);
  }

  /**
   * Service tạo đơn mua PO mới (hỗ trợ Lưu nháp DRAFT hoặc Gửi NCC ngay trong 1 transaction)
   */
  async createPurchaseOrder({
    distributorId,
    warehouseId,
    supplierId,
    expectedDate,
    notes,
    items,
    createdById,
    submitImmediately = false,
  }: CreatePurchaseOrderDto) {
    if (!distributorId) throw new BadRequestException({ error: 'Thiếu thông tin Nhà phân phối (distributorId)' });
    if (!warehouseId) throw new BadRequestException({ error: 'Vui lòng chọn Kho nhận hàng' });

    if (submitImmediately && !supplierId) {
      throw new BadRequestException({ error: 'Vui lòng chọn Nhà cung cấp trước khi gửi đơn đặt hàng' });
    }

    const mergedItems = this.mergeAndValidateItems(items);

    const warehouse = await this.prisma.warehouse.findFirst({
      where: {
        id: BigInt(warehouseId),
        distributorId: BigInt(distributorId),
      },
    });
    if (!warehouse) throw new NotFoundException({ error: 'Kho nhận hàng không tồn tại hoặc không thuộc NPP này' });

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const poCode = `PO-${dateStr}-${randomSuffix}`;
    const resolvedExpectedDate = expectedDate ? new Date(expectedDate) : getDefaultDPlus3Date();
    const initialStatus = submitImmediately ? 'WAITING_RECEIVE' : 'DRAFT';

    return this.prisma.$transaction(async (tx: any) => {
      let order = await tx.purchaseOrder.create({
        data: {
          poCode,
          distributorId: BigInt(distributorId),
          warehouseId: BigInt(warehouseId),
          supplierId: supplierId ? BigInt(supplierId) : null,
          status: initialStatus,
          expectedDate: resolvedExpectedDate,
          notes: notes || null,
          createdById: createdById ? BigInt(createdById) : null,
          items: {
            create: mergedItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              quantityReceived: 0,
              unitPrice: item.unitPrice,
            })),
          },
        },
        include: {
          supplier: true,
          warehouse: true,
          items: { include: { product: true } },
        },
      });

      if (submitImmediately) {
        const trip = await this.ensureInboundDeliveryTripTx(tx, order);
        order = await tx.purchaseOrder.findUnique({
          where: { id: order.id },
          include: {
            supplier: true,
            warehouse: true,
            deliveryTrip: {
              include: { driver: { select: { id: true, fullName: true } } },
            },
            items: { include: { product: true }, orderBy: { id: 'asc' } },
          },
        });

        await tx.purchaseOrderStatusHistory.create({
          data: {
            purchaseOrderId: order.id,
            fromStatus: null,
            toStatus: 'WAITING_RECEIVE',
            changedById: createdById ? BigInt(createdById) : null,
            notes: `Tạo và gửi đơn đặt hàng cho NCC (Chuyến nhập kho ${trip.tripCode})`,
          },
        });
      } else {
        await tx.purchaseOrderStatusHistory.create({
          data: {
            purchaseOrderId: order.id,
            fromStatus: null,
            toStatus: 'DRAFT',
            changedById: createdById ? BigInt(createdById) : null,
            notes: 'Khởi tạo đơn đặt hàng mua (Nháp)',
          },
        });
      }

      return sanitizePurchaseOrder(order);
    });
  }

  /**
   * Service cập nhật PO khi còn ở trạng thái DRAFT (có thể kèm submitImmediately)
   */
  async updatePurchaseOrder(
    id: string | number | bigint,
    {
      distributorId,
      warehouseId,
      supplierId,
      expectedDate,
      notes,
      items,
      userId,
      submitImmediately = false,
    }: UpdatePurchaseOrderDto,
  ) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id: BigInt(id) },
      include: { items: true },
    });

    if (!order) throw new NotFoundException({ error: 'Không tìm thấy đơn đặt hàng mua' });
    if (distributorId && order.distributorId.toString() !== distributorId.toString()) {
      throw new ForbiddenException({ error: 'Bạn không có quyền chỉnh sửa đơn hàng này' });
    }

    if (order.status !== 'DRAFT') {
      throw new BadRequestException({
        error: `Không thể chỉnh sửa đơn hàng ở trạng thái "${order.status}". Chỉ cho phép sửa khi đơn ở trạng thái Nháp (DRAFT).`,
      });
    }

    const effectiveSupplierId = supplierId !== undefined ? supplierId : order.supplierId;
    if (submitImmediately && !effectiveSupplierId) {
      throw new BadRequestException({ error: 'Vui lòng chọn Nhà cung cấp trước khi gửi đơn đặt hàng' });
    }

    const mergedItems = items ? this.mergeAndValidateItems(items) : null;

    return this.prisma.$transaction(async (tx: any) => {
      if (mergedItems) {
        await tx.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId: order.id },
        });

        await tx.purchaseOrderItem.createMany({
          data: mergedItems.map((item) => ({
            purchaseOrderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            quantityReceived: 0,
            unitPrice: item.unitPrice,
          })),
        });
      }

      const updateData: any = {};
      if (warehouseId) updateData.warehouseId = BigInt(warehouseId);
      if (supplierId !== undefined) updateData.supplierId = supplierId ? BigInt(supplierId) : null;
      if (expectedDate !== undefined) updateData.expectedDate = expectedDate ? new Date(expectedDate) : null;
      if (notes !== undefined) updateData.notes = notes;
      if (submitImmediately) updateData.status = 'WAITING_RECEIVE';

      let updated = await tx.purchaseOrder.update({
        where: { id: order.id },
        data: updateData,
        include: {
          supplier: true,
          warehouse: true,
          items: { include: { product: true }, orderBy: { id: 'asc' } },
          statusHistory: true,
        },
      });

      if (submitImmediately) {
        const trip = await this.ensureInboundDeliveryTripTx(tx, updated);
        updated = await tx.purchaseOrder.findUnique({
          where: { id: order.id },
          include: {
            supplier: true,
            warehouse: true,
            deliveryTrip: {
              include: { driver: { select: { id: true, fullName: true } } },
            },
            items: { include: { product: true }, orderBy: { id: 'asc' } },
            statusHistory: true,
          },
        });

        await tx.purchaseOrderStatusHistory.create({
          data: {
            purchaseOrderId: order.id,
            fromStatus: 'DRAFT',
            toStatus: 'WAITING_RECEIVE',
            changedById: userId ? BigInt(userId) : null,
            notes: `Cập nhật và gửi đơn cho NCC (Chuyến nhập kho ${trip.tripCode})`,
          },
        });
      } else {
        await tx.purchaseOrderStatusHistory.create({
          data: {
            purchaseOrderId: order.id,
            fromStatus: 'DRAFT',
            toStatus: 'DRAFT',
            changedById: userId ? BigInt(userId) : null,
            notes: 'Chỉnh sửa nội dung đơn đặt hàng mua (Nháp)',
          },
        });
      }

      return sanitizePurchaseOrder(updated);
    });
  }

  /**
   * Service gửi PO cho NCC (DRAFT -> WAITING_RECEIVE) và tự động tạo Chuyến xe INBOUND (D+3)
   */
  async sendPurchaseOrderToSupplier(
    id: string | number | bigint,
    {
      distributorId,
      userId,
      notes,
    }: { distributorId?: string | number | bigint; userId?: string | number | bigint; notes?: string },
  ) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id: BigInt(id) },
      include: { items: { include: { product: true } } },
    });

    if (!order) throw new NotFoundException({ error: 'Không tìm thấy đơn đặt hàng mua' });
    if (distributorId && order.distributorId.toString() !== distributorId.toString()) {
      throw new ForbiddenException({ error: 'Bạn không có quyền thao tác trên đơn hàng này' });
    }

    if (order.status !== 'DRAFT') {
      throw new BadRequestException({
        error: `Đơn hàng đang ở trạng thái "${order.status}", không thể gửi cho Nhà cung cấp.`,
      });
    }

    if (!order.supplierId) {
      throw new BadRequestException({ error: 'Đơn hàng chưa chọn Nhà cung cấp, không thể gửi NCC' });
    }

    if (!order.items || order.items.length === 0) {
      throw new BadRequestException({ error: 'Đơn hàng chưa có sản phẩm nào, không thể gửi NCC' });
    }

    return this.prisma.$transaction(async (tx: any) => {
      await tx.purchaseOrder.update({
        where: { id: order.id },
        data: { status: 'WAITING_RECEIVE' },
      });

      const trip = await this.ensureInboundDeliveryTripTx(tx, order);

      const updated = await tx.purchaseOrder.findUnique({
        where: { id: order.id },
        include: {
          supplier: true,
          warehouse: true,
          deliveryTrip: {
            include: { driver: { select: { id: true, fullName: true } } },
          },
          items: { include: { product: true }, orderBy: { id: 'asc' } },
        },
      });

      await tx.purchaseOrderStatusHistory.create({
        data: {
          purchaseOrderId: order.id,
          fromStatus: 'DRAFT',
          toStatus: 'WAITING_RECEIVE',
          changedById: userId ? BigInt(userId) : null,
          notes:
            notes ||
            `Đã gửi đơn đặt hàng cho Nhà cung cấp, tự động lập chuyến nhập kho ${trip.tripCode}`,
        },
      });

      return sanitizePurchaseOrder(updated);
    });
  }

  /**
   * Service huỷ PO (DRAFT hoặc WAITING_RECEIVE) và đồng bộ hủy chuyến xe INBOUND nếu rỗng
   */
  async cancelPurchaseOrder(
    id: string | number | bigint,
    {
      distributorId,
      userId,
      reason,
    }: { distributorId?: string | number | bigint; userId?: string | number | bigint; reason: string },
  ) {
    if (!reason || !reason.trim()) {
      throw new BadRequestException({ error: 'Vui lòng nhập lý do huỷ đơn đặt hàng' });
    }

    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id: BigInt(id) },
      include: { items: true },
    });

    if (!order) throw new NotFoundException({ error: 'Không tìm thấy đơn đặt hàng mua' });
    if (distributorId && order.distributorId.toString() !== distributorId.toString()) {
      throw new ForbiddenException({ error: 'Bạn không có quyền thao tác trên đơn hàng này' });
    }

    if (order.status !== 'DRAFT' && order.status !== 'WAITING_RECEIVE') {
      throw new BadRequestException({
        error: `Không thể huỷ đơn hàng ở trạng thái "${order.status}". Đơn đã nhận hàng không được phép huỷ.`,
      });
    }

    const hasReceived = order.items.some((i: any) => Number(i.quantityReceived) > 0);
    if (hasReceived) {
      throw new BadRequestException({
        error: 'Đơn hàng đã nhận một số sản phẩm nhập kho, không thể huỷ đơn.',
      });
    }

    return this.prisma.$transaction(async (tx: any) => {
      const updated = await tx.purchaseOrder.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          cancelReason: reason.trim(),
        },
        include: {
          supplier: true,
          warehouse: true,
          deliveryTrip: {
            include: { driver: { select: { id: true, fullName: true } } },
          },
          items: { include: { product: true }, orderBy: { id: 'asc' } },
        },
      });

      if (order.deliveryTripId) {
        const otherActivePos = await tx.purchaseOrder.count({
          where: {
            deliveryTripId: order.deliveryTripId,
            id: { not: order.id },
            status: { not: 'CANCELLED' },
          },
        });
        if (otherActivePos === 0) {
          await tx.deliveryTrip.update({
            where: { id: order.deliveryTripId },
            data: {
              status: 'CANCELLED',
              closeNotes: `Tự động hủy do hủy đơn ${order.poCode}: ${reason.trim()}`,
            },
          });
        }
      }

      await tx.purchaseOrderStatusHistory.create({
        data: {
          purchaseOrderId: order.id,
          fromStatus: order.status,
          toStatus: 'CANCELLED',
          changedById: userId ? BigInt(userId) : null,
          notes: `Huỷ đơn đặt hàng: ${reason.trim()}`,
        },
      });

      return sanitizePurchaseOrder(updated);
    });
  }

  /**
   * Service nhận hàng nhập kho từ PO (WAITING_RECEIVE hoặc PARTIALLY_RECEIVED)
   */
  async receiveGoods(
    id: string | number | bigint,
    {
      distributorId,
      userId,
      items,
      notes,
    }: {
      distributorId?: string | number | bigint;
      userId?: string | number | bigint;
      items: Array<{
        itemId?: string | number | bigint;
        poItemId?: string | number | bigint;
        quantityReceived?: number;
        quantityReceivedNow?: number;
        lotNumber?: string;
        manufactureDate?: string | Date;
        expiryDate?: string | Date;
        locationCode?: string;
      }>;
      notes?: string;
    },
  ) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id: BigInt(id) },
      include: { items: { include: { product: true } } },
    });

    if (!order) throw new NotFoundException({ error: 'Không tìm thấy đơn đặt hàng mua' });
    if (distributorId && order.distributorId.toString() !== distributorId.toString()) {
      throw new ForbiddenException({ error: 'Bạn không có quyền thao tác trên đơn hàng này' });
    }

    if (order.status !== 'WAITING_RECEIVE' && order.status !== 'PARTIALLY_RECEIVED') {
      throw new BadRequestException({
        error: `Đơn hàng ở trạng thái "${order.status}" không thể nhận hàng nhập kho.`,
      });
    }

    const poItemsMap = new Map<string, any>();
    for (const item of order.items) {
      poItemsMap.set(item.id.toString(), {
        ...item,
        purchaseOrderId: order.id,
      });
    }

    const normalizedLines = normalizeAndValidateReceiveLines(items, poItemsMap);

    return this.prisma.$transaction(async (tx: any) => {
      const txResult = await executeReceiveLinesInTx({
        tx,
        warehouseId: order.warehouseId,
        userId,
        lines: normalizedLines,
        poItemsMap,
        historyNotePrefix: 'Nhận hàng nhập kho',
        customNotes: notes,
      });

      const updatedOrder = txResult.updatedOrders[0];
      return sanitizePurchaseOrder(updatedOrder);
    });
  }

  /**
   * Service đóng PO dù thiếu hàng (PARTIALLY_RECEIVED -> COMPLETED) và đồng bộ Chuyến xe
   */
  async closePartialPurchaseOrder(
    id: string | number | bigint,
    {
      distributorId,
      userId,
      reason,
    }: { distributorId?: string | number | bigint; userId?: string | number | bigint; reason: string },
  ) {
    if (!reason || !reason.trim()) {
      throw new BadRequestException({ error: 'Vui lòng nhập lý do đóng đơn hàng' });
    }

    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id: BigInt(id) },
    });

    if (!order) throw new NotFoundException({ error: 'Không tìm thấy đơn đặt hàng mua' });
    if (distributorId && order.distributorId.toString() !== distributorId.toString()) {
      throw new ForbiddenException({ error: 'Bạn không có quyền thao tác trên đơn hàng này' });
    }

    if (order.status !== 'PARTIALLY_RECEIVED') {
      throw new BadRequestException({
        error: `Không thể đóng đơn ở trạng thái "${order.status}". Chỉ áp dụng cho đơn "Đã nhận một phần".`,
      });
    }

    return this.prisma.$transaction(async (tx: any) => {
      const updated = await tx.purchaseOrder.update({
        where: { id: order.id },
        data: {
          status: 'COMPLETED',
          closeReason: reason.trim(),
        },
        include: {
          supplier: true,
          warehouse: true,
          deliveryTrip: {
            include: { driver: { select: { id: true, fullName: true } } },
          },
          items: { include: { product: true }, orderBy: { id: 'asc' } },
        },
      });

      if (order.deliveryTripId) {
        const tripOrders = await tx.purchaseOrder.findMany({
          where: {
            deliveryTripId: order.deliveryTripId,
            status: { not: 'CANCELLED' },
          },
        });
        const allCompleted = tripOrders.length > 0 && tripOrders.every((p: any) => p.status === 'COMPLETED');
        if (allCompleted) {
          await tx.deliveryTrip.update({
            where: { id: order.deliveryTripId },
            data: { status: 'COMPLETED', completedTime: new Date() },
          });
        }
      }

      await tx.purchaseOrderStatusHistory.create({
        data: {
          purchaseOrderId: order.id,
          fromStatus: 'PARTIALLY_RECEIVED',
          toStatus: 'COMPLETED',
          changedById: userId ? BigInt(userId) : null,
          notes: `Đóng đơn dù thiếu hàng: ${reason.trim()}`,
        },
      });

      return sanitizePurchaseOrder(updated);
    });
  }

  /**
   * Service lấy danh sách chênh lệch nhận hàng
   */
  async getPurchaseOrderDiscrepancies(distributorId?: string | number | bigint, filters: PurchaseOrderFilters = {}) {
    const discrepancies = await this.purchaseOrderRepo.findPurchaseOrderDiscrepancies(distributorId, filters);
    return discrepancies.map(sanitizePurchaseOrder);
  }

  /**
   * Service xuất Excel danh sách PO với 2 Sheet (Tổng quan & Chi tiết mặt hàng)
   */
  async exportPurchaseOrdersExcel(distributorId?: string | number | bigint, filters: PurchaseOrderFilters = {}) {
    const orders = await this.purchaseOrderRepo.findAllPurchaseOrdersForExport(distributorId, filters);
    const sanitized = orders.map(sanitizePurchaseOrder);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'DMS-NPP System';
    workbook.created = new Date();

    const sheetSummary = workbook.addWorksheet('Danh sách PO');
    sheetSummary.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Mã PO', key: 'poCode', width: 20 },
      { header: 'Ngày tạo', key: 'createdAt', width: 14 },
      { header: 'Ngày dự kiến', key: 'expectedDate', width: 14 },
      { header: 'Nhà cung cấp', key: 'supplierName', width: 35 },
      { header: 'Kho nhận hàng', key: 'warehouseName', width: 25 },
      { header: 'Tổng SL đặt', key: 'totalOrderedQty', width: 14 },
      { header: 'Tổng SL nhận', key: 'totalReceivedQty', width: 14 },
      { header: '% Đã nhận', key: 'percentReceived', width: 12 },
      { header: 'Tổng tiền đặt (VNĐ)', key: 'totalAmount', width: 22 },
      { header: 'Trạng thái', key: 'statusText', width: 18 },
      { header: 'Ghi chú / Lý do', key: 'notes', width: 30 },
    ];

    sheetSummary.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheetSummary.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' },
    };
    sheetSummary.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    const getStatusLabel = (st: string) => {
      switch (st) {
        case 'DRAFT':
          return 'Nháp';
        case 'WAITING_RECEIVE':
          return 'Đã gửi NCC';
        case 'PARTIALLY_RECEIVED':
          return 'Đã nhận một phần';
        case 'COMPLETED':
          return 'Hoàn tất';
        case 'CANCELLED':
          return 'Đã huỷ';
        default:
          return st;
      }
    };

    sanitized.forEach((po: any, index: number) => {
      sheetSummary.addRow({
        stt: index + 1,
        poCode: po.poCode,
        createdAt: new Date(po.createdAt).toLocaleDateString('vi-VN'),
        expectedDate: po.expectedDate ? new Date(po.expectedDate).toLocaleDateString('vi-VN') : '',
        supplierName: po.supplier?.name || 'Chưa chọn',
        warehouseName: po.warehouse?.name || '',
        totalOrderedQty: po.metrics.totalOrderedQty,
        totalReceivedQty: po.metrics.totalReceivedQty,
        percentReceived: `${po.metrics.receivedPercentage}%`,
        totalAmount: po.metrics.totalAmount,
        statusText: getStatusLabel(po.status),
        notes: po.cancelReason || po.closeReason || po.notes || '',
      });
    });

    const sheetDetails = workbook.addWorksheet('Chi tiết mặt hàng PO');
    sheetDetails.columns = [
      { header: 'Mã PO', key: 'poCode', width: 20 },
      { header: 'Nhà cung cấp', key: 'supplierName', width: 30 },
      { header: 'Mã SKU', key: 'sku', width: 15 },
      { header: 'Tên sản phẩm', key: 'productName', width: 35 },
      { header: 'ĐVT', key: 'unit', width: 10 },
      { header: 'SL đặt mua', key: 'quantity', width: 14 },
      { header: 'SL thực nhận', key: 'quantityReceived', width: 14 },
      { header: 'Chênh lệch', key: 'discrepancy', width: 14 },
      { header: 'Đơn giá (VNĐ)', key: 'unitPrice', width: 16 },
      { header: 'Thành tiền (VNĐ)', key: 'lineTotal', width: 20 },
      { header: 'Trạng thái dòng', key: 'lineStatus', width: 18 },
    ];

    sheetDetails.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheetDetails.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0D9488' },
    };
    sheetDetails.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    sanitized.forEach((po: any) => {
      po.items.forEach((item: any) => {
        const diff = item.quantityReceived - item.quantity;
        let lineStatus = 'Chưa nhận';
        if (item.quantityReceived >= item.quantity) {
          lineStatus = diff > 0 ? 'Nhận thừa' : 'Đã nhận đủ';
        } else if (item.quantityReceived > 0) {
          lineStatus = 'Nhận thiếu';
        }

        sheetDetails.addRow({
          poCode: po.poCode,
          supplierName: po.supplier?.name || '',
          sku: item.product?.sku || '',
          productName: item.product?.name || '',
          unit: item.product?.unit || '',
          quantity: item.quantity,
          quantityReceived: item.quantityReceived,
          discrepancy: diff,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          lineStatus,
        });
      });
    });

    return workbook;
  }
}

// Standalone functions for backward compatibility
export const getPurchaseOrdersService = async (distributorId?: string | number | bigint, filters: PurchaseOrderFilters = {}) => {
  const repo = new PurchaseOrderRepository(prisma as any);
  const service = new PurchaseOrderService(prisma as any, repo);
  return service.getPurchaseOrders(distributorId, filters);
};

export const getPurchaseOrderByIdService = async (id: string | number | bigint, distributorId?: string | number | bigint) => {
  const repo = new PurchaseOrderRepository(prisma as any);
  const service = new PurchaseOrderService(prisma as any, repo);
  return service.getPurchaseOrderById(id, distributorId);
};

export const createPurchaseOrderService = async (payload: CreatePurchaseOrderDto) => {
  const repo = new PurchaseOrderRepository(prisma as any);
  const service = new PurchaseOrderService(prisma as any, repo);
  return service.createPurchaseOrder(payload);
};

export const updatePurchaseOrderService = async (id: string | number | bigint, payload: UpdatePurchaseOrderDto) => {
  const repo = new PurchaseOrderRepository(prisma as any);
  const service = new PurchaseOrderService(prisma as any, repo);
  return service.updatePurchaseOrder(id, payload);
};

export const sendPurchaseOrderToSupplierService = async (
  id: string | number | bigint,
  payload: { distributorId?: string | number | bigint; userId?: string | number | bigint; notes?: string },
) => {
  const repo = new PurchaseOrderRepository(prisma as any);
  const service = new PurchaseOrderService(prisma as any, repo);
  return service.sendPurchaseOrderToSupplier(id, payload);
};

export const cancelPurchaseOrderService = async (
  id: string | number | bigint,
  payload: { distributorId?: string | number | bigint; userId?: string | number | bigint; reason: string },
) => {
  const repo = new PurchaseOrderRepository(prisma as any);
  const service = new PurchaseOrderService(prisma as any, repo);
  return service.cancelPurchaseOrder(id, payload);
};

export const receiveGoodsService = async (
  id: string | number | bigint,
  payload: {
    distributorId?: string | number | bigint;
    userId?: string | number | bigint;
    items: Array<{
      itemId: string | number | bigint;
      quantityReceived: number;
      lotNumber?: string;
      manufactureDate?: string | Date;
      expiryDate?: string | Date;
      locationCode?: string;
    }>;
    notes?: string;
  },
) => {
  const repo = new PurchaseOrderRepository(prisma as any);
  const service = new PurchaseOrderService(prisma as any, repo);
  return service.receiveGoods(id, payload);
};

export const closePartialPurchaseOrderService = async (
  id: string | number | bigint,
  payload: { distributorId?: string | number | bigint; userId?: string | number | bigint; reason: string },
) => {
  const repo = new PurchaseOrderRepository(prisma as any);
  const service = new PurchaseOrderService(prisma as any, repo);
  return service.closePartialPurchaseOrder(id, payload);
};

export const getPurchaseOrderDiscrepanciesService = async (distributorId?: string | number | bigint, filters: PurchaseOrderFilters = {}) => {
  const repo = new PurchaseOrderRepository(prisma as any);
  const service = new PurchaseOrderService(prisma as any, repo);
  return service.getPurchaseOrderDiscrepancies(distributorId, filters);
};

export const exportPurchaseOrdersExcelService = async (distributorId?: string | number | bigint, filters: PurchaseOrderFilters = {}) => {
  const repo = new PurchaseOrderRepository(prisma as any);
  const service = new PurchaseOrderService(prisma as any, repo);
  return service.exportPurchaseOrdersExcel(distributorId, filters);
};
