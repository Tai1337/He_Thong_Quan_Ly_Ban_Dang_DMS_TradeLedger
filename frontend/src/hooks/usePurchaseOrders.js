import { useState, useEffect, useCallback } from 'react';
import { getPurchaseOrders } from '../services/api';

export const usePurchaseOrders = (filters) => {
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({
    totalOrders: 0,
    DRAFT: 0,
    WAITING_RECEIVE: 0,
    PARTIALLY_RECEIVED: 0,
    COMPLETED: 0,
    CANCELLED: 0
  });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const filterKey = JSON.stringify(filters);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getPurchaseOrders(filters);
      setOrders(res.data || []);
      setTotal(res.total || 0);
      if (res.summary) {
        setSummary(res.summary);
      }
    } catch (err) {
      setError(err.message || 'Lỗi khi tải danh sách đơn đặt hàng mua');
    } finally {
      setLoading(false);
    }
  }, [filterKey]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return { orders, summary, total, loading, error, refetch: fetchOrders };
};
