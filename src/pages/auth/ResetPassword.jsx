import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Home, Lock, Eye, EyeOff, ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import { cn } from '../../utils/cn';

const schema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must include an uppercase letter')
    .regex(/[0-9]/, 'Must include a number'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
});

const RULES = [
  { label: 'At least 8 characters',  test: (v) => v.length >= 8      },
  { label: 'One uppercase letter',    test: (v) => /[A-Z]/.test(v)    },
  { label: 'One number',             test: (v) => /[0-9]/.test(v)    },
];

export default function ResetPassword() {
  const navigate = useNavigate();
  const [showPw,  setShowPw]  = useState(false);
  const [showCfm, setShowCfm] = useState(false);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const pwValue = watch('password', '');

  const onSubmit = async () => {
    await new Promise((r) => setTimeout(r, 1200));
    toast.success('Password reset successfully!');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-6">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent-600/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-md relative"
      >
        <div className="bg-white rounded-3xl p-8 shadow-2xl">

          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-accent-600 flex items-center justify-center shadow-sm">
              <Home className="w-4.5 h-4.5 text-white" />
            </div>
            <p className="text-navy-900 font-bold text-base">AHMS</p>
          </div>

          <div className="mb-7">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-accent-50 border border-accent-100 flex items-center justify-center">
                <ShieldCheck className="w-4.5 h-4.5 text-accent-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Set new password</h1>
            <p className="text-[13px] text-slate-400 mt-1.5">
              Create a strong password to secure your account.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

            {/* New password */}
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">
                New password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  {...register('password')}
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoFocus
                  className={cn(
                    'w-full h-11 pl-10 pr-10 rounded-xl border bg-slate-50 text-[14px] text-slate-800 placeholder-slate-300',
                    'outline-none transition-all duration-150 focus:ring-2 focus:ring-accent-500 focus:border-accent-500 focus:bg-white',
                    errors.password ? 'border-danger-400' : 'border-slate-200 hover:border-slate-300',
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength indicators */}
              {pwValue && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-2.5 space-y-1.5"
                >
                  {RULES.map((rule) => {
                    const ok = rule.test(pwValue);
                    return (
                      <div key={rule.label} className="flex items-center gap-2">
                        <div className={cn(
                          'w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-200',
                          ok ? 'bg-success-500' : 'bg-slate-200',
                        )}>
                          {ok && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className={cn('text-[11px] transition-colors duration-200', ok ? 'text-success-600 font-medium' : 'text-slate-400')}>
                          {rule.label}
                        </span>
                      </div>
                    );
                  })}
                </motion.div>
              )}
              {errors.password && !pwValue && (
                <p className="text-[11px] text-danger-500 mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  {...register('confirm')}
                  type={showCfm ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={cn(
                    'w-full h-11 pl-10 pr-10 rounded-xl border bg-slate-50 text-[14px] text-slate-800 placeholder-slate-300',
                    'outline-none transition-all duration-150 focus:ring-2 focus:ring-accent-500 focus:border-accent-500 focus:bg-white',
                    errors.confirm ? 'border-danger-400' : 'border-slate-200 hover:border-slate-300',
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowCfm((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showCfm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirm && (
                <p className="text-[11px] text-danger-500 mt-1">{errors.confirm.message}</p>
              )}
            </div>

            <Button type="submit" variant="navy" size="lg" loading={isSubmitting} icon={ShieldCheck} className="w-full mt-2">
              {isSubmitting ? 'Resetting…' : 'Reset password'}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 flex justify-center">
            <Link to="/login" className="flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-700 font-medium transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to sign in
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
