import { cn } from '../../utils/cn';
import Button from './Button';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  actionLabel,
  className,
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-6 text-center', className)}>
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-slate-300" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-[15px] font-bold text-slate-700 mb-1">{title}</h3>
      {description && (
        <p className="text-[13px] text-slate-400 max-w-xs leading-relaxed">{description}</p>
      )}
      {action && actionLabel && (
        <div className="mt-5">
          <Button onClick={action} size="sm">{actionLabel}</Button>
        </div>
      )}
    </div>
  );
}
