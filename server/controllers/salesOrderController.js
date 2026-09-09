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
    const { newQuantity, reason, changedById } = req.body;
    const distributorId = req.query.distributorId || req.user?.distributorId || 1;
    const userId = changedById || req.user?.id || 1;

    const result = await salesOrderService.updateOrderItemQuantity(id, itemId, newQuantity, distributorId, userId, reason);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in updateOrderItemQuantity:', error);
    res.status(400).json({ error: error.message || 'Lỗi khi cập nhật số lượng' });
  }
};
