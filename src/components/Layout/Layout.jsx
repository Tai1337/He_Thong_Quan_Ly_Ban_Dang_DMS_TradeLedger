import Header from './Header';
import './Layout.css';

const Layout = ({ children, user, onLogout }) => {
  return (
    <div className="layout-container">
      <Header user={user} onLogout={onLogout} />
      <main className="content-area">
        {children}
      </main>
    </div>
  );
};

export default Layout;
