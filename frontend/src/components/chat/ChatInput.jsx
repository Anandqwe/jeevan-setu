import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import useChatStore from '../../store/chatStore';

export default function ChatInput({ incidentId }) {
  const [text, setText] = useState('');
  const { sendMessage } = useChatStore();
  const inputRef = useRef(null);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      await sendMessage(incidentId, trimmed);
      setText('');
      inputRef.current?.focus();
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-2.5 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/80 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 glass-input px-3.5 py-2.5 rounded-xl text-sm"
          disabled={sending}
        />
        <motion.button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-white
            shadow-lg shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed
            transition-all"
        >
          <Send size={14} />
        </motion.button>
      </div>
    </div>
  );
}
