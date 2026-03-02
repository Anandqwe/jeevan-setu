import { motion } from 'framer-motion';

export default function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  color = 'red',
  gradient,
  className = '',
}) {
  const colorStyles = {
    red: { card: 'border-red-500/20 from-red-500/8 to-red-900/5', icon: 'text-red-400', glow: 'shadow-red-500/5' },
    blue: { card: 'border-blue-500/20 from-blue-500/8 to-blue-900/5', icon: 'text-blue-400', glow: 'shadow-blue-500/5' },
    green: { card: 'border-emerald-500/20 from-emerald-500/8 to-emerald-900/5', icon: 'text-emerald-400', glow: 'shadow-emerald-500/5' },
    purple: { card: 'border-purple-500/20 from-purple-500/8 to-purple-900/5', icon: 'text-purple-400', glow: 'shadow-purple-500/5' },
    amber: { card: 'border-amber-500/20 from-amber-500/8 to-amber-900/5', icon: 'text-amber-400', glow: 'shadow-amber-500/5' },
    cyan: { card: 'border-cyan-500/20 from-cyan-500/8 to-cyan-900/5', icon: 'text-cyan-400', glow: 'shadow-cyan-500/5' },
    orange: { card: 'border-orange-500/20 from-orange-500/8 to-orange-900/5', icon: 'text-orange-400', glow: 'shadow-orange-500/5' },
  };

  const style = colorStyles[color] || colorStyles.red;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`bg-gradient-to-br ${style.card} border rounded-2xl p-4 
        shadow-lg ${style.glow} backdrop-blur-sm ${className}`}
    >
      <div className="flex items-center gap-2.5 mb-3">
        {Icon && (
          <div className={`p-2 rounded-xl bg-white/5 ${style.icon}`}>
            <Icon size={16} />
          </div>
        )}
        <span className="text-[0.68rem] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
        {value}
      </div>
      {subtext && (
        <div className="text-xs text-[var(--text-muted)] mt-1.5">{subtext}</div>
      )}
    </motion.div>
  );
}
