import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, Clock, Ambulance, Building2 } from 'lucide-react';
import api from '../../services/api';
import { Card } from '../../shared/ui';

const COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  primary: '#3b82f6',
  accent: '#8b5cf6',
  cyan: '#06b6d4',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div className="glass-panel border border-[var(--border-color)] rounded-xl p-3 shadow-2xl text-xs">
      <p className="font-bold text-[var(--text-primary)] mb-1.5">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="flex items-center gap-1.5 py-0.5">
          <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: entry.color }} />
          {entry.name}: <strong>{entry.value}</strong>
        </p>
      ))}
    </div>
  );
};

/* ─── Chart Wrapper ─── */
function ChartCard({ title, icon: Icon, subtitle, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card padding="p-5" className="h-full">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-2 rounded-xl bg-white/5">
            <Icon size={15} className="text-[var(--accent-primary)]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">{title}</h3>
            {subtitle && <p className="text-[0.6rem] text-[var(--text-muted)]">{subtitle}</p>}
          </div>
        </div>
        {children}
      </Card>
    </motion.div>
  );
}

function ChartSkeleton() {
  return (
    <Card padding="p-5">
      <div className="h-4 w-36 bg-white/5 rounded-lg mb-5 animate-pulse" />
      <div className="h-[280px] bg-white/[0.03] rounded-xl animate-pulse" />
    </Card>
  );
}

/* ─── Incident Trends ─── */
export function IncidentTrendChart({ days = 30 }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/analytics/incident-trends?days=${days}`)
      .then((res) => {
        const transformed = (res.data || []).map((d) => ({
          date: d.date,
          total: d.count || 0,
          critical: d.severity_breakdown?.critical || 0,
          high: d.severity_breakdown?.high || 0,
        }));
        setData(transformed);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <ChartSkeleton />;

  return (
    <ChartCard title="Incident Trends" icon={TrendingUp} subtitle={`Last ${days} days`}>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="criticalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.critical} stopOpacity={0.25} />
              <stop offset="95%" stopColor={COLORS.critical} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="highGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.high} stopOpacity={0.25} />
              <stop offset="95%" stopColor={COLORS.high} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.25} />
              <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="total" name="Total"
            stroke={COLORS.primary} fill="url(#totalGrad)" strokeWidth={2} />
          <Area type="monotone" dataKey="critical" name="Critical"
            stroke={COLORS.critical} fill="url(#criticalGrad)" strokeWidth={1.5} />
          <Area type="monotone" dataKey="high" name="High"
            stroke={COLORS.high} fill="url(#highGrad)" strokeWidth={1.5} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ─── Response Times ─── */
export function ResponseTimeChart({ days = 30 }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/analytics/response-times?days=${days}`)
      .then((res) => {
        // Backend returns a single ResponseTimeStats object; transform by_severity into a list
        const stats = res.data || {};
        const bySev = stats.by_severity || {};
        const transformed = Object.entries(bySev).map(([severity, avgSec]) => ({
          severity,
          avg: Math.round(avgSec / 60),
          min: Math.round((stats.min_seconds || 0) / 60),
          max: Math.round((stats.max_seconds || 0) / 60),
        }));
        setData(transformed);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <ChartSkeleton />;

  const chartData = data;

  return (
    <ChartCard title="Response Times" icon={Clock} subtitle="Minutes by severity">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="severity" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
          <YAxis unit="m" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="avg" name="Average" fill={COLORS.primary} radius={[6, 6, 0, 0]} />
          <Bar dataKey="min" name="Min" fill={COLORS.cyan} radius={[6, 6, 0, 0]} />
          <Bar dataKey="max" name="Max" fill={COLORS.accent} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ─── Ambulance Utilization ─── */
export function AmbulanceUtilChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/analytics/ambulance-utilization')
      .then((res) => {
        const transformed = (res.data || []).map((d) => ({
          vehicle_number: `${d.capability_level} #${d.ambulance_id}`,
          total_incidents: d.total_incidents || 0,
          status: d.status,
        }));
        setData(transformed);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ChartSkeleton />;

  return (
    <ChartCard title="Ambulance Utilization" icon={Ambulance} subtitle="Incidents per unit">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
          <YAxis dataKey="vehicle_number" type="category"
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }} width={100} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="total_incidents" name="Total" fill={COLORS.cyan} radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/* ─── Hospital Occupancy ─── */
export function HospitalOccupancyChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/analytics/hospital-occupancy')
      .then((res) => setData(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ChartSkeleton />;

  const pieData = data.map((d) => ({
    name: d.name?.substring(0, 15) || 'Unknown',
    value: Math.round((d.occupancy_rate || 0) * 100),
  }));

  const PIE_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

  return (
    <ChartCard title="Hospital Occupancy" icon={Building2} subtitle="Bed utilization %">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={105}
            paddingAngle={4}
            dataKey="value"
            label={({ name, value }) => `${name}: ${value}%`}
            strokeWidth={0}
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
