import { useState } from 'react';
import { Eye, EyeOff, Layers, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { login } from '../../services/api';
import './Login.css';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (username && password) {
      setLoading(true);
      try {
        const data = await login(username, password);
        onLogin(data.user);
      } catch (error) {
        setErrorMsg(error.message || 'Không thể kết nối đến máy chủ Backend.');
      } finally {
        setLoading(false);
      }
    } else {
      setErrorMsg("Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu");
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Brand Header */}
        <div className="login-brand">
          <div className="login-logo-badge">
            <Layers size={28} />
          </div>
          <h1 className="login-title">DMS-NPP TradeLedger</h1>
          <p className="login-subtitle">Hệ thống Quản lý Phân phối, Đặt hàng PPO & Tồn kho NPP</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {errorMsg && (
            <div className="error-message">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}
          
          <div className="form-group">
            <label>Tên đăng nhập / Email <span className="text-danger">*</span></label>
            <div className="input-container">
              <User size={16} className="input-icon" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ví dụ: admin hoặc user@npp.com"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label>Mật khẩu <span className="text-danger">*</span></label>
            <div className="input-container password-field">
              <Lock size={16} className="input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu của bạn"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
                title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? <Eye size={17} /> : <EyeOff size={17} />}
              </button>
            </div>
          </div>

          <div className="login-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Ghi nhớ đăng nhập</span>
            </label>
            <span className="forgot-password">Quên mật khẩu?</span>
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? (
              <span>Đang xác thực...</span>
            ) : (
              <>
                <span>Đăng nhập vào hệ thống</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>

          <div className="demo-credentials">
            <span className="demo-label">Gợi ý đăng nhập thử nghiệm:</span>
            <code>admin / admin123</code>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
