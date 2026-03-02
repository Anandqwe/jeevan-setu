import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Download, Calendar, TrendingUp } from 'lucide-react';
import TopBar from '../layout/TopBar';
import {
  IncidentTrendChart,
  ResponseTimeChart,
  AmbulanceUtilChart,
  HospitalOccupancyChart,
} from '../components/analytics/Charts';

export default function Analytics() {
  const [days, setDays] = useState(30);

  return (
    <div className="min-h-dvh h-dvh flex flex-col bg-[var(--bg-primary)]">
      <TopBar />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/15">
                <BarChart3 size={20} className="text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                  Analytics Dashboard
                </h1>
                <p className="text-sm text-[var(--text-muted)] mt-0.5">
                  Real-time operational metrics and performance insights
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Time range selector */}
              <div className="flex items-center gap-1 bg-white/[0.03] backdrop-blur-sm 
                rounded-xl p-1 border border-white/5">
                {[7, 14, 30, 90].map((d) => (
                  <motion.button
                    key={d}
                    onClick={() => setDays(d)}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all
                      ${days === d
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25 shadow-sm'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 border border-transparent'
                      }`}
                  >
                    {d}d
                  </motion.button>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold
                  text-[var(--text-muted)] hover:text-[var(--text-primary)]
                  bg-white/[0.03] hover:bg-white/[0.06] rounded-xl border border-white/5
                  transition-all"
              >
                <Download size={13} />
                Export
              </motion.button>
            </div>
          </motion.div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <IncidentTrendChart days={days} />
            <ResponseTimeChart days={days} />
            <AmbulanceUtilChart />
            <HospitalOccupancyChart />
          </div>
        </div>
      </div>
    </div>
  );
}
