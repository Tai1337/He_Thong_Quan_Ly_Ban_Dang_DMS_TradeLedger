import React, { forwardRef } from 'react';
import './input.css';

export const Input = forwardRef(({
  className = '',
  type = 'text',
  leftIcon = null,
  rightIcon = null,
  error = false,
  ...props
}, ref) => {
  if (leftIcon || rightIcon) {
    return (
      <div className={`ui-input-wrapper ${error ? 'has-error' : ''} ${className}`}>
        {leftIcon && <span className="ui-input-left-icon">{leftIcon}</span>}
        <input
          ref={ref}
          type={type}
          className={`ui-input-field ${leftIcon ? 'pl-icon' : ''} ${rightIcon ? 'pr-icon' : ''}`}
          {...props}
        />
        {rightIcon && <span className="ui-input-right-icon">{rightIcon}</span>}
      </div>
    );
  }

  return (
    <input
      ref={ref}
      type={type}
      className={`ui-input-field ${error ? 'has-error' : ''} ${className}`}
      {...props}
    />
  );
});

Input.displayName = 'Input';

