import React, { useState } from 'react';
import { X, CheckCircle, Ban, TrendingUp, Users, ShoppingCart, AlertCircle, Award, ShieldCheck, ArrowRight } from 'lucide-react';

export default function SampleApprovalModal({ isOpen, onClose, product, onApproved, onRejected }) {
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !product) return null;

  const stats = product.samplingStats || {};
  const isQualified = stats.overallPopularityRate >= 70 || stats.totalPreorderQty > 0;

  const handleApprove = async () => {
    try {
      setSubmitting(true);
      setErrorMsg('');
      await onApproved(product.id);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi khi duyệt mở bán');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setErrorMsg('Vui lòng nhập lý do dừng thử nghiệm / cải tiến R&D');
      return;
    }
    try {
      setSubmitting(true);
      setErrorMsg('');
      await onRejected(product.id, rejectionReason.trim());
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi khi từ chối sản phẩm');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <h3>
              {rejectMode ? (
                <>
                  <Ban size={20} color="#dc2626" />
                  Dừng Thử Nghiệm / Yêu Cầu Cải Tiến R&D
                </>
              ) : (
                <>
                  <ShieldCheck size={20} color="#059669" />
                  Giai Đoạn 3: Hội Đồng Quyết Định Mở Bán Chính Thức
                </>
              )}
            </h3>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Sản phẩm: <strong>{product.name}</strong> ({product.sku})
            </span>
          </div>
          <button className="btn-close-modal" onClick={onClose} type="button" aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {errorMsg && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: '8px', color: '#dc2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {!rejectMode ? (
            <>
              {/* Scorecard Thẩm Định Đạt Chuẩn (UI/UX Pro Max) */}
              <div
                style={{
                  background: isQualified
                    ? 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)'
                    : 'linear-gradient(135deg, #fffbeb 0%, #fefce8 100%)',
                  border: `1.5px solid ${isQualified ? '#a7f3d0' : '#fde68a'}`,
                  borderRadius: '14px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: isQualified ? '#059669' : '#d97706',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                      }}
                    >
                      <Award size={20} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>
                        {isQualified ? 'Đạt Chuẩn Mở Bán Thương Mại (Commercial)' : 'Chưa Đạt Tiêu Chuẩn Phê Duyệt'}
                      </h4>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        Dựa trên kết quả khảo sát người tiêu dùng và nhu cầu thực tế
                      </span>
                    </div>
                  </div>

                  <span
                    style={{
                      background: isQualified ? '#059669' : '#d97706',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: '20px',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {isQualified ? 'ĐỦ ĐIỀU KIỆN' : 'CẦN CÂN NHẮC'}
                  </span>
                </div>

                {/* 2 Thẻ Chỉ Số Trực Quan */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ background: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Tỷ lệ khách ưa chuộng</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: stats.overallPopularityRate >= 70 ? '#059669' : '#d97706', marginTop: '2px' }}>
                      {stats.overallPopularityRate}%
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
                      ({stats.totalLikedCount} khách khen / {stats.totalTestedCount} khách thử)
                    </div>
                  </div>

                  <div style={{ background: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Tổng nhu cầu đặt sỉ (Pre-order)</div>
                    <div style={{ fontSize: '26px', fontWeight: 800, color: '#4f46e5', marginTop: '2px' }}>
                      {stats.totalPreorderQty} {product.unit || 'Thùng'}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
                      ({stats.preorderStoresCount} Cửa hàng cam kết nhập hàng)
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '12.5px', color: '#475569', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '10px' }}>
                  <span>Tỷ lệ Cửa hàng sẵn sàng nhập: <strong>{stats.conversionRate}%</strong></span>
                  <span>Độ phủ mẫu thử: <strong>{stats.allocatedStoresCount} Cửa hàng</strong></span>
                </div>
              </div>

              {/* Thông báo phân quyền */}
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12.5px', color: '#475569', lineHeight: 1.5 }}>
                🚀 <strong>Tác vụ sau khi Duyệt:</strong> Sản phẩm sẽ chuyển mã sang thương mại chính thức. Toàn bộ các Điểm bán lẻ, Tiệm tạp hoá và Đại lý (`STORE`) sẽ thấy sản phẩm này trên Web Bán Hàng và có thể đặt sỉ số lượng lớn theo thùng.
              </div>
            </>
          ) : (
            <div className="form-group-item">
              <label>Lý do dừng thử nghiệm / Yêu cầu R&D cải tiến *</label>
              <textarea
                className="form-input-control"
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Nhập chi tiết: Khách chê vị quá gắt, bao bì không bảo quản tốt, giá thành dự kiến cao..."
                required
              />
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          {!rejectMode ? (
            <>
              <button
                type="button"
                className="btn-icon-action btn-action-danger"
                onClick={() => setRejectMode(true)}
                disabled={submitting}
              >
                <Ban size={15} />
                Dừng Mẫu / Chuyển R&D
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn-icon-action" onClick={onClose} disabled={submitting}>
                  Đóng
                </button>
                <button
                  type="button"
                  className="btn-icon-action btn-action-primary"
                  onClick={handleApprove}
                  disabled={submitting}
                >
                  <CheckCircle size={15} />
                  {submitting ? 'Đang duyệt mở bán...' : 'Xác Nhận Mở Bán Cho Toàn Bộ Cửa Hàng'}
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn-icon-action"
                onClick={() => setRejectMode(false)}
                disabled={submitting}
              >
                Quay lại
              </button>

              <button
                type="button"
                className="btn-icon-action btn-action-danger"
                onClick={handleReject}
                disabled={submitting}
              >
                {submitting ? 'Đang lưu...' : 'Xác Nhận Dừng Thử Nghiệm'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
