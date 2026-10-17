import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Sparkles,
  Store,
  ClipboardCheck,
  CheckCircle2,
  Ban,
  TrendingUp,
  ThumbsUp,
  ArrowRight,
  RefreshCw,
  ShoppingBag,
  Award,
  Layers,
  Check,
  Copy,
  Info,
} from 'lucide-react';
import {
  getAdminProducts,
  getCatalogCategories,
  createAdminProduct,
  allocateSampleToStores,
  updateSampleFeedback,
  approveSampleToCommercial,
  rejectSample,
} from '../../../services/api';
import ProductCreateModal from './ProductCreateModal';
import SampleAllocationModal from './SampleAllocationModal';
import SampleFeedbackModal from './SampleFeedbackModal';
import SampleApprovalModal from './SampleApprovalModal';
import './ProductManagement.css';

export default function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [kpis, setKpis] = useState({
    totalProducts: 0,
    totalSampleProducts: 0,
    totalCommercialProducts: 0,
    totalReadyToApprove: 0,
  });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [copiedSku, setCopiedSku] = useState(null);

  // Filter states
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'SAMPLE' | 'READY' | 'COMMERCIAL' | 'REJECTED'
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [allocatingProduct, setAllocatingProduct] = useState(null);
  const [feedbackProduct, setFeedbackProduct] = useState(null);
  const [approvalProduct, setApprovalProduct] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const copyToClipboard = (sku) => {
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 2000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const [prodRes, catRes] = await Promise.all([
        getAdminProducts({
          productType: activeTab === 'READY' ? 'SAMPLE' : activeTab === 'ALL' ? undefined : activeTab,
          categoryId: selectedCategory || undefined,
          search: searchTerm || undefined,
        }),
        getCatalogCategories(),
      ]);

      let items = prodRes.data || [];
      if (activeTab === 'READY') {
        items = items.filter((p) => p.samplingStats?.isReadyToApprove);
      }

      setProducts(items);
      setKpis(prodRes.kpis || {});
      setCategories(catRes || []);
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi khi tải danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, selectedCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  // Handlers for Modals
  const handleCreateProduct = async (payload) => {
    const res = await createAdminProduct(payload);
    showToast(`Đã thêm sản phẩm "${res.data?.name || payload.name}" thành công!`);
    await loadData();
  };

  const handleAllocateStores = async (productId, allocations) => {
    await allocateSampleToStores(productId, allocations);
    showToast(`Đã phân bổ hàng mẫu về ${allocations.length} cửa hàng thành công!`);
    await loadData();
  };

  const handleUpdateFeedback = async (allocationId, payload) => {
    await updateSampleFeedback(allocationId, payload);
    showToast('Đã lưu kết quả thử nghiệm và nhu cầu đặt sỉ của Cửa hàng!');
    await loadData();
  };

  const handleApproveCommercial = async (productId) => {
    const res = await approveSampleToCommercial(productId);
    showToast(res.message || 'Đã duyệt mở bán chính thức cho tất cả cửa hàng!');
    await loadData();
  };

  const handleRejectSample = async (productId, reason) => {
    const res = await rejectSample(productId, reason);
    showToast(res.message || 'Đã dừng thử nghiệm sản phẩm.');
    await loadData();
  };

  return (
    <div className="product-mgmt-container">
      {/* Toast Alert Feedback */}
      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 1100,
            background: '#059669',
            color: '#ffffff',
            padding: '12px 22px',
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(5, 150, 105, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 600,
            fontSize: '14px',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="product-mgmt-header">
        <div className="product-mgmt-title-group">
          <h1>
            <span className="title-icon-wrapper">
              <Package size={22} />
            </span>
            Quản Lý Sản Phẩm & Quy Trình Mẫu Thử [S]
          </h1>
          <p>
            Quy trình chuẩn FMCG: Thử nghiệm tại điểm bán [S] → Thu thập đánh giá khách hàng & Pre-order → Duyệt mở bán sỉ cho Cửa hàng
          </p>
        </div>

        <button
          className="header-action-btn"
          onClick={() => setIsCreateOpen(true)}
          aria-label="Thêm sản phẩm mới"
        >
          <Plus size={18} />
          Thêm Sản Phẩm Mới
        </button>
      </div>

      {/* Interactive Sampling Workflow Stepper Panel */}
      <div className="workflow-stepper-panel">
        <div className="stepper-header-row">
          <div className="stepper-headline">
            <Layers size={16} color="#7c3aed" />
            Luồng Kích Hoạt Mẫu Thử [S] (Sample Activation Workflow)
          </div>
          <span className="stepper-rule-badge">
            <Info size={13} />
            Chỉ sản phẩm được ưa chuộng mới mở bán sỉ trên Web Bán Hàng
          </span>
        </div>

        <div className="workflow-steps-track">
          <div className="workflow-card-step step-active">
            <div className="step-number-bubble">1</div>
            <div className="step-details">
              <h4>Tạo Mã Mẫu [S]</h4>
              <p>Mã SKU bắt đầu bằng <strong>S-</strong>, gắn cờ sản phẩm thử nghiệm thị trường.</p>
            </div>
          </div>

          <div className="workflow-card-step">
            <div className="step-number-bubble">2</div>
            <div className="step-details">
              <h4>Phân Bổ Cửa Hàng</h4>
              <p>Cấp hạn mức suất mẫu [S] về các đại lý, tiệm tạp hoá trọng điểm.</p>
            </div>
          </div>

          <div className="workflow-card-step">
            <div className="step-number-bubble">3</div>
            <div className="step-details">
              <h4>Thử Tại Tiệm & Pre-order</h4>
              <p>Khách thử tại chỗ, Cửa hàng nhập tỷ lệ khen vị và số thùng muốn nhập.</p>
            </div>
          </div>

          <div className="workflow-card-step">
            <div className="step-number-bubble">4</div>
            <div className="step-details">
              <h4>Duyệt Mở Bán COMMERCIAL</h4>
              <p>Admin bấm duyệt mở bán sỉ số lượng lớn cho toàn bộ Cửa hàng trên hệ thống.</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Metrics Dashboard Grid */}
      <div className="mgmt-kpi-grid">
        <div
          className={`mgmt-kpi-card ${activeTab === 'ALL' ? 'kpi-active-filter' : ''}`}
          onClick={() => setActiveTab('ALL')}
          tabIndex={0}
          role="button"
          aria-label="Xem tất cả sản phẩm"
        >
          <div className="mgmt-kpi-icon icon-blue">
            <Package size={24} />
          </div>
          <div className="mgmt-kpi-meta">
            <span className="mgmt-kpi-val">{kpis.totalProducts || 0}</span>
            <span className="mgmt-kpi-label">Tổng số SKU hệ thống</span>
          </div>
        </div>

        <div
          className={`mgmt-kpi-card ${activeTab === 'SAMPLE' ? 'kpi-active-filter' : ''}`}
          onClick={() => setActiveTab('SAMPLE')}
          tabIndex={0}
          role="button"
          aria-label="Xem hàng mẫu đang thử nghiệm"
        >
          <div className="mgmt-kpi-icon icon-purple">
            <Sparkles size={24} />
          </div>
          <div className="mgmt-kpi-meta">
            <span className="mgmt-kpi-val">{kpis.totalSampleProducts || 0}</span>
            <span className="mgmt-kpi-label">Hàng mẫu [S] đang activation</span>
          </div>
        </div>

        <div
          className={`mgmt-kpi-card ${activeTab === 'READY' ? 'kpi-active-filter' : ''}`}
          onClick={() => setActiveTab('READY')}
          tabIndex={0}
          role="button"
          aria-label="Xem sản phẩm đạt chuẩn chờ duyệt"
        >
          <div className="mgmt-kpi-icon icon-amber">
            <Award size={24} />
          </div>
          <div className="mgmt-kpi-meta">
            <span className="mgmt-kpi-val">{kpis.totalReadyToApprove || 0}</span>
            <span className="mgmt-kpi-label">Đạt chuẩn - Chờ duyệt mở bán</span>
          </div>
        </div>

        <div
          className={`mgmt-kpi-card ${activeTab === 'COMMERCIAL' ? 'kpi-active-filter' : ''}`}
          onClick={() => setActiveTab('COMMERCIAL')}
          tabIndex={0}
          role="button"
          aria-label="Xem sản phẩm bán chính thức"
        >
          <div className="mgmt-kpi-icon icon-emerald">
            <ShoppingBag size={24} />
          </div>
          <div className="mgmt-kpi-meta">
            <span className="mgmt-kpi-val">{kpis.totalCommercialProducts || 0}</span>
            <span className="mgmt-kpi-label">Đang mở bán sỉ cho Cửa hàng</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar (Segmented Control + Search) */}
      <div className="mgmt-toolbar">
        <div className="mgmt-tabs-group" role="tablist">
          <button
            className={`mgmt-tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveTab('ALL')}
            role="tab"
            aria-selected={activeTab === 'ALL'}
          >
            Tất cả <span className="tab-badge">{kpis.totalProducts || 0}</span>
          </button>
          <button
            className={`mgmt-tab-btn ${activeTab === 'SAMPLE' ? 'active' : ''}`}
            onClick={() => setActiveTab('SAMPLE')}
            role="tab"
            aria-selected={activeTab === 'SAMPLE'}
          >
            Mẫu Thử [S] <span className="tab-badge">{kpis.totalSampleProducts || 0}</span>
          </button>
          <button
            className={`mgmt-tab-btn ${activeTab === 'READY' ? 'active' : ''}`}
            onClick={() => setActiveTab('READY')}
            role="tab"
            aria-selected={activeTab === 'READY'}
          >
            Sẵn Sàng Duyệt <span className="tab-badge">{kpis.totalReadyToApprove || 0}</span>
          </button>
          <button
            className={`mgmt-tab-btn ${activeTab === 'COMMERCIAL' ? 'active' : ''}`}
            onClick={() => setActiveTab('COMMERCIAL')}
            role="tab"
            aria-selected={activeTab === 'COMMERCIAL'}
          >
            Bán Chính Thức <span className="tab-badge">{kpis.totalCommercialProducts || 0}</span>
          </button>
          <button
            className={`mgmt-tab-btn ${activeTab === 'REJECTED' ? 'active' : ''}`}
            onClick={() => setActiveTab('REJECTED')}
            role="tab"
            aria-selected={activeTab === 'REJECTED'}
          >
            Dừng / R&D
          </button>
        </div>

        <form onSubmit={handleSearchSubmit} className="mgmt-search-group">
          <select
            className="mgmt-select-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Lọc theo ngành hàng"
          >
            <option value="">Tất cả ngành hàng</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="mgmt-search-input-wrap">
            <Search size={15} className="search-icon-inside" />
            <input
              type="text"
              className="mgmt-search-input"
              placeholder="Tìm mã SKU, tên SP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Tìm kiếm sản phẩm"
            />
          </div>

          <button
            type="button"
            className="btn-icon-action"
            onClick={loadData}
            title="Tải lại dữ liệu"
            aria-label="Làm mới"
          >
            <RefreshCw size={14} />
          </button>
        </form>
      </div>

      {/* Main Table Card */}
      <div className="mgmt-table-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '10px' }} />
            <div>Đang tải danh sách sản phẩm...</div>
          </div>
        ) : products.length === 0 ? (
          <div className="mgmt-empty-state">
            <Package size={44} color="#94a3b8" />
            <h3>Không tìm thấy sản phẩm nào</h3>
            <p style={{ margin: 0, fontSize: '13px' }}>
              Hãy thử chọn bộ lọc khác hoặc nhấn "Thêm Sản Phẩm Mới" để bắt đầu thử nghiệm.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="mgmt-table">
              <thead>
                <tr>
                  <th style={{ width: '150px' }}>Mã SKU</th>
                  <th>Sản Phẩm</th>
                  <th>Đơn Vị & Giá Bán</th>
                  <th style={{ minWidth: '240px' }}>Tiến Độ Thử Nghiệm & Độ Ưa Chuộng</th>
                  <th>Trạng Thái Vòng Đời</th>
                  <th style={{ textAlign: 'center' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const isSample = p.productType === 'SAMPLE';
                  const isCommercial = p.productType === 'COMMERCIAL';
                  const isRejected = p.productType === 'REJECTED';
                  const stats = p.samplingStats || {};

                  return (
                    <tr key={p.id}>
                      {/* SKU Badge with Copy Helper */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            className={`sku-badge ${
                              isSample ? 'sku-sample' : isCommercial ? 'sku-commercial' : 'sku-rejected'
                            }`}
                            title="Mã định danh sản phẩm"
                          >
                            {isSample && <Sparkles size={11} />}
                            {p.sku}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(p.sku)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              color: '#94a3b8',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            title="Sao chép SKU"
                          >
                            {copiedSku === p.sku ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>

                      {/* Product Name & Category */}
                      <td>
                        <div className="product-meta-cell">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} className="product-thumb" loading="lazy" />
                          ) : (
                            <div className="product-thumb-placeholder">
                              <Package size={20} />
                            </div>
                          )}
                          <div>
                            <div className="product-name-title">{p.name}</div>
                            <div className="product-category-sub">
                              {p.categoryName} • Quy cách: 1 {p.unit} = {p.conversionRate} {p.retailUnit || 'đơn vị'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Pricing Info */}
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          {Number(p.basePrice).toLocaleString('vi-VN')} đ
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          / {p.unit} ({p.retailUnit || 'lẻ'})
                        </div>
                      </td>

                      {/* Sampling Metrics & Conversion */}
                      <td className="sampling-metric-cell">
                        {isSample ? (
                          <div>
                            <div className="metric-text-row">
                              <span style={{ color: stats.overallPopularityRate >= 70 ? '#059669' : '#d97706' }}>
                                <ThumbsUp size={12} style={{ display: 'inline', marginRight: '3px' }} />
                                Khách khen vị: {stats.overallPopularityRate}%
                              </span>
                              <span style={{ color: '#4f46e5' }}>
                                Pre-order: {stats.totalPreorderQty} {p.unit}
                              </span>
                            </div>

                            <div className="metric-bar-wrap">
                              <div
                                className={`metric-bar-fill ${
                                  stats.overallPopularityRate >= 70
                                    ? 'fill-emerald'
                                    : stats.overallPopularityRate > 0
                                    ? 'fill-amber'
                                    : 'fill-slate'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(6, stats.overallPopularityRate))}%` }}
                              />
                            </div>

                            <div className="metric-sub-label">
                              Phân bổ: {stats.allocatedStoresCount} Cửa hàng ({stats.totalAllocatedQty} suất) • {stats.totalTestedCount} khách đã thử
                            </div>
                          </div>
                        ) : isCommercial ? (
                          <div>
                            <span style={{ color: '#059669', fontWeight: 600, fontSize: '12.5px' }}>
                              ✅ Đã mở bán sỉ toàn hệ thống
                            </span>
                            <div className="metric-sub-label">Cửa hàng được phép nhập sỉ số lượng lớn</div>
                          </div>
                        ) : (
                          <div>
                            <span style={{ color: '#dc2626', fontWeight: 600, fontSize: '12.5px' }}>
                              ⛔ Dừng thử nghiệm
                            </span>
                            <div className="metric-sub-label">{p.rejectionReason || 'Chuyển về R&D cải tiến'}</div>
                          </div>
                        )}
                      </td>

                      {/* Lifecycle Status Badge */}
                      <td>
                        {isSample ? (
                          stats.isReadyToApprove ? (
                            <span style={{ background: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px', border: '1px solid #a7f3d0' }}>
                              <CheckCircle2 size={13} />
                              Sẵn sàng duyệt mở bán
                            </span>
                          ) : stats.allocatedStoresCount > 0 ? (
                            <span style={{ background: '#f5f3ff', color: '#7c3aed', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px', border: '1px solid #ddd6fe' }}>
                              <Store size={13} />
                              Đang dùng thử tại CH
                            </span>
                          ) : (
                            <span style={{ background: '#fffbeb', color: '#d97706', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid #fde68a' }}>
                              Chờ phân bổ mẫu
                            </span>
                          )
                        ) : isCommercial ? (
                          <span style={{ background: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            Chính thức (Bán sỉ)
                          </span>
                        ) : (
                          <span style={{ background: '#fef2f2', color: '#dc2626', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                            Đã khoá / R&D
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="table-actions-cell" style={{ textAlign: 'center' }}>
                        <div className="action-btn-group" style={{ justifyContent: 'center' }}>
                          {isSample && (
                            <>
                              <button
                                className="btn-icon-action"
                                title="Giai đoạn 1: Phân bổ hàng mẫu về cửa hàng"
                                onClick={() => setAllocatingProduct(p)}
                              >
                                <Store size={14} color="#7c3aed" />
                                Phân Bổ
                              </button>

                              <button
                                className="btn-icon-action"
                                title="Giai đoạn 2: Nhập đánh giá & nhu cầu đặt thử"
                                onClick={() => setFeedbackProduct(p)}
                                disabled={p.allocations?.length === 0}
                              >
                                <ClipboardCheck size={14} color="#059669" />
                                Đánh Giá
                              </button>

                              <button
                                className="btn-icon-action btn-action-primary"
                                title="Giai đoạn 3: Quyết định duyệt mở bán sỉ"
                                onClick={() => setApprovalProduct(p)}
                              >
                                <CheckCircle2 size={14} />
                                Duyệt Bán
                              </button>
                            </>
                          )}

                          {!isSample && (
                            <span style={{ fontSize: '12px', color: '#94a3b8' }}>--</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <ProductCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreateProduct}
        categories={categories}
      />

      <SampleAllocationModal
        isOpen={!!allocatingProduct}
        onClose={() => setAllocatingProduct(null)}
        product={allocatingProduct}
        onAllocated={handleAllocateStores}
      />

      <SampleFeedbackModal
        isOpen={!!feedbackProduct}
        onClose={() => setFeedbackProduct(null)}
        product={feedbackProduct}
        onFeedbackUpdated={handleUpdateFeedback}
      />

      <SampleApprovalModal
        isOpen={!!approvalProduct}
        onClose={() => setApprovalProduct(null)}
        product={approvalProduct}
        onApproved={handleApproveCommercial}
        onRejected={handleRejectSample}
      />
    </div>
  );
}
