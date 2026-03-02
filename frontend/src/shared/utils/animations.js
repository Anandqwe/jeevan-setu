// Framer Motion animation presets for the design system
export const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.3 },
};

export const slideUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
};

export const slideDown = {
  initial: { opacity: 0, y: -16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
};

export const slideRight = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
};

export const slideLeft = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
};

export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

export const staggerItem = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

export const cardHover = {
  whileHover: { y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.3)' },
  whileTap: { scale: 0.98 },
  transition: { duration: 0.2 },
};

export const buttonHover = {
  whileHover: { scale: 1.02, y: -1 },
  whileTap: { scale: 0.97 },
  transition: { duration: 0.15 },
};

export const pulseAnimation = {
  animate: { scale: [1, 1.05, 1] },
  transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
};
