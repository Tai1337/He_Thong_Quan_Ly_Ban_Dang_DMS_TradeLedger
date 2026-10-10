import React, { useState, useEffect } from 'react';
import { X, Store, Check, AlertCircle, Search } from 'lucide-react';
import { getCatalogRetailers } from '../../../services/api';

export default function SampleAllocationModal({ isOpen, onClose, product, onAllocated }) {
  const [retailers, setRetailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStores, setSelectedStores] = useState({}); // { [retailerId]: quantity }
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setErrorMsg('');
      getCatalogRetailers('1', '')
        .then((res) => {
          setRetailers(res || []);
          // Pre-populate if already allocated
          const initSelected = {};
          if (product?.allocations && product.allocations.length > 0) {
            product.allocations.forEach((a) => {
              initSelected[a.retailerId] = a.allocatedQty || 10;
            });
          }
          setSelectedStores(initSelected);
        })
        .catch((err) => setErrorMsg(err.message || 'Lỗi khi tải danh sách cửa hàng'))
        .finally(() => setLoading(false));
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const toggleSelect = (retailerId) => {
    setSelectedStores((prev) => {
      const copy = { ...prev };
      if (copy[retailerId] !== undefined) {
        delete copy[retailerId];
      } else {
        copy[retailerId] = 10; // Default 10 suất mẫu dùng thử
      }
      return copy;
    });
  };

  const updateQty = (retailerId, qty) => {
    const val = Math.max(1, Number(qty) || 1);
    setSelectedStores((prev) => ({
      ...prev,
      [retailerId]: val,
    }));
  };

  const handleSelectAll = () => {
    const all = {};
    retailers.forEach((r) => {
      all[r.id] = selectedStores[r.id] || 10;
    });
    setSelectedStores(all);
  };

  const handleDeselectAll = () => {
    setSelectedStores({});
  };

  const handleSubmit = async () => {
    const storeKeys = Object.keys(selectedStores);
    if (storeKeys.length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất 1 cửa hàng để phân bổ hàng mẫu');
      return;
    }

    const payload = storeKeys.map((id) => ({
      retailerId: id,
      allocatedQty: selectedStores[id],
    }));

    try {
      setSubmitting(true);
      await onAllocated(product.id, payload);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi khi phân bổ hàng mẫu');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = retailers.filter(
    (r) =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.code.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const totalStoresSelected = Object.keys(selectedStores).length;
  const totalSamplesAllocated = Object.values(selectedStores).reduce((a, b) => a + b, 0);

  return (
    <div className="modal-overlay">
      <div className="modal-card modal-card-large">
        <div className="modal-header">
          <div>
            <h3>
              <Store size={20} color="#7c3aed" />
              Giai Đoạn 1: Phân Bổ Suất Hàng Thử [S] Về Cửa Hàng
            </h3>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Sản phẩm: <strong>{product.name}</strong> ({product.sku})
            </span>
          </div>
          <button className="btn-close-modal" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {errorMsg && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: '8px', color: '#dc2626', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div className="mgmt-search-input-wrap">
              <Search size={16} className="search-icon-inside" />
              <input
                type="text"
                className="mgmt-search-input"
                style={{ width: '260px' }}
                placeholder="Tìm tên cửa hàng, mã đại lý..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn-icon-action" onClick={handleSelectAll}>
                Chọn tất cả
              </button>
              <button type="button" className="btn-icon-action" onClick={handleDeselectAll}>
                Bỏ chọn hết
              </button>
            </div>
          </div>

          <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Đang tải danh sách cửa hàng...</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>Không tìm thấy cửa hàng phù hợp</div>
            ) : (
              filtered.map((r) => {
                const isChecked = selectedStores[r.id] !== undefined;
                return (
                  <div
                    key={r.id}
                    className="allocation-item-row"
                    style={{ borderColor: isChecked ? '#c4b5fd' : '#e2e8f0', background: isChecked ? '#f5f3ff' : '#ffffff' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelect(r.id)}
                        style={{ width: '16px', height: '16px', accentColor: '#7c3aed', cursor: 'pointer' }}
                      />
                      <div className="alloc-store-info">
                        <h5>{r.name} ({r.code})</h5>
                        <span>{r.address || 'Chưa cập nhật địa chỉ'} • SĐT: {r.phone || 'N/A'}</span>
                      </div>
                    </div>

                    {isChecked && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#5b21b6', fontWeight: 600 }}>Suất dùng thử:</span>
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          className="alloc-qty-input"
                          value={selectedStores[r.id]}
                          onChange={(e) => updateQty(r.id, e.target.value)}
                        />
                        <span style={{ fontSize: '12px', color: '#64748b' }}>{product.retailUnit || 'suất'}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
            <span>Đã chọn: <strong style={{ color: '#7c3aed' }}>{totalStoresSelected}</strong> Cửa hàng</span>
            <span>Tổng suất hàng thử phân bổ: <strong style={{ color: '#059669' }}>{totalSamplesAllocated}</strong> {product.retailUnit || 'suất'}</span>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-icon-action" onClick={onClose} disabled={submitting}>
            Đóng
          </button>
          <button
            type="button"
            className="btn-icon-action btn-action-purple"
            onClick={handleSubmit}
            disabled={submitting || totalStoresSelected === 0}
          >
            {submitting ? 'Đang lưu phân bổ...' : `Xác Nhận Phân Bổ (${totalStoresSelected} Cửa Hàng)`}
          </button>
        </div>
      </div>
    </div>
  );
}
