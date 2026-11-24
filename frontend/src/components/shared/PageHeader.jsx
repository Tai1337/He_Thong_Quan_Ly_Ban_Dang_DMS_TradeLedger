import React from 'react';
import './PageHeader.css';

export const PageHeader = ({
  breadcrumb,
  title,
  badge,
  description,
  actions,
  children,
  className = '',
}) => {
  return (
    <div className={`erp-page-header ${className}`}>
      {breadcrumb && (
        <div className="erp-page-header-breadcrumb">
          <span className="erp-breadcrumb-dot">●</span>
          {breadcrumb}
        </div>
      )}
      <div className="erp-page-header-main">
        <div className="erp-page-header-left">
          <div className="erp-page-header-title-row">
            <h1 className="erp-page-header-title">{title}</h1>
            {badge && <span className="erp-page-header-badge">{badge}</span>}
          </div>
          {description && (
            <p className="erp-page-header-desc">{description}</p>
          )}
        </div>
        {(actions || children) && (
          <div className="erp-page-header-actions">
            {actions}
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

