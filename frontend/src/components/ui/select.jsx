import React, { forwardRef } from 'react';
import './select.css';

export const Select = forwardRef(({
  className = '',
  children,
  leftIcon = null,
  error = false,
  ...props
}, ref) => {
  return (
    <div className={`ui-select-wrapper ${error ? 'has-error' : ''} ${className}`}>
      {leftIcon && <span className="ui-select-left-icon">{leftIcon}</span>}
      <select
        ref={ref}
        className={`ui-select-field ${leftIcon ? 'pl-icon' : ''}`}
        {...props}
      >
        {children}
      </select>
      <span className="ui-select-chevron">▾</span>
    </div>
  );
});

Select.displayName = 'Select';

