const API_URL = 'http://localhost:3001/api';

export const login = async (email, password) => {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Đăng nhập thất bại');
  }
  return data;
};

// --- SALES ORDERS ---

export const getSalesOrders = async (filters = {}) => {
  const cleanFilters = {};
  Object.keys(filters).forEach(k => {
    if (filters[k] !== undefined && filters[k] !== null && filters[k] !== '') {
      cleanFilters[k] = filters[k];
    }
  });

  const queryParams = new URLSearchParams(cleanFilters).toString();
  const response = await fetch(`${API_URL}/sales-orders?${queryParams}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi tải danh sách đơn hàng');
  }
  return data;
};

export const getSalesOrderById = async (id, distributorId = 1) => {
  const response = await fetch(`${API_URL}/sales-orders/${id}?distributorId=${distributorId}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi tải chi tiết đơn hàng');
  }
  return data;
};

export const createSalesOrder = async (payload) => {
  const response = await fetch(`${API_URL}/sales-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi tạo đơn hàng mới');
  }
  return data;
};


export const confirmSalesOrder = async (id, payload = {}) => {
  const response = await fetch(`${API_URL}/sales-orders/${id}/confirm`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi xác nhận đơn hàng');
  }
  return data;
};

export const bulkConfirmSalesOrders = async (payload) => {
  const response = await fetch(`${API_URL}/sales-orders/bulk-confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi xác nhận hàng loạt');
  }
  return data;
};

export const cancelSalesOrder = async (id, payload) => {
  const response = await fetch(`${API_URL}/sales-orders/${id}/cancel`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi huỷ đơn hàng');
  }
  return data;
};

export const assignTripSalesOrder = async (id, payload) => {
  const response = await fetch(`${API_URL}/sales-orders/${id}/assign-trip`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi gán chuyến xe');
  }
  return data;
};

export const confirmDeliverySalesOrder = async (id, payload) => {
  const response = await fetch(`${API_URL}/sales-orders/${id}/confirm-delivery`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi xác nhận giao hàng');
  }
  return data;
};

export const closeSalesOrder = async (id, payload = {}) => {
  const response = await fetch(`${API_URL}/sales-orders/${id}/close`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi đóng đơn hàng');
  }
  return data;
};

export const updateSalesOrderItemQty = async (orderId, itemId, payload) => {
  const response = await fetch(`${API_URL}/sales-orders/${orderId}/items/${itemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi cập nhật số lượng mặt hàng');
  }
  return data;
};

// --- MASTER DATA ---

export const getWarehouses = async (distributorId) => {
  const query = distributorId ? `?distributorId=${distributorId}` : '';
  const response = await fetch(`${API_URL}/master/warehouses${query}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi tải danh sách kho');
  }
  return data;
};

export const getRetailers = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${API_URL}/master/retailers?${query}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi tải danh sách đại lý');
  }
  return data;
};

export const getDeliveryTrips = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${API_URL}/master/delivery-trips?${query}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi tải danh sách chuyến xe');
  }
  return data;
};

export const getSalesReps = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${API_URL}/master/sales-reps?${query}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi tải danh sách VNBH');
  }
  return data;
};

export const getProducts = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${API_URL}/master/products?${query}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi tải danh sách sản phẩm');
  }
  return data;
};


// --- REPORTS & EXPORT ---

export const getReportRpt005 = async (filters = {}) => {
  const query = new URLSearchParams(filters).toString();
  const response = await fetch(`${API_URL}/reports/rpt005?${query}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi tải dữ liệu RPT005');
  }
  return data;
};

export const exportReportExcel = (reportType, filters = {}) => {
  const cleanFilters = { ...filters, export: 'excel' };
  const query = new URLSearchParams(cleanFilters).toString();
  
  let endpoint = `${API_URL}/reports/${reportType}?${query}`;
  if (reportType === 'sales-orders') {
    endpoint = `${API_URL}/sales-orders/export?${new URLSearchParams(filters).toString()}`;
  }
  window.open(endpoint, '_blank');
};

export const getInventoryRpt083 = async (filters) => {
  const queryParams = new URLSearchParams(filters).toString();
  const response = await fetch(`${API_URL}/inventory/rpt083?${queryParams}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi tải báo cáo tồn kho');
  }
  return data;
};
