import { Search, ArrowRight, User, LayoutGrid, Database, List as ListIcon } from 'lucide-react';
import './Home.css';

const Home = ({ user }) => {
  return (
    <div className="home-container">
      {/* Banner Area */}
      <div className="banner-card">
        <div className="banner-content">
          <h2 className="banner-title">ONETECH PLATFORM</h2>
          <p className="banner-subtitle">Hệ thống quản lý OneTech Platform</p>
        </div>
        {/* Placeholder for illustration */}
        <div className="banner-illustration" style={{ display: 'flex', alignItems: 'flex-end', opacity: 0.8 }}>
           <img src="https://img.freepik.com/free-vector/ecommerce-web-page-concept-illustration_114360-8204.jpg" alt="Illustration" style={{height: '100%', objectFit: 'contain', mixBlendMode: 'multiply'}} />
        </div>
      </div>

      {/* Profile & Stats Overlay */}
      <div className="profile-stats-card">
        <div className="profile-info">
          <div className="profile-avatar-large">
            <User size={32} color="#a0b2c6" />
          </div>
          <div className="profile-details">
            <h3>{user?.name || user?.email || 'ADMIN NPP TRIỂN KHAI INK 11'}</h3>
            <p>Distributor Admin</p>
          </div>
        </div>

        <div className="stats-container">
          <div className="stat-item">
            <div className="stat-value">0</div>
            <div className="stat-label">Site quản lý</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">10</div>
            <div className="stat-label">Chức năng</div>
          </div>
        </div>

        <div className="profile-action">
          <button className="btn-blue">
            Thông tin tài khoản <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="search-section">
        <div className="search-input-wrapper">
          <input type="text" className="search-input" placeholder="Tìm chức năng" />
        </div>
        <button className="search-button">
          <Search size={18} />
        </button>
      </div>

      {/* Dashboard Sections */}
      <div className="dashboard-section">
        <h3 className="section-title">BÁO CÁO</h3>
        <div className="cards-grid">
          <div className="dashboard-card">
            <LayoutGrid className="card-icon" size={20} />
            <span className="card-title">RPT156 - Báo cáo hỗ trợ nhân viên</span>
          </div>
          <div className="dashboard-card">
            <LayoutGrid className="card-icon" size={20} />
            <span className="card-title">RPT090 - Báo cáo lương DDKD</span>
          </div>
          <div className="dashboard-card">
            <LayoutGrid className="card-icon" size={20} />
            <span className="card-title">Rpt204 - Chi tiết thưởng nhân viên</span>
          </div>
        </div>
      </div>

      <div className="dashboard-section">
        <h3 className="section-title">QUẢN LÝ PPO</h3>
        <div className="cards-grid">
          <div className="dashboard-card">
            <Database className="card-icon" size={20} />
            <span className="card-title">Quản lý PPO</span>
          </div>
          <div className="dashboard-card">
            <Database className="card-icon" size={20} />
            <span className="card-title">Báo cáo theo dõi PPO</span>
          </div>
        </div>
      </div>
      
      <div className="dashboard-section">
        <h3 className="section-title">DANH SÁCH PO NPP</h3>
        <div className="cards-grid">
          <div className="dashboard-card">
            <ListIcon className="card-icon" size={20} />
            <span className="card-title">Danh sách PO NPP</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Home;
