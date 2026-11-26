import { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Lock,
  Unlock,
  Shield,
  Search,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import {
  getUsers,
  getRoles,
  createUser,
  toggleUserStatus
} from '../../../services/api';
import DmsSectionPanel from '../../../components/DmsUi/DmsSectionPanel';
import './UserManagement.css';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [alert, setAlert] = useState(null);

  // Form state tạo mới
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    password: '',
    roleId: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes] = await Promise.all([
        getUsers(),
        getRoles()
      ]);
      setUsers(usersRes || []);
      setRoles(rolesRes || []);
      if (rolesRes && rolesRes.length > 0) {
        setFormData((prev) => ({ ...prev, roleId: rolesRes[0].id }));
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Lỗi khi tải danh sách người dùng' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStatus = async (user) => {
    try {
      const res = await toggleUserStatus(user.id);
      setAlert({ type: 'success', message: res.message });
      loadData();
      setTimeout(() => setAlert(null), 3000);
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  const handleSubmitCreate = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.fullName || !formData.roleId) {
      setAlert({ type: 'error', message: 'Vui lòng điền đầy đủ thông tin bắt buộc' });
      return;
    }
    try {
      await createUser(formData);
      setIsModalOpen(false);
      setFormData({
        username: '',
        fullName: '',
        email: '',
        phone: '',
        password: '',
        roleId: roles[0]?.id || ''
      });
      setAlert({ type: 'success', message: 'Tạo tài khoản người dùng mới thành công!' });
      loadData();
      setTimeout(() => setAlert(null), 3000);
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.fullName?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.roleName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="users-management-page">
      <div className="dms-page-title-bar">
        <div>
          <h2>Quản lý Người dùng & Nhân sự</h2>
          <p className="dms-page-subtitle">Danh sách tài khoản nhân viên, phân bổ vai trò và kiểm soát trạng thái đăng nhập</p>
        </div>
        <button className="dms-btn dms-btn-steel" onClick={() => setIsModalOpen(true)}>
          <UserPlus size={15} />
          <span>Thêm người dùng mới</span>
        </button>
      </div>

      {alert && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 4,
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            backgroundColor: alert.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: alert.type === 'success' ? '#047857' : '#b91c1c',
            border: `1px solid ${alert.type === 'success' ? '#a7f3d0' : '#fecaca'}`
          }}
        >
          {alert.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{alert.message}</span>
        </div>
      )}

      <DmsSectionPanel title="Tìm kiếm tài khoản">
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ position: 'relative', width: 340 }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: 9, color: '#64748b' }} />
            <input
              type="text"
              placeholder="Tìm theo tên, username, vai trò..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="dms-input"
              style={{ width: '100%', paddingLeft: 32 }}
            />
          </div>
        </div>
      </DmsSectionPanel>

      <DmsSectionPanel title="Danh sách tài khoản nhân sự" count={filteredUsers.length} noPadding>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Đang tải người dùng...</div>
        ) : (
          <div className="dms-ledger-table-wrap" style={{ border: 'none' }}>
          <table className="dms-ledger-table um-table">
            <thead>
              <tr>
                <th>Nhân sự</th>
                <th>Tên đăng nhập / Email</th>
                <th>Số điện thoại</th>
                <th>Vai trò (Role)</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="um-user-cell">
                      <div className="um-avatar-circle">
                        {u.fullName?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="um-user-meta">
                        <span className="um-user-name">{u.fullName}</span>
                        <span className="um-user-sub">{u.distributorName}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{u.username}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{u.email}</div>
                  </td>
                  <td>{u.phone || 'Chưa cập nhật'}</td>
                  <td>
                    <span className="um-badge-role">{u.roleName || u.roleCode}</span>
                  </td>
                  <td>
                    <span className={`um-status-pill ${u.status ? 'active' : 'locked'}`}>
                      <span className="um-status-dot"></span>
                      {u.status ? 'Đang hoạt động' : 'Đã khóa'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className={`um-action-btn ${u.status ? 'danger' : ''}`}
                      onClick={() => handleToggleStatus(u)}
                      title={u.status ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                    >
                      {u.status ? <Lock size={14} /> : <Unlock size={14} />}
                      <span>{u.status ? 'Khóa' : 'Kích hoạt'}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </DmsSectionPanel>

      {/* Modal Thêm người dùng mới */}
      {isModalOpen && (
        <div className="um-modal-overlay">
          <div className="um-modal-content">
            <div className="um-modal-header">
              <h3>Thêm người dùng mới</h3>
              <button className="um-modal-close" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmitCreate}>
              <div className="um-modal-body">
                <div className="um-form-group">
                  <label>Họ và tên *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>
                <div className="um-form-group">
                  <label>Tên đăng nhập (Username) *</label>
                  <input
                    type="text"
                    required
                    placeholder="nva_sales"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
                <div className="um-form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    placeholder="nva@spindl.dms"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="um-form-group">
                  <label>Số điện thoại</label>
                  <input
                    type="tel"
                    placeholder="0901234567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="um-form-group">
                  <label>Vai trò hệ thống (Role) *</label>
                  <select
                    value={formData.roleId}
                    onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="um-form-group">
                  <label>Mật khẩu khởi tạo</label>
                  <input
                    type="password"
                    placeholder="Mặc định: 123456"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>
              <div className="um-modal-footer">
                <button
                  type="button"
                  className="um-btn-cancel"
                  onClick={() => setIsModalOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="um-btn-submit">
                  Tạo tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
