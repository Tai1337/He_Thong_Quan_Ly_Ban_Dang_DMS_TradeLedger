import prisma from '../config/prisma.js';
import ExcelJS from 'exceljs';
import {
  findPurchaseOrders,
  findAllPurchaseOrdersForExport,
  findPurchaseOrderById,
  findPurchaseOrderDiscrepancies
} from '../repositories/purchaseOrderRepository.js';

// Helper format số tiền VNĐ
const formatNumber = (num) => Number(num || 0);

/**
 * Format PO entity sang JSON an toàn (BigInt -> String, Decimal -> Number)
 */
export const sanitizePurchaseOrder = (order) => {
  if (!order) return null;

  const totalOrderedQty = order.items?.reduce((sum, item) => sum + formatNumber(item.quantity), 0) || 0;
  const totalReceivedQty = order.items?.reduce((sum, item) => sum + formatNumber(item.quantityReceived), 0) || 0;
  const totalAmount = order.items?.reduce((sum, item) => {
    return sum + (formatNumber(item.quantity) * formatNumber(item.unitPrice));
  }, 0) || 0;
  const totalReceivedAmount = order.items?.reduce((sum, item) => {
    return sum + (formatNumber(item.quantityReceived) * formatNumber(item.unitPrice));
  }, 0) || 0;

  const receivedPercentage = totalOrderedQty > 0 
    ? Math.min(100, Math.round((totalReceivedQty / totalOrderedQty) * 100))
    : 0;

  return {
    id: order.id.toString(),
    poCode: order.poCode,
    distributorId: order.distributorId.toString(),
    warehouseId: order.warehouseId.toString(),
    supplierId: order.supplierId ? order.supplierId.toString() : null,
    status: order.status,
    expectedDate: order.expectedDate ? order.expectedDate.toISOString().slice(0, 10) : null,
    notes: order.notes,
    cancelReason: order.cancelReason,
    closeReason: order.closeReason,
    createdById: order.createdById ? order.createdById.toString() : null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    supplier: order.supplier ? {
      id: order.supplier.id.toString(),
      code: order.supplier.code,
      name: order.supplier.name,
      phone: order.supplier.phone,
      address: order.supplier.address
    } : null,
    warehouse: order.warehouse ? {
      id: order.warehouse.id.toString(),
      code: order.warehouse.code,
      name: order.warehouse.name,
      type: order.warehouse.type
    } : null,
    createdBy: order.createdBy ? {
      id: order.createdBy.id.toString(),
      fullName: order.createdBy.fullName,
      username: order.createdBy.username
    } : null,
    items: (order.items || []).map(item => {
      const qty = formatNumber(item.quantity);
      const received = formatNumber(item.quantityReceived);
      const price = formatNumber(item.unitPrice);
      const lineTotal = qty * price;
      const percent = qty > 0 ? Math.min(100, Math.round((received / qty) * 100)) : 0;

      return {
        id: item.id.toString(),
        purchaseOrderId: item.purchaseOrderId.toString(),
        productId: item.productId.toString(),
        quantity: qty,
        quantityReceived: received,
        quantityRemaining: Math.max(0, qty - received),
        unitPrice: price,
        lineTotal,
        receivedPercentage: percent,
        product: item.product ? {
          id: item.product.id.toString(),
          sku: item.product.sku,
          name: item.product.name,
          unit: item.product.unit,
          basePrice: formatNumber(item.product.basePrice)
        } : null
      };
    }),
    statusHistory: (order.statusHistory || []).map(sh => ({
      id: sh.id.toString(),
      purchaseOrderId: sh.purchaseOrderId.toString(),
      fromStatus: sh.fromStatus,
      toStatus: sh.toStatus,
      changedById: sh.changedById ? sh.changedById.toString() : null,
      changedAt: sh.changedAt,
      notes: sh.notes,
      changedBy: sh.changedBy ? {
        id: sh.changedBy.id.toString(),
        fullName: sh.changedBy.fullName,
        username: sh.changedBy.username
      } : null
    })),
    // Summary metrics cho đơn này
    metrics: {
      totalOrderedQty,
      totalReceivedQty,
      totalRemainingQty: Math.max(0, totalOrderedQty - totalReceivedQty),
      totalAmount,
      totalReceivedAmount,
      receivedPercentage
    }
  };
};

