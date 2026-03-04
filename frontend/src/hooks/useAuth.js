import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';

const useAuth = (requiredRole = null) => {
  const { user, role, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (requiredRole && role !== requiredRole) {
      // Redirect to appropriate dashboard based on actual role
      const roleRoutes = {
        PATIENT: '/patient',
        EMS: '/ems',
        HOSPITAL: '/hospital',
        ADMIN: '/admin',
      };
      navigate(roleRoutes[role] || '/login');
    }
  }, [isAuthenticated, role, requiredRole, navigate]);

  return { user, role, isAuthenticated, logout };
};

export default useAuth;
