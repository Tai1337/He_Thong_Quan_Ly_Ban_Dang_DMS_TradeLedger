import { useState, useEffect } from 'react';
import { X, AlertTriangle, ArrowDownRight, ArrowUpRight, RefreshCw } from 'lucide-react';
import { getPurchaseOrderDiscrepancies } from '../../../services/api';
import './DiscrepancyModal.css';

const DiscrepancyModal = ({ isOpen, onClose }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getPurchaseOrderDiscrepancies();
      setData(res || []);
    } catch (err) {
      setError(err.message || 'Lỗi khi tải báo cáo chênh lệch');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="po-create-modal discrepancy-modal-container">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge discrepancy-header-badge">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2>Báo cáo Chênh lệch Nhận hàng từ Nhà cung cấp</h2>
              <p className="modal-subtitle">Danh sách các đơn đặt hàng và mặt hàng có số lượng thực nhận khác với số lượng đặt mua</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: '#475569' }}>
              Tìm thấy <strong>{data.length}</strong> đơn hàng có mặt hàng giao lệch so với số lượng đặt.
            </span>
            <button 
              type="button" 
              onClick={loadData} 
              className="btn-cancel" 
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              <span>Tải lại</span>
            </button>
          </div>

          {error && (
            <div className="error-banner">
              <span>{error}</span>
            </div>
          )}

          <div className="discrepancy-table-wrapper">
            <table className="discrepancy-table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>Mã PO</th>
                  <th style={{ width: '180px' }}>Nhà cung cấp</th>
                  <th style={{ width: '100px' }}>Ngày tạo</th>
                  <th style={{ width: '220px' }}>Sản phẩm</th>
                  <th style={{ width: '60px' }}>ĐVT</th>
                  <th style={{ width: '80px', textAlign: 'right' }}>SL Đặt</th>
                  <th style={{ width: '80px', textAlign: 'right' }}>Thực nhận</th>
                  <th style={{ width: '110px', textAlign: 'center' }}>Chênh lệch</th>
                  <th style={{ width: '110px', textAlign: 'center' }}>Trạng thái PO</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      Đang tải dữ liệu chênh lệch nhận hàng...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#059669' }}>
                      Không phát hiện đơn hàng nào có chênh lệch nhận hàng. Tất cả các đơn đã nhận đủ theo số lượng đặt!
                    </td>
                  </tr>
                ) : (
                  data.flatMap((po, pIdx) => {
                    const items = po.items.filter(i => Number(i.quantityReceived) !== Number(i.quantity));
                    return items.map((itm, iIdx) => {
                      const diff = Number(itm.quantityReceived) - Number(itm.quantity);
                      return (
                        <tr key={`${po.id}-${itm.id}`}>
                          {iIdx === 0 ? (
                            <>
                              <td rowSpan={items.length} style={{ fontWeight: 600, color: '#2563eb' }}>
                                {po.poCode}
                              </td>
                              <td rowSpan={items.length}>
                                {po.supplier?.name || 'Chưa cập nhật'}
                              </td>
                              <td rowSpan={items.length} style={{ color: '#64748b' }}>
                                {new Date(po.createdAt).toLocaleDateString('vi-VN')}
                              </td>
                            </>
                          ) : null}
                          <td>
                            <div style={{ fontWeight: 600 }}>{itm.product?.sku}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{itm.product?.name}</div>
                          </td>
                          <td>{itm.product?.unit}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{itm.quantity}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>{itm.quantityReceived}</td>
                          <td style={{ textAlign: 'center' }}>
                            {diff > 0 ? (
                              <span className="diff-tag-excess">
                                +{diff} (Thừa)
                              </span>
                            ) : (
                              <span className="diff-tag-shortage">
                                {diff} (Thiếu)
                              </span>
                            )}
                          </td>
                          {iIdx === 0 ? (
                            <td rowSpan={items.length} style={{ textAlign: 'center' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                                {po.status === 'COMPLETED' ? 'Đã hoàn tất' : 'Đang nhận'}
                              </span>
                            </td>
                          ) : null}
                        </tr>
                      );
                    });
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiscrepancyModal;