/**
 * Service lấy danh sách PO kèm KPI tổng quan
 */
export const getPurchaseOrdersService = async (distributorId, filters = {}) => {
  const { orders, total, page, limit } = await findPurchaseOrders(distributorId, filters);

  const sanitizedOrders = orders.map(sanitizePurchaseOrder);

  // Tính toán KPI tổng hợp dựa trên danh sách hiện tại (hoặc truy vấn nhanh)
  const whereDist = distributorId ? { distributorId: BigInt(distributorId) } : {};
  const allOrdersSummary = await prisma.purchaseOrder.groupBy({
    by: ['status'],
    where: whereDist,
    _count: { id: true }
  });

  const countByStatus = {
    DRAFT: 0,
    WAITING_RECEIVE: 0,
    PARTIALLY_RECEIVED: 0,
    COMPLETED: 0,
    CANCELLED: 0
  };

  allOrdersSummary.forEach(row => {
    if (countByStatus[row.status] !== undefined) {
      countByStatus[row.status] = row._count.id;
    }
  });

  const totalAllOrders = Object.values(countByStatus).reduce((a, b) => a + b, 0);

  return {
    data: sanitizedOrders,
    total,
    page,
    limit,
    summary: {
      totalOrders: totalAllOrders,
      ...countByStatus
    }
  };
};

/**
 * Service lấy chi tiết một PO
 */
export const getPurchaseOrderByIdService = async (id, distributorId) => {
  const order = await findPurchaseOrderById(id, distributorId);
  if (!order) return null;
  return sanitizePurchaseOrder(order);
};

/**
 * Service tạo đơn mua PO mới (trạng thái DRAFT)
 */
export const createPurchaseOrderService = async ({
  distributorId,
  warehouseId,
  supplierId,
  expectedDate,
  notes,
  items,
  createdById
}) => {
  // Guard clauses
  if (!distributorId) throw new Error('Thiếu thông tin Nhà phân phối (distributorId)');
  if (!warehouseId) throw new Error('Vui lòng chọn Kho nhận hàng');
  if (!items || items.length === 0) throw new Error('Đơn đặt hàng phải có ít nhất 1 sản phẩm');

  // Kiểm tra kho
  const warehouse = await prisma.warehouse.findUnique({
    where: { id: BigInt(warehouseId) }
  });
  if (!warehouse) throw new Error('Kho nhận hàng không tồn tại');

  // Tạo mã PO duy nhất
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const poCode = `PO-${dateStr}-${randomSuffix}`;

  return prisma.$transaction(async (tx) => {
    // 1. Tạo PurchaseOrder
    const order = await tx.purchaseOrder.create({
      data: {
        poCode,
        distributorId: BigInt(distributorId),
        warehouseId: BigInt(warehouseId),
        supplierId: supplierId ? BigInt(supplierId) : null,
        status: 'DRAFT',
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        notes: notes || null,
        createdById: createdById ? BigInt(createdById) : null,
        items: {
          create: items.map(item => ({
            productId: BigInt(item.productId),
            quantity: Number(item.quantity),
            quantityReceived: 0,
            unitPrice: Number(item.unitPrice || 0)
          }))
        }
      },
      include: {
        supplier: true,
        warehouse: true,
        items: { include: { product: true } }
      }
    });

    // 2. Ghi nhận lịch sử trạng thái ban đầu
    await tx.purchaseOrderStatusHistory.create({
      data: {
        purchaseOrderId: order.id,
        fromStatus: null,
        toStatus: 'DRAFT',
        changedById: createdById ? BigInt(createdById) : null,
        notes: 'Khởi tạo đơn đặt hàng mua (Nháp)'
      }
    });

    return sanitizePurchaseOrder(order);
  });
};

