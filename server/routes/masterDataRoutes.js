import express from 'express';
import { getWarehouses } from '../controllers/masterDataController.js';

const router = express.Router();

router.get('/warehouses', getWarehouses);

export default router;
