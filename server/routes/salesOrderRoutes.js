import express from 'express';
import { 
  getSalesOrders, 
  getSalesOrderById, 
  createSalesOrder,
  confirmOrder, 
  bulkConfirmOrders, 
  cancelOrder, 
  assignTrip, 
  confirmDelivery, 
  closeOrder, 
  updateOrderItemQuantity 
} from '../controllers/salesOrderController.js';
import { exportSalesOrdersExcel } from '../controllers/reportController.js';

const router = express.Router();

router.get('/sales-orders', getSalesOrders);
router.post('/sales-orders', createSalesOrder);
router.get('/sales-orders/export', exportSalesOrdersExcel);
router.post('/sales-orders/bulk-confirm', bulkConfirmOrders);
router.get('/sales-orders/:id', getSalesOrderById);

router.patch('/sales-orders/:id/confirm', confirmOrder);
router.patch('/sales-orders/:id/cancel', cancelOrder);
router.patch('/sales-orders/:id/assign-trip', assignTrip);
router.patch('/sales-orders/:id/confirm-delivery', confirmDelivery);
router.patch('/sales-orders/:id/close', closeOrder);
router.put('/sales-orders/:id/items/:itemId', updateOrderItemQuantity);

export default router;