/**
 * Service cập nhật PO khi còn ở trạng thái DRAFT
 */
export const updatePurchaseOrderService = async (id, {
  distributorId,
  warehouseId,
  supplierId,
  expectedDate,
  notes,
  items,
  userId
}) => {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id: BigInt(id) },
    include: { items: true }
  });

  if (!order) throw new Error('Không tìm thấy đơn đặt hàng mua');
  if (distributorId && order.distributorId.toString() !== distributorId.toString()) {
    throw new Error('Bạn không có quyền chỉnh sửa đơn hàng này');
  }

  // Guard: Chỉ cho phép sửa khi còn là DRAFT
  if (order.status !== 'DRAFT') {
    throw new Error(`Không thể chỉnh sửa đơn hàng ở trạng thái "${order.status}". Chỉ cho phép sửa khi đơn ở trạng thái Nháp (DRAFT).`);
  }

  return prisma.$transaction(async (tx) => {
    // Nếu có cập nhật danh sách items
    if (items && items.length > 0) {
      // Xoá các items cũ
      await tx.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: order.id }
      });

      // Tạo items mới
      await tx.purchaseOrderItem.createMany({
        data: items.map(item => ({
          purchaseOrderId: order.id,
          productId: BigInt(item.productId),
          quantity: Number(item.quantity),
          quantityReceived: 0,
          unitPrice: Number(item.unitPrice || 0)
        }))
      });
    }

    // Cập nhật thông tin chung PO
    const updateData = {};
    if (warehouseId) updateData.warehouseId = BigInt(warehouseId);
    if (supplierId !== undefined) updateData.supplierId = supplierId ? BigInt(supplierId) : null;
    if (expectedDate !== undefined) updateData.expectedDate = expectedDate ? new Date(expectedDate) : null;
    if (notes !== undefined) updateData.notes = notes;

    const updated = await tx.purchaseOrder.update({
      where: { id: order.id },
      data: updateData,
      include: {
        supplier: true,
        warehouse: true,
        items: { include: { product: true } },
        statusHistory: true
      }
    });

    // Ghi nhật ký chỉnh sửa
    await tx.purchaseOrderStatusHistory.create({
      data: {
        purchaseOrderId: order.id,
        fromStatus: 'DRAFT',
        toStatus: 'DRAFT',
        changedById: userId ? BigInt(userId) : null,
        notes: 'Chỉnh sửa nội dung đơn đặt hàng mua (Nháp)'
      }
    });

    return sanitizePurchaseOrder(updated);
  });
};

/**
 * Service gửi PO cho NCC (DRAFT -> WAITING_RECEIVE)
 */
export const sendPurchaseOrderToSupplierService = async (id, { distributorId, userId, notes }) => {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id: BigInt(id) },
    include: { items: true }
  });

  if (!order) throw new Error('Không tìm thấy đơn đặt hàng mua');
  if (distributorId && order.distributorId.toString() !== distributorId.toString()) {
    throw new Error('Bạn không có quyền thao tác trên đơn hàng này');
  }

  // Guard: Chỉ cho phép gửi khi đang DRAFT
  if (order.status !== 'DRAFT') {
    throw new Error(`Đơn hàng đang ở trạng thái "${order.status}", không thể gửi cho Nhà cung cấp.`);
  }

  if (!order.items || order.items.length === 0) {
    throw new Error('Đơn hàng chưa có sản phẩm nào, không thể gửi NCC');
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.purchaseOrder.update({
      where: { id: order.id },
      data: { status: 'WAITING_RECEIVE' },
      include: {
        supplier: true,
        warehouse: true,
        items: { include: { product: true } }
      }
    });

    await tx.purchaseOrderStatusHistory.create({
      data: {
        purchaseOrderId: order.id,
        fromStatus: 'DRAFT',
        toStatus: 'WAITING_RECEIVE',
        changedById: userId ? BigInt(userId) : null,
        notes: notes || 'Đã gửi đơn đặt hàng cho Nhà cung cấp, khoá số lượng đặt'
      }
    });

    return sanitizePurchaseOrder(updated);
  });
};

