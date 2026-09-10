import { useState, useEffect, useCallback } from 'react';
import { getPpoSuggestions } from '../services/api';

export const usePpoSuggestions = (filters) => {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    NEW: 0,
    VIEWED: 0,
    APPROVED: 0,
    REJECTED: 0,
    HIGH_PRIORITY: 0,
    MEDIUM_PRIORITY: 0,
    LOW_PRIORITY: 0
  });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const filterKey = JSON.stringify(filters);

  const fetchPpo = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getPpoSuggestions(filters);
      setItems(res.data || []);
      setTotal(res.total || 0);
      if (res.summary) {
        setSummary(res.summary);
      }
    } catch (err) {
      setError(err.message || 'Lỗi khi tải danh sách đề xuất PPO');
    } finally {
      setLoading(false);
    }
  }, [filterKey]);

  useEffect(() => {
    fetchPpo();
  }, [fetchPpo]);

  return { items, summary, total, loading, error, refetch: fetchPpo };
};
