import React from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../ui/table';
import './DataTable.css';

export const DataTable = ({
  columns = [],
  data = [],
  keyField = 'id',
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  loading = false,
  emptyText = 'Không tìm thấy dữ liệu',
  className = '',
}) => {
  const isAllSelected =
    data.length > 0 && data.every((row) => selectedIds.includes(row[keyField]));
  const isPartiallySelected =
    data.length > 0 &&
    data.some((row) => selectedIds.includes(row[keyField])) &&
    !isAllSelected;

  const handleToggleAll = () => {
    if (!onSelectionChange) return;
    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(data.map((row) => row[keyField]));
    }
  };

  const handleToggleRow = (rowId) => {
    if (!onSelectionChange) return;
    if (selectedIds.includes(rowId)) {
      onSelectionChange(selectedIds.filter((id) => id !== rowId));
    } else {
      onSelectionChange([...selectedIds, rowId]);
    }
  };

  return (
    <div className={`erp-data-table-wrapper ${className}`}>
      <Table>
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead style={{ width: '40px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  className="erp-table-checkbox"
                  checked={isAllSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = isPartiallySelected;
                  }}
                  onChange={handleToggleAll}
                />
              </TableHead>
            )}
            {columns.map((col, idx) => (
              <TableHead
                key={col.key || idx}
                style={{
                  width: col.width,
                  textAlign: col.align || 'left',
                  ...col.headerStyle,
                }}
              >
                {col.title}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell
                colSpan={columns.length + (selectable ? 1 : 0)}
                className="erp-table-loading"
              >
                <div className="erp-table-spinner" />
                <span>Đang tải dữ liệu...</span>
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length + (selectable ? 1 : 0)}
                className="erp-table-empty"
              >
                <div className="empty-box-icon">📦</div>
                <div className="empty-box-text">{emptyText}</div>
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, rowIdx) => {
              const rowId = row[keyField] ?? rowIdx;
              const isSelected = selectedIds.includes(rowId);

              return (
                <TableRow
                  key={rowId}
                  className={isSelected ? 'row-selected' : ''}
                >
                  {selectable && (
                    <TableCell style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        className="erp-table-checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleRow(rowId)}
                      />
                    </TableCell>
                  )}
                  {columns.map((col, colIdx) => (
                    <TableCell
                      key={col.key || colIdx}
                      style={{
                        textAlign: col.align || 'left',
                        ...col.cellStyle,
                      }}
                    >
                      {col.render ? col.render(row[col.dataIndex], row, rowIdx) : row[col.dataIndex]}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};

