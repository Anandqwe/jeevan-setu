import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

/**
 * Route guard: redirects to /login if unauthenticated,
 * or to role dashboard if role doesn't match.
 */
export default function ProtectedRoute({ role, roles, children }) {
    const { user, loading } = useAuthStore();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-[var(--text-muted)]">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const allowedRoles = roles || (role ? [role] : null);
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        const dashboardMap = {
            patient: '/patient',
            ems: '/ems',
            hospital: '/hospital',
            admin: '/command-center',
        };
        return <Navigate to={dashboardMap[user.role] || '/login'} replace />;
    }

    return children;
}
