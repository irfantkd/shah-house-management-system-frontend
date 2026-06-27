import { cn } from '../../utils/cn';

export function Skeleton({ className }) {
  return (
    <div className={cn('animate-pulse bg-slate-100 rounded-xl', className)} />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col gap-4" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-start justify-between">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <Skeleton className="w-16 h-5 rounded-full" />
      </div>
      <div>
        <Skeleton className="w-16 h-8 rounded-lg mb-2" />
        <Skeleton className="w-28 h-3 rounded" />
      </div>
    </div>
  );
}

export function CardSkeleton({ rows = 3, className }) {
  return (
    <div className={cn('bg-white rounded-2xl border border-slate-100 p-5', className)} style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center justify-between mb-5">
        <Skeleton className="w-32 h-5 rounded" />
        <Skeleton className="w-16 h-7 rounded-lg" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 rounded w-3/4" />
              <Skeleton className="h-3 rounded w-1/2" />
            </div>
            <Skeleton className="w-16 h-5 rounded-full flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-accent-600 flex items-center justify-center animate-pulse">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-accent-600 animate-bounce"
              style={{ animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default PageLoader;
