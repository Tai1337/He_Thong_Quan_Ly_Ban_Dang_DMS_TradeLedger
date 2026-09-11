import express from 'express';
import { 
  getSalesOrders, 
  getSalesOrderById, 
  createSalesOrder,
  submitOrder,
  confirmOrder, 
  bulkConfirmOrders, 
  cancelOrder, 
  assignTrip, 
  unassignTrip,
  confirmDelivery, 
  createInvoice,
  recordPayment,
  closeOrder, 
  updateOrderItemQuantity,
  addOrderItem,
  removeOrderItem,
  getAvailableTrips,
  getSalesOrderMeta,
  getSalesAnalytics
} from '../controllers/salesOrderController.js';
import { exportSalesOrdersExcel } from '../controllers/reportController.js';

const router = express.Router();

// 1. Static / Metadata / Analytics / Export Routes (Đặt trước :id)
router.get('/sales-orders/export', exportSalesOrdersExcel);
router.get('/sales-orders/meta/options', getSalesOrderMeta);
router.get('/sales-orders/meta/available-trips', getAvailableTrips);
router.get('/sales-orders/analytics/summary', getSalesAnalytics);

// 2. Collection Routes
router.get('/sales-orders', getSalesOrders);
router.post('/sales-orders', createSalesOrder);
router.post('/sales-orders/bulk-confirm', bulkConfirmOrders);

// 3. Item Routes (Parameterized)
router.get('/sales-orders/:id', getSalesOrderById);
router.patch('/sales-orders/:id/submit', submitOrder);
router.patch('/sales-orders/:id/confirm', confirmOrder);
router.patch('/sales-orders/:id/cancel', cancelOrder);

// 4. Logistics / Delivery Trip
router.patch('/sales-orders/:id/assign-trip', assignTrip);
router.patch('/sales-orders/:id/unassign-trip', unassignTrip);
router.patch('/sales-orders/:id/confirm-delivery', confirmDelivery);

// 5. Invoicing & Payment & Closing
router.post('/sales-orders/:id/invoice', createInvoice);
router.post('/sales-orders/:id/payments', recordPayment);
router.patch('/sales-orders/:id/close', closeOrder);

// 6. Order Items Manipulation
router.post('/sales-orders/:id/items', addOrderItem);
router.put('/sales-orders/:id/items/:itemId', updateOrderItemQuantity);
router.delete('/sales-orders/:id/items/:itemId', removeOrderItem);

export default router;
