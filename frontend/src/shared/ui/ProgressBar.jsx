import { motion } from 'framer-motion';

export default function ProgressBar({
  value,
  max = 100,
  color = 'red',
  label,
  showValue = true,
  size = 'md',
  animate = true,
  className = '',
}) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));

  const colorClasses = {
    red: 'bg-gradient-to-r from-red-500 to-red-400',
    blue: 'bg-gradient-to-r from-blue-500 to-blue-400',
    green: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
    purple: 'bg-gradient-to-r from-purple-500 to-purple-400',
    amber: 'bg-gradient-to-r from-amber-500 to-amber-400',
    cyan: 'bg-gradient-to-r from-cyan-500 to-cyan-400',
  };

  // Support direct Tailwind classes
  const barColor = color.startsWith('bg-') ? color : (colorClasses[color] || colorClasses.red);

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={`w-full ${className}`}>
      {(label || showValue) && (
        <div className="flex justify-between items-center text-xs mb-2">
          {label && <span className="text-[var(--text-secondary)] font-medium">{label}</span>}
          {showValue && (
            <span className="text-[var(--text-muted)] font-semibold tabular-nums">
              {Math.round(percent)}%
            </span>
          )}
        </div>
      )}
      <div className={`bg-white/5 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={animate ? { width: 0 } : false}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}
