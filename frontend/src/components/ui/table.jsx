import React, { forwardRef } from 'react';
import './table.css';

export const Table = forwardRef(({ className = '', children, ...props }, ref) => (
  <div className="ui-table-container">
    <table ref={ref} className={`ui-table ${className}`} {...props}>
      {children}
    </table>
  </div>
));
Table.displayName = 'Table';

export const TableHeader = forwardRef(({ className = '', children, ...props }, ref) => (
  <thead ref={ref} className={`ui-table-header ${className}`} {...props}>
    {children}
  </thead>
));
TableHeader.displayName = 'TableHeader';

export const TableBody = forwardRef(({ className = '', children, ...props }, ref) => (
  <tbody ref={ref} className={`ui-table-body ${className}`} {...props}>
    {children}
  </tbody>
));
TableBody.displayName = 'TableBody';

export const TableFooter = forwardRef(({ className = '', children, ...props }, ref) => (
  <tfoot ref={ref} className={`ui-table-footer ${className}`} {...props}>
    {children}
  </tfoot>
));
TableFooter.displayName = 'TableFooter';

export const TableRow = forwardRef(({ className = '', children, selected = false, ...props }, ref) => (
  <tr ref={ref} className={`ui-table-row ${selected ? 'is-selected' : ''} ${className}`} {...props}>
    {children}
  </tr>
));
TableRow.displayName = 'TableRow';

export const TableHead = forwardRef(({ className = '', children, ...props }, ref) => (
  <th ref={ref} className={`ui-table-head ${className}`} {...props}>
    {children}
  </th>
));
TableHead.displayName = 'TableHead';

export const TableCell = forwardRef(({ className = '', children, ...props }, ref) => (
  <td ref={ref} className={`ui-table-cell ${className}`} {...props}>
    {children}
  </td>
));
TableCell.displayName = 'TableCell';

export const TableCaption = forwardRef(({ className = '', children, ...props }, ref) => (
  <caption ref={ref} className={`ui-table-caption ${className}`} {...props}>
    {children}
  </caption>
));
TableCaption.displayName = 'TableCaption';

