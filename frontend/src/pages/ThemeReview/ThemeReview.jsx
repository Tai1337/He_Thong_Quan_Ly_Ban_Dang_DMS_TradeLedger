import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Check, 
  Copy, 
  Eye, 
  Sparkles, 
  TrendingUp, 
  Truck, 
  Box, 
  Search, 
  Bell, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Layers, 
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import './ThemeReview.css';

// 4 Phương án khung màu chuẩn hóa
export const THEME_OPTIONS = [
  {
    id: 'theme-trust-blue',
    name: 'Phương án 1: Enterprise Trust Blue',
    tagline: 'Khuyên dùng • Corporate ERP • SAP / Google Workspace Style',
    badge: 'Khuyên dùng',
    badgeClass: 'badge-recommended',
    description: 'Tông xanh dương hoàng gia tạo cảm giác tin cậy tuyệt đối, dịu mắt, giảm mỏi điều tiết cho kế toán và quản lý khi làm việc liên tục 8-10 tiếng.',
    variables: {
      '--tr-primary': '#1a73e8',
      '--tr-primary-hover': '#1557b0',
      '--tr-primary-light': '#eff6ff',
      '--tr-secondary': '#2563eb',
      '--tr-accent': '#ea580c',
      '--tr-accent-hover': '#c2410c',
      '--tr-accent-light': '#fff7ed',
      '--tr-header-bg': '#0b3d70',
      '--tr-header-text': '#ffffff',
      '--tr-sidebar-bg': '#1e293b',
      '--tr-sidebar-text': '#f8fafc',
      '--tr-sidebar-active': '#2563eb',
      '--tr-bg': '#f8fafc',
      '--tr-card-bg': '#ffffff',
      '--tr-border': '#e2e8f0',
      '--tr-border-strong': '#cbd5e1',
      '--tr-text-main': '#0f172a',
      '--tr-text-sub': '#475569',
      '--tr-text-muted': '#64748b',
      '--tr-table-stripe': '#f8fafc',
      '--tr-table-sticky-bg': '#ffffff'
    },
    swatches: [
      { name: 'Primary (Chủ đạo)', hex: '#1A73E8', textColor: '#FFFFFF' },
      { name: 'Header Navy', hex: '#0B3D70', textColor: '#FFFFFF' },
      { name: 'Sidebar Slate', hex: '#1E293B', textColor: '#FFFFFF' },
      { name: 'Accent Cam (CTA)', hex: '#EA580C', textColor: '#FFFFFF' },
      { name: 'App Background', hex: '#F8FAFC', textColor: '#0F172A' },
      { name: 'Card Surface', hex: '#FFFFFF', textColor: '#0F172A' }
    ]
  },
  {
    id: 'theme-modern-indigo',
    name: 'Phương án 2: Modern Slate & Indigo',
    tagline: 'Công nghệ cao • Next-Gen B2B SaaS • Linear / Frappe v15 Style',
    badge: 'Hiện đại & Tinh tế',
    badgeClass: 'badge-modern',
    description: 'Tông tím chàm Indigo kết hợp đen Obsidian huyền bí, mang đến trải nghiệm phần mềm quản lý doanh nghiệp chuyên nghiệp và hiện đại.',
    variables: {
      '--tr-primary': '#4f46e5',
      '--tr-primary-hover': '#4338ca',
      '--tr-primary-light': '#eef2ff',
      '--tr-secondary': '#6366f1',
      '--tr-accent': '#059669',
      '--tr-accent-hover': '#047857',
      '--tr-accent-light': '#ecfdf5',
      '--tr-header-bg': '#111827',
      '--tr-header-text': '#ffffff',
      '--tr-sidebar-bg': '#0f172a',
      '--tr-sidebar-text': '#f1f5f9',
      '--tr-sidebar-active': '#4f46e5',
      '--tr-bg': '#f9fafb',
      '--tr-card-bg': '#ffffff',
      '--tr-border': '#e5e7eb',
      '--tr-border-strong': '#d1d5db',
      '--tr-text-main': '#111827',
      '--tr-text-sub': '#374151',
      '--tr-text-muted': '#6b7280',
      '--tr-table-stripe': '#f9fafb',
      '--tr-table-sticky-bg': '#ffffff'
    },
    swatches: [
      { name: 'Primary (Indigo)', hex: '#4F46E5', textColor: '#FFFFFF' },
      { name: 'Header Obsidian', hex: '#111827', textColor: '#FFFFFF' },
      { name: 'Sidebar Dark', hex: '#0F172A', textColor: '#FFFFFF' },
      { name: 'Accent Emerald', hex: '#059669', textColor: '#FFFFFF' },
      { name: 'App Background', hex: '#F9FAFB', textColor: '#111827' },
      { name: 'Card Surface', hex: '#FFFFFF', textColor: '#111827' }
    ]
  },
  {
    id: 'theme-fmcg-emerald',
    name: 'Phương án 3: FMCG & Supply Chain Emerald',
    tagline: 'Chuỗi cung ứng & Hàng tiêu dùng • Masan / THP / Vinamilk Style',
    badge: 'Ngành FMCG',
    badgeClass: 'badge-fmcg',
    description: 'Màu xanh Teal & Ngọc lục bảo đại diện cho sự luân chuyển hàng hóa dồi dào, xuất nhập kho nhịp nhàng, tối ưu cho phân phối thực phẩm & tiêu dùng nhanh.',
    variables: {
      '--tr-primary': '#0d9488',
      '--tr-primary-hover': '#0f766e',
      '--tr-primary-light': '#f0fdfa',
      '--tr-secondary': '#059669',
      '--tr-accent': '#d97706',
      '--tr-accent-hover': '#b45309',
      '--tr-accent-light': '#fffbeb',
      '--tr-header-bg': '#134e4a',
      '--tr-header-text': '#ffffff',
      '--tr-sidebar-bg': '#042f2e',
      '--tr-sidebar-text': '#f0fdf4',
      '--tr-sidebar-active': '#0d9488',
      '--tr-bg': '#f4fbf7',
      '--tr-card-bg': '#ffffff',
      '--tr-border': '#ccfbf1',
      '--tr-border-strong': '#99f6e4',
      '--tr-text-main': '#042f2e',
      '--tr-text-sub': '#134e4a',
      '--tr-text-muted': '#336660',
      '--tr-table-stripe': '#f0fdfa',
      '--tr-table-sticky-bg': '#ffffff'
    },
    swatches: [
      { name: 'Primary (Teal)', hex: '#0D9488', textColor: '#FFFFFF' },
      { name: 'Header Deep Teal', hex: '#134E4A', textColor: '#FFFFFF' },
      { name: 'Sidebar Forest', hex: '#042F2E', textColor: '#FFFFFF' },
      { name: 'Accent Amber (ROP)', hex: '#D97706', textColor: '#FFFFFF' },
      { name: 'App Background', hex: '#F4FBF7', textColor: '#042F2E' },
      { name: 'Card Surface', hex: '#FFFFFF', textColor: '#042F2E' }
    ]
  },
  {
    id: 'theme-dark-executive',
    name: 'Phương án 4: High-Contrast Dark Executive',
    tagline: 'Phân tích tài chính & Ca đêm • Bloomberg / Dark Analytics Style',
    badge: 'Dark Mode',
    badgeClass: 'badge-dark',
    description: 'Nền tối sâu thẳm với độ tương phản sắc nét, màu chỉ số neon nổi bật. Cực kỳ lý tưởng khi phân tích biểu đồ P&L, theo dõi điều phối xe ca đêm và bảo vệ mắt.',
    variables: {
      '--tr-primary': '#38bdf8',
      '--tr-primary-hover': '#0ea5e9',
      '--tr-primary-light': 'rgba(56, 189, 248, 0.15)',
      '--tr-secondary': '#60a5fa',
      '--tr-accent': '#22c55e',
      '--tr-accent-hover': '#16a34a',
      '--tr-accent-light': 'rgba(34, 197, 94, 0.15)',
      '--tr-header-bg': '#070b13',
      '--tr-header-text': '#f8fafc',
      '--tr-sidebar-bg': '#0b1120',
      '--tr-sidebar-text': '#e2e8f0',
      '--tr-sidebar-active': '#38bdf8',
      '--tr-bg': '#070a12',
      '--tr-card-bg': '#111827',
      '--tr-border': 'rgba(255, 255, 255, 0.1)',
      '--tr-border-strong': 'rgba(255, 255, 255, 0.2)',
      '--tr-text-main': '#f8fafc',
      '--tr-text-sub': '#cbd5e1',
      '--tr-text-muted': '#94a3b8',
      '--tr-table-stripe': '#0f172a',
      '--tr-table-sticky-bg': '#111827'
    },
    swatches: [
      { name: 'Primary (Sky Blue)', hex: '#38BDF8', textColor: '#070B13' },
      { name: 'Header Charcoal', hex: '#070B13', textColor: '#FFFFFF' },
      { name: 'Sidebar Dark Blue', hex: '#0B1120', textColor: '#FFFFFF' },
      { name: 'Accent Neon Green', hex: '#22C55E', textColor: '#070B13' },
      { name: 'App Background', hex: '#070A12', textColor: '#FFFFFF' },
      { name: 'Card Surface', hex: '#111827', textColor: '#FFFFFF' }
    ]
  }
];

