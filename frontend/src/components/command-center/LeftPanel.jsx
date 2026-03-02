import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, MapPin, Ambulance, Search, Filter,
  ChevronDown
} from 'lucide-react';
import { StatusBadge, EmptyState } from '../../shared/ui';
import useDispatchStore from '../../store/dispatchStore';

export default function LeftPanel() {
  const { incidents, activeIncident, setActiveIncident, loading } = useDispatchStore();
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);

  const filteredIncidents = [...incidents]
    .filter((i) => {
      if (filterSeverity !== 'all' && i.severity !== filterSeverity) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          i.description?.toLowerCase().includes(q) ||
          i.patient_name?.toLowerCase().includes(q) ||
          String(i.id).includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const statusOrder = { reported: 0, dispatched: 1, en_route: 2, on_scene: 3, resolved: 4 };
      if (statusOrder[a.status] !== statusOrder[b.status]) return (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5);
      return (sevOrder[a.severity] || 3) - (sevOrder[b.severity] || 3);
    });

  const activeCount = incidents.filter((i) =>
    ['reported', 'dispatched', 'en_route', 'on_scene'].includes(i.status)
  ).length;
  const criticalCount = incidents.filter(
    (i) => i.severity === 'critical' && i.status !== 'resolved'
  ).length;

  return (
    <div className="w-80 flex flex-col h-full bg-[var(--bg-secondary)]/60 backdrop-blur-xl border-r border-[var(--border-color)]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-color)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest">
            Incidents
          </h2>
          <span className="text-[0.6rem] text-[var(--text-muted)] bg-white/5 px-2 py-1 rounded-lg font-semibold">
            {incidents.length} total
          </span>
        </div>

        {/* Stat pills */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1 bg-orange-500/8 border border-orange-500/15 rounded-xl p-2.5 text-center">
            <p className="text-lg font-bold text-orange-400">{activeCount}</p>
            <p className="text-[0.55rem] text-orange-400/70 uppercase tracking-widest font-semibold">Active</p>
          </div>
          <div className="flex-1 bg-red-500/8 border border-red-500/15 rounded-xl p-2.5 text-center">
            <p className="text-lg font-bold text-red-400">{criticalCount}</p>
            <p className="text-[0.55rem] text-red-400/70 uppercase tracking-widest font-semibold">Critical</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search incidents..."
            className="w-full pl-9 pr-10 py-2 rounded-xl glass-input text-xs"
          />
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors
              ${filterOpen || filterSeverity !== 'all' ? 'text-red-400 bg-red-500/10' : 'text-[var(--text-muted)] hover:bg-white/5'}`}
          >
            <Filter size={12} />
          </button>
        </div>

        {/* Filters */}
        <AnimatePresence>
          {filterOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex gap-1.5 mt-2 pt-2">
                {['all', 'critical', 'high', 'medium', 'low'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterSeverity(s)}
                    className={`px-2.5 py-1 rounded-lg text-[0.6rem] font-semibold uppercase tracking-wider transition-all
                      ${filterSeverity === s
                        ? 'bg-red-500/15 text-red-400 border border-red-500/25'
                        : 'text-[var(--text-muted)] hover:bg-white/5 border border-transparent'
                      }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Incident List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="p-4 space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-[72px] rounded-xl bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        ) : filteredIncidents.length > 0 ? (
          <div className="p-2">
            <AnimatePresence>
              {filteredIncidents.map((incident, idx) => (
                <motion.div
                  key={incident.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ delay: idx * 0.02, duration: 0.3 }}
                  onClick={() => setActiveIncident(incident)}
                  className={`p-3 mx-1 my-0.5 rounded-xl cursor-pointer transition-all duration-200
                    border
                    ${activeIncident?.id === incident.id
                      ? 'bg-red-500/8 border-red-500/25 shadow-sm shadow-red-500/5'
                      : 'border-transparent hover:bg-white/[0.04] hover:border-white/8'
                    }`}
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertTriangle
                        size={11}
                        className={
                          incident.severity === 'critical' ? 'text-red-400 shrink-0' :
                          incident.severity === 'high' ? 'text-orange-400 shrink-0' :
                          'text-amber-400 shrink-0'
                        }
                      />
                      <span className="text-[0.78rem] font-medium text-[var(--text-primary)] truncate">
                        {incident.description || `Incident #${incident.id}`}
                      </span>
                    </div>
                    <StatusBadge value={incident.severity} size="xs" />
                  </div>

                  <div className="flex items-center gap-3 text-[0.6rem] text-[var(--text-muted)]">
                    <span className="flex items-center gap-1">
                      <MapPin size={9} />
                      {incident.latitude?.toFixed(2)}, {incident.longitude?.toFixed(2)}
                    </span>
                    <StatusBadge value={incident.status} size="xs" />
                  </div>

                  {incident.ambulance && (
                    <div className="flex items-center gap-1 mt-1.5 text-[0.6rem] text-cyan-400/80">
                      <Ambulance size={9} />
                      <span>{incident.ambulance.vehicle_number || 'Assigned'}</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <EmptyState
            icon={AlertTriangle}
            title={search ? 'No results' : 'No incidents'}
            description={search ? 'Try a different search term' : 'All clear — no incidents reported'}
          />
        )}
      </div>
    </div>
  );
}
