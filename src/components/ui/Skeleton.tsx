/** Bloque base para skeleton screens — usa el gradiente shimmer del Design System (globals.css). */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton-shimmer rounded-lg ${className}`} />;
}
