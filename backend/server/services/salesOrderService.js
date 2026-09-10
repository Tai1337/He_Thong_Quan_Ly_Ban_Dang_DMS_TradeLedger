import prisma from '../config/prisma.js';
import { 
  findSalesOrdersByDistributor, 
  findSalesOrderById, 
  findAvailableLotsByProduct,
  getTotalAvailableStock 
} from '../repositories/salesOrderRepository.js';

/**
 * Lấy danh sách đơn hàng kèm KPIs và kiểm tra tồn kho
 */
export const getSalesOrdersWithKPIs = async (distributorId, filters = {}) => {
  const { orders, total } = await findSalesOrdersByDistributor(distributorId, filters);

  let totalAmount = 0;
  let totalDiscount = 0;

  // Lấy danh sách sản phẩm để kiểm tra tồn kho tổng
  const productStockCache = {};

  const formattedOrders = await Promise.all(orders.map(async (order) => {
    const expectedDate = new Date(order.createdAt);
    expectedDate.setDate(expectedDate.getDate() + 1);

    // Tính tổng tiền đơn hàng
    let orderTotal = 0;
    let isShortage = false;

    if (order.invoice) {
      orderTotal = Number(order.invoice.totalAmount);
    } else if (order.items && order.items.length > 0) {
      orderTotal = order.items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
    }

    // Kiểm tra xem đơn hàng có bị thiếu tồn kho không (nếu đơn chưa xuất kho)
    if (order.status === 'PENDING') {
      for (const item of (order.items || [])) {
        const prodId = item.productId.toString();
        if (productStockCache[prodId] === undefined) {
          productStockCache[prodId] = await getTotalAvailableStock(item.productId, order.warehouseId);
        }
        if (Number(item.quantity) > productStockCache[prodId]) {
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
      orderType: order.orderType
    };
  }));

  // Lọc theo stockFilter nếu người dùng chọn tab 'Đủ tồn' / 'Thiếu tồn'
  let filteredData = formattedOrders;
  if (filters.stockFilter === 'enough') {
    filteredData = formattedOrders.filter(o => !o.isShortage);
  } else if (filters.stockFilter === 'shortage') {
    filteredData = formattedOrders.filter(o => o.isShortage);
  }

  return {
    data: filteredData,
    kpis: {
      totalOrders: total,
      totalAmount,
      totalDiscount,
      totalOrderValue: totalAmount - totalDiscount,
      totalTons: (totalAmount / 50000000).toFixed(4), // Ước tính quy đổi tấn
      totalCbm: (totalAmount / 30000000).toFixed(4),  // Ước tính quy đổi khối m3
    },
    pagination: {
      total,
      page: parseInt(filters.page || 1, 10),
      limit: parseInt(filters.limit || 10, 10),
    }
  };
};

/**
 * Lấy chi tiết đơn hàng theo ID
 */
export const getOrderDetail = async (id, distributorId) => {
  const order = await findSalesOrderById(id, distributorId);
  if (!order) {
    throw new Error('Không tìm thấy đơn hàng hoặc bạn không có quyền truy cập');
  }

  const expectedDate = new Date(order.createdAt);
  expectedDate.setDate(expectedDate.getDate() + 1);

  let totalAmount = 0;
  const items = await Promise.all(order.items.map(async (item) => {
    const qty = Number(item.quantity);
    const price = Number(item.unitPrice);
    const lineTotal = qty * price;
    totalAmount += lineTotal;

    // Kiểm tra tồn kho khả dụng hiện tại của sản phẩm
    const availableStock = await getTotalAvailableStock(item.productId, order.warehouseId);

    // Thông tin các lô đã được phân bổ (nếu đơn đã ALLOCATED hoặc SHIPPED/DELIVERED)
    const allocations = (item.allocations || []).map(alloc => ({
      id: alloc.id.toString(),
      lotId: alloc.lotId.toString(),
      lotNumber: alloc.stockLot?.lotNumber || 'N/A',
      expiryDate: alloc.stockLot?.expiryDate,
      manufactureDate: alloc.stockLot?.manufactureDate,
      quantity: Number(alloc.quantity)
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
      allocations
    };
  }));

  const statusHistory = (order.statusHistory || []).map(h => ({
    id: h.id.toString(),
    fromStatus: h.fromStatus,
    toStatus: h.toStatus,
    changedBy: h.changedBy?.fullName || h.changedBy?.username || 'Hệ thống',
    changedAt: h.changedAt,
    reason: h.reason || '',
    notes: h.notes || ''
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
    deliveryTrip: order.deliveryTrip ? {
      id: order.deliveryTrip.id.toString(),
      tripCode: order.deliveryTrip.tripCode,
      driverName: order.deliveryTrip.driver?.fullName || '',
      driverPhone: order.deliveryTrip.driver?.phone || '',
      status: order.deliveryTrip.status
    } : null,
    totalAmount,
    items,
    statusHistory
  };
};

/**
 * Xác nhận đơn hàng & Phân bổ tồn kho theo quy tắc FEFO
 */
export const confirmOrder = async (orderId, distributorId, changedById) => {
  return prisma.$transaction(async (tx) => {
    // 1. Guard Clauses: Kiểm tra đơn hàng
    const order = await tx.salesOrder.findFirst({
      where: {
        id: BigInt(orderId),
        ...(distributorId ? { distributorId: BigInt(distributorId) } : {})
      },
      include: {
        items: {
          include: { product: true }
        }
      }
    });

    if (!order) {
      throw new Error('Đơn hàng không tồn tại hoặc không thuộc quyền quản lý');
    }

    if (order.status !== 'PENDING') {
      throw new Error(`Đơn hàng đang ở trạng thái "${order.status}", chỉ có thể xác nhận đơn ở trạng thái "Đã gửi đơn" (PENDING)`);
    }

    if (!order.items || order.items.length === 0) {
      throw new Error('Đơn hàng không có sản phẩm để xác nhận');
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // 2. Phân bổ lô theo FEFO cho từng mặt hàng
    for (const item of order.items) {
      const requiredQty = Number(item.quantity);

      // Tìm tất cả các lô hàng còn hạn sử dụng, trạng thái GOOD, sắp xếp FEFO
      const lots = await tx.stockLot.findMany({
        where: {
          productId: item.productId,
          warehouseId: order.warehouseId,
          status: 'GOOD',
          OR: [
            { expiryDate: null },
            { expiryDate: { gte: now } }
          ]
        },
        include: { stockBalance: true },
        orderBy: [
          { expiryDate: 'asc' },
          { id: 'asc' }
        ]
      });

      // Tính tổng khả dụng
      let totalAvailable = 0;
      const validLots = [];
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
        throw new Error(`Sản phẩm "${item.product.name}" không đủ tồn kho khả dụng (Yêu cầu: ${requiredQty}, Khả dụng: ${totalAvailable})`);
      }

      // Tiến hành phân bổ số lượng theo FEFO
      let remainingQty = requiredQty;
      for (const { lot, available } of validLots) {
        if (remainingQty <= 0) break;

        const allocateQty = Math.min(available, remainingQty);

        // Tạo bản ghi SalesOrderItemAllocation
        await tx.salesOrderItemAllocation.create({
          data: {
            salesOrderItemId: item.id,
            lotId: lot.id,
            quantity: allocateQty
          }
        });

        // Giữ tồn kho ảo (Reserved Stock)
        await tx.stockBalance.update({
          where: { lotId: lot.id },
          data: {
            quantityReserved: {
              increment: allocateQty
            }
          }
        });

        remainingQty -= allocateQty;
      }
    }

    // 3. Cập nhật trạng thái đơn hàng -> ALLOCATED (Chờ giao)
    await tx.salesOrder.update({
      where: { id: order.id },
      data: { status: 'ALLOCATED' }
    });

    // 4. Ghi log lịch sử trạng thái
    await tx.orderStatusHistory.create({
      data: {
        salesOrderId: order.id,
        fromStatus: 'PENDING',
        toStatus: 'ALLOCATED',
        changedById: changedById ? BigInt(changedById) : null,
        notes: 'Xác nhận đơn và tự động phân bổ lô theo FEFO (giữ chỗ Reserved Stock)'
      }
    });

    return {
      success: true,
      message: 'Xác nhận đơn hàng và phân bổ lô thành công',
      orderId: order.id.toString(),
      status: 'ALLOCATED'
    };
  });
};

/**
 * Xác nhận hàng loạt nhiều đơn hàng
 */
export const bulkConfirmOrders = async (orderIds, distributorId, changedById) => {
  if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
    throw new Error('Vui lòng chọn ít nhất một đơn hàng để xác nhận');
  }

  const results = {
    success: [],
    failed: []
  };

  for (const id of orderIds) {
    try {
      await confirmOrder(id, distributorId, changedById);
      results.success.push(id);
    } catch (err) {
      results.failed.push({
        id,
        error: err.message
      });
    }
  }

  return {
    total: orderIds.length,
    successCount: results.success.length,
    failedCount: results.failed.length,
    results
  };
};

/**
 * Huỷ đơn hàng bán & Hoàn trả tồn kho đã giữ chỗ (Reserved Stock)
 */
export const cancelOrder = async (orderId, distributorId, changedById, reason) => {
  if (!reason || !reason.trim()) {
    throw new Error('Vui lòng nhập lý do huỷ đơn hàng');
  }

  return prisma.$transaction(async (tx) => {
    const order = await tx.salesOrder.findFirst({
      where: {
        id: BigInt(orderId),
        ...(distributorId ? { distributorId: BigInt(distributorId) } : {})
      },
      include: {
        items: {
          include: {
            allocations: true
          }
        }
      }
    });

    if (!order) {
      throw new Error('Đơn hàng không tồn tại hoặc không thuộc quyền quản lý');
    }

    // Điều kiện huỷ: chỉ được huỷ khi chưa bàn giao xe (PENDING hoặc ALLOCATED)
    if (order.status !== 'PENDING' && order.status !== 'ALLOCATED') {
      throw new Error(`Không thể huỷ đơn hàng đang ở trạng thái "${order.status}". Chỉ được huỷ khi chưa bàn giao xe (Đã gửi đơn hoặc Chờ giao)`);
    }

    // Nếu đơn đã phân bổ lô (ALLOCATED): Hoàn trả tồn kho đã giữ chỗ
    if (order.status === 'ALLOCATED') {
      for (const item of order.items) {
        for (const alloc of (item.allocations || [])) {
          // Trừ quantityReserved trên stock_balance
          await tx.stockBalance.update({
            where: { lotId: alloc.lotId },
            data: {
              quantityReserved: {
                decrement: alloc.quantity
              }
            }
          });
        }
        // Xoá các bản ghi allocations
        await tx.salesOrderItemAllocation.deleteMany({
          where: { salesOrderItemId: item.id }
        });
      }
    }

    // Cập nhật trạng thái đơn sang CANCELLED
    await tx.salesOrder.update({
      where: { id: order.id },
      data: { status: 'CANCELLED' }
    });

    // Ghi lịch sử trạng thái kèm lý do huỷ
    await tx.orderStatusHistory.create({
      data: {
        salesOrderId: order.id,
        fromStatus: order.status,
        toStatus: 'CANCELLED',
        changedById: changedById ? BigInt(changedById) : null,
        reason: reason.trim(),
        notes: `Huỷ đơn hàng: ${reason.trim()}`
      }
    });

    return {
      success: true,
      message: 'Huỷ đơn hàng thành công và đã hoàn trả tồn kho giữ chỗ',
      orderId: order.id.toString(),
      status: 'CANCELLED'
    };
  });
};

/**
 * Gán chuyến xe giao hàng (ALLOCATED -> SHIPPED)
 */
export const assignDeliveryTrip = async (orderId, distributorId, tripId, changedById) => {
  if (!tripId) {
    throw new Error('Vui lòng chọn chuyến xe giao hàng');
  }

  return prisma.$transaction(async (tx) => {
    const order = await tx.salesOrder.findFirst({
      where: {
        id: BigInt(orderId),
        ...(distributorId ? { distributorId: BigInt(distributorId) } : {})
      }
    });

    if (!order) {
      throw new Error('Không tìm thấy đơn hàng');
    }

    if (order.status !== 'ALLOCATED') {
      throw new Error(`Chỉ có thể gán chuyến xe cho đơn hàng ở trạng thái "Chờ giao" (ALLOCATED). Trạng thái hiện tại: ${order.status}`);
    }

    const trip = await tx.deliveryTrip.findUnique({
      where: { id: BigInt(tripId) },
      include: { driver: true }
    });

    if (!trip) {
      throw new Error('Chuyến xe không tồn tại');
    }

    // Cập nhật tripId và chuyển trạng thái sang SHIPPED (Đang giao)
    await tx.salesOrder.update({
      where: { id: order.id },
      data: {
        deliveryTripId: trip.id,
        status: 'SHIPPED'
      }
    });

    await tx.orderStatusHistory.create({
      data: {
        salesOrderId: order.id,
        fromStatus: 'ALLOCATED',
        toStatus: 'SHIPPED',
        changedById: changedById ? BigInt(changedById) : null,
        notes: `Gán vào chuyến xe [${trip.tripCode}] - Tài xế: ${trip.driver?.fullName || 'Chưa gán'}`
      }
    });

    return {
      success: true,
      message: `Đã gán đơn hàng vào chuyến xe ${trip.tripCode} và chuyển sang Đang giao`,
      orderId: order.id.toString(),
      status: 'SHIPPED'
    };
  });
};

/**
 * Xác nhận giao hàng thành công (SHIPPED -> DELIVERED)
 * Trừ tồn kho vật lý và ghi nhận InventoryTransaction OUT
 */
export const confirmDelivery = async (orderId, distributorId, changedById, isSuccess = true, note = '') => {
  return prisma.$transaction(async (tx) => {
    const order = await tx.salesOrder.findFirst({
      where: {
        id: BigInt(orderId),
        ...(distributorId ? { distributorId: BigInt(distributorId) } : {})
      },
      include: {
        items: {
          include: {
            allocations: true,
            product: true
          }
        }
      }
    });

    if (!order) {
      throw new Error('Không tìm thấy đơn hàng');
    }

    if (order.status !== 'SHIPPED') {
      throw new Error(`Chỉ có thể xác nhận giao hàng cho đơn đang ở trạng thái "Đang giao" (SHIPPED). Trạng thái hiện tại: ${order.status}`);
    }

    if (!isSuccess) {
      // Giao hàng thất bại -> Quay về Chờ giao (ALLOCATED)
      await tx.salesOrder.update({
        where: { id: order.id },
        data: {
          status: 'ALLOCATED',
          deliveryTripId: null
        }
      });

      await tx.orderStatusHistory.create({
        data: {
          salesOrderId: order.id,
          fromStatus: 'SHIPPED',
          toStatus: 'ALLOCATED',
          changedById: changedById ? BigInt(changedById) : null,
          notes: `Giao hàng thất bại: ${note || 'Khách hàng không nhận hàng'}`
        }
      });

      return {
        success: true,
        message: 'Đã cập nhật giao hàng thất bại, hoàn về Chờ giao',
        status: 'ALLOCATED'
      };
    }

    // Giao hàng thành công -> Trừ kho vật lý (quantityOnHand & quantityReserved)
    for (const item of order.items) {
      for (const alloc of (item.allocations || [])) {
        const qty = Number(alloc.quantity);

        // Trừ tồn kho thực tế và giải phóng reserved
        await tx.stockBalance.update({
          where: { lotId: alloc.lotId },
          data: {
            quantityOnHand: { decrement: qty },
            quantityReserved: { decrement: qty }
          }
        });

        // Ghi transaction xuất kho
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
            createdById: changedById ? BigInt(changedById) : null
          }
        });
      }
    }

    // Cập nhật trạng thái DELIVERED
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
        notes: 'Xác nhận giao hàng thành công đến đại lý / điểm bán'
      }
    });

    return {
      success: true,
      message: 'Xác nhận giao hàng thành công và đã xuất kho vật lý',
      orderId: order.id.toString(),
      status: 'DELIVERED'
    };
  });
};

