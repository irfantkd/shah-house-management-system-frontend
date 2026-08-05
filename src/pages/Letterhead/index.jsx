import { useState, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RiAddLine, RiDeleteBin2Line, RiRefreshLine, RiBuilding4Line,
  RiPhoneLine, RiMailLine, RiMapPinLine, RiUserLine, RiFileList3Line,
  RiEyeLine, RiDownloadLine, RiCloseLine, RiArchiveLine, RiArrowDownLine,
  RiArrowUpLine, RiSearch2Line, RiGridLine, RiListCheck2,
  RiEditLine, RiSaveLine, RiSparklingLine, RiLoader4Line,
  RiWhatsappLine, RiPrinterLine, RiCheckboxCircleLine,
  RiArrowRightSLine, RiSortAsc, RiSortDesc, RiCalendarLine,
  RiTrophyLine, RiFileTextLine, RiSendPlane2Line,
} from 'react-icons/ri';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';
import { useGetQuery, usePostMutation, usePutMutation, useDeleteMutation } from '../../api/apiSlice';
import { generateLetterheadPdf, generateLetterheadPdfBlob } from '../../utils/generateLetterheadPdf';
import DatePicker from '../../components/ui/DatePicker';

/* ─── Config ──────────────────────────────────────────────────── */
const UNITS = [
  'pcs', 'kg', 'gram', 'meter', 'cm', 'mm',
  'liter', 'ml', 'box', 'set', 'pair', 'roll',
  'bag', 'carton', 'bottle', 'sheet',
];

const TYPES = {
  received: {
    label: 'Goods Received Note',
    short: 'GRN',
    partyLabel: 'Received From',
    actionLabel: 'Received By (Shah House)',
    otherLabel: 'Delivered By',
    accent: '#16a34a',
    accentLight: '#f0fdf4',
    accentMid: '#bbf7d0',
    Icon: RiArrowDownLine,
  },
  issued: {
    label: 'Material Issue Note',
    short: 'ISS',
    partyLabel: 'Issued To',
    actionLabel: 'Issued By (Shah House)',
    otherLabel: 'Received By',
    accent: '#2563eb',
    accentLight: '#eff6ff',
    accentMid: '#bfdbfe',
    Icon: RiSendPlane2Line,
  },
};

