import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { login } from '../../services/api';
import './Login.css';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (username && password) {
      try {
        // api.js login(email, password) -> We pass username as email because authController maps it to user.username
        const data = await login(username, password);
        onLogin(data.user);
      } catch (error) {
        setErrorMsg(error.message || 'Không thể kết nối đến máy chủ Backend.');
      }
    } else {
      setErrorMsg("Vui lòng nhập đầy đủ Username và Password");
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Placeholder for future logo */}
        <div className="login-logo-placeholder"></div>

        <form onSubmit={handleSubmit} className="login-form">
          {errorMsg && <div className="error-message">{errorMsg}</div>}
          
          <div className="form-group">
            <label>Username <span>*</span></label>
            <div className="input-container">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password <span>*</span></label>
            <div className="input-container password-field">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? <Eye size={18} color="#64748b" /> : <EyeOff size={18} color="#64748b" />}
              </button>
            </div>
          </div>

          <div className="checkbox-group">
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <label htmlFor="remember">Remember me</label>
          </div>

          <button type="submit" className="login-button">
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
