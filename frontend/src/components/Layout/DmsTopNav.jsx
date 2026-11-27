import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Search,
  Bell,
  ChevronDown,
  ChevronRight,
  LogOut,
  User,
  Shield,
  Layers,
  ShoppingCart,
  TrendingUp,
  Truck,
  CheckSquare,
  BookOpen,
  Keyboard,
  PhoneCall,
  KeyRound,
  X,
  CheckCircle2,
  AlertCircle,
  Home,
  Box,
  FileText,
  PlusCircle,
  ClipboardCheck,
  Gift,
  BarChart3,
  PieChart,
  FileSpreadsheet,
  Calendar,
  Settings,
} from 'lucide-react';
import { changePassword } from '../../services/api';
import { hasPermission } from '../../utils/authPermission';
import './DmsTopNav.css';

const TOP_NAV_GROUPS = [
  {
    id: 'home',
    label: 'Trang chủ',
    path: '/',
    items: [],
  },
  {
    id: 'system',
    label: 'Hệ thống',
    requiredPermission: 'users_roles:manage',
    items: [
      { label: 'Ma trận Phân quyền (Roles)', path: '/admin/roles-permissions', icon: Shield, requiredPermission: 'users_roles:manage' },
      { label: 'Quản lý Người dùng', path: '/admin/users', icon: Settings, requiredPermission: 'users_roles:manage' },
    ],
  },
  {
    id: 'catalog',
    label: 'Danh mục',
    requiredPermission: 'master_data:view',
    items: [
      { label: 'Quản lý Sản phẩm & SKU', path: '/catalog/products', icon: Box, requiredPermission: 'master_data:view' },
    ],
  },
  {
    id: 'inventory',
    label: 'PH Kho hàng',
    requiredPermission: ['inventory:view', 'inventory_counts:view'],
    items: [
      { label: 'RPT083 - Báo cáo tồn kho NPP', path: '/inventory/rpt083', icon: BarChart3, requiredPermission: 'inventory:view' },
      { label: 'Nhật ký giao dịch kho', path: '/inventory/transactions', icon: FileText, requiredPermission: 'inventory:view' },
      { label: 'Kiểm kê kho hàng', path: '/inventory/counts', icon: ClipboardCheck, requiredPermission: 'inventory_counts:view' },
    ],
  },
  {
    id: 'purchase',
    label: 'PH Đặt hàng',
    requiredPermission: 'purchase_orders:view',
    items: [
      { label: 'Đơn đặt hàng mua (PO)', path: '/purchase/purchase-orders', icon: FileText, requiredPermission: 'purchase_orders:view' },
      { label: 'Lập đơn đặt mua mới', path: '/purchase/purchase-orders/create', icon: PlusCircle, requiredPermission: 'purchase_orders:create' },
      { label: 'Nhập kho mua hàng (D+3)', path: '/purchase/receiving', icon: Truck, requiredPermission: 'purchase_orders:receive' },
    ],
  },
  {
    id: 'sales',
    label: 'PH Bán hàng',
    requiredPermission: 'sales_orders:view',
    items: [
      { label: 'Danh sách đơn bán (SO)', path: '/sales/sales-orders', icon: FileText, requiredPermission: 'sales_orders:view' },
      { label: 'Lập đơn bán hàng mới', path: '/sales/sales-orders?create=true', icon: PlusCircle, requiredPermission: 'sales_orders:create' },
      { label: 'Kiểm tra thiếu tồn (RPT005)', path: '/sales/sales-orders?rpt005=true', icon: CheckSquare, requiredPermission: 'inventory:view' },
      { label: 'Chuyến xe & Điều phối giao', path: '/logistics/delivery-trips', icon: Truck, requiredPermission: 'delivery_trips:view' },
    ],
  },
  {
    id: 'promotions',
    label: 'Khuyến mãi',
    requiredPermission: 'sales_orders:view',
    path: '/promotions',
    items: [
      { label: 'Chương trình khuyến mãi', path: '/promotions', icon: Gift, requiredPermission: 'sales_orders:view' },
    ],
  },
  {
    id: 'routes',
    label: 'Tuyến bán hàng',
    items: [
      { label: 'Lập tuyến bán hàng (MCP)', path: '/operations/calendar', icon: Calendar },
      { label: 'Biểu đồ tiến độ công việc', path: '/operations/gantt', icon: Layers },
    ],
  },
  {
    id: 'reports',
    label: 'Tài chính & Báo cáo',
    requiredPermission: ['reports_finance:view', 'inventory:view'],
    items: [
      { label: 'Báo cáo KQKD (Profit & Loss)', path: '/reports/profit-and-loss', icon: PieChart, requiredPermission: 'reports_finance:view' },
      { label: 'RPT057 - Doanh số & Sản lượng', path: '/reports/rpt057', icon: BarChart3, requiredPermission: 'reports_finance:view' },
      { label: 'RPT061 - Chi tiết dòng hàng bán', path: '/reports/rpt061', icon: FileSpreadsheet, requiredPermission: 'reports_finance:view' },
      { label: 'RPT083 - Báo cáo tồn kho NPP', path: '/inventory/rpt083', icon: BarChart3, requiredPermission: 'inventory:view' },
    ],
  },
];

