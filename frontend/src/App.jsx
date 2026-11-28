import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Login from './pages/Login/Login';
import Home from './pages/Home/Home';
import RPT057 from './pages/Reports/RPT057/RPT057';
import RPT061 from './pages/Reports/RPT061/RPT061';
import RPT083 from './pages/Inventory/RPT083/RPT083';
import InventoryCountList from './pages/Inventory/InventoryCount/InventoryCountList';
import InventoryCountDetail from './pages/Inventory/InventoryCount/InventoryCountDetail';
import InventoryTransactions from './pages/Inventory/InventoryTransactions/InventoryTransactions';
import SalesOrderList from './pages/Sales/SalesOrderList/SalesOrderList';
import SalesOrderDetail from './pages/Sales/SalesOrderList/SalesOrderDetail';
import PurchaseOrderList from './pages/Purchase/PurchaseOrderList/PurchaseOrderList';
import PurchaseOrderDetail from './pages/Purchase/PurchaseOrderDetail/PurchaseOrderDetail';
import PurchaseOrderFormPage from './pages/Purchase/PurchaseOrderForm/PurchaseOrderFormPage';
import PurchaseReceivingList from './pages/Purchase/PurchaseReceiving/PurchaseReceivingList';
import ProfitLossStatement from './pages/Accounting/ProfitLossStatement/ProfitLossStatement';
import JobCardCalendar from './pages/Operations/JobCardCalendar/JobCardCalendar';
import TaskGantt from './pages/Operations/TaskGantt/TaskGantt';
import ThemeReview from './pages/ThemeReview/ThemeReview';
import DeliveryTripList from './pages/Logistics/DeliveryTripList';
import DeliveryTripDetail from './pages/Logistics/DeliveryTripDetail';
import ShopHome from './pages/Shop/ShopHome';
import ShopProductDetail from './pages/Shop/ShopProductDetail';
import ProductManagement from './pages/Catalog/ProductManagement/ProductManagement';
import RolesPermissions from './pages/Admin/RolesPermissions/RolesPermissions';
import UserManagement from './pages/Admin/UserManagement/UserManagement';
import PromotionList from './pages/Promotions/PromotionList';
import Layout from './components/Layout/Layout';
import ErrorBoundary from './components/Common/ErrorBoundary';
import ProtectedRoute from './components/Common/ProtectedRoute';
import { NotificationProvider, useNotification } from './components/Common/NotificationProvider';
import WarehouseDashboard from './pages/Warehouse/WarehouseDashboard';
import WarehouseStocktakeList from './pages/Warehouse/Stocktake/WarehouseStocktakeList';
import WarehouseStocktakeDetail from './pages/Warehouse/Stocktake/WarehouseStocktakeDetail';
import WarehouseDeliveryList from './pages/Warehouse/Delivery/WarehouseDeliveryList';
import WarehouseDeliveryDetail from './pages/Warehouse/Delivery/WarehouseDeliveryDetail';
import WarehouseNotifications from './pages/Warehouse/WarehouseNotifications';
import './index.css';

