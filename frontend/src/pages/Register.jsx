import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, AlertCircle, CheckCircle, Siren, User, Mail, Lock, Shield } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { toast } from '../store/toastStore';

const roles = [
  { value: 'patient', label: 'Patient', emoji: '🏥', color: 'border-red-500/30 bg-red-500/10 text-red-400', desc: 'Request emergency help' },
  { value: 'ems', label: 'EMS Provider', emoji: '🚑', color: 'border-blue-500/30 bg-blue-500/10 text-blue-400', desc: 'Respond to emergencies' },
  { value: 'hospital', label: 'Hospital', emoji: '🏨', color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400', desc: 'Manage capacity' },
];

export default function Register() {
  const { register } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'patient',
    ambulance_lat: 28.6139, ambulance_lon: 77.2090, capability_level: 'BLS',
    hospital_name: '', hospital_lat: 28.6139, hospital_lon: 77.2090,
    specialty: 'general', total_icu_beds: 10,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      await register(form);
      setSuccess('Account created successfully! Redirecting...');
      toast.success('Registration successful!');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Registration failed.';
      setError(msg);
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const inputCls = `w-full px-4 h-11 rounded-xl bg-white/[0.04] border border-[var(--border-color)]
    text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-sm
    focus:outline-none focus:border-red-500/40 focus:ring-2 focus:ring-red-500/10
    focus:bg-white/[0.06] transition-all duration-200`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] bg-radial-emergency p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2.5, repeat: Infinity }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 
              flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/20"
          >
            <Siren size={24} className="text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-gradient-brand">Jeevan Setu</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Create your account</p>
        </div>

        {/* Form Card */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-xl shadow-black/20">
          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                >
                  <AlertCircle size={16} className="shrink-0" /> {error}
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm"
                >
                  <CheckCircle size={16} className="shrink-0" /> {success}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Name */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none z-10" />
                <input name="name" value={form.name} onChange={handleChange} required
                  placeholder="Your name" className={`${inputCls} pl-11`} />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none z-10" />
                <input name="email" type="email" value={form.email} onChange={handleChange} required
                  placeholder="you@example.com" className={`${inputCls} pl-11`} />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none z-10" />
                <input name="password" type="password" value={form.password} onChange={handleChange}
                  required placeholder="Min 6 characters" minLength={6}
                  className={`${inputCls} pl-11`} />
              </div>
            </div>

            {/* Role Selector */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Select Role</label>
              <div className="grid grid-cols-3 gap-2">
                {roles.map((r) => (
                  <motion.button
                    key={r.value}
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setForm((p) => ({ ...p, role: r.value }))}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center
                      transition-all duration-200
                      ${form.role === r.value
                        ? `${r.color} ring-1 ring-current/20`
                        : 'border-[var(--border-color)] bg-white/[0.02] text-[var(--text-muted)] hover:bg-white/[0.04]'
                      }`}
                  >
                    <span className="text-xl">{r.emoji}</span>
                    <span className="text-xs font-semibold">{r.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* EMS Fields */}
            <AnimatePresence>
              {form.role === 'ems' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                    <h4 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
                      🚑 Ambulance Details
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-[var(--text-muted)]">Latitude</label>
                        <input name="ambulance_lat" type="number" step="any" value={form.ambulance_lat}
                          onChange={handleChange} className={inputCls} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-[var(--text-muted)]">Longitude</label>
                        <input name="ambulance_lon" type="number" step="any" value={form.ambulance_lon}
                          onChange={handleChange} className={inputCls} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-[var(--text-muted)]">Capability Level</label>
                      <select name="capability_level" value={form.capability_level}
                        onChange={handleChange} className={inputCls}>
                        <option value="BLS">BLS (Basic Life Support)</option>
                        <option value="ALS">ALS (Advanced Life Support)</option>
                        <option value="Critical Care">Critical Care</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Hospital Fields */}
            <AnimatePresence>
              {form.role === 'hospital' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                    <h4 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                      🏨 Hospital Details
                    </h4>
                    <div className="space-y-1">
                      <label className="text-xs text-[var(--text-muted)]">Hospital Name</label>
                      <input name="hospital_name" value={form.hospital_name} onChange={handleChange}
                        placeholder="Hospital name" className={inputCls} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-[var(--text-muted)]">Latitude</label>
                        <input name="hospital_lat" type="number" step="any" value={form.hospital_lat}
                          onChange={handleChange} className={inputCls} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-[var(--text-muted)]">Longitude</label>
                        <input name="hospital_lon" type="number" step="any" value={form.hospital_lon}
                          onChange={handleChange} className={inputCls} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-[var(--text-muted)]">Specialty</label>
                        <select name="specialty" value={form.specialty} onChange={handleChange} className={inputCls}>
                          <option value="general">General</option>
                          <option value="trauma">Trauma</option>
                          <option value="cardiac">Cardiac</option>
                          <option value="neuro">Neurology</option>
                          <option value="burn">Burn</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-[var(--text-muted)]">Total ICU Beds</label>
                        <input name="total_icu_beds" type="number" min="1" value={form.total_icu_beds}
                          onChange={handleChange} className={inputCls} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              type="submit" disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01, y: loading ? 0 : -1 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="w-full min-h-11 flex items-center justify-center gap-2.5 py-3 rounded-xl
                bg-gradient-to-r from-red-600 to-red-500 text-white font-semibold text-sm
                hover:from-red-500 hover:to-red-400 disabled:opacity-50 disabled:cursor-not-allowed
                shadow-lg shadow-red-500/20 transition-all duration-200"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating Account...</>
              ) : (
                <><UserPlus size={16} /> Create Account</>
              )}
            </motion.button>

            <p className="text-center text-sm text-[var(--text-muted)]">
              Already have an account?{' '}
              <Link to="/login" className="text-red-400 hover:text-red-300 font-semibold transition-colors">
                Sign In
              </Link>
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
