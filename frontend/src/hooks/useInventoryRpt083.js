import { useState, useEffect, useCallback } from 'react';
import { getInventoryRpt083, getWarehouses } from '../services/api';

export const useInventoryRpt083 = (initialFilters = {}) => {
  const [data, setData] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);

  // Fetch Master Data on mount
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const whs = await getWarehouses(initialFilters.distributorId);
        setWarehouses(whs);
      } catch (err) {
        console.error("Lỗi tải danh sách kho:", err);
      }
    };
    fetchMasterData();
  }, [initialFilters.distributorId]);

  const fetchData = useCallback(async (filtersToApply) => {
    setLoading(true);
    setError('');
    try {
      const result = await getInventoryRpt083({
        ...filtersToApply,
        page: pagination.page,
        limit: pagination.limit
      });
      
      setData(result.data || []);
      if (result.pagination) {
        setPagination(result.pagination);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    fetchData(appliedFilters);
  }, [fetchData, appliedFilters]);

  const applyFilters = (newFilters) => {
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
    warehouses,
    pagination,
    loading,
    error,
    applyFilters,
    setPage,
    setLimit,
    refresh: () => fetchData(appliedFilters)
  };
};
