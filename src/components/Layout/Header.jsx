import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Bell, Settings, User, LogOut } from 'lucide-react';
import './Layout.css';

const Header = ({ user, onLogout }) => {
  return (
    <header className="app-header">
      <div className="header-left">
        <div className="header-logo">
          <div className="header-logo-icon">i</div>
          <span>iTHAN</span>
        </div>
        
        <nav className="header-nav">
          <div className="nav-item">
            <Link to="/" className="nav-link active">
              Trang chủ | Công việc
            </Link>
          </div>
          
          <div className="nav-item">
            <div className="nav-link">
              Yêu cầu | Hỗ trợ
            </div>
            <div className="nav-dropdown">
              <Link to="#" className="dropdown-item">Tạo yêu cầu mới</Link>
              <Link to="#" className="dropdown-item">Danh sách yêu cầu</Link>
            </div>
          </div>
          
          <div className="nav-item">
            <div className="nav-link">
              Bán hàng | Quản lý
            </div>
            <div className="nav-dropdown">
              <Link to="/sales/sales-orders" className="dropdown-item">Quản lý SO</Link>
              <Link to="#" className="dropdown-item">Quản lý PPO</Link>
              <Link to="#" className="dropdown-item">Danh sách PO NPP</Link>
              <Link to="#" className="dropdown-item">Quản lý đặt hàng</Link>
            </div>
          </div>

          <div className="nav-item">
            <div className="nav-link">
              Tồn kho | Quản lý
            </div>
            <div className="nav-dropdown">
              <Link to="/inventory/rpt083" className="dropdown-item">RPT083 - Báo cáo tồn kho NPP</Link>
              <Link to="#" className="dropdown-item">Điều chỉnh tồn kho</Link>
              <Link to="#" className="dropdown-item">Điều chuyển hàng</Link>
              <Link to="#" className="dropdown-item">Kiểm kê</Link>
            </div>
          </div>
        </nav>
      </div>

      <div className="header-right">
        <div className="header-search">
          <Search size={16} />
          <input type="text" placeholder="Tìm kiếm theo tiêu đề, yêu cầu..." />
        </div>
        
        <button className="header-action">
          <Bell size={18} />
        </button>
        
        <button className="header-action">
          <Settings size={18} />
        </button>
        
        <div className="user-profile-header">
          <div className="user-info-header">
            <span className="user-name-header">{user?.fullName || 'Admin NPP'}</span>
            <span className="user-sub-header">INK.AD.G-10KF1292.04</span>
          </div>
          <div className="user-avatar">
            <User size={18} />
          </div>
        </div>

        <button className="header-action" onClick={onLogout} title="Đăng xuất" style={{ marginLeft: '12px', color: '#ef4444' }}>
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
};

export default Header;
