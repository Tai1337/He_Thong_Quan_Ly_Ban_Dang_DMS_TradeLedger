import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  Search, 
  Bell, 
  ChevronDown, 
  HelpCircle,
  LogOut,
  User,
  Shield,
  Layers,
  ShoppingCart,
  Palette,
  TrendingUp,
  Truck,
  CheckSquare,
  BookOpen,
  Keyboard,
  PhoneCall,
  KeyRound,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { changePassword } from '../../services/api';
import './Layout.css';
import './HeaderExtensions.css';

const FrappeHeader = ({ user, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Dropdown states
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Search Modal state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Profile Modal state
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passAlert, setPassAlert] = useState(null);
  const [passLoading, setPassLoading] = useState(false);

  // Phím tắt Ctrl + K mở tìm kiếm nhanh, Esc để đóng
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsProfileOpen(false);
        setIsChangePassOpen(false);
        setIsNotifOpen(false);
        setIsHelpOpen(false);
        setIsUserMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Danh sách thông báo thực tế mẫu
  const notifications = [
    {
      id: 1,
      title: 'Đơn hàng mới từ Web Khách hàng',
      desc: 'Đơn hàng #R-20260924-55793 vừa đặt trực tuyến chờ Kế toán xác nhận.',
      time: '10 phút trước',
      icon: TrendingUp,
      color: '#2563eb',
      path: '/sales/sales-orders'
    },
    {
      id: 2,
      title: 'Biên bản kiểm kê chờ phê duyệt',
      desc: 'Đợt kiểm kê Kho NPP Test cần Admin ký duyệt cân đối tồn kho.',
      time: '1 giờ trước',
      icon: CheckSquare,
      color: '#7c3aed',
      path: '/inventory/counts'
    },
    {
      id: 3,
      title: 'Chuyến xe nhập kho NCC đến hạn',
      desc: 'Chuyến xe TRIP-IN-20260910-6027 đang trên đường đến kho NPP.',
      time: 'Hôm nay',
      icon: Truck,
      color: '#059669',
      path: '/purchase/receiving'
    }
  ];

  // Danh mục tìm kiếm nhanh gợi ý
  const quickLinks = [
    { label: 'Danh sách Đơn bán hàng (SO)', sub: 'Bán hàng • Đơn chốt giao', path: '/sales/sales-orders', type: 'Phân hệ' },
    { label: 'Đơn đặt hàng mua (PO)', sub: 'Mua hàng • Đặt hàng NCC', path: '/purchase/purchase-orders', type: 'Phân hệ' },
    { label: 'Nhật ký giao dịch kho', sub: 'Kho bãi • Sổ giao dịch xuất nhập', path: '/inventory/transactions', type: 'Kho' },
    { label: 'Kiểm kê kho hàng', sub: 'Kho bãi • Đếm tồn thực tế', path: '/inventory/counts', type: 'Kho' },
    { label: 'Quản lý sản phẩm & SKU', sub: 'Danh mục • Giá bán lẻ/thùng', path: '/catalog/products', type: 'Sản phẩm' },
    { label: 'RPT083 - Báo cáo tồn kho NPP', sub: 'Tồn kho • Hạn dùng FEFO', path: '/inventory/rpt083', type: 'Báo cáo' },
    { label: 'Báo cáo KQKD (Profit & Loss)', sub: 'Tài chính • Doanh số & Giá vốn', path: '/reports/profit-and-loss', type: 'Kế toán' },
    { label: 'Ma trận Phân quyền (Roles)', sub: 'Quản trị • Phân quyền vai trò', path: '/admin/roles-permissions', type: 'Cài đặt' },
    { label: 'Quản lý người dùng', sub: 'Quản trị • Danh sách tài khoản', path: '/admin/users', type: 'Nhân sự' },
  ];

  const filteredQuickLinks = quickLinks.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sub.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectSearchResult = (path) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    navigate(path);
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPassAlert({ type: 'error', message: 'Mật khẩu xác nhận không khớp' });
      return;
    }
    if (newPassword.length < 6) {
      setPassAlert({ type: 'error', message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
      return;
    }
    try {
      setPassLoading(true);
      setPassAlert(null);
      await changePassword(oldPassword, newPassword);
      setPassAlert({ type: 'success', message: 'Đổi mật khẩu thành công!' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsChangePassOpen(false);
        setPassAlert(null);
      }, 2000);
    } catch (err) {
      setPassAlert({ type: 'error', message: err.message || 'Lỗi khi đổi mật khẩu' });
    } finally {
      setPassLoading(false);
    }
  };

  // Sinh Breadcrumbs theo URL
  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === '/') return [{ label: 'DMS-NPP TradeLedger', path: '/' }, { label: 'Bàn làm việc (Dashboard)', path: '/' }];
    if (path.startsWith('/admin/roles-permissions')) return [{ label: 'DMS-NPP TradeLedger', path: '/' }, { label: 'Quản trị', path: '/admin/roles-permissions' }, { label: 'Ma trận Phân quyền', path: '/admin/roles-permissions' }];
    if (path.startsWith('/admin/users')) return [{ label: 'DMS-NPP TradeLedger', path: '/' }, { label: 'Quản trị', path: '/admin/users' }, { label: 'Quản lý Người dùng', path: '/admin/users' }];
    if (path.startsWith('/sales/sales-orders')) return [{ label: 'DMS-NPP TradeLedger', path: '/' }, { label: 'Bán hàng', path: '/sales/sales-orders' }, { label: 'Đơn bán hàng (SO)', path: '/sales/sales-orders' }];
    if (path.startsWith('/purchase/receiving')) return [{ label: 'DMS-NPP TradeLedger', path: '/' }, { label: 'Mua hàng', path: '/purchase/purchase-orders' }, { label: 'Nhập kho mua hàng', path: '/purchase/receiving' }];
    if (path.startsWith('/purchase/purchase-orders')) return [{ label: 'DMS-NPP TradeLedger', path: '/' }, { label: 'Mua hàng', path: '/purchase/purchase-orders' }, { label: 'Đơn mua hàng (PO)', path: '/purchase/purchase-orders' }];
    if (path.startsWith('/inventory/transactions')) return [{ label: 'DMS-NPP TradeLedger', path: '/' }, { label: 'Kho bãi', path: '/inventory/transactions' }, { label: 'Nhật ký giao dịch kho', path: '/inventory/transactions' }];
    if (path.startsWith('/inventory/counts')) return [{ label: 'DMS-NPP TradeLedger', path: '/' }, { label: 'Kho bãi', path: '/inventory/counts' }, { label: 'Kiểm kê kho', path: '/inventory/counts' }];
    if (path.startsWith('/catalog/products')) return [{ label: 'DMS-NPP TradeLedger', path: '/' }, { label: 'Danh mục', path: '/catalog/products' }, { label: 'Sản phẩm & SKU', path: '/catalog/products' }];
    if (path.startsWith('/reports/profit-and-loss')) return [{ label: 'DMS-NPP TradeLedger', path: '/' }, { label: 'Tài chính', path: '/reports/profit-and-loss' }, { label: 'Báo cáo Lãi Lỗ (P&L)', path: '/reports/profit-and-loss' }];
    return [{ label: 'DMS-NPP TradeLedger', path: '/' }, { label: 'Phân hệ chức năng', path: '/' }];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="frappe-topbar">
      {/* Cụm Logo & Breadcrumbs (Bên trái) */}
      <div className="frappe-topbar-left">
        <Link to="/" className="frappe-logo-spindl" title="DMS-NPP TradeLedger Home">
          <div className="frappe-logo-icon-wrap">
            <Layers size={18} />
          </div>
          <span className="spindl-brand-title">DMS-NPP TradeLedger</span>
        </Link>

        {breadcrumbs.slice(1).map((crumb, idx) => (
          <span key={crumb.label + idx} className="frappe-breadcrumb-item">
            <span className="frappe-crumb-sep">›</span>
            <Link to={crumb.path} className="frappe-crumb-text">
              {crumb.label}
            </Link>
          </span>
        ))}
      </div>

      {/* Cụm Tìm kiếm, Chuông & User Avatar (Bên phải) */}
      <div className="frappe-topbar-right">
        {/* Command Search Box (Ctrl + K) */}
        <div className="frappe-search-box" onClick={() => setIsSearchOpen(true)} style={{ cursor: 'pointer' }}>
          <Search size={14} className="frappe-search-ico" />
          <input 
            type="text" 
            placeholder="Tìm kiếm chứng từ, SKU, chức năng… (Ctrl + K)"
            className="frappe-search-input"
            readOnly
            style={{ cursor: 'pointer' }}
          />
        </div>

        {/* Notifications Bell */}
        <div style={{ position: 'relative' }}>
          <button 
            type="button" 
            className="frappe-tool-btn" 
            title="Thông báo hệ thống" 
            onClick={() => {
              setIsNotifOpen(!isNotifOpen);
              setIsHelpOpen(false);
              setIsUserMenuOpen(false);
            }}
          >
            <Bell size={16} />
            <span className="frappe-notif-dot"></span>
          </button>

          {isNotifOpen && (
            <div className="frappe-dropdown-panel">
              <div className="frappe-panel-header">
                <h4>Thông báo hệ thống</h4>
                <span className="frappe-panel-badge">{notifications.length} mới</span>
              </div>
              <div className="frappe-panel-list">
                {notifications.map((n) => {
                  const Icon = n.icon;
                  return (
                    <div 
                      key={n.id} 
                      className="frappe-notif-item"
                      onClick={() => {
                        setIsNotifOpen(false);
                        navigate(n.path);
                      }}
                    >
                      <div className="frappe-notif-icon" style={{ backgroundColor: `${n.color}15`, color: n.color }}>
                        <Icon size={16} />
                      </div>
                      <div className="frappe-notif-content">
                        <span className="frappe-notif-title">{n.title}</span>
                        <span className="frappe-notif-desc">{n.desc}</span>
                        <span className="frappe-notif-time">{n.time}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Help dropdown */}
        <div style={{ position: 'relative' }}>
          <button 
            type="button" 
            className="frappe-help-btn" 
            onClick={() => {
              setIsHelpOpen(!isHelpOpen);
              setIsNotifOpen(false);
              setIsUserMenuOpen(false);
            }}
          >
            <span>Trợ giúp</span>
            <ChevronDown size={13} />
          </button>

          {isHelpOpen && (
            <div className="frappe-dropdown-panel" style={{ width: 260 }}>
              <div className="frappe-panel-header">
                <h4>Trung tâm Trợ giúp</h4>
              </div>
              <div style={{ padding: '6px 0' }}>
                <div 
                  className="frappe-help-item"
                  onClick={() => {
                    setIsHelpOpen(false);
                    alert('Hệ thống DMS-NPP TradeLedger phiên bản 1.0 Enterprise.\nĐược xây dựng theo quy chuẩn phân phối ISO/DMS.');
                  }}
                >
                  <BookOpen size={15} style={{ color: '#2563eb' }} />
                  <span>Hướng dẫn sử dụng</span>
                </div>
                <div 
                  className="frappe-help-item"
                  onClick={() => {
                    setIsHelpOpen(false);
                    setIsSearchOpen(true);
                  }}
                >
                  <Keyboard size={15} style={{ color: '#0891b2' }} />
                  <span>Tìm kiếm nhanh</span>
                  <span className="frappe-help-shortcut">Ctrl+K</span>
                </div>
                <div 
                  className="frappe-help-item"
                  onClick={() => {
                    setIsHelpOpen(false);
                    alert('Tổng đài hỗ trợ kỹ thuật: 1900-8888 (Nhánh 2: Hỗ trợ Kế toán & Vận hành)');
                  }}
                >
                  <PhoneCall size={15} style={{ color: '#16a34a' }} />
                  <span>Hỗ trợ kỹ thuật</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Web Bán Hàng Link */}
        <Link 
          to="/shop" 
          target="_blank"
          className="frappe-theme-review-badge"
          style={{ background: '#ecfdf5', color: '#047857', borderColor: '#a7f3d0' }}
          title="Mở Cổng đặt hàng trực tuyến (Web Bán Hàng /shop)"
        >
          <ShoppingCart size={14} />
          <span>Web Bán Hàng</span>
        </Link>

        {/* User Profile Avatar */}
        <div className="frappe-user-menu-container">
          <button 
            type="button" 
            className="frappe-avatar-btn"
            onClick={() => {
              setIsUserMenuOpen(!isUserMenuOpen);
              setIsNotifOpen(false);
              setIsHelpOpen(false);
            }}
            title={user?.email || 'Tài khoản người dùng'}
          >
            <div className="frappe-avatar-img">
              {(user?.fullName || user?.username || 'A').charAt(0).toUpperCase()}
            </div>
          </button>

          {isUserMenuOpen && (
            <div className="frappe-user-dropdown">
              <div className="frappe-user-header">
                <strong>{user?.fullName || user?.username || 'Administrator'}</strong>
                <span>{user?.email || 'admin@spindl.dms'}</span>
                <span style={{ fontSize: 10, color: '#2563eb', fontWeight: 600, marginTop: 2 }}>
                  {user?.roleName || user?.roleCode || 'QUẢN TRỊ'}
                </span>
              </div>
              <div className="frappe-dropdown-divider"></div>
              
              <button 
                type="button" 
                className="frappe-drop-item"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  setIsProfileOpen(true);
                }}
              >
                <User size={14} /> Hồ sơ cá nhân
              </button>

              <button 
                type="button" 
                className="frappe-drop-item"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  setIsChangePassOpen(true);
                }}
              >
                <KeyRound size={14} /> Đổi mật khẩu
              </button>

              <button 
                type="button" 
                className="frappe-drop-item"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  navigate('/admin/roles-permissions');
                }}
              >
                <Shield size={14} /> Phân quyền (Roles)
              </button>

              <div className="frappe-dropdown-divider"></div>
              <button type="button" className="frappe-drop-item text-danger" onClick={onLogout}>
                <LogOut size={14} /> Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>

      {/* QUICK SEARCH PALETTE MODAL (Ctrl + K) */}
      {isSearchOpen && (
        <div className="frappe-search-modal-overlay" onClick={() => setIsSearchOpen(false)}>
          <div className="frappe-search-modal" onClick={(e) => e.stopPropagation()}>
            <div className="frappe-search-modal-header">
              <Search size={18} style={{ color: '#2563eb' }} />
              <input
                type="text"
                autoFocus
                placeholder="Tìm nhanh chứng từ, phân hệ, SKU... (Gõ để tìm)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="frappe-search-modal-input"
              />
              <button 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                onClick={() => setIsSearchOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="frappe-search-results">
              <div className="frappe-search-category-title">Phân hệ & Chức năng hệ thống</div>
              {filteredQuickLinks.map((item, idx) => (
                <div 
                  key={idx} 
                  className="frappe-search-result-row"
                  onClick={() => handleSelectSearchResult(item.path)}
                >
                  <div className="frappe-search-result-main">
                    <span className="frappe-search-result-label">{item.label}</span>
                    <span className="frappe-search-result-sub">• {item.sub}</span>
                  </div>
                  <span className="frappe-search-result-type">{item.type}</span>
                </div>
              ))}
              {filteredQuickLinks.length === 0 && (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                  Không tìm thấy kết quả phù hợp với từ khóa "{searchQuery}"
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL HỒ SƠ CÁ NHÂN */}
      {isProfileOpen && (
        <div className="frappe-search-modal-overlay" onClick={() => setIsProfileOpen(false)}>
          <div className="frappe-profile-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Hồ sơ tài khoản</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }} onClick={() => setIsProfileOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700 }}>
                  {(user?.fullName || user?.username || 'A').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{user?.fullName || user?.username}</div>
                  <div style={{ color: '#64748b' }}>{user?.email || 'Chưa cập nhật email'}</div>
                </div>
              </div>
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8 }}>
                <span style={{ color: '#64748b' }}>Vai trò:</span>
                <span style={{ fontWeight: 600, color: '#2563eb' }}>{user?.roleName || user?.roleCode || 'N/A'}</span>
                <span style={{ color: '#64748b' }}>Tên đăng nhập:</span>
                <span style={{ fontWeight: 500 }}>{user?.username}</span>
                <span style={{ color: '#64748b' }}>Số điện thoại:</span>
                <span style={{ fontWeight: 500 }}>{user?.phone || 'Chưa cập nhật'}</span>
                <span style={{ color: '#64748b' }}>Nhà phân phối:</span>
                <span style={{ fontWeight: 500 }}>{user?.distributor?.name || 'INK.AD.NPP-TEST.01'}</span>
              </div>
            </div>
            <div style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button 
                type="button" 
                style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: 13 }}
                onClick={() => {
                  setIsProfileOpen(false);
                  setIsChangePassOpen(true);
                }}
              >
                Đổi mật khẩu
              </button>
              <button 
                type="button" 
                style={{ padding: '7px 14px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                onClick={() => setIsProfileOpen(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ĐỔI MẬT KHẨU */}
      {isChangePassOpen && (
        <div className="frappe-search-modal-overlay" onClick={() => setIsChangePassOpen(false)}>
          <div className="frappe-profile-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Đổi mật khẩu cá nhân</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }} onClick={() => setIsChangePassOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleChangePasswordSubmit}>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {passAlert && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: passAlert.type === 'success' ? '#dcfce7' : '#fee2e2',
                    color: passAlert.type === 'success' ? '#15803d' : '#b91c1c'
                  }}>
                    {passAlert.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span>{passAlert.message}</span>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>Mật khẩu hiện tại *</label>
                  <input
                    type="password"
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>Mật khẩu mới *</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>Xác nhận mật khẩu mới *</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, outline: 'none' }}
                  />
                </div>
              </div>
              <div style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button 
                  type="button" 
                  style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: 13 }}
                  onClick={() => setIsChangePassOpen(false)}
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  disabled={passLoading}
                  style={{ padding: '7px 16px', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                >
                  {passLoading ? 'Đang lưu...' : 'Cập nhật mật khẩu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};

export default FrappeHeader;
