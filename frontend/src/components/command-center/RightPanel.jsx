import { motion, AnimatePresence } from 'framer-motion';
import {
  X, MapPin, Clock, Ambulance, Building2, User, MessageSquare,
  AlertTriangle, Navigation, Phone, Activity
} from 'lucide-react';
import { StatusBadge, Card, EmptyState } from '../../shared/ui';
import useDispatchStore from '../../store/dispatchStore';
import useChatStore from '../../store/chatStore';

/* ─── Status Timeline ─── */
const timelineSteps = [
  { key: 'reported', label: 'Reported', color: 'bg-amber-400', text: 'text-amber-400' },
  { key: 'dispatched', label: 'Dispatched', color: 'bg-blue-400', text: 'text-blue-400' },
  { key: 'en_route', label: 'En Route', color: 'bg-cyan-400', text: 'text-cyan-400' },
  { key: 'on_scene', label: 'On Scene', color: 'bg-purple-400', text: 'text-purple-400' },
  { key: 'resolved', label: 'Resolved', color: 'bg-emerald-400', text: 'text-emerald-400' },
];

export default function RightPanel() {
  const { activeIncident, setActiveIncident } = useDispatchStore();
  const { setActiveIncident: openChat } = useChatStore();

  if (!activeIncident) {
    return (
      <div className="w-80 flex flex-col items-center justify-center h-full
        bg-[var(--bg-secondary)]/60 backdrop-blur-xl border-l border-[var(--border-color)]">
        <EmptyState
          icon={MapPin}
          title="Select an incident"
          description="Click on an incident from the list or map to view details"
        />
      </div>
    );
  }

  const inc = activeIncident;
  const currentStepIdx = timelineSteps.findIndex((s) => s.key === inc.status);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={inc.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-80 flex flex-col h-full bg-[var(--bg-secondary)]/60 backdrop-blur-xl
          border-l border-[var(--border-color)]"
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--border-color)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest">
              Incident #{inc.id}
            </h3>
            <motion.button
              onClick={() => setActiveIncident(null)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-1.5 rounded-xl hover:bg-white/10 transition-colors text-[var(--text-muted)]"
            >
              <X size={16} />
            </motion.button>
          </div>
          <div className="flex gap-2">
            <StatusBadge value={inc.severity} />
            <StatusBadge value={inc.status} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
          {/* Description */}
          {inc.description && (
            <div>
              <p className="text-[0.6rem] text-[var(--text-muted)] uppercase tracking-widest font-semibold mb-1.5">
                Description
              </p>
              <p className="text-sm text-[var(--text-primary)] leading-relaxed">{inc.description}</p>
            </div>
          )}

          {/* Location */}
          <Card hover={false} padding="p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-red-500/10">
                <MapPin size={12} className="text-red-400" />
              </div>
              <span className="text-xs font-semibold text-[var(--text-primary)]">Location</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] font-mono">
              {inc.latitude?.toFixed(6)}, {inc.longitude?.toFixed(6)}
            </p>
          </Card>

          {/* Patient */}
          {inc.patient && (
            <Card hover={false} padding="p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-green-500/10">
                  <User size={12} className="text-green-400" />
                </div>
                <span className="text-xs font-semibold text-[var(--text-primary)]">Patient</span>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">{inc.patient.name}</p>
              <p className="text-xs text-[var(--text-muted)]">{inc.patient.email}</p>
            </Card>
          )}

          {/* Ambulance */}
          {inc.ambulance && (
            <Card hover={false} padding="p-3.5" glow="blue">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/10">
                  <Ambulance size={12} className="text-cyan-400" />
                </div>
                <span className="text-xs font-semibold text-[var(--text-primary)]">Ambulance</span>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                {inc.ambulance.vehicle_number || `Unit #${inc.ambulance.id}`}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Status: <span className="capitalize">{inc.ambulance.status?.replace(/_/g, ' ')}</span>
              </p>
            </Card>
          )}

          {/* Hospital */}
          {inc.hospital && (
            <Card hover={false} padding="p-3.5" glow="purple">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-purple-500/10">
                  <Building2 size={12} className="text-purple-400" />
                </div>
                <span className="text-xs font-semibold text-[var(--text-primary)]">Hospital</span>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">{inc.hospital.name}</p>
              <p className="text-xs text-[var(--text-muted)]">
                Beds: {inc.hospital.available_beds}/{inc.hospital.total_beds}
              </p>
            </Card>
          )}

          {/* Timeline */}
          <div>
            <p className="text-[0.6rem] text-[var(--text-muted)] uppercase tracking-widest font-semibold mb-3">
              Progress
            </p>
            <div className="space-y-0">
              {timelineSteps.map((step, idx) => {
                const reached = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-3 h-3 rounded-full transition-all duration-300
                          ${reached ? step.color : 'bg-white/10'}
                          ${isCurrent ? 'ring-2 ring-offset-2 ring-offset-[var(--bg-secondary)]' : ''}
                        `}
                        style={isCurrent ? { boxShadow: `0 0 8px ${step.color.includes('amber') ? '#f59e0b' : step.color.includes('blue') ? '#3b82f6' : step.color.includes('cyan') ? '#06b6d4' : step.color.includes('purple') ? '#a855f7' : '#10b981'}40` } : {}}
                      />
                      {idx < timelineSteps.length - 1 && (
                        <div className={`w-0.5 h-5 ${reached && idx < currentStepIdx ? step.color + ' opacity-50' : 'bg-white/8'}`} />
                      )}
                    </div>
                    <span className={`text-xs ${reached ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'} ${isCurrent ? 'font-bold' : 'font-medium'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Response Time */}
          {inc.response_time_seconds && (
            <Card hover={false} padding="p-3.5" glow="amber">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="p-1.5 rounded-lg bg-amber-500/10">
                  <Clock size={12} className="text-amber-400" />
                </div>
                <span className="text-xs font-semibold text-[var(--text-primary)]">Response Time</span>
              </div>
              <p className="text-xl font-bold text-amber-400">
                {Math.floor(inc.response_time_seconds / 60)}m {inc.response_time_seconds % 60}s
              </p>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--border-color)]">
          <motion.button
            onClick={() => openChat(inc.id)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4
              bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl
              text-white text-sm font-semibold shadow-lg shadow-blue-500/20
              hover:shadow-blue-500/30 transition-all"
          >
            <MessageSquare size={14} />
            Open Chat
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
