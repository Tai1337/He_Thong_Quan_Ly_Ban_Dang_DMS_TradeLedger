import { useState, useEffect, useCallback } from 'react';
import { 
  getSalesOrders, 
  confirmSalesOrder, 
  bulkConfirmSalesOrders, 
  cancelSalesOrder, 
  assignTripSalesOrder, 
  confirmDeliverySalesOrder, 
  closeSalesOrder 
} from '../services/api';

export const useSalesOrders = (initialFilters = {}) => {
  const [data, setData] = useState([]);
  const [kpis, setKpis] = useState({
    totalOrders: 0,
    totalAmount: 0,
    totalDiscount: 0,
    totalOrderValue: 0,
    totalTons: '0.0000',
    totalCbm: '0.0000'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Trạng thái lưu trữ các giá trị lọc hiện tại
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);

  const fetchOrders = useCallback(async (filtersToApply, page = pagination.page, limit = pagination.limit) => {
    setLoading(true);
    setError('');
    try {
      const result = await getSalesOrders({
        ...filtersToApply,
        page,
        limit,
        sortBy,
        sortOrder
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
  }, [pagination.page, pagination.limit, sortBy, sortOrder]);

  // Fetch khi appliedFilters, page, limit hoặc sort thay đổi
  useEffect(() => {
    fetchOrders(appliedFilters, pagination.page, pagination.limit);
  }, [fetchOrders, appliedFilters, pagination.page, pagination.limit, sortBy, sortOrder]);

  // Auto clear message sau 4s
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const applyFilters = (newFilters) => {
    setPagination(prev => ({ ...prev, page: 1 }));
    setSelectedIds([]);
    setAppliedFilters(newFilters);
  };
  
  const setPage = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const setLimit = (newLimit) => {
    setPagination(prev => ({ ...prev, limit: parseInt(newLimit, 10), page: 1 }));
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Selection handlers
  const toggleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(data.map(o => o.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const clearSelection = () => setSelectedIds([]);

  // Action handlers
  const handleConfirm = async (orderId) => {
    setActionLoading(true);
    setError('');
    try {
      const res = await confirmSalesOrder(orderId);
      setSuccessMessage(res.message || 'Xác nhận đơn hàng thành công');
      await fetchOrders(appliedFilters, pagination.page, pagination.limit);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkConfirm = async () => {
    if (selectedIds.length === 0) return;
    setActionLoading(true);
    setError('');
    try {
      const res = await bulkConfirmSalesOrders({ orderIds: selectedIds });
      setSuccessMessage(`Đã xử lý: Thành công ${res.successCount}/${res.total} đơn hàng`);
      clearSelection();
      await fetchOrders(appliedFilters, pagination.page, pagination.limit);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (orderId, reason) => {
    setActionLoading(true);
    setError('');
    try {
      const res = await cancelSalesOrder(orderId, { reason });
      setSuccessMessage(res.message || 'Huỷ đơn hàng thành công');
      await fetchOrders(appliedFilters, pagination.page, pagination.limit);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignTrip = async (orderId, tripId) => {
    setActionLoading(true);
    setError('');
    try {
      const res = await assignTripSalesOrder(orderId, { tripId });
      setSuccessMessage(res.message || 'Gán chuyến xe thành công');
      await fetchOrders(appliedFilters, pagination.page, pagination.limit);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelivery = async (orderId, isSuccess, note) => {
    setActionLoading(true);
    setError('');
    try {
      const res = await confirmDeliverySalesOrder(orderId, { isSuccess, note });
      setSuccessMessage(res.message || 'Xác nhận giao hàng thành công');
      await fetchOrders(appliedFilters, pagination.page, pagination.limit);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = async (orderId) => {
    setActionLoading(true);
    setError('');
    try {
      const res = await closeSalesOrder(orderId);
      setSuccessMessage(res.message || 'Đóng đơn hàng thành công');
      await fetchOrders(appliedFilters, pagination.page, pagination.limit);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  return {
    data,
    kpis,
    pagination,
    loading,
    actionLoading,
    error,
    successMessage,
    selectedIds,
    sortBy,
    sortOrder,
    toggleSort,
    toggleSelectAll,
    toggleSelectOne,
    clearSelection,
    applyFilters,
    setPage,
    setLimit,
    handleConfirm,
    handleBulkConfirm,
    handleCancel,
    handleAssignTrip,
    handleConfirmDelivery,
    handleClose,
    refresh: () => fetchOrders(appliedFilters, pagination.page, pagination.limit)
  };
};
