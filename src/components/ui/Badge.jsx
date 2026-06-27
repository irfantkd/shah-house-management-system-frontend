import { cn } from '../../utils/cn';

const variants = {
  default:  'bg-slate-100 text-slate-600',
  primary:  'bg-accent-50 text-accent-700',
  success:  'bg-success-50 text-success-600',
  warning:  'bg-warning-50 text-warning-600',
  danger:   'bg-danger-50 text-danger-600',
  navy:     'bg-navy-900 text-white',
  outline:  'border border-slate-200 text-slate-600 bg-transparent',
};

const sizes = {
  sm: 'h-5 px-2 text-[10px] rounded-md',
  md: 'h-6 px-2.5 text-[11px] rounded-lg',
  lg: 'h-7 px-3 text-[12px] rounded-lg',
};

export default function Badge({
  children,
  variant = 'default',
  size    = 'md',
  dot     = false,
  className,
}) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 font-semibold whitespace-nowrap',
      variants[variant],
      sizes[size],
      className,
    )}>
      {dot && (
        <span className={cn(
          'w-1.5 h-1.5 rounded-full flex-shrink-0',
          variant === 'success' && 'bg-success-500',
          variant === 'warning' && 'bg-warning-500',
          variant === 'danger'  && 'bg-danger-500',
          variant === 'primary' && 'bg-accent-500',
          variant === 'default' && 'bg-slate-400',
        )} />
      )}
      {children}
    </span>
  );
}
