import { Navigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, role } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    // Redirect to their correct dashboard
    const roleRoutes = {
      PATIENT: '/patient',
      EMS: '/ems',
      HOSPITAL: '/hospital',
      ADMIN: '/admin',
    };
    return <Navigate to={roleRoutes[role] || '/login'} replace />;
  }

  return children;
};

export default ProtectedRoute;