function RealtimeSocketBridge({ user, onForceLogout }) {
  const { notify } = useNotification();

  useEffect(() => {
    let socket;
    if (user) {
      socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001');
      socket.emit('register', {
        username: user.email || user.username,
        userId: user.id,
      });

      socket.on('FORCE_LOGOUT', (data) => {
        alert(data.reason);
        onForceLogout();
      });

      socket.on('notification', (data) => {
        window.dispatchEvent(new CustomEvent('dms:notification', { detail: data }));
        if (data?.title) {
          notify.info(`${data.title}: ${data.body || ''}`);
        }
      });
    }
    return () => {
      if (socket) socket.disconnect();
    };
  }, [user]);

  return null;
}

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('current_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('current_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('current_user');
    localStorage.removeItem('access_token');
  };

  return (
    <NotificationProvider>
      <RealtimeSocketBridge user={user} onForceLogout={handleLogout} />
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
        {/* Cổng Đặt Hàng Trực Tuyến (Public Web Bán Hàng) */}
        <Route path="/shop" element={<ShopHome />} />
        <Route path="/shop/product/:id" element={<ShopProductDetail />} />

        <Route 
          path="/login" 
          element={
            !user ? (
              <Login onLogin={handleLogin} />
            ) : (
              <Navigate to={user.roleCode === 'WAREHOUSE_KEEPER' ? '/warehouse' : '/'} replace />
            )
          } 
        />
        <Route 
          path="/" 
          element={
            user ? (
              user.roleCode === 'WAREHOUSE_KEEPER' ? (
                <Navigate to="/warehouse" replace />
              ) : (
                <Layout user={user} onLogout={handleLogout}>
                  <Home user={user} />
                </Layout>
              )
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        <Route 
          path="/catalog/products" 
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <ProductManagement />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        <Route 
          path="/catalog/promotions" 
          element={<Navigate to="/promotions" replace />} 
        />
        <Route 
          path="/sales/sales-orders" 
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <SalesOrderList />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        <Route 
          path="/sales/sales-orders/:id" 
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <SalesOrderDetail />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        <Route 
          path="/promotions" 
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <PromotionList />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        <Route 
          path="/logistics/delivery-trips" 
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <DeliveryTripList />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        <Route 
          path="/logistics/delivery-trips/:id" 
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <DeliveryTripDetail />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        <Route 
          path="/logistics/trips" 
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <DeliveryTripList />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        <Route 
          path="/sales/delivery-trips" 
          element={<Navigate to="/logistics/delivery-trips" />} 
        />
        <Route 
          path="/purchase/purchase-orders" 
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <PurchaseOrderList />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        <Route 
          path="/purchase/purchase-orders/create" 
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <PurchaseOrderFormPage mode="create" />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        <Route 
          path="/purchase/purchase-orders/:id/edit" 
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <PurchaseOrderFormPage mode="edit" />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        <Route 
          path="/purchase/purchase-orders/:id" 
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <PurchaseOrderDetail />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        <Route 
          path="/purchase/receiving" 
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <PurchaseReceivingList />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        <Route 
          path="/reports/rpt057" 
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <RPT057 />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        <Route 
          path="/reports/rpt061" 
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <RPT061 />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        <Route 
          path="/inventory/rpt083" 
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <RPT083 user={user} />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        <Route 
          path="/inventory/transactions" 
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <InventoryTransactions />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        <Route 
          path="/inventory/counts" 
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <InventoryCountList />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        <Route 
          path="/inventory/counts/:id" 
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <InventoryCountDetail />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        <Route 
          path="/accounting/pnl" 
          element={<Navigate to="/reports/profit-and-loss" replace />} 
        />
        <Route 
          path="/reports/profit-and-loss" 
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <ProfitLossStatement />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        <Route 
          path="/operations/calendar" 
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <JobCardCalendar />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        <Route 
          path="/operations/gantt" 
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <TaskGantt />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        <Route 
          path="/theme-review" 
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <ThemeReview />
              </Layout>
            ) : (
              <ThemeReview />
            )
          } 
        />
        <Route 
          path="/admin/roles-permissions" 
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <RolesPermissions />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        <Route 
          path="/admin/users" 
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <UserManagement />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        {/* Warehouse Staff Routes */}
        <Route
          path="/warehouse"
          element={
            <ProtectedRoute user={user} allowedRoles={['WAREHOUSE_KEEPER', 'ADMIN']}>
              <Layout user={user} onLogout={handleLogout}>
                <WarehouseDashboard user={user} />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/warehouse/stocktake"
          element={
            <ProtectedRoute user={user} allowedRoles={['WAREHOUSE_KEEPER', 'ADMIN']}>
              <Layout user={user} onLogout={handleLogout}>
                <WarehouseStocktakeList user={user} />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/warehouse/stocktake/:id"
          element={
            <ProtectedRoute user={user} allowedRoles={['WAREHOUSE_KEEPER', 'ADMIN']}>
              <Layout user={user} onLogout={handleLogout}>
                <WarehouseStocktakeDetail user={user} />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/warehouse/delivery"
          element={
            <ProtectedRoute user={user} allowedRoles={['WAREHOUSE_KEEPER', 'ADMIN']}>
              <Layout user={user} onLogout={handleLogout}>
                <WarehouseDeliveryList user={user} />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/warehouse/delivery/:id"
          element={
            <ProtectedRoute user={user} allowedRoles={['WAREHOUSE_KEEPER', 'ADMIN']}>
              <Layout user={user} onLogout={handleLogout}>
                <WarehouseDeliveryDetail user={user} />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/warehouse/notifications"
          element={
            <ProtectedRoute user={user} allowedRoles={['WAREHOUSE_KEEPER', 'ADMIN']}>
              <Layout user={user} onLogout={handleLogout}>
                <WarehouseNotifications user={user} />
              </Layout>
            </ProtectedRoute>
          }
        />
        {/* Catch-all route: Redirect everything else to Home (which then checks login) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </NotificationProvider>
  );
}

export default App;
