import { useState, useEffect } from 'react';
import { X, Download, AlertTriangle, CheckCircle, Edit2, Check, RefreshCw } from 'lucide-react';
import { getReportRpt005, updateSalesOrderItemQty, exportReportExcel } from '../../../services/api';
import './Rpt005Modal.css';

const formatCurrency = (val) => new Intl.NumberFormat('vi-VN').format(val || 0);

const Rpt005Modal = ({ isOpen, onClose, appliedFilters = {}, onOrderUpdated }) => {
  const [mode, setMode] = useState('missing_only'); // 'missing_only' | 'all'
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // State phục vụ inline edit số lượng
  const [editingItemId, setEditingItemId] = useState(null);
  const [editQty, setEditQty] = useState('');
  const [editReason, setEditReason] = useState('');
  const [savingItemId, setSavingItemId] = useState(null);

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getReportRpt005({
        ...appliedFilters,
        mode
      });
      setData(res.data || []);
    } catch (err) {
      setError(err.message || 'Lỗi tải dữ liệu báo cáo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReport();
      setEditingItemId(null);
    }
  }, [isOpen, mode]);

  const handleStartEdit = (row) => {
    setEditingItemId(row.itemId);
    setEditQty(row.orderQty);
    setEditReason('Kế toán điều chỉnh do thiếu tồn kho');
  };

  const handleSaveEdit = async (row) => {
    if (Number(editQty) <= 0) {
      alert('Số lượng phải lớn hơn 0');
      return;
    }
    setSavingItemId(row.itemId);
    try {
      await updateSalesOrderItemQty(row.orderId, row.itemId, {
        newQuantity: Number(editQty),
        reason: editReason
      });
      setSuccessMsg(`Đã cập nhật số lượng dòng ${row.sku} thành ${editQty}`);
      setEditingItemId(null);
      await fetchReport();
      if (onOrderUpdated) onOrderUpdated();
    } catch (err) {
      alert(err.message || 'Lỗi khi cập nhật số lượng');
    } finally {
      setSavingItemId(null);
    }
  };

  const handleExport = () => {
    exportReportExcel('rpt005', {
      ...appliedFilters,
      mode
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="rpt005-modal-container">
        {/* Header */}
        <div className="rpt005-header">
          <div>
            <h3>RPT005 - Báo cáo đơn hàng thiếu tồn kho</h3>
            <p className="rpt005-sub">Rà soát và điều chỉnh số lượng dòng hàng trước khi phân bổ lô</p>
          </div>
          <button className="btn-close-modal" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Toolbar & Mode Selector */}
        <div className="rpt005-toolbar">
          <div className="mode-toggle-group">
            <button 
              className={`btn-mode ${mode === 'missing_only' ? 'active' : ''}`}
              onClick={() => setMode('missing_only')}
            >
              <AlertTriangle size={15} /> Chỉ hàng thiếu tồn
            </button>
            <button 
              className={`btn-mode ${mode === 'all' ? 'active' : ''}`}
              onClick={() => setMode('all')}
            >
              <CheckCircle size={15} /> In tất cả (Cho phép sửa SL)
            </button>
          </div>

          <div className="rpt005-actions">
            <button className="btn-secondary" onClick={fetchReport} title="Làm mới">
              <RefreshCw size={15} /> Làm mới
            </button>
            <button className="btn-export-excel" onClick={handleExport}>
              <Download size={15} /> Xuất Excel ({mode === 'missing_only' ? 'Hàng thiếu' : 'Tất cả'})
            </button>
          </div>
        </div>

        {successMsg && (
          <div className="rpt005-alert-success">
            {successMsg}
          </div>
        )}

        {error && (
          <div className="rpt005-alert-error">
            {error}
          </div>
        )}

        {/* Table Content */}
        <div className="rpt005-table-wrap">
          {loading ? (
            <div className="rpt005-loading">Đang tổng hợp dữ liệu báo cáo...</div>
          ) : data.length === 0 ? (
            <div className="rpt005-empty">
              {mode === 'missing_only' 
                ? 'Tuyệt vời! Không có đơn hàng nào bị thiếu tồn kho trong bộ lọc hiện tại.' 
                : 'Không tìm thấy dòng hàng nào phù hợp bộ lọc.'}
            </div>
          ) : (
            <table className="rpt005-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Ngày đặt</th>
                  <th>Khách hàng</th>
                  <th>Mã SKU</th>
                  <th>Tên sản phẩm</th>
                  <th>ĐVT</th>
                  <th style={{ textAlign: 'right' }}>Số lượng đặt</th>
                  <th style={{ textAlign: 'right' }}>Tồn khả dụng</th>
                  <th style={{ textAlign: 'right' }}>Thiếu tồn</th>
                  <th style={{ textAlign: 'center' }}>Trạng thái đơn</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => {
                  const isEditing = editingItemId === row.itemId;
                  return (
                    <tr key={row.itemId} className={row.isShortage ? 'shortage-row' : ''}>
                      <td style={{ fontWeight: 600 }}>{row.orderCode}</td>
                      <td>{row.orderDate}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{row.retailerName}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>[{row.retailerCode}]</div>
                      </td>
                      <td><code>{row.sku}</code></td>
                      <td style={{ maxWidth: '220px' }}>{row.productName}</td>
                      <td>{row.unit}</td>
                      <td style={{ textAlign: 'right' }}>
                        {isEditing ? (
                          <input 
                            type="number"
                            className="inline-qty-input"
                            value={editQty}
                            onChange={(e) => setEditQty(e.target.value)}
                            min="1"
                            autoFocus
                          />
                        ) : (
                          <span style={{ fontWeight: 600, color: row.isShortage ? '#dc2626' : '#1e293b' }}>
                            {row.orderQty}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 500, color: '#059669' }}>
                        {row.availableQty}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {row.shortageQty > 0 ? (
                          <span className="badge-shortage">
                            -{row.shortageQty}
                          </span>
                        ) : (
                          <span style={{ color: '#64748b' }}>-</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`status-badge ${row.status.toLowerCase()}`}>
                          {row.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {row.status === 'PENDING' ? (
                          isEditing ? (
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                              <button 
                                className="btn-save-inline" 
                                onClick={() => handleSaveEdit(row)}
                                disabled={savingItemId === row.itemId}
                                title="Lưu số lượng"
                              >
                                <Check size={14} /> Lưu
                              </button>
                              <button 
                                className="btn-cancel-inline" 
                                onClick={() => setEditingItemId(null)}
                                title="Huỷ"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <button 
                              className="btn-edit-inline" 
                              onClick={() => handleStartEdit(row)}
                              title="Sửa số lượng đặt"
                            >
                              <Edit2 size={13} /> Sửa SL
                            </button>
                          )
                        ) : (
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Không thể sửa</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer info */}
        <div className="rpt005-footer">
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            Hiển thị <strong>{data.length}</strong> dòng hàng | Phát hiện <strong>{data.filter(r => r.isShortage).length}</strong> dòng thiếu tồn kho
          </div>
          <button className="btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default Rpt005Modal;
