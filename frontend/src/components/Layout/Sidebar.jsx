import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  ShoppingCart, 
  Package, 
  Truck, 
  TrendingUp, 
  Calendar, 
  Box,
  PieChart,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import './Layout.css';

const catalogSubMenu = [
  { id: 'cat-products', label: 'Quản lý sản phẩm & SKU', path: '/catalog/products' },
];

const buyingSubMenu = [
  { id: 'buy-po', label: 'Đơn đặt hàng mua (PO)', path: '/purchase/purchase-orders' },
  { id: 'buy-receiving', label: 'Nhập kho mua hàng', path: '/purchase/receiving' },
];

const salesSubMenu = [
  { id: 'sales-so', label: 'Danh sách đơn hàng bán (SO)', path: '/sales/sales-orders' },
  { id: 'sales-promotions', label: 'Chương trình khuyến mãi', path: '/promotions' },
  { id: 'sales-trips', label: 'Chuyến xe & Điều phối giao', path: '/logistics/delivery-trips' },
  { id: 'sales-rpt057', label: 'RPT057 - Doanh số & Sản lượng', path: '/reports/rpt057' },
];

const inventorySubMenu = [
  { id: 'inv-transactions', label: 'Nhật ký giao dịch kho', path: '/inventory/transactions' },
  { id: 'inv-count', label: 'Kiểm kê kho hàng', path: '/inventory/counts' },
  { id: 'inv-rpt083', label: 'RPT083 - Báo cáo tồn kho NPP', path: '/inventory/rpt083' },
];

const routesSubMenu = [
  { id: 'routes-mcp', label: 'Lập tuyến bán hàng (MCP)', path: '/operations/calendar' },
];

const pnlSubMenu = [
  { id: 'pnl-statement', label: 'Báo cáo KQKD (Profit & Loss)', path: '/reports/profit-and-loss' },
  { id: 'sales-rpt057', label: 'RPT057 - Doanh số & Sản lượng', path: '/reports/rpt057' },
  { id: 'sales-rpt061', label: 'RPT061 - Chi tiết dòng hàng bán', path: '/reports/rpt061' },
];

const adminSubMenu = [
  { id: 'admin-roles', label: 'Ma trận Phân quyền (Roles)', path: '/admin/roles-permissions' },
  { id: 'admin-users', label: 'Quản lý người dùng', path: '/admin/users' },
];

const menuItems = [
  { id: 'home', icon: Home, label: 'Trang chủ', path: '/' },
  { id: 'catalog', icon: Package, label: 'Sản phẩm & SKU', hasSub: true, subItems: catalogSubMenu },
  { id: 'buying', icon: ShoppingCart, label: 'Mua hàng (PO)', hasSub: true, subItems: buyingSubMenu },
  { id: 'sales', icon: TrendingUp, label: 'Bán hàng (SO)', hasSub: true, subItems: salesSubMenu },
  { id: 'inventory', icon: Box, label: 'Quản lý tồn kho', hasSub: true, subItems: inventorySubMenu },
  { id: 'routes', icon: Calendar, label: 'Tuyến bán hàng', hasSub: true, subItems: routesSubMenu },
  { id: 'pnl', icon: PieChart, label: 'Tài chính & P&L', hasSub: true, subItems: pnlSubMenu },
  { id: 'admin', icon: ShieldCheck, label: 'Quản trị hệ thống', hasSub: true, subItems: adminSubMenu },
];

const Sidebar = () => {
  const [expandedMenus, setExpandedMenus] = useState({ 'catalog': true, 'sales': false });
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
