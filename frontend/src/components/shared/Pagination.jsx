import React from 'react';
import './Pagination.css';

export const Pagination = ({
  page = 1,
  pageSize = 10,
  total = 0,
  itemLabel = 'bản ghi',
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className = '',
}) => {
  const totalPages = Math.ceil(total / pageSize) || 1;
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  // Tạo mảng số trang hiển thị
  const getPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= page - 1 && i <= page + 1)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  };

  return (
    <div className={`erp-pagination ${className}`}>
      {/* Cột trái: Thông tin hiển thị & Chọn số dòng */}
      <div className="erp-pagination-left">
        <span className="erp-pagination-info">
          Hiển thị <strong>{startItem} - {endItem}</strong> của <strong>{total}</strong> {itemLabel}
        </span>

        {onPageSizeChange && (
          <div className="erp-pagination-size-picker">
            <span className="size-label">| Số dòng:</span>
            <select
              className="erp-pagination-select"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / trang
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Cột phải: Các nút trang */}
      <div className="erp-pagination-right">
        <button
          type="button"
          className="erp-pagination-btn"
          disabled={page <= 1}
          onClick={() => onPageChange && onPageChange(page - 1)}
        >
          ‹ Trước
        </button>

        {getPageNumbers().map((p, idx) =>
          p === '...' ? (
            <span key={`dots-${idx}`} className="erp-pagination-dots">
              ...
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={`erp-pagination-page-btn ${p === page ? 'active' : ''}`}
              onClick={() => onPageChange && onPageChange(p)}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          className="erp-pagination-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange && onPageChange(page + 1)}
        >
          Sau ›
        </button>
      </div>
    </div>
  );
};