const ThemeReview = () => {
  const [activeThemeId, setActiveThemeId] = useState(() => {
    return localStorage.getItem('dms_review_theme') || 'theme-trust-blue';
  });

  const [copiedCode, setCopiedCode] = useState(false);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [batchProcessed, setBatchProcessed] = useState(false);

  const currentTheme = THEME_OPTIONS.find(t => t.id === activeThemeId) || THEME_OPTIONS[0];

  useEffect(() => {
    localStorage.setItem('dms_review_theme', activeThemeId);
  }, [activeThemeId]);

  const handleCopyTokens = () => {
    const cssText = Object.entries(currentTheme.variables)
      .map(([k, v]) => `  ${k.replace('--tr-', '--')}: ${v};`)
      .join('\n');
    const fullSnippet = `/* Token: ${currentTheme.name} */\n:root {\n${cssText}\n}`;
    navigator.clipboard.writeText(fullSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleSimulateBatchApprove = () => {
    setIsProcessingBatch(true);
    setTimeout(() => {
      setIsProcessingBatch(false);
      setBatchProcessed(true);
      setTimeout(() => setBatchProcessed(false), 4000);
    }, 1200);
  };

  return (
    <div className="theme-review-page">
      {/* 1. TOP HEADER HERO BANNER */}
      <header className="review-top-banner">
        <div className="banner-left">
          <div className="badge-pill">
            <Sparkles size={14} /> UI/UX Pro Max & Vercel Skills Alignment
          </div>
          <h1 className="banner-title">Trung Tâm Đánh Giá Khung Màu (Theme Review)</h1>
          <p className="banner-desc">
            Trải nghiệm và so sánh trực tiếp 4 phương án phối màu doanh nghiệp cho hệ thống <strong>DMS-NPP TradeLedger</strong>. 
            Mọi thành phần từ Header, Bento Dashboard, Bảng Sticky Column đến các Widget điều hành đều phản hồi tức thì theo chủ đề bạn chọn.
          </p>
        </div>

        <div className="banner-right">
          <button 
            type="button" 
            className="btn-action-outline"
            onClick={handleCopyTokens}
            aria-label="Sao chép CSS Variables của theme đang chọn"
          >
            {copiedCode ? <Check size={16} className="text-success" /> : <Copy size={16} />}
            <span>{copiedCode ? 'Đã sao chép CSS Tokens!' : 'Sao chép CSS Tokens'}</span>
          </button>
          <Link to="/" className="btn-action-primary" aria-label="Quay lại trang chủ">
            <Eye size={16} />
            <span>Vào hệ thống thực tế</span>
          </Link>
        </div>
      </header>

      {/* 2. THEME SELECTOR CARDS (4 LỰA CHỌN) */}
      <section className="theme-selector-grid" aria-label="Danh sách lựa chọn khung màu">
        {THEME_OPTIONS.map((theme) => {
          const isSelected = theme.id === activeThemeId;
          return (
            <div 
              key={theme.id}
              role="button"
              tabIndex={0}
              onClick={() => setActiveThemeId(theme.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveThemeId(theme.id); }}
              className={`theme-selector-card ${isSelected ? 'selected' : ''}`}
              aria-pressed={isSelected}
              aria-label={`Chọn ${theme.name}`}
            >
              <div className="card-top-row">
                <span className={`theme-badge ${theme.badgeClass}`}>{theme.badge}</span>
                {isSelected && (
                  <span className="selected-indicator">
                    <Check size={14} /> Đang xem
                  </span>
                )}
              </div>

              <h3 className="theme-card-title">{theme.name}</h3>
              <p className="theme-card-tagline">{theme.tagline}</p>
              <p className="theme-card-desc">{theme.description}</p>

              {/* Swatch Mini Bars */}
              <div className="mini-swatches-strip" title="Các màu chủ đạo trong theme">
                {theme.swatches.map((s, idx) => (
                  <div 
                    key={idx} 
                    className="swatch-strip-item" 
                    style={{ backgroundColor: s.hex }} 
                    title={`${s.name}: ${s.hex}`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* 3. LIVE INTERACTIVE SANDBOX PREVIEW */}
      <section className="sandbox-wrapper">
        <div className="sandbox-meta-header">
          <div className="sandbox-meta-left">
            <h2 className="sandbox-title">
              Mô phỏng Giao diện Thực tế: <span className="highlight-theme-name">{currentTheme.name}</span>
            </h2>
            <p className="sandbox-subtitle">
              Xem trước sự hài hòa giữa độ tương phản WCAG 2.2 AA, font chữ Inter, số liệu Tabular-nums và các trạng thái chuyển tiếp.
            </p>
          </div>
          <div className="sandbox-meta-right">
            <span className="contrast-chip">
              <ShieldCheck size={14} /> WCAG 2.2 AA Verified (Contrast ≥ 4.5:1)
            </span>
          </div>
        </div>

        {/* Cửa sổ giả lập Container áp dụng CSS Variables của Theme */}
        <div 
          className="preview-viewport-window" 
          style={currentTheme.variables}
          data-theme={currentTheme.id}
        >
          {/* A. MINI FRAFFE TOPBAR SIMULATION */}
          <div className="sim-topbar">
            <div className="sim-topbar-left">
              <div className="sim-brand-badge">
                <Layers size={18} />
              </div>
              <span className="sim-brand-title">DMS-NPP TradeLedger</span>
              <span className="sim-breadcrumb-sep">›</span>
              <span className="sim-breadcrumb-curr">Bán hàng (Sales Orders)</span>
            </div>

            <div className="sim-topbar-right">
              <div className="sim-search-box">
                <Search size={14} />
                <input 
                  type="text" 
                  placeholder="Tìm mã đơn, SKU, khách hàng… (⌘ K)" 
                  readOnly 
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
              <div className="sim-icon-btn" title="Thông báo hệ thống">
                <Bell size={16} />
                <span className="sim-notif-dot"></span>
              </div>
              <div className="sim-user-avatar" title="Quản trị viên NPP">
                A
              </div>
            </div>
          </div>

          {/* B. BENTO STAT METRICS CARDS */}
          <div className="sim-content-body">
            <div className="sim-bento-row">
              {/* Card 1: Doanh số */}
              <div className="sim-bento-card">
                <div className="sim-card-header">
                  <div className="sim-icon-box bg-primary-soft">
                    <TrendingUp size={18} />
                  </div>
                  <span className="sim-tag tag-success">+14.8% tuần này</span>
                </div>
                <div className="sim-card-value tabular-nums">486.250.000 đ</div>
                <div className="sim-card-label">Doanh thu Bán hàng (SO)</div>
                <div className="sim-card-hint">Đạt 85% chỉ tiêu tháng của Nhà phân phối</div>
              </div>

              {/* Card 2: Đơn mua hàng (PO) */}
              <div className="sim-bento-card featured-ai-card">
                <div className="sim-card-header">
                  <div className="sim-icon-box bg-accent-soft">
                    <Sparkles size={18} />
                  </div>
                  <span className="sim-tag tag-accent">Mua hàng NCC</span>
                </div>
                <div className="sim-card-value">8 Đơn mua hàng</div>
                <div className="sim-card-label">Đơn đặt hàng mua (PO)</div>
                <div className="sim-card-hint">Theo dõi tiến độ duyệt và giao hàng từ NCC</div>
              </div>

              {/* Card 3: Chuyến xe D+3 */}
              <div className="sim-bento-card">
                <div className="sim-card-header">
                  <div className="sim-icon-box bg-info-soft">
                    <Truck size={18} />
                  </div>
                  <span className="sim-tag tag-info">3 Chuyến xe</span>
                </div>
                <div className="sim-card-value">Tiến độ D+3</div>
                <div className="sim-card-label">Chuyến xe Nhập kho NCC</div>
                <div className="sim-card-hint">Masan Consumer & Tân Hiệp Phát đang giao</div>
              </div>

              {/* Card 4: Tồn kho FEFO */}
              <div className="sim-bento-card">
                <div className="sim-card-header">
                  <div className="sim-icon-box bg-warning-soft">
                    <Box size={18} />
                  </div>
                  <span className="sim-tag tag-warning">Kiểm soát FEFO</span>
                </div>
                <div className="sim-card-value tabular-nums">1.450 Thùng</div>
                <div className="sim-card-label">Tồn kho Khả dụng (RPT083)</div>
                <div className="sim-card-hint">98.2% hàng có date &gt; 6 tháng</div>
              </div>
            </div>

            {/* C. INTERACTIVE DATA TABLE WITH STICKY COLUMNS */}
            <div className="sim-table-card">
              <div className="sim-table-header">
                <div>
                  <h3 className="sim-table-title">Đơn bán hàng cần xử lý (Sales Orders)</h3>
                  <p className="sim-table-subtitle">Demo cơ chế Sticky Column: cuộn ngang để kiểm tra cột Mã đơn và Thao tác luôn được ghim cố định.</p>
                </div>
                <div className="sim-table-actions">
                  <button type="button" className="sim-btn-filter">
                    <SlidersHorizontal size={14} /> Bộ lọc
                  </button>
                  <button 
                    type="button" 
                    className="sim-btn-primary"
                    onClick={handleSimulateBatchApprove}
                    disabled={isProcessingBatch}
                  >
                    {isProcessingBatch ? (
                      <span>Đang xử lý…</span>
                    ) : (
                      <>
                        <Zap size={14} /> Chốt đơn hàng loạt
                      </>
                    )}
                  </button>
                </div>
              </div>

              {batchProcessed && (
                <div className="sim-toast-success" role="status" aria-live="polite">
                  <CheckCircle2 size={16} />
                  <span>Đã duyệt và phân bổ thành công các đơn hàng được chọn theo thuật toán FEFO!</span>
                </div>
              )}

              {/* Bảng dữ liệu có scroll ngang và sticky column */}
              <div className="sim-table-scroll-container">
                <table className="sim-data-table">
                  <thead>
                    <tr>
                      <th className="sticky-col-left col-code">Mã đơn hàng</th>
                      <th className="sticky-col-left col-customer">Khách hàng / Đại lý</th>
                      <th>Ngày đặt</th>
                      <th>NVBH (Rep)</th>
                      <th>Kho xuất</th>
                      <th className="text-right">Số lượng</th>
                      <th className="text-right">Tổng tiền (VNĐ)</th>
                      <th>Phân bổ lô FEFO</th>
                      <th>Trạng thái</th>
                      <th className="sticky-col-right col-action text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="sticky-col-left col-code">
                        <strong className="order-link">SO-2026-00891</strong>
                      </td>
                      <td className="sticky-col-left col-customer">Đại lý Tạp Hóa Minh Phát</td>
                      <td>10/09/2026</td>
                      <td>Nguyễn Văn An</td>
                      <td>Kho Tổng Bình Dương</td>
                      <td className="text-right tabular-nums">45 Thùng</td>
                      <td className="text-right tabular-nums font-semibold">18.450.000 đ</td>
                      <td>
                        <span className="badge-fefo success">Đã khớp 100%</span>
                      </td>
                      <td>
                        <span className="status-pill allocated">Chờ giao</span>
                      </td>
                      <td className="sticky-col-right col-action text-center">
                        <button type="button" className="action-link-btn">Chi tiết</button>
                      </td>
                    </tr>

                    <tr>
                      <td className="sticky-col-left col-code">
                        <strong className="order-link">SO-2026-00892</strong>
                      </td>
                      <td className="sticky-col-left col-customer">Siêu Thị Mini Mart 24h</td>
                      <td>10/09/2026</td>
                      <td>Trần Thị Bích</td>
                      <td>Kho Củ Chi</td>
                      <td className="text-right tabular-nums">120 Thùng</td>
                      <td className="text-right tabular-nums font-semibold">54.200.000 đ</td>
                      <td>
                        <span className="badge-fefo warning">Thiếu 12 thùng (RPT005)</span>
                      </td>
                      <td>
                        <span className="status-pill pending">Đã gửi đơn</span>
                      </td>
                      <td className="sticky-col-right col-action text-center">
                        <button type="button" className="action-link-btn">Chi tiết</button>
                      </td>
                    </tr>

                    <tr>
                      <td className="sticky-col-left col-code">
                        <strong className="order-link">SO-2026-00893</strong>
                      </td>
                      <td className="sticky-col-left col-customer">Cửa hàng Bách Hóa Hoa Phượng</td>
                      <td>09/09/2026</td>
                      <td>Lê Hoàng Nam</td>
                      <td>Kho Tổng Bình Dương</td>
                      <td className="text-right tabular-nums">28 Thùng</td>
                      <td className="text-right tabular-nums font-semibold">9.860.000 đ</td>
                      <td>
                        <span className="badge-fefo success">Đã khớp 100%</span>
                      </td>
                      <td>
                        <span className="status-pill delivered">Đã giao hàng</span>
                      </td>
                      <td className="sticky-col-right col-action text-center">
                        <button type="button" className="action-link-btn">Chi tiết</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* D. COLOR SWATCHES & TOKEN INSPECTION BAR */}
            <div className="sim-tokens-inspector">
              <div className="inspector-title-row">
                <div className="inspector-title">
                  <SlidersHorizontal size={16} /> Bảng màu chi tiết và Thông số kỹ thuật (Design Tokens)
                </div>
                <div className="inspector-sub">Tuân thủ tiêu chuẩn tương phản WCAG 2.2 AA & Vercel CSS Guidelines</div>
              </div>

              <div className="swatches-grid">
                {currentTheme.swatches.map((swatch, idx) => (
                  <div key={idx} className="swatch-detail-card">
                    <div 
                      className="swatch-color-box" 
                      style={{ backgroundColor: swatch.hex }}
                    >
                      <span className="swatch-contrast-check" style={{ color: swatch.textColor }}>
                        Aa
                      </span>
                    </div>
                    <div className="swatch-info">
                      <div className="swatch-name">{swatch.name}</div>
                      <code className="swatch-hex">{swatch.hex}</code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FOOTER GUIDANCE & NEXT STEPS */}
      <footer className="review-footer-bar">
        <div className="footer-left">
          <Info size={16} />
          <span>
            Bạn thích phương án nào nhất? Bạn có thể phản hồi lại để mình áp dụng trực tiếp khung màu đã chọn vào toàn bộ hệ thống!
          </span>
        </div>
        <div className="footer-right">
          <button 
            type="button" 
            className="btn-footer-copy"
            onClick={handleCopyTokens}
          >
            {copiedCode ? <Check size={14} /> : <Copy size={14} />}
            <span>{copiedCode ? 'Đã sao chép!' : 'Copy Code Tokens'}</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default ThemeReview;
