import React, { useState } from 'react';
import { X, ClipboardCheck, ThumbsUp, ShoppingBag, MessageSquare, AlertCircle, Percent, Smile, Frown, Meh } from 'lucide-react';

export default function SampleFeedbackModal({ isOpen, onClose, product, onFeedbackUpdated }) {
  const [selectedAllocId, setSelectedAllocId] = useState('');
  const [testedCount, setTestedCount] = useState(20);
  const [likedCount, setLikedCount] = useState(17);
  const [storePreorderQty, setStorePreorderQty] = useState(15);
  const [feedbackNotes, setFeedbackNotes] = useState('Khách dùng thử khen hương vị đậm đà, bao bì bắt mắt. Chủ tiệm sẵn sàng nhập sỉ ngay.');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !product) return null;

  const allocations = product.allocations || [];

  const handleSelectAlloc = (e) => {
    const allocId = e.target.value;
    setSelectedAllocId(allocId);
    const found = allocations.find((a) => a.id === allocId);
    if (found) {
      setTestedCount(found.testedCount || found.allocatedQty || 10);
      setLikedCount(found.likedCount || 0);
      setStorePreorderQty(found.storePreorderQty || 0);
      setFeedbackNotes(found.feedbackNotes || '');
    }
  };

  const popularityRate = testedCount > 0 ? Math.round((likedCount / testedCount) * 100) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedAllocId) {
      setErrorMsg('Vui lòng chọn Cửa hàng cần nhập kết quả thử nghiệm');
      return;
    }
    if (likedCount > testedCount) {
      setErrorMsg('Số khách khen không được lớn hơn tổng số khách đã dùng thử');
      return;
    }

    try {
      setSubmitting(true);
      await onFeedbackUpdated(selectedAllocId, {
        testedCount: Number(testedCount) || 0,
        likedCount: Number(likedCount) || 0,
        storePreorderQty: Number(storePreorderQty) || 0,
        feedbackNotes: feedbackNotes.trim(),
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi khi cập nhật phản hồi');
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
              <ClipboardCheck size={20} color="#059669" />
              Giai Đoạn 2: Ghi Nhận Đánh Giá & Nhu Cầu Đặt Thử
            </h3>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Sản phẩm: <strong>{product.name}</strong> ({product.sku})
            </span>
          </div>
          <button className="btn-close-modal" onClick={onClose} type="button" aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errorMsg && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: '8px', color: '#dc2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="form-group-item">
              <label>Chọn Cửa Hàng / Điểm Bán Khảo Sát *</label>
              <select
                className="form-input-control"
                value={selectedAllocId}
                onChange={handleSelectAlloc}
                required
              >
                <option value="">-- Chọn Cửa hàng nhận hàng mẫu --</option>
                {allocations.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.retailerName} ({a.retailerCode}) - Đã phân bổ {a.allocatedQty} suất [{a.status}]
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row-grid">
              <div className="form-group-item">
                <label>Tổng số khách dùng thử tại chỗ</label>
                <input
                  type="number"
                  min="1"
                  className="form-input-control"
                  value={testedCount}
                  onChange={(e) => setTestedCount(Math.max(1, Number(e.target.value)))}
                  required
                />
              </div>

              <div className="form-group-item">
                <label>Số khách khen / Ưa chuộng</label>
                <input
                  type="number"
                  min="0"
                  max={testedCount}
                  className="form-input-control"
                  value={likedCount}
                  onChange={(e) => setLikedCount(Math.min(testedCount, Math.max(0, Number(e.target.value))))}
                  required
                />
              </div>
            </div>

            {/* Interactive Satisfaction Meter Card (UI/UX Pro Max) */}
            <div
              style={{
                background: popularityRate >= 70 ? '#ecfdf5' : popularityRate >= 50 ? '#fffbeb' : '#fef2f2',
                border: `1.5px solid ${popularityRate >= 70 ? '#a7f3d0' : popularityRate >= 50 ? '#fde68a' : '#fecaca'}`,
                padding: '16px 20px',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                transition: 'all 0.3s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 700, color: popularityRate >= 70 ? '#065f46' : popularityRate >= 50 ? '#92400e' : '#991b1b' }}>
                  {popularityRate >= 70 ? (
                    <Smile size={20} color="#059669" />
                  ) : popularityRate >= 50 ? (
                    <Meh size={20} color="#d97706" />
                  ) : (
                    <Frown size={20} color="#dc2626" />
                  )}
                  <span>Mức Độ Hài Lòng Thực Tế Tại Quầy:</span>
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: popularityRate >= 70 ? '#059669' : popularityRate >= 50 ? '#d97706' : '#dc2626' }}>
                  {popularityRate}%
                </div>
              </div>

              <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${popularityRate}%`,
                    background: popularityRate >= 70 ? '#059669' : popularityRate >= 50 ? '#d97706' : '#dc2626',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease, background 0.3s ease',
                  }}
                />
              </div>

              <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                <span>Tiêu chuẩn tối thiểu duyệt sỉ: <strong>70%</strong></span>
                <span>{popularityRate >= 70 ? '🎯 Đủ điều kiện duyệt mở bán sỉ' : '⚠️ Cần cải thiện hoặc thêm mẫu thử'}</span>
              </div>
            </div>

            <div className="form-group-item">
              <label>
                <ShoppingBag size={14} style={{ display: 'inline', marginRight: '5px' }} />
                Nhu cầu Cửa hàng cam kết đặt sỉ (Pre-Order khi mở bán chính thức)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="number"
                  min="0"
                  className="form-input-control"
                  style={{ width: '150px', fontWeight: 700, fontSize: '15px' }}
                  value={storePreorderQty}
                  onChange={(e) => setStorePreorderQty(Math.max(0, Number(e.target.value)))}
                />
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>{product.unit || 'THÙNG'}</span>
              </div>
              <small style={{ color: '#64748b', fontSize: '11.5px' }}>
                * Số lượng thực tế cửa hàng muốn nhập sỉ ngay khi Admin bấm duyệt mở bán.
              </small>
            </div>

            <div className="form-group-item">
              <label>
                <MessageSquare size={14} style={{ display: 'inline', marginRight: '5px' }} />
                Nhận xét chi tiết từ khách hàng & chủ tiệm
              </label>
              <textarea
                className="form-input-control"
                rows={3}
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                placeholder="Khách khen vị đậm đà, bao bì đẹp, giá phù hợp..."
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-icon-action" onClick={onClose} disabled={submitting}>
              Huỷ
            </button>
            <button
              type="submit"
              className="btn-icon-action btn-action-primary"
              disabled={submitting || !selectedAllocId}
            >
              {submitting ? 'Đang lưu kết quả...' : 'Lưu Đánh Giá Điểm Bán'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
