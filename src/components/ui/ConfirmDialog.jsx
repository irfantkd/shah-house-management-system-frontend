import { motion, AnimatePresence } from 'framer-motion';
import { RiAlertLine, RiCloseLine, RiDeleteBinLine } from 'react-icons/ri';

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, loading }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.93 }}
        transition={{ type: 'spring', duration: 0.28 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
          <RiCloseLine className="w-4 h-4" />
        </button>

        <div className="p-6">
          <div className="w-14 h-14 rounded-2xl bg-danger-50 flex items-center justify-center mx-auto mb-4">
            <RiAlertLine className="w-7 h-7 text-danger-500" />
          </div>
          <h3 className="text-[16px] font-bold text-slate-900 text-center mb-2">
            {title ?? 'Delete Item'}
          </h3>
          <p className="text-[13px] text-slate-500 text-center leading-relaxed">
            {message ?? 'Are you sure you want to delete this? This action cannot be undone.'}
          </p>
        </div>

        <div className="flex gap-2 px-6 pb-6">
          <button onClick={onClose} disabled={loading}
            className="flex-1 h-10 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 h-10 rounded-xl bg-danger-600 hover:bg-danger-700 text-white text-[13px] font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : <RiDeleteBinLine className="w-4 h-4" />}
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}
