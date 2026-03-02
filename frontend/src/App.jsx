import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import useAuthStore from './store/authStore';
import useThemeStore from './store/themeStore';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastContainer } from './shared/ui';
import { PageLoader } from './shared/ui/LoadingSpinner';

// Lazy-loaded pages for code-splitting
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const PatientDashboard = lazy(() => import('./pages/PatientDashboard'));
const EMSDashboard = lazy(() => import('./pages/EMSDashboard'));
const HospitalDashboard = lazy(() => import('./pages/HospitalDashboard'));
const CommandCenter = lazy(() => import('./pages/CommandCenter'));
const Analytics = lazy(() => import('./pages/Analytics'));

function AppRoutes() {
  const { user, loading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    useThemeStore.getState().initTheme();
  }, []);

  if (loading) {
    return <PageLoader />;
  }

  const getDefaultRedirect = () => {
    if (!user) return '/login';
    const map = { patient: '/patient', ems: '/ems', hospital: '/hospital', admin: '/command-center' };
    return map[user.role] || '/login';
  };

  return (
    <Suspense fallback={<PageLoader />}>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<Navigate to={getDefaultRedirect()} replace />} />
          <Route path="/login" element={user ? <Navigate to={getDefaultRedirect()} replace /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to={getDefaultRedirect()} replace /> : <Register />} />
          <Route path="/patient" element={
            <ProtectedRoute role="patient"><PatientDashboard /></ProtectedRoute>
          } />
          <Route path="/ems" element={
            <ProtectedRoute role="ems"><EMSDashboard /></ProtectedRoute>
          } />
          <Route path="/hospital" element={
            <ProtectedRoute role="hospital"><HospitalDashboard /></ProtectedRoute>
          } />
          <Route path="/command-center" element={
            <ProtectedRoute role="admin"><CommandCenter /></ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute roles={['admin', 'ems', 'hospital']}><Analytics /></ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to={getDefaultRedirect()} replace />} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}

export default function App() {
  return (
    <Router>
      <AppRoutes />
      <ToastContainer />
    </Router>
  );
}
