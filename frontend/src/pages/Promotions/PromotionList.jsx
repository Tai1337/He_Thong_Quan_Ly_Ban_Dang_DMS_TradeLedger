import { useState, useEffect, useCallback } from 'react';
import {
  Gift,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  Power,
  Info,
  Percent,
  Layers,
  ArrowRight,
  Tag,
  Package,
  Sparkles,
  Edit,
} from 'lucide-react';
import { getPromotions, updatePromotion, deletePromotion } from '../../services/api';
import CreatePromotionModal from './CreatePromotionModal';
import AutoGeneratePromotionModal from './AutoGeneratePromotionModal';
import { useNotification } from '../../components/Common/NotificationProvider';
import './PromotionList.css';

const getTodayStr = () => new Date().toISOString().slice(0, 10);

const getEffectivePromoState = (promo) => {
  const today = getTodayStr();
  const start = String(promo.startDate || '').slice(0, 10);
  const end = String(promo.endDate || '').slice(0, 10);

  if (end && end < today) return 'EXPIRED';
  if (!promo.status) return 'PAUSED';
  if (start && start > today) return 'UPCOMING';
  return 'ACTIVE';
};

export default function PromotionList() {
  const { notify, confirm } = useNotification();
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [isAutoModalOpen, setIsAutoModalOpen] = useState(false);

  const fetchPromotions = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getPromotions();
      setPromotions(res.data || res || []);
    } catch (err) {
      setError(err.message || 'Lỗi khi tải danh sách khuyến mãi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const handleToggleStatus = async (promo) => {
    try {
      const updated = await updatePromotion(promo.id, { status: !promo.status });
      setPromotions((prev) => prev.map((p) => (p.id === promo.id ? updated : p)));
      notify.success(`Đã ${promo.status ? 'tạm dừng' : 'kích hoạt'} chương trình "${promo.name}"`);
    } catch (err) {
      notify.error('Không thể đổi trạng thái khuyến mãi: ' + err.message);
    }
  };

  const handleDelete = async (promo) => {
    const ok = await confirm({
      title: 'Xóa chương trình khuyến mãi',
      message: `Bạn có chắc chắn muốn xóa chương trình "${promo.name}"?`,
      confirmText: 'Xóa',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await deletePromotion(promo.id);
      notify.success(`Đã xóa chương trình "${promo.name}"`);
      setPromotions((prev) => prev.filter((p) => p.id !== promo.id));
    } catch (err) {
      notify.error('Không thể xóa khuyến mãi: ' + err.message);
    }
  };

  const filteredPromotions = promotions.filter((p) => {
    const matchesTab = activeTab === 'ALL' || p.promotionType === activeTab;
    const effectiveState = getEffectivePromoState(p);
    const matchesStatus = statusFilter === 'ALL' || effectiveState === statusFilter;
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q));
    return matchesTab && matchesStatus && matchesSearch;
  });

  // KPI counts
  const totalCount = promotions.length;
  const activeCount = promotions.filter((p) => getEffectivePromoState(p) === 'ACTIVE').length;
  const percentageCount = promotions.filter((p) => p.promotionType === 'PERCENTAGE').length;
  const comboCount = promotions.filter((p) => p.promotionType === 'COMBO').length;
  const buyNGetMCount = promotions.filter((p) => p.promotionType === 'BUY_N_GET_M').length;
  const invoiceTierCount = promotions.filter((p) => p.promotionType === 'INVOICE_DISCOUNT').length;

  const formatVND = (val) => new Intl.NumberFormat('vi-VN').format(Number(val) || 0) + ' đ';

  return (
    <div className="promotions-container">
      {/* Header */}
      <div className="promotions-header">
        <div className="promotions-title-group">
          <h1>
            <span className="promo-title-icon">
              <Gift size={22} />
            </span>
            Quản trị Chương trình Khuyến mãi (Bán hàng & Portal)
          </h1>
          <p>
            Trung tâm cấu hình thống nhất 4 cơ chế khuyến mãi FMCG: Giảm % theo SKU, Gói Combo, Mua N Tặng M (FOC) và Chiết khấu bậc thang.
          </p>
        </div>

        <div className="promo-header-btn-group">
          <button
            type="button"
            className="promo-secondary-btn"
            onClick={() => setIsAutoModalOpen(true)}
          >
            <Sparkles size={17} />
            Tự động sinh nhanh
          </button>
          <button
            type="button"
            className="promo-primary-btn"
            onClick={() => {
              setEditingPromo(null);
              setIsModalOpen(true);
            }}
          >
            <Plus size={18} />
            Tạo khuyến mãi tùy chỉnh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="promo-kpi-grid">
        <div className="promo-kpi-card">
          <div className="promo-kpi-info">
            <h4>Tổng chương trình</h4>
            <div className="kpi-val">{totalCount}</div>
          </div>
          <div className="promo-kpi-icon icon-blue">
            <Layers size={22} />
          </div>
        </div>

        <div className="promo-kpi-card">
          <div className="promo-kpi-info">
            <h4>Đang chạy hiệu lực</h4>
            <div className="kpi-val">{activeCount}</div>
          </div>
          <div className="promo-kpi-icon icon-green">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="promo-kpi-card">
          <div className="promo-kpi-info">
            <h4>Mua N Tặng M / Combo</h4>
            <div className="kpi-val">{buyNGetMCount + comboCount}</div>
          </div>
          <div className="promo-kpi-icon icon-amber">
            <Gift size={22} />
          </div>
        </div>

        <div className="promo-kpi-card">
          <div className="promo-kpi-info">
            <h4>Giảm % SKU / Bậc thang</h4>
            <div className="kpi-val">{percentageCount + invoiceTierCount}</div>
          </div>
          <div className="promo-kpi-icon icon-purple">
            <Percent size={22} />
          </div>
        </div>
      </div>

      {/* Unified Trade Promotion Rule Info */}
      <div className="promo-info-alert">
        <Info size={20} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>Thứ tự tính toán chuẩn trên Đơn bán (SO) & Cửa hàng trực tuyến (Shop Portal):</strong>
          <br />
          1. <strong>Giảm % theo SKU & Gói Combo:</strong> Áp dụng trực tiếp trên từng mặt hàng đạt điều kiện trước.
          {' '}2. <strong>Mua N Tặng M (FOC):</strong> Bổ sung dòng quà tặng <strong>0đ</strong> (tự kiểm tra tồn kho thực tế).
          {' '}3. <strong>Chiết khấu bậc thang hóa đơn:</strong> Tính trên phần tiền còn lại sau giảm giá sản phẩm, tự động chọn <strong>1 bậc lợi nhất</strong> cho khách.
        </div>
      </div>

      {error && (
        <div className="promo-info-alert" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }}>
          <span>{error}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="promo-filter-bar">
        <div className="promo-filter-tabs">
          <button
            type="button"
            className={`promo-tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveTab('ALL')}
          >
            Tất cả ({totalCount})
          </button>
          <button
            type="button"
            className={`promo-tab-btn ${activeTab === 'PERCENTAGE' ? 'active' : ''}`}
            onClick={() => setActiveTab('PERCENTAGE')}
          >
            Giảm % SKU ({percentageCount})
          </button>
          <button
            type="button"
            className={`promo-tab-btn ${activeTab === 'COMBO' ? 'active' : ''}`}
            onClick={() => setActiveTab('COMBO')}
          >
            Combo ({comboCount})
          </button>
          <button
            type="button"
            className={`promo-tab-btn ${activeTab === 'BUY_N_GET_M' ? 'active' : ''}`}
            onClick={() => setActiveTab('BUY_N_GET_M')}
          >
            Mua N tặng M ({buyNGetMCount})
          </button>
          <button
            type="button"
            className={`promo-tab-btn ${activeTab === 'INVOICE_DISCOUNT' ? 'active' : ''}`}
            onClick={() => setActiveTab('INVOICE_DISCOUNT')}
          >
            Bậc thang đơn ({invoiceTierCount})
          </button>
        </div>

        <div className="promo-right-filters">
          <select
            className="promo-status-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Mọi trạng thái</option>
            <option value="ACTIVE">Đang chạy</option>
            <option value="UPCOMING">Sắp diễn ra</option>
            <option value="PAUSED">Tạm dừng</option>
            <option value="EXPIRED">Đã hết hạn</option>
          </select>

          <div className="promo-search-box">
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder="Tìm theo tên CTKM, mô tả..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="promo-table-card">
        {loading ? (
          <div className="empty-state">
            <Clock size={32} color="#94a3b8" />
            <h3>Đang tải dữ liệu chương trình khuyến mãi...</h3>
          </div>
        ) : filteredPromotions.length === 0 ? (
          <div className="empty-state">
            <Gift size={36} color="#94a3b8" />
            <h3>Chưa có chương trình khuyến mãi nào phù hợp</h3>
            <p>Nhấn "Tạo khuyến mãi tùy chỉnh" hoặc "Tự động sinh nhanh" để thiết lập chính sách ưu đãi.</p>
          </div>
        ) : (
          <table className="promo-table">
            <thead>
              <tr>
                <th>Tên chương trình</th>
                <th>Cơ chế</th>
                <th>Thể lệ áp dụng</th>
                <th>Thời gian hiệu lực</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredPromotions.map((p) => {
                const state = getEffectivePromoState(p);

                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.name}</div>
                      {p.description && (
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                          {p.description}
                        </div>
                      )}
                    </td>

                    <td>
                      {p.promotionType === 'PERCENTAGE' && (
                        <span className="promo-badge badge-percentage">
                          <Tag size={13} /> Giảm % SKU
                        </span>
                      )}
                      {p.promotionType === 'COMBO' && (
                        <span className="promo-badge badge-combo">
                          <Package size={13} /> Gói Combo
                        </span>
                      )}
                      {p.promotionType === 'BUY_N_GET_M' && (
                        <span className="promo-badge badge-buyngetm">
                          <Gift size={13} /> Mua N Tặng M
                        </span>
                      )}
                      {p.promotionType === 'INVOICE_DISCOUNT' && (
                        <span className="promo-badge badge-invoicetier">
                          <Percent size={13} /> Bậc thang đơn
                        </span>
                      )}
                    </td>

                    <td>
                      {p.promotionType === 'PERCENTAGE' && p.percentageDiscount && (
                        <div className="rule-summary-box">
                          Giảm <strong>{Number(p.percentageDiscount.discountPercent)}%</strong>
                          {Number(p.percentageDiscount.minQuantity) > 1 && (
                            <span> (từ {Number(p.percentageDiscount.minQuantity)} SP)</span>
                          )}
                          {p.percentageDiscount.maxQuantityPerOrder && (
                            <span> • tối đa {Number(p.percentageDiscount.maxQuantityPerOrder)} SP/đơn</span>
                          )}
                          {p.percentageDiscount.products?.length > 0 && (
                            <div style={{ marginTop: 3, fontSize: 11.5, color: '#475569' }}>
                              Áp cho:{' '}
                              {p.percentageDiscount.products
                                .map((pr) => pr.product?.name)
                                .filter(Boolean)
                                .slice(0, 2)
                                .join(', ')}
                              {p.percentageDiscount.products.length > 2 &&
                                ` (+${p.percentageDiscount.products.length - 2} SP)`}
                            </div>
                          )}
                        </div>
                      )}

                      {p.promotionType === 'COMBO' && p.combo && (
                        <div className="rule-summary-box">
                          Giá trọn gói: <strong style={{ color: '#b45309' }}>{formatVND(p.combo.comboPrice)}</strong>
                          {p.combo.items?.length > 0 && (
                            <div style={{ marginTop: 3, fontSize: 11.5, color: '#475569' }}>
                              Gồm: {p.combo.items.map((ci) => `${ci.quantity}x ${ci.product?.name || 'SP'}`).join(' + ')}
                            </div>
                          )}
                        </div>
                      )}

                      {p.promotionType === 'BUY_N_GET_M' && p.buyNGetM && (
                        <div className="rule-summary-box">
                          Mua <strong>{p.buyNGetM.buyQuantity}</strong> tặng <strong>{p.buyNGetM.freeQuantity}</strong>
                          {p.buyNGetM.items?.length > 0 && (
                            <div style={{ marginTop: 2, fontSize: 11.5 }}>
                              {p.buyNGetM.items.map((it, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span>{it.buyProduct?.name || 'SP Mua'}</span>
                                  <ArrowRight size={11} color="#64748b" />
                                  <span style={{ color: '#047857', fontWeight: 600 }}>
                                    {it.freeProduct?.name || 'SP Tặng (0đ)'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {p.promotionType === 'INVOICE_DISCOUNT' && p.invoiceDiscount && (
                        <div className="rule-summary-box">
                          Đơn từ <strong>{formatVND(p.invoiceDiscount.minOrderAmount)}</strong>
                          <span style={{ color: '#7e22ce', fontWeight: 700, marginLeft: 6 }}>
                            {p.invoiceDiscount.discountPercent
                              ? `Giảm ${Number(p.invoiceDiscount.discountPercent)}%`
                              : `Giảm ${formatVND(p.invoiceDiscount.discountAmount)}`}
                          </span>
                        </div>
                      )}
                    </td>

                    <td>
                      <div style={{ fontSize: 12.5 }}>
                        <div>Từ: {new Date(p.startDate).toLocaleDateString('vi-VN')}</div>
                        <div>Đến: {new Date(p.endDate).toLocaleDateString('vi-VN')}</div>
                      </div>
                    </td>

                    <td>
                      {state === 'ACTIVE' && <span className="promo-badge badge-status-active">Đang chạy</span>}
                      {state === 'UPCOMING' && <span className="promo-badge badge-status-upcoming">Sắp diễn ra</span>}
                      {state === 'PAUSED' && <span className="promo-badge badge-status-inactive">Tạm dừng</span>}
                      {state === 'EXPIRED' && <span className="promo-badge badge-status-expired">Đã hết hạn</span>}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div className="promo-action-group" style={{ justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="promo-action-btn"
                          title="Chỉnh sửa CTKM"
                          onClick={() => {
                            setEditingPromo(p);
                            setIsModalOpen(true);
                          }}
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          type="button"
                          className="promo-action-btn"
                          title={p.status ? 'Tạm dừng CTKM' : 'Kích hoạt lại'}
                          disabled={state === 'EXPIRED'}
                          onClick={() => handleToggleStatus(p)}
                        >
                          <Power size={15} color={p.status && state !== 'EXPIRED' ? '#16a34a' : '#94a3b8'} />
                        </button>
                        <button
                          type="button"
                          className="promo-action-btn delete-btn"
                          title="Xóa CTKM"
                          onClick={() => handleDelete(p)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      <CreatePromotionModal
        isOpen={isModalOpen}
        initialPromo={editingPromo}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPromo(null);
        }}
        onSuccess={fetchPromotions}
      />

      <AutoGeneratePromotionModal
        isOpen={isAutoModalOpen}
        onClose={() => setIsAutoModalOpen(false)}
        onSuccess={fetchPromotions}
      />
    </div>
  );
}
