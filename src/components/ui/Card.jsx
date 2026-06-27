import { cn } from '../../utils/cn';

export default function Card({ children, className, hover = false, padding = true, ...props }) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-slate-100',
        padding && 'p-5',
        hover && 'hover:shadow-md transition-shadow duration-200 cursor-pointer',
        className,
      )}
      style={{ boxShadow: 'var(--shadow-card)' }}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className }) {
  return (
    <div className={cn('flex items-start justify-between mb-5', className)}>
      <div>
        <h3 className="text-[15px] font-bold text-slate-800 leading-tight">{title}</h3>
        {subtitle && <p className="text-[12px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
