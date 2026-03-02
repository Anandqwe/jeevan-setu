import { motion } from 'framer-motion';

export default function MessageBubble({ message, isOwn }) {
  const time = message.created_at
    ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'text-purple-400';
      case 'ems': return 'text-cyan-400';
      case 'hospital': return 'text-emerald-400';
      case 'patient': return 'text-red-400';
      default: return 'text-[var(--text-muted)]';
    }
  };

  const getRoleBg = (role) => {
    switch (role) {
      case 'admin': return 'bg-purple-500/8';
      case 'ems': return 'bg-cyan-500/8';
      case 'hospital': return 'bg-emerald-500/8';
      case 'patient': return 'bg-red-500/8';
      default: return '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 
          ${isOwn
            ? 'bg-gradient-to-br from-blue-600/90 to-blue-500/90 text-white rounded-br-md'
            : `bg-white/[0.04] border border-white/8 text-[var(--text-primary)] rounded-bl-md ${getRoleBg(message.sender_role)}`
          }`}
      >
        {!isOwn && message.sender_name && (
          <p className={`text-[0.6rem] font-bold mb-1 ${getRoleColor(message.sender_role)}`}>
            {message.sender_name}
            {message.sender_role && (
              <span className="text-[var(--text-muted)] ml-1.5 font-medium text-[0.5rem] uppercase tracking-wider">
                {message.sender_role}
              </span>
            )}
          </p>
        )}
        <p className="text-[0.82rem] leading-relaxed break-words">{message.content}</p>
        <p className={`text-[0.5rem] mt-1.5 ${isOwn ? 'text-white/40' : 'text-[var(--text-muted)]'} text-right`}>
          {time}
        </p>
      </div>
    </motion.div>
  );
}
