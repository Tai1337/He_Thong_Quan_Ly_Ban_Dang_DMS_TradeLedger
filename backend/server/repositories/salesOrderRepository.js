import prisma from '../config/prisma.js';

/**
 * Tìm danh sách đơn bán hàng theo Nhà Phân Phối và bộ lọc đa tiêu chí
 */
export const findSalesOrdersByDistributor = async (distributorId, filters = {}) => {
  const {
    page = 1,
    limit = 10,
    startDate,
    endDate,
    dateType = 'created', // 'created' hoặc 'expected'
    warehouseId,
    status, // Có thể là chuỗi đơn, mảng hoặc chuỗi phân cách dấu phẩy
    orderCode,
    vnbhCode,
    vnbhName,
    retailer,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = filters;

  const take = parseInt(limit, 10);
  const skip = (parseInt(page, 10) - 1) * take;

  // Xây dựng điều kiện lọc (where clause)
  const where = {
    distributorId: BigInt(distributorId),
  };

  if (warehouseId) {
    where.warehouseId = BigInt(warehouseId);
  }

  // Lọc theo trạng thái (Hỗ trợ multi-select)
  if (status) {
    let statusList = [];
    if (Array.isArray(status)) {
      statusList = status;
    } else if (typeof status === 'string') {
      statusList = status.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (statusList.length === 1) {
      where.status = statusList[0];
    } else if (statusList.length > 1) {
      where.status = { in: statusList };
    }
  }

  // Lọc theo Mã đơn hàng
  if (orderCode && orderCode.trim()) {
    where.orderCode = {
      contains: orderCode.trim(),
    };
  }

  // Lọc theo Mã VNBH
  if (vnbhCode && vnbhCode.trim()) {
    where.createdBy = {
      ...where.createdBy,
      username: { contains: vnbhCode.trim() }
    };
  }

  // Lọc theo Tên VNBH
  if (vnbhName && vnbhName.trim()) {
    where.createdBy = {
      ...where.createdBy,
      fullName: { contains: vnbhName.trim() }
    };
  }

  // Lọc theo Khách hàng / Cửa hàng
  if (retailer && retailer.trim()) {
    const term = retailer.trim();
    where.retailer = {
      OR: [
        { code: { contains: term } },
        { name: { contains: term } }
      ]
    };
  }

  // Lọc theo Ngày (Ngày tạo hoặc Ngày giao dự kiến = ngày tạo + 1)
  if (startDate || endDate) {
    const dateCondition = {};
    if (dateType === 'expected') {
      // Vì expectedDate = createdAt + 1 ngày, ta dịch chuyển khoảng lọc lùi 1 ngày
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
      // Mặc định: lọc theo Ngày tạo đơn (createdAt)
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

  // Xử lý sắp xếp
  const orderBy = {};
  if (sortBy === 'orderCode' || sortBy === 'status' || sortBy === 'createdAt') {
    orderBy[sortBy] = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';
  } else {
    orderBy.createdAt = 'desc';
  }

  const [orders, total] = await Promise.all([
    prisma.salesOrder.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        retailer: true,
        warehouse: true,
        deliveryTrip: {
          include: { driver: true }
        },
        createdBy: true,
        items: {
          include: {
            product: true,
            allocations: {
              include: { stockLot: true }
            }
          }
        },
        invoice: true,
        statusHistory: {
          include: { changedBy: true },
          orderBy: { changedAt: 'desc' },
          take: 1
        }
      }
    }),
    prisma.salesOrder.count({ where })
  ]);

  return { orders, total };
};

/**
 * Lấy chi tiết đơn hàng bán theo ID và NPP
 */
export const findSalesOrderById = async (id, distributorId) => {
  const where = { id: BigInt(id) };
  if (distributorId) {
    where.distributorId = BigInt(distributorId);
  }

  return prisma.salesOrder.findFirst({
    where,
    include: {
      retailer: true,
      warehouse: true,
      deliveryTrip: {
        include: { driver: true }
      },
      createdBy: true,
      items: {
        include: {
          product: true,
          allocations: {
            include: { stockLot: true }
          }
        }
      },
      statusHistory: {
        include: { changedBy: true },
        orderBy: { changedAt: 'asc' }
      },
      invoice: true
    }
  });
};

/**
 * Tìm các lô hàng còn HSD và khả dụng của sản phẩm theo FEFO
 */
export const findAvailableLotsByProduct = async (productId, warehouseId) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const lots = await prisma.stockLot.findMany({
    where: {
      productId: BigInt(productId),
      warehouseId: BigInt(warehouseId),
      status: 'GOOD',
      OR: [
        { expiryDate: null },
        { expiryDate: { gte: now } }
      ]
    },
    include: {
      stockBalance: true
    },
    orderBy: [
      { expiryDate: 'asc' }, // FEFO: First-Expired First-Out
      { id: 'asc' }
    ]
  });

  return lots.map(lot => {
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
      quantityAvailable: available
    };
  });
};

