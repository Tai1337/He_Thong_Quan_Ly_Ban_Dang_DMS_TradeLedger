import { useState, useEffect, useCallback } from 'react';
import { getSalesOrders } from '../services/api';

export const useSalesOrders = (initialFilters = {}) => {
  const [data, setData] = useState([]);
  const [kpis, setKpis] = useState({
    totalOrders: 0,
    totalAmount: 0,
    totalDiscount: 0,
    totalOrderValue: 0,
    totalTons: 0,
    totalCbm: 0
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Trạng thái lưu trữ các giá trị lọc hiện tại (được apply khi bấm Tìm kiếm)
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);

  const fetchOrders = useCallback(async (filtersToApply) => {
    setLoading(true);
    setError('');
    try {
      const result = await getSalesOrders({
        ...filtersToApply,
        page: pagination.page,
        limit: pagination.limit
      });
      
      setData(result.data || []);
      setKpis(result.kpis || {});
      if (result.pagination) {
        setPagination(result.pagination);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  // Fetch khi appliedFilters thay đổi
  useEffect(() => {
    fetchOrders(appliedFilters);
  }, [fetchOrders, appliedFilters]);

  const applyFilters = (newFilters) => {
    // Reset page to 1 on new filter
    setPagination(prev => ({ ...prev, page: 1 }));
    setAppliedFilters(newFilters);
  };
  
  const setPage = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const setLimit = (newLimit) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
  };

  return {
    data,
    kpis,
    pagination,
    loading,
    error,
    applyFilters,
    setPage,
    setLimit,
    refresh: () => fetchOrders(appliedFilters)
  };
};
