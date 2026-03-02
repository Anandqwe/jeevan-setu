import { motion } from 'framer-motion';

const variants = {
  rect: 'rounded-xl',
  circle: 'rounded-full',
  text: 'rounded-lg h-4',
};

export default function Skeleton({ className = '', variant = 'rect' }) {
  return (
    <div className={`skeleton ${variants[variant]} ${className}`} />
  );
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`glass-card p-5 space-y-4 ${className}`}>
      <Skeleton className="h-4 w-28" variant="text" />
      <Skeleton className="h-10 w-20" variant="text" />
      <Skeleton className="h-2 w-full" variant="text" />
    </div>
  );
}

export function SkeletonList({ count = 5 }) {
  return (
    <div className="space-y-3 p-4">
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.05 }}
        >
          <Skeleton className="h-20 w-full" />
        </motion.div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="space-y-2 p-4">
      <div className="flex gap-3">
        {[...Array(cols)].map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" variant="text" />
        ))}
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex gap-3">
          {[...Array(cols)].map((_, j) => (
            <Skeleton key={j} className="h-10 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
