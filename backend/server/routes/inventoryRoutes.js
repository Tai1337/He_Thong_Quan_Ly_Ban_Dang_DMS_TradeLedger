import express from 'express';
import { getInventoryRpt083, getInventoryRpt083Export } from '../controllers/inventoryController.js';

const router = express.Router();

router.get('/inventory/rpt083', getInventoryRpt083);
router.get('/inventory/rpt083/export', getInventoryRpt083Export);

export default router;
