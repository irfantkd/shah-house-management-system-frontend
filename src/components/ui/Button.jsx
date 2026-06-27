import { cn } from '../../utils/cn';

const variants = {
  primary:        'bg-accent-600 text-white hover:bg-accent-700 shadow-sm shadow-accent-600/20 active:scale-[0.98]',
  secondary:      'bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-[0.98]',
  outline:        'border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-[0.98]',
  ghost:          'text-slate-600 hover:bg-slate-100 active:scale-[0.98]',
  danger:         'bg-danger-600 text-white hover:bg-danger-500 shadow-sm shadow-danger-600/20 active:scale-[0.98]',
  'danger-outline': 'border border-danger-200 text-danger-600 hover:bg-danger-50 active:scale-[0.98]',
  navy:           'bg-navy-900 text-white hover:bg-navy-800 shadow-sm active:scale-[0.98]',
  success:        'bg-success-600 text-white hover:bg-success-700 shadow-sm active:scale-[0.98]',
};

const sizes = {
  xs: 'h-7  px-2.5 text-[11px] rounded-lg  gap-1.5',
  sm: 'h-8  px-3   text-[12px] rounded-lg  gap-2',
  md: 'h-9  px-4   text-[13px] rounded-xl  gap-2',
  lg: 'h-10 px-5   text-[14px] rounded-xl  gap-2',
  xl: 'h-11 px-6   text-[15px] rounded-xl  gap-2.5',
};

export default function Button({
  children,
  variant  = 'primary',
  size     = 'md',
  icon: Icon,
  iconRight: IconRight,
  loading  = false,
  disabled = false,
  className,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && (
        <svg className="animate-spin w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {!loading && Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
      {children}
      {!loading && IconRight && <IconRight className="w-3.5 h-3.5 flex-shrink-0" />}
    </button>
  );
}
