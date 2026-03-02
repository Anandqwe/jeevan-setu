import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Sun, Moon, LogOut, Activity, BarChart3, Shield, Menu, X,
  Siren, ChevronDown
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import LiveIndicator from '../shared/ui/LiveIndicator';

export default function TopBar() {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenu, setMobileMenu] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const navItems = [
    { path: '/command-center', label: 'Command Center', icon: Activity, roles: ['admin'] },
    { path: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['admin', 'ems', 'hospital'] },
    { path: '/patient', label: 'Dashboard', icon: Shield, roles: ['patient'] },
    { path: '/ems', label: 'Dashboard', icon: Shield, roles: ['ems'] },
    { path: '/hospital', label: 'Dashboard', icon: Shield, roles: ['hospital'] },
  ].filter(item => item.roles.includes(user?.role));

  const roleConfig = {
    admin: { label: 'ADMIN', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    ems: { label: 'EMS', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    hospital: { label: 'HOSPITAL', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    patient: { label: 'PATIENT', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  };

  const role = user ? roleConfig[user.role] || roleConfig.patient : null;

  return (
    <>
      <motion.nav
        initial={{ y: -64 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="h-16 flex items-center justify-between px-5
          bg-[var(--bg-secondary)]/80 backdrop-blur-2xl
          border-b border-[var(--border-color)] sticky top-0 z-50"
      >
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-4">
          <button
            className="lg:hidden p-2 rounded-xl hover:bg-white/5 transition-colors text-[var(--text-muted)]"
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            {mobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-600 
                flex items-center justify-center shadow-lg shadow-red-500/20
                group-hover:shadow-red-500/30 transition-shadow">
                <Siren size={18} className="text-white" />
              </div>
            </div>
            <div className="hidden sm:block">
              <span className="text-lg font-bold text-gradient-brand tracking-tight">
                Jeevan Setu
              </span>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1 ml-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <motion.button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium
                    transition-all duration-200
                    ${isActive
                      ? 'bg-white/10 text-[var(--text-primary)] border border-white/10 shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5'
                    }`}
                >
                  <Icon size={15} />
                  {item.label}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Right: Status + Theme + User */}
        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            <LiveIndicator label="System Online" color="green" />
          </div>

          <motion.button
            onClick={toggleTheme}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            className="p-2.5 rounded-xl hover:bg-white/5 transition-all text-[var(--text-muted)]
              hover:text-[var(--text-primary)]"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            <motion.div
              key={theme}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </motion.div>
          </motion.button>

          {user && (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-[var(--border-color)]">
                <div className="flex flex-col items-end">
                  <span className={`text-[0.6rem] font-bold tracking-widest px-2 py-0.5 rounded-md
                    ${role?.bg} ${role?.border} border ${role?.color}`}>
                    {role?.label}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)] mt-0.5 font-medium">{user.name}</span>
                </div>
              </div>

              <motion.button
                onClick={handleLogout}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
                className="p-2.5 rounded-xl hover:bg-red-500/10 transition-all 
                  text-[var(--text-muted)] hover:text-red-400"
                title="Logout"
              >
                <LogOut size={17} />
              </motion.button>
            </div>
          )}
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenu && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-[var(--bg-secondary)]/95 backdrop-blur-xl
              border-b border-[var(--border-color)] overflow-hidden z-40"
          >
            <div className="p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); setMobileMenu(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                      transition-all ${isActive
                        ? 'bg-white/10 text-[var(--text-primary)]'
                        : 'text-[var(--text-muted)] hover:bg-white/5'
                      }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
