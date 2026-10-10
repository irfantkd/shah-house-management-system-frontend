import { useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { RiCloseLine } from 'react-icons/ri';
import { cn } from '../../utils/cn';

export default function Modal({ open, onClose, title, subtitle, children, size = 'md' }) {
  const dragControls = useDragControls();

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    if (open) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handler);
    }
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', handler); };
  }, [open, onClose]);

  const maxW = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-2xl', xl: 'sm:max-w-3xl' }[size] ?? 'sm:max-w-xl';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => { if (info.offset.y > 72) onClose?.(); }}
            initial={{ opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 48 }}
            transition={{ type: 'spring', duration: 0.32, bounce: 0.15 }}
            className={cn(
              'relative bg-white w-full overflow-hidden flex flex-col z-10',
              'rounded-t-3xl sm:rounded-2xl',
              maxW,
            )}
            style={{ maxHeight: '92vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle — mobile only, initiates swipe-down dismiss */}
            <div
              className="sm:hidden flex justify-center pt-3 pb-1 shrink-0 touch-none select-none cursor-grab active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <motion.div
                className="w-10 h-1 rounded-full bg-slate-200"
                whileTap={{ scaleX: 0.75, backgroundColor: '#94a3b8' }}
                transition={{ duration: 0.1 }}
              />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 shrink-0"
              style={{ background: 'linear-gradient(135deg, #0f1729 0%, #1e3a5f 100%)' }}>
              <div>
                <h2 className="text-[16px] font-bold text-white leading-tight">{title}</h2>
                {subtitle && <p className="text-[12px] text-slate-400 mt-0.5">{subtitle}</p>}
              </div>
              <button onClick={onClose}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 active:bg-white/10 transition-all shrink-0">
                <RiCloseLine className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-5 sm:p-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
