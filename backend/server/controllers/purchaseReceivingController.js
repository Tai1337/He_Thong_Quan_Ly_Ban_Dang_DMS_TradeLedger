import {
  getInboundDeliveryTripsService,
  getInboundTripDetailService,
  receiveTripGoodsService
} from '../services/purchaseReceivingService.js';

export const getInboundDeliveryTrips = async (req, res) => {
  try {
    const { distributorId = 1, ...filters } = req.query;
    const result = await getInboundDeliveryTripsService(distributorId, filters);
    res.json(result);
  } catch (error) {
    console.error('getInboundDeliveryTrips error:', error);
    res.status(500).json({ error: error.message || 'Lỗi khi tải danh sách chuyến xe hàng về' });
  }
};

export const getInboundTripDetail = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { distributorId = 1 } = req.query;
    const trip = await getInboundTripDetailService(tripId, distributorId);

    if (!trip) {
      return res.status(404).json({ error: 'Không tìm thấy chuyến xe hàng về' });
    }

    res.json(trip);
  } catch (error) {
    console.error('getInboundTripDetail error:', error);
    res.status(500).json({ error: error.message || 'Lỗi khi tải chi tiết chuyến xe' });
  }
};

export const receiveTripGoods = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { distributorId = 1, receivedItems, userId } = req.body;
    const result = await receiveTripGoodsService({ tripId, distributorId, receivedItems, userId });
    res.json(result);
  } catch (error) {
    console.error('receiveTripGoods error:', error);
    res.status(400).json({ error: error.message || 'Lỗi khi thực hiện nhập kho theo chuyến xe' });
  }
};
