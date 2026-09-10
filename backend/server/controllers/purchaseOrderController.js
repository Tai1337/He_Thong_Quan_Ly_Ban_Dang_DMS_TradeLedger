import {
  getPurchaseOrdersService,
  getPurchaseOrderByIdService,
  createPurchaseOrderService,
  updatePurchaseOrderService,
  sendPurchaseOrderToSupplierService,
  cancelPurchaseOrderService,
  receiveGoodsService,
  closePartialPurchaseOrderService,
  getPurchaseOrderDiscrepanciesService,
  exportPurchaseOrdersExcelService
} from '../services/purchaseOrderService.js';

export const getPurchaseOrders = async (req, res) => {
  try {
    const { distributorId = 1, ...filters } = req.query;
    const result = await getPurchaseOrdersService(distributorId, filters);
    res.json(result);
  } catch (error) {
    console.error('getPurchaseOrders error:', error);
    res.status(500).json({ error: error.message || 'Lỗi server nội bộ' });
  }
};

export const getPurchaseOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const { distributorId = 1 } = req.query;
    const order = await getPurchaseOrderByIdService(id, distributorId);

    if (!order) {
      return res.status(404).json({ error: 'Không tìm thấy đơn đặt hàng mua' });
    }

    res.json(order);
  } catch (error) {
    console.error('getPurchaseOrderById error:', error);
    res.status(500).json({ error: error.message || 'Lỗi server nội bộ' });
  }
};

export const createPurchaseOrder = async (req, res) => {
  try {
    const { distributorId = 1, warehouseId, supplierId, expectedDate, notes, items, createdById } = req.body;
    const newOrder = await createPurchaseOrderService({
      distributorId,
      warehouseId,
      supplierId,
      expectedDate,
      notes,
      items,
      createdById
    });

    res.status(201).json(newOrder);
  } catch (error) {
    console.error('createPurchaseOrder error:', error);
    res.status(400).json({ error: error.message || 'Lỗi khi tạo đơn đặt hàng mua' });
  }
};

export const updatePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { distributorId = 1, warehouseId, supplierId, expectedDate, notes, items, userId } = req.body;

    const updated = await updatePurchaseOrderService(id, {
      distributorId,
      warehouseId,
      supplierId,
      expectedDate,
      notes,
      items,
      userId
    });

    res.json(updated);
  } catch (error) {
    console.error('updatePurchaseOrder error:', error);
    res.status(400).json({ error: error.message || 'Lỗi khi cập nhật đơn hàng' });
  }
};

export const sendPurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { distributorId = 1, userId, notes } = req.body;

    const updated = await sendPurchaseOrderToSupplierService(id, {
      distributorId,
      userId,
      notes
    });

    res.json(updated);
  } catch (error) {
    console.error('sendPurchaseOrder error:', error);
    res.status(400).json({ error: error.message || 'Lỗi khi gửi đơn cho NCC' });
  }
};

export const cancelPurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { distributorId = 1, userId, reason } = req.body;

    const updated = await cancelPurchaseOrderService(id, {
      distributorId,
      userId,
      reason
    });

    res.json(updated);
  } catch (error) {
    console.error('cancelPurchaseOrder error:', error);
    res.status(400).json({ error: error.message || 'Lỗi khi huỷ đơn hàng' });
  }
};

export const receiveGoods = async (req, res) => {
  try {
    const { id } = req.params;
    const { distributorId = 1, userId, items, notes } = req.body;

    const updated = await receiveGoodsService(id, {
      distributorId,
      userId,
      items,
      notes
    });

    res.json(updated);
  } catch (error) {
    console.error('receiveGoods error:', error);
    res.status(400).json({ error: error.message || 'Lỗi khi nhận hàng nhập kho' });
  }
};

export const closePartialPurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { distributorId = 1, userId, reason } = req.body;

    const updated = await closePartialPurchaseOrderService(id, {
      distributorId,
      userId,
      reason
    });

    res.json(updated);
  } catch (error) {
    console.error('closePartialPurchaseOrder error:', error);
    res.status(400).json({ error: error.message || 'Lỗi khi đóng đơn thiếu hàng' });
  }
};

export const getPurchaseOrderDiscrepancies = async (req, res) => {
  try {
    const { distributorId = 1, ...filters } = req.query;
    const result = await getPurchaseOrderDiscrepanciesService(distributorId, filters);
    res.json(result);
  } catch (error) {
    console.error('getPurchaseOrderDiscrepancies error:', error);
    res.status(500).json({ error: error.message || 'Lỗi server nội bộ' });
  }
};

export const exportPurchaseOrdersExcel = async (req, res) => {
  try {
    const { distributorId = 1, ...filters } = req.query;
    const workbook = await exportPurchaseOrdersExcelService(distributorId, filters);

    const filename = `DanhSachPO_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('exportPurchaseOrdersExcel error:', error);
    res.status(500).json({ error: error.message || 'Lỗi khi xuất file Excel' });
  }
};