/* ─── Helpers ──────────────────────────────────────────────────── */
const uid          = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const fmtDate      = (s) => s ? new Date(`${s}T00:00:00`).toLocaleDateString('en-AE', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
const fmtDateShort = (s) => s ? new Date(s).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtAED       = (n) => `AED ${(+n || 0).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const lineTotal    = (item) => (+item.qty || 0) * (+item.unitPrice || 0);
const makeItem     = () => ({ id: uid(), name: '', description: '', qty: 1, unit: 'pcs', unitPrice: '' });

function getAutoNum(type) {
  const cfg  = TYPES[type];
  const year = new Date().getFullYear();
  const seq  = parseInt(localStorage.getItem(`ahms_doc_${type}`) || '0') + 1;
  return `${cfg.short}-${year}-${String(seq).padStart(3, '0')}`;
}
function saveNum(type, num) {
  const seq = parseInt(num.split('-').pop()) || 0;
  if (seq > 0) localStorage.setItem(`ahms_doc_${type}`, seq.toString());
}
function thisMonth(isoStr) {
  const d = new Date(isoStr);
  const n = new Date();
  return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
}

/* ─── Styles ───────────────────────────────────────────────────── */
const INPUT = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] text-slate-800 placeholder:text-slate-300 focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all bg-white';
const LABEL = 'block text-[10.5px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider';

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
export default function LetterheadPage() {
  /* ── Form state ── */
  const [type,      setType]      = useState('received');
  const [docNum,    setDocNum]    = useState(() => getAutoNum('received'));
  const [date,      setDate]      = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');
  const [party,      setParty]      = useState({ name: '', company: '', phone: '', email: '', address: '' });
  const [items,      setItems]      = useState([makeItem()]);
  const [notes,      setNotes]      = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [deliveryRef, setDeliveryRef] = useState('');

  /* ── UI state ── */
  const [activeTab,     setActiveTab]     = useState('create');
  const [editingId,     setEditingId]     = useState(null);
  const [detailRecord,  setDetailRecord]  = useState(null);
  const [filter,        setFilter]        = useState('all');
  const [searchQuery,   setSearchQuery]   = useState('');
  const [historyView,   setHistoryView]   = useState('grid');
  const [sortBy,        setSortBy]        = useState('newest');
  const [pdfLoading,    setPdfLoading]    = useState(false);
  const [mobileView,    setMobileView]    = useState('form');
  const [hiddenDocData, setHiddenDocData] = useState(null);

  /* ── Refs ── */
  const hiddenPrintRef = useRef(null);

  /* ── RTK Query ── */
  const { data: records = [], refetch: refetchRecords } = useGetQuery({ path: '/letterheads' });
  const [saveLetterheadMut]   = usePostMutation();
  const [updateLetterheadMut] = usePutMutation();
  const [deleteLetterheadMut] = useDeleteMutation();

  /* ── Derived ── */
  const cfg        = TYPES[type];
  const grandTotal = items.reduce((s, i) => s + lineTotal(i), 0);
  const hasPrice   = items.some((i) => parseFloat(i.unitPrice) > 0);

  /* ─── Form helpers ─── */
  const handleTypeChange = (t) => { setType(t); if (!editingId) setDocNum(getAutoNum(t)); };
  const addItem    = () => setItems((p) => [...p, makeItem()]);
  const removeItem = (id) => setItems((p) => p.length > 1 ? p.filter((i) => i.id !== id) : p);
  const updateItem = (id, f, v) => setItems((p) => p.map((i) => i.id === id ? { ...i, [f]: v } : i));
  const updateParty = (f, v) => setParty((p) => ({ ...p, [f]: v }));

  const handleClear = () => {
    setParty({ name: '', company: '', phone: '', email: '', address: '' });
    setItems([makeItem()]);
    setNotes('');
    setReference('');
    setReceivedBy('');
    setDeliveryRef('');
    if (editingId) { setEditingId(null); setDocNum(getAutoNum(type)); }
  };

  /* ─── Load record into editor (edit mode) ─── */
  const handleEdit = useCallback((record) => {
    setType(record.type);
    setDocNum(record.docNum);
    setDate(record.date);
    setReference(record.reference || '');
    setDeliveryRef(record.deliveryRef || '');
    setReceivedBy(record.receivedBy || '');
    setParty({ ...record.party });
    setItems(record.items.map((i) => ({ ...i, id: i.id || uid() })));
    setNotes(record.notes || '');
    setEditingId(record.id);
    setActiveTab('create');
    setDetailRecord(null);
    setMobileView('form');
    toast.success('Document loaded — make your changes and click Save', { duration: 3500 });
  }, []);

  const handleCancelEdit = () => {
    setEditingId(null);
    setDocNum(getAutoNum(type));
    handleClear();
  };

  /* ─── PDF capture ─── */
  const capturePdf = async (docData, filename) => {
    flushSync(() => setHiddenDocData(docData));
    if (!hiddenPrintRef.current) throw new Error('Render element not ready');
    await generateLetterheadPdf(hiddenPrintRef.current, filename);
    setHiddenDocData(null);
  };

  /* Renders to the hidden DOM element and returns the PDF as a Blob (no download) */
  const captureBlob = async (docData) => {
    flushSync(() => setHiddenDocData(docData));
    if (!hiddenPrintRef.current) throw new Error('Render element not ready');
    const blob = await generateLetterheadPdfBlob(hiddenPrintRef.current);
    setHiddenDocData(null);
    return blob;
  };

  const buildRecord = () => ({
    type, docNum, date, reference, deliveryRef, receivedBy,
    party: { ...party },
    items: items.map((i) => ({ ...i })),
    notes, grandTotal, hasPrice,
  });

  /* ─── SAVE CHANGES (edit mode PUT) ─── */
  const handleUpdate = async (downloadPdf = false) => {
    if (!items.some((i) => i.name.trim())) {
      toast.error('Add at least one item name');
      return;
    }
    const toastId = toast.loading('Saving changes…');
    try {
      await updateLetterheadMut({ path: `/letterheads/${editingId}`, body: buildRecord() }).unwrap();
      toast.success(`${docNum} updated successfully`, { id: toastId });
      if (downloadPdf) {
        const docData = { cfg, docNum, date, reference, deliveryRef, receivedBy, party, items, notes, hasPrice, grandTotal };
        setPdfLoading(true);
        try { await capturePdf(docData, `${docNum}.pdf`); toast.success('PDF downloaded!'); }
        finally { setPdfLoading(false); }
      }
      setEditingId(null);
      setDocNum(getAutoNum(type));
      handleClear();
      setTimeout(() => setActiveTab('history'), 700);
    } catch (err) {
      toast.error(err?.data?.error || 'Update failed', { id: toastId });
    }
  };

  /* ─── GENERATE & DOWNLOAD (create mode) ─── */
  const handleGenerate = async () => {
    if (!items.some((i) => i.name.trim())) {
      toast.error('Add at least one item name before generating');
      return;
    }
    if (pdfLoading) return;
    if (editingId) { await handleUpdate(true); return; }

    setPdfLoading(true);
    const toastId = toast.loading('Generating PDF…');
    try {
      await saveLetterheadMut({ path: '/letterheads', body: buildRecord() }).unwrap();
      saveNum(type, docNum);
      const docData = { cfg, docNum, date, reference, deliveryRef, receivedBy, party, items, notes, hasPrice, grandTotal };
      await capturePdf(docData, `${docNum}.pdf`);
      toast.success(`${docNum} saved & PDF downloaded!`, { id: toastId });
      setDocNum(getAutoNum(type));
      handleClear();
      setTimeout(() => setActiveTab('history'), 1000);
    } catch (err) {
      toast.error('Failed to generate', { id: toastId });
      setHiddenDocData(null);
    } finally {
      setPdfLoading(false);
    }
  };

  /* ─── SAVE ONLY (no PDF) ─── */
  const handleSaveDraft = async () => {
    if (!items.some((i) => i.name.trim())) {
      toast.error('Add at least one item name before saving');
      return;
    }
    if (editingId) { await handleUpdate(false); return; }
    try {
      await saveLetterheadMut({ path: '/letterheads', body: buildRecord() }).unwrap();
      saveNum(type, docNum);
      toast.success(`${cfg.short} ${docNum} saved to history`);
      setDocNum(getAutoNum(type));
      handleClear();
      setTimeout(() => setActiveTab('history'), 500);
    } catch (err) {
      toast.error('Failed to save');
    }
  };

  /* ─── Download PDF from history record ─── */
  const handlePrintRecord = async (record) => {
    if (pdfLoading) return;
    const recCfg = TYPES[record.type];
    const docData = {
      cfg: recCfg, docNum: record.docNum, date: record.date,
      reference: record.reference, deliveryRef: record.deliveryRef || '',
      receivedBy: record.receivedBy || '',
      party: record.party, items: record.items,
      notes: record.notes, hasPrice: record.hasPrice, grandTotal: record.grandTotal,
    };
    setPdfLoading(true);
    const toastId = toast.loading('Generating PDF…');
    try {
      await capturePdf(docData, `${record.docNum}.pdf`);
      toast.success('PDF downloaded!', { id: toastId });
    } catch {
      toast.error('PDF generation failed', { id: toastId });
      setHiddenDocData(null);
    } finally {
      setPdfLoading(false);
    }
  };

  /* ─── WhatsApp share — sends the actual PDF, not text ─── */
  const handleWhatsApp = async (record) => {
    if (pdfLoading) return;

    const recCfg = TYPES[record.type];
    const docData = {
      cfg: recCfg,
      docNum: record.docNum,
      date: record.date,
      reference: record.reference,
      deliveryRef: record.deliveryRef || '',
      receivedBy: record.receivedBy || '',
      party: record.party,
      items: record.items,
      notes: record.notes,
      hasPrice: record.hasPrice,
      grandTotal: record.grandTotal,
    };

    setPdfLoading(true);
    const toastId = toast.loading('Preparing PDF…');

    try {
      const blob = await captureBlob(docData);
      const filename = `${record.docNum}.pdf`;
      const file = new File([blob], filename, { type: 'application/pdf' });

      // Web Share API — available on mobile browsers and desktop Chrome/Edge on Win/Mac
      const canShare = typeof navigator.share === 'function' &&
                       typeof navigator.canShare === 'function' &&
                       navigator.canShare({ files: [file] });

      if (canShare) {
        toast.dismiss(toastId);
        await navigator.share({
          files: [file],
          title: `Shah House — ${record.docNum}`,
          text: `${recCfg.label} · ${record.docNum}`,
        });
        toast.success('PDF shared!');
      } else {
        // Browser doesn't support file sharing — download the PDF and instruct user
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('PDF downloaded — open WhatsApp and attach it to share', { id: toastId, duration: 5000 });
      }
    } catch (err) {
      if (err?.name === 'AbortError') {
        // User dismissed the share sheet — not an error
        toast.dismiss(toastId);
      } else {
        toast.error('Could not prepare PDF', { id: toastId });
        setHiddenDocData(null);
      }
    } finally {
      setPdfLoading(false);
    }
  };

  /* ─── Delete ─── */
  const handleDelete = async (id) => {
    try {
      await deleteLetterheadMut({ path: `/letterheads/${id}` }).unwrap();
      if (detailRecord?.id === id) setDetailRecord(null);
      toast.success('Document removed');
    } catch (err) { toast.error(err?.data?.error || 'Failed to delete'); }
  };

  /* ─── History derived data ─── */
  const totalValue   = records.reduce((s, r) => s + (r.grandTotal || 0), 0);
  const grnCount     = records.filter((r) => r.type === 'received').length;
  const issCount     = records.filter((r) => r.type === 'issued').length;
  const thisMonthDocs = records.filter((r) => thisMonth(r.savedAt || r.createdAt)).length;

  const sortFn = {
    newest:  (a, b) => new Date(b.savedAt || b.createdAt) - new Date(a.savedAt || a.createdAt),
    oldest:  (a, b) => new Date(a.savedAt || a.createdAt) - new Date(b.savedAt || b.createdAt),
    highest: (a, b) => (b.grandTotal || 0) - (a.grandTotal || 0),
    lowest:  (a, b) => (a.grandTotal || 0) - (b.grandTotal || 0),
  };

  const filtered = records
    .filter((r) => filter === 'all' || r.type === filter)
    .filter((r) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.docNum?.toLowerCase().includes(q) ||
        r.party?.company?.toLowerCase().includes(q) ||
        r.party?.name?.toLowerCase().includes(q) ||
        r.reference?.toLowerCase().includes(q)
      );
    })
    .sort(sortFn[sortBy] ?? sortFn.newest);

  /* ─── Form completion indicators ─── */
  const steps = [
    { label: 'Type',    done: true }, // always selected
    { label: 'Info',    done: !!(docNum && date) },
    { label: 'Party',   done: !!(party.company || party.name) },
    { label: 'Items',   done: items.some((i) => i.name.trim()) },
    { label: 'Notes',   done: !!notes.trim(), optional: true },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
      className="space-y-5"
    >
      {/* ── Hidden A4 render (off-screen) ── */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, width: 794, zIndex: -1, pointerEvents: 'none' }}>
        {hiddenDocData && (
          <div ref={hiddenPrintRef}>
            <LetterheadDoc {...hiddenDocData} />
          </div>
        )}
      </div>

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 mb-0.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, #0b1d3a, #1e3a6e)' }}>
              <RiPrinterLine className="w-4 h-4" />
            </div>
            <h1 className="text-[22px] font-black text-navy-900 tracking-tight">
              {editingId ? 'Edit Document' : 'Letterhead Generator'}
            </h1>
            {editingId && (
              <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                EDIT MODE
              </span>
            )}
          </div>
          <p className="text-[13px] text-slate-400 ml-10.5">
            {editingId
              ? `Editing ${docNum} — save changes to update the record`
              : 'Create official Shah House GRN and Material Issue documents'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Tab switcher */}
          <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
            {[
              { key: 'create',  icon: RiFileTextLine, label: 'New Document' },
              { key: 'history', icon: RiArchiveLine,  label: 'History', badge: records.length },
            ].map(({ key, icon: Icon, label, badge }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold transition-all',
                  activeTab === key ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                )}>
                <Icon className="w-3.5 h-3.5" /> {label}
                {badge > 0 && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-navy-900 text-white">{badge}</span>
                )}
              </button>
            ))}
          </div>

          {activeTab === 'create' && (
            <>
              {editingId ? (
                <button onClick={handleCancelEdit}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-all">
                  <RiCloseLine className="w-3.5 h-3.5" /> Cancel Edit
                </button>
              ) : (
                <button onClick={handleClear}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold text-slate-600 bg-white border border-slate-200 hover:border-slate-300 transition-all">
                  <RiRefreshLine className="w-3.5 h-3.5" /> Clear
                </button>
              )}
              <button
                onClick={() => setMobileView((v) => v === 'form' ? 'preview' : 'form')}
                className="lg:hidden flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold text-slate-600 bg-white border border-slate-200 transition-all">
                <RiEyeLine className="w-3.5 h-3.5" /> {mobileView === 'form' ? 'Preview' : 'Edit'}
              </button>
              <button onClick={handleSaveDraft}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all">
                <RiSaveLine className="w-3.5 h-3.5" />
                {editingId ? 'Save Changes' : 'Save Only'}
              </button>
              <button onClick={handleGenerate} disabled={pdfLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all shadow-sm disabled:opacity-60"
                style={{ background: pdfLoading ? '#64748b' : 'linear-gradient(135deg, #0b1d3a 0%, #1e3a6e 100%)' }}>
                {pdfLoading
                  ? <RiLoader4Line className="w-4 h-4 animate-spin" />
                  : editingId ? <RiDownloadLine className="w-4 h-4" /> : <RiSparklingLine className="w-4 h-4" />}
                {pdfLoading ? 'Generating…' : editingId ? 'Save & Download PDF' : 'Generate & Download PDF'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          CREATE TAB
      ══════════════════════════════════════════════ */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_540px] gap-6 items-start">

          {/* ═══ FORM PANEL ═══ */}
          <div className={cn('space-y-4', mobileView === 'preview' && 'hidden lg:block')}>

            {/* Edit mode banner */}
            {editingId && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50">
                <RiEditLine className="w-4 h-4 text-amber-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-bold text-amber-800">Editing existing document</p>
                  <p className="text-[11px] text-amber-600">Saving will update the original record in History</p>
                </div>
                <button onClick={handleCancelEdit}
                  className="text-[11px] font-bold text-amber-700 hover:text-amber-900 px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 transition-colors shrink-0">
                  Cancel
                </button>
              </div>
            )}

            {/* Step progress bar */}
            <div className="bg-white rounded-2xl border border-slate-100 px-5 py-4" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center gap-2">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2 flex-1 last:flex-none">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center text-[8.5px] font-black transition-all',
                        step.done
                          ? 'bg-emerald-500 text-white'
                          : step.optional
                          ? 'bg-slate-100 text-slate-300'
                          : 'bg-slate-100 text-slate-400',
                      )}>
                        {step.done ? '✓' : i + 1}
                      </div>
                      <span className={cn('text-[10.5px] font-bold hidden sm:block', step.done ? 'text-emerald-600' : 'text-slate-400')}>
                        {step.label}
                        {step.optional && <span className="text-slate-300 font-normal"> (opt)</span>}
                      </span>
                    </div>
                    {i < steps.length - 1 && (
                      <div className={cn('flex-1 h-px', step.done ? 'bg-emerald-200' : 'bg-slate-100')} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Step 1: Document type */}
            <FormSection step="1" title="Document Type">
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(TYPES).map(([key, c]) => {
                  const Icon = c.Icon;
                  return (
                    <button key={key} onClick={() => handleTypeChange(key)}
                      className={cn(
                        'flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition-all',
                        type === key ? 'border-navy-700 bg-navy-50 shadow-sm' : 'border-slate-100 hover:border-slate-200 bg-slate-50/50',
                      )}>
                      <div className="flex items-center gap-2 w-full">
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white"
                          style={{ background: type === key ? c.accent : '#94a3b8' }}>
                          <Icon className="w-4 h-4" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-[13px] font-bold truncate', type === key ? 'text-navy-900' : 'text-slate-600')}>
                            {c.label}
                          </p>
                          <p className="text-[9px] font-black tracking-wider" style={{ color: type === key ? c.accent : '#94a3b8' }}>
                            {c.short}
                          </p>
                        </div>
                        {type === key && (
                          <RiCheckboxCircleLine className="w-4 h-4 shrink-0" style={{ color: c.accent }} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </FormSection>

            {/* Step 2: Document info */}
            <FormSection step="2" title="Document Information">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Document Number</label>
                  <div className="relative">
                    <input value={docNum} onChange={(e) => setDocNum(e.target.value)}
                      className={cn(INPUT, 'pr-9 font-bold tracking-wide')} />
                    {!editingId && (
                      <button onClick={() => setDocNum(getAutoNum(type))} title="Generate new number"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-accent-500 transition-colors">
                        <RiRefreshLine className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className={LABEL}>Date</label>
                  <DatePicker value={date} onChange={setDate} className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>Reference / PO Number <span className="text-slate-300 font-normal normal-case">(opt)</span></label>
                  <input placeholder="e.g. PO-2026-045" value={reference} onChange={(e) => setReference(e.target.value)} className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>{type === 'received' ? 'Supplier Delivery Note No.' : 'Internal Issue Ref.'} <span className="text-slate-300 font-normal normal-case">(opt)</span></label>
                  <input placeholder="e.g. DN-12345" value={deliveryRef} onChange={(e) => setDeliveryRef(e.target.value)} className={INPUT} />
                </div>
              </div>
            </FormSection>

            {/* Step 3: Party info */}
            <FormSection step="3" title={cfg.partyLabel}>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="flex items-center gap-1 text-[10.5px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      <RiBuilding4Line className="w-3 h-3" /> Company / Firm
                    </label>
                    <input placeholder="Company or firm name" value={party.company} onChange={(e) => updateParty('company', e.target.value)} className={INPUT} />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-[10.5px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      <RiUserLine className="w-3 h-3" /> Contact Person
                    </label>
                    <input placeholder="Full name" value={party.name} onChange={(e) => updateParty('name', e.target.value)} className={INPUT} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="flex items-center gap-1 text-[10.5px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      <RiPhoneLine className="w-3 h-3" /> Phone
                    </label>
                    <input placeholder="+971 55 …" value={party.phone} onChange={(e) => updateParty('phone', e.target.value)} className={INPUT} />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-[10.5px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      <RiMailLine className="w-3 h-3" /> Email <span className="text-slate-300 normal-case font-normal ml-0.5">(opt.)</span>
                    </label>
                    <input placeholder="email@example.com" value={party.email} onChange={(e) => updateParty('email', e.target.value)} className={INPUT} />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-1 text-[10.5px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    <RiMapPinLine className="w-3 h-3" /> Address <span className="text-slate-300 normal-case font-normal ml-0.5">(opt.)</span>
                  </label>
                  <textarea placeholder="Full address…" rows={2} value={party.address} onChange={(e) => updateParty('address', e.target.value)} className={cn(INPUT, 'resize-none')} />
                </div>

                {/* Shah House side — who received / issued */}
                <div className="col-span-2 pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: type === 'received' ? '#16a34a' : '#2563eb' }}>
                      <RiCheckboxCircleLine className="w-2.5 h-2.5 text-white" />
                    </div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Shah House — {type === 'received' ? 'Receiving Details' : 'Issuing Details'}
                    </p>
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-[10.5px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      <RiUserLine className="w-3 h-3" /> {type === 'received' ? 'Received By (Name)' : 'Issued By (Name)'}
                    </label>
                    <input
                      placeholder={type === 'received' ? 'Person who received the goods' : 'Person issuing the materials'}
                      value={receivedBy}
                      onChange={(e) => setReceivedBy(e.target.value)}
                      className={INPUT}
                    />
                  </div>
                </div>
              </div>
            </FormSection>

            {/* Step 4: Items */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-navy-900 text-white text-[10px] font-black flex items-center justify-center shrink-0">4</span>
                  <div>
                    <p className="text-[13px] font-bold text-slate-800">Materials / Items</p>
                    <p className="text-[11px] text-slate-400">{items.length} item{items.length !== 1 ? 's' : ''} listed</p>
                  </div>
                </div>
                <button onClick={addItem}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-bold text-white bg-navy-900 hover:bg-navy-800 transition-all">
                  <RiAddLine className="w-3.5 h-3.5" /> Add Item
                </button>
              </div>

              {/* Column headers */}
              <div className="hidden md:grid px-4 pt-3 pb-1" style={{ gridTemplateColumns: '24px 1fr 1fr 80px 80px 110px 28px', gap: '8px' }}>
                {['#', 'Item Name', 'Description', 'Qty', 'Unit', 'Unit Price', ''].map((h) => (
                  <span key={h} className="text-[9.5px] font-black text-slate-300 uppercase tracking-wider">{h}</span>
                ))}
              </div>

              <div className="divide-y divide-slate-50">
                {items.map((item, idx) => (
                  <div key={item.id} className="p-4">
                    {/* Mobile: stacked layout */}
                    <div className="flex items-start gap-2 mb-3 md:hidden">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-black flex items-center justify-center shrink-0 mt-2">{idx + 1}</span>
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input placeholder="Item name *" value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} className={cn(INPUT, 'font-semibold')} />
                        <input placeholder="Description" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} className={INPUT} />
                        <input type="number" min="0" step="0.01" value={item.qty} onChange={(e) => updateItem(item.id, 'qty', e.target.value)} className={INPUT} placeholder="Qty" />
                        <select value={item.unit} onChange={(e) => updateItem(item.id, 'unit', e.target.value)} className={cn(INPUT, 'cursor-pointer')}>
                          {UNITS.map((u) => <option key={u}>{u}</option>)}
                        </select>
                        <input type="number" min="0" step="0.01" placeholder="Unit Price AED" value={item.unitPrice} onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)} className={cn(INPUT, 'col-span-2')} />
                      </div>
                      <button onClick={() => removeItem(item.id)}
                        className="w-8 h-8 mt-1 rounded-lg flex items-center justify-center text-slate-200 hover:text-red-400 hover:bg-red-50 transition-all shrink-0">
                        <RiDeleteBin2Line className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Desktop: inline row */}
                    <div className="hidden md:grid items-center gap-2" style={{ gridTemplateColumns: '24px 1fr 1fr 80px 80px 110px 28px' }}>
                      <span className="text-[10px] font-black text-slate-300 text-center">{idx + 1}</span>
                      <input placeholder="Item name *" value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} className={cn(INPUT, 'font-semibold')} />
                      <input placeholder="Spec / description" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} className={INPUT} />
                      <input type="number" min="0" step="0.01" value={item.qty} onChange={(e) => updateItem(item.id, 'qty', e.target.value)} className={INPUT} />
                      <select value={item.unit} onChange={(e) => updateItem(item.id, 'unit', e.target.value)} className={cn(INPUT, 'cursor-pointer')}>
                        {UNITS.map((u) => <option key={u}>{u}</option>)}
                      </select>
                      <input type="number" min="0" step="0.01" placeholder="0.00" value={item.unitPrice} onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)} className={INPUT} />
                      <button onClick={() => removeItem(item.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-200 hover:text-red-400 hover:bg-red-50 transition-all">
                        <RiDeleteBin2Line className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {parseFloat(item.unitPrice) > 0 && (
                      <p className="mt-1.5 pl-8 text-[11px] text-slate-400 hidden md:block">
                        Line total: <span className="font-bold text-navy-700">{fmtAED(lineTotal(item))}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {hasPrice && (
                <div className="px-5 py-4 bg-navy-50 border-t border-navy-100 flex justify-between items-center">
                  <p className="text-[11px] text-navy-400 font-medium">{items.length} line item{items.length !== 1 ? 's' : ''}</p>
                  <div className="text-right">
                    <p className="text-[9.5px] font-bold text-navy-400 uppercase tracking-wider mb-0.5">Grand Total</p>
                    <p className="text-[22px] font-black text-navy-900 tracking-tight leading-none">{fmtAED(grandTotal)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Step 5: Notes */}
            <FormSection step="5" title="Notes / Remarks" optional>
              <textarea
                placeholder="Payment terms, special conditions, handling instructions…"
                rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
                className={cn(INPUT, 'resize-none')}
              />
            </FormSection>

            {/* Tip */}
            <div className="flex items-start gap-3 p-4 rounded-2xl border" style={{ background: 'linear-gradient(135deg, #f0f4ff, #e8f0fe)', borderColor: '#c7d7fc' }}>
              <RiSparklingLine className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-[11.5px] text-blue-700">
                <strong>Generate & Download PDF</strong> saves to History and downloads instantly.
                <strong> Save Only</strong> stores without downloading.
                Revisit any History record to view, re-download or edit it.
              </p>
            </div>
          </div>

          {/* ═══ PREVIEW PANEL ═══ */}
          <div className={cn('lg:sticky lg:top-20', mobileView === 'form' && 'hidden lg:block')}>
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Live Preview</p>
              <div className="flex items-center gap-3">
                <button onClick={handleSaveDraft} className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 transition-colors">
                  <RiSaveLine className="w-3 h-3" /> {editingId ? 'Save Changes' : 'Save Only'}
                </button>
                <span className="w-px h-3.5 bg-slate-200" />
                <button onClick={handleGenerate} disabled={pdfLoading}
                  className="flex items-center gap-1 text-[11px] font-bold text-navy-700 hover:text-navy-900 transition-colors disabled:opacity-50">
                  {pdfLoading ? <RiLoader4Line className="w-3 h-3 animate-spin" /> : <RiDownloadLine className="w-3 h-3" />}
                  {pdfLoading ? 'Generating…' : 'Download PDF'}
                </button>
              </div>
            </div>
            <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.12)', border: '1px solid #e2e8f0' }}>
              <LetterheadDoc cfg={cfg} docNum={docNum} date={date} reference={reference} deliveryRef={deliveryRef} receivedBy={receivedBy} party={party} items={items} notes={notes} hasPrice={hasPrice} grandTotal={grandTotal} />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          HISTORY TAB
      ══════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div className="space-y-5">

          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Documents" value={records.length} sub={`${thisMonthDocs} this month`} color="navy" Icon={RiFileList3Line} />
            <StatCard label="Goods Received" value={grnCount} sub="GRN documents" color="green" Icon={RiArrowDownLine} />
            <StatCard label="Material Issued" value={issCount} sub="ISS documents" color="blue" Icon={RiSendPlane2Line} />
            <StatCard label="Total Value" value={fmtAED(totalValue)} sub="Combined AED" color="gold" Icon={RiTrophyLine} small />
          </div>

          {/* Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-48">
                <RiSearch2Line className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by doc number, company, party…"
                  className="w-full pl-9 pr-3 py-2 text-[13px] border border-slate-200 rounded-xl focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors">
                    <RiCloseLine className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Type filter */}
              <div className="flex gap-1 p-1 bg-slate-100 rounded-xl shrink-0">
                {[
                  { key: 'all',      label: `All (${records.length})` },
                  { key: 'received', label: `GRN (${grnCount})` },
                  { key: 'issued',   label: `ISS (${issCount})` },
                ].map((f) => (
                  <button key={f.key} onClick={() => setFilter(f.key)}
                    className={cn('px-3 py-1.5 rounded-lg text-[11.5px] font-bold transition-all whitespace-nowrap',
                      filter === f.key ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Sort */}
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 text-[12px] font-semibold border border-slate-200 rounded-xl text-slate-600 outline-none focus:border-accent-400 transition-all bg-white shrink-0">
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="highest">Highest value</option>
                <option value="lowest">Lowest value</option>
              </select>

              {/* View toggle */}
              <div className="flex gap-1 p-1 bg-slate-100 rounded-xl shrink-0">
                <button onClick={() => setHistoryView('grid')}
                  className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-all', historyView === 'grid' ? 'bg-white shadow-sm text-navy-900' : 'text-slate-400 hover:text-slate-600')}>
                  <RiGridLine className="w-4 h-4" />
                </button>
                <button onClick={() => setHistoryView('table')}
                  className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-all', historyView === 'table' ? 'bg-white shadow-sm text-navy-900' : 'text-slate-400 hover:text-slate-600')}>
                  <RiListCheck2 className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => { setActiveTab('create'); setDocNum(getAutoNum(type)); setEditingId(null); }}
                className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, #0b1d3a, #1e3a6e)' }}>
                <RiAddLine className="w-3.5 h-3.5" /> New Document
              </button>
            </div>

            {/* Result count */}
            {(searchQuery || filter !== 'all') && (
              <p className="text-[11px] text-slate-400 mt-2.5">
                Showing <strong className="text-slate-600">{filtered.length}</strong> of {records.length} documents
                {searchQuery && <> matching "<strong className="text-slate-600">{searchQuery}</strong>"</>}
              </p>
            )}
          </div>

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-slate-100">
              <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mb-5">
                <RiArchiveLine className="w-9 h-9 text-slate-300" />
              </div>
              <p className="text-[15px] font-bold text-slate-400 mb-1.5">
                {searchQuery ? 'No matching documents' : 'No documents yet'}
              </p>
              <p className="text-[12.5px] text-slate-300 mb-5">
                {searchQuery
                  ? `No results for "${searchQuery}"`
                  : filter === 'all'
                  ? 'Create your first document and save it here.'
                  : `No ${TYPES[filter]?.short} documents saved.`}
              </p>
              {searchQuery ? (
                <button onClick={() => setSearchQuery('')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all">
                  <RiCloseLine className="w-3.5 h-3.5" /> Clear Search
                </button>
              ) : (
                <button onClick={() => setActiveTab('create')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #0b1d3a, #1e3a6e)' }}>
                  <RiFileTextLine className="w-4 h-4" /> Create First Document
                </button>
              )}
            </div>
          )}

          {/* Grid view */}
          {filtered.length > 0 && historyView === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map((record, i) => (
                <HistoryCard key={record.id} record={record} index={i}
                  onDetail={() => setDetailRecord(record)}
                  onPrint={() => handlePrintRecord(record)}
                  onWhatsApp={() => handleWhatsApp(record)}
                  onEdit={() => handleEdit(record)}
                  onDelete={() => handleDelete(record.id)}
                  pdfLoading={pdfLoading}
                />
              ))}
            </div>
          )}

          {/* Table view */}
          {filtered.length > 0 && historyView === 'table' && (
            <HistoryTable
              records={filtered}
              onDetail={(r) => setDetailRecord(r)}
              onPrint={handlePrintRecord}
              onWhatsApp={handleWhatsApp}
              onEdit={handleEdit}
              onDelete={(id) => handleDelete(id)}
              pdfLoading={pdfLoading}
            />
          )}
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {detailRecord && (
          <DetailModal
            record={detailRecord}
            onClose={() => setDetailRecord(null)}
            onPrint={() => handlePrintRecord(detailRecord)}
            onWhatsApp={() => handleWhatsApp(detailRecord)}
            onDelete={() => handleDelete(detailRecord.id)}
            onEdit={() => handleEdit(detailRecord)}
            pdfLoading={pdfLoading}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FORM SECTION
═══════════════════════════════════════════════════════════════ */
function FormSection({ step, title, optional, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-50">
        <span className="w-6 h-6 rounded-full bg-navy-900 text-white text-[10px] font-black flex items-center justify-center shrink-0">{step}</span>
        <p className="text-[13px] font-bold text-slate-800">{title}</p>
        {optional && <span className="ml-auto text-[10px] text-slate-300 font-medium">Optional</span>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STAT CARD
═══════════════════════════════════════════════════════════════ */
function StatCard({ label, value, sub, color, small, Icon }) {
  const palettes = {
    navy:  { bg: 'from-[#0b1d3a] to-[#1e3a6e]', text: 'text-white', sub: 'text-blue-200' },
    green: { bg: 'from-emerald-600 to-emerald-700', text: 'text-white', sub: 'text-emerald-200' },
    blue:  { bg: 'from-blue-600 to-blue-700', text: 'text-white', sub: 'text-blue-200' },
    gold:  { bg: 'from-amber-500 to-amber-600', text: 'text-white', sub: 'text-amber-100' },
  };
  const p = palettes[color];
  return (
    <div className={`bg-linear-to-br ${p.bg} rounded-2xl p-5 relative overflow-hidden`} style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
      <div className="absolute top-0 right-0 w-28 h-28 rounded-full opacity-10 translate-x-10 -translate-y-10 bg-white" />
      {Icon && <Icon className={`w-4 h-4 mb-3 opacity-60 ${p.text}`} />}
      <p className={`${small ? 'text-[16px] leading-tight' : 'text-[28px]'} font-black ${p.text} leading-none mb-1.5`}>{value}</p>
      <p className={`text-[10px] font-bold ${p.text} opacity-90 uppercase tracking-wider mb-0.5`}>{label}</p>
      <p className={`text-[9.5px] ${p.sub} opacity-80`}>{sub}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HISTORY CARD
═══════════════════════════════════════════════════════════════ */
function HistoryCard({ record, index, onDetail, onPrint, onWhatsApp, onEdit, onDelete, pdfLoading }) {
  const cfg       = TYPES[record.type];
  const partyName = record.party.company || record.party.name;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.28 }}
      className="bg-white rounded-2xl overflow-hidden group hover:shadow-lg transition-all duration-300 relative"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid #f1f5f9' }}
    >
      {/* Top accent */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${cfg.accent}, ${cfg.accent}99)` }} />

      {/* Fold corner */}
      <div style={{
        position: 'absolute', top: 4, right: 0,
        borderStyle: 'solid', borderWidth: '0 20px 20px 0',
        borderColor: `transparent ${cfg.accentMid} transparent transparent`, zIndex: 1,
      }} />

      <div className="p-5 relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[9.5px] font-black px-2.5 py-1 rounded-full text-white tracking-wider"
            style={{ background: cfg.accent, boxShadow: `0 2px 8px ${cfg.accent}44` }}>
            {cfg.short}
          </span>
          <span className="text-[10px] text-slate-300 font-medium">{fmtDateShort(record.savedAt || record.createdAt)}</span>
        </div>

        <p className="text-[18px] font-black text-navy-900 tracking-tight leading-none mb-1">{record.docNum}</p>
        <p className="text-[11px] text-slate-400 mb-4">{cfg.label} · {fmtDate(record.date)}</p>

        {partyName ? (
          <div className="rounded-xl p-3 mb-4" style={{ background: cfg.accentLight, border: `1px solid ${cfg.accentMid}` }}>
            <p className="text-[12.5px] font-bold text-slate-800 leading-tight mb-1 truncate">{partyName}</p>
            {record.party.name && record.party.company && (
              <p className="text-[10.5px] text-slate-500 mb-0.5 truncate">Contact: {record.party.name}</p>
            )}
            {record.party.phone && (
              <p className="text-[10.5px] font-medium truncate" style={{ color: cfg.accent }}>Tel: {record.party.phone}</p>
            )}
          </div>
        ) : (
          <div className="rounded-xl p-3 mb-4 bg-slate-50 border border-slate-100">
            <p className="text-[11px] text-slate-300 italic">No party specified</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-black text-white" style={{ background: cfg.accent }}>
              {record.items.length}
            </span>
            <span className="text-[11px] text-slate-500">item{record.items.length !== 1 ? 's' : ''}</span>
          </div>
          {record.hasPrice
            ? <span className="text-[13.5px] font-black text-navy-900 tracking-tight">{fmtAED(record.grandTotal)}</span>
            : <span className="text-[10px] text-slate-300 italic">no pricing</span>
          }
        </div>
      </div>

      <div className="grid grid-cols-5 border-t border-slate-100">
        <button onClick={onDetail}
          className="col-span-2 flex items-center justify-center gap-1.5 py-3 text-[11px] font-bold text-navy-800 hover:bg-navy-50 transition-colors border-r border-slate-100">
          <RiEyeLine className="w-3.5 h-3.5" /> View
        </button>
        <button onClick={onEdit} title="Edit document"
          className="flex items-center justify-center py-3 text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors border-r border-slate-100">
          <RiEditLine className="w-3.5 h-3.5" />
        </button>
        <button onClick={onPrint} disabled={pdfLoading} title="Download PDF"
          className="flex items-center justify-center py-3 text-slate-400 hover:text-navy-700 hover:bg-navy-50 transition-colors disabled:opacity-40 border-r border-slate-100">
          {pdfLoading ? <RiLoader4Line className="w-3.5 h-3.5 animate-spin" /> : <RiDownloadLine className="w-3.5 h-3.5" />}
        </button>
        <button onClick={onWhatsApp} title="Share on WhatsApp"
          className="flex items-center justify-center py-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
          <RiWhatsappLine className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Delete — hover reveal */}
      <button onClick={onDelete} title="Delete"
        className="absolute top-8 right-3 opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all z-10">
        <RiDeleteBin2Line className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HISTORY TABLE (new)
═══════════════════════════════════════════════════════════════ */
function HistoryTable({ records, onDetail, onPrint, onWhatsApp, onEdit, onDelete, pdfLoading }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100" style={{ background: 'linear-gradient(90deg, #f8fafc, #f1f5f9)' }}>
              {['Document', 'Type', 'Party', 'Date', 'Items', 'Total', 'Saved', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((record, i) => {
              const cfg = TYPES[record.type];
              const party = record.party.company || record.party.name;
              return (
                <motion.tr
                  key={record.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.025, duration: 0.22 }}
                  className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors group"
                >
                  {/* Doc number */}
                  <td className="px-4 py-3.5">
                    <p className="text-[13px] font-black text-navy-900 tracking-tight">{record.docNum}</p>
                    {record.reference && (
                      <p className="text-[10px] text-slate-400 mt-0.5">Ref: {record.reference}</p>
                    )}
                  </td>
                  {/* Type badge */}
                  <td className="px-4 py-3.5">
                    <span className="text-[9.5px] font-black px-2.5 py-1 rounded-full text-white whitespace-nowrap"
                      style={{ background: cfg.accent }}>
                      {cfg.short}
                    </span>
                  </td>
                  {/* Party */}
                  <td className="px-4 py-3.5 max-w-48">
                    {party
                      ? <p className="text-[12px] font-semibold text-slate-700 truncate">{party}</p>
                      : <span className="text-[11px] text-slate-300 italic">—</span>
                    }
                    {record.party.phone && (
                      <p className="text-[10px] text-slate-400 mt-0.5">{record.party.phone}</p>
                    )}
                  </td>
                  {/* Date */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <p className="text-[12px] text-slate-600">{fmtDateShort(record.date)}</p>
                  </td>
                  {/* Items */}
                  <td className="px-4 py-3.5">
                    <span className="w-6 h-6 rounded-md inline-flex items-center justify-center text-[9px] font-black text-white"
                      style={{ background: cfg.accent }}>
                      {record.items.length}
                    </span>
                  </td>
                  {/* Total */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {record.hasPrice
                      ? <span className="text-[12.5px] font-black text-navy-900 font-[tabular-nums]">{fmtAED(record.grandTotal)}</span>
                      : <span className="text-[10.5px] text-slate-300 italic">—</span>
                    }
                  </td>
                  {/* Saved date */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <p className="text-[11px] text-slate-400">{fmtDateShort(record.savedAt || record.createdAt)}</p>
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => onDetail(record)} title="View"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-navy-700 hover:bg-navy-50 transition-all">
                        <RiEyeLine className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onEdit(record)} title="Edit"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all">
                        <RiEditLine className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onPrint(record)} disabled={pdfLoading} title="Download PDF"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-navy-700 hover:bg-navy-50 transition-all disabled:opacity-40">
                        {pdfLoading ? <RiLoader4Line className="w-3.5 h-3.5 animate-spin" /> : <RiDownloadLine className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => onWhatsApp(record)} title="WhatsApp"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all">
                        <RiWhatsappLine className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onDelete(record.id)} title="Delete"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-200 hover:text-red-400 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                        <RiDeleteBin2Line className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <p className="text-[11px] text-slate-400">{records.length} document{records.length !== 1 ? 's' : ''}</p>
        <p className="text-[11px] text-slate-400">
          Total value: <span className="font-bold text-slate-600">
            {fmtAED(records.reduce((s, r) => s + (r.grandTotal || 0), 0))}
          </span>
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DETAIL MODAL
═══════════════════════════════════════════════════════════════ */
function DetailModal({ record, onClose, onPrint, onWhatsApp, onDelete, onEdit, pdfLoading }) {
  const cfg = TYPES[record.type];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.68)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 340, damping: 32 }}
        className="bg-white rounded-2xl overflow-hidden w-full max-w-175 my-8 flex flex-col"
        style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.38)', maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-2 h-10 rounded-full shrink-0" style={{ background: cfg.accent }} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full text-white shrink-0" style={{ background: cfg.accent }}>
                  {cfg.short}
                </span>
                <p className="text-[15px] font-black text-navy-900 truncate">{record.docNum}</p>
              </div>
              <p className="text-[11px] text-slate-400">
                {fmtDate(record.date)}{record.reference ? ` · Ref: ${record.reference}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            <button onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg transition-all">
              <RiEditLine className="w-3.5 h-3.5" /> Edit
            </button>
            <button onClick={onWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white rounded-lg transition-all"
              style={{ background: '#25D366' }}>
              <RiWhatsappLine className="w-3.5 h-3.5" /> Share
            </button>
            <button onClick={onPrint} disabled={pdfLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white rounded-lg transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #0b1d3a, #1e3a6e)' }}>
              {pdfLoading ? <RiLoader4Line className="w-3.5 h-3.5 animate-spin" /> : <RiDownloadLine className="w-3.5 h-3.5" />}
              {pdfLoading ? 'Generating…' : 'PDF'}
            </button>
            <button onClick={onDelete}
              className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all">
              <RiDeleteBin2Line className="w-4 h-4" />
            </button>
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all">
              <RiCloseLine className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Document preview */}
        <div className="overflow-y-auto flex-1">
          <LetterheadDoc
            cfg={cfg}
            docNum={record.docNum}
            date={record.date}
            reference={record.reference}
            deliveryRef={record.deliveryRef || ''}
            receivedBy={record.receivedBy || ''}
            party={record.party}
            items={record.items}
            notes={record.notes}
            hasPrice={record.hasPrice}
            grandTotal={record.grandTotal}
          />
        </div>

        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50 shrink-0">
          <p className="text-[10.5px] text-slate-400">
            Saved {fmtDateShort(record.savedAt || record.createdAt)} · {record.items.length} item{record.items.length !== 1 ? 's' : ''}
            {record.hasPrice ? ` · ${fmtAED(record.grandTotal)}` : ''}
          </p>
          <button onClick={onClose}
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors">
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   INLINE SVG ICONS — print-safe, no external deps
═══════════════════════════════════════════════════════════════ */
function LHIcon({ size = 40 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56" width={size} height={size} fill="none">
      <path d="M7 27L28 10L49 27V50H7Z" fill="white" />
      <path d="M28 4L31.5 8.5L28 11L24.5 8.5Z" fill="#C9A227" />
      <rect x="7" y="27" width="42" height="1.8" fill="#C9A227" fillOpacity="0.82" />
      <rect x="9" y="30.5" width="8" height="6" rx="1" fill="#0b1d3a" fillOpacity="0.42" />
      <rect x="39" y="30.5" width="8" height="6" rx="1" fill="#0b1d3a" fillOpacity="0.42" />
      <path d="M22 50V42Q22 35.5 28 35.5Q34 35.5 34 42V50Z" fill="#0b1d3a" />
      <path d="M22 42.5Q22 36 28 36Q34 36 34 42.5" stroke="#C9A227" strokeWidth="1.6" strokeOpacity="0.85" />
    </svg>
  );
}

function LHIconTiny({ size = 16 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56" width={size} height={size} fill="none">
      <path d="M7 27L28 10L49 27V50H7Z" fill="rgba(255,255,255,0.45)" />
      <path d="M28 4L31.5 8.5L28 11L24.5 8.5Z" fill="#C9A227" fillOpacity="0.7" />
      <rect x="7" y="27" width="42" height="1.8" fill="#C9A227" fillOpacity="0.5" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LETTERHEAD DOCUMENT — render for preview and PDF capture
   Root div is always ≥ A4 height (1123px at 96dpi = 210×297mm)
═══════════════════════════════════════════════════════════════ */
function LetterheadDoc({ cfg, docNum, date, reference, deliveryRef, receivedBy, party, items, notes, hasPrice, grandTotal }) {
  const partyDisplay = party.company || party.name;
  const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
  const accent = cfg.accent;

  /* Determine left/right column labels based on type */
  const isGRN = cfg.short === 'GRN';
  const leftLabel  = cfg.partyLabel; // "Received From" or "Issued To"
  const rightLabel = isGRN ? 'DELIVERED TO — SHAH HOUSE' : 'ISSUED BY — SHAH HOUSE';

  const metaFields = [
    { label: 'Document No.',    value: docNum || `${cfg.short}-DRAFT` },
    { label: 'Date',            value: fmtDate(date) },
    ...(reference   ? [{ label: 'PO / Reference',  value: reference }]   : []),
    ...(deliveryRef ? [{ label: isGRN ? 'Delivery Note' : 'Issue Ref.', value: deliveryRef }] : []),
  ];

  const SIG_ROWS = [
    { label: 'Name',        pre: isGRN ? receivedBy : 'Authorized Signatory' },
    { label: 'Designation', pre: '' },
    { label: 'Date',        pre: '' },
    { label: 'Signature',   pre: '' },
  ];

  return (
    /* Root: always ≥ A4 height (1123px ≈ 297mm @ 96dpi), flex column so footer is pinned */
    <div style={{ fontFamily: font, color: '#0f172a', fontSize: 12, background: '#fff', minHeight: 1123, display: 'flex', flexDirection: 'column' }}>

      {/* ══ HEADER ════════════════════════════════════════════════ */}
      <div style={{ background: 'linear-gradient(150deg, #060f1e 0%, #0b1d3a 55%, #0f2850 100%)', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        {/* Gold top bar */}
        <div style={{ height: 4, background: 'linear-gradient(90deg, #8a6410 0%, #C9A227 35%, #f0d060 55%, #C9A227 75%, #8a6410 100%)' }} />
        {/* "SH" watermark */}
        <div style={{ position: 'absolute', bottom: -20, right: -10, opacity: 0.035, fontSize: 140, fontWeight: 900, color: 'white', letterSpacing: '-0.04em', lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>SH</div>
        {/* Decorative circle */}
        <div style={{ position: 'absolute', top: -30, left: -30, width: 130, height: 130, borderRadius: '50%', background: 'rgba(201,162,39,0.06)', pointerEvents: 'none' }} />

        {/* Logo row */}
        <div style={{ padding: '22px 28px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 62, height: 62, borderRadius: 16, background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(201,162,39,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 6px 24px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
              <LHIcon size={46} />
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: 900, fontSize: 23, letterSpacing: '0.10em', lineHeight: 1, textTransform: 'uppercase' }}>SHAH HOUSE</div>
              <div style={{ color: '#C9A227', fontSize: 8.5, marginTop: 4, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.85 }}>Premium Villa Property</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 8, marginTop: 2, letterSpacing: '0.1em' }}>Dubai, United Arab Emirates</div>
              <div style={{ marginTop: 9, height: 1.5, width: 150, background: 'linear-gradient(90deg, #C9A227 0%, rgba(201,162,39,0.08) 100%)' }} />
            </div>
          </div>

          {/* Document type panel */}
          <div style={{ borderRadius: 12, flexShrink: 0, border: `1.5px solid ${accent}35`, borderLeft: `4px solid ${accent}`, background: 'rgba(255,255,255,0.05)', padding: '14px 22px', textAlign: 'right', boxShadow: `0 0 28px ${accent}18, inset 0 1px 0 rgba(255,255,255,0.05)`, minWidth: 170 }}>
            <div style={{ color: 'rgba(255,255,255,0.30)', fontSize: 7, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.24em', marginBottom: 7 }}>Shah House · Official</div>
            <div style={{ color: 'white', fontWeight: 900, fontSize: 14, lineHeight: 1.3, marginBottom: 4 }}>{cfg.label}</div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 8.5, marginBottom: 11 }}>Property Management Document</div>
            <div style={{ display: 'inline-block', background: accent, borderRadius: 6, padding: '4px 13px', color: 'white', fontWeight: 900, fontSize: 11.5, letterSpacing: '0.12em', boxShadow: `0 3px 12px ${accent}55` }}>{cfg.short}</div>
          </div>
        </div>

        {/* Meta fields strip */}
        <div style={{ margin: '18px 28px 0', padding: '12px 0 20px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexWrap: 'wrap', gap: 0 }}>
          {metaFields.map((f, i) => (
            <div key={f.label} style={{ paddingRight: 32, marginRight: 32, borderRight: i < metaFields.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', flexShrink: 0 }}>
              <div style={{ color: '#C9A227', fontSize: 6.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.22em', marginBottom: 5, opacity: 0.85 }}>{f.label}</div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: 12 }}>{f.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ TWO-COLUMN PARTY SECTION ══════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
        {/* LEFT: External party (supplier for GRN, recipient for ISS) */}
        <div style={{ padding: '18px 24px 18px 28px', borderRight: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
            <div style={{ width: 3, height: 16, borderRadius: 2, background: accent, flexShrink: 0 }} />
            <div style={{ fontSize: 6.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: accent, opacity: 0.9 }}>{leftLabel}</div>
          </div>
          {partyDisplay ? (
            <div>
              {party.company && (
                <div style={{ fontWeight: 900, fontSize: 15, color: '#0b1d3a', marginBottom: 5, letterSpacing: '-0.01em', lineHeight: 1.2 }}>{party.company}</div>
              )}
              {party.name && (
                <div style={{ fontSize: 11, color: '#475569', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: '#94a3b8', fontSize: 9 }}>CONTACT</span>
                  <span style={{ fontWeight: 700, color: '#334155' }}>{party.name}</span>
                </div>
              )}
              {party.phone && (
                <div style={{ fontSize: 10.5, color: '#64748b', marginBottom: 3 }}>
                  <span style={{ color: '#94a3b8', fontSize: 9, marginRight: 4 }}>TEL</span>{party.phone}
                </div>
              )}
              {party.email && (
                <div style={{ fontSize: 10.5, color: '#64748b', marginBottom: 3 }}>
                  <span style={{ color: '#94a3b8', fontSize: 9, marginRight: 4 }}>EMAIL</span>{party.email}
                </div>
              )}
              {party.address && (
                <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 4, lineHeight: 1.55 }}>
                  <span style={{ color: '#94a3b8', fontSize: 9, display: 'block', marginBottom: 2 }}>ADDRESS</span>
                  {party.address}
                </div>
              )}
            </div>
          ) : (
            <span style={{ color: '#cbd5e1', fontStyle: 'italic', fontSize: 11.5 }}>Not specified</span>
          )}
        </div>

        {/* RIGHT: Shah House side */}
        <div style={{ padding: '18px 28px 18px 24px', background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
            <div style={{ width: 3, height: 16, borderRadius: 2, background: '#0b1d3a', flexShrink: 0 }} />
            <div style={{ fontSize: 6.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#0b1d3a', opacity: 0.8 }}>{rightLabel}</div>
          </div>
          <div style={{ fontWeight: 900, fontSize: 15, color: '#0b1d3a', marginBottom: 5, letterSpacing: '-0.01em' }}>Shah House</div>
          <div style={{ fontSize: 10.5, color: '#64748b', marginBottom: 3 }}>
            <span style={{ color: '#94a3b8', fontSize: 9, marginRight: 4 }}>TYPE</span>Premium Villa Property
          </div>
          <div style={{ fontSize: 10.5, color: '#64748b', marginBottom: 3 }}>
            <span style={{ color: '#94a3b8', fontSize: 9, marginRight: 4 }}>LOCATION</span>Dubai, UAE
          </div>
          {receivedBy && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: `${accent}12`, borderRadius: 8, border: `1px solid ${accent}25` }}>
              <div style={{ fontSize: 7, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.16em', color: accent, marginBottom: 3, opacity: 0.85 }}>
                {isGRN ? 'Received By' : 'Issued By'}
              </div>
              <div style={{ fontWeight: 700, fontSize: 12.5, color: '#0f172a' }}>{receivedBy}</div>
            </div>
          )}
        </div>
      </div>

      {/* ══ ITEMS TABLE ═══════════════════════════════════════════ */}
      <div style={{ padding: '18px 28px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ fontSize: 6.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.22em', color: '#64748b' }}>Materials &amp; Items</div>
          <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
          <div style={{ fontSize: 8.5, color: '#94a3b8', fontWeight: 600 }}>{items.length} item{items.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: 'linear-gradient(90deg, #0b1d3a 0%, #0f2850 100%)' }}>
                {['#', 'Material / Item Name', 'Specification', 'Qty', 'Unit', ...(hasPrice ? ['Unit Price (AED)', 'Line Total (AED)'] : [])].map((h, i) => (
                  <th key={h} style={{
                    padding: '10px 12px', color: 'rgba(255,255,255,0.80)', fontWeight: 700, fontSize: 7.5,
                    textTransform: 'uppercase', letterSpacing: '0.09em',
                    textAlign: i === 0 ? 'center' : (hasPrice && i >= 5 ? 'right' : i >= 3 ? 'center' : 'left'),
                    ...(i === 0 ? { width: 28 } : {}),
                    borderBottom: `2.5px solid ${accent}60`,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id || i} style={{ background: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                  <td style={{ padding: '9px 12px', textAlign: 'center', color: '#94a3b8', fontWeight: 800, fontSize: 10, borderBottom: '1px solid #f1f5f9' }}>{i + 1}</td>
                  <td style={{ padding: '9px 12px', fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #f1f5f9', fontSize: 11.5 }}>
                    {item.name || <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>—</span>}
                  </td>
                  <td style={{ padding: '9px 12px', color: '#64748b', borderBottom: '1px solid #f1f5f9', fontSize: 10.5 }}>{item.description || '—'}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 900, color: '#0b1d3a', borderBottom: '1px solid #f1f5f9', fontSize: 12 }}>{item.qty}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'center', color: '#475569', borderBottom: '1px solid #f1f5f9', fontSize: 10 }}>{item.unit}</td>
                  {hasPrice && (
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#475569', borderBottom: '1px solid #f1f5f9', fontVariantNumeric: 'tabular-nums' }}>
                      {item.unitPrice ? fmtAED(item.unitPrice) : <span style={{ color: '#e2e8f0' }}>—</span>}
                    </td>
                  )}
                  {hasPrice && (
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 800, color: '#0b1d3a', borderBottom: '1px solid #f1f5f9', fontVariantNumeric: 'tabular-nums' }}>
                      {item.unitPrice ? fmtAED(lineTotal(item)) : <span style={{ color: '#e2e8f0' }}>—</span>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {hasPrice && (
              <tfoot>
                <tr style={{ background: 'linear-gradient(90deg, #eef1f8, #e4ecf8)' }}>
                  <td colSpan={hasPrice ? 5 : 5} style={{ borderTop: '2px solid #0b1d3a', padding: '10px 12px' }} />
                  <td style={{ padding: '12px 12px', fontWeight: 700, fontSize: 10, color: '#334155', borderTop: '2px solid #0b1d3a', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Grand Total</td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', fontWeight: 900, fontSize: 16, color: '#0b1d3a', borderTop: '2px solid #0b1d3a', fontVariantNumeric: 'tabular-nums' }}>
                    {fmtAED(grandTotal)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ══ NOTES ═════════════════════════════════════════════════ */}
      {notes && (
        <div style={{ margin: '0 28px 18px', padding: '13px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderLeft: '4px solid #d97706', borderRadius: 9, flexShrink: 0 }}>
          <div style={{ fontSize: 6.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#92400e', marginBottom: 6, opacity: 0.85 }}>Remarks / Special Instructions</div>
          <div style={{ fontSize: 11.5, color: '#78350f', lineHeight: 1.75 }}>{notes}</div>
        </div>
      )}

      {/* ══ SPACER — pushes signatures to bottom on short documents ══ */}
      <div style={{ flex: 1, minHeight: 16 }} />

      {/* ══ SIGNATURE SECTION ════════════════════════════════════ */}
      <div style={{ margin: '0 28px 0', padding: '18px 0 0', borderTop: '2px solid #e2e8f0', flexShrink: 0 }}>
        <div style={{ fontSize: 6.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#94a3b8', marginBottom: 14 }}>Authorized Signatures &amp; Acknowledgement</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          {[
            {
              title: cfg.actionLabel,
              sub: 'Shah House — Authorized Signatory',
              name: receivedBy || '',
            },
            {
              title: cfg.otherLabel,
              sub: party.company || party.name || 'Counterparty / Supplier',
              name: party.name || '',
            },
          ].map((sig, i) => (
            <div key={i} style={{ padding: '14px 16px', border: '1px solid #e8edf3', borderRadius: 10, background: i === 0 ? '#f8fafb' : '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 3, height: 14, borderRadius: 2, background: i === 0 ? '#0b1d3a' : accent, flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: 11, color: '#0f172a', lineHeight: 1.2 }}>{sig.title}</div>
                  <div style={{ fontSize: 8.5, color: '#94a3b8', marginTop: 2 }}>{sig.sub}</div>
                </div>
              </div>
              {[
                { label: 'Name',        value: sig.name },
                { label: 'Designation', value: '' },
                { label: 'Date',        value: '' },
                { label: 'Signature',   value: '' },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 9, gap: 8 }}>
                  <span style={{ fontSize: 8.5, color: '#94a3b8', fontWeight: 700, width: 64, flexShrink: 0, paddingBottom: 2 }}>{label}:</span>
                  <div style={{ flex: 1, borderBottom: '1px solid #dce2ea', paddingBottom: 2, fontSize: 10, color: '#475569', fontWeight: value ? 600 : 400 }}>
                    {value || ''}
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 12, height: 44, borderRadius: 7, border: `1.5px dashed ${i === 0 ? '#c7d3e0' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: i === 0 ? '#f0f4f8' : '#fafbfc' }}>
                <span style={{ color: '#b0bcc8', fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Official Stamp / Seal</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ FOOTER ════════════════════════════════════════════════ */}
      <div style={{ background: 'linear-gradient(90deg, #060f1e, #0b1d3a)', padding: '11px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LHIconTiny size={15} />
          <div>
            <div style={{ color: 'rgba(255,255,255,0.30)', fontSize: 7.5, letterSpacing: '0.05em' }}>Shah House &nbsp;·&nbsp; Premium Villa Property &nbsp;·&nbsp; Dubai, UAE</div>
            <div style={{ color: 'rgba(255,255,255,0.14)', fontSize: 7, marginTop: 2 }}>This document is official and confidential. Unauthorized reproduction is prohibited.</div>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ color: 'rgba(255,255,255,0.20)', fontSize: 7.5, whiteSpace: 'nowrap' }}>Generated via AHMS</div>
          <div style={{ color: 'rgba(255,255,255,0.14)', fontSize: 7, marginTop: 2, whiteSpace: 'nowrap' }}>
            {new Date().toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>
    </div>
  );
}
