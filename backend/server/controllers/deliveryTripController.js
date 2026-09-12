import {
  getDeliveryTripsService,
  getDeliveryTripDetailService,
  getDispatchableOrdersService,
  createDeliveryTripService,
  dispatchOrdersToTripService,
  removeOrderFromTripService,
  updateTripStatusService,
  getTripCargoManifestService
} from '../services/deliveryTripService.js';

export const getDeliveryTrips = async (req, res) => {
  try {
    const { distributorId = 1, status, tripType, warehouseId, search, page = 1, limit = 15 } = req.query;

    const result = await getDeliveryTripsService({
      distributorId,
      status,
      tripType,
      warehouseId,
      search,
      page,
      limit
    });

    res.json(result);
  } catch (error) {
    console.error('getDeliveryTrips error:', error);
    res.status(500).json({ error: error.message || 'Lỗi khi tải danh sách chuyến xe' });
  }
};

export const getDeliveryTripDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const { distributorId = 1 } = req.query;

    const trip = await getDeliveryTripDetailService(id, distributorId);
    if (!trip) {
      return res.status(404).json({ error: 'Không tìm thấy chuyến xe' });
    }

    res.json(trip);
  } catch (error) {
    console.error('getDeliveryTripDetail error:', error);
    res.status(500).json({ error: error.message || 'Lỗi khi tải chi tiết chuyến xe' });
  }
};

export const getDispatchableOrders = async (req, res) => {
  try {
    const { distributorId = 1, warehouseId } = req.query;

    const orders = await getDispatchableOrdersService(distributorId, warehouseId);
    res.json({ data: orders });
  } catch (error) {
    console.error('getDispatchableOrders error:', error);
    res.status(500).json({ error: error.message || 'Lỗi khi tải danh sách đơn chờ xếp xe' });
  }
};

export const createDeliveryTrip = async (req, res) => {
  try {
    const { distributorId = 1, warehouseId, driverId, licensePlate, maxWeightKg, expectedDeliveryDate, notes } = req.body;

    if (!warehouseId) {
      return res.status(400).json({ error: 'Kho xuất hàng là bắt buộc' });
    }

    const result = await createDeliveryTripService({
      distributorId,
      warehouseId,
      driverId,
      licensePlate,
      maxWeightKg,
      expectedDeliveryDate,
      notes
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('createDeliveryTrip error:', error);
    res.status(400).json({ error: error.message || 'Lỗi khi tạo chuyến xe mới' });
  }
};

export const dispatchOrdersToTrip = async (req, res) => {
  try {
    const { id: tripId } = req.params;
    const { distributorId = 1, orderIds, changedById } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'Vui lòng chọn ít nhất 1 đơn hàng để xếp lên xe' });
    }

    const result = await dispatchOrdersToTripService({
      tripId,
      distributorId,
      orderIds,
      changedById
    });

    res.json(result);
  } catch (error) {
    console.error('dispatchOrdersToTrip error:', error);
    res.status(400).json({ error: error.message || 'Lỗi khi xếp đơn hàng lên xe' });
  }
};

export const removeOrderFromTrip = async (req, res) => {
  try {
    const { id: tripId } = req.params;
    const { orderId, distributorId = 1, changedById, reason } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'orderId là bắt buộc' });
    }

    const result = await removeOrderFromTripService({
      tripId,
      orderId,
      distributorId,
      changedById,
      reason
    });

    res.json(result);
  } catch (error) {
    console.error('removeOrderFromTrip error:', error);
    res.status(400).json({ error: error.message || 'Lỗi khi gỡ đơn hàng khỏi chuyến xe' });
  }
};

export const updateDeliveryTripStatus = async (req, res) => {
  try {
    const { id: tripId } = req.params;
    const { distributorId = 1, toStatus, changedById, notes } = req.body;

    if (!toStatus) {
      return res.status(400).json({ error: 'toStatus là bắt buộc' });
    }

    const result = await updateTripStatusService({
      tripId,
      distributorId,
      toStatus,
      changedById,
      notes
    });

    res.json(result);
  } catch (error) {
    console.error('updateDeliveryTripStatus error:', error);
    res.status(400).json({ error: error.message || 'Lỗi khi cập nhật trạng thái chuyến xe' });
  }
};

export const getTripCargoManifest = async (req, res) => {
  try {
    const { id: tripId } = req.params;
    const { distributorId = 1 } = req.query;

    const manifest = await getTripCargoManifestService(tripId, distributorId);
    if (!manifest) {
      return res.status(404).json({ error: 'Không tìm thấy chuyến xe để tạo bảng kê' });
    }

    res.json(manifest);
  } catch (error) {
    console.error('getTripCargoManifest error:', error);
    res.status(500).json({ error: error.message || 'Lỗi khi lập bảng kê hàng hóa số lô' });
  }
};
