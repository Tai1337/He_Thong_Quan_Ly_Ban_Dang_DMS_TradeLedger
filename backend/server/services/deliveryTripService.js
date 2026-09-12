import prisma from '../config/prisma.js';
import {
  findDeliveryTrips,
  findDeliveryTripById,
  findAllocatedOrdersForDispatch,
  createDeliveryTripRecord,
  updateDeliveryTripRecord
} from '../repositories/deliveryTripRepository.js';

const DEFAULT_PRODUCT_WEIGHT = 10.0; // Mặc định 10kg/thùng nếu sản phẩm chưa nhập weightKg

const formatNumber = (num) => Number(num || 0);

// Helper sinh mã chuyến xe
const generateTripCode = () => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TRIP-${dateStr}-${rand}`;
};

/**
 * Tính tổng trọng lượng (kg) của một đơn hàng dựa trên số lượng thùng và weightKg của sản phẩm
 */
export const calculateOrderWeight = (order) => {
  if (!order || !order.items) return 0;
  return order.items.reduce((total, item) => {
    const qty = formatNumber(item.quantity);
    const weight = formatNumber(item.product?.weightKg) || DEFAULT_PRODUCT_WEIGHT;
    return total + (qty * weight);
  }, 0);
};

/**
 * 1. Lấy danh sách chuyến xe với thông số tải trọng và tỷ lệ lấp đầy
 */
export const getDeliveryTripsService = async ({
  distributorId = 1,
  status,
  tripType,
  warehouseId,
  search,
  page = 1,
  limit = 15
}) => {
  const { total, trips, page: currPage, limit: currLimit } = await findDeliveryTrips({
    distributorId,
    status,
    tripType,
    warehouseId,
    search,
    page,
    limit
  });

  const sanitized = trips.map(trip => {
    const maxWeight = formatNumber(trip.maxWeightKg) || 1500;
    
    // Tính lại trọng lượng thực tế từ các đơn hàng đã gán
    let calculatedWeight = 0;
    let totalItems = 0;
    (trip.salesOrders || []).forEach(order => {
      calculatedWeight += calculateOrderWeight(order);
      totalItems += (order.items || []).reduce((sum, it) => sum + formatNumber(it.quantity), 0);
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
      driver: trip.driver ? {
        id: trip.driver.id.toString(),
        fullName: trip.driver.fullName,
        phone: trip.driver.phone || ''
      } : null,
      warehouse: trip.warehouse ? {
        id: trip.warehouse.id.toString(),
        code: trip.warehouse.code,
        name: trip.warehouse.name
      } : null,
      supplier: trip.supplier ? {
        id: trip.supplier.id.toString(),
        code: trip.supplier.code,
        name: trip.supplier.name
      } : null,
      ordersCount: (trip.salesOrders || []).length + (trip.purchaseOrders || []).length,
      totalPackagesCount: totalItems
    };
  });

  return {
    data: sanitized,
    total,
    page: currPage,
    limit: currLimit
  };
};

/**
 * 2. Lấy chi tiết chuyến xe kèm danh sách đơn hàng và thông số lô hàng
 */
export const getDeliveryTripDetailService = async (tripId, distributorId = 1) => {
  const trip = await findDeliveryTripById(tripId, distributorId);
  if (!trip) return null;

  const maxWeight = formatNumber(trip.maxWeightKg) || 1500;
  let totalCalculatedWeight = 0;
  let totalPackages = 0;

  const orders = (trip.salesOrders || []).map(order => {
    const orderWeight = calculateOrderWeight(order);
    totalCalculatedWeight += orderWeight;

    const items = (order.items || []).map(it => {
      const itemQty = formatNumber(it.quantity);
      totalPackages += itemQty;
      const unitWeight = formatNumber(it.product?.weightKg) || DEFAULT_PRODUCT_WEIGHT;

      // Chi tiết các lô hàng phân bổ cho mặt hàng này
      const lotAllocations = (it.allocations || []).map(alloc => ({
        id: alloc.id.toString(),
        lotNumber: alloc.stockLot?.lotNumber || 'N/A',
        quantityAllocated: formatNumber(alloc.quantity),
        expiryDate: alloc.stockLot?.expiryDate ? alloc.stockLot.expiryDate.toISOString().slice(0, 10) : null,
        locationCode: alloc.stockLot?.locationCode || 'Mặc định'
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
        allocations: lotAllocations
      };
    });

    return {
      id: order.id.toString(),
      orderCode: order.orderCode,
      status: order.status,
      deliveryNotes: order.deliveryNotes || '',
      orderWeightKg: Math.round(orderWeight * 10) / 10,
      retailer: order.retailer ? {
        id: order.retailer.id.toString(),
        name: order.retailer.name,
        code: order.retailer.code,
        address: order.retailer.address || '',
        phone: order.retailer.phone || ''
      } : null,
      items
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
    driver: trip.driver ? {
      id: trip.driver.id.toString(),
      fullName: trip.driver.fullName,
      phone: trip.driver.phone || ''
    } : null,
    warehouse: trip.warehouse ? {
      id: trip.warehouse.id.toString(),
      code: trip.warehouse.code,
      name: trip.warehouse.name
    } : null,
    orders,
    summary: {
      totalOrders: orders.length,
      totalPackages,
      currentWeightKg: currentWeight,
      maxWeightKg: maxWeight,
      loadPercentage,
      remainingCapacityKg: Math.max(0, Math.round((maxWeight - currentWeight) * 10) / 10)
    }
  };
};

/**
 * 3. Lấy danh sách các đơn hàng ALLOCATED sẵn sàng xếp lên xe kèm thông số cân nặng và số lô
 */
export const getDispatchableOrdersService = async (distributorId = 1, warehouseId = null) => {
  const orders = await findAllocatedOrdersForDispatch(distributorId, warehouseId);

  return orders.map(order => {
    const orderWeight = calculateOrderWeight(order);
    const totalPackages = (order.items || []).reduce((acc, it) => acc + formatNumber(it.quantity), 0);

    // Thu thập tóm tắt số lô
    const lotSummarySet = new Set();
    (order.items || []).forEach(it => {
      (it.allocations || []).forEach(alloc => {
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
        phone: order.retailer?.phone || ''
      },
      totalPackages,
      orderWeightKg: Math.round(orderWeight * 10) / 10,
      lotNumbers: Array.from(lotSummarySet),
      createdAt: order.createdAt
    };
  });
};

/**
 * 4. Tạo chuyến xe OUTBOUND mới
 */
export const createDeliveryTripService = async ({
  distributorId = 1,
  warehouseId,
  driverId,
  licensePlate,
  maxWeightKg = 1500,
  expectedDeliveryDate,
  notes
}) => {
  if (!warehouseId) {
    throw new Error('Vui lòng chọn kho xuất hàng');
  }

  const tripCode = generateTripCode();
  const maxWeight = Number(maxWeightKg) || 1500;

  const newTrip = await createDeliveryTripRecord({
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
    notes: notes ? notes.trim() : null
  });

  return {
    id: newTrip.id.toString(),
    tripCode: newTrip.tripCode,
    message: `Đã khởi tạo chuyến xe ${newTrip.tripCode} thành công`
  };
};

/**
 * 5. Đưa các đơn hàng lên chuyến xe (Dispatch Orders) kèm kiểm tra tải trọng và lô hàng
 */
export const dispatchOrdersToTripService = async ({
  tripId,
  distributorId = 1,
  orderIds = [],
  changedById = null
}) => {
  if (!orderIds || orderIds.length === 0) {
    throw new Error('Vui lòng chọn ít nhất 1 đơn hàng để xếp lên xe');
  }

  return prisma.$transaction(async (tx) => {
    const trip = await tx.deliveryTrip.findFirst({
      where: {
        id: BigInt(tripId),
        distributorId: BigInt(distributorId)
      },
      include: {
        driver: true,
        salesOrders: {
          include: {
            items: {
              include: { product: true }
            }
          }
        }
      }
    });

    if (!trip) throw new Error('Không tìm thấy chuyến xe vận chuyển');
    if (trip.status === 'SHIPPING') {
      throw new Error('Chuyến xe đang trên đường giao hàng (SHIPPING), không thể xếp thêm đơn');
    }
    if (trip.status === 'COMPLETED' || trip.status === 'CLOSED' || trip.status === 'CANCELLED') {
      throw new Error(`Chuyến xe đã ở trạng thái ${trip.status}, không thể xếp thêm đơn hàng`);
    }

    // Tính trọng lượng hiện tại trên xe
    let existingWeight = 0;
    (trip.salesOrders || []).forEach(o => {
      existingWeight += calculateOrderWeight(o);
    });

    // Lấy thông tin các đơn hàng cần xếp
    const ordersToDispatch = await tx.salesOrder.findMany({
      where: {
        id: { in: orderIds.map(id => BigInt(id)) },
        distributorId: BigInt(distributorId)
      },
      include: {
        retailer: true,
        items: {
          include: {
            product: true,
            allocations: {
              include: { stockLot: true }
            }
          }
        }
      }
    });

    if (ordersToDispatch.length !== orderIds.length) {
      throw new Error('Một số đơn hàng được chọn không hợp lệ hoặc không thuộc NPP này');
    }

    // Kiểm tra ràng buộc từng đơn hàng
    let addedWeight = 0;
    for (const order of ordersToDispatch) {
      if (order.warehouseId.toString() !== trip.warehouseId.toString()) {
        throw new Error(`Đơn hàng ${order.orderCode} thuộc kho khác với kho của chuyến xe`);
      }
      if (order.status !== 'ALLOCATED') {
        throw new Error(`Đơn hàng ${order.orderCode} không ở trạng thái "Chờ giao" (ALLOCATED). Trạng thái: ${order.status}`);
      }
      if (order.deliveryTripId && order.deliveryTripId.toString() !== trip.id.toString()) {
        throw new Error(`Đơn hàng ${order.orderCode} đã được gán vào chuyến xe khác`);
      }

      addedWeight += calculateOrderWeight(order);
    }

    const totalWeightAfterAdd = existingWeight + addedWeight;
    const maxCapacity = formatNumber(trip.maxWeightKg) || 1500;

    // Ràng buộc tải trọng xe: Cảnh báo nghiêm ngặt nếu quá tải > 10%
    if (totalWeightAfterAdd > maxCapacity * 1.1) {
      throw new Error(
        `Xếp đơn không thành công: Tổng trọng lượng (${Math.round(totalWeightAfterAdd)} kg) vượt quá tải trọng xe cho phép (${maxCapacity} kg). Vui lòng chọn xe tải trọng lớn hơn hoặc giảm bớt đơn hàng.`
      );
    }

    // Gán deliveryTripId vào từng đơn hàng và ghi log
    for (const order of ordersToDispatch) {
      await tx.salesOrder.update({
        where: { id: order.id },
        data: {
          deliveryTripId: trip.id
        }
      });

      await tx.orderStatusHistory.create({
        data: {
          salesOrderId: order.id,
          fromStatus: 'ALLOCATED',
          toStatus: 'ALLOCATED',
          changedById: changedById ? BigInt(changedById) : null,
          notes: `Đã xếp lên xe tải [${trip.licensePlate || trip.tripCode}] - Trọng lượng đơn: ${Math.round(calculateOrderWeight(order))} kg.`
        }
      });
    }

    // Cập nhật currentWeightKg cho chuyến xe
    await tx.deliveryTrip.update({
      where: { id: trip.id },
      data: {
        currentWeightKg: totalWeightAfterAdd
      }
    });

    return {
      success: true,
      message: `Đã xếp ${ordersToDispatch.length} đơn hàng lên chuyến xe ${trip.tripCode}. Tổng tải trọng hiện tại: ${Math.round(totalWeightAfterAdd)} / ${maxCapacity} kg.`,
      currentWeightKg: Math.round(totalWeightAfterAdd),
      maxWeightKg: maxCapacity
    };
  });
};

/**
 * 6. Gỡ đơn hàng khỏi chuyến xe (Unassign)
 * QUY TẮC: Khi xe đang ở trạng thái SHIPPING hoặc COMPLETED, KHÔNG ĐƯỢC PHÉP GỠ ĐƠN!
 */
export const removeOrderFromTripService = async ({
  tripId,
  orderId,
  distributorId = 1,
  changedById = null,
  reason = 'Điều chuyển sang chuyến xe khác'
}) => {
  return prisma.$transaction(async (tx) => {
    const trip = await tx.deliveryTrip.findFirst({
      where: {
        id: BigInt(tripId),
        distributorId: BigInt(distributorId)
      }
    });

    if (!trip) throw new Error('Không tìm thấy chuyến xe vận chuyển');

    // Chặn gỡ đơn khi xe đang giao hoặc đã hoàn tất
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
        deliveryTripId: BigInt(tripId)
      },
      include: {
        deliveryTrip: true,
        items: { include: { product: true } }
      }
    });

    if (!order) throw new Error('Không tìm thấy đơn hàng trong chuyến xe này');
    if (order.status === 'SHIPPED') {
      throw new Error('Đơn hàng đang trong trạng thái vận chuyển (SHIPPED), không thể gỡ khỏi chuyến xe!');
    }
    if (order.status === 'DELIVERED' || order.status === 'COMPLETED' || order.status === 'DELIVERY_FAILED') {
      throw new Error(`Đơn hàng đã hoàn tất (${order.status}), không thể gỡ khỏi chuyến xe`);
    }

    const orderWeight = calculateOrderWeight(order);

    // Gỡ khỏi chuyến xe
    await tx.salesOrder.update({
      where: { id: order.id },
      data: {
        deliveryTripId: null,
        status: 'ALLOCATED'
      }
    });

    // Cập nhật lại tải trọng chuyến xe
    const newWeight = Math.max(0, formatNumber(trip.currentWeightKg) - orderWeight);
    await tx.deliveryTrip.update({
      where: { id: trip.id },
      data: { currentWeightKg: newWeight }
    });

    await tx.orderStatusHistory.create({
      data: {
        salesOrderId: order.id,
        fromStatus: order.status,
        toStatus: 'ALLOCATED',
        changedById: changedById ? BigInt(changedById) : null,
        reason,
        notes: `Gỡ khỏi chuyến xe [${trip.tripCode}], giảm tải ${Math.round(orderWeight)} kg.`
      }
    });

    return {
      success: true,
      message: `Đã gỡ đơn hàng ${order.orderCode} khỏi chuyến xe`,
      newWeightKg: Math.round(newWeight)
    };
  });
};

/**
 * 7. Cập nhật trạng thái chuyến xe (Xuất bến / Giao hoàn tất / Hủy)
 */
export const updateTripStatusService = async ({
  tripId,
  distributorId = 1,
  toStatus,
  changedById = null,
  notes = ''
}) => {
  return prisma.$transaction(async (tx) => {
    const trip = await tx.deliveryTrip.findFirst({
      where: {
        id: BigInt(tripId),
        distributorId: BigInt(distributorId)
      },
      include: {
        salesOrders: true
      }
    });

    if (!trip) throw new Error('Không tìm thấy chuyến xe vận chuyển');

    const updateData = { status: toStatus };

    // KHI XÁC NHẬN XE (WAITING_SHIP):
    if (toStatus === 'WAITING_SHIP') {
      if (trip.salesOrders.length === 0) {
        throw new Error('Chuyến xe chưa có đơn hàng nào, vui lòng xếp đơn trước khi xác nhận xe');
      }
    }

    // KHI XUẤT BẾN (SHIPPING):
    if (toStatus === 'SHIPPING') {
      if (trip.salesOrders.length === 0) {
        throw new Error('Chuyến xe chưa có đơn hàng nào, không thể xuất bến');
      }
      updateData.departureTime = new Date();

      // Đổi tất cả đơn hàng sang SHIPPED
      for (const order of trip.salesOrders) {
        if (order.status === 'ALLOCATED') {
          await tx.salesOrder.update({
            where: { id: order.id },
            data: { status: 'SHIPPED' }
          });

          await tx.orderStatusHistory.create({
            data: {
              salesOrderId: order.id,
              fromStatus: 'ALLOCATED',
              toStatus: 'SHIPPED',
              changedById: changedById ? BigInt(changedById) : null,
              notes: `Chuyến xe [${trip.tripCode}] đã xuất bến. Đang vận chuyển đến điểm giao.`
            }
          });
        }
      }
    }

    // KHI HOÀN TẤT (COMPLETED):
    if (toStatus === 'COMPLETED') {
      updateData.completedTime = new Date();

      // Kiểm tra xem còn đơn SHIPPED nào chưa xác nhận không
      const pendingShippedOrders = trip.salesOrders.filter(o => o.status === 'SHIPPED');
      for (const order of pendingShippedOrders) {
        // Tự động xác nhận giao đủ cho các đơn SHIPPED còn sót
        await tx.salesOrder.update({
          where: { id: order.id },
          data: { status: 'DELIVERED', deliveryNotes: 'Xác nhận hoàn tất theo chuyến xe' }
        });

        await tx.orderStatusHistory.create({
          data: {
            salesOrderId: order.id,
            fromStatus: 'SHIPPED',
            toStatus: 'DELIVERED',
            changedById: changedById ? BigInt(changedById) : null,
            notes: `Chuyến xe [${trip.tripCode}] hoàn tất. Đơn hàng tự động xác nhận đã giao.`
          }
        });
      }
    }

    // KHI HỦY CHUYẾN (CANCELLED):
    if (toStatus === 'CANCELLED') {
      if (trip.status === 'SHIPPING') {
        throw new Error('Xe đang trên đường giao hàng (SHIPPING), không thể hủy chuyến trực tiếp');
      }
      // Gỡ toàn bộ đơn hàng về ALLOCATED
      for (const order of trip.salesOrders) {
        await tx.salesOrder.update({
          where: { id: order.id },
          data: { deliveryTripId: null, status: 'ALLOCATED' }
        });

        await tx.orderStatusHistory.create({
          data: {
            salesOrderId: order.id,
            fromStatus: order.status,
            toStatus: 'ALLOCATED',
            changedById: changedById ? BigInt(changedById) : null,
            reason: 'Hủy chuyến xe',
            notes: `Chuyến xe [${trip.tripCode}] bị hủy. Hoàn đơn về hàng đợi bốc xếp.`
          }
        });
      }
      updateData.currentWeightKg = 0;
    }

    const updated = await tx.deliveryTrip.update({
      where: { id: trip.id },
      data: updateData
    });

    return {
      success: true,
      message: `Đã chuyển trạng thái chuyến xe sang ${toStatus}`,
      tripStatus: updated.status
    };
  });
};

/**
 * 8. Lập Bảng kê bốc hàng & Số Lô (Trip Cargo & Lot Manifest)
 */
export const getTripCargoManifestService = async (tripId, distributorId = 1) => {
  const trip = await findDeliveryTripById(tripId, distributorId);
  if (!trip) return null;

  // Gom nhóm sản phẩm và số lô trên xe
  const lotMap = new Map();
  const retailerStops = [];

  (trip.salesOrders || []).forEach((order, index) => {
    const itemsFormatted = (order.items || []).map(it => ({
      id: it.id.toString(),
      productId: it.productId.toString(),
      productName: it.product?.name || 'Sản phẩm',
      productSku: it.product?.sku || '',
      unit: it.product?.unit || 'THÙNG',
      quantity: formatNumber(it.quantity),
      deliveredQuantity: it.deliveredQuantity !== null ? formatNumber(it.deliveredQuantity) : null,
      failedQuantity: it.failedQuantity !== null ? formatNumber(it.failedQuantity) : 0,
      unitPrice: formatNumber(it.unitPrice)
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
      items: itemsFormatted
    });

    (order.items || []).forEach(item => {
      const p = item.product;
      (item.allocations || []).forEach(alloc => {
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
            unitWeightKg: formatNumber(p.weightKg) || DEFAULT_PRODUCT_WEIGHT
          });
        }

        const entry = lotMap.get(key);
        entry.totalQuantity += formatNumber(alloc.quantity);
      });
    });
  });

  const manifestItems = Array.from(lotMap.values()).map(item => ({
    ...item,
    totalWeightKg: Math.round(item.totalQuantity * item.unitWeightKg * 10) / 10
  }));

  const totalTripWeight = manifestItems.reduce((acc, it) => acc + it.totalWeightKg, 0);
  const totalPackages = manifestItems.reduce((acc, it) => acc + it.totalQuantity, 0);

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
    cargoByLot: manifestItems
  };
};

/**
 * 9. Xác nhận kết quả giao hàng tại từng điểm (Stop Delivery Verification)
 * Hỗ trợ 3 kịch bản:
 * - DELIVERED_FULL: Khách nhận đủ 100% -> Trừ kho vật lý, giảm reserved, xuất kho OUT, trạng thái DELIVERED.
 * - DELIVERED_PARTIAL: Khách chỉ nhận 1 phần -> Chỉnh sửa số lượng thực giao, hàng nhận trừ kho, hàng rớt giải phóng reserved về lại kho khả dụng, trạng thái DELIVERED.
 * - DELIVERY_FAILED: Giao thất bại toàn bộ -> Giải phóng 100% reserved về kho, trạng thái DELIVERY_FAILED.
 * Tự động hoàn tất chuyến xe (COMPLETED) khi toàn bộ đơn trên xe đã có kết quả.
 */
export const confirmStopDeliveryService = async ({
  tripId,
  orderId,
  distributorId = 1,
  deliveryResult, // 'DELIVERED_FULL' | 'DELIVERED_PARTIAL' | 'DELIVERY_FAILED'
  itemsDelivery = [], // [{ itemId, deliveredQty, failedReason }]
  notes = '',
  changedById = null
}) => {
  if (!tripId || !orderId) {
    throw new Error('tripId và orderId là bắt buộc');
  }

  if (!['DELIVERED_FULL', 'DELIVERED_PARTIAL', 'DELIVERY_FAILED'].includes(deliveryResult)) {
    throw new Error('Kết quả giao hàng không hợp lệ (phải là DELIVERED_FULL, DELIVERED_PARTIAL hoặc DELIVERY_FAILED)');
  }

  return prisma.$transaction(async (tx) => {
    // 1. Kiểm tra chuyến xe
    const trip = await tx.deliveryTrip.findFirst({
      where: {
        id: BigInt(tripId),
        distributorId: BigInt(distributorId)
      },
      include: {
        salesOrders: {
          select: { id: true, status: true }
        }
      }
    });

    if (!trip) throw new Error('Không tìm thấy chuyến xe vận chuyển');
    if (trip.status !== 'SHIPPING') {
      throw new Error(`Chuyến xe đang ở trạng thái [${trip.status}], chỉ có thể xác nhận giao hàng khi xe đang ở trạng thái "Đang giao hàng" (SHIPPING)`);
    }

    // 2. Kiểm tra đơn hàng
    const order = await tx.salesOrder.findFirst({
      where: {
        id: BigInt(orderId),
        distributorId: BigInt(distributorId),
        deliveryTripId: trip.id
      },
      include: {
        retailer: true,
        items: {
          include: {
            product: true,
            allocations: {
              include: { stockLot: true }
            }
          }
        }
      }
    });

    if (!order) throw new Error('Không tìm thấy đơn hàng trên chuyến xe này');
    if (order.status !== 'SHIPPED') {
      throw new Error(`Đơn hàng hiện ở trạng thái [${order.status}], không thể xác nhận giao. Chỉ đơn hàng đang "SHIPPED" mới được xác nhận.`);
    }

    // 3. Xử lý theo từng loại kết quả giao hàng
    if (deliveryResult === 'DELIVERED_FULL') {
      // --- KỊCH BẢN A: GIAO THÀNH CÔNG ĐỦ 100% ---
      for (const item of order.items) {
        const itemQty = formatNumber(item.quantity);

        // Cập nhật số lượng thực giao trên SalesOrderItem
        await tx.salesOrderItem.update({
          where: { id: item.id },
          data: {
            deliveredQuantity: itemQty,
            failedQuantity: 0
          }
        });

        // Trừ kho vật lý và giải phóng reserved trên từng lot allocation
        for (const alloc of (item.allocations || [])) {
          const allocQty = formatNumber(alloc.quantity);

          await tx.stockBalance.update({
            where: { lotId: alloc.lotId },
            data: {
              quantityOnHand: { decrement: allocQty },
              quantityReserved: { decrement: allocQty }
            }
          });

          // Ghi phiếu xuất kho
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
              createdById: changedById ? BigInt(changedById) : null
            }
          });
        }
      }

      // Cập nhật đơn hàng sang DELIVERED
      await tx.salesOrder.update({
        where: { id: order.id },
        data: {
          status: 'DELIVERED',
          deliveryNotes: notes || 'Giao hàng thành công đủ 100%'
        }
      });

      await tx.orderStatusHistory.create({
        data: {
          salesOrderId: order.id,
          fromStatus: 'SHIPPED',
          toStatus: 'DELIVERED',
          changedById: changedById ? BigInt(changedById) : null,
          notes: notes ? `Giao đủ 100%: ${notes}` : 'Đại lý đã nhận đủ hàng 100% thành công.'
        }
      });

    } else if (deliveryResult === 'DELIVERED_PARTIAL') {
      // --- KỊCH BẢN B: GIAO MỘT PHẦN (ĐƠN RỚT HÀNG) ---
      let totalDeliveredItemsCount = 0;
      let totalFailedItemsCount = 0;

      for (const item of order.items) {
        const orderedQty = formatNumber(item.quantity);

        // Tìm số lượng thực giao do người dùng nhập
        const inputItem = (itemsDelivery || []).find(it => it.itemId.toString() === item.id.toString());
        let deliveredQty = inputItem !== undefined ? Math.max(0, formatNumber(inputItem.deliveredQty)) : orderedQty;
        if (deliveredQty > orderedQty) deliveredQty = orderedQty; // Không vượt quá số lượng đặt
        const failedQty = Math.max(0, Math.round((orderedQty - deliveredQty) * 100) / 100);

        totalDeliveredItemsCount += deliveredQty;
        totalFailedItemsCount += failedQty;

        // Cập nhật SalesOrderItem với số lượng thực giao và số lượng rớt
        await tx.salesOrderItem.update({
          where: { id: item.id },
          data: {
            deliveredQuantity: deliveredQty,
            failedQuantity: failedQty
          }
        });

        // Phân bổ số lượng thực giao qua các lot allocations
        let remainingToDeduct = deliveredQty;
        for (const alloc of (item.allocations || [])) {
          const allocQty = formatNumber(alloc.quantity);
          const allocDelivered = Math.min(remainingToDeduct, allocQty);
          remainingToDeduct = Math.max(0, remainingToDeduct - allocDelivered);

          // Trừ kho vật lý cho phần thực giao (allocDelivered)
          // Giải phóng toàn bộ reserved của allocation này (allocQty) vì phần rớt không còn giữ chỗ nữa
          const balanceUpdate = {
            quantityReserved: { decrement: allocQty }
          };
          if (allocDelivered > 0) {
            balanceUpdate.quantityOnHand = { decrement: allocDelivered };
          }

          await tx.stockBalance.update({
            where: { lotId: alloc.lotId },
            data: balanceUpdate
          });

          // Nếu có hàng thực giao thì ghi transaction xuất kho OUT
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
                createdById: changedById ? BigInt(changedById) : null
              }
            });
          }
        }
      }

      const noteContent = `Giao một phần (Thực giao: ${totalDeliveredItemsCount} thùng, rớt: ${totalFailedItemsCount} thùng). ${notes ? `Lý do: ${notes}` : ''}`;

      await tx.salesOrder.update({
        where: { id: order.id },
        data: {
          status: 'DELIVERED',
          deliveryNotes: noteContent
        }
      });

      await tx.orderStatusHistory.create({
        data: {
          salesOrderId: order.id,
          fromStatus: 'SHIPPED',
          toStatus: 'DELIVERED',
          changedById: changedById ? BigInt(changedById) : null,
          reason: 'Giao một phần (đơn rớt mặt hàng)',
          notes: `${noteContent}. Số lượng rớt đã được hoàn về tồn khả dụng trong kho.`
        }
      });

    } else if (deliveryResult === 'DELIVERY_FAILED') {
      // --- KỊCH BẢN C: GIAO THẤT BẠI TOÀN BỘ (ĐƠN RỚT 100%) ---
      for (const item of order.items) {
        const itemQty = formatNumber(item.quantity);

        await tx.salesOrderItem.update({
          where: { id: item.id },
          data: {
            deliveredQuantity: 0,
            failedQuantity: itemQty
          }
        });

        // Giải phóng reserved cho tất cả allocations (không trừ quantityOnHand vì hàng mang trả về kho)
        for (const alloc of (item.allocations || [])) {
          const allocQty = formatNumber(alloc.quantity);

          await tx.stockBalance.update({
            where: { lotId: alloc.lotId },
            data: {
              quantityReserved: { decrement: allocQty }
            }
          });
        }
      }

      const failureNote = `Giao thất bại: ${notes || 'Đại lý từ chối nhận hoặc không liên lạc được'}`;

      await tx.salesOrder.update({
        where: { id: order.id },
        data: {
          status: 'DELIVERY_FAILED',
          deliveryNotes: failureNote
        }
      });

      await tx.orderStatusHistory.create({
        data: {
          salesOrderId: order.id,
          fromStatus: 'SHIPPED',
          toStatus: 'DELIVERY_FAILED',
          changedById: changedById ? BigInt(changedById) : null,
          reason: notes || 'Khách không nhận hàng',
          notes: `${failureNote}. Toàn bộ hàng hóa trên xe được mang trả về kho, đã giải phóng tồn kho giữ chỗ.`
        }
      });
    }

    // 4. Kiểm tra xem toàn bộ các đơn hàng trên chuyến xe đã được xác nhận hết chưa
    // Lấy lại danh sách đơn hàng của chuyến xe sau khi vừa cập nhật
    const allOrdersOnTrip = await tx.salesOrder.findMany({
      where: { deliveryTripId: trip.id },
      select: { id: true, status: true }
    });

    const pendingShippedCount = allOrdersOnTrip.filter(o => o.status === 'SHIPPED').length;
    let tripCompleted = false;

    // Nếu không còn đơn nào ở SHIPPED -> Tự động chuyển chuyến xe sang COMPLETED
    if (pendingShippedCount === 0) {
      await tx.deliveryTrip.update({
        where: { id: trip.id },
        data: {
          status: 'COMPLETED',
          completedTime: new Date()
        }
      });
      tripCompleted = true;
    }

    return {
      success: true,
      message: `Đã xác nhận kết quả giao hàng cho đơn ${order.orderCode} (${deliveryResult})`,
      orderStatus: deliveryResult === 'DELIVERY_FAILED' ? 'DELIVERY_FAILED' : 'DELIVERED',
      tripCompleted,
      remainingPendingStops: pendingShippedCount
    };
  });
};

/**
 * 10. Lấy bảng tổng hợp hàng rớt & quyết toán tiền COD khi xe về bãi (Return & COD Summary)
 */
export const getTripReturnSummaryService = async (tripId, distributorId = 1) => {
  const trip = await findDeliveryTripById(tripId, distributorId);
  if (!trip) throw new Error('Không tìm thấy chuyến xe vận chuyển');

  let totalOrderValueOriginal = 0;
  let totalCodExpected = 0;
  let totalDroppedValue = 0;
  let totalReturnedPackages = 0;

  const returnedItems = [];
  const skuSummaryMap = new Map();

  (trip.salesOrders || []).forEach(order => {
    (order.items || []).forEach(item => {
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

      // Nếu có hàng rớt mang về kho
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
          reason: order.deliveryNotes || 'Khách không nhận'
        };

        returnedItems.push(returnItemObj);

        // Gom nhóm theo SKU
        const skuKey = item.productId.toString();
        if (!skuSummaryMap.has(skuKey)) {
          skuSummaryMap.set(skuKey, {
            productId: skuKey,
            productSku: item.product?.sku || '',
            productName: item.product?.name || 'Sản phẩm',
            unit: item.product?.unit || 'THÙNG',
            totalReturnedQty: 0,
            totalReturnedValue: 0
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
      closeNotes: trip.closeNotes || ''
    },
    returnedItems,
    returnedItemsSummaryBySku: Array.from(skuSummaryMap.values()),
    totalReturnedPackages: Math.round(totalReturnedPackages * 10) / 10,
    totalReturnedValue: Math.round(totalDroppedValue),
    codSummary: {
      totalOrderValueOriginal: Math.round(totalOrderValueOriginal),
      totalDroppedValue: Math.round(totalDroppedValue),
      totalCodExpected: Math.round(totalCodExpected),
      codHandedOver: formatNumber(trip.codHandedOver) || Math.round(totalCodExpected)
    }
  };
};

/**
 * 11. Bàn giao hàng rớt về kho & Quyết toán COD để Đóng chuyến xe (CLOSED)
 */
export const closeDeliveryTripService = async ({
  tripId,
  distributorId = 1,
  codHandedOver,
  closeNotes = '',
  closedById = null
}) => {
  return prisma.$transaction(async (tx) => {
    const trip = await tx.deliveryTrip.findFirst({
      where: {
        id: BigInt(tripId),
        distributorId: BigInt(distributorId)
      },
      include: {
        salesOrders: {
          include: {
            items: true
          }
        }
      }
    });

    if (!trip) throw new Error('Không tìm thấy chuyến xe vận chuyển');
    if (trip.status === 'CLOSED') {
      throw new Error('Chuyến xe này đã được đóng (CLOSED) trước đó!');
    }
    if (trip.status !== 'COMPLETED') {
      throw new Error(`Chuyến xe hiện ở trạng thái [${trip.status}]. Chỉ chuyến xe đã hoàn tất giao hàng (COMPLETED) mới được làm thủ tục hạ tải & đóng chuyến!`);
    }

    // Tính tổng COD thực tế từ các đơn
    let calculatedCod = 0;
    (trip.salesOrders || []).forEach(order => {
      if (order.status === 'DELIVERED') {
        (order.items || []).forEach(it => {
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
        closeNotes: closeNotes ? closeNotes.trim() : 'Đã hoàn tất bàn giao hàng rớt nhập kho và quyết toán tiền COD đóng chuyến.'
      }
    });

    return {
      success: true,
      message: `Đã hoàn tất bàn giao và đóng chuyến xe ${trip.tripCode} (CLOSED)`,
      tripStatus: updatedTrip.status,
      closedTime: updatedTrip.closedTime,
      totalCodCollected: calculatedCod,
      codHandedOver: finalHandedOver
    };
  });
};

