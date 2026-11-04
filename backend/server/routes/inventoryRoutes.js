import express from 'express';
import { 
  getInventoryRpt083, 
  getInventoryRpt083Export,
  getInventoryTransactions,
  exportInventoryTransactions
} from '../controllers/inventoryController.js';

const router = express.Router();

router.get('/inventory/rpt083', getInventoryRpt083);
router.get('/inventory/rpt083/export', getInventoryRpt083Export);
router.get('/inventory/transactions', getInventoryTransactions);
router.get('/inventory/transactions/export', exportInventoryTransactions);

export default router;
