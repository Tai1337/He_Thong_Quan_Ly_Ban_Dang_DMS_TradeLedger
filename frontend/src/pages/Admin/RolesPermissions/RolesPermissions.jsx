import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertCircle,
  Users,
  ShoppingCart,
  TrendingUp,
  Box,
  Truck,
  PieChart,
  ClipboardCheck,
  Settings,
  Database,
  RotateCcw
} from 'lucide-react';
import {
  getRoles,
  getPermissions,
  getRolePermissions,
  updateRolePermissions
} from '../../../services/api';
import './RolesPermissions.css';

// Mapping icon và tiêu đề tiếng Việt cho các Resource
const RESOURCE_META = {
  sales_orders: {
    title: 'Phân hệ Bán hàng (SO)',
    icon: TrendingUp,
    color: '#2563eb'
  },
  purchase_orders: {
    title: 'Phân hệ Mua hàng (PO) & Nhập kho',
    icon: ShoppingCart,
    color: '#0891b2'
  },
  inventory: {
    title: 'Phân hệ Tồn kho & Lô/Hạn dùng (FEFO)',
    icon: Box,
    color: '#d97706'
  },
  inventory_counts: {
    title: 'Phân hệ Kiểm kê kho hàng',
    icon: ClipboardCheck,
    color: '#7c3aed'
  },
  delivery_trips: {
    title: 'Phân hệ Điều phối xe & Giao hàng',
    icon: Truck,
    color: '#16a34a'
  },
  master_data: {
    title: 'Phân hệ Danh mục (Master Data)',
    icon: Database,
    color: '#475569'
  },
  reports_finance: {
    title: 'Phân hệ Tài chính, Doanh số & PnL',
    icon: PieChart,
    color: '#ea580c'
  },
  users_roles: {
    title: 'Quản trị Người dùng & Phân quyền',
    icon: Settings,
    color: '#dc2626'
  }
};

