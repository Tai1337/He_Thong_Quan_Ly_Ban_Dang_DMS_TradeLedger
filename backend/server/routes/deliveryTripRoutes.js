import express from 'express';
import {
  getDeliveryTrips,
  getDeliveryTripDetail,
  getDispatchableOrders,
  createDeliveryTrip,
  dispatchOrdersToTrip,
  removeOrderFromTrip,
  updateDeliveryTripStatus,
  getTripCargoManifest,
  confirmStopDelivery,
  getTripReturnSummary,
  closeDeliveryTrip
} from '../controllers/deliveryTripController.js';

const router = express.Router();

router.get('/', getDeliveryTrips);
router.post('/', createDeliveryTrip);
router.get('/dispatchable-orders', getDispatchableOrders);
router.get('/:id', getDeliveryTripDetail);
router.get('/:id/manifest', getTripCargoManifest);
router.get('/:id/return-summary', getTripReturnSummary);
router.post('/:id/dispatch-orders', dispatchOrdersToTrip);
router.post('/:id/remove-order', removeOrderFromTrip);
router.post('/:id/confirm-delivery', confirmStopDelivery);
router.post('/:id/close-trip', closeDeliveryTrip);
router.patch('/:id/status', updateDeliveryTripStatus);

export default router;

