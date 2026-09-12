import express from 'express';
import {
  getDeliveryTrips,
  getDeliveryTripDetail,
  getDispatchableOrders,
  createDeliveryTrip,
  dispatchOrdersToTrip,
  removeOrderFromTrip,
  updateDeliveryTripStatus,
  getTripCargoManifest
} from '../controllers/deliveryTripController.js';

const router = express.Router();

router.get('/', getDeliveryTrips);
router.post('/', createDeliveryTrip);
router.get('/dispatchable-orders', getDispatchableOrders);
router.get('/:id', getDeliveryTripDetail);
router.get('/:id/manifest', getTripCargoManifest);
router.post('/:id/dispatch-orders', dispatchOrdersToTrip);
router.post('/:id/remove-order', removeOrderFromTrip);
router.patch('/:id/status', updateDeliveryTripStatus);

export default router;
