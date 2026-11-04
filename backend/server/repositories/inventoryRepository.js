import prisma from '../config/prisma.js';

export const getInventoryLotsRpt083 = async (distributorId, filters = {}) => {
  const { 
    page = 1, 
    limit = 50, 
    warehouseId, 
    status, 
    lotNumber, 
    searchProduct,
    stockFilter,
    dateType,
    fromDate,
    toDate,
    productType,
    locationName
  } = filters;
  const skip = (page - 1) * limit;

  const where = {
    warehouse: {
      distributorId: BigInt(distributorId)
    }
  };

  if (warehouseId) where.warehouseId = BigInt(warehouseId);
  if (status) where.status = status;
  if (lotNumber) where.lotNumber = { contains: lotNumber };
  
  if (locationName) {
    where.locationName = { contains: locationName };
  }

  // Stock Filter (Dựa vào StockBalance)
  if (stockFilter === 'POSITIVE') {
    where.stockBalance = { quantityOnHand: { gt: 0 } };
  } else if (stockFilter === 'ZERO') {
    where.stockBalance = { quantityOnHand: { equals: 0 } };
  }

  // Date Filter
  if (dateType && (fromDate || toDate)) {
    const dateQuery = {};
    if (fromDate) dateQuery.gte = new Date(fromDate);
    if (toDate) {
      const t = new Date(toDate);
      t.setUTCHours(23, 59, 59, 999);
      dateQuery.lte = t;
    }
    
    if (dateType === 'MFG') {
      where.manufactureDate = dateQuery;
    } else if (dateType === 'EXP') {
      where.expiryDate = dateQuery;
    }
  }

  // Product Filter
  const productQuery = {};
  if (productType) {
    productQuery.productType = productType;
  }
  
  if (searchProduct) {
    productQuery.OR = [
      { sku: { contains: searchProduct } },
      { name: { contains: searchProduct } }
    ];
  }
  
  if (Object.keys(productQuery).length > 0) {
    where.product = productQuery;
  }

  const [lots, total] = await Promise.all([
    prisma.stockLot.findMany({
      where,
      skip,
      take: parseInt(limit, 10),
      include: {
        product: {
          include: {
            category: true
          }
        },
        stockBalance: true,
        warehouse: {
          include: {
            distributor: true
          }
        }
      },
      orderBy: {
        manufactureDate: 'desc'
      }
    }),
    prisma.stockLot.count({ where })
  ]);

  return { lots, total };
};

export const getInventoryTransactions = async (distributorId, filters = {}) => {
  const {
    page = 1,
    limit = 25,
    warehouseId,
    direction,
    referenceType,
    search,
    fromDate,
    toDate,
    productId,
  } = filters;

  const skip = (Number(page) - 1) * Number(limit);

  const where = {
    warehouse: {
      distributorId: BigInt(distributorId),
    },
  };

  if (warehouseId) {
    where.warehouseId = BigInt(warehouseId);
  }

  if (direction && ['IN', 'OUT'].includes(direction)) {
    where.direction = direction;
  }

  if (referenceType) {
    where.referenceType = referenceType;
  }

  if (productId) {
    where.stockLot = {
      productId: BigInt(productId),
    };
  }

  if (fromDate || toDate) {
    const dateFilter = {};
    if (fromDate) {
      dateFilter.gte = new Date(fromDate);
    }
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }
    where.createdAt = dateFilter;
  }

  if (search && String(search).trim() !== '') {
    const s = String(search).trim();
    where.OR = [
      { transactionCode: { contains: s } },
      { stockLot: { lotNumber: { contains: s } } },
      { stockLot: { product: { name: { contains: s } } } },
      { stockLot: { product: { sku: { contains: s } } } },
    ];
  }

  const [transactions, total, inCount, outCount] = await Promise.all([
    prisma.inventoryTransaction.findMany({
      where,
      skip,
      take: Number(limit),
      include: {
        stockLot: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
        warehouse: true,
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.inventoryTransaction.count({ where }),
    prisma.inventoryTransaction.aggregate({
      where: { ...where, direction: 'IN' },
      _sum: { quantity: true },
      _count: { id: true },
    }),
    prisma.inventoryTransaction.aggregate({
      where: { ...where, direction: 'OUT' },
      _sum: { quantity: true },
      _count: { id: true },
    }),
  ]);

  const soIds = transactions
    .filter((t) => t.referenceType === 'SALES_ORDER' && t.referenceId)
    .map((t) => t.referenceId);
  const poIds = transactions
    .filter((t) => t.referenceType === 'PURCHASE_ORDER' && t.referenceId)
    .map((t) => t.referenceId);
  const countIds = transactions
    .filter((t) => t.referenceType === 'INVENTORY_COUNT' && t.referenceId)
    .map((t) => t.referenceId);
  const adjIds = transactions
    .filter((t) => t.referenceType === 'INVENTORY_ADJUSTMENT' && t.referenceId)
    .map((t) => t.referenceId);

  const [salesOrders, purchaseOrders, inventoryCounts, adjustments] = await Promise.all([
    soIds.length
      ? prisma.salesOrder.findMany({
          where: { id: { in: soIds } },
          select: { id: true, orderCode: true },
        })
      : [],
    poIds.length
      ? prisma.purchaseOrder.findMany({
          where: { id: { in: poIds } },
          select: { id: true, poCode: true },
        })
      : [],
    countIds.length
      ? prisma.inventoryCount.findMany({
          where: { id: { in: countIds } },
          select: { id: true, countCode: true },
        })
      : [],
    adjIds.length
      ? prisma.inventoryAdjustment.findMany({
          where: { id: { in: adjIds } },
          select: { id: true, adjustmentCode: true },
        })
      : [],
  ]);

  const soMap = new Map();
  salesOrders.forEach((s) => soMap.set(s.id.toString(), s.orderCode));

  const poMap = new Map();
  purchaseOrders.forEach((p) => poMap.set(p.id.toString(), p.poCode));

  const countMap = new Map();
  inventoryCounts.forEach((c) => countMap.set(c.id.toString(), c.countCode));

  const adjMap = new Map();
  adjustments.forEach((a) => adjMap.set(a.id.toString(), a.adjustmentCode));

  const enrichedTransactions = transactions.map((t) => {
    let refCode = '';
    const refIdStr = t.referenceId?.toString() || '';
    if (t.referenceType === 'SALES_ORDER') refCode = soMap.get(refIdStr) || (refIdStr ? `SO#${refIdStr}` : '');
    else if (t.referenceType === 'PURCHASE_ORDER') refCode = poMap.get(refIdStr) || (refIdStr ? `PO#${refIdStr}` : '');
    else if (t.referenceType === 'INVENTORY_COUNT') refCode = countMap.get(refIdStr) || (refIdStr ? `CNT#${refIdStr}` : '');
    else if (t.referenceType === 'INVENTORY_ADJUSTMENT') refCode = adjMap.get(refIdStr) || (refIdStr ? `ADJ#${refIdStr}` : '');
    else if (refIdStr) refCode = `#${refIdStr}`;

    return {
      ...t,
      referenceCode: refCode,
    };
  });

  return {
    transactions: enrichedTransactions,
    total,
    summary: {
      totalTransactions: total,
      totalInQty: Number(inCount._sum.quantity || 0),
      totalInCount: inCount._count.id || 0,
      totalOutQty: Number(outCount._sum.quantity || 0),
      totalOutCount: outCount._count.id || 0,
    },
  };
};
