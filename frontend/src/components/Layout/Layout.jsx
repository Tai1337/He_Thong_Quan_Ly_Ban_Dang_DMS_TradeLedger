import FrappeSidebar from './FrappeSidebar';
import FrappeHeader from './FrappeHeader';
import './Layout.css';

const Layout = ({ children, user, onLogout }) => {
  return (
    <div className="frappe-app-shell">
      <FrappeSidebar />
      <div className="frappe-main-wrapper">
        <FrappeHeader user={user} onLogout={onLogout} />
        <main className="frappe-page-viewport">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
