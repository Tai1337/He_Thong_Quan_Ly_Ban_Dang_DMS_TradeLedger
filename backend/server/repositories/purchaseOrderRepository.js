import prisma from '../config/prisma.js';

/**
 * Xây dựng where clause theo filter
 */
export const buildPOWhereClause = (distributorId, filters = {}) => {
  const where = {};

  if (distributorId) {
    where.distributorId = BigInt(distributorId);
  }

  if (filters.poCode && filters.poCode.trim()) {
    where.poCode = { contains: filters.poCode.trim() };
  }

  if (filters.supplierId) {
    where.supplierId = BigInt(filters.supplierId);
  }

  if (filters.warehouseId) {
    where.warehouseId = BigInt(filters.warehouseId);
  }

  // Hỗ trợ status đơn lẻ hoặc mảng / chuỗi phân cách dấu phẩy
  if (filters.status) {
    if (Array.isArray(filters.status)) {
      where.status = { in: filters.status };
    } else if (typeof filters.status === 'string') {
      const parts = filters.status.split(',').map(s => s.trim()).filter(Boolean);
      if (parts.length > 1) {
        where.status = { in: parts };
      } else if (parts.length === 1) {
        where.status = parts[0];
      }
    }
  }

  // Lọc theo khoảng ngày tạo
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      from.setHours(0, 0, 0, 0);
      where.createdAt.gte = from;
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      where.createdAt.lte = to;
    }
  }

  return where;
};

/**
 * Tìm danh sách đơn mua PO có phân trang
 */
export const findPurchaseOrders = async (distributorId, filters = {}) => {
  const where = buildPOWhereClause(distributorId, filters);
  const page = parseInt(filters.page || 1, 10);
  const limit = parseInt(filters.limit || 20, 10);
  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: true,
        warehouse: true,
        createdBy: {
          select: { id: true, fullName: true, username: true }
        },
        items: {
          include: {
            product: true
          }
        }
      }
    }),
    prisma.purchaseOrder.count({ where })
  ]);

  return { orders, total, page, limit };
};

/**
 * Lấy tất cả đơn mua theo filter (phục vụ xuất Excel)
 */
export const findAllPurchaseOrdersForExport = async (distributorId, filters = {}) => {
  const where = buildPOWhereClause(distributorId, filters);

  return prisma.purchaseOrder.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      supplier: true,
      warehouse: true,
      createdBy: {
        select: { id: true, fullName: true, username: true }
      },
      items: {
        include: {
          product: true
        }
      }
    }
  });
};

/**
 * Tìm chi tiết một đơn PO theo ID
 */
export const findPurchaseOrderById = async (id, distributorId) => {
  const where = { id: BigInt(id) };
  if (distributorId) {
    where.distributorId = BigInt(distributorId);
  }

  return prisma.purchaseOrder.findFirst({
    where,
    include: {
      supplier: true,
      warehouse: true,
      createdBy: {
        select: { id: true, fullName: true, username: true, email: true }
      },
      items: {
        include: {
          product: true
        },
        orderBy: { id: 'asc' }
      },
      statusHistory: {
        include: {
          changedBy: {
            select: { id: true, fullName: true, username: true }
          }
        },
        orderBy: { changedAt: 'desc' }
      }
    }
  });
};

/**
 * Lấy danh sách PO và line items có chênh lệch giữa số lượng nhận và số lượng đặt
 */
export const findPurchaseOrderDiscrepancies = async (distributorId, filters = {}) => {
  const where = buildPOWhereClause(distributorId, filters);

  // Chỉ xét các đơn đã gửi NCC, đã nhận 1 phần hoặc đã hoàn tất
  where.status = {
    in: ['WAITING_RECEIVE', 'PARTIALLY_RECEIVED', 'COMPLETED']
  };

  const orders = await prisma.purchaseOrder.findMany({
    where,
    include: {
      supplier: true,
      warehouse: true,
      items: {
        include: {
          product: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Lọc chỉ lấy các đơn có ít nhất 1 mặt hàng nhận lệch so với đặt
  const discrepancies = [];

  for (const order of orders) {
    const diffItems = order.items.filter(item => {
      const ordered = Number(item.quantity);
      const received = Number(item.quantityReceived || 0);
      return ordered !== received;
    });

    if (diffItems.length > 0) {
      discrepancies.push({
        ...order,
        discrepantItems: diffItems
      });
    }
  }

  return discrepancies;
};
