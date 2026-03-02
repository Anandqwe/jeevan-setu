import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Activity, Ambulance, Building2, AlertTriangle, Clock, TrendingUp
} from 'lucide-react';
import { StatCard } from '../../shared/ui';
import useDispatchStore from '../../store/dispatchStore';

export default function SystemStats() {
  const { stats, fetchSystemStats, loading } = useDispatchStore();

  useEffect(() => {
    fetchSystemStats();
    const interval = setInterval(fetchSystemStats, 30000);
    return () => clearInterval(interval);
  }, [fetchSystemStats]);

  if (!stats && loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-white/[0.03] animate-pulse border border-white/5" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const bedAvailable = stats.total_bed_capacity - (
    stats.avg_hospital_occupancy
      ? Math.round(stats.total_bed_capacity * stats.avg_hospital_occupancy / 100)
      : 0
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-4
        bg-[var(--bg-secondary)]/30 backdrop-blur-sm border-b border-[var(--border-color)]"
    >
      <StatCard
        icon={Activity}
        label="Active Incidents"
        value={stats.active_incidents}
        subtext={`of ${stats.total_incidents} total`}
        color="red"
      />
      <StatCard
        icon={Ambulance}
        label="Available Units"
        value={stats.available_ambulances}
        subtext={`of ${stats.total_ambulances} fleet`}
        color="cyan"
      />
      <StatCard
        icon={Building2}
        label="Hospital Beds"
        value={bedAvailable}
        subtext={`${stats.avg_hospital_occupancy?.toFixed(0) || 0}% occupied`}
        color="purple"
      />
      <StatCard
        icon={AlertTriangle}
        label="Critical"
        value={stats.critical_incidents || 0}
        subtext="need attention"
        color="orange"
      />
      <StatCard
        icon={Clock}
        label="Avg Response"
        value={stats.avg_response_time ? `${(stats.avg_response_time / 60).toFixed(0)}m` : 'N/A'}
        subtext="response time"
        color="amber"
      />
      <StatCard
        icon={TrendingUp}
        label="Resolved Today"
        value={stats.resolved_today || 0}
        subtext="incidents closed"
        color="green"
      />
    </motion.div>
  );
}
