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
        unitWeightKg: unitWeight,
        totalWeightKg: Math.round(itemQty * unitWeight * 10) / 10,
        allocations: lotAllocations
      };
    });

    return {
      id: order.id.toString(),
      orderCode: order.orderCode,
      status: order.status,
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
    status: 'WAITING_SHIP',
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
        currentWeightKg: totalWeightAfterAdd,
        status: trip.status === 'WAITING_CONFIRM' ? 'WAITING_SHIP' : trip.status
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
 */
export const removeOrderFromTripService = async ({
  tripId,
  orderId,
  distributorId = 1,
  changedById = null,
  reason = 'Điều chuyển sang chuyến xe khác'
}) => {
  return prisma.$transaction(async (tx) => {
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
    if (order.status === 'DELIVERED' || order.status === 'COMPLETED') {
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
    const trip = order.deliveryTrip;
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

      // Đổi các đơn SHIPPED thành DELIVERED
      for (const order of trip.salesOrders) {
        if (order.status === 'SHIPPED') {
          await tx.salesOrder.update({
            where: { id: order.id },
            data: { status: 'DELIVERED' }
          });

          await tx.orderStatusHistory.create({
            data: {
              salesOrderId: order.id,
              fromStatus: 'SHIPPED',
              toStatus: 'DELIVERED',
              changedById: changedById ? BigInt(changedById) : null,
              notes: `Chuyến xe [${trip.tripCode}] đã giao hàng thành công tại điểm bán.`
            }
          });
        }
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
    retailerStops.push({
      stopNumber: index + 1,
      orderCode: order.orderCode,
      retailerName: order.retailer?.name || 'Khách lẻ',
      address: order.retailer?.address || '',
      phone: order.retailer?.phone || '',
      itemsCount: (order.items || []).length,
      orderWeightKg: calculateOrderWeight(order)
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
