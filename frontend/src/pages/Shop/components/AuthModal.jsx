import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  Phone, 
  User, 
  Store, 
  MapPin, 
  ShieldCheck, 
  AlertCircle 
} from 'lucide-react';
import { loginShopCustomer, registerShopCustomer } from '../../../services/api';
import './AuthModal.css';

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [accountType, setAccountType] = useState('CONSUMER'); // 'CONSUMER' | 'STORE'

  // Form states
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!phone.trim() || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ Số điện thoại và Mật khẩu');
      return;
    }

    try {
      setLoading(true);
      const res = await loginShopCustomer(phone.trim(), password);
      localStorage.setItem('portal_customer', JSON.stringify(res.customer));
      onSuccess(res.customer);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Đăng nhập không thành công');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!phone.trim() || !password || !fullName.trim()) {
      setErrorMsg('Vui lòng nhập Họ tên, Số điện thoại và Mật khẩu');
      return;
    }
    if (accountType === 'STORE' && !storeName.trim()) {
      setErrorMsg('Vui lòng nhập Tên Cửa Hàng / Tiệm kinh doanh');
      return;
    }

    try {
      setLoading(true);
      const res = await registerShopCustomer({
        phone: phone.trim(),
        password,
        fullName: fullName.trim(),
        accountType,
        storeName: accountType === 'STORE' ? storeName.trim() : null,
        address: address.trim() || null,
        email: email.trim() || null
      });

      localStorage.setItem('portal_customer', JSON.stringify(res.customer));
      onSuccess(res.customer);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Đăng ký không thành công');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-modal-overlay" onClick={onClose}>
      <div className="portal-auth-card" onClick={(e) => e.stopPropagation()}>
        {/* Header with Close */}
        <div className="auth-card-header">
          <div className="auth-header-title">
            <div className="auth-icon-badge">
              <ShieldCheck size={20} color="#059669" />
            </div>
            <div>
              <h3>Tài Khoản Đặt Hàng</h3>
              <p>Đăng nhập hoặc tạo tài khoản để quản lý đơn hàng</p>
            </div>
          </div>
          <button className="auth-close-btn" onClick={onClose} aria-label="Đóng">
            <X size={16} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab-btn ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setErrorMsg(''); }}
          >
            Đăng Nhập
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${tab === 'register' ? 'active' : ''}`}
            onClick={() => { setTab('register'); setErrorMsg(''); }}
          >
            Đăng Ký Mới
          </button>
        </div>

        {errorMsg && (
          <div className="auth-error-alert">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Đăng Nhập */}
        {tab === 'login' && (
          <form className="auth-form" onSubmit={handleLogin}>
            <div className="form-field">
              <label>Số điện thoại</label>
              <div className="input-with-icon">
                <Phone size={15} className="input-ico" />
                <input
                  type="tel"
                  placeholder="VD: 0912345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-field">
              <label>Mật khẩu</label>
              <div className="input-with-icon">
                <Lock size={15} className="input-ico" />
                <input
                  type="password"
                  placeholder="Nhập mật khẩu của bạn"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? 'Đang xác thực...' : 'Đăng Nhập Ngay'}
            </button>

            {/* Quick Fill Test Accounts for seamless testing */}
            <div className="quick-test-accounts-box">
              <div className="test-acc-head">
                <ShieldCheck size={14} color="#059669" />
                <span>TÀI KHOẢN TEST TẠO ĐƠN (1-CHẠM ĐIỀN NHANH):</span>
              </div>
              <div className="test-acc-buttons">
                <button
                  type="button"
                  className="test-acc-pill store-pill"
                  onClick={() => {
                    setPhone('0988888888');
                    setPassword('123456');
                  }}
                  title="Nhấn để tự điền tài khoản tiệm tạp hoá sỉ"
                >
                  <Store size={15} color="#d97706" />
                  <div className="test-acc-info">
                    <strong>Đại Lý Tạp Hoá Phát Đạt (B2B)</strong>
                    <small>SĐT: 0988888888 • MK: 123456 (Chiết khấu 12%)</small>
                  </div>
                </button>

                <button
                  type="button"
                  className="test-acc-pill consumer-pill"
                  onClick={() => {
                    setPhone('0977777777');
                    setPassword('123456');
                  }}
                  title="Nhấn để tự điền tài khoản khách tiêu dùng"
                >
                  <User size={15} color="#2563eb" />
                  <div className="test-acc-info">
                    <strong>Khách Hàng Cá Nhân (B2C)</strong>
                    <small>SĐT: 0977777777 • MK: 123456 (Mua lẻ)</small>
                  </div>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Form Đăng Ký */}
        {tab === 'register' && (
          <form className="auth-form" onSubmit={handleRegister}>
            {/* Account Type Selector */}
            <div className="account-type-toggle">
              <label className="type-toggle-label">Loại tài khoản đăng ký:</label>
              <div className="type-options-grid">
                <button
                  type="button"
                  className={`type-option-card ${accountType === 'CONSUMER' ? 'selected' : ''}`}
                  onClick={() => setAccountType('CONSUMER')}
                >
                  <div className="type-card-avatar consumer">
                    <User size={18} />
                  </div>
                  <div className="type-card-texts">
                    <strong>Khách Cá Nhân</strong>
                    <small>Mua lẻ tiêu dùng</small>
                  </div>
                </button>

                <button
                  type="button"
                  className={`type-option-card ${accountType === 'STORE' ? 'selected' : ''}`}
                  onClick={() => setAccountType('STORE')}
                >
                  <div className="type-card-avatar store">
                    <Store size={18} />
                  </div>
                  <div className="type-card-texts">
                    <strong>Cửa Hàng / Tiệm</strong>
                    <small>Giá sỉ & chiết khấu đại lý</small>
                  </div>
                </button>
              </div>
            </div>

            <div className="form-field">
              <label>Họ và tên {accountType === 'STORE' ? 'chủ tiệm / người đại diện' : ''} <span className="req">*</span></label>
              <input
                type="text"
                placeholder="VD: Nguyễn Văn A"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            {accountType === 'STORE' && (
              <div className="form-field">
                <label>Tên Cửa hàng / Tiệm tạp hoá <span className="req">*</span></label>
                <input
                  type="text"
                  placeholder="VD: Tạp hoá Cô Ba Tri"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-field">
              <label>Số điện thoại (dùng đăng nhập) <span className="req">*</span></label>
              <input
                type="tel"
                placeholder="VD: 0912345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label>Mật khẩu (tối thiểu 6 ký tự) <span className="req">*</span></label>
              <input
                type="password"
                placeholder="Nhập mật khẩu bảo mật"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label>Địa chỉ nhận hàng mặc định</label>
              <input
                type="text"
                placeholder="VD: Số 123 Đường Trần Hưng Đạo, P.1, Q.5"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? 'Đang khởi tạo tài khoản...' : `Hoàn Tất Đăng Ký ${accountType === 'STORE' ? 'Cửa Hàng' : 'Khách Hàng'}`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
