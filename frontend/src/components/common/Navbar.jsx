import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import styles from './Navbar.module.css';

const Navbar = () => {
  const { user, role, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardLink = () => {
    const routes = {
      PATIENT: '/patient',
      EMS: '/ems',
      HOSPITAL: '/hospital',
      ADMIN: '/admin',
    };
    return routes[role] || '/';
  };

  if (!isAuthenticated) return null;

  return (
    <nav className={styles.navbar}>
      <div className={styles.brand}>
        <Link to={getDashboardLink()}>
          <span className={styles.logo}>🚑</span>
          <span className={styles.title}>Jeevan-Setu</span>
        </Link>
      </div>

      <div className={styles.nav_right}>
        <span className={styles.role_badge}>{role}</span>
        <span className={styles.user_name}>{user?.name}</span>
        <button onClick={handleLogout} className={styles.logout_btn}>
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
