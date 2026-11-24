import React from 'react';
import './StatusBadge.css';

export const StatusBadge = ({
  status,
  variant,
  label,
  dot = true,
  className = '',
  size = 'md',
}) => {
  // Config trạng thái mặc định cho các module ERP
  const statusMap = {
    // Trạng thái phiếu kiểm kê
    COMPLETED: { label: 'Đã cân kho', variant: 'success' },
    PENDING_APPROVAL: { label: 'Chờ duyệt cân kho', variant: 'warning' },
    IN_PROGRESS: { label: 'Đang kiểm kê', variant: 'primary' },
    DRAFT: { label: 'Bản nháp', variant: 'secondary' },
    CANCELLED: { label: 'Đã hủy', variant: 'muted' },
    REJECTED: { label: 'Từ chối', variant: 'muted' },
    
    // Đối soát
    MATCHED: { label: 'Đã khớp 100%', variant: 'success' },
    DISCREPANCY: { label: 'Lệch', variant: 'danger' },

    // Hình thức
    PERIODIC: { label: 'Định kỳ tháng', variant: 'neutral' },
    BY_SKU: { label: 'Đột xuất SKU', variant: 'neutral' },
    BY_CATEGORY: { label: 'Theo nhóm hàng', variant: 'neutral' },
    BY_ZONE: { label: 'Theo vị trí / khu vực', variant: 'neutral' },
  };

  const current = statusMap[status] || {};
  const finalVariant = variant || current.variant || 'secondary';
  const finalLabel = label || current.label || status;

  return (
    <span className={`erp-status-badge badge-${finalVariant} badge-size-${size} ${className}`}>
      {dot && <span className="erp-status-dot" />}
      <span className="erp-status-text">{finalLabel}</span>
    </span>
  );
};

