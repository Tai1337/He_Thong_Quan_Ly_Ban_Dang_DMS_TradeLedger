import DmsTopNav from './DmsTopNav';
import './DmsTopNav.css';

const Layout = ({ children, user, onLogout }) => {
  return (
    <div className="dms-app-shell">
      <DmsTopNav user={user} onLogout={onLogout} />
      <main className="dms-page-viewport">
        {children}
      </main>
    </div>
  );
};

export default Layout;