/**
 * Tính tổng tồn khả dụng của sản phẩm trong kho
 */
export const getTotalAvailableStock = async (productId, warehouseId) => {
  const lots = await findAvailableLotsByProduct(productId, warehouseId);
  return lots.reduce((sum, l) => sum + l.quantityAvailable, 0);
};

/**
 * Tìm các chuyến xe khả dụng để gán đơn hàng
 */
export const findAvailableDeliveryTrips = async (distributorId, warehouseId) => {
  const where = {
    distributorId: BigInt(distributorId),
    tripType: 'OUTBOUND',
    status: { in: ['WAITING_CONFIRM', 'WAITING_SHIP', 'SHIPPING'] }
  };
  if (warehouseId) {
    where.warehouseId = BigInt(warehouseId);
  }

  return prisma.deliveryTrip.findMany({
    where,
    include: {
      driver: {
        select: { id: true, fullName: true, phone: true }
      },
      warehouse: {
        select: { id: true, name: true }
      },
      salesOrders: {
        select: { id: true, orderCode: true, status: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};

/**
 * Lấy metadata danh sách khách hàng, kho xuất và sản phẩm kèm giá
 */
export const findSalesOrderMetaOptions = async (distributorId) => {
  const [retailers, warehouses, products] = await Promise.all([
    prisma.retailer.findMany({
      where: { distributorId: BigInt(distributorId), status: true },
      select: { id: true, code: true, name: true, phone: true, address: true },
      orderBy: { name: 'asc' }
    }),
    prisma.warehouse.findMany({
      where: { distributorId: BigInt(distributorId), status: true },
      select: { id: true, code: true, name: true, type: true },
      orderBy: { name: 'asc' }
    }),
    prisma.product.findMany({
      where: { status: true },
      select: { id: true, sku: true, name: true, unit: true, basePrice: true, stdSku: true },
      orderBy: { name: 'asc' }
    })
  ]);

  return { retailers, warehouses, products };
};

/**
 * Thống kê tổng quan đơn bán hàng theo trạng thái & doanh thu
 */
export const getSalesSummaryAnalytics = async (distributorId, { startDate, endDate }) => {
  const where = { distributorId: BigInt(distributorId) };
  if (startDate || endDate) {
    const createdAt = {};
    if (startDate) createdAt.gte = new Date(startDate);
    if (endDate) createdAt.lte = new Date(endDate);
    where.createdAt = createdAt;
  }

  const [statusCounts, totalRevenueAgg] = await Promise.all([
    prisma.salesOrder.groupBy({
      by: ['status'],
      where,
      _count: { id: true }
    }),
    prisma.invoice.aggregate({
      where: {
        distributorId: BigInt(distributorId),
        status: { in: ['PAID', 'PARTIALLY_PAID'] }
      },
      _sum: {
        totalAmount: true,
        paidAmount: true
      }
    })
  ]);

  return { statusCounts, totalRevenueAgg };
};
