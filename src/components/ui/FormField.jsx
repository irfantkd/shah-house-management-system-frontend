import { forwardRef } from 'react';
import { RiErrorWarningLine } from 'react-icons/ri';
import { cn } from '../../utils/cn';

const base = 'w-full rounded-xl border border-slate-200 bg-white text-[13px] text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-accent-400 focus:border-accent-400 transition-all disabled:bg-slate-50 disabled:cursor-not-allowed';

export function Field({ label, error, required, hint, children, className }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="flex items-center gap-1 text-[11.5px] font-bold text-slate-500 uppercase tracking-wider">
          {label}
          {required && <span className="text-danger-500 text-[13px] leading-none">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-[11px] text-slate-400 pl-0.5">{hint}</p>}
      {error && (
        <p className="flex items-center gap-1 text-[11px] text-danger-500 pl-0.5">
          <RiErrorWarningLine className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(base, 'h-10 px-3.5', className)}
      style={{ boxShadow: '0 1px 3px rgb(0 0 0 / 0.06)' }}
      {...props}
    />
  );
});

export const Select = forwardRef(function Select({ options = [], placeholder, className, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(base, 'h-10 px-3.5 cursor-pointer', className)}
      style={{ boxShadow: '0 1px 3px rgb(0 0 0 / 0.06)' }}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
      ))}
    </select>
  );
});

export const Textarea = forwardRef(function Textarea({ rows = 3, className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(base, 'px-3.5 py-2.5 resize-none', className)}
      style={{ boxShadow: '0 1px 3px rgb(0 0 0 / 0.06)' }}
      {...props}
    />
  );
});

export function FormGrid({ cols = 2, children, className }) {
  return (
    <div className={cn(`grid gap-4`, cols === 2 ? 'grid-cols-1 sm:grid-cols-2' : cols === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1', className)}>
      {children}
    </div>
  );
}

export function FormSection({ title, children }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <p className="text-[12px] font-bold text-navy-800 uppercase tracking-widest">{title}</p>
        <div className="flex-1 h-px bg-slate-100" />
      </div>
      {children}
    </div>
  );
}

export function FormActions({ onCancel, submitLabel = 'Save', loading = false, destructive = false }) {
  return (
    <div className="flex items-center justify-end gap-3 pt-5 mt-2 border-t border-slate-100">
      <button type="button" onClick={onCancel}
        className="h-9 px-4 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-all">
        Cancel
      </button>
      <button type="submit" disabled={loading}
        className={cn(
          'h-9 px-5 rounded-xl text-[13px] font-bold text-white transition-all flex items-center gap-2 disabled:opacity-50',
          destructive ? 'bg-danger-600 hover:bg-danger-700' : 'bg-accent-600 hover:bg-accent-700',
        )}>
        {loading && (
          <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {submitLabel}
      </button>
    </div>
  );
}
