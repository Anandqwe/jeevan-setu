import { motion } from 'framer-motion';
import { Inbox } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'No data yet',
  description = 'Data will appear here once available.',
  action,
  className = '',
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}
    >
      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
        <Icon size={28} className="text-[var(--text-muted)] opacity-50" />
      </div>
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1.5">{title}</h3>
      <p className="text-sm text-[var(--text-muted)] max-w-xs mb-6">{description}</p>
      {action && action}
    </motion.div>
  );
}
