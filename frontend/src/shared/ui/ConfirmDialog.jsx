import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
}) {
  const variants = {
    danger: {
      icon: 'text-red-400 bg-red-500/10',
      button: 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400',
    },
    warning: {
      icon: 'text-amber-400 bg-amber-500/10',
      button: 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400',
    },
    info: {
      icon: 'text-blue-400 bg-blue-500/10',
      button: 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400',
    },
  };

  const style = variants[variant] || variants.danger;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[6000] flex items-center justify-center p-4"
          onClick={onCancel}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm glass-panel rounded-2xl shadow-2xl p-6
              border border-[var(--border-color)]"
          >
            <div className={`w-12 h-12 rounded-2xl ${style.icon} flex items-center justify-center mx-auto mb-4`}>
              <AlertTriangle size={24} />
            </div>

            <h3 className="text-lg font-semibold text-[var(--text-primary)] text-center mb-2">
              {title}
            </h3>
            <p className="text-sm text-[var(--text-muted)] text-center mb-6">
              {message}
            </p>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-[var(--border-color)]
                  text-[var(--text-secondary)] text-sm font-medium
                  hover:bg-white/10 transition-all"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold
                  transition-all ${style.button}`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
