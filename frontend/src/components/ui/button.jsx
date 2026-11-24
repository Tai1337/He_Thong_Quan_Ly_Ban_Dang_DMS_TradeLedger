import React, { forwardRef } from 'react';
import './button.css';

export const Button = forwardRef(({
  children,
  className = '',
  variant = 'default', // 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link'
  size = 'default', // 'default' | 'sm' | 'lg' | 'icon'
  disabled = false,
  loading = false,
  type = 'button',
  onClick,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`ui-btn ui-btn-${variant} ui-btn-${size} ${className}`}
      onClick={onClick}
      {...props}
    >
      {loading && <span className="ui-btn-spinner" />}
      {children}
    </button>
  );
});

Button.displayName = 'Button';