const QUICK_LINKS = [
  { label: 'Trang chủ Điều hành', sub: 'Bàn làm việc DMS', path: '/', type: 'Tổng quan' },
  { label: 'Danh sách Đơn bán hàng (SO)', sub: 'Bán hàng • Đơn chốt giao', path: '/sales/sales-orders', type: 'Bán hàng' },
  { label: 'Đơn đặt hàng mua (PO)', sub: 'Mua hàng • Đặt hàng NCC', path: '/purchase/purchase-orders', type: 'Đặt hàng' },
  { label: 'Chuyến xe & Điều phối giao', sub: 'Giao nhận • Đối soát COD', path: '/logistics/delivery-trips', type: 'Giao nhận' },
  { label: 'Chương trình Khuyến mãi', sub: 'Khuyến mãi • Chiết khấu & Tặng hàng', path: '/promotions', type: 'Khuyến mãi' },
  { label: 'Nhật ký giao dịch kho', sub: 'Kho bãi • Sổ giao dịch xuất nhập', path: '/inventory/transactions', type: 'Kho' },
  { label: 'Kiểm kê kho hàng', sub: 'Kho bãi • Đếm tồn thực tế', path: '/inventory/counts', type: 'Kho' },
  { label: 'Quản lý sản phẩm & SKU', sub: 'Danh mục • Giá bán lẻ/thùng', path: '/catalog/products', type: 'Danh mục' },
  { label: 'RPT083 - Báo cáo tồn kho NPP', sub: 'Tồn kho • Hạn dùng FEFO', path: '/inventory/rpt083', type: 'Báo cáo' },
  { label: 'RPT057 - Doanh số & Sản lượng', sub: 'Báo cáo • Theo SKU / Đại lý / VNBH', path: '/reports/rpt057', type: 'Báo cáo' },
  { label: 'RPT061 - Chi tiết dòng hàng bán', sub: 'Báo cáo • Bảng kê Line Item', path: '/reports/rpt061', type: 'Báo cáo' },
  { label: 'Báo cáo KQKD (Profit & Loss)', sub: 'Tài chính • Doanh thu & Giá vốn', path: '/reports/profit-and-loss', type: 'Tài chính' },
  { label: 'Ma trận Phân quyền (Roles)', sub: 'Quản trị • Phân quyền vai trò', path: '/admin/roles-permissions', type: 'Hệ thống' },
  { label: 'Quản lý người dùng', sub: 'Quản trị • Danh sách tài khoản', path: '/admin/users', type: 'Hệ thống' },
];

