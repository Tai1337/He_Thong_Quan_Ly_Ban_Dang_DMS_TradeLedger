import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  LayoutDashboard, 
  CreditCard, 
  List, 
  ShoppingCart, 
  Package, 
  Truck, 
  TrendingUp, 
  Calendar, 
  Box,
  RotateCcw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import './Layout.css';

const salesSubMenu = [
  { id: 'sub-dhgh', label: 'Đơn hàng giao hộ' },
  { id: 'sub-dsdhb', label: 'Danh sách đơn hàng bán theo NPP', path: '/sales/sales-orders' },
  { id: 'sub-reject', label: 'Reject khuyến mãi' },
  { id: 'sub-qlgh', label: 'Quản lý giao hàng' },
  { id: 'rpt057', label: 'RPT057 - Báo cáo doanh số và sản lượng', path: '/reports/rpt057' },
  { id: 'rpt011', label: 'RPT011 - Báo cáo doanh số theo cửa hàng' },
  { id: 'sub-dsx', label: 'Danh sách xe - NVGH' },
  { id: 'sub-ldkbh', label: 'Lý do không bán hàng' },
  { id: 'rpt061', label: 'RPT061 - Báo cáo LineItem' },
  { id: 'rpt214', label: 'RPT214 - DS đơn thu hồi CH' },
  { id: 'rpt007', label: 'RPT007 - Công nợ NVGH' },
  { id: 'sub-bcbh', label: 'Báo cáo bán hàng theo nhân viên' },
  { id: 'rpt223', label: 'RPT223 - Báo cáo tổng kết đơn hàng và thanh toán' },
  { id: 'rpt060', label: 'RPT060 - Báo cáo thống kê đơn hàng chưa xử lý' },
];

const inventorySubMenu = [
  { id: 'inv-adj', label: 'Điều chỉnh tồn kho' },
  { id: 'inv-transfer', label: 'Điều chuyển hàng' },
  { id: 'inv-count', label: 'Kiểm kê' },
  { id: 'inv-history', label: 'Danh sách giao dịch kho' },
  { id: 'inv-detail', label: 'Tra cứu tồn kho chi tiết' },
  { id: 'rpt083', label: 'RPT083 - Báo cáo tồn kho NPP', path: '/inventory/rpt083' },
  { id: 'rpt049', label: 'RPT049 - Báo cáo nhập xuất tồn' },
  { id: 'oos-track', label: 'Báo cáo OOS tracking' },
];

const menuItems = [
  { id: 'home', icon: Home, label: 'Trang chủ', path: '/' },
  { id: 'sales', icon: TrendingUp, label: 'Quản lý bán hàng', hasSub: true, subItems: salesSubMenu },
  { id: 'inventory', icon: Box, label: 'Quản lý tồn kho', hasSub: true, subItems: inventorySubMenu },
];

const Sidebar = () => {
  const [expandedMenus, setExpandedMenus] = useState({ 'sales': true });
  const navigate = useNavigate();
  const location = useLocation();

  const toggleMenu = (id) => {
    setExpandedMenus(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleNav = (path) => {
    if (path) navigate(path);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <h2 style={{color: '#0b3d70', margin: 0, fontSize: '20px', fontWeight: 'bold'}}>MASAN <span style={{color: '#1a73e8'}}>GROUP</span></h2>
      </div>
      <div className="sidebar-menu">
        {menuItems.map(item => {
          const isExpanded = expandedMenus[item.id];
          const isActive = location.pathname === item.path || (item.subItems && item.subItems.some(sub => location.pathname === sub.path));

          return (
            <div key={item.id} className="sidebar-menu-group">
              <div 
                className={`sidebar-menu-item ${isActive && !item.hasSub ? 'active' : ''}`}
                onClick={() => {
                  if (item.hasSub) toggleMenu(item.id);
                  else handleNav(item.path);
                }}
              >
                <item.icon className="menu-icon" />
                <span>{item.label}</span>
                {item.hasSub && (
                  isExpanded ? <ChevronUp className="chevron-icon" /> : <ChevronDown className="chevron-icon" />
                )}
              </div>
              
              {/* Sub Menu */}
              {item.hasSub && isExpanded && item.subItems && (
                <div className="sidebar-submenu">
                  {item.subItems.map(subItem => (
                    <div 
                      key={subItem.id} 
                      className={`sidebar-submenu-item ${location.pathname === subItem.path ? 'active' : ''}`}
                      onClick={() => handleNav(subItem.path)}
                    >
                      {subItem.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Sidebar;
