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

export const getSalesOrders = async (filters) => {
  const queryParams = new URLSearchParams(filters).toString();
  const response = await fetch(`${API_URL}/sales-orders?${queryParams}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi tải danh sách đơn hàng');
  }
  return data;
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

export const getWarehouses = async (distributorId) => {
  const query = distributorId ? `?distributorId=${distributorId}` : '';
  const response = await fetch(`${API_URL}/master/warehouses${query}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Lỗi khi tải danh sách kho');
  }
  return data;
};