const isSubItemActive = (subPath, currentPathname, currentSearch) => {
  const [subBasePath, subQuery] = subPath.split('?');
  if (currentPathname !== subBasePath) return false;
  const currentParams = new URLSearchParams(currentSearch);
  if (subQuery) {
    const subParams = new URLSearchParams(subQuery);
    return Array.from(subParams.entries()).every(([k, v]) => currentParams.get(k) === v);
  }
  return currentParams.get('create') !== 'true' && currentParams.get('rpt005') !== 'true';
};

export default function DmsTopNav({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();

  const currentUser = user || (() => {
    try {
      const saved = localStorage.getItem('current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })();

  const [openMenuId, setOpenMenuId] = useState(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passAlert, setPassAlert] = useState(null);
  const [passLoading, setPassLoading] = useState(false);

  const closeMenuTimeout = useRef(null);
  const navContainerRef = useRef(null);

  const visibleGroups = useMemo(() => {
    return TOP_NAV_GROUPS
      .filter((group) => !group.requiredPermission || hasPermission(currentUser, group.requiredPermission))
      .map((group) => ({
        ...group,
        visibleItems: (group.items || []).filter(
          (item) => !item.requiredPermission || hasPermission(currentUser, item.requiredPermission),
        ),
      }))
      .filter((group) => group.id === 'home' || group.visibleItems.length > 0);
  }, [currentUser]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setOpenMenuId(null);
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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navContainerRef.current && !navContainerRef.current.contains(e.target)) {
        setOpenMenuId(null);
        setIsNotifOpen(false);
        setIsHelpOpen(false);
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notifications = [
    {
      id: 1,
      title: 'Đơn hàng mới từ Web Khách hàng',
      desc: 'Đơn hàng trực tuyến đang chờ Kế toán xác nhận & phân bổ.',
      time: '10 phút trước',
      icon: TrendingUp,
      color: '#0066da',
      path: '/sales/sales-orders',
    },
    {
      id: 2,
      title: 'Biên bản kiểm kê chờ phê duyệt',
      desc: 'Đợt kiểm kê kho NPP cần ký duyệt cân đối tồn kho.',
      time: '1 giờ trước',
      icon: CheckSquare,
      color: '#7c3aed',
      path: '/inventory/counts',
    },
    {
      id: 3,
      title: 'Chuyến xe nhập kho NCC đến hạn',
      desc: 'Chuyến xe nhập kho đang chờ thủ kho kiểm đếm nhận hàng.',
      time: 'Hôm nay',
      icon: Truck,
      color: '#059669',
      path: '/purchase/receiving',
    },
  ];

  const filteredQuickLinks = QUICK_LINKS.filter(
    (item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sub.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleGroupMouseEnter = (id) => {
    if (closeMenuTimeout.current) {
      clearTimeout(closeMenuTimeout.current);
      closeMenuTimeout.current = null;
    }
    setOpenMenuId(id);
  };

  const handleNavBarLeave = () => {
    closeMenuTimeout.current = setTimeout(() => {
      setOpenMenuId(null);
    }, 180);
  };

  const handleSelectPath = (path) => {
    setOpenMenuId(null);
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
      }, 1800);
    } catch (err) {
      setPassAlert({ type: 'error', message: err.message || 'Lỗi khi đổi mật khẩu' });
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="dms-topnav-wrapper" ref={navContainerRef}>
      {/* TẦNG 1: TOP UTILITY BAR (TRẮNG SẠCH KIOTVIET STYLE) */}
      <header className="dms-utility-bar">
        <div className="dms-utility-left">
          <Link to="/" className="dms-brand-link" title="Trang chủ DMS-NPP TradeLedger">
            <img src="/logo.png" alt="Logo DMS TradeLedger" className="dms-brand-logo" />
            <span className="dms-operator-name">DMS-NPP TradeLedger</span>
          </Link>
          <span className="dms-role-chip">
            {currentUser?.roleName || currentUser?.roleCode || 'DMS-NPP'}
          </span>
        </div>

        <div className="dms-utility-right">
          <button
            type="button"
            className="dms-quick-search-btn"
            onClick={() => setIsSearchOpen(true)}
            title="Tìm nhanh chức năng (Ctrl + K)"
          >
            <Search size={13} />
            <span>Tìm nhanh chức năng…</span>
            <kbd>Ctrl+K</kbd>
          </button>

          {/* Notifications */}
          <div className="dms-util-dropdown-wrap">
            <button
              type="button"
              className="dms-util-icon-btn"
              title="Thông báo hệ thống"
              onClick={() => {
                setIsNotifOpen(!isNotifOpen);
                setIsHelpOpen(false);
                setIsUserMenuOpen(false);
              }}
            >
              <Bell size={15} />
              <span className="dms-notif-dot" />
            </button>

            {isNotifOpen && (
              <div className="dms-dropdown-panel dms-notif-panel">
                <div className="dms-panel-header">
                  <h4>Thông báo hệ thống</h4>
                  <span className="dms-panel-badge">{notifications.length} mới</span>
                </div>
                <div className="dms-panel-list">
                  {notifications.map((n) => {
                    const Icon = n.icon;
                    return (
                      <div
                        key={n.id}
                        className="dms-notif-item"
                        onClick={() => {
                          setIsNotifOpen(false);
                          navigate(n.path);
                        }}
                      >
                        <div className="dms-notif-icon" style={{ backgroundColor: `${n.color}18`, color: n.color }}>
                          <Icon size={15} />
                        </div>
                        <div className="dms-notif-content">
                          <span className="dms-notif-title">{n.title}</span>
                          <span className="dms-notif-desc">{n.desc}</span>
                          <span className="dms-notif-time">{n.time}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Help */}
          <div className="dms-util-dropdown-wrap">
            <button
              type="button"
              className="dms-util-text-btn"
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
              <div className="dms-dropdown-panel dms-help-panel">
                <div className="dms-panel-header">
                  <h4>Trung tâm Trợ giúp</h4>
                </div>
                <div
                  className="dms-drop-item"
                  onClick={() => {
                    setIsHelpOpen(false);
                    alert('Hệ thống DMS-NPP TradeLedger phiên bản Enterprise.\nĐồng bộ quy chuẩn phân phối DMS.');
                  }}
                >
                  <BookOpen size={14} style={{ color: '#0066da' }} />
                  <span>Hướng dẫn sử dụng</span>
                </div>
                <div
                  className="dms-drop-item"
                  onClick={() => {
                    setIsHelpOpen(false);
                    setIsSearchOpen(true);
                  }}
                >
                  <Keyboard size={14} style={{ color: '#0891b2' }} />
                  <span>Tìm kiếm nhanh (Ctrl+K)</span>
                </div>
                <div
                  className="dms-drop-item"
                  onClick={() => {
                    setIsHelpOpen(false);
                    alert('Tổng đài hỗ trợ kỹ thuật: 1900-8888 (Nhánh 2: Hỗ trợ Kế toán & Vận hành)');
                  }}
                >
                  <PhoneCall size={14} style={{ color: '#059669' }} />
                  <span>Hỗ trợ kỹ thuật</span>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="dms-util-dropdown-wrap">
            <button
              type="button"
              className="dms-user-trigger"
              onClick={() => {
                setIsUserMenuOpen(!isUserMenuOpen);
                setIsNotifOpen(false);
                setIsHelpOpen(false);
              }}
              title={currentUser?.email || 'Tài khoản'}
            >
              <span className="dms-user-avatar">
                {(currentUser?.fullName || currentUser?.username || 'A').charAt(0).toUpperCase()}
              </span>
              <span className="dms-user-name">
                {currentUser?.fullName || currentUser?.username || 'Tài khoản'}
              </span>
              <ChevronDown size={13} />
            </button>

            {isUserMenuOpen && (
              <div className="dms-dropdown-panel dms-user-panel">
                <div className="dms-user-panel-head">
                  <strong>{currentUser?.fullName || currentUser?.username || 'Administrator'}</strong>
                  <span>{currentUser?.email || 'admin@dms.local'}</span>
                  <span className="dms-user-panel-role">
                    {currentUser?.roleName || currentUser?.roleCode || 'QUẢN TRỊ'}
                  </span>
                </div>
                <button
                  type="button"
                  className="dms-drop-item"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsProfileOpen(true);
                  }}
                >
                  <User size={14} /> Hồ sơ cá nhân
                </button>
                <button
                  type="button"
                  className="dms-drop-item"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsChangePassOpen(true);
                  }}
                >
                  <KeyRound size={14} /> Đổi mật khẩu
                </button>
                <button
                  type="button"
                  className="dms-drop-item"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    navigate('/admin/roles-permissions');
                  }}
                >
                  <Shield size={14} /> Phân quyền (Roles)
                </button>
                <div className="dms-drop-divider" />
                <button type="button" className="dms-drop-item is-danger" onClick={onLogout}>
                  <LogOut size={14} /> Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* TẦNG 2: HORIZONTAL MODULE MENU BAR (GIỐNG ẢNH MẪU) */}
      <nav
        className="dms-module-menubar"
        aria-label="Phân hệ DMS"
        onMouseLeave={handleNavBarLeave}
      >
        <div className="dms-module-menubar-inner">
          {visibleGroups.map((group) => {
            const isGroupActive =
              group.id === 'home'
                ? location.pathname === '/'
                : group.visibleItems.some((sub) => location.pathname === sub.path.split('?')[0]);
            const isOpen = openMenuId === group.id;

            return (
              <div
                key={group.id}
                className="dms-menu-group"
                onMouseEnter={() => {
                  if (group.visibleItems.length > 0) handleGroupMouseEnter(group.id);
                  else setOpenMenuId(null);
                }}
              >
                <button
                  type="button"
                  className={`dms-menu-trigger ${isGroupActive ? 'active' : ''} ${isOpen ? 'open' : ''}`}
                  onClick={() => {
                    if (group.path && group.visibleItems.length === 0) {
                      handleSelectPath(group.path);
                    } else if (group.visibleItems.length === 1 && group.path) {
                      handleSelectPath(group.path);
                    } else {
                      setOpenMenuId(isOpen ? null : group.id);
                    }
                  }}
                >
                  {group.id === 'home' ? (
                    <Home size={13} />
                  ) : (
                    <ChevronRight size={12} className="dms-menu-caret" />
                  )}
                  <span>{group.label}</span>
                </button>

                {isOpen && group.visibleItems.length > 0 && (
                  <div className="dms-submenu-dropdown">
                    {group.visibleItems.map((sub) => {
                      const SubIcon = sub.icon || FileText;
                      const active = isSubItemActive(sub.path, location.pathname, location.search);
                      return (
                        <button
                          key={sub.path}
                          type="button"
                          className={`dms-submenu-item ${active ? 'active' : ''}`}
                          onClick={() => handleSelectPath(sub.path)}
                        >
                          <SubIcon size={14} />
                          <span>{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Link
          to="/shop"
          target="_blank"
          className="dms-shop-cta-white"
          title="Mở Cổng đặt hàng trực tuyến (/shop)"
        >
          <ShoppingCart size={14} />
          <span>Web Bán Hàng</span>
        </Link>
      </nav>

      {/* QUICK SEARCH MODAL (Ctrl + K) */}
      {isSearchOpen && (
        <div className="modal-backdrop" onClick={() => setIsSearchOpen(false)}>
          <div className="dms-modal-box dms-search-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dms-search-modal-head">
              <Search size={17} style={{ color: '#0066da' }} />
              <input
                type="text"
                autoFocus
                placeholder="Tìm nhanh chứng từ, phân hệ, báo cáo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="dms-search-modal-input"
              />
              <button type="button" className="dms-modal-x-btn" onClick={() => setIsSearchOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="dms-search-results">
              {filteredQuickLinks.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  className="dms-search-result-row"
                  onClick={() => handleSelectPath(item.path)}
                >
                  <div className="dms-search-result-main">
                    <span className="dms-search-result-label">{item.label}</span>
                    <span className="dms-search-result-sub">• {item.sub}</span>
                  </div>
                  <span className="dms-search-result-type">{item.type}</span>
                </button>
              ))}
              {filteredQuickLinks.length === 0 && (
                <div className="dms-search-empty">
                  Không tìm thấy kết quả phù hợp với từ khóa "{searchQuery}"
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL HỒ SƠ CÁ NHÂN */}
      {isProfileOpen && (
        <div className="modal-backdrop" onClick={() => setIsProfileOpen(false)}>
          <div className="dms-modal-box dms-profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dms-modal-navy-head">
              <span>HỒ SƠ TÀI KHOẢN</span>
              <button type="button" className="dms-modal-x-light" onClick={() => setIsProfileOpen(false)}>
                <X size={15} />
              </button>
            </div>
            <div className="dms-profile-body">
              <div className="dms-profile-top">
                <div className="dms-profile-avatar-lg">
                  {(currentUser?.fullName || currentUser?.username || 'A').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="dms-profile-fullname">{currentUser?.fullName || currentUser?.username}</div>
                  <div className="dms-profile-email">{currentUser?.email || 'Chưa cập nhật email'}</div>
                </div>
              </div>
              <div className="dms-profile-grid">
                <span className="dms-profile-lbl">Vai trò:</span>
                <span className="dms-profile-val is-role">{currentUser?.roleName || currentUser?.roleCode || 'N/A'}</span>
                <span className="dms-profile-lbl">Tên đăng nhập:</span>
                <span className="dms-profile-val">{currentUser?.username}</span>
                <span className="dms-profile-lbl">Số điện thoại:</span>
                <span className="dms-profile-val">{currentUser?.phone || 'Chưa cập nhật'}</span>
                <span className="dms-profile-lbl">Nhà phân phối:</span>
                <span className="dms-profile-val">{currentUser?.distributor?.name || 'INK.AD.NPP-TEST.01'}</span>
              </div>
            </div>
            <div className="dms-modal-foot">
              <button
                type="button"
                className="dms-btn dms-btn-outline"
                onClick={() => {
                  setIsProfileOpen(false);
                  setIsChangePassOpen(true);
                }}
              >
                Đổi mật khẩu
              </button>
              <button
                type="button"
                className="dms-btn dms-btn-navy"
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
        <div className="modal-backdrop" onClick={() => setIsChangePassOpen(false)}>
          <div className="dms-modal-box dms-profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dms-modal-navy-head">
              <span>ĐỔI MẬT KHẨU CÁ NHÂN</span>
              <button type="button" className="dms-modal-x-light" onClick={() => setIsChangePassOpen(false)}>
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleChangePasswordSubmit}>
              <div className="dms-profile-body">
                {passAlert && (
                  <div className={`dms-pass-alert ${passAlert.type}`}>
                    {passAlert.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span>{passAlert.message}</span>
                  </div>
                )}
                <div className="dms-form-field">
                  <label>Mật khẩu hiện tại *</label>
                  <input
                    type="password"
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="dms-input"
                  />
                </div>
                <div className="dms-form-field">
                  <label>Mật khẩu mới *</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="dms-input"
                  />
                </div>
                <div className="dms-form-field">
                  <label>Xác nhận mật khẩu mới *</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="dms-input"
                  />
                </div>
              </div>
              <div className="dms-modal-foot">
                <button
                  type="button"
                  className="dms-btn dms-btn-outline"
                  onClick={() => setIsChangePassOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={passLoading}
                  className="dms-btn dms-btn-steel"
                >
                  {passLoading ? 'Đang lưu...' : 'Cập nhật mật khẩu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
