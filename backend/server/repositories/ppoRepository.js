import prisma from '../config/prisma.js';

/**
 * Xây dựng where clause cho PPO
 */
export const buildPpoWhereClause = (distributorId, filters = {}) => {
  const where = {};

  if (distributorId) {
    where.distributorId = BigInt(distributorId);
  }

  if (filters.productId) {
    where.productId = BigInt(filters.productId);
  }

  if (filters.supplierId) {
    where.supplierId = BigInt(filters.supplierId);
  }

  if (filters.priority) {
    where.priority = filters.priority;
  }

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

  if (filters.search && filters.search.trim()) {
    const s = filters.search.trim();
    where.product = {
      OR: [
        { sku: { contains: s } },
        { name: { contains: s } }
      ]
    };
  }

  if (filters.dateFrom || filters.dateTo) {
    where.generatedAt = {};
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      from.setHours(0, 0, 0, 0);
      where.generatedAt.gte = from;
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      where.generatedAt.lte = to;
    }
  }

  return where;
};

/**
 * Lấy danh sách đề xuất PPO có phân trang
 */
export const findPpoSuggestions = async (distributorId, filters = {}) => {
  const where = buildPpoWhereClause(distributorId, filters);
  const page = parseInt(filters.page || 1, 10);
  const limit = parseInt(filters.limit || 20, 10);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.ppoSuggestion.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { priority: 'asc' }, // HIGH, MEDIUM, LOW
        { generatedAt: 'desc' }
      ],
      include: {
        product: true,
        supplier: true,
        warehouse: true,
        purchaseOrder: {
          select: { id: true, poCode: true, status: true }
        },
        reviewedBy: {
          select: { id: true, fullName: true, username: true }
        }
      }
    }),
    prisma.ppoSuggestion.count({ where })
  ]);

  return { items, total, page, limit };
};

/**
 * Lấy chi tiết 1 đề xuất PPO
 */
export const findPpoById = async (id, distributorId) => {
  const where = { id: BigInt(id) };
  if (distributorId) {
    where.distributorId = BigInt(distributorId);
  }

  return prisma.ppoSuggestion.findFirst({
    where,
    include: {
      product: true,
      supplier: true,
      warehouse: true,
      purchaseOrder: {
        select: { id: true, poCode: true, status: true, createdAt: true }
      },
      reviewedBy: {
        select: { id: true, fullName: true, username: true }
      }
    }
  });
};

/**
 * Thống kê KPI tổng quan của PPO
 */
export const findPpoSummary = async (distributorId) => {
  const where = distributorId ? { distributorId: BigInt(distributorId) } : {};

  const [byStatus, byPriority, total] = await Promise.all([
    prisma.ppoSuggestion.groupBy({
      by: ['status'],
      where,
      _count: { id: true }
    }),
    prisma.ppoSuggestion.groupBy({
      by: ['priority'],
      where: { ...where, status: { in: ['NEW', 'VIEWED'] } },
      _count: { id: true }
    }),
    prisma.ppoSuggestion.count({ where })
  ]);

  const summary = {
    total,
    NEW: 0,
    VIEWED: 0,
    APPROVED: 0,
    REJECTED: 0,
    HIGH_PRIORITY: 0,
    MEDIUM_PRIORITY: 0,
    LOW_PRIORITY: 0
  };

  byStatus.forEach(r => {
    if (summary[r.status] !== undefined) summary[r.status] = r._count.id;
  });

  byPriority.forEach(r => {
    if (r.priority === 'HIGH') summary.HIGH_PRIORITY = r._count.id;
    if (r.priority === 'MEDIUM') summary.MEDIUM_PRIORITY = r._count.id;
    if (r.priority === 'LOW') summary.LOW_PRIORITY = r._count.id;
  });

  return summary;
};
