import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ size = 'md', label, className = '' }) {
  const sizes = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <Loader2 className={`${sizes[size]} text-[var(--accent)] animate-spin`} />
      {label && (
        <p className="text-sm text-[var(--text-muted)] font-medium">{label}</p>
      )}
    </div>
  );
}

export function PageLoader({ label = 'Loading Jeevan Setu...' }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] bg-radial-dark">
      <div className="text-center">
        <div className="relative mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 
            flex items-center justify-center mx-auto shadow-lg shadow-red-500/20">
            <span className="text-2xl">🚨</span>
          </div>
          <div className="absolute inset-0 w-14 h-14 mx-auto rounded-2xl 
            bg-red-500/20 animate-ping" />
        </div>
        <p className="text-sm text-[var(--text-muted)] font-medium tracking-wide">{label}</p>
      </div>
    </div>
  );
}
