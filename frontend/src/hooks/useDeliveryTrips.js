import { useState, useEffect, useCallback } from 'react';
import { getDeliveryTripsList } from '../services/api';

/**
 * Custom Hook quản lý nạp danh sách chuyến xe vận chuyển (DeliveryTrip)
 * Áp dụng Custom Hook Pattern theo quy tắc DMS-NPP
 */
export const useDeliveryTrips = (filters) => {
  const [trips, setTrips] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const filterKey = JSON.stringify(filters);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getDeliveryTripsList(filters);
      setTrips(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError(err.message || 'Lỗi khi tải danh sách chuyến xe');
    } finally {
      setLoading(false);
    }
  }, [filterKey]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  return {
    trips,
    total,
    loading,
    error,
    refetch: fetchTrips
  };
};