/**
 * Đóng đơn hàng sau khi đối soát (DELIVERED -> PAID)
 */
export const closeOrder = async (orderId, distributorId, changedById) => {
  const order = await prisma.salesOrder.findFirst({
    where: {
      id: BigInt(orderId),
      ...(distributorId ? { distributorId: BigInt(distributorId) } : {})
    }
  });

  if (!order) {
    throw new Error('Không tìm thấy đơn hàng');
  }

  if (order.status !== 'DELIVERED') {
    throw new Error(`Chỉ có thể đóng đơn hàng khi đã ở trạng thái "Đã giao" (DELIVERED). Trạng thái hiện tại: ${order.status}`);
  }

  await prisma.$transaction([
    prisma.salesOrder.update({
      where: { id: order.id },
      data: { status: 'PAID' }
    }),
    prisma.orderStatusHistory.create({
      data: {
        salesOrderId: order.id,
        fromStatus: 'DELIVERED',
        toStatus: 'PAID',
        changedById: changedById ? BigInt(changedById) : null,
        notes: 'Đối soát công nợ / thanh toán hoàn tất - Đóng đơn hàng'
      }
    })
  ]);

  return {
    success: true,
    message: 'Đã đóng đơn hàng thành công',
    orderId: order.id.toString(),
    status: 'PAID'
  };
};

