import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ user, allowedRoles, children }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const roleCode = user?.roleCode;
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(roleCode)) {
    return <Navigate to={roleCode === 'WAREHOUSE_KEEPER' ? '/warehouse' : '/'} replace />;
  }

  return children;
};

export default ProtectedRoute;

