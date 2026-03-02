import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Minimize2 } from 'lucide-react';
import useChatStore from '../../store/chatStore';
import useAuthStore from '../../store/authStore';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';

export default function ChatPanel() {
  const { messages, activeIncidentId, setActiveIncident, fetchMessages, loading } = useChatStore();
  const { user } = useAuthStore();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (activeIncidentId) {
      fetchMessages(activeIncidentId);
    }
  }, [activeIncidentId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!activeIncidentId) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.92 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="fixed bottom-4 right-4 z-[2000] w-80 h-[28rem]
          flex flex-col rounded-2xl overflow-hidden
          glass-panel border border-[var(--border-color)]
          shadow-2xl shadow-black/40"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3.5
          bg-gradient-to-r from-blue-600/90 to-blue-500/90 backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-white/15">
              <MessageSquare size={13} className="text-white" />
            </div>
            <div>
              <span className="text-sm font-bold text-white">
                Incident #{activeIncidentId}
              </span>
              <p className="text-[0.55rem] text-white/60 font-medium">Live Chat</p>
            </div>
          </div>
          <motion.button
            onClick={() => setActiveIncident(null)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-1.5 rounded-lg hover:bg-white/15 transition-colors text-white/70 hover:text-white"
          >
            <X size={15} />
          </motion.button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin">
          {loading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-[var(--text-muted)]">Loading messages...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)]">
              <div className="p-3 rounded-2xl bg-white/[0.03] mb-3">
                <MessageSquare size={22} className="opacity-30" />
              </div>
              <p className="text-sm font-medium">No messages yet</p>
              <p className="text-xs opacity-60 mt-0.5">Start the conversation</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <MessageBubble
                key={msg.id || idx}
                message={msg}
                isOwn={msg.sender_id === user?.id}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <ChatInput incidentId={activeIncidentId} />
      </motion.div>
    </AnimatePresence>
  );
}
