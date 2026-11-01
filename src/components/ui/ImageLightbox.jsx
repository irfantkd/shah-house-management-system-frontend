import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ExternalLink, FileText, FileCheck, File, Download, Loader2, Share2, Check } from 'lucide-react';
import { cn } from '../../utils/cn';
import { downloadFile } from '../../utils/downloadFile';
import { shareMedia } from '../../utils/shareMedia';

const IMAGE_EXTS  = ['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF'];
const VIEWER_EXTS = ['PDF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'PPT', 'PPTX'];
const isImg       = (ft) => IMAGE_EXTS.includes((ft ?? '').toUpperCase());
const isViewable  = (ft) => VIEWER_EXTS.includes((ft ?? '').toUpperCase());

// Styled icon for document fallback tiles
const DOC_ICON_CFG = {
  PDF:  { Icon: FileCheck, color: '#e11d48', bg: '#fff1f2' },
  DOC:  { Icon: FileText,  color: '#2563eb', bg: '#eff6ff' },
  DOCX: { Icon: FileText,  color: '#2563eb', bg: '#eff6ff' },
  XLS:  { Icon: File,      color: '#16a34a', bg: '#f0fdf4' },
  XLSX: { Icon: File,      color: '#16a34a', bg: '#f0fdf4' },
};
function DocIcon({ fileType }) {
  const ext = (fileType ?? '').toUpperCase();
  const { Icon = FileText, color = '#64748b', bg = '#f8fafc' } = DOC_ICON_CFG[ext] ?? {};
  return (
    <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg" style={{ background: bg }}>
      <Icon className="w-10 h-10" style={{ color }} />
    </div>
  );
}

/* items: [{ url, name, fileType }], startIndex, onClose, open */
export default function ImageLightbox({ items = [], startIndex = 0, onClose, open }) {
  const [activeIdx,    setActiveIdx]    = useState(startIndex);
  const [downloading,  setDownloading]  = useState(false);
  const [shareState,   setShareState]   = useState('idle'); // 'idle' | 'loading' | 'done'
  const touchStart = useRef(null);
  const total = items.length;
  const item  = items[activeIdx] ?? items[0];

  const prev = useCallback(() => setActiveIdx((i) => (i - 1 + total) % total), [total]);
  const next = useCallback(() => setActiveIdx((i) => (i + 1) % total), [total]);

  // Sync index when lightbox (re-)opens
  useEffect(() => { if (open) setActiveIdx(startIndex); }, [open, startIndex]);
  // Reset share state on item change
  useEffect(() => { setShareState('idle'); }, [activeIdx]);

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
                <>
                  <button
                    onClick={async () => {
                      setDownloading(true);
                      await downloadFile(item.url, item.name || 'download');
                      setDownloading(false);
                    }}
                    disabled={downloading}
                    className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all disabled:opacity-50"
                    title="Download">
                    {downloading
                      ? <Loader2 className="w-4 h-4 text-white/70 animate-spin" />
                      : <Download className="w-4 h-4 text-white/70" />}
                  </button>
                  <button
                    disabled={shareState === 'loading'}
                    onClick={async () => {
                      if (shareState === 'loading') return;
                      setShareState('loading');
                      try {
                        const result = await shareMedia(item);
                        if (result === 'copied') {
                          setShareState('done');
                          setTimeout(() => setShareState('idle'), 1800);
                        } else {
                          setShareState('idle');
                        }
                      } catch (err) {
                        if (err?.name === 'AbortError') { setShareState('idle'); return; }
                        // Any other failure — copy link as last resort
                        try { await navigator.clipboard.writeText(item.url); setShareState('done'); setTimeout(() => setShareState('idle'), 1800); } catch { setShareState('idle'); }
                      }
                    }}
                    className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all disabled:opacity-60"
                    title={shareState === 'done' ? 'Link copied!' : 'Share'}>
                    {shareState === 'loading' && <Loader2 className="w-4 h-4 text-white/70 animate-spin" />}
                    {shareState === 'done'    && <Check   className="w-4 h-4 text-emerald-400" />}
                    {shareState === 'idle'    && <Share2  className="w-4 h-4 text-white/70" />}
                  </button>
                  <a href={item.url} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                    title="Open in new tab">
                    <ExternalLink className="w-4 h-4 text-white/70" />
                  </a>
                </>
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

                {/* ── Image ── */}
                {isImg(item?.fileType) && (
                  <img src={item.url} alt={item.name}
                    className="max-w-full max-h-full object-contain rounded-2xl select-none"
                    style={{ maxHeight: 'calc(100vh - 148px)' }}
                    draggable={false} />
                )}

                {/* ── PDF / Office doc via Google Docs Viewer ── */}
                {!isImg(item?.fileType) && isViewable(item?.fileType) && (
                  <DocViewerFrame url={item.url} name={item.name} />
                )}

                {/* ── Unsupported type fallback ── */}
                {!isImg(item?.fileType) && !isViewable(item?.fileType) && (
                  <div className="flex flex-col items-center gap-5 p-10 text-center">
                    <DocIcon fileType={item?.fileType} />
                    <div>
                      <p className="text-white font-bold text-[17px] mb-1">{item?.name}</p>
                      <p className="text-white/40 text-[13px] mb-5">
                        {(item?.fileType ?? 'File').toUpperCase()} — no preview available
                      </p>
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={async () => {
                            setDownloading(true);
                            await downloadFile(item.url, item.name || 'download');
                            setDownloading(false);
                          }}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-semibold text-[13px] transition-all">
                          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                          Download
                        </button>
                        <a href={item?.url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-semibold text-[13px] transition-all">
                          <ExternalLink className="w-4 h-4" /> Open
                        </a>
                      </div>
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
                      : (() => {
                          const ext = (it.fileType ?? '').toUpperCase();
                          const { Icon = FileText, color = '#94a3b8', bg = 'rgba(255,255,255,0.1)' } =
                            DOC_ICON_CFG[ext] ?? {};
                          return (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-0.5"
                              style={{ background: bg }}>
                              <Icon className="w-4 h-4" style={{ color }} />
                              <span className="text-[7px] font-black" style={{ color }}>{ext || 'FILE'}</span>
                            </div>
                          );
                        })()
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

// ── DocViewerFrame ────────────────────────────────────────────────────────────
// Uses Google Docs Viewer to embed PDFs, Word and Excel files in-browser.
// Shows a spinner while loading; shows a "can't load" fallback with download +
// open buttons if the viewer reports an error.
function DocViewerFrame({ url, name }) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'ok' | 'error'
  const viewerSrc = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-white/10 relative"
      style={{ height: 'calc(100vh - 148px)' }}>

      {/* Loading overlay */}
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/80 z-10">
          <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
          <p className="text-white/40 text-[12px]">Loading preview…</p>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0f1a2e] z-10 p-8 text-center">
          <DocIcon fileType={url.split('.').pop()} />
          <div>
            <p className="text-white font-bold text-[16px] mb-1">{name}</p>
            <p className="text-white/40 text-[12px] mb-5">Preview could not load — use the buttons below</p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => downloadFile(url, name)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-semibold text-[13px] transition-all">
                <Download className="w-4 h-4" /> Download
              </button>
              <a href={url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-semibold text-[13px] transition-all">
                <ExternalLink className="w-4 h-4" /> Open in Tab
              </a>
            </div>
          </div>
        </div>
      )}

      <iframe
        key={url}
        src={viewerSrc}
        title={name}
        className="w-full h-full bg-white"
        onLoad={() => setStatus('ok')}
        onError={() => setStatus('error')}
      />
    </div>
  );
}
