import { useState, useEffect } from 'react';
import { X, CheckCircle2, Truck, AlertCircle, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { receiveTripGoods } from '../../../services/api';
import { useNotification } from '../../../components/Common/NotificationProvider';
import './ReceiveTripModal.css';

const formatCurrency = (val) => new Intl.NumberFormat('vi-VN').format(val || 0);

const ReceiveTripModal = ({ isOpen, trip, onClose, onSuccess }) => {
  const { notify } = useNotification();
  const [rows, setRows] = useState([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && trip) {
      const today = new Date().toISOString().slice(0, 10);
      const defaultExp = new Date();
      defaultExp.setFullYear(defaultExp.getFullYear() + 1);
      const defaultExpStr = defaultExp.toISOString().slice(0, 10);

      const initialRows = (trip.items || []).map((it, idx) => ({
        rowKey: `${it.poItemId}-0-${idx}`,
        isSplitRow: false,
        poItemId: it.poItemId,
        poCode: it.poCode,
        productName: it.productName,
        productSku: it.productSku,
        unit: it.unit,
        unitPrice: it.unitPrice,
        quantityOrdered: it.quantityOrdered,
        quantityReceivedOld: it.quantityReceived,
        quantityRemaining: it.quantityRemaining,
        quantityReceivedNow: it.quantityRemaining > 0 ? it.quantityRemaining : 0,
        lotNumber: `LOT-${it.productSku || 'SKU'}-${today.replace(/-/g, '')}`,
        mfgDate: today,
        expDate: defaultExpStr,
        locationCode: 'KHO-A1'
      }));
      setRows(initialRows);
      setNotes('');
      setError('');
    }
  }, [isOpen, trip]);

  if (!isOpen || !trip) return null;

  const isCompletedTrip = trip.status === 'COMPLETED';

  // Cập nhật giá trị ô input
  const handleRowChange = (index, field, value) => {
    setRows(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Tách thêm dòng lô mới cho cùng 1 mặt hàng
  const handleSplitLotRow = (index) => {
    const source = rows[index];
    const today = new Date().toISOString().slice(0, 10);
    const defaultExp = new Date();
    defaultExp.setFullYear(defaultExp.getFullYear() + 1);

    const newRow = {
      ...source,
      rowKey: `${source.poItemId}-split-${Date.now()}-${Math.random()}`,
      isSplitRow: true,
      quantityReceivedNow: 0,
      lotNumber: `${source.lotNumber}-B`,
      mfgDate: today,
      expDate: defaultExp.toISOString().slice(0, 10)
    };

    setRows(prev => {
      const next = [...prev];
      next.splice(index + 1, 0, newRow);
      return next;
    });
  };

  const handleRemoveSplitRow = (index) => {
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  // Nút điền đủ toàn bộ cho các dòng gốc
  const handleFillAllRemaining = () => {
    setRows(prev => prev.map(r => (
      r.isSplitRow ? r : { ...r, quantityReceivedNow: r.quantityRemaining }
    )));
  };

  // Cảnh báo nếu có mặt hàng nhận vượt số lượng đặt ban đầu
  const hasOverReceiving = (() => {
    const sumByPoItem = new Map();
    rows.forEach(r => {
      const prevSum = sumByPoItem.get(r.poItemId) || 0;
      sumByPoItem.set(r.poItemId, prevSum + (Number(r.quantityReceivedNow) || 0));
    });
    return rows.some(r => {
      const totalNow = sumByPoItem.get(r.poItemId) || 0;
      return Number(r.quantityReceivedOld) + totalNow > Number(r.quantityOrdered);
    });
  })();

  // Xác nhận nhập kho
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const activeRows = rows.filter(r => Number(r.quantityReceivedNow) > 0);
    if (activeRows.length === 0) {
      setError('Vui lòng nhập số lượng thực nhận (> 0) cho ít nhất 1 sản phẩm');
      return;
    }

    for (const r of activeRows) {
      if (!r.lotNumber || !r.lotNumber.trim()) {
        setError(`Sản phẩm [${r.productSku}] thiếu Số lô (Batch)`);
        return;
      }
      if (r.mfgDate && r.expDate && new Date(r.expDate) <= new Date(r.mfgDate)) {
        setError(`Sản phẩm [${r.productSku}] (Lô ${r.lotNumber}): Hạn sử dụng phải lớn hơn Ngày sản xuất`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        distributorId: 1,
        notes: notes.trim() || null,
        receivedItems: activeRows.map(r => ({
          poItemId: r.poItemId,
          quantityReceivedNow: Number(r.quantityReceivedNow),
          lotNumber: r.lotNumber.trim(),
          mfgDate: r.mfgDate || null,
          expDate: r.expDate || null,
          locationCode: r.locationCode?.trim() || 'KHO-A1'
        }))
      };

      const res = await receiveTripGoods(trip.id, payload);
      notify.success(res.message || 'Nhập kho thành công!');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi khi nhập kho');
    } finally {
      setSubmitting(false);
    }
  };

  const totalReceivingNow = rows.reduce((sum, r) => sum + (Number(r.quantityReceivedNow) || 0), 0);
  const totalReceivingValue = rows.reduce((sum, r) => sum + ((Number(r.quantityReceivedNow) || 0) * r.unitPrice), 0);

  return (
    <div className="modal-backdrop">
      <div className="receive-trip-modal">
        <div className="modal-header">
          <div className="modal-header-info">
            <div className="icon-truck-wrap">
              <Truck size={24} color="#2563eb" />
            </div>
            <div>
              <h3>Tiến Hành Nhập Kho — Chuyến Xe {trip.tripCode}</h3>
              <p>
                Nhà cung cấp: <strong>{trip.supplier?.name}</strong> | Ngày giao dự kiến: <strong style={{ color: '#ea580c' }}>{trip.expectedDeliveryDate} (D+3)</strong>
              </p>
            </div>
          </div>
          <button className="btn-close-modal" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form-content">
          {error && (
            <div className="modal-error-banner">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {hasOverReceiving && (
            <div className="modal-error-banner" style={{ background: '#fffbeb', borderColor: '#fde68a', color: '#92400e' }}>
              <AlertTriangle size={18} />
              <span>Cảnh báo: Có mặt hàng đang nhập vượt quá số lượng đặt ban đầu. Vui lòng kiểm tra kỹ trước khi xác nhận.</span>
            </div>
          )}

          <div className="receiving-quick-actions">
            <span className="items-count-text">
              Tổng số dòng kiểm đếm: <strong>{rows.length}</strong>
            </span>
            {!isCompletedTrip && (
              <button 
                type="button" 
                className="btn-fill-all"
                onClick={handleFillAllRemaining}
              >
                <CheckCircle2 size={15} />
                <span>Điền đủ theo đơn (Nhập đủ 100%)</span>
              </button>
            )}
          </div>

          <div className="table-wrapper">
            <table className="receive-items-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                  <th>Mặt hàng / SKU</th>
                  <th style={{ width: '80px', textAlign: 'right' }}>Đặt hàng</th>
                  <th style={{ width: '80px', textAlign: 'right' }}>Đã nhận</th>
                  <th style={{ width: '80px', textAlign: 'right' }}>Còn thiếu</th>
                  <th style={{ width: '105px', textAlign: 'center' }}>Thực nhận *</th>
                  <th style={{ width: '140px' }}>Số Lô (Lot) *</th>
                  <th style={{ width: '125px' }}>Ngày SX</th>
                  <th style={{ width: '125px' }}>Hạn dùng *</th>
                  <th style={{ width: '85px' }}>Vị trí</th>
                  {!isCompletedTrip && <th style={{ width: '72px', textAlign: 'center' }}>Lô</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const isFinished = !row.isSplitRow && row.quantityRemaining === 0;
                  return (
                    <tr key={row.rowKey} style={{ opacity: isFinished ? 0.65 : 1 }}>
                      <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>
                          {row.productSku} {row.isSplitRow && <span style={{ fontSize: '0.7rem', color: '#2563eb' }}>(Lô tách)</span>}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{row.productName}</div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {row.isSplitRow ? '-' : <>{row.quantityOrdered} <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{row.unit}</span></>}
                      </td>
                      <td style={{ textAlign: 'right', color: '#16a34a' }}>
                        {row.isSplitRow ? '-' : row.quantityReceivedOld}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: row.quantityRemaining > 0 ? '#ea580c' : '#16a34a' }}>
                        {row.isSplitRow ? '-' : row.quantityRemaining}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="number"
                          className="input-qty-receive"
                          min={0}
                          disabled={isCompletedTrip}
                          value={row.quantityReceivedNow}
                          onChange={(e) => handleRowChange(idx, 'quantityReceivedNow', e.target.value)}
                        />
                      </td>
                      <td>
                        <input 
                          type="text"
                          className="input-lot"
                          disabled={isCompletedTrip}
                          placeholder="Số lô..."
                          value={row.lotNumber}
                          onChange={(e) => handleRowChange(idx, 'lotNumber', e.target.value)}
                        />
                      </td>
                      <td>
                        <input 
                          type="date"
                          className="input-date"
                          disabled={isCompletedTrip}
                          value={row.mfgDate}
                          onChange={(e) => handleRowChange(idx, 'mfgDate', e.target.value)}
                        />
                      </td>
                      <td>
                        <input 
                          type="date"
                          className="input-date"
                          disabled={isCompletedTrip}
                          value={row.expDate}
                          onChange={(e) => handleRowChange(idx, 'expDate', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="input-lot"
                          style={{ width: '78px' }}
                          disabled={isCompletedTrip}
                          value={row.locationCode || 'KHO-A1'}
                          onChange={(e) => handleRowChange(idx, 'locationCode', e.target.value)}
                        />
                      </td>
                      {!isCompletedTrip && (
                        <td style={{ textAlign: 'center' }}>
                          {row.isSplitRow ? (
                            <button
                              type="button"
                              title="Xóa lô tách"
                              onClick={() => handleRemoveSplitRow(idx)}
                              style={{ border: 'none', background: '#fef2f2', color: '#dc2626', borderRadius: 6, padding: '4px 6px', cursor: 'pointer' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              title="Tách thêm số lô khác"
                              onClick={() => handleSplitLotRow(idx)}
                              style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#2563eb', borderRadius: 6, padding: '4px 6px', cursor: 'pointer' }}
                            >
                              <Plus size={14} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!isCompletedTrip && (
            <div style={{ marginTop: 12 }}>
              <input
                type="text"
                placeholder="Ghi chú biên bản nhập kho (tùy chọn)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
            </div>
          )}

          <div className="receiving-summary-footer">
            <div className="summary-col">
              <span className="sum-label">Tổng số lượng nhận đợt này:</span>
              <span className="sum-val"><strong>{totalReceivingNow}</strong> đơn vị</span>
            </div>
            <div className="summary-col">
              <span className="sum-label">Tổng giá trị hàng nhập:</span>
              <span className="sum-val" style={{ color: '#2563eb' }}><strong>{formatCurrency(totalReceivingValue)} đ</strong></span>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={onClose} disabled={submitting}>
                Đóng
              </button>
              {!isCompletedTrip && (
                <button type="submit" className="btn-submit-receive" disabled={submitting || totalReceivingNow === 0}>
                  <CheckCircle2 size={16} />
                  <span>{submitting ? 'Đang cập nhật tồn kho...' : 'Xác Nhận Nhập Kho'}</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReceiveTripModal;
