/**
 * Helper hook và hàm kiểm tra quyền truy cập cho Frontend
 */

export const hasPermission = (user, requiredPermission) => {
  if (!user) return false;

  const roleCode = user.roleCode || user.role?.code || user.role;
  // ADMIN có quyền truy cập tất cả
  if (roleCode === 'ADMIN') return true;

  if (!requiredPermission) return true;

  const permissions = user.permissions || [];
  if (Array.isArray(requiredPermission)) {
    return requiredPermission.some((p) => permissions.includes(p));
  }
  return permissions.includes(requiredPermission);
};

export const hasAnyPermissionInResource = (user, resource) => {
  if (!user) return false;
  const roleCode = user.roleCode || user.role?.code || user.role;
  if (roleCode === 'ADMIN') return true;

  const permissions = user.permissions || [];
  return permissions.some((p) => p.startsWith(`${resource}:`));
};
