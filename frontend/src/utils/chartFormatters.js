/**
 * Shared formatters and palette constants for financial & sales Recharts visualizations.
 */

export const FINANCE_CHART_PALETTE = [
  '#234c78',
  '#4a7ab0',
  '#3c6e63',
  '#64748b',
  '#8c6d46',
  '#7c8ea3',
  '#94a3b8',
];

export const ORDER_STATUS_META = {
  PENDING: { label: 'Chờ duyệt', color: '#8c6d46' },
  SUBMITTED: { label: 'Đã xác nhận', color: '#4a7ab0' },
  ALLOCATED: { label: 'Đã phân bổ', color: '#64748b' },
  SHIPPED: { label: 'Đang giao', color: '#3b5b7a' },
  DELIVERED: { label: 'Đã giao', color: '#3c6e63' },
  INVOICED: { label: 'Đã lập HĐ', color: '#234c78' },
  PAID: { label: 'Đã thanh toán', color: '#2e594f' },
  CANCELLED: { label: 'Đã hủy', color: '#a64d4d' },
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

const VI_DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const VI_SCALES = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ'];

function readThreeDigits(num, fullPrefix) {
  const hundreds = Math.floor(num / 100);
  const tens = Math.floor((num % 100) / 10);
  const units = num % 10;
  const parts = [];

  if (hundreds > 0 || fullPrefix) {
    parts.push(`${VI_DIGITS[hundreds]} trăm`);
  }
  if (tens > 1) {
    parts.push(`${VI_DIGITS[tens]} mươi`);
    if (units === 1) parts.push('mốt');
    else if (units === 5) parts.push('lăm');
    else if (units > 0) parts.push(VI_DIGITS[units]);
  } else if (tens === 1) {
    parts.push('mười');
    if (units === 5) parts.push('lăm');
    else if (units > 0) parts.push(VI_DIGITS[units]);
  } else if (units > 0) {
    if (hundreds > 0 || fullPrefix) parts.push('lẻ');
    parts.push(VI_DIGITS[units]);
  }

  return parts.join(' ');
}

/**
 * Converts a non-negative VND integer into Vietnamese currency words.
 */
export const numberToVietnameseWords = (amount) => {
  const n = Math.round(Number(amount) || 0);
  if (n <= 0) return 'Không đồng';

  const groups = [];
  let remaining = n;
  while (remaining > 0) {
    groups.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  const words = [];
  for (let i = groups.length - 1; i >= 0; i -= 1) {
    const val = groups[i];
    if (val > 0) {
      const prefix = i < groups.length - 1;
      const chunk = readThreeDigits(val, prefix);
      words.push(`${chunk}${VI_SCALES[i] ? ` ${VI_SCALES[i]}` : ''}`);
    }
  }

  const text = words.join(' ').replace(/\s+/g, ' ').trim();
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} đồng`;
};
