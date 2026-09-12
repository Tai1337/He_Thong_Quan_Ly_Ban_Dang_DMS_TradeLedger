import { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  RotateCcw, 
  Package, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Lock, 
  Printer, 
  ShieldCheck, 
  Store, 
  Truck
} from 'lucide-react';
import { getTripReturnSummary, closeDeliveryTrip } from '../../services/api';
import './TripClosingModal.css';

export default function TripClosingModal({ isOpen, onClose, tripId, onTripClosed }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('cargo'); // 'cargo', 'cod'
  
  // Helper format ngày giờ an toàn tuyệt đối
  const formatSafeDateTime = (val) => {
    if (!val) return 'Vừa xong';
    try {
      const d = new Date(val);
      return isNaN(d.getTime()) ? 'Vừa xong' : d.toLocaleString('vi-VN');
    } catch {
      return 'Vừa xong';
    }
  };

  // State form bàn giao & đóng chuyến
  const [codHandedOver, setCodHandedOver] = useState('');
  const [warehouseConfirmed, setWarehouseConfirmed] = useState(false);
  const [cashierConfirmed, setCashierConfirmed] = useState(false);
  const [closeNotes, setCloseNotes] = useState('');

  const loadSummary = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    setError('');
    try {
      const res = await getTripReturnSummary(tripId, 1);
      setData(res);
      const expectedCod = res?.codSummary?.totalCodExpected || 0;
      setCodHandedOver(res?.trip?.codHandedOver > 0 ? res.trip.codHandedOver : expectedCod);
      setCloseNotes(res?.trip?.closeNotes || 'Thủ kho đã nhận lại hàng rớt; thủ quỹ đã thu tiền COD.');
      if (res?.trip?.status === 'CLOSED') {
        setWarehouseConfirmed(true);
        setCashierConfirmed(true);
      }
    } catch (err) {
      setError(err.message || 'Lỗi khi tải bảng kê hàng rớt & quyết toán COD');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    if (isOpen && tripId) {
      loadSummary();
    }
  }, [isOpen, tripId, loadSummary]);

  if (!isOpen || !tripId) return null;

  const isClosed = data?.trip?.status === 'CLOSED';
  const expectedCod = Number(data?.codSummary?.totalCodExpected || 0);
  const actualCodNum = Number(codHandedOver || 0);
  const codDiff = actualCodNum - expectedCod;

  const handleCloseTripSubmit = async (e) => {
    e.preventDefault();
    if (isClosed) return;

    if (!warehouseConfirmed && data?.returnedItems?.length > 0) {
      setError('Vui lòng xác nhận thủ kho đã kiểm đếm và nhận lại hàng rớt vào kho!');
      return;
    }
    if (!cashierConfirmed && expectedCod > 0) {
      setError('Vui lòng xác nhận thủ quỹ đã đối chiếu và thu tiền COD từ tài xế!');
      return;
    }

    if (!window.confirm(`Xác nhận đóng chuyến xe [${data?.trip?.tripCode}]? Sau khi đóng, toàn bộ dữ liệu chuyến xe sẽ bị khóa vĩnh viễn (CLOSED).`)) {
      return;
    }

    setActionLoading(true);
    setError('');
    try {
      await closeDeliveryTrip(tripId, {
        distributorId: 1,
        codHandedOver: actualCodNum,
        closeNotes: closeNotes.trim(),
        closedById: 1
      });

      if (onTripClosed) {
        try {
          await onTripClosed();
        } catch (callErr) {
          console.error('onTripClosed error:', callErr);
        }
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi khi làm thủ tục đóng chuyến xe');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="closing-modal-backdrop" onClick={onClose}>
      <div className="closing-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="closing-modal-header">
          <div className="closing-header-title-group">
            <div className={`closing-icon-badge ${isClosed ? 'closed' : ''}`}>
              {isClosed ? <Lock size={22} /> : <ShieldCheck size={22} />}
            </div>
            <div>
              <h3>
                {isClosed ? 'Biên Bản Nghiệm Thu & Đóng Chuyến Xe' : 'Hạ Tải Hàng Rớt & Quyết Toán COD Đóng Chuyến'}
              </h3>
              <div className="closing-header-meta">
                <span>Chuyến xe: <strong>{data?.trip?.tripCode}</strong> ({data?.trip?.licensePlate || 'Xe NPP'})</span>
                <span>Tài xế: <strong>{data?.trip?.driverName}</strong></span>
                <span>Trạng thái: <strong style={{ color: isClosed ? '#475569' : '#059669' }}>{data?.trip?.status}</strong></span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button 
              type="button" 
              className="btn-print-closing"
              onClick={() => window.print()}
              title="In biên bản nghiệm thu"
            >
              <Printer size={16} />
              <span>In Biên Bản</span>
            </button>

            <button type="button" className="btn-close-closing-modal" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* KPI Banner */}
        <div className="closing-kpi-banner">
          <div className="closing-kpi-item cod">
            <div className="kpi-icon-circ">
              <DollarSign size={18} />
            </div>
            <div>
              <span className="kpi-label">Tiền COD Cần Thu Thực Tế</span>
              <strong className="kpi-val">{expectedCod.toLocaleString('vi-VN')} đ</strong>
            </div>
          </div>

          <div className="closing-kpi-item return-pkg">
            <div className="kpi-icon-circ amber">
              <Package size={18} />
            </div>
            <div>
              <span className="kpi-label">Hàng Rớt Mang Về Kho</span>
              <strong className="kpi-val">{data?.totalReturnedPackages || 0} thùng</strong>
            </div>
          </div>

          <div className="closing-kpi-item return-val">
            <div className="kpi-icon-circ rose">
              <RotateCcw size={18} />
            </div>
            <div>
              <span className="kpi-label">Giá Trị Hàng Rớt Hoàn Kho</span>
              <strong className="kpi-val">{(data?.totalReturnedValue || 0).toLocaleString('vi-VN')} đ</strong>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="closing-tabs-bar">
          <button 
            type="button" 
            className={`closing-tab-btn ${activeTab === 'cargo' ? 'active' : ''}`}
            onClick={() => setActiveTab('cargo')}
          >
            <Package size={16} />
            <span>Kiểm Đếm Hàng Rớt Nhập Kho</span>
            <span className="closing-tab-badge">{data?.returnedItems?.length || 0}</span>
          </button>

          <button 
            type="button" 
            className={`closing-tab-btn ${activeTab === 'cod' ? 'active' : ''}`}
            onClick={() => setActiveTab('cod')}
          >
            <DollarSign size={16} />
            <span>Quyết Toán Tiền Mặt COD</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="closing-modal-content">
          {error && <div className="closing-error-alert">{error}</div>}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              Đang tổng hợp dữ liệu hàng rớt và tiền COD...
            </div>
          ) : (
            <>
              {/* TAB 1: BÀN GIAO HÀNG RỚT VỀ KHO */}
              {activeTab === 'cargo' && (
                <div className="closing-tab-pane">
                  {(!data?.returnedItems || data.returnedItems.length === 0) ? (
                    <div className="no-return-alert">
                      <CheckCircle2 size={24} color="#10b981" />
                      <div>
                        <strong>Toàn bộ các đơn hàng đã được giao thành công 100%!</strong>
                        <p style={{ margin: '3px 0 0 0', color: '#64748b' }}>Không có hàng rớt mang quay về kho.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Bảng tổng hợp gom theo sản phẩm */}
                      <div className="closing-section-card">
                        <h4>1. Bảng Kê Tổng Hợp Hàng Rớt Cần Nhập Lại Kho</h4>
                        <table className="closing-table">
                          <thead>
                            <tr>
                              <th>STT</th>
                              <th>Mã SKU</th>
                              <th>Tên Sản Phẩm</th>
                              <th>ĐVT</th>
                              <th style={{ textAlign: 'center' }}>Số Lượng Rớt</th>
                              <th style={{ textAlign: 'right' }}>Giá Trị Tương Ứng</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(data?.returnedItemsSummaryBySku || []).map((it, idx) => (
                              <tr key={it.productId || idx}>
                                <td>{idx + 1}</td>
                                <td><code>{it.productSku}</code></td>
                                <td><strong>{it.productName}</strong></td>
                                <td>{it.unit}</td>
                                <td style={{ textAlign: 'center', color: '#dc2626', fontWeight: 700 }}>
                                  {it.totalReturnedQty}
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                  {(Number(it.totalReturnedValue) || 0).toLocaleString('vi-VN')} đ
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                              <td colSpan="4" style={{ textAlign: 'right' }}>TỔNG CỘNG HÀNG RỚT:</td>
                              <td style={{ textAlign: 'center', color: '#dc2626' }}>{data?.totalReturnedPackages || 0} Thùng</td>
                              <td style={{ textAlign: 'right' }}>{(Number(data?.totalReturnedValue) || 0).toLocaleString('vi-VN')} đ</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* Chi tiết đơn hàng bị rớt */}
                      <div className="closing-section-card" style={{ marginTop: 16 }}>
                        <h4>2. Chi Tiết Các Đơn Hàng Bị Rớt</h4>
                        <div className="returned-orders-list">
                          {(data?.returnedItems || []).map(item => (
                            <div key={item.itemId} className="returned-item-card">
                              <div className="item-card-left">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <strong>{item.orderCode}</strong>
                                  <span style={{ fontSize: '12px', color: '#64748b' }}>• {item.retailerName}</span>
                                </div>
                                <div style={{ fontSize: '13px', color: '#0f172a', marginTop: 4 }}>
                                  {item.productName} (<code>{item.productSku}</code>)
                                </div>
                                <div style={{ fontSize: '12px', color: '#dc2626', marginTop: 2 }}>
                                  Lý do: <em>{item.reason}</em>
                                </div>
                              </div>

                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '13.5px', color: '#dc2626', fontWeight: 700 }}>
                                  Rớt {item.failedQty} / {item.orderedQty} {item.unit}
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>
                                  {item.droppedValue.toLocaleString('vi-VN')} đ
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Checkbox Thủ Kho Xác Nhận */}
                  <div className="confirmation-box warehouse">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={warehouseConfirmed}
                        disabled={isClosed}
                        onChange={(e) => setWarehouseConfirmed(e.target.checked)}
                      />
                      <span>
                        <strong>Thủ kho xác nhận:</strong> Đã kiểm đếm thực tế toàn bộ {data?.totalReturnedPackages || 0} thùng hàng rớt mang về bãi và hoàn tất nhập kho an toàn.
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 2: QUYẾT TOÁN TIỀN MẶT COD */}
              {activeTab === 'cod' && (
                <div className="closing-tab-pane">
                  <div className="closing-section-card">
                    <h4>Chi Tiết Doanh Thu & Tiền Mặt Cần Thu Từ Đơn Hàng</h4>
                    <div className="cod-breakdown-grid">
                      <div className="cod-stat-box">
                        <span className="stat-label">Tổng Giá Trị Đặt Ban Đầu:</span>
                        <span className="stat-val">{data?.codSummary?.totalOrderValueOriginal?.toLocaleString('vi-VN')} đ</span>
                      </div>
                      <div className="cod-stat-box minus">
                        <span className="stat-label">Giảm Trừ Do Hàng Rớt:</span>
                        <span className="stat-val">- {data?.codSummary?.totalDroppedValue?.toLocaleString('vi-VN')} đ</span>
                      </div>
                      <div className="cod-stat-box highlight">
                        <span className="stat-label">Tổng Tiền COD Phải Nộp:</span>
                        <span className="stat-val">{expectedCod.toLocaleString('vi-VN')} đ</span>
                      </div>
                    </div>
                  </div>

                  <div className="closing-section-card" style={{ marginTop: 16 }}>
                    <h4>Bàn Giao Tiền Cho Thủ Quỹ</h4>
                    <div className="cod-input-row">
                      <label style={{ fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>
                        Số tiền tài xế thực nộp (VNĐ):
                      </label>
                      <input 
                        type="number"
                        min="0"
                        step="1000"
                        className="input-cod-amount"
                        disabled={isClosed}
                        value={codHandedOver}
                        onChange={(e) => setCodHandedOver(e.target.value)}
                        placeholder="Nhập số tiền thực nhận"
                      />
                    </div>

                    {codDiff !== 0 && (
                      <div className={`cod-diff-alert ${codDiff < 0 ? 'deficit' : 'surplus'}`}>
                        <AlertTriangle size={15} />
                        <span>
                          {codDiff < 0 
                            ? `Cảnh báo: Tiền thực nộp đang THIẾU ${(Math.abs(codDiff)).toLocaleString('vi-VN')} đ so với số tiền cần thu!`
                            : `Thông báo: Tiền thực nộp đang THỪA ${codDiff.toLocaleString('vi-VN')} đ so với hóa đơn!`
                          }
                        </span>
                      </div>
                    )}

                    {codDiff === 0 && (
                      <div className="cod-diff-alert matched">
                        <CheckCircle2 size={15} />
                        <span>Số tiền tài xế nộp KHỚP 100% với doanh số đơn hàng thực giao.</span>
                      </div>
                    )}
                  </div>

                  {/* Checkbox Thủ Quỹ Xác Nhận */}
                  <div className="confirmation-box cashier">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={cashierConfirmed}
                        disabled={isClosed}
                        onChange={(e) => setCashierConfirmed(e.target.checked)}
                      />
                      <span>
                        <strong>Thủ quỹ xác nhận:</strong> Đã kiểm đếm và nhận đủ {actualCodNum.toLocaleString('vi-VN')} đ tiền mặt COD từ tài xế nộp vào quỹ Nhà phân phối.
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Ghi chú chung & Ký biên bản */}
              <div className="closing-notes-wrap">
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  <FileText size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  Nội dung biên bản nghiệm thu đóng chuyến xe:
                </label>
                <textarea 
                  rows="2"
                  className="closing-notes-input"
                  disabled={isClosed}
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="Ghi chú thêm về biên bản hạ tải, tình trạng hàng rớt, tiền COD..."
                />
              </div>

              {isClosed && (
                <div className="trip-closed-badge-banner">
                  <Lock size={18} />
                  <span>
                    Chuyến xe này đã được <strong>ĐÓNG (CLOSED)</strong> lúc {formatSafeDateTime(data?.trip?.closedTime)}. Mọi dữ liệu đã được khóa an toàn.
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="closing-modal-footer">
          <button type="button" className="btn-closing-cancel" onClick={onClose}>
            Đóng
          </button>

          {!isClosed && (
            <button 
              type="button" 
              className="btn-closing-submit"
              disabled={actionLoading || loading}
              onClick={handleCloseTripSubmit}
            >
              <Lock size={15} />
              <span>{actionLoading ? 'Đang đóng...' : 'Xác Nhận Nhập Kho & Đóng Chuyến (CLOSED)'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
