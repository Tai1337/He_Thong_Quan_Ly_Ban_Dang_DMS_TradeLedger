import { useState, useEffect } from 'react';
import { X, CheckCircle2, Truck, Package, Calendar, AlertCircle } from 'lucide-react';
import { receiveTripGoods } from '../../../services/api';
import './ReceiveTripModal.css';

const formatCurrency = (val) => new Intl.NumberFormat('vi-VN').format(val || 0);

const ReceiveTripModal = ({ isOpen, trip, onClose, onSuccess }) => {
  const [rows, setRows] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && trip) {
      const today = new Date().toISOString().slice(0, 10);
      const defaultExp = new Date();
      defaultExp.setFullYear(defaultExp.getFullYear() + 1);
      const defaultExpStr = defaultExp.toISOString().slice(0, 10);

      const initialRows = (trip.items || []).map(it => ({
        poItemId: it.poItemId,
        productName: it.productName,
        productSku: it.productSku,
        unit: it.unit,
        unitPrice: it.unitPrice,
        quantityOrdered: it.quantityOrdered,
        quantityReceivedOld: it.quantityReceived,
        quantityRemaining: it.quantityRemaining,
        quantityReceivedNow: it.quantityRemaining > 0 ? it.quantityRemaining : 0,
        lotNumber: `LOT-${today.replace(/-/g, '')}`,
        mfgDate: today,
        expDate: defaultExpStr
      }));
      setRows(initialRows);
      setError('');
    }
  }, [isOpen, trip]);

  if (!isOpen || !trip) return null;

  // Cập nhật giá trị ô input
  const handleRowChange = (index, field, value) => {
    setRows(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Nút điền đủ toàn bộ
  const handleFillAllRemaining = () => {
    setRows(prev => prev.map(r => ({
      ...r,
      quantityReceivedNow: r.quantityRemaining
    })));
  };

  // Xác nhận nhập kho
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const activeRows = rows.filter(r => Number(r.quantityReceivedNow) > 0);
    if (activeRows.length === 0) {
      setError('Vui lòng nhập số lượng thực nhận (> 0) cho ít nhất 1 sản phẩm');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        distributorId: 1,
        receivedItems: activeRows.map(r => ({
          poItemId: r.poItemId,
          quantityReceivedNow: Number(r.quantityReceivedNow),
          lotNumber: r.lotNumber || `LOT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
          mfgDate: r.mfgDate,
          expDate: r.expDate
        }))
      };

      const res = await receiveTripGoods(trip.id, payload);
      alert(res.message || 'Nhập kho thành công!');
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

          <div className="receiving-quick-actions">
            <span className="items-count-text">
              Tổng số mặt hàng trong chuyến xe: <strong>{rows.length}</strong>
            </span>
            <button 
              type="button" 
              className="btn-fill-all"
              onClick={handleFillAllRemaining}
            >
              <CheckCircle2 size={15} />
              <span>Điền đủ theo đơn (Nhập đủ 100%)</span>
            </button>
          </div>

          <div className="table-wrapper">
            <table className="receive-items-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                  <th>Mặt hàng / SKU</th>
                  <th style={{ width: '85px', textAlign: 'right' }}>Đặt hàng</th>
                  <th style={{ width: '85px', textAlign: 'right' }}>Đã nhận</th>
                  <th style={{ width: '85px', textAlign: 'right' }}>Còn thiếu</th>
                  <th style={{ width: '110px', textAlign: 'center' }}>Thực nhận đợt này</th>
                  <th style={{ width: '130px' }}>Số Lô (Lot)</th>
                  <th style={{ width: '130px' }}>Ngày SX (MFG)</th>
                  <th style={{ width: '130px' }}>Hạn dùng (EXP)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const isFinished = row.quantityRemaining === 0;
                  return (
                    <tr key={row.poItemId} style={{ opacity: isFinished ? 0.6 : 1 }}>
                      <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{row.productSku}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{row.productName}</div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {row.quantityOrdered} <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{row.unit}</span>
                      </td>
                      <td style={{ textAlign: 'right', color: '#16a34a' }}>
                        {row.quantityReceivedOld}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: row.quantityRemaining > 0 ? '#ea580c' : '#16a34a' }}>
                        {row.quantityRemaining}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="number"
                          className="input-qty-receive"
                          min={0}
                          value={row.quantityReceivedNow}
                          onChange={(e) => handleRowChange(idx, 'quantityReceivedNow', e.target.value)}
                        />
                      </td>
                      <td>
                        <input 
                          type="text"
                          className="input-lot"
                          placeholder="Số lô..."
                          value={row.lotNumber}
                          onChange={(e) => handleRowChange(idx, 'lotNumber', e.target.value)}
                        />
                      </td>
                      <td>
                        <input 
                          type="date"
                          className="input-date"
                          value={row.mfgDate}
                          onChange={(e) => handleRowChange(idx, 'mfgDate', e.target.value)}
                        />
                      </td>
                      <td>
                        <input 
                          type="date"
                          className="input-date"
                          value={row.expDate}
                          onChange={(e) => handleRowChange(idx, 'expDate', e.target.value)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

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
                Hủy bỏ
              </button>
              <button type="submit" className="btn-submit-receive" disabled={submitting || totalReceivingNow === 0}>
                <CheckCircle2 size={16} />
                <span>{submitting ? 'Đang cập nhật tồn kho...' : 'Xác Nhận Nhập Kho'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReceiveTripModal;
