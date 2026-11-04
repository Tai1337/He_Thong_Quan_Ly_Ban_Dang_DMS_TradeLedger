import express from 'express';
import { 
  getInvoices, 
  getInvoiceById, 
  recordPayment, 
  exportInvoices 
} from '../controllers/invoiceController.js';

const router = express.Router();

router.get('/invoices', getInvoices);
router.get('/invoices/export', exportInvoices);
router.get('/invoices/:id', getInvoiceById);
router.post('/invoices/:id/payments', recordPayment);

export default router;