/**
 * Chỉnh sửa số lượng sản phẩm trên đơn hàng (Dùng cho RPT005 khi thiếu tồn kho)
 */
export const updateOrderItemQuantity = async (orderId, itemId, newQuantity, distributorId, changedById, reason = '') => {
  const qty = Number(newQuantity);
  if (isNaN(qty) || qty <= 0) {
    throw new Error('Số lượng sản phẩm phải lớn hơn 0');
  }

  return prisma.$transaction(async (tx) => {
    const order = await tx.salesOrder.findFirst({
      where: {
        id: BigInt(orderId),
        ...(distributorId ? { distributorId: BigInt(distributorId) } : {})
      }
    });

    if (!order) throw new Error('Không tìm thấy đơn hàng');
    if (order.status !== 'PENDING') {
      throw new Error('Chỉ được chỉnh sửa số lượng khi đơn hàng ở trạng thái "Đã gửi đơn" (PENDING)');
    }

    const item = await tx.salesOrderItem.findUnique({
      where: { id: BigInt(itemId) },
      include: { product: true }
    });

    if (!item) throw new Error('Không tìm thấy dòng sản phẩm trong đơn');

    const oldQty = Number(item.quantity);

    await tx.salesOrderItem.update({
      where: { id: item.id },
      data: { quantity: qty }
    });

    await tx.orderStatusHistory.create({
      data: {
        salesOrderId: order.id,
        fromStatus: 'PENDING',
        toStatus: 'PENDING',
        changedById: changedById ? BigInt(changedById) : null,
        notes: `Điều chỉnh số lượng SP [${item.product.name}] từ ${oldQty} thành ${qty}. Lý do: ${reason || 'Kế toán điều chỉnh do thiếu tồn kho'}`
      }
    });

    return {
      success: true,
      message: 'Cập nhật số lượng sản phẩm thành công',
      oldQuantity: oldQty,
      newQuantity: qty
    };
  });
};

