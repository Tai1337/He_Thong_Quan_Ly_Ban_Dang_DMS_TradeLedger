import React from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import './FilterToolbar.css';

export const FilterToolbar = ({
  tabs = [],
  activeTab,
  onTabChange,
  syncTime,
  onRefresh,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Tìm kiếm...',
  filters,
  extraActions,
  onReset,
  className = '',
}) => {
  return (
    <div className={`erp-filter-toolbar ${className}`}>
      {/* Hàng Tabs trạng thái và Thời gian đồng bộ */}
      {(tabs.length > 0 || syncTime || onRefresh) && (
        <div className="erp-filter-tabs-row">
          <div className="erp-filter-tabs-list">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`erp-filter-tab-btn ${isActive ? 'active' : ''} ${tab.variant ? `tab-${tab.variant}` : ''}`}
                  onClick={() => onTabChange && onTabChange(tab.id)}
                >
                  <span className="tab-label">{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`tab-count ${tab.variant ? `badge-${tab.variant}` : ''}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {(syncTime || onRefresh) && (
            <div className="erp-filter-sync-col">
              {syncTime && <span className="erp-sync-time">Đồng bộ: {syncTime}</span>}
              {onRefresh && (
                <button
                  type="button"
                  className="erp-refresh-btn"
                  onClick={onRefresh}
                  title="Làm mới dữ liệu"
                >
                  ↻
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Hàng Filter Bar: Search + Dropdowns + Date Filter + Reset */}
      <div className="erp-filter-controls-row">
        {onSearchChange && (
          <div className="erp-search-wrapper">
            <span className="erp-search-icon">🔍</span>
            <input
              type="text"
              className="erp-search-input"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
            />
          </div>
        )}

        {filters && <div className="erp-custom-filters">{filters}</div>}

        {extraActions && <div className="erp-extra-actions">{extraActions}</div>}

        {onReset && (
          <button
            type="button"
            className="erp-filter-reset-btn"
            onClick={onReset}
            title="Đặt lại bộ lọc"
          >
            ↻
          </button>
        )}
      </div>
    </div>
  );
};

