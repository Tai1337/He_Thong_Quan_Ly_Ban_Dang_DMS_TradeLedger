import prisma from '../config/prisma.js';

/**
 * Repository xử lý các truy vấn CSDL cho Chuyến xe hàng về (INBOUND Delivery Trips)
 */

/**
 * Tìm danh sách chuyến xe INBOUND có lọc và phân trang
 * @param {string|number} distributorId - ID nhà phân phối (Bắt buộc theo Data Isolation)
 * @param {Object} filters - { status, dateFilter, search, page, limit }
 */
export const findInboundDeliveryTrips = async (distributorId, filters = {}) => {
  const distId = BigInt(distributorId);
  const { status, dateFilter, search, page = 1, limit = 20 } = filters;

  const where = {
    distributorId: distId,
    tripType: 'INBOUND'
  };

  if (status && status !== 'ALL') {
    where.status = status;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Lọc theo ngày giao dự kiến (D+3)
  if (dateFilter === 'TODAY_AND_PAST') {
    where.expectedDeliveryDate = { lte: new Date() };
  } else if (dateFilter === 'TODAY') {
    const startOfToday = new Date(today);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);
    where.expectedDeliveryDate = {
      gte: startOfToday,
      lte: endOfToday
    };
  } else if (dateFilter === 'FUTURE') {
    where.expectedDeliveryDate = { gt: new Date() };
  }

  if (search) {
    where.OR = [
      { tripCode: { contains: search } },
      { supplier: { name: { contains: search } } },
      { purchaseOrders: { some: { poCode: { contains: search } } } }
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
      orderBy: { expectedDeliveryDate: 'asc' },
      include: {
        supplier: true,
        warehouse: true,
        driver: true,
        purchaseOrders: {
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        }
      }
    })
  ]);

  return { total, trips, page: Number(page), limit: Number(limit) };
};

/**
 * Lấy chi tiết 1 chuyến xe INBOUND theo ID
 * @param {string|number} tripId 
 * @param {string|number} distributorId 
 */
export const findInboundTripById = async (tripId, distributorId) => {
  const distId = BigInt(distributorId);
  return prisma.deliveryTrip.findFirst({
    where: {
      id: BigInt(tripId),
      distributorId: distId,
      tripType: 'INBOUND'
    },
    include: {
      supplier: true,
      warehouse: true,
      driver: true,
      purchaseOrders: {
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      }
    }
  });
};

/**
 * Lấy chuyến xe INBOUND kèm PO và PO items phục vụ transaction Nhập kho
 * @param {string|number} tripId 
 * @param {string|number} distributorId 
 */
export const findInboundTripForReceiving = async (tripId, distributorId) => {
  const distId = BigInt(distributorId);
  return prisma.deliveryTrip.findFirst({
    where: {
      id: BigInt(tripId),
      distributorId: distId,
      tripType: 'INBOUND'
    },
    include: {
      purchaseOrders: {
        include: {
          items: true
        }
      },
      warehouse: true
    }
  });
};

