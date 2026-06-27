import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RiCloseLine } from 'react-icons/ri';
import { cn } from '../../utils/cn';

export default function Modal({ open, onClose, title, subtitle, children, size = 'md' }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    if (open) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handler);
    }
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', handler); };
  }, [open, onClose]);

  const maxW = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-2xl', xl: 'max-w-3xl' }[size] ?? 'max-w-xl';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', duration: 0.32, bounce: 0.18 }}
            className={cn('relative bg-white rounded-2xl shadow-2xl w-full overflow-hidden flex flex-col', maxW)}
            style={{ maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #0f1729 0%, #1e3a5f 100%)' }}>
              <div>
                <h2 className="text-[16px] font-bold text-white leading-tight">{title}</h2>
                {subtitle && <p className="text-[12px] text-slate-400 mt-0.5">{subtitle}</p>}
              </div>
              <button onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all flex-shrink-0">
                <RiCloseLine className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
