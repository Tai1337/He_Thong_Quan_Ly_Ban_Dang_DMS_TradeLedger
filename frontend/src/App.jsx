import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Login from './pages/Login/Login';
import Home from './pages/Home/Home';
import RPT057 from './pages/Reports/RPT057/RPT057';
import RPT083 from './pages/Inventory/RPT083/RPT083';
import SalesOrderList from './pages/Sales/SalesOrderList/SalesOrderList';
import SalesOrderDetail from './pages/Sales/SalesOrderList/SalesOrderDetail';
import PurchaseOrderList from './pages/Purchase/PurchaseOrderList/PurchaseOrderList';
import PurchaseOrderDetail from './pages/Purchase/PurchaseOrderDetail/PurchaseOrderDetail';
import PpoList from './pages/Purchase/PPO/PpoList';
import PurchaseReceivingList from './pages/Purchase/PurchaseReceiving/PurchaseReceivingList';
import ProfitLossStatement from './pages/Accounting/ProfitLossStatement/ProfitLossStatement';
import JobCardCalendar from './pages/Operations/JobCardCalendar/JobCardCalendar';
import TaskGantt from './pages/Operations/TaskGantt/TaskGantt';
import ThemeReview from './pages/ThemeReview/ThemeReview';
import Layout from './components/Layout/Layout';
import './index.css';

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
  };

  useEffect(() => {
    let socket;
    if (user) {
      socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001');
      socket.emit('register', user.email);

      socket.on('FORCE_LOGOUT', (data) => {
        alert(data.reason);
        handleLogout();
      });
    }
    return () => {
      if (socket) socket.disconnect();
    };
  }, [user]);

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} 
        />
        <Route 
          path="/" 
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <Home user={user} />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          } 
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
          path="/purchase/ppo" 
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <PpoList />
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
        {/* Catch-all route: Redirect everything else to Home (which then checks login) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