/**
 * Service huỷ PO (DRAFT hoặc WAITING_RECEIVE)
 */
export const cancelPurchaseOrderService = async (id, { distributorId, userId, reason }) => {
  if (!reason || !reason.trim()) {
    throw new Error('Vui lòng nhập lý do huỷ đơn đặt hàng');
  }

  const order = await prisma.purchaseOrder.findUnique({
    where: { id: BigInt(id) },
    include: { items: true }
  });

  if (!order) throw new Error('Không tìm thấy đơn đặt hàng mua');
  if (distributorId && order.distributorId.toString() !== distributorId.toString()) {
    throw new Error('Bạn không có quyền thao tác trên đơn hàng này');
  }

  // Guard: Chỉ huỷ được khi DRAFT hoặc WAITING_RECEIVE (chưa nhận hàng lần nào)
  if (order.status !== 'DRAFT' && order.status !== 'WAITING_RECEIVE') {
    throw new Error(`Không thể huỷ đơn hàng ở trạng thái "${order.status}". Đơn đã nhận hàng không được phép huỷ.`);
  }

  // Kiểm tra thêm: nếu đã nhận ít nhất 1 sp thì không được huỷ
  const hasReceived = order.items.some(i => Number(i.quantityReceived) > 0);
  if (hasReceived) {
    throw new Error('Đơn hàng đã nhận một số sản phẩm nhập kho, không thể huỷ đơn.');
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.purchaseOrder.update({
      where: { id: order.id },
      data: {
        status: 'CANCELLED',
        cancelReason: reason.trim()
      },
      include: {
        supplier: true,
        warehouse: true,
        items: { include: { product: true } }
      }
    });

    await tx.purchaseOrderStatusHistory.create({
      data: {
        purchaseOrderId: order.id,
        fromStatus: order.status,
        toStatus: 'CANCELLED',
        changedById: userId ? BigInt(userId) : null,
        notes: `Huỷ đơn đặt hàng: ${reason.trim()}`
      }
    });

    return sanitizePurchaseOrder(updated);
  });
};

/**
 * Service nhận hàng nhập kho từ PO (WAITING_RECEIVE hoặc PARTIALLY_RECEIVED)
 * Body: { items: [{ itemId, quantityReceived, lotNumber, manufactureDate, expiryDate, locationCode }], notes, userId }
 */
