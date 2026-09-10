import express from 'express';
import {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  sendPurchaseOrder,
  cancelPurchaseOrder,
  receiveGoods,
  closePartialPurchaseOrder,
  getPurchaseOrderDiscrepancies,
  exportPurchaseOrdersExcel
} from '../controllers/purchaseOrderController.js';

const router = express.Router();

// 1. Danh sách & Báo cáo
router.get('/purchase-orders', getPurchaseOrders);
router.get('/purchase-orders/discrepancies', getPurchaseOrderDiscrepancies);
router.get('/purchase-orders/export', exportPurchaseOrdersExcel);

// 2. Tạo đơn PO mới
router.post('/purchase-orders', createPurchaseOrder);

// 3. Chi tiết đơn PO
router.get('/purchase-orders/:id', getPurchaseOrderById);

// 4. Các thao tác nghiệp vụ
router.patch('/purchase-orders/:id', updatePurchaseOrder);
router.patch('/purchase-orders/:id/send', sendPurchaseOrder);
router.patch('/purchase-orders/:id/cancel', cancelPurchaseOrder);
router.post('/purchase-orders/:id/receive', receiveGoods);
router.patch('/purchase-orders/:id/close-partial', closePartialPurchaseOrder);

export default router;
