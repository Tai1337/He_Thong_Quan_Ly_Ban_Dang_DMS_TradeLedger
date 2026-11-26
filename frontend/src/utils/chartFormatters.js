/**
 * Shared formatters and palette constants for financial & sales Recharts visualizations.
 */

export const FINANCE_CHART_PALETTE = [
  '#1a73e8',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#64748b',
];

export const ORDER_STATUS_META = {
  PENDING: { label: 'Chờ duyệt', color: '#f59e0b' },
  SUBMITTED: { label: 'Đã xác nhận', color: '#0284c7' },
  ALLOCATED: { label: 'Đã phân bổ', color: '#eab308' },
  SHIPPED: { label: 'Đang giao', color: '#8b5cf6' },
  DELIVERED: { label: 'Đã giao', color: '#10b981' },
  INVOICED: { label: 'Đã lập HĐ', color: '#2563eb' },
  PAID: { label: 'Đã thanh toán', color: '#059669' },
  CANCELLED: { label: 'Đã hủy', color: '#ef4444' },
};

export const formatVnd = (amount) =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(Number(amount) || 0) + ' đ';

export const formatCount = (value, maxFractionDigits = 1) =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: maxFractionDigits }).format(Number(value) || 0);

export const formatCompactVnd = (amount) => {
  const value = Number(amount) || 0;
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} Tỷ`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} Tr`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(0)} K`;
  return String(Math.round(value));
};

export const truncateChartLabel = (text, maxLength = 20) => {
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
};

/**
 * Parses a Vietnamese locale date string (`dd/mm/yyyy`) to timestamp for chronological sorting.
 */
export const parseViDateTimestamp = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return 0;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return 0;
  const [day, month, year] = parts.map(Number);
  return new Date(year, month - 1, day).getTime() || 0;
};