export default function RolesPermissions() {
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [selectedPermIds, setSelectedPermIds] = useState(new Set());
  const [initialPermIds, setInitialPermIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  // Load danh sách Roles và tất cả Permissions
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const [rolesRes, permsRes] = await Promise.all([
          getRoles(),
          getPermissions()
        ]);
        setRoles(rolesRes || []);
        setPermissions(permsRes || []);

        if (rolesRes && rolesRes.length > 0) {
          setSelectedRoleId(rolesRes[0].id);
        }
      } catch (err) {
        setAlert({ type: 'error', message: err.message || 'Lỗi khi tải dữ liệu phân quyền' });
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Khi chọn role khác, load permissions của role đó
  useEffect(() => {
    if (!selectedRoleId) return;
    async function loadRolePerms() {
      try {
        const res = await getRolePermissions(selectedRoleId);
        const ids = new Set((res.permissionIds || []).map(String));
        setSelectedPermIds(ids);
        setInitialPermIds(new Set(ids));
      } catch (err) {
        setAlert({ type: 'error', message: err.message || 'Lỗi khi tải quyền của vai trò' });
      }
    }
    loadRolePerms();
  }, [selectedRoleId]);

  // Gom nhóm permissions theo Resource
  const groupedPermissions = permissions.reduce((acc, p) => {
    if (!acc[p.resource]) acc[p.resource] = [];
    acc[p.resource].push(p);
    return acc;
  }, {});

  const handleTogglePerm = (permId) => {
    const sId = String(permId);
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(sId)) {
        next.delete(sId);
      } else {
        next.add(sId);
      }
      return next;
    });
  };

  const handleSelectGroup = (resource, selectAll) => {
    const groupPerms = groupedPermissions[resource] || [];
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      groupPerms.forEach((p) => {
        const sId = String(p.id);
        if (selectAll) {
          next.add(sId);
        } else {
          next.delete(sId);
        }
      });
      return next;
    });
  };

  const handleSelectAll = (selectAll) => {
    if (selectAll) {
      setSelectedPermIds(new Set(permissions.map((p) => String(p.id))));
    } else {
      setSelectedPermIds(new Set());
    }
  };

  const handleReset = () => {
    setSelectedPermIds(new Set(initialPermIds));
  };

  const handleSave = async () => {
    if (!selectedRoleId) return;
    try {
      setSaving(true);
      setAlert(null);
      await updateRolePermissions(selectedRoleId, Array.from(selectedPermIds));
      setInitialPermIds(new Set(selectedPermIds));
      setAlert({ type: 'success', message: 'Đã lưu cấu hình phân quyền thành công!' });
      setTimeout(() => setAlert(null), 4000);
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Lỗi khi lưu phân quyền' });
    } finally {
      setSaving(false);
    }
  };

  const selectedRole = roles.find((r) => String(r.id) === String(selectedRoleId));
  const isDirty =
    selectedPermIds.size !== initialPermIds.size ||
    Array.from(selectedPermIds).some((id) => !initialPermIds.has(id));

  return (
    <div className="roles-permissions-page">
      <div className="rp-header">
        <div className="rp-title-group">
          <h1>Quản lý Vai trò & Ma trận Phân quyền</h1>
          <p>Thiết lập chi tiết quyền hạn tác vụ (RBAC) cho từng vị trí nhân sự trong hệ thống NPP</p>
        </div>
        <button
          className="rp-save-btn"
          onClick={handleSave}
          disabled={saving || !isDirty}
        >
          <Save size={16} />
          {saving ? 'Đang lưu...' : 'Lưu cấu hình quyền'}
        </button>
      </div>

      {alert && (
        <div className={`rp-alert ${alert.type}`}>
          {alert.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{alert.message}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          Đang nạp ma trận phân quyền...
        </div>
      ) : (
        <div className="rp-layout">
          {/* Cột trái: Danh sách Roles */}
          <div className="rp-roles-sidebar">
            <div className="rp-sidebar-title">Danh sách vai trò ({roles.length})</div>
            {roles.map((r) => {
              const active = String(r.id) === String(selectedRoleId);
              return (
                <div
                  key={r.id}
                  className={`rp-role-item ${active ? 'active' : ''}`}
                  onClick={() => setSelectedRoleId(r.id)}
                >
                  <div className="rp-role-info">
                    <span className="rp-role-name">{r.name}</span>
                    <span className="rp-role-code">{r.code}</span>
                  </div>
                  <span className="rp-role-badge">
                    {r.userCount || 0} user
                  </span>
                </div>
              );
            })}
          </div>

          {/* Cột phải: Ma trận phân quyền theo từng nhóm Resource */}
          <div className="rp-matrix-card">
            <div className="rp-matrix-header">
              <div className="rp-current-role-badge">
                <span className="rp-role-tag">{selectedRole?.name || 'Chưa chọn'}</span>
                <span className="rp-role-summary">
                  Đang cấp <strong>{selectedPermIds.size}</strong> / {permissions.length} quyền
                </span>
              </div>
              <div className="rp-matrix-tools">
                <button
                  type="button"
                  className="rp-tool-btn"
                  onClick={() => handleSelectAll(true)}
                >
                  Chọn tất cả
                </button>
                <button
                  type="button"
                  className="rp-tool-btn"
                  onClick={() => handleSelectAll(false)}
                >
                  Bỏ chọn tất cả
                </button>
                {isDirty && (
                  <button
                    type="button"
                    className="rp-tool-btn"
                    onClick={handleReset}
                    title="Khôi phục lại như lúc đầu"
                  >
                    <RotateCcw size={12} style={{ display: 'inline', marginRight: 4 }} />
                    Khôi phục
                  </button>
                )}
              </div>
            </div>

            <div className="rp-groups-container">
              {Object.keys(groupedPermissions).map((resource) => {
                const groupPerms = groupedPermissions[resource];
                const meta = RESOURCE_META[resource] || {
                  title: resource,
                  icon: ShieldCheck,
                  color: '#475569'
                };
                const IconComponent = meta.icon;

                const groupSelectedCount = groupPerms.filter((p) =>
                  selectedPermIds.has(String(p.id))
                ).length;
                const allGroupSelected =
                  groupSelectedCount === groupPerms.length && groupPerms.length > 0;

                return (
                  <div key={resource} className="rp-resource-group">
                    <div className="rp-group-header">
                      <div className="rp-group-title">
                        <IconComponent size={18} style={{ color: meta.color }} />
                        <span>{meta.title}</span>
                        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>
                          ({groupSelectedCount}/{groupPerms.length})
                        </span>
                      </div>
                      <button
                        type="button"
                        className="rp-select-all-btn"
                        onClick={() => handleSelectGroup(resource, !allGroupSelected)}
                      >
                        {allGroupSelected ? 'Bỏ chọn nhóm' : 'Chọn toàn bộ nhóm'}
                      </button>
                    </div>

                    <div className="rp-permissions-grid">
                      {groupPerms.map((perm) => {
                        const isChecked = selectedPermIds.has(String(perm.id));
                        return (
                          <div
                            key={perm.id}
                            className={`rp-perm-card ${isChecked ? 'checked' : ''}`}
                            onClick={() => handleTogglePerm(perm.id)}
                          >
                            <input
                              type="checkbox"
                              className="rp-perm-checkbox"
                              checked={isChecked}
                              onChange={() => {}} // Đã xử lý ở thẻ cha
                            />
                            <div className="rp-perm-details">
                              <span className="rp-perm-name">{perm.name}</span>
                              <span className="rp-perm-desc">{perm.description}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
