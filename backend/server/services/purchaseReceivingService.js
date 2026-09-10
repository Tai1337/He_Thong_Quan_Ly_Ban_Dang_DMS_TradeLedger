import prisma from '../config/prisma.js';
import {
  findInboundDeliveryTrips,
  findInboundTripById,
  findInboundTripForReceiving
} from '../repositories/purchaseReceivingRepository.js';

const formatNumber = (num) => Number(num || 0);

// Helper sinh mã giao dịch nhập kho
const generateTxnCode = () => {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `TXN-IN-${datePart}-${randomPart}`;
};

/**
 * Lấy danh sách các chuyến xe INBOUND (Hàng NCC về NPP) đến ngày giao dự kiến (D+3)
 */
export const getInboundDeliveryTripsService = async (distributorId = 1, filters = {}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { total, trips, page, limit } = await findInboundDeliveryTrips(distributorId, filters);

  const sanitizedTrips = trips.map(trip => {
    let totalOrderedQty = 0;
    let totalReceivedQty = 0;
    let totalItemsCount = 0;
    const poList = [];

    (trip.purchaseOrders || []).forEach(po => {
      poList.push({
        id: po.id.toString(),
        poCode: po.poCode,
        status: po.status
      });

      (po.items || []).forEach(item => {
        totalItemsCount += 1;
        totalOrderedQty += formatNumber(item.quantity);
        totalReceivedQty += formatNumber(item.quantityReceived);
      });
    });

    const expDate = trip.expectedDeliveryDate ? new Date(trip.expectedDeliveryDate) : null;
    const isDue = expDate ? expDate <= today : false;
    const percent = totalOrderedQty > 0 
      ? Math.min(100, Math.round((totalReceivedQty / totalOrderedQty) * 100))
      : 0;

    return {
      id: trip.id.toString(),
      tripCode: trip.tripCode,
      tripType: trip.tripType,
      status: trip.status,
      expectedDeliveryDate: trip.expectedDeliveryDate ? trip.expectedDeliveryDate.toISOString().slice(0, 10) : null,
      isDueForReceiving: isDue,
      createdAt: trip.createdAt,
      supplier: trip.supplier ? {
        id: trip.supplier.id.toString(),
        code: trip.supplier.code,
        name: trip.supplier.name,
        phone: trip.supplier.phone
      } : null,
      warehouse: trip.warehouse ? {
        id: trip.warehouse.id.toString(),
        code: trip.warehouse.code,
        name: trip.warehouse.name
      } : null,
      driver: trip.driver ? {
        id: trip.driver.id.toString(),
        fullName: trip.driver.fullName
      } : null,
      purchaseOrders: poList,
      metrics: {
        totalItemsCount,
        totalOrderedQty,
        totalReceivedQty,
        remainingQty: Math.max(0, totalOrderedQty - totalReceivedQty),
        receivingPercentage: percent
      }
    };
  });

  return {
    data: sanitizedTrips,
    total,
    page: Number(page),
    limit: Number(limit)
  };
};

/**
 * Lấy thông tin chi tiết 1 Chuyến xe hàng về và các mặt hàng cần nhập kho
 */
export const getInboundTripDetailService = async (tripId, distributorId = 1) => {
  const trip = await findInboundTripById(tripId, distributorId);

  if (!trip) return null;

  // Tập hợp danh sách các sản phẩm từ tất cả PO trong chuyến xe
  const itemsToReceive = [];
  (trip.purchaseOrders || []).forEach(po => {
    (po.items || []).forEach(it => {
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
        quantityRemaining: remaining
      });
    });
  });

  return {
    id: trip.id.toString(),
    tripCode: trip.tripCode,
    tripType: trip.tripType,
    status: trip.status,
    expectedDeliveryDate: trip.expectedDeliveryDate ? trip.expectedDeliveryDate.toISOString().slice(0, 10) : null,
    supplier: trip.supplier ? {
      id: trip.supplier.id.toString(),
      name: trip.supplier.name,
      code: trip.supplier.code
    } : null,
    warehouse: trip.warehouse ? {
      id: trip.warehouse.id.toString(),
      name: trip.warehouse.name
    } : null,
    items: itemsToReceive
  };
};

/**
 * Thực hiện Nhập kho theo Chuyến xe:
 * - Cập nhật số lượng thực nhận cho từng sản phẩm
 * - Tạo / Cập nhật StockLot (Số lô, HSD, NSX)
 * - Tăng tồn kho thực tế trong StockBalance
 * - Ghi InventoryTransaction (Direction: IN)
 * - Đánh giá hoàn tất PO và Chuyến xe
 */
