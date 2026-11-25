import { useState, useEffect } from 'react';
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
  ArrowRight
} from 'lucide-react';
import { getPromotions, updatePromotion, deletePromotion } from '../../services/api';
import CreatePromotionModal from './CreatePromotionModal';
import { useNotification } from '../../components/Common/NotificationProvider';
import './PromotionList.css';

export default function PromotionList() {
  const { notify, confirm } = useNotification();
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const res = await getPromotions();
      setPromotions(res.data || res || []);
    } catch (err) {
      setError(err.message || 'Lỗi khi tải danh sách khuyến mãi');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (promo) => {
    try {
      await updatePromotion(promo.id, { status: !promo.status });
      setPromotions((prev) =>
        prev.map((p) => (p.id === promo.id ? { ...p, status: !p.status } : p))
      );
    } catch (err) {
      alert('Không thể đổi trạng thái khuyến mãi: ' + err.message);
    }
  };

  const handleDelete = async (promo) => {
    const ok = await confirm({
      title: 'Xóa chương trình khuyến mãi',
      message: `Bạn có chắc chắn muốn xóa chương trình "${promo.name}"?`,
      confirmText: 'Xóa',
      variant: 'danger'
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
    const matchesTab =
      activeTab === 'ALL' ||
      p.promotionType === activeTab;
    const matchesSearch =
      !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  // KPI counts
  const totalCount = promotions.length;
  const activeCount = promotions.filter((p) => p.status).length;
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
            Quản trị Chương trình Khuyến mãi (Trade Promotion)
          </h1>
          <p>Thiết lập và vận hành các gói khuyến mãi Mua N tặng M (FOC) và Chiết khấu bậc thang theo chuẩn FMCG.</p>
        </div>
        <button className="promo-primary-btn" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          Tạo chương trình khuyến mãi
        </button>
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
            <h4>Đang kích hoạt</h4>
            <div className="kpi-val">{activeCount}</div>
          </div>
          <div className="promo-kpi-icon icon-green">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="promo-kpi-card">
          <div className="promo-kpi-info">
            <h4>Mua N Tặng M (FOC)</h4>
            <div className="kpi-val">{buyNGetMCount}</div>
          </div>
          <div className="promo-kpi-icon icon-amber">
            <Gift size={22} />
          </div>
        </div>

        <div className="promo-kpi-card">
          <div className="promo-kpi-info">
            <h4>Chiết khấu bậc thang</h4>
            <div className="kpi-val">{invoiceTierCount}</div>
          </div>
          <div className="promo-kpi-icon icon-purple">
            <Percent size={22} />
          </div>
        </div>
      </div>

      {/* FMCG Trade Promotion Info Alert */}
      <div className="promo-info-alert">
        <Info size={20} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>Quy chuẩn tính toán Trade Promotion DMS:</strong>
          <br />
          • <strong>Hàng tặng Mua N Tặng M:</strong> Tự động bổ sung vào đơn bán với đơn giá <strong>0đ</strong>, đánh dấu cờ khuyến mãi để khấu trừ tồn kho và hạch toán thuế VAT đầu ra đúng pháp lý.
          <br />
          • <strong>Chiết khấu bậc thang:</strong> Tự động tính toán khi giỏ hàng đạt mốc giá trị tối thiểu, gợi ý upsell khách đặt thêm để đạt chiết khấu cao hơn.
        </div>
      </div>

      {/* Filter Bar */}
      <div className="promo-filter-bar">
        <div className="promo-filter-tabs">
          <button
            className={`promo-tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveTab('ALL')}
          >
            Tất cả ({totalCount})
          </button>
          <button
            className={`promo-tab-btn ${activeTab === 'BUY_N_GET_M' ? 'active' : ''}`}
            onClick={() => setActiveTab('BUY_N_GET_M')}
          >
            Mua N tặng M ({buyNGetMCount})
          </button>
          <button
            className={`promo-tab-btn ${activeTab === 'INVOICE_DISCOUNT' ? 'active' : ''}`}
            onClick={() => setActiveTab('INVOICE_DISCOUNT')}
          >
            Chiết khấu bậc thang ({invoiceTierCount})
          </button>
        </div>

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
            <p>Nhấn nút "+ Tạo chương trình khuyến mãi" để thiết lập chương trình đầu tiên.</p>
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
                const isBuyNGetM = p.promotionType === 'BUY_N_GET_M';
                const isInvoiceTier = p.promotionType === 'INVOICE_DISCOUNT';

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
                      {isBuyNGetM && (
                        <span className="promo-badge badge-buyngetm">
                          <Gift size={13} /> Mua N Tặng M
                        </span>
                      )}
                      {isInvoiceTier && (
                        <span className="promo-badge badge-invoicetier">
                          <Percent size={13} /> Bậc thang đơn
                        </span>
                      )}
                    </td>
                    <td>
                      {isBuyNGetM && p.buyNGetM && (
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

                      {isInvoiceTier && p.invoiceDiscount && (
                        <div className="rule-summary-box">
                          Đơn từ <strong>{formatVND(p.invoiceDiscount.minOrderAmount)}</strong>
                          <span style={{ color: '#7e22ce', fontWeight: 700, marginLeft: 6 }}>
                            {p.invoiceDiscount.discountPercent
                              ? `Giảm ${p.invoiceDiscount.discountPercent}%`
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
                      <span
                        className={`promo-badge ${
                          p.status ? 'badge-status-active' : 'badge-status-inactive'
                        }`}
                      >
                        {p.status ? 'Đang chạy' : 'Đã dừng'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="promo-action-group" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className="promo-action-btn"
                          title={p.status ? 'Tạm dừng CTKM' : 'Kích hoạt lại'}
                          onClick={() => handleToggleStatus(p)}
                        >
                          <Power size={15} color={p.status ? '#16a34a' : '#94a3b8'} />
                        </button>
                        <button
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

      {/* Modal */}
      <CreatePromotionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchPromotions}
      />
    </div>
  );
}

