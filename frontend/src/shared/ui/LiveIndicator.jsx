export default function LiveIndicator({ label = 'LIVE', color = 'green', className = '' }) {
  const dotColors = {
    green: 'bg-emerald-400',
    red: 'bg-red-400',
    blue: 'bg-blue-400',
    amber: 'bg-amber-400',
  };

  const textColors = {
    green: 'text-emerald-400',
    red: 'text-red-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
  };

  const bgColors = {
    green: 'bg-emerald-500/10 border-emerald-500/20',
    red: 'bg-red-500/10 border-red-500/20',
    blue: 'bg-blue-500/10 border-blue-500/20',
    amber: 'bg-amber-500/10 border-amber-500/20',
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border
      ${bgColors[color]} ${className}`}>
      <span className="relative flex h-2 w-2">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColors[color]}`} />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColors[color]}`} />
      </span>
      <span className={`text-[0.72rem] font-bold tracking-wide uppercase ${textColors[color]}`}>
        {label}
      </span>
    </div>
  );
}
