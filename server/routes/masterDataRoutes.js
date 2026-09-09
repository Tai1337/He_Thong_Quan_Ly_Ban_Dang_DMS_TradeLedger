import express from 'express';
import { 
  getWarehouses, 
  getRetailers, 
  getDeliveryTrips, 
  getSalesReps,
  getProducts
} from '../controllers/masterDataController.js';

const router = express.Router();

router.get('/warehouses', getWarehouses);
router.get('/retailers', getRetailers);
router.get('/delivery-trips', getDeliveryTrips);
router.get('/sales-reps', getSalesReps);
router.get('/products', getProducts);

export default router;
