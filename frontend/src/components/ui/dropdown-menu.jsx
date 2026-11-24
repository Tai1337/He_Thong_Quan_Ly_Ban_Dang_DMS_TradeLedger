import React, { useState, useRef, useEffect } from 'react';
import './dropdown-menu.css';

export function DropdownMenu({ children }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div className="ui-dropdown-menu" ref={containerRef}>
      {React.Children.map(children, (child) => {
        if (!child) return null;
        if (child.type === DropdownMenuTrigger) {
          return React.cloneElement(child, {
            onClick: () => setOpen((prev) => !prev),
            'aria-expanded': open,
          });
        }
        if (child.type === DropdownMenuContent) {
          return open ? React.cloneElement(child, { onClose: () => setOpen(false) }) : null;
        }
        return child;
      })}
    </div>
  );
}

export function DropdownMenuTrigger({ asChild, children, onClick, ...props }) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: (e) => {
        children.props.onClick?.(e);
        onClick?.(e);
      },
      ...props,
    });
  }

  return (
    <button type="button" className="ui-dropdown-trigger" onClick={onClick} {...props}>
      {children}
    </button>
  );
}

export function DropdownMenuContent({ className = '', children, align = 'right', onClose, ...props }) {
  return (
    <div
      className={`ui-dropdown-content align-${align} ${className}`}
      onClick={(e) => {
        // If an item was clicked, auto close
        if (e.target.closest('.ui-dropdown-item')) {
          onClose?.();
        }
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({ className = '', children, onClick, disabled = false, ...props }) {
  return (
    <div
      className={`ui-dropdown-item ${disabled ? 'disabled' : ''} ${className}`}
      onClick={!disabled ? onClick : undefined}
      {...props}
    >
      {children}
    </div>
  );
}

export function DropdownMenuSeparator({ className = '', ...props }) {
  return <div className={`ui-dropdown-separator ${className}`} {...props} />;
}

