import { motion } from 'framer-motion';

const colorMap = {
  // Severity
  low: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/25', dot: 'bg-emerald-400' },
  medium: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/25', dot: 'bg-amber-400' },
  high: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/25', dot: 'bg-orange-400' },
  critical: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/25', dot: 'bg-red-400' },
  // Status
  available: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/25', dot: 'bg-emerald-400' },
  busy: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/25', dot: 'bg-amber-400' },
  off_duty: { bg: 'bg-gray-500/15', text: 'text-gray-400', border: 'border-gray-500/25', dot: 'bg-gray-400' },
  created: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/25', dot: 'bg-blue-400' },
  assigned: { bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/25', dot: 'bg-indigo-400' },
  en_route: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/25', dot: 'bg-cyan-400' },
  on_scene: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/25', dot: 'bg-purple-400' },
  transporting: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/25', dot: 'bg-amber-400' },
  completed: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/25', dot: 'bg-emerald-400' },
  cancelled: { bg: 'bg-gray-500/15', text: 'text-gray-400', border: 'border-gray-500/25', dot: 'bg-gray-400' },
  reported: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/25', dot: 'bg-amber-400' },
  dispatched: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/25', dot: 'bg-blue-400' },
  resolved: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/25', dot: 'bg-emerald-400' },
};

const fallback = { bg: 'bg-gray-500/15', text: 'text-gray-400', border: 'border-gray-500/25', dot: 'bg-gray-400' };

export default function StatusBadge({ status, value, size = 'sm', animate = true, dot = true, className = '' }) {
  const key = status || value;
  const style = colorMap[key] || fallback;
  const label = key?.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN';

  const sizeClasses = {
    xs: 'text-[0.62rem] px-2 py-0.5 gap-1',
    sm: 'text-[0.7rem] px-2.5 py-1 gap-1.5',
    md: 'text-xs px-3 py-1.5 gap-2',
  };

  const Wrapper = animate ? motion.span : 'span';
  const animProps = animate ? {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
  } : {};

  return (
    <Wrapper
      className={`inline-flex items-center rounded-full font-semibold tracking-wider border
        ${sizeClasses[size]} ${style.bg} ${style.text} ${style.border} ${className}`}
      {...animProps}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${style.dot} shrink-0`} />}
      {label}
    </Wrapper>
  );
}
