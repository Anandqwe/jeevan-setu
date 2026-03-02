import { useEffect } from 'react';
import { motion } from 'framer-motion';
import useDispatchStore from '../store/dispatchStore';
import useAuthStore from '../store/authStore';
import TopBar from '../layout/TopBar';
import SystemStats from '../components/command-center/SystemStats';
import LeftPanel from '../components/command-center/LeftPanel';
import RightPanel from '../components/command-center/RightPanel';
import LiveMap from '../components/map/LiveMap';
import ChatPanel from '../components/chat/ChatPanel';

export default function CommandCenter() {
  const { fetchAllIncidents, fetchAllAmbulances, fetchAllHospitals } = useDispatchStore();
  const { token } = useAuthStore();

  useEffect(() => {
    fetchAllIncidents();
    fetchAllAmbulances();
    fetchAllHospitals();

    const interval = setInterval(() => {
      fetchAllIncidents();
      fetchAllAmbulances();
      fetchAllHospitals();
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchAllIncidents, fetchAllAmbulances, fetchAllHospitals]);

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-primary)]">
      <TopBar />
      <SystemStats />

      {/* Main 3-panel layout */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="flex-1 flex overflow-hidden"
      >
        {/* Left: Incident list */}
        <div className="hidden lg:block">
          <LeftPanel />
        </div>

        {/* Center: Map */}
        <div className="flex-1 relative">
          <LiveMap className="w-full h-full" />
        </div>

        {/* Right: Detail panel */}
        <div className="hidden lg:block">
          <RightPanel />
        </div>
      </motion.div>

      {/* Floating chat panel */}
      <ChatPanel />
    </div>
  );
}
