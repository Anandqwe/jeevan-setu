import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import styles from './AuthPages.module.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    try {
      const data = await login(email, password);
      const roleRoutes = {
        PATIENT: '/patient',
        EMS: '/ems',
        HOSPITAL: '/hospital',
        ADMIN: '/admin',
      };
      navigate(roleRoutes[data.role] || '/');
    } catch (err) {
      // Error is set in the store
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.logo}>🚑</span>
          <h1 className={styles.title}>Jeevan-Setu</h1>
          <p className={styles.subtitle}>Emergency Coordination System</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <h2 className={styles.form_title}>Sign In</h2>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.field}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className={styles.field}>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" className={styles.submit_btn} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className={styles.link_text}>
            Don't have an account? <Link to="/register">Register</Link>
          </p>
        </form>

        <div className={styles.demo_credentials}>
          <p><strong>Demo Credentials:</strong></p>
          <p>Admin: admin@jeevan-setu.com / admin123</p>
          <p>Patient: patient.01@jeevan-setu.com / patient123</p>
          <p>EMS: ems.01@jeevan-setu.com / ems123</p>
          <p>Hospital: hospital.andheri@jeevan-setu.com / hospital123</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
