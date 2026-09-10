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
