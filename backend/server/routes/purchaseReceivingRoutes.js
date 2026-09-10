import express from 'express';
import {
  getInboundDeliveryTrips,
  getInboundTripDetail,
  receiveTripGoods
} from '../controllers/purchaseReceivingController.js';

const router = express.Router();

router.get('/purchase/receiving/trips', getInboundDeliveryTrips);
router.get('/purchase/receiving/trips/:tripId', getInboundTripDetail);
router.post('/purchase/receiving/trips/:tripId/receive', receiveTripGoods);

export default router;
