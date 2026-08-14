import { Download, Printer, Filter, Calendar } from 'lucide-react';
import './RPT057.css';

const RPT057 = () => {
  return (
    <div className="report-container">
      <div className="report-header">
        <div className="report-title-section">
          <h2>RPT057 - Báo cáo doanh số và sản lượng</h2>
          <p>Dữ liệu tổng hợp doanh số bán hàng theo NPP (Nhà phân phối)</p>
        </div>
        <div className="report-actions">
          <button className="btn-secondary">
            <Filter size={16} /> Lọc nâng cao
          </button>
          <button className="btn-secondary">
            <Printer size={16} /> In báo cáo
          </button>
          <button className="btn-primary">
            <Download size={16} /> Xuất Excel
          </button>
        </div>
      </div>

      <div className="filters-card">
        <div className="filter-group">
          <label>Thời gian</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Calendar size={16} color="#64748b" style={{ position: 'absolute', left: '12px' }} />
            <select className="filter-select" style={{ paddingLeft: '36px', width: '100%' }}>
              <option>Tháng này (T8/2026)</option>
              <option>Tháng trước</option>
              <option>Quý này</option>
              <option>Tùy chỉnh...</option>
            </select>
          </div>
        </div>
        
        <div className="filter-group">
          <label>Khu vực</label>
          <select className="filter-select">
            <option>Tất cả khu vực</option>
            <option>Miền Bắc</option>
            <option>Miền Trung</option>
            <option>Miền Nam</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Nhà phân phối</label>
          <select className="filter-select">
            <option>-- Chọn NPP --</option>
            <option>NPP Trọng Đạt</option>
            <option>NPP Hoàng Kim</option>
          </select>
        </div>
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <h4 className="summary-card-title">Tổng Doanh Số (VNĐ)</h4>
          <p className="summary-card-value">12,450,000,000</p>
        </div>
        <div className="summary-card green">
          <h4 className="summary-card-title">Tổng Sản Lượng (Thùng)</h4>
          <p className="summary-card-value">45,230</p>
        </div>
        <div className="summary-card orange">
          <h4 className="summary-card-title">Số Đơn Hàng Thành Công</h4>
          <p className="summary-card-value">1,284</p>
        </div>
        <div className="summary-card purple">
          <h4 className="summary-card-title">Tỷ Lệ Đạt Target</h4>
          <p className="summary-card-value">94.5%</p>
        </div>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Mã NPP</th>
              <th>Tên NPP</th>
              <th>Khu Vực</th>
              <th>Sản Lượng (Thùng)</th>
              <th>Doanh Số (VNĐ)</th>
              <th>Đạt Target</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>NPP001</td>
              <td>NPP Trọng Đạt</td>
              <td>Miền Nam</td>
              <td>12,500</td>
              <td>3,500,000,000</td>
              <td><span className="status-badge success">Đạt</span></td>
            </tr>
            <tr>
              <td>NPP002</td>
              <td>NPP Hoàng Kim</td>
              <td>Miền Bắc</td>
              <td>8,450</td>
              <td>2,150,000,000</td>
              <td><span className="status-badge success">Đạt</span></td>
            </tr>
            <tr>
              <td>NPP003</td>
              <td>NPP Phú Hưng</td>
              <td>Miền Trung</td>
              <td>5,120</td>
              <td>1,200,000,000</td>
              <td><span className="status-badge" style={{backgroundColor: '#fee2e2', color: '#991b1b'}}>Không đạt</span></td>
            </tr>
            <tr>
              <td>NPP004</td>
              <td>NPP Tân Bình Phát</td>
              <td>Miền Nam</td>
              <td>19,160</td>
              <td>5,600,000,000</td>
              <td><span className="status-badge success">Đạt</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RPT057;
