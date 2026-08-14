import { getInventoryLotsRpt083 } from '../repositories/inventoryRepository.js';

export const getInventoryRpt083Service = async (distributorId, filters) => {
  const { lots, total } = await getInventoryLotsRpt083(distributorId, filters);

  const formattedData = lots.map((lot, index) => {
    const totalSmallQty = lot.stockBalance ? Number(lot.stockBalance.quantityOnHand) : 0;
    
    // Đã có conversionRate trong DB
    const conversionRate = lot.product.conversionRate || 1; 
    
    const qtyBig = Math.floor(totalSmallQty / conversionRate);
    const qtySmall = totalSmallQty % conversionRate;
    
    const price = Number(lot.product.basePrice || 0);
    const amount = totalSmallQty * price;

    const mfgDate = lot.manufactureDate 
      ? new Date(lot.manufactureDate).toLocaleDateString('en-GB')
      : '';

    return {
      id: lot.id.toString(),
      index: index + 1,
      productCode: lot.product.sku,
      productName: lot.product.name,
      type: lot.product.productType || 'FG',
      qtyBig: qtyBig,
      qtySmall: qtySmall,
      unitBig: lot.product.unit || 'Thùng',
      unitSmall: lot.product.retailUnit || 'Gói',
      totalSmall: totalSmallQty,
      price: price,
      amount: amount,
      actualBig: null,
      actualSmall: null,
      status: lot.status,
      lotNumber: lot.lotNumber,
      mfgDate: mfgDate
    };
  });

  return {
    data: formattedData,
    pagination: {
      total,
      page: parseInt(filters.page || 1, 10),
      limit: parseInt(filters.limit || 50, 10),
    }
  };
};

export const getInventoryRpt083ExportService = async (distributorId, filters) => {
  const allFilters = { ...filters };
  delete allFilters.page;
  delete allFilters.limit;
  allFilters.limit = 100000;
  
  const { lots } = await getInventoryLotsRpt083(distributorId, allFilters);

  return lots.map(lot => {
    const totalSmallQty = lot.stockBalance ? Number(lot.stockBalance.quantityOnHand) : 0;
    const conversionRate = lot.product.conversionRate || 1;
    const qtyBig = Math.floor(totalSmallQty / conversionRate);
    const qtySmall = totalSmallQty % conversionRate;
    const price = Number(lot.product.basePrice || 0);
    const amount = totalSmallQty * price;
    
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '';
    const formatDateTime = (d) => {
      if (!d) return '';
      const dt = new Date(d);
      return dt.toLocaleDateString('en-GB') + ' ' + dt.toLocaleTimeString('en-GB');
    };

    return {
      distCode: lot.warehouse?.distributor?.code || 'G-10KF1292',
      distName: lot.warehouse?.distributor?.name || 'Nhà Phân Phối G KF1292',
      channel: lot.warehouse?.distributor?.channel || 'Truyền thống',
      warehouseCode: lot.warehouse?.code || '',
      warehouseName: lot.warehouse?.name || '',
      region: lot.warehouse?.distributor?.region || '',
      status: lot.status === 'GOOD' ? 'Good' : 'Defective',
      sku: lot.product.sku,
      productName: lot.product.name,
      lotNumber: lot.lotNumber,
      mfgDate: formatDate(lot.manufactureDate),
      expDate: formatDate(lot.expiryDate),
      unitBig: lot.product.unit || 'Thùng',
      unitSmall: lot.product.retailUnit || 'Gói',
      productType: lot.product.productType || 'FG',
      subDivision: lot.product.category?.name || '',
      stdSku: lot.product.stdSku || '',
      stdSkuName: lot.product.stdSkuName || '',
      groupStdSku: lot.product.groupStdSku || '',
      saleStatus: lot.product.status ? 'Đang bán' : 'Ngừng bán',
      price: price,
      conversionRate: conversionRate,
      qtyBig: qtyBig,
      qtySmall: qtySmall,
      totalSmallQty: totalSmallQty,
      amount: amount,
      locationType: lot.warehouse?.type === 'SALES' ? 'Kho hàng bán' : (lot.warehouse?.type === 'VANSALE' ? 'Kho hàng NVBH' : 'Khác'),
      locationCode: lot.locationCode || '',
      locationName: lot.locationName || '',
      updatedBy: 'System', 
      updatedAt: formatDateTime(new Date()) 
    };
  });
};