export const receiveGoodsService = async (id, { distributorId, userId, items, notes }) => {
  if (!items || items.length === 0) {
    throw new Error('Vui lòng chọn ít nhất 1 sản phẩm để nhận hàng');
  }

  const order = await prisma.purchaseOrder.findUnique({
    where: { id: BigInt(id) },
    include: { items: { include: { product: true } } }
  });

  if (!order) throw new Error('Không tìm thấy đơn đặt hàng mua');
  if (distributorId && order.distributorId.toString() !== distributorId.toString()) {
    throw new Error('Bạn không có quyền thao tác trên đơn hàng này');
  }

  // Guard: Chỉ nhận khi WAITING_RECEIVE hoặc PARTIALLY_RECEIVED
  if (order.status !== 'WAITING_RECEIVE' && order.status !== 'PARTIALLY_RECEIVED') {
    throw new Error(`Đơn hàng ở trạng thái "${order.status}" không thể nhận hàng nhập kho.`);
  }

  return prisma.$transaction(async (tx) => {
    const receiveLogs = [];

    for (const recItem of items) {
      const receiveQty = Number(recItem.quantityReceived);
      if (!receiveQty || receiveQty <= 0) continue; // Bỏ qua dòng không nhận

      const lineItem = order.items.find(i => i.id.toString() === recItem.itemId.toString());
      if (!lineItem) {
        throw new Error(`Mặt hàng (ID ${recItem.itemId}) không thuộc đơn PO này`);
      }

      const lotNumber = (recItem.lotNumber || '').trim();
      if (!lotNumber) {
        throw new Error(`Vui lòng nhập số lô cho sản phẩm "${lineItem.product?.name || lineItem.productId}"`);
      }

      const mfgDate = recItem.manufactureDate ? new Date(recItem.manufactureDate) : null;
      const expDate = recItem.expiryDate ? new Date(recItem.expiryDate) : null;
      const locationCode = recItem.locationCode || 'A-01';

      // 1. Tìm hoặc tạo StockLot (lô hàng) theo (productId, warehouseId, lotNumber)
      let lot = await tx.stockLot.findUnique({
        where: {
          productId_warehouseId_lotNumber: {
            productId: lineItem.productId,
            warehouseId: order.warehouseId,
            lotNumber: lotNumber
          }
        }
      });

      if (!lot) {
        lot = await tx.stockLot.create({
          data: {
            productId: lineItem.productId,
            warehouseId: order.warehouseId,
            lotNumber: lotNumber,
            manufactureDate: mfgDate,
            expiryDate: expDate,
            locationCode: locationCode,
            status: 'GOOD'
          }
        });
      } else {
        // Cập nhật ngày SX/HSD nếu trước đó chưa có
        if (!lot.manufactureDate && mfgDate) {
          await tx.stockLot.update({
            where: { id: lot.id },
            data: { manufactureDate: mfgDate }
          });
        }
        if (!lot.expiryDate && expDate) {
          await tx.stockLot.update({
            where: { id: lot.id },
            data: { expiryDate: expDate }
          });
        }
      }

      // 2. Tăng số lượng tồn kho thực tế (quantityOnHand) trong StockBalance
      const balance = await tx.stockBalance.findUnique({
        where: { lotId: lot.id }
      });

      if (!balance) {
        await tx.stockBalance.create({
          data: {
            lotId: lot.id,
            quantityOnHand: receiveQty,
            quantityReserved: 0
          }
        });
      } else {
        await tx.stockBalance.update({
          where: { lotId: lot.id },
          data: {
            quantityOnHand: { increment: receiveQty }
          }
        });
      }

      // 3. Ghi nhận giao dịch nhập kho (InventoryTransaction - IN)
      const txnCode = `TXN-IN-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      await tx.inventoryTransaction.create({
        data: {
          transactionCode: txnCode,
          direction: 'IN',
          lotId: lot.id,
          warehouseId: order.warehouseId,
          quantity: receiveQty,
          unitPrice: lineItem.unitPrice,
          referenceType: 'PURCHASE_ORDER',
          referenceId: order.id,
          createdById: userId ? BigInt(userId) : null
        }
      });

      // 4. Cộng dồn quantityReceived vào PurchaseOrderItem
      await tx.purchaseOrderItem.update({
        where: { id: lineItem.id },
        data: {
          quantityReceived: { increment: receiveQty }
        }
      });

      receiveLogs.push(`${lineItem.product?.sku}: nhận ${receiveQty} (Lô: ${lotNumber})`);
    }

    if (receiveLogs.length === 0) {
      throw new Error('Không có sản phẩm nào được nhập số lượng nhận > 0');
    }

    // 5. Kiểm tra lại toàn bộ tiến độ của PO sau lần nhận này
    const updatedItems = await tx.purchaseOrderItem.findMany({
      where: { purchaseOrderId: order.id }
    });

    const isAllCompleted = updatedItems.every(i => {
      const ordered = Number(i.quantity);
      const rec = Number(i.quantityReceived);
      return rec >= ordered;
    });

    const newStatus = isAllCompleted ? 'COMPLETED' : 'PARTIALLY_RECEIVED';

    const updatedOrder = await tx.purchaseOrder.update({
      where: { id: order.id },
      data: { status: newStatus },
      include: {
        supplier: true,
        warehouse: true,
        items: { include: { product: true } }
      }
    });

    // 6. Ghi nhận lịch sử trạng thái
    const logText = notes 
      ? `${notes} | Chi tiết: ${receiveLogs.join(', ')}`
      : `Nhận hàng nhập kho: ${receiveLogs.join(', ')}`;

    await tx.purchaseOrderStatusHistory.create({
      data: {
        purchaseOrderId: order.id,
        fromStatus: order.status,
        toStatus: newStatus,
        changedById: userId ? BigInt(userId) : null,
        notes: logText
      }
    });

    return sanitizePurchaseOrder(updatedOrder);
  });
};

/**
 * Service đóng PO dù thiếu hàng (PARTIALLY_RECEIVED -> COMPLETED)
 */
export const closePartialPurchaseOrderService = async (id, { distributorId, userId, reason }) => {
  if (!reason || !reason.trim()) {
    throw new Error('Vui lòng nhập lý do đóng đơn hàng');
  }

  const order = await prisma.purchaseOrder.findUnique({
    where: { id: BigInt(id) }
  });

  if (!order) throw new Error('Không tìm thấy đơn đặt hàng mua');
  if (distributorId && order.distributorId.toString() !== distributorId.toString()) {
    throw new Error('Bạn không có quyền thao tác trên đơn hàng này');
  }

  // Guard: Chỉ đóng khi PARTIALLY_RECEIVED
  if (order.status !== 'PARTIALLY_RECEIVED') {
    throw new Error(`Không thể đóng đơn ở trạng thái "${order.status}". Chỉ áp dụng cho đơn "Đã nhận một phần".`);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.purchaseOrder.update({
      where: { id: order.id },
      data: {
        status: 'COMPLETED',
        closeReason: reason.trim()
      },
      include: {
        supplier: true,
        warehouse: true,
        items: { include: { product: true } }
      }
    });

    await tx.purchaseOrderStatusHistory.create({
      data: {
        purchaseOrderId: order.id,
        fromStatus: 'PARTIALLY_RECEIVED',
        toStatus: 'COMPLETED',
        changedById: userId ? BigInt(userId) : null,
        notes: `Đóng đơn dù thiếu hàng: ${reason.trim()}`
      }
    });

    return sanitizePurchaseOrder(updated);
  });
};

/**
 * Service lấy danh sách chênh lệch nhận hàng
 */
export const getPurchaseOrderDiscrepanciesService = async (distributorId, filters = {}) => {
  const discrepancies = await findPurchaseOrderDiscrepancies(distributorId, filters);
  return discrepancies.map(sanitizePurchaseOrder);
};

/**
 * Service xuất Excel danh sách PO với 2 Sheet (Tổng quan & Chi tiết mặt hàng)
 */
export const exportPurchaseOrdersExcelService = async (distributorId, filters = {}) => {
  const orders = await findAllPurchaseOrdersForExport(distributorId, filters);
  const sanitized = orders.map(sanitizePurchaseOrder);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DMS-NPP System';
  workbook.created = new Date();

  // Sheet 1: Danh sách Đơn đặt hàng mua
  const sheetSummary = workbook.addWorksheet('Danh sách PO');
  sheetSummary.columns = [
    { header: 'STT', key: 'stt', width: 8 },
    { header: 'Mã PO', key: 'poCode', width: 20 },
    { header: 'Ngày tạo', key: 'createdAt', width: 14 },
    { header: 'Ngày dự kiến', key: 'expectedDate', width: 14 },
    { header: 'Nhà cung cấp', key: 'supplierName', width: 35 },
    { header: 'Kho nhận hàng', key: 'warehouseName', width: 25 },
    { header: 'Tổng SL đặt', key: 'totalOrderedQty', width: 14 },
    { header: 'Tổng SL nhận', key: 'totalReceivedQty', width: 14 },
    { header: '% Đã nhận', key: 'percentReceived', width: 12 },
    { header: 'Tổng tiền đặt (VNĐ)', key: 'totalAmount', width: 22 },
    { header: 'Trạng thái', key: 'statusText', width: 18 },
    { header: 'Ghi chú / Lý do', key: 'notes', width: 30 }
  ];

  // Header style Sheet 1
  sheetSummary.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheetSummary.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E40AF' }
  };
  sheetSummary.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  const getStatusLabel = (st) => {
    switch (st) {
      case 'DRAFT': return 'Nháp';
      case 'WAITING_RECEIVE': return 'Đã gửi NCC';
      case 'PARTIALLY_RECEIVED': return 'Đã nhận một phần';
      case 'COMPLETED': return 'Hoàn tất';
      case 'CANCELLED': return 'Đã huỷ';
      default: return st;
    }
  };

  sanitized.forEach((po, index) => {
    sheetSummary.addRow({
      stt: index + 1,
      poCode: po.poCode,
      createdAt: new Date(po.createdAt).toLocaleDateString('vi-VN'),
      expectedDate: po.expectedDate ? new Date(po.expectedDate).toLocaleDateString('vi-VN') : '',
      supplierName: po.supplier?.name || 'Chưa chọn',
      warehouseName: po.warehouse?.name || '',
      totalOrderedQty: po.metrics.totalOrderedQty,
      totalReceivedQty: po.metrics.totalReceivedQty,
      percentReceived: `${po.metrics.receivedPercentage}%`,
      totalAmount: po.metrics.totalAmount,
      statusText: getStatusLabel(po.status),
      notes: po.cancelReason || po.closeReason || po.notes || ''
    });
  });

  // Sheet 2: Chi tiết từng dòng sản phẩm
  const sheetDetails = workbook.addWorksheet('Chi tiết mặt hàng PO');
  sheetDetails.columns = [
    { header: 'Mã PO', key: 'poCode', width: 20 },
    { header: 'Nhà cung cấp', key: 'supplierName', width: 30 },
    { header: 'Mã SKU', key: 'sku', width: 15 },
    { header: 'Tên sản phẩm', key: 'productName', width: 35 },
    { header: 'ĐVT', key: 'unit', width: 10 },
    { header: 'SL đặt mua', key: 'quantity', width: 14 },
    { header: 'SL thực nhận', key: 'quantityReceived', width: 14 },
    { header: 'Chênh lệch', key: 'discrepancy', width: 14 },
    { header: 'Đơn giá (VNĐ)', key: 'unitPrice', width: 16 },
    { header: 'Thành tiền (VNĐ)', key: 'lineTotal', width: 20 },
    { header: 'Trạng thái dòng', key: 'lineStatus', width: 18 }
  ];

  sheetDetails.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheetDetails.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0D9488' }
  };
  sheetDetails.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  sanitized.forEach(po => {
    po.items.forEach(item => {
      const diff = item.quantityReceived - item.quantity;
      let lineStatus = 'Chưa nhận';
      if (item.quantityReceived >= item.quantity) {
        lineStatus = diff > 0 ? 'Nhận thừa' : 'Đã nhận đủ';
      } else if (item.quantityReceived > 0) {
        lineStatus = 'Nhận thiếu';
      }

      sheetDetails.addRow({
        poCode: po.poCode,
        supplierName: po.supplier?.name || '',
        sku: item.product?.sku || '',
        productName: item.product?.name || '',
        unit: item.product?.unit || '',
        quantity: item.quantity,
        quantityReceived: item.quantityReceived,
        discrepancy: diff,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        lineStatus
      });
    });
  });

  return workbook;
};
