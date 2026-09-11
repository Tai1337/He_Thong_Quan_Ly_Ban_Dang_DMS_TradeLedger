import * as salesOrderService from '../services/salesOrderService.js';

export const getSalesOrders = async (req, res) => {
  try {
    const distributorId = req.query.distributorId || req.user?.distributorId || 1;
    const result = await salesOrderService.getSalesOrdersWithKPIs(distributorId, req.query);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getSalesOrders:', error);
    res.status(500).json({ error: error.message || 'Lỗi hệ thống' });
  }
};

export const getSalesOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const distributorId = req.query.distributorId || req.user?.distributorId || 1;
    const order = await salesOrderService.getOrderDetail(id, distributorId);
    res.status(200).json(order);
  } catch (error) {
    console.error('Error in getSalesOrderById:', error);
    res.status(404).json({ error: error.message || 'Không tìm thấy đơn hàng' });
  }
};

export const createSalesOrder = async (req, res) => {
  try {
    const distributorId = req.query.distributorId || req.user?.distributorId || 1;
    const createdById = req.body.createdById || req.user?.id || 1;
    const result = await salesOrderService.createNewSalesOrder(req.body, distributorId, createdById);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error in createSalesOrder:', error);
    res.status(400).json({ error: error.message || 'Lỗi khi tạo đơn hàng' });
  }
};


export const confirmOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const distributorId = req.query.distributorId || req.user?.distributorId || 1;
    const changedById = req.body.changedById || req.user?.id || 1;

    const result = await salesOrderService.confirmOrder(id, distributorId, changedById);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in confirmOrder:', error);
    res.status(400).json({ error: error.message || 'Lỗi khi xác nhận đơn hàng' });
  }
};

export const bulkConfirmOrders = async (req, res) => {
  try {
    const { orderIds, changedById } = req.body;
    const distributorId = req.query.distributorId || req.user?.distributorId || 1;
    const userId = changedById || req.user?.id || 1;

    const result = await salesOrderService.bulkConfirmOrders(orderIds, distributorId, userId);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in bulkConfirmOrders:', error);
    res.status(400).json({ error: error.message || 'Lỗi khi xác nhận hàng loạt' });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, changedById } = req.body;
    const distributorId = req.query.distributorId || req.user?.distributorId || 1;
    const userId = changedById || req.user?.id || 1;

    const result = await salesOrderService.cancelOrder(id, distributorId, userId, reason);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in cancelOrder:', error);
    res.status(400).json({ error: error.message || 'Lỗi khi huỷ đơn hàng' });
  }
};

export const assignTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const { tripId, changedById } = req.body;
    const distributorId = req.query.distributorId || req.user?.distributorId || 1;
    const userId = changedById || req.user?.id || 1;

    const result = await salesOrderService.assignDeliveryTrip(id, distributorId, tripId, userId);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in assignTrip:', error);
    res.status(400).json({ error: error.message || 'Lỗi khi gán chuyến xe' });
  }
};

export const confirmDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { isSuccess = true, note, changedById } = req.body;
    const distributorId = req.query.distributorId || req.user?.distributorId || 1;
    const userId = changedById || req.user?.id || 1;

    const result = await salesOrderService.confirmDelivery(id, distributorId, userId, isSuccess, note);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in confirmDelivery:', error);
    res.status(400).json({ error: error.message || 'Lỗi khi xác nhận giao hàng' });
  }
};

export const closeOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const distributorId = req.query.distributorId || req.user?.distributorId || 1;
    const userId = req.body.changedById || req.user?.id || 1;

    const result = await salesOrderService.closeOrder(id, distributorId, userId);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in closeOrder:', error);
    res.status(400).json({ error: error.message || 'Lỗi khi đóng đơn hàng' });
  }
};

export const updateOrderItemQuantity = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { newQuantity, quantity, reason, changedById } = req.body;
    const finalQty = newQuantity !== undefined ? newQuantity : quantity;
    const distributorId = req.query.distributorId || req.user?.distributorId || 1;
    const userId = changedById || req.user?.id || 1;

    const result = await salesOrderService.updateOrderItemQuantity(id, itemId, finalQty, distributorId, userId, reason);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in updateOrderItemQuantity:', error);
    res.status(400).json({ error: error.message || 'Lỗi khi cập nhật số lượng' });
  }
};

