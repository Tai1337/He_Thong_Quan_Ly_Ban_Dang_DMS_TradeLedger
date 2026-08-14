import express from 'express';
import { getSalesOrders } from '../controllers/salesOrderController.js';

const router = express.Router();

router.get('/sales-orders', getSalesOrders);

export default router;