/**
 * Tạo mới đơn đặt hàng bán (Biểu mẫu BH_BM1)
 */
export const createNewSalesOrder = async (orderData, distributorId, createdById) => {
  const { retailerId, warehouseId, orderType = 'LATER', items, notes, orderDate, expectedDeliveryDate } = orderData;

  if (!retailerId) throw new Error('Vui lòng chọn khách hàng / đại lý');
  if (!warehouseId) throw new Error('Vui lòng chọn kho xuất hàng');
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('Đơn hàng phải có ít nhất 1 sản phẩm');
  }

  // Tạo mã đơn theo chuẩn SO-YYYYMMDD-XXXXX
  const date = orderDate ? new Date(orderDate) : new Date();
  const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(10000 + Math.random() * 90000);
  const orderCode = `SO-${yyyymmdd}-${rand}`;

  return prisma.$transaction(async (tx) => {
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
          create: items.map(it => {
            const qty = Number(it.quantity ?? it.orderedQuantity ?? 1);
            const price = Number(it.unitPrice ?? 0);
            return {
              product: { connect: { id: BigInt(it.productId) } },
              quantity: isNaN(qty) || qty <= 0 ? 1 : qty,
              unitPrice: isNaN(price) ? 0 : price,
              isPromotion: Boolean(it.isPromotion)
            };
          })
        }
      },
      include: {
        retailer: true,
        items: { include: { product: true } }
      }
    });

    await tx.orderStatusHistory.create({
      data: {
        salesOrderId: order.id,
        fromStatus: null,
        toStatus: 'PENDING',
        changedById: createdById ? BigInt(createdById) : null,
        notes: `Tạo mới đơn đặt hàng bán (Biểu mẫu BH_BM1)${notes ? `. Ghi chú: ${notes}` : ''}`
      }
    });

    return {
      success: true,
      message: 'Tạo đơn đặt hàng bán thành công',
      data: {
        id: order.id.toString(),
        orderCode: order.orderCode,
        status: order.status,
        totalAmount: order.items.reduce((sum, it) => sum + (Number(it.quantity) * Number(it.unitPrice)), 0)
      }
    };
  });
};

