import React, { useState } from 'react';
import { X, Sparkles, AlertCircle, Package, Eye, Tag, DollarSign, Layers } from 'lucide-react';

export default function ProductCreateModal({ isOpen, onClose, onCreated, categories = [] }) {
  const [productType, setProductType] = useState('SAMPLE');
  const [sku, setSku] = useState('CS-TEST-01');
  const [name, setName] = useState('Nước tương Tam Thái Tử Cao Cấp');
  const [categoryId, setCategoryId] = useState('');
  const [unit, setUnit] = useState('THÙNG');
  const [retailUnit, setRetailUnit] = useState('CHAI');
  const [conversionRate, setConversionRate] = useState(24);
  const [basePrice, setBasePrice] = useState(320000);
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleTypeChange = (type) => {
    setProductType(type);
    if (type === 'SAMPLE') {
      if (!sku.startsWith('S-')) {
        setSku(`S-${sku.replace(/^S-/, '')}`);
      }
    } else {
      setSku(sku.replace(/^S-/, ''));
    }
  };

  const selectedCategoryObj = categories.find((c) => c.id === categoryId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!sku.trim()) {
      setErrorMsg('Vui lòng nhập mã SKU sản phẩm');
      return;
    }
    if (!name.trim()) {
      setErrorMsg('Vui lòng nhập tên sản phẩm');
      return;
    }

    try {
      setSubmitting(true);
      await onCreated({
        sku: sku.trim(),
        name: name.trim(),
        categoryId: categoryId || null,
        unit: unit.trim().toUpperCase(),
        retailUnit: retailUnit ? retailUnit.trim().toUpperCase() : null,
        conversionRate: Number(conversionRate) || 1,
        basePrice: Number(basePrice) || 0,
        productType,
        imageUrl: imageUrl.trim() || null,
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi khi tạo sản phẩm');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card modal-card-large">
        <div className="modal-header">
          <h3>
            <Package size={20} color="#4f46e5" />
            Thêm Sản Phẩm Mới Vào Hệ Thống DMS
          </h3>
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

            {/* Switch Chiến Lược: Hàng Mẫu [S] vs Chính Thức */}
            <div className="type-switch-box">
              <div className="type-switch-left">
                <h4>Phân loại chiến lược sản phẩm</h4>
                <p>
                  {productType === 'SAMPLE'
                    ? '⚡ Sản phẩm kiểm thử [S]: Phân bổ suất mẫu về các Cửa hàng để người tiêu dùng thử nghiệm thực tế.'
                    : '✅ Sản phẩm chính thức: Mở bán sỉ quy mô lớn cho toàn bộ Cửa hàng và Đại lý trên hệ thống.'}
                </p>
              </div>
              <div className="type-radio-pills">
                <button
                  type="button"
                  className={`type-radio-btn ${productType === 'SAMPLE' ? 'selected-sample' : ''}`}
                  onClick={() => handleTypeChange('SAMPLE')}
                >
                  Mẫu Thử [S]
                </button>
                <button
                  type="button"
                  className={`type-radio-btn ${productType === 'COMMERCIAL' ? 'selected-commercial' : ''}`}
                  onClick={() => handleTypeChange('COMMERCIAL')}
                >
                  Chính Thức
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px' }}>
              {/* Cột Trái: Các trường Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-row-grid">
                  <div className="form-group-item">
                    <label>Mã SKU Sản phẩm *</label>
                    <input
                      type="text"
                      className="form-input-control"
                      value={sku}
                      onChange={(e) => setSku(e.target.value.toUpperCase())}
                      placeholder="VD: S-CHINSU-WASABI"
                      required
                    />
                    {productType === 'SAMPLE' && (
                      <small style={{ color: '#7c3aed', fontSize: '11px', fontWeight: 600 }}>
                        * Tự động gán tiền tố S- cho hàng mẫu
                      </small>
                    )}
                  </div>

                  <div className="form-group-item">
                    <label>Ngành hàng / Danh mục</label>
                    <select
                      className="form-input-control"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                    >
                      <option value="">-- Chọn danh mục --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group-item">
                  <label>Tên Sản Phẩm *</label>
                  <input
                    type="text"
                    className="form-input-control"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nhập tên sản phẩm..."
                    required
                  />
                </div>

                <div className="form-row-grid">
                  <div className="form-group-item">
                    <label>Đơn vị sỉ (Thùng)</label>
                    <input
                      type="text"
                      className="form-input-control"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="THÙNG"
                    />
                  </div>

                  <div className="form-group-item">
                    <label>Đơn vị lẻ (Dùng thử)</label>
                    <input
                      type="text"
                      className="form-input-control"
                      value={retailUnit}
                      onChange={(e) => setRetailUnit(e.target.value)}
                      placeholder="CHAI / GÓI"
                    />
                  </div>
                </div>

                <div className="form-row-grid">
                  <div className="form-group-item">
                    <label>Hệ số quy đổi (Đơn vị lẻ / Thùng)</label>
                    <input
                      type="number"
                      min="1"
                      className="form-input-control"
                      value={conversionRate}
                      onChange={(e) => setConversionRate(e.target.value)}
                    />
                  </div>

                  <div className="form-group-item">
                    <label>Giá bán sỉ dự kiến (VNĐ / Thùng)</label>
                    <input
                      type="number"
                      step="1000"
                      min="0"
                      className="form-input-control"
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group-item">
                  <label>Đường dẫn hình ảnh (URL)</label>
                  <input
                    type="url"
                    className="form-input-control"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Cột Phải: Realtime Live Card Preview (UI/UX Pro Max) */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  <Eye size={14} color="#4f46e5" />
                  Xem Trước Hiển Thị (Live Preview)
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                  <div style={{ height: '120px', background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    {imageUrl ? (
                      <img src={imageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => (e.target.style.display = 'none')} />
                    ) : (
                      <Package size={40} color="#94a3b8" />
                    )}
                    <span style={{ position: 'absolute', top: '8px', right: '8px', background: productType === 'SAMPLE' ? '#7c3aed' : '#059669', color: '#ffffff', fontSize: '10px', fontWeight: 700, padding: '3px 7px', borderRadius: '4px' }}>
                      {productType === 'SAMPLE' ? '[S] MẪU THỬ' : 'CHÍNH THỨC'}
                    </span>
                  </div>

                  <div style={{ padding: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                      {selectedCategoryObj?.name || 'Ngành hàng'} • {sku || 'SKU-001'}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: '4px 0 8px 0', minHeight: '36px' }}>
                      {name || 'Tên sản phẩm'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#dc2626' }}>
                        {Number(basePrice || 0).toLocaleString('vi-VN')} đ
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        /{unit || 'THÙNG'} (1={conversionRate} {retailUnit})
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '11.5px', color: '#64748b', lineHeight: 1.4, background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  📌 <strong>Cơ chế phân quyền:</strong> Khi là hàng mẫu [S], chỉ tài khoản tiêu dùng mới thấy mục dùng thử. Cửa hàng chỉ được phép đặt sỉ sau khi Admin duyệt chính thức.
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-icon-action" onClick={onClose} disabled={submitting}>
              Huỷ
            </button>
            <button
              type="submit"
              className={`btn-icon-action ${productType === 'SAMPLE' ? 'btn-action-purple' : 'btn-action-primary'}`}
              disabled={submitting}
            >
              {submitting ? 'Đang tạo...' : productType === 'SAMPLE' ? 'Tạo Sản Phẩm Thử [S]' : 'Tạo Sản Phẩm Mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
