import { motion } from 'framer-motion';
import { cardHover } from '../utils/animations';

export default function Card({
  children,
  className = '',
  glow,
  hover = true,
  padding = 'p-5',
  ...props
}) {
  const glowMap = {
    red: 'shadow-red-500/5 hover:shadow-red-500/10',
    blue: 'shadow-blue-500/5 hover:shadow-blue-500/10',
    green: 'shadow-green-500/5 hover:shadow-green-500/10',
    purple: 'shadow-purple-500/5 hover:shadow-purple-500/10',
    amber: 'shadow-amber-500/5 hover:shadow-amber-500/10',
  };

  const glowClass = glow ? glowMap[glow] || '' : '';

  return (
    <motion.div
      {...(hover ? cardHover : {})}
      className={`glass-card ${padding} rounded-2xl shadow-lg transition-shadow
        ${glowClass} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}