export const submitOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const distributorId = req.query.distributorId || req.user?.distributorId || 1;
    const userId = req.body.changedById || req.user?.id || 1;

    const result = await salesOrderService.submitOrder(id, distributorId, userId);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in submitOrder:', error);
    res.status(400).json({ error: error.message || 'Lỗi khi nộp duyệt đơn hàng' });
  }
};

export const unassignTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, changedById } = req.body;
    const distributorId = req.query.distributorId || req.user?.distributorId || 1;
    const userId = changedById || req.user?.id || 1;

    const result = await salesOrderService.unassignDeliveryTrip(id, distributorId, userId, reason);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in unassignTrip:', error);
    res.status(400).json({ error: error.message || 'Lỗi khi huỷ gán chuyến xe' });
  }
};

export const createInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const distributorId = req.query.distributorId || req.user?.distributorId || 1;
    const userId = req.body.changedById || req.user?.id || 1;

    const result = await salesOrderService.createOrderInvoice(id, distributorId, userId, req.body);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error in createInvoice:', error);
    res.status(400).json({ error: error.message || 'Lỗi khi xuất hoá đơn' });
  }
};

export const recordPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const distributorId = req.query.distributorId || req.user?.distributorId || 1;
    const userId = req.body.changedById || req.user?.id || 1;

    const result = await salesOrderService.recordOrderPayment(id, distributorId, userId, req.body);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in recordPayment:', error);
    res.status(400).json({ error: error.message || 'Lỗi khi ghi nhận thanh toán' });
  }
};

export const addOrderItem = async (req, res) => {
  try {
    const { id } = req.params;
    const distributorId = req.query.distributorId || req.user?.distributorId || 1;
    const userId = req.body.changedById || req.user?.id || 1;

    const result = await salesOrderService.addOrderItem(id, distributorId, userId, req.body);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error in addOrderItem:', error);
    res.status(400).json({ error: error.message || 'Lỗi khi thêm sản phẩm vào đơn' });
  }
};

export const removeOrderItem = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const distributorId = req.query.distributorId || req.user?.distributorId || 1;
    const userId = req.body.changedById || req.user?.id || 1;

    const result = await salesOrderService.removeOrderItem(id, itemId, distributorId, userId);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in removeOrderItem:', error);
    res.status(400).json({ error: error.message || 'Lỗi khi xoá sản phẩm khỏi đơn' });
  }
};

export const getAvailableTrips = async (req, res) => {
  try {
    const distributorId = req.query.distributorId || req.user?.distributorId || 1;
    const { warehouseId } = req.query;

    const trips = await salesOrderService.getAvailableDeliveryTrips(distributorId, warehouseId);
    res.status(200).json({ data: trips });
  } catch (error) {
    console.error('Error in getAvailableTrips:', error);
    res.status(500).json({ error: error.message || 'Lỗi khi lấy danh sách chuyến xe' });
  }
};

export const getSalesOrderMeta = async (req, res) => {
  try {
    const distributorId = req.query.distributorId || req.user?.distributorId || 1;

    const meta = await salesOrderService.getSalesOrderMetadata(distributorId);
    res.status(200).json(meta);
  } catch (error) {
    console.error('Error in getSalesOrderMeta:', error);
    res.status(500).json({ error: error.message || 'Lỗi khi lấy dữ liệu cấu hình đơn hàng' });
  }
};

export const getSalesAnalytics = async (req, res) => {
  try {
    const distributorId = req.query.distributorId || req.user?.distributorId || 1;

    const analytics = await salesOrderService.getSalesAnalytics(distributorId, req.query);
    res.status(200).json(analytics);
  } catch (error) {
    console.error('Error in getSalesAnalytics:', error);
    res.status(500).json({ error: error.message || 'Lỗi khi lấy báo cáo thống kê bán hàng' });
  }
};
