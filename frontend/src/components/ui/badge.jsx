import React from 'react';
import './badge.css';

export function Badge({
  children,
  className = '',
  variant = 'default', // 'default' | 'secondary' | 'success' | 'destructive' | 'warning' | 'info' | 'outline' | 'purple'
  dot = false,
  dotColor,
  ...props
}) {
  return (
    <span className={`ui-badge ui-badge-${variant} ${className}`} {...props}>
      {dot && (
        <span
          className="ui-badge-dot"
          style={dotColor ? { backgroundColor: dotColor } : undefined}
        />
      )}
      {children}
    </span>
  );
}

