import express from 'express';
import { 
  getWarehouses, 
  getRetailers, 
  getDeliveryTrips, 
  getSalesReps,
  getProducts,
  getSuppliers
} from '../controllers/masterDataController.js';

const router = express.Router();

router.get('/warehouses', getWarehouses);
router.get('/retailers', getRetailers);
router.get('/delivery-trips', getDeliveryTrips);
router.get('/sales-reps', getSalesReps);
router.get('/products', getProducts);
router.get('/suppliers', getSuppliers);

export default router;