export const receiveTripGoodsService = async ({ tripId, distributorId = 1, receivedItems = [], userId = null }) => {
  const trip = await findInboundTripForReceiving(tripId, distributorId);

  if (!trip) throw new Error('Không tìm thấy chuyến xe hàng về');
  if (!receivedItems || receivedItems.length === 0) {
    throw new Error('Vui lòng nhập số lượng nhận cho ít nhất một sản phẩm');
  }

  const warehouseId = trip.warehouseId;
  const today = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const processedItems = [];
    const affectedPoIds = new Set();

    for (const row of receivedItems) {
      const receiveQty = Number(row.quantityReceivedNow || 0);
      if (receiveQty <= 0) continue; // Bỏ qua nếu không nhận mặt hàng này trong đợt

      const poItemId = BigInt(row.poItemId);
      const poItem = await tx.purchaseOrderItem.findUnique({
        where: { id: poItemId },
        include: { purchaseOrder: true }
      });

      if (!poItem) throw new Error(`Không tìm thấy dòng đặt hàng ID ${row.poItemId}`);

      const poId = poItem.purchaseOrderId;
      affectedPoIds.add(poId);

      // 1. Cập nhật quantityReceived trong PurchaseOrderItem
      const newReceived = formatNumber(poItem.quantityReceived) + receiveQty;
      await tx.purchaseOrderItem.update({
        where: { id: poItemId },
        data: { quantityReceived: newReceived }
      });

      // 2. Xử lý Lô hàng (StockLot)
      const lotNumber = (row.lotNumber || `LOT-${today.toISOString().slice(0, 10).replace(/-/g, '')}`).trim();
      let mfgDate = row.mfgDate ? new Date(row.mfgDate) : new Date(today);
      let expDate = row.expDate ? new Date(row.expDate) : null;
      if (!expDate) {
        // Mặc định HSD 12 tháng kể từ NSX nếu không nhập
        expDate = new Date(mfgDate);
        expDate.setMonth(expDate.getMonth() + 12);
      }

      // Upsert StockLot
      let stockLot = await tx.stockLot.findFirst({
        where: {
          productId: poItem.productId,
          warehouseId: warehouseId,
          lotNumber: lotNumber
        }
      });

      if (!stockLot) {
        stockLot = await tx.stockLot.create({
          data: {
            productId: poItem.productId,
            warehouseId: warehouseId,
            lotNumber: lotNumber,
            manufactureDate: mfgDate,
            expiryDate: expDate,
            status: 'GOOD'
          }
        });
      }

      // 3. Cập nhật Tồn kho (StockBalance)
      const balance = await tx.stockBalance.findUnique({
        where: { lotId: stockLot.id }
      });

      if (balance) {
        await tx.stockBalance.update({
          where: { lotId: stockLot.id },
          data: {
            quantityOnHand: { increment: receiveQty }
          }
        });
      } else {
        await tx.stockBalance.create({
          data: {
            lotId: stockLot.id,
            quantityOnHand: receiveQty,
            quantityReserved: 0
          }
        });
      }

      // 4. Tạo giao dịch nhập kho InventoryTransaction (Direction: IN)
      const txn = await tx.inventoryTransaction.create({
        data: {
          transactionCode: generateTxnCode(),
          direction: 'IN',
          lotId: stockLot.id,
          warehouseId: warehouseId,
          quantity: receiveQty,
          unitPrice: poItem.unitPrice,
          referenceType: 'PURCHASE_ORDER',
          referenceId: poId,
          createdById: userId ? BigInt(userId) : null
        }
      });

      processedItems.push({
        poItemId: poItemId.toString(),
        productId: poItem.productId.toString(),
        quantityReceivedNow: receiveQty,
        lotNumber,
        transactionCode: txn.transactionCode
      });
    }

    // 5. Cập nhật trạng thái cho từng PurchaseOrder liên quan
    for (const poId of affectedPoIds) {
      const allItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: poId }
      });

      const allCompleted = allItems.every(it => formatNumber(it.quantityReceived) >= formatNumber(it.quantity));
      const hasAnyReceived = allItems.some(it => formatNumber(it.quantityReceived) > 0);

      const newPoStatus = allCompleted ? 'COMPLETED' : (hasAnyReceived ? 'PARTIALLY_RECEIVED' : 'WAITING_RECEIVE');

      await tx.purchaseOrder.update({
        where: { id: poId },
        data: { status: newPoStatus }
      });

      await tx.purchaseOrderStatusHistory.create({
        data: {
          purchaseOrderId: poId,
          toStatus: newPoStatus,
          changedById: userId ? BigInt(userId) : null,
          notes: `Nhập kho từ chuyến xe ${trip.tripCode}: đã nhận ${processedItems.length} mặt hàng.`
        }
      });
    }

    // 6. Cập nhật trạng thái chuyến xe DeliveryTrip
    const checkPoStatus = await tx.purchaseOrder.findMany({
      where: { deliveryTripId: trip.id }
    });

    const isAllPoCompleted = checkPoStatus.every(p => p.status === 'COMPLETED');
    const newTripStatus = isAllPoCompleted ? 'COMPLETED' : 'SHIPPING';

    const updatedTrip = await tx.deliveryTrip.update({
      where: { id: trip.id },
      data: { status: newTripStatus }
    });

    return {
      updatedTripStatus: updatedTrip.status,
      processedItemsCount: processedItems.length,
      processedItems
    };
  });

  return {
    success: true,
    message: `Đã hoàn tất nhập kho cho chuyến xe ${trip.tripCode}. Tồn kho đã được ghi nhận vào hệ thống.`,
    ...result
  };
};
