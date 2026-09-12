import prisma from '../config/prisma.js';

/**
 * Repository xử lý các truy vấn liên quan đến Chuyến xe vận chuyển (DeliveryTrip)
 * Đảm bảo Data Isolation theo distributorId
 */

export const findDeliveryTrips = async ({ 
  distributorId, 
  status, 
  tripType, 
  warehouseId, 
  search, 
  page = 1, 
  limit = 15 
}) => {
  const where = {
    distributorId: BigInt(distributorId)
  };

  if (status && status !== 'ALL') {
    where.status = status;
  }

  if (tripType && tripType !== 'ALL') {
    where.tripType = tripType;
  }

  if (warehouseId) {
    where.warehouseId = BigInt(warehouseId);
  }

  if (search && search.trim()) {
    const term = search.trim();
    where.OR = [
      { tripCode: { contains: term } },
      { licensePlate: { contains: term } },
      { driver: { fullName: { contains: term } } },
      { notes: { contains: term } }
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const [total, trips] = await Promise.all([
    prisma.deliveryTrip.count({ where }),
    prisma.deliveryTrip.findMany({
      where,
      skip,
      take,
      include: {
        driver: {
          select: { id: true, fullName: true, phone: true }
        },
        warehouse: {
          select: { id: true, code: true, name: true }
        },
        supplier: {
          select: { id: true, code: true, name: true }
        },
        salesOrders: {
          select: {
            id: true,
            orderCode: true,
            status: true,
            retailer: { select: { id: true, code: true, name: true, address: true } },
            items: {
              select: {
                id: true,
                quantity: true,
                product: {
                  select: { id: true, name: true, sku: true, unit: true, weightKg: true }
                }
              }
            }
          }
        },
        purchaseOrders: {
          select: {
            id: true,
            poCode: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  return { total, trips, page: Number(page), limit: Number(limit) };
};

export const findDeliveryTripById = async (tripId, distributorId) => {
  const where = { id: BigInt(tripId) };
  if (distributorId) {
    where.distributorId = BigInt(distributorId);
  }

  return prisma.deliveryTrip.findFirst({
    where,
    include: {
      driver: {
        select: { id: true, fullName: true, phone: true, username: true }
      },
      warehouse: {
        select: { id: true, code: true, name: true }
      },
      supplier: {
        select: { id: true, code: true, name: true }
      },
      salesOrders: {
        include: {
          retailer: true,
          warehouse: true,
          items: {
            include: {
              product: true,
              allocations: {
                include: {
                  stockLot: true
                }
              }
            }
          },
          statusHistory: {
            orderBy: { changedAt: 'desc' },
            take: 3
          }
        },
        orderBy: { createdAt: 'desc' }
      },
      purchaseOrders: {
        include: {
          items: {
            include: { product: true }
          }
        }
      }
    }
  });
};

/**
 * Tìm tất cả các đơn hàng bán ALLOCATED chưa gán chuyến xe nào
 */
export const findAllocatedOrdersForDispatch = async (distributorId, warehouseId) => {
  const where = {
    distributorId: BigInt(distributorId),
    status: 'ALLOCATED',
    deliveryTripId: null
  };

  if (warehouseId) {
    where.warehouseId = BigInt(warehouseId);
  }

  return prisma.salesOrder.findMany({
    where,
    include: {
      retailer: {
        select: { id: true, code: true, name: true, address: true, phone: true }
      },
      warehouse: {
        select: { id: true, code: true, name: true }
      },
      items: {
        include: {
          product: {
            select: { id: true, sku: true, name: true, unit: true, weightKg: true }
          },
          allocations: {
            include: {
              stockLot: {
                select: {
                  id: true,
                  lotNumber: true,
                  expiryDate: true,
                  manufactureDate: true,
                  locationCode: true,
                  locationName: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  });
};

export const createDeliveryTripRecord = async (data, tx = prisma) => {
  return tx.deliveryTrip.create({ data });
};

export const updateDeliveryTripRecord = async (tripId, data, tx = prisma) => {
  return tx.deliveryTrip.update({
    where: { id: BigInt(tripId) },
    data
  });
};
