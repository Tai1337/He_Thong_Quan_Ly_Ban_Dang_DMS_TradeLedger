import { findSalesOrdersByDistributor } from '../repositories/salesOrderRepository.js';

export const getSalesOrdersWithKPIs = async (distributorId, filters) => {
  const { orders, total } = await findSalesOrdersByDistributor(distributorId, filters);

  let totalAmount = 0;
  let totalDiscount = 0;

  const formattedOrders = orders.map(order => {
    // Expected date is created_at + 1 day
    const expectedDate = new Date(order.createdAt);
    expectedDate.setDate(expectedDate.getDate() + 1);

    // Calculate total amount for this order
    let orderTotal = 0;
    if (order.invoice) {
       orderTotal = Number(order.invoice.totalAmount);
    } else if (order.items && order.items.length > 0) {
       orderTotal = order.items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
    }
    
    // Total discount (mocked as 0 for now based on requirements)
    const orderDiscount = 0;

    totalAmount += orderTotal;
    totalDiscount += orderDiscount;

    return {
      id: order.id.toString(),
      orderCode: order.orderCode,
      retailerCode: order.retailer?.code || '',
      retailerName: order.retailer?.name || '',
      address: order.retailer?.address || '',
      expectedDate: expectedDate.toISOString(),
      truckCode: order.deliveryTrip?.tripCode || 'Chưa điều phối',
      status: order.status,
      stockStatus: 'Đủ tồn', // Mocking stock status for UI
      totalAmount: orderTotal,
      discount: orderDiscount,
    };
  });

  return {
    data: formattedOrders,
    kpis: {
      totalOrders: total,
      totalAmount,
      totalDiscount,
      totalOrderValue: totalAmount - totalDiscount,
      totalTons: 0, // Mocked for now
      totalCbm: 0, // Mocked for now
    },
    pagination: {
      total,
      page: parseInt(filters.page || 1, 10),
      limit: parseInt(filters.limit || 10, 10),
    }
  };
};
