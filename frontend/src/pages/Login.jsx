import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, Mail, Lock, AlertCircle, Siren, Eye, EyeOff, ArrowRight } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { toast } from '../store/toastStore';

export default function Login() {
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name}!`);
      const map = { patient: '/patient', ems: '/ems', hospital: '/hospital', admin: '/command-center' };
      navigate(map[user.role] || '/');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Login failed. Please check your credentials.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--bg-primary)] bg-radial-emergency">
      {/* Left: Map / Visual Side */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center">
        {/* Animated background grid */}
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Floating elements */}
        <div className="relative z-10 text-center px-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="relative inline-block mb-8">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="w-24 h-24 rounded-3xl bg-gradient-to-br from-red-500 to-red-600 
                  flex items-center justify-center shadow-2xl shadow-red-500/30 mx-auto"
              >
                <Siren size={48} className="text-white" />
              </motion.div>
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 w-24 h-24 rounded-3xl bg-red-500/20 mx-auto"
              />
            </div>

            <h1 className="text-5xl font-bold text-[var(--text-primary)] mb-4 tracking-tight">
              Jeevan Setu
            </h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
              Real-Time Multi-Agent Emergency Coordination System
            </p>

            <div className="flex items-center justify-center gap-6 mt-10">
              {[
                { label: 'Patients', color: 'from-red-500 to-red-600', emoji: '🏥' },
                { label: 'EMS Teams', color: 'from-blue-500 to-blue-600', emoji: '🚑' },
                { label: 'Hospitals', color: 'from-emerald-500 to-emerald-600', emoji: '🏨' },
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.15 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.color} 
                    flex items-center justify-center text-xl shadow-lg`}>
                    {item.emoji}
                  </div>
                  <span className="text-xs text-[var(--text-muted)] font-medium">{item.label}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Corner accents */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-red-500/5 to-transparent" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-500/5 to-transparent" />
      </div>

      {/* Right: Login Form */}
      <div className="w-full lg:w-[480px] xl:w-[520px] flex items-center justify-center p-6 lg:p-10">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm lg:max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 
                flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/20"
            >
              <Siren size={28} className="text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-gradient-brand">Jeevan Setu</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">Emergency Coordination System</p>
          </div>

          {/* Form Card */}
          <div className="glass-card rounded-2xl p-7 sm:p-8 shadow-xl shadow-black/20">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Welcome back</h2>
              <p className="text-sm text-[var(--text-muted)] mt-1">Sign in to your dashboard</p>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="flex items-center gap-2.5 p-3.5 rounded-xl 
                    bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-5"
                >
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <motion.div
                    animate={{ 
                      color: focused === 'email' ? 'rgba(255, 71, 87, 0.8)' : 'rgba(255,255,255,0.3)' 
                    }}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10"
                  >
                    <Mail size={16} />
                  </motion.div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused('')}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-11 pr-4 h-11 rounded-xl bg-white/[0.04] border border-[var(--border-color)]
                      text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm
                      focus:outline-none focus:border-red-500/40 focus:ring-2 focus:ring-red-500/10
                      focus:bg-white/[0.06] transition-all duration-200"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <motion.div
                    animate={{ 
                      color: focused === 'password' ? 'rgba(255, 71, 87, 0.8)' : 'rgba(255,255,255,0.3)' 
                    }}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10"
                  >
                    <Lock size={16} />
                  </motion.div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused('')}
                    placeholder="••••••••"
                    required
                    className="w-full pl-11 pr-11 h-11 rounded-xl bg-white/[0.04] border border-[var(--border-color)]
                      text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm
                      focus:outline-none focus:border-red-500/40 focus:ring-2 focus:ring-red-500/10
                      focus:bg-white/[0.06] transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]
                      hover:text-[var(--text-secondary)] transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.01, y: loading ? 0 : -1 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                className="w-full min-h-11 flex items-center justify-center gap-2.5 py-3 rounded-xl
                  bg-gradient-to-r from-red-600 to-red-500 text-white font-semibold text-sm
                  hover:from-red-500 hover:to-red-400 
                  disabled:opacity-50 disabled:cursor-not-allowed
                  shadow-lg shadow-red-500/20 hover:shadow-red-500/30
                  transition-all duration-200"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn size={16} />
                    Sign In
                    <ArrowRight size={14} className="ml-1" />
                  </>
                )}
              </motion.button>
            </form>

            <div className="mt-6 pt-5 border-t border-[var(--border-color)]">
              <p className="text-center text-sm text-[var(--text-muted)]">
                Don't have an account?{' '}
                <Link to="/register" className="text-red-400 hover:text-red-300 font-semibold transition-colors">
                  Create account
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
