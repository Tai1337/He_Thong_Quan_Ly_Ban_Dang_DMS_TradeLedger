import { useState, useEffect } from 'react';
import { 
  X, 
  PackageCheck, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  Trash2
} from 'lucide-react';
import { receiveGoodsPurchaseOrder } from '../../../services/api';
import { useNotification } from '../../../components/Common/NotificationProvider';
import './ReceiveGoodsModal.css';

const ReceiveGoodsModal = ({ isOpen, onClose, onSuccess, order }) => {
  const { notify } = useNotification();
  const [itemsData, setItemsData] = useState([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !order) return;

    setError('');
    setNotes('');

    const todayStr = new Date().toISOString().slice(0, 10);
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const expStr = nextYear.toISOString().slice(0, 10);

    const init = (order.items || []).map((item, idx) => {
      const remaining = Math.max(0, item.quantity - (item.quantityReceived || 0));
      return {
        rowKey: `${item.id}-0-${idx}`,
        isSplitRow: false,
        itemId: item.id,
        sku: item.product?.sku || '',
        name: item.product?.name || '',
        unit: item.product?.unit || 'Thùng',
        quantityOrdered: item.quantity,
        quantityReceivedOld: item.quantityReceived || 0,
        quantityRemaining: remaining,
        quantityReceiveNow: remaining,
        lotNumber: `LOT-${item.product?.sku || 'SKU'}-${todayStr.replace(/-/g, '')}`,
        manufactureDate: todayStr,
        expiryDate: expStr,
        locationCode: 'KHO-A1'
      };
    });

    setItemsData(init);
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  const handleFieldChange = (index, field, value) => {
    setItemsData(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSplitLot = (index) => {
    const src = itemsData[index];
    const todayStr = new Date().toISOString().slice(0, 10);
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    const splitRow = {
      ...src,
      rowKey: `${src.itemId}-split-${Date.now()}-${Math.random()}`,
      isSplitRow: true,
      quantityReceiveNow: 0,
      lotNumber: `${src.lotNumber}-B`,
      manufactureDate: todayStr,
      expiryDate: nextYear.toISOString().slice(0, 10),
    };

    setItemsData(prev => {
      const next = [...prev];
      next.splice(index + 1, 0, splitRow);
      return next;
    });
  };

  const handleRemoveSplit = (index) => {
    setItemsData(prev => prev.filter((_, i) => i !== index));
  };

  // Tổng hợp SL nhận đợt này theo itemId (bao gồm cả dòng tách lô)
  const receivedNowByItemId = itemsData.reduce((acc, row) => {
    acc[row.itemId] = (acc[row.itemId] || 0) + (Number(row.quantityReceiveNow) || 0);
    return acc;
  }, {});

  // Kiểm tra xem có cảnh báo thừa/thiếu nào không
  const hasDiscrepancy = itemsData.some(i => {
    if (i.isSplitRow) return false;
    const totalWillReceive = Number(i.quantityReceivedOld) + (receivedNowByItemId[i.itemId] || 0);
    return totalWillReceive !== Number(i.quantityOrdered);
  });

  const handleSubmit = async () => {
    setError('');

    const validItems = itemsData.filter(i => Number(i.quantityReceiveNow) > 0);
    if (validItems.length === 0) {
      setError('Vui lòng nhập số lượng nhận > 0 cho ít nhất 1 mặt hàng');
      return;
    }

    for (const itm of validItems) {
      if (!itm.lotNumber || !itm.lotNumber.trim()) {
        setError(`Mặt hàng [${itm.sku}] thiếu thông tin số lô`);
        return;
      }
      if (itm.manufactureDate && itm.expiryDate && new Date(itm.expiryDate) <= new Date(itm.manufactureDate)) {
        setError(`Mặt hàng [${itm.sku}] (Lô ${itm.lotNumber}): Hạn sử dụng phải lớn hơn Ngày sản xuất`);
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        distributorId: 1,
        notes: notes.trim(),
        items: validItems.map(i => ({
          itemId: i.itemId,
          quantityReceived: Number(i.quantityReceiveNow),
          lotNumber: i.lotNumber.trim(),
          manufactureDate: i.manufactureDate || null,
          expiryDate: i.expiryDate || null,
          locationCode: i.locationCode?.trim() || 'KHO-A1'
        }))
      };

      const updated = await receiveGoodsPurchaseOrder(order.id, payload);
      notify.success(`Đã nhập kho cho đơn ${order.poCode} thành công!`);
      onSuccess(updated);
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi khi ghi nhận nhập kho');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="po-create-modal receive-modal-container">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge" style={{ background: '#ecfdf5', color: '#059669' }}>
              <PackageCheck size={20} />
            </div>
            <div>
              <h2>Nhận hàng & Nhập kho theo Lô (PO: {order.poCode})</h2>
              <p className="modal-subtitle">Đối chiếu số lượng đặt và thực nhận, cập nhật số lô và hạn sử dụng vào kho</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {error && (
            <div className="error-banner">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Meta bar */}
          <div className="receive-meta-bar">
            <div className="meta-item">
              <span className="meta-label">Mã Đơn hàng PO</span>
              <span className="meta-val" style={{ color: '#2563eb' }}>{order.poCode}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Nhà cung cấp</span>
              <span className="meta-val">{order.supplier?.name || 'Chưa cập nhật'}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Kho nhận hàng</span>
              <span className="meta-val">{order.warehouse?.name || 'Kho chính'}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Trạng thái hiện tại</span>
              <span className="meta-val" style={{ color: '#d97706' }}>
                {order.status === 'WAITING_RECEIVE' ? 'Chờ nhận hàng' : 'Đã nhận một phần'}
              </span>
            </div>
          </div>

          {/* Cảnh báo chênh lệch nếu có */}
          {hasDiscrepancy && (
            <div className="diff-warning-banner">
              <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Cảnh báo chênh lệch số lượng nhận:</strong> Một số mặt hàng có số lượng nhận đợt này khác với số lượng còn lại của đơn hàng (thiếu hoặc thừa so với số lượng đặt ban đầu). Vui lòng kiểm tra kỹ hoặc ghi chú lý do bên dưới.
              </div>
            </div>
          )}

          {/* Table các mặt hàng */}
          <div className="receive-items-table-container">
            <table className="receive-table">
              <thead>
                <tr>
                  <th style={{ width: '35px' }}>STT</th>
                  <th style={{ width: '220px' }}>Sản phẩm</th>
                  <th style={{ width: '60px' }}>ĐVT</th>
                  <th style={{ width: '70px', textAlign: 'right' }}>Đã đặt</th>
                  <th style={{ width: '70px', textAlign: 'right' }}>Đã nhận</th>
                  <th style={{ width: '70px', textAlign: 'right' }}>Còn lại</th>
                  <th style={{ width: '100px' }}>SL nhận đợt này *</th>
                  <th style={{ width: '140px' }}>Số lô (Batch) *</th>
                  <th style={{ width: '120px' }}>Ngày SX</th>
                  <th style={{ width: '120px' }}>Hạn SD</th>
                  <th style={{ width: '80px' }}>Vị trí kho</th>
                  <th style={{ width: '110px' }}>Đối chiếu</th>
                  <th style={{ width: '60px', textAlign: 'center' }}>Lô</th>
                </tr>
              </thead>
              <tbody>
                {itemsData.map((item, idx) => {
                  const totalAfter = Number(item.quantityReceivedOld) + (receivedNowByItemId[item.itemId] || 0);
                  const diff = totalAfter - Number(item.quantityOrdered);

                  return (
                    <tr key={item.rowKey}>
                      <td style={{ color: '#64748b', textAlign: 'center' }}>{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>
                          {item.sku} {item.isSplitRow && <span style={{ fontSize: '0.7rem', color: '#2563eb' }}>(Lô tách)</span>}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.name}</div>
                      </td>
                      <td style={{ color: '#475569' }}>{item.unit}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.isSplitRow ? '-' : item.quantityOrdered}</td>
                      <td style={{ textAlign: 'right', color: '#059669' }}>{item.isSplitRow ? '-' : item.quantityReceivedOld}</td>
                      <td style={{ textAlign: 'right', color: item.quantityRemaining > 0 ? '#d97706' : '#64748b', fontWeight: 600 }}>
                        {item.isSplitRow ? '-' : item.quantityRemaining}
                      </td>
                      <td>
                        <input 
                          type="number" 
                          min="0"
                          style={{ width: '85px', textAlign: 'right', fontWeight: 600 }}
                          value={item.quantityReceiveNow}
                          onChange={(e) => handleFieldChange(idx, 'quantityReceiveNow', e.target.value)}
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          placeholder="Số lô hàng..."
                          style={{ width: '130px' }}
                          value={item.lotNumber}
                          onChange={(e) => handleFieldChange(idx, 'lotNumber', e.target.value)}
                        />
                      </td>
                      <td>
                        <input 
                          type="date" 
                          style={{ width: '115px' }}
                          value={item.manufactureDate}
                          onChange={(e) => handleFieldChange(idx, 'manufactureDate', e.target.value)}
                        />
                      </td>
                      <td>
                        <input 
                          type="date" 
                          style={{ width: '115px' }}
                          value={item.expiryDate}
                          onChange={(e) => handleFieldChange(idx, 'expiryDate', e.target.value)}
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          placeholder="Vị trí..."
                          style={{ width: '75px' }}
                          value={item.locationCode}
                          onChange={(e) => handleFieldChange(idx, 'locationCode', e.target.value)}
                        />
                      </td>
                      <td>
                        {item.isSplitRow ? (
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Gộp dòng trên</span>
                        ) : diff === 0 ? (
                          <span className="badge-diff-exact">
                            <CheckCircle2 size={12} /> Đủ ({totalAfter})
                          </span>
                        ) : diff > 0 ? (
                          <span className="badge-diff-excess">
                            <AlertTriangle size={12} /> Thừa +{diff}
                          </span>
                        ) : (
                          <span className="badge-diff-shortage">
                            Thiếu {Math.abs(diff)}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {item.isSplitRow ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveSplit(idx)}
                            title="Xóa dòng lô tách"
                            style={{ border: 'none', background: '#fef2f2', color: '#dc2626', borderRadius: 6, padding: '4px 6px', cursor: 'pointer' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSplitLot(idx)}
                            title="Tách thêm số lô khác"
                            style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#2563eb', borderRadius: 6, padding: '4px 6px', cursor: 'pointer' }}
                          >
                            <Plus size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Ghi chú nhận hàng */}
          <div className="form-field">
            <label>Ghi chú đợt nhận hàng / Lý do chênh lệch (nếu có):</label>
            <input 
              type="text" 
              placeholder="VD: Giao thiếu 5 thùng do nhà xe hết chỗ, giao đợt 2 vào ngày mai..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
            Đóng
          </button>
          <button 
            type="button" 
            className="btn-confirm-receive" 
            onClick={handleSubmit}
            disabled={loading}
          >
            <PackageCheck size={18} />
            <span>{loading ? 'Đang nhập kho...' : 'Xác nhận Nhập kho & Lưu lô'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiveGoodsModal;
