import { Link, useLocation } from 'react-router-dom';
import { 
  Search, 
  Bell, 
  Settings, 
  User, 
  LogOut, 
  Layers, 
  TrendingUp, 
  ShoppingCart, 
  Box, 
  Truck, 
  FileText, 
  PlusCircle, 
  BarChart3, 
  SlidersHorizontal, 
  CheckSquare,
  HelpCircle,
  Home
} from 'lucide-react';
import './Layout.css';

const Header = ({ user, onLogout }) => {
  const location = useLocation();

  const isHomeActive = location.pathname === '/';
  const isSalesActive = location.pathname.startsWith('/sales') || location.pathname.startsWith('/reports');
  const isPurchaseActive = location.pathname.startsWith('/purchase');
  const isInventoryActive = location.pathname.startsWith('/inventory');

  return (
    <header className="app-header">
      <div className="header-left">
        <Link to="/" className="header-logo">
          <div className="header-logo-icon">
            <Layers size={18} />
          </div>
          <div className="header-logo-text">
            <span className="brand-name">DMS-NPP</span>
            <span className="brand-sub">TradeLedger</span>
          </div>
        </Link>
        
        <nav className="header-nav">
          <div className="nav-item">
            <Link to="/" className={`nav-link ${isHomeActive ? 'active' : ''}`}>
              <Home size={15} />
              <span>Trang chủ</span>
            </Link>
          </div>
          
          <div className="nav-item">
            <Link 
              to="/sales/sales-orders" 
              className={`nav-link ${isSalesActive ? 'active' : ''}`}
            >
              <TrendingUp size={15} />
              <span>Bán hàng (SO)</span>
            </Link>
            <div className="nav-dropdown">
              <Link to="/sales/sales-orders" className="dropdown-item">
                <FileText size={15} className="dropdown-icon" />
                <span>Quản lý Đơn hàng bán (SO)</span>
              </Link>
              <Link to="/sales/sales-orders?create=true" className="dropdown-item">
                <PlusCircle size={15} className="dropdown-icon" />
                <span>Lập đơn bán hàng (BH_BM1)</span>
              </Link>
              <Link to="/sales/sales-orders?rpt005=true" className="dropdown-item">
                <CheckSquare size={15} className="dropdown-icon" />
                <span>Kiểm tra thiếu tồn kho (RPT005)</span>
              </Link>
              <Link to="/reports/rpt057" className="dropdown-item">
                <BarChart3 size={15} className="dropdown-icon" />
                <span>Báo cáo doanh số & sản lượng (RPT057)</span>
              </Link>
            </div>
          </div>

          <div className="nav-item">
            <Link 
              to="/purchase/purchase-orders" 
              className={`nav-link ${isPurchaseActive ? 'active' : ''}`}
            >
              <ShoppingCart size={15} />
              <span>Mua hàng (PO)</span>
            </Link>
            <div className="nav-dropdown">
              <Link to="/purchase/purchase-orders" className="dropdown-item">
                <FileText size={15} className="dropdown-icon" />
                <span>Quản lý Đơn đặt hàng mua (PO)</span>
              </Link>
              <Link to="/purchase/ppo" className="dropdown-item dropdown-item-featured">
                <FileText size={15} className="dropdown-icon text-blue" />
                <span><strong>Đề xuất đặt hàng (PPO)</strong></span>
              </Link>
              <Link to="/purchase/receiving" className="dropdown-item dropdown-item-success">
                <Truck size={15} className="dropdown-icon text-green" />
                <span><strong>Nhập kho mua hàng</strong></span>
              </Link>
              <Link to="/purchase/purchase-orders?create=true" className="dropdown-item">
                <PlusCircle size={15} className="dropdown-icon" />
                <span>Lập Đơn đặt hàng mua (PO)</span>
              </Link>
            </div>
          </div>

          <div className="nav-item">
            <Link 
              to="/inventory/rpt083" 
              className={`nav-link ${isInventoryActive ? 'active' : ''}`}
            >
              <Box size={15} />
              <span>Tồn kho</span>
            </Link>
            <div className="nav-dropdown">
              <Link to="/inventory/rpt083" className="dropdown-item">
                <BarChart3 size={15} className="dropdown-icon" />
                <span>RPT083 - Báo cáo tồn kho NPP</span>
              </Link>
              <Link to="/sales/sales-orders?rpt005=true" className="dropdown-item">
                <SlidersHorizontal size={15} className="dropdown-icon" />
                <span>Kiểm soát phân bổ FEFO</span>
              </Link>
            </div>
          </div>

          <div className="nav-item">
            <div className="nav-link nav-link-muted">
              <HelpCircle size={15} />
              <span>Hỗ trợ</span>
            </div>
            <div className="nav-dropdown">
              <Link to="#" className="dropdown-item">
                <span>Hướng dẫn quy trình 09:00 - 11:00</span>
              </Link>
              <Link to="#" className="dropdown-item">
                <span>Hỗ trợ kỹ thuật & Đổi trả</span>
              </Link>
            </div>
          </div>
        </nav>
      </div>

      <div className="header-right">
        <div className="header-search">
          <Search size={15} />
          <input type="text" placeholder="Tìm đơn, SKU, chuyến xe..." />
        </div>
        
        <button className="header-action" title="Thông báo hệ thống">
          <Bell size={17} />
        </button>
        
        <button className="header-action" title="Cài đặt">
          <Settings size={17} />
        </button>
        
        <div className="user-profile-header">
          <div className="user-info-header">
            <span className="user-name-header">{user?.fullName || user?.username || 'Admin NPP'}</span>
            <span className="user-sub-header">{user?.role || 'DISTRIBUTOR_ADMIN'}</span>
          </div>
          <div className="user-avatar">
            <User size={16} />
          </div>
        </div>

        <button 
          className="header-action logout-btn" 
          onClick={onLogout} 
          title="Đăng xuất khỏi hệ thống"
        >
          <LogOut size={17} />
        </button>
      </div>
    </header>
  );
};

export default Header;
