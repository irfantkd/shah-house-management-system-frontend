import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ExternalLink, ZoomIn } from 'lucide-react';
import { cn } from '../../utils/cn';

const IMAGE_EXTS = ['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF'];
const isImg = (ft) => IMAGE_EXTS.includes((ft ?? '').toUpperCase());
const isPdf = (ft) => (ft ?? '').toUpperCase() === 'PDF';

/* items: [{ url, name, fileType }], startIndex, onClose, open */
export default function ImageLightbox({ items = [], startIndex = 0, onClose, open }) {
  const [activeIdx, setActiveIdx] = useState(startIndex);
  const touchStart = useRef(null);
  const total = items.length;
  const item  = items[activeIdx] ?? items[0];

  const prev = useCallback(() => setActiveIdx((i) => (i - 1 + total) % total), [total]);
  const next = useCallback(() => setActiveIdx((i) => (i + 1) % total), [total]);

  // Sync index when lightbox (re-)opens
  useEffect(() => { if (open) setActiveIdx(startIndex); }, [open, startIndex]);

  // Keyboard
  useEffect(() => {
    if (!open) return;
    const fn = (e) => {
      if (e.key === 'Escape')      onClose?.();
      if (e.key === 'ArrowLeft')   prev();
      if (e.key === 'ArrowRight')  next();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open, prev, next, onClose]);

  if (!open || !total) return null;

  const onTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd   = (e) => {
    if (touchStart.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(dx) > 50) dx < 0 ? next() : prev();
    touchStart.current = null;
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[9999] flex flex-col"
          style={{ background: 'rgba(0,0,0,0.93)', backdropFilter: 'blur(12px)' }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}>

          {/* ── Top bar ── */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0">
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-[14px] truncate">{item?.name ?? 'Preview'}</p>
              {total > 1 && (
                <p className="text-white/40 text-[11px]">{activeIdx + 1} / {total}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              {item?.url && (
                <a href={item.url} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                  <ExternalLink className="w-4 h-4 text-white/70" />
                </a>
              )}
              <button onClick={onClose}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* ── Main viewer ── */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden">
            {total > 1 && (
              <button onClick={prev}
                className="absolute left-2 sm:left-4 z-10 w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/25 flex items-center justify-center transition-all">
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={activeIdx}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.14 }}
                className="flex items-center justify-center w-full h-full max-w-5xl mx-auto px-14">

                {isImg(item?.fileType) && (
                  <img src={item.url} alt={item.name}
                    className="max-w-full max-h-full object-contain rounded-2xl select-none"
                    style={{ maxHeight: 'calc(100vh - 148px)' }}
                    draggable={false} />
                )}

                {isPdf(item?.fileType) && (
                  <div className="w-full rounded-2xl overflow-hidden border border-white/10"
                    style={{ height: 'calc(100vh - 148px)' }}>
                    <iframe src={item.url} title={item.name} className="w-full h-full bg-white" />
                  </div>
                )}

                {!isImg(item?.fileType) && !isPdf(item?.fileType) && (
                  <div className="flex flex-col items-center gap-6 p-12 text-center">
                    <div className="w-24 h-24 rounded-3xl bg-white/10 flex items-center justify-center">
                      <ZoomIn className="w-12 h-12 text-white/40" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-[18px] mb-1">{item?.name}</p>
                      <p className="text-white/40 text-[13px] mb-6">
                        {item?.fileType?.toUpperCase() ?? 'File'} — preview not available
                      </p>
                      <a href={item?.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-semibold text-[14px] transition-all">
                        <ExternalLink className="w-4 h-4" /> Open File
                      </a>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {total > 1 && (
              <button onClick={next}
                className="absolute right-2 sm:right-4 z-10 w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/25 flex items-center justify-center transition-all">
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            )}
          </div>

          {/* ── Thumbnail strip ── */}
          {total > 1 && (
            <div className="shrink-0 px-4 pb-4 pt-2 flex justify-center">
              <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {items.map((it, i) => (
                  <button key={i} onClick={() => setActiveIdx(i)}
                    className={cn(
                      'w-12 h-12 rounded-xl shrink-0 overflow-hidden border-2 transition-all',
                      i === activeIdx ? 'border-white scale-105' : 'border-transparent opacity-45 hover:opacity-75',
                    )}>
                    {isImg(it.fileType)
                      ? <img src={it.url} alt={it.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-white/15 flex items-center justify-center">
                          <span className="text-white text-[9px] font-bold leading-none text-center px-1">
                            {(it.fileType ?? 'FILE').toUpperCase()}
                          </span>
                        </div>
                    }
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
