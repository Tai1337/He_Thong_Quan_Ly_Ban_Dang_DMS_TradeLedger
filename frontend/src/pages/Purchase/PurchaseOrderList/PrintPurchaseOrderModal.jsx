import { useState, useEffect } from 'react';
import { Printer, X, Download, FileText, CheckCircle2, Clock, Truck, Ban, AlertCircle } from 'lucide-react';
import { getPurchaseOrderById } from '../../../services/api';
import './PrintPurchaseOrderModal.css';

const formatCurrency = (val) => new Intl.NumberFormat('vi-VN').format(val || 0);

const STATUS_LABELS = {
  DRAFT: 'Đơn nháp (Chưa gửi NCC)',
  WAITING_RECEIVE: 'Đã gửi NCC (Chờ nhận hàng)',
  PARTIALLY_RECEIVED: 'Đang nhận hàng (Nhận 1 phần)',
  COMPLETED: 'Hoàn tất nhập kho',
  CANCELLED: 'Đã huỷ đơn'
};

const PrintPurchaseOrderModal = ({ isOpen, onClose, order, orderId }) => {
  const [poData, setPoData] = useState(order || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const targetId = order?.id || orderId;
    // Nếu order đã có danh sách items đầy đủ
    if (order && order.items && order.items.length > 0) {
      setPoData(order);
    } else if (targetId) {
      setLoading(true);
      setError('');
      getPurchaseOrderById(targetId, 1)
        .then((data) => {
          setPoData(data);
        })
        .catch((err) => {
          setError(err.message || 'Không thể tải chi tiết đơn hàng để in');
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, order, orderId]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const items = poData?.items || [];
  const totalQty = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  const totalAmount = poData?.metrics?.totalAmount || items.reduce((sum, it) => sum + ((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0)), 0);

  return (
    <div className="modal-backdrop po-print-modal-backdrop">
      <div className="po-print-modal-container">
        {/* Modal Toolbar (Ẩn khi in) */}
        <div className="po-print-modal-toolbar">
          <div className="po-print-toolbar-title">
            <FileText size={20} color="#2563eb" />
            <span>Xem trước Chứng từ Đơn đặt hàng mua (PO)</span>
          </div>

          <div className="po-print-toolbar-actions">
            <button 
              type="button" 
              className="btn-print-primary"
              onClick={handlePrint}
              autoFocus
            >
              <Printer size={16} />
              <span>In chứng từ ngay (Ctrl + P)</span>
            </button>

            <button 
              type="button" 
              className="btn-print-close"
              onClick={onClose}
              title="Đóng cửa sổ xem trước"
            >
              <X size={18} />
              <span>Đóng</span>
            </button>
          </div>
        </div>

        {/* Modal Scroll Body */}
        <div className="po-print-modal-body">
          {loading ? (
            <div className="po-print-loading">
              <Clock size={24} className="spin-icon" />
              <span>Đang tải thông tin chi tiết chứng từ PO...</span>
            </div>
          ) : error ? (
            <div className="po-print-error">
              <AlertCircle size={24} color="#dc2626" />
              <span>{error}</span>
            </div>
          ) : poData ? (
            <div className="po-printable-paper" id="po-printable-sheet">
              {/* 1. Header công ty & Tên chứng từ */}
              <div className="po-print-header">
                <div className="po-print-company-info">
                  <h2 className="po-print-company-name">HỆ THỐNG PHÂN PHỐI DMS - TRADE LEDGER</h2>
                  <p><strong>Đơn vị:</strong> Nhà Phân Phối Trọng Điểm Miền Nam</p>
                  <p><strong>Kho nhận hàng:</strong> {poData.warehouse?.name || 'Kho chính NPP'} ({poData.warehouse?.code || 'KHO-01'})</p>
                  <p>Hotline: 1900-8888 | Email: purchasing@tradeledger.dms</p>
                </div>

                <div className="po-print-voucher-badge">
                  <h1 className="po-print-voucher-title">ĐƠN ĐẶT HÀNG MUA</h1>
                  <div className="po-print-voucher-subtitle">PURCHASE ORDER (MH_BM1)</div>
                  <div className="po-print-code-tag">
                    Số PO: <strong>{poData.poCode}</strong>
                  </div>
                  <div className="po-print-meta-sub">
                    Ngày lập: {new Date(poData.createdAt).toLocaleDateString('vi-VN')} {new Date(poData.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="po-print-status-tag">
                    Trạng thái: <strong>{STATUS_LABELS[poData.status] || poData.status}</strong>
                  </div>
                </div>
              </div>

              <div className="po-print-divider"></div>

              {/* 2. Metadata: Bên mua & Bên bán */}
              <div className="po-print-meta-grid">
                <div className="po-print-meta-block">
                  <h3 className="po-meta-block-title">ĐƠN VỊ ĐẶT HÀNG (BÊN MUA):</h3>
                  <p><strong>Nhà phân phối:</strong> DMS-NPP TradeLedger</p>
                  <p><strong>Kho nhập:</strong> {poData.warehouse?.name || 'Kho chính'}</p>
                  <p><strong>Người lập đơn:</strong> {poData.createdBy?.fullName || poData.createdBy?.username || 'Quản lý kho / Thu mua'}</p>
                  <p><strong>Ngày dự kiến nhận:</strong> {poData.expectedDate ? new Date(poData.expectedDate).toLocaleDateString('vi-VN') : 'Theo thỏa thuận'}</p>
                </div>

                <div className="po-print-meta-block">
                  <h3 className="po-meta-block-title">NHÀ CUNG CẤP (BÊN BÁN):</h3>
                  <p><strong>Đơn vị cung cấp:</strong> {poData.supplier?.name || 'Chưa chỉ định'}</p>
                  <p><strong>Mã nhà cung cấp:</strong> {poData.supplier?.code || '-'}</p>
                  <p><strong>Số điện thoại:</strong> {poData.supplier?.phone || '-'}</p>
                  <p><strong>Địa chỉ:</strong> {poData.supplier?.address || '-'}</p>
                </div>
              </div>

              {/* 3. Bảng danh sách sản phẩm đặt mua */}
              <table className="po-print-items-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                    <th style={{ width: '120px' }}>Mã SKU</th>
                    <th>Tên mặt hàng / Sản phẩm</th>
                    <th style={{ width: '65px', textAlign: 'center' }}>ĐVT</th>
                    <th style={{ width: '90px', textAlign: 'right' }}>Số lượng đặt</th>
                    <th style={{ width: '125px', textAlign: 'right' }}>Đơn giá mua (đ)</th>
                    <th style={{ width: '145px', textAlign: 'right' }}>Thành tiền (đ)</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => {
                    const itemQty = Number(it.quantity) || 0;
                    const itemPrice = Number(it.unitPrice) || 0;
                    const itemTotal = itemQty * itemPrice;

                    return (
                      <tr key={it.id || idx}>
                        <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                        <td><code>{it.product?.sku || it.sku || '-'}</code></td>
                        <td>
                          <strong>{it.product?.name || it.name || 'Sản phẩm'}</strong>
                        </td>
                        <td style={{ textAlign: 'center' }}>{it.product?.unit || it.unit || 'Cái'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(itemQty)}</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(itemPrice)} đ</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(itemTotal)} đ</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700 }}>
                      Tổng cộng số lượng:
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      {formatCurrency(totalQty)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      Tổng tiền hàng:
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '14px', color: '#000' }}>
                      {formatCurrency(totalAmount)} đ
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* 4. Ghi chú điều khoản */}
              {poData.notes && (
                <div className="po-print-notes-box">
                  <strong>Ghi chú & Yêu cầu giao hàng:</strong> {poData.notes}
                </div>
              )}

              {/* 5. Chữ ký các bên */}
              <div className="po-print-signatures">
                <div className="po-sig-col">
                  <p className="po-sig-title">Người lập phiếu</p>
                  <p className="po-sig-sub">(Ký, ghi rõ họ tên)</p>
                  <div className="po-sig-space"></div>
                  <p className="po-sig-name">{poData.createdBy?.fullName || 'Nhân viên thu mua'}</p>
                </div>

                <div className="po-sig-col">
                  <p className="po-sig-title">Thủ kho tiếp nhận</p>
                  <p className="po-sig-sub">(Ký, ghi rõ họ tên)</p>
                  <div className="po-sig-space"></div>
                </div>

                <div className="po-sig-col">
                  <p className="po-sig-title">Kế toán trưởng</p>
                  <p className="po-sig-sub">(Ký, ghi rõ họ tên)</p>
                  <div className="po-sig-space"></div>
                </div>

                <div className="po-sig-col">
                  <p className="po-sig-title">Đại diện Nhà cung cấp</p>
                  <p className="po-sig-sub">(Ký, ghi rõ họ tên, đóng dấu)</p>
                  <div className="po-sig-space"></div>
                </div>
              </div>

              {/* 6. Chân trang in */}
              <div className="po-print-footer">
                <p>Chứng từ xuất bản tự động từ Hệ thống DMS-TradeLedger | Ngày in: {new Date().toLocaleString('vi-VN')} | Đơn mua có giá trị đối chiếu khi nhập kho</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PrintPurchaseOrderModal;

