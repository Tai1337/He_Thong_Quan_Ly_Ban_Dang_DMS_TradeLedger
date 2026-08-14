import prisma from '../config/prisma.js';

export const findSalesOrdersByDistributor = async (distributorId, filters = {}) => {
  const { page = 1, limit = 10, startDate, endDate, warehouseId, status, orderCode } = filters;
  const skip = (page - 1) * limit;

  // Build where clause
  const where = {
    distributorId: BigInt(distributorId),
  };

  if (warehouseId) {
    where.warehouseId = BigInt(warehouseId);
  }

  if (status) {
    where.status = status;
  }

  if (orderCode) {
    where.orderCode = {
      contains: orderCode,
    };
  }

  if (startDate && endDate) {
    // Filter by created_at (since expected_date is created_at + 1)
    // We adjust the date range back by 1 day because the user filters by expected_date
    const start = new Date(startDate);
    start.setDate(start.getDate() - 1);
    
    const end = new Date(endDate);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);

    where.createdAt = {
      gte: start,
      lte: end,
    };
  }

  const [orders, total] = await Promise.all([
    prisma.salesOrder.findMany({
      where,
      skip,
      take: parseInt(limit, 10),
      orderBy: { createdAt: 'desc' },
      include: {
        retailer: true,
        deliveryTrip: true,
        items: true,
        invoice: true,
      }
    }),
    prisma.salesOrder.count({ where })
  ]);

  return { orders, total };
};
