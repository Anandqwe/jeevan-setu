import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import useToastStore from '../../store/toastStore';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles = {
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-emerald-500/5',
  error: 'border-red-500/30 bg-red-500/10 text-red-400 shadow-red-500/5',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-amber-500/5',
  info: 'border-blue-500/30 bg-blue-500/10 text-blue-400 shadow-blue-500/5',
};

function ToastItem({ toast }) {
  const { removeToast } = useToastStore();
  const Icon = icons[toast.type] || Info;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.95, x: 20 }}
      animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
      exit={{ opacity: 0, x: 60, scale: 0.9 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border 
        backdrop-blur-xl shadow-lg text-sm font-medium min-w-[320px] max-w-[420px]
        ${styles[toast.type]}`}
    >
      <Icon size={18} className="shrink-0" />
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        onClick={() => removeToast(toast.id)}
        className="shrink-0 p-1 rounded-lg opacity-50 hover:opacity-100 
          hover:bg-white/10 transition-all"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

export default function ToastContainer() {
  const { toasts } = useToastStore();

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}
