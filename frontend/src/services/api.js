const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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

export const addSalesOrderItem = async (orderId, payload) => {
  const response = await fetch(`${API_URL}/sales-orders/${orderId}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi thêm sản phẩm vào đơn hàng');
  }
  return data;
};

export const removeSalesOrderItem = async (orderId, itemId, payload = {}) => {
  const response = await fetch(`${API_URL}/sales-orders/${orderId}/items/${itemId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi xoá sản phẩm khỏi đơn hàng');
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

export const getSuppliers = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${API_URL}/master/suppliers?${query}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi tải danh sách nhà cung cấp');
  }
  return data;
};

// --- PURCHASE ORDERS ---

export const getPurchaseOrders = async (filters = {}) => {
  const cleanFilters = {};
  Object.keys(filters).forEach(k => {
    if (filters[k] !== undefined && filters[k] !== null && filters[k] !== '') {
      cleanFilters[k] = filters[k];
    }
  });

  const queryParams = new URLSearchParams(cleanFilters).toString();
  const response = await fetch(`${API_URL}/purchase-orders?${queryParams}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi tải danh sách đơn đặt hàng mua');
  }
  return data;
};

export const getPurchaseOrderById = async (id, distributorId = 1) => {
  const response = await fetch(`${API_URL}/purchase-orders/${id}?distributorId=${distributorId}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi tải chi tiết đơn đặt hàng mua');
  }
  return data;
};

export const createPurchaseOrder = async (payload) => {
  const response = await fetch(`${API_URL}/purchase-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi tạo đơn đặt hàng mua mới');
  }
  return data;
};

export const updatePurchaseOrder = async (id, payload) => {
  const response = await fetch(`${API_URL}/purchase-orders/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi cập nhật đơn hàng');
  }
  return data;
};

export const sendPurchaseOrderToSupplier = async (id, payload = {}) => {
  const response = await fetch(`${API_URL}/purchase-orders/${id}/send`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi gửi đơn đặt hàng cho NCC');
  }
  return data;
};

export const cancelPurchaseOrder = async (id, payload) => {
  const response = await fetch(`${API_URL}/purchase-orders/${id}/cancel`, {
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

export const receiveGoodsPurchaseOrder = async (id, payload) => {
  const response = await fetch(`${API_URL}/purchase-orders/${id}/receive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi nhận hàng nhập kho');
  }
  return data;
};

export const closePartialPurchaseOrder = async (id, payload) => {
  const response = await fetch(`${API_URL}/purchase-orders/${id}/close-partial`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi đóng đơn thiếu hàng');
  }
  return data;
};

export const getPurchaseOrderDiscrepancies = async (filters = {}) => {
  const cleanFilters = {};
  Object.keys(filters).forEach(k => {
    if (filters[k] !== undefined && filters[k] !== null && filters[k] !== '') {
      cleanFilters[k] = filters[k];
    }
  });

  const queryParams = new URLSearchParams(cleanFilters).toString();
  const response = await fetch(`${API_URL}/purchase-orders/discrepancies?${queryParams}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi tải báo cáo chênh lệch nhận hàng');
  }
  return data;
};

export const exportPurchaseOrdersExcel = (filters = {}) => {
  const cleanFilters = {};
  Object.keys(filters).forEach(k => {
    if (filters[k] !== undefined && filters[k] !== null && filters[k] !== '') {
      cleanFilters[k] = filters[k];
    }
  });
  const queryParams = new URLSearchParams(cleanFilters).toString();
  window.open(`${API_URL}/purchase-orders/export?${queryParams}`, '_blank');
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
  } else if (reportType === 'purchase-orders') {
    endpoint = `${API_URL}/purchase-orders/export?${new URLSearchParams(filters).toString()}`;
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

// --- PPO (PURCHASE PROPOSAL ORDERS - ĐỀ XUẤT ĐẶT HÀNG MUA) ---

export const generatePpoSuggestions = async (distributorId = 1) => {
  const response = await fetch(`${API_URL}/ppo/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ distributorId })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi tính toán đề xuất đặt hàng');
  }
  return data;
};

export const getPpoSuggestions = async (filters = {}) => {
  const cleanFilters = {};
  Object.keys(filters).forEach(k => {
    if (filters[k] !== undefined && filters[k] !== null && filters[k] !== '') {
      cleanFilters[k] = filters[k];
    }
  });

  const queryParams = new URLSearchParams(cleanFilters).toString();
  const response = await fetch(`${API_URL}/ppo?${queryParams}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi tải danh sách đề xuất PPO');
  }
  return data;
};

export const getPpoSummary = async (distributorId = 1) => {
  const response = await fetch(`${API_URL}/ppo/summary?distributorId=${distributorId}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi tải thống kê PPO');
  }
  return data;
};

export const getPpoById = async (id, distributorId = 1) => {
  const response = await fetch(`${API_URL}/ppo/${id}?distributorId=${distributorId}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi tải chi tiết đề xuất PPO');
  }
  return data;
};

export const updatePpoQuantity = async (id, payload) => {
  const response = await fetch(`${API_URL}/ppo/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi cập nhật số lượng đề xuất');
  }
  return data;
};

export const approvePpoBatch = async (payload) => {
  const response = await fetch(`${API_URL}/ppo/approve-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi duyệt các đề xuất PPO');
  }
  return data;
};

export const rejectPpo = async (id, payload) => {
  const response = await fetch(`${API_URL}/ppo/${id}/reject`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi từ chối đề xuất PPO');
  }
  return data;
};

export const getPpoWindowStatus = async () => {
  const response = await fetch(`${API_URL}/ppo/window-status`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi kiểm tra khung giờ PPO');
  }
  return data;
};

export const execute11AmClosing = async (distributorId = 1) => {
  const response = await fetch(`${API_URL}/ppo/execute-closing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ distributorId })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi thực thi chốt đơn lúc 11:00');
  }
  return data;
};

// --- NHẬP KHO ĐẶT HÀNG THEO CHUYẾN XE (INBOUND GOODS RECEIVING) ---

export const getInboundDeliveryTrips = async (filters = {}) => {
  const cleanFilters = {};
  Object.keys(filters).forEach(k => {
    if (filters[k] !== undefined && filters[k] !== null && filters[k] !== '') {
      cleanFilters[k] = filters[k];
    }
  });

  const queryParams = new URLSearchParams(cleanFilters).toString();
  const response = await fetch(`${API_URL}/purchase/receiving/trips?${queryParams}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi tải danh sách chuyến xe hàng về');
  }
  return data;
};

export const getInboundTripDetail = async (tripId, distributorId = 1) => {
  const response = await fetch(`${API_URL}/purchase/receiving/trips/${tripId}?distributorId=${distributorId}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi tải chi tiết chuyến xe');
  }
  return data;
};

export const receiveTripGoods = async (tripId, payload) => {
  const response = await fetch(`${API_URL}/purchase/receiving/trips/${tripId}/receive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi thực hiện nhập kho');
  }
  return data;
};

// --- WEB BÁN HÀNG (ORDERING PORTAL - R- ORDERS) ---

export const registerShopCustomer = async (payload) => {
  const response = await fetch(`${API_URL}/shop/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Đăng ký tài khoản thất bại');
  }
  return data;
};

export const loginShopCustomer = async (phone, password) => {
  const response = await fetch(`${API_URL}/shop/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Đăng nhập thất bại');
  }
  return data;
};

export const getShopProducts = async (params = {}) => {
  const clean = {};
  Object.keys(params).forEach(k => {
    if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
      clean[k] = params[k];
    }
  });
  const query = new URLSearchParams(clean).toString();
  const response = await fetch(`${API_URL}/shop/products?${query}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi tải danh sách sản phẩm bán hàng');
  }
  return data;
};

export const getShopCategories = async () => {
  const response = await fetch(`${API_URL}/shop/categories`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi tải danh mục sản phẩm');
  }
  return data;
};

export const getShopProductDetail = async (id, params = {}) => {
  const clean = {};
  Object.keys(params).forEach(k => {
    if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
      clean[k] = params[k];
    }
  });
  const query = new URLSearchParams(clean).toString();
  const url = `${API_URL}/shop/products/${id}${query ? `?${query}` : ''}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi tải chi tiết sản phẩm');
  }
  return data;
};

export const placeShopOrder = async (payload) => {
  const response = await fetch(`${API_URL}/shop/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi đặt hàng');
  }
  return data;
};

export const getCustomerOrders = async (customerId) => {
  const response = await fetch(`${API_URL}/shop/my-orders/${customerId}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi tải lịch sử đơn hàng');
  }
  return data;
};

export const getShopOrderDetail = async (orderCode) => {
  const response = await fetch(`${API_URL}/shop/orders/${encodeURIComponent(orderCode)}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Không tìm thấy đơn hàng');
  }
  return data;
};

// --- LOGISTICS & DELIVERY TRIPS ---

export const getDeliveryTripsList = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${API_URL}/delivery-trips?${query}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi tải danh sách chuyến xe');
  }
  return data;
};

export const getDeliveryTripDetail = async (id, distributorId = 1) => {
  const response = await fetch(`${API_URL}/delivery-trips/${id}?distributorId=${distributorId}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi tải chi tiết chuyến xe');
  }
  return data;
};

export const getDispatchableOrders = async (warehouseId = '', distributorId = 1) => {
  const params = new URLSearchParams({ distributorId });
  if (warehouseId) params.append('warehouseId', warehouseId);
  const response = await fetch(`${API_URL}/delivery-trips/dispatchable-orders?${params.toString()}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi tải danh sách đơn chờ xếp xe');
  }
  return data.data || [];
};

export const createDeliveryTrip = async (payload) => {
  const response = await fetch(`${API_URL}/delivery-trips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi tạo chuyến xe mới');
  }
  return data;
};

export const dispatchOrdersToTrip = async (tripId, orderIds, changedById = 1) => {
  const response = await fetch(`${API_URL}/delivery-trips/${tripId}/dispatch-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderIds, changedById })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi xếp đơn hàng lên xe');
  }
  return data;
};

export const removeOrderFromTrip = async (tripId, orderId, reason = '') => {
  const response = await fetch(`${API_URL}/delivery-trips/${tripId}/remove-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, reason })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi gỡ đơn hàng khỏi chuyến xe');
  }
  return data;
};

export const updateDeliveryTripStatus = async (tripId, toStatus, notes = '') => {
  const response = await fetch(`${API_URL}/delivery-trips/${tripId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toStatus, notes })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi cập nhật trạng thái chuyến xe');
  }
  return data;
};

export const getTripCargoManifest = async (tripId, distributorId = 1) => {
  const response = await fetch(`${API_URL}/delivery-trips/${tripId}/manifest?distributorId=${distributorId}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi tải bảng kê hàng hóa số lô');
  }
  return data;
};

export const confirmStopDelivery = async (tripId, payload) => {
  const response = await fetch(`${API_URL}/delivery-trips/${tripId}/confirm-delivery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi xác nhận kết quả giao hàng');
  }
  return data;
};

export const getTripReturnSummary = async (tripId, distributorId = 1) => {
  const response = await fetch(`${API_URL}/delivery-trips/${tripId}/return-summary?distributorId=${distributorId}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi tải bảng kê hàng rớt & quyết toán COD');
  }
  return data;
};

export const closeDeliveryTrip = async (tripId, payload) => {
  const response = await fetch(`${API_URL}/delivery-trips/${tripId}/close-trip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi làm thủ tục đóng chuyến xe');
  }
  return data;
};




