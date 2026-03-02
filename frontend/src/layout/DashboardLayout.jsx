import { motion } from 'framer-motion';
import TopBar from './TopBar';

/**
 * DashboardLayout - Wraps all dashboard pages with consistent TopBar + content area.
 * Optional sidebar slot for split-panel layouts.
 */
export default function DashboardLayout({
  children,
  sidebar,
  sidebarWidth = 'w-96',
  fullHeight = true,
  className = '',
}) {
  return (
    <div className={`${fullHeight ? 'min-h-dvh h-dvh' : 'min-h-screen'} flex flex-col bg-[var(--bg-primary)]`}>
      <TopBar />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className={`flex-1 flex overflow-hidden ${className}`}
      >
        {/* Sidebar */}
        {sidebar && (
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className={`${sidebarWidth} hidden lg:flex flex-col h-full 
              bg-[var(--bg-secondary)]/60 backdrop-blur-xl
              border-r border-[var(--border-color)] overflow-y-auto scrollbar-thin`}
          >
            {sidebar}
          </motion.div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
