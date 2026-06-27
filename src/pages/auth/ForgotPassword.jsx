import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Home, Mail, ArrowLeft, CheckCircle2, Send } from 'lucide-react';
import Button from '../../components/ui/Button';
import { cn } from '../../utils/cn';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
});

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [sentTo, setSentTo] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    await new Promise((r) => setTimeout(r, 1200));
    setSentTo(data.email);
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-6">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent-600/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-md relative"
      >
        {/* Card */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl">

          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-accent-600 flex items-center justify-center shadow-sm">
              <Home className="w-4.5 h-4.5 text-white" />
            </div>
            <p className="text-navy-900 font-bold text-base">AHMS</p>
          </div>

          {!sent ? (
            <>
              <div className="mb-7">
                <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Forgot password?</h1>
                <p className="text-[13px] text-slate-400 mt-1.5 leading-relaxed">
                  No problem. Enter your email and we'll send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <div>
                  <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      {...register('email')}
                      type="email"
                      placeholder="owner@ahms.com"
                      autoComplete="email"
                      autoFocus
                      className={cn(
                        'w-full h-11 pl-10 pr-4 rounded-xl border bg-slate-50 text-[14px] text-slate-800 placeholder-slate-300',
                        'outline-none transition-all duration-150',
                        'focus:ring-2 focus:ring-accent-500 focus:border-accent-500 focus:bg-white',
                        errors.email
                          ? 'border-danger-400 ring-1 ring-danger-400'
                          : 'border-slate-200 hover:border-slate-300',
                      )}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-[11px] text-danger-500 mt-1">{errors.email.message}</p>
                  )}
                </div>

                <Button type="submit" variant="navy" size="lg" loading={isSubmitting} icon={Send} className="w-full">
                  {isSubmitting ? 'Sending link…' : 'Send reset link'}
                </Button>
              </form>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-center py-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-success-50 border border-success-100 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-success-600" />
              </div>
              <h2 className="text-xl font-bold text-navy-900 mb-2">Check your inbox</h2>
              <p className="text-[13px] text-slate-400 leading-relaxed mb-1">
                We've sent a password reset link to
              </p>
              <p className="text-[14px] font-semibold text-navy-900 mb-6">{sentTo}</p>
              <p className="text-[12px] text-slate-400">
                Didn't receive it?{' '}
                <button
                  onClick={() => setSent(false)}
                  className="text-accent-600 font-semibold hover:text-accent-700"
                >
                  Try again
                </button>
              </p>
            </motion.div>
          )}

          <div className="mt-6 pt-5 border-t border-slate-100 flex justify-center">
            <Link
              to="/login"
              className="flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-700 font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to sign in
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
