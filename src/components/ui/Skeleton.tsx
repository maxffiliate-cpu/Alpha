export default function Skeleton({ className }: { className?: string }) {
  return (
    <div 
      className={`animate-pulse bg-slate-800/50 rounded-lg ${className}`}
      style={{
        backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 2s infinite linear'
      }}
    />
  );
}
