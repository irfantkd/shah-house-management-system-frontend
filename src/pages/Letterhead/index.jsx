import { useState, useRef } from 'react';
import { flushSync } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import {
  Plus, Trash2, RotateCcw, Building2, Phone, Mail, MapPin,
  User, ClipboardList, Eye, RefreshCw, Download, X, Archive,
  FileText, MessageCircle, Loader2, Save, Sparkles, TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';
import { saveLetterhead, deleteLetterhead, selectLetterheads } from '../../store/slices/letterheadsSlice';
import { generateLetterheadPdf } from '../../utils/generateLetterheadPdf';

/* ─── Config ─────────────────────────────────────────────── */
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
    emoji: '📥',
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
    emoji: '📤',
  },
};

/* ─── Helpers ────────────────────────────────────────────── */
const uid        = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const fmtDate    = (s) => s ? new Date(`${s}T00:00:00`).toLocaleDateString('en-AE', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
const fmtDateShort = (s) => s ? new Date(s).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtAED     = (n) => `AED ${(+n || 0).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const lineTotal  = (item) => (+item.qty || 0) * (+item.unitPrice || 0);
const makeItem   = () => ({ id: uid(), name: '', description: '', qty: 1, unit: 'pcs', unitPrice: '' });

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

/* ─── Shared styles ──────────────────────────────────────── */
const INPUT = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] text-slate-800 placeholder:text-slate-300 focus:border-accent-400 focus:ring-2 focus:ring-accent-100 outline-none transition-all bg-white';
const LABEL = 'block text-[10.5px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider';

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function LetterheadPage() {
  /* ── Form state ── */
  const [type,      setType]      = useState('received');
  const [docNum,    setDocNum]    = useState(() => getAutoNum('received'));
  const [date,      setDate]      = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');
  const [party,     setParty]     = useState({ name: '', company: '', phone: '', email: '', address: '' });
  const [items,     setItems]     = useState([makeItem()]);
  const [notes,     setNotes]     = useState('');

  /* ── UI state ── */
  const [activeTab,     setActiveTab]     = useState('create');
  const [detailRecord,  setDetailRecord]  = useState(null);
  const [filter,        setFilter]        = useState('all');
  const [pdfLoading,    setPdfLoading]    = useState(false);
  const [mobileView,    setMobileView]    = useState('form');
  const [hiddenDocData, setHiddenDocData] = useState(null);

  /* ── Refs ── */
  const hiddenPrintRef = useRef(null);

  /* ── Redux ── */
  const dispatch = useDispatch();
  const records  = useSelector(selectLetterheads);

  /* ── Derived ── */
  const cfg        = TYPES[type];
  const grandTotal = items.reduce((s, i) => s + lineTotal(i), 0);
  const hasPrice   = items.some((i) => parseFloat(i.unitPrice) > 0);

  /* ── Form handlers ── */
  const handleTypeChange = (t) => { setType(t); setDocNum(getAutoNum(t)); };
  const addItem    = () => setItems((p) => [...p, makeItem()]);
  const removeItem = (id) => setItems((p) => p.length > 1 ? p.filter((i) => i.id !== id) : p);
  const updateItem = (id, f, v) => setItems((p) => p.map((i) => i.id === id ? { ...i, [f]: v } : i));
  const updateParty = (f, v) => setParty((p) => ({ ...p, [f]: v }));
  const freshDocNum = () => setDocNum(getAutoNum(type));
  const handleClear = () => {
    setParty({ name: '', company: '', phone: '', email: '', address: '' });
    setItems([makeItem()]);
    setNotes('');
    setReference('');
  };

  /* ── PDF capture via html2canvas ── */
  const capturePdf = async (docData, filename) => {
    flushSync(() => setHiddenDocData(docData));
    if (!hiddenPrintRef.current) throw new Error('Render element not ready');
    await generateLetterheadPdf(hiddenPrintRef.current, filename);
    setHiddenDocData(null);
  };

  /* ── PRIMARY ACTION: auto-save + download PDF ── */
  const handleGenerate = async () => {
    if (!items.some((i) => i.name.trim())) {
      toast.error('Add at least one item name before generating');
      return;
    }
    if (pdfLoading) return;

    const record = {
      id: uid(),
      savedAt: new Date().toISOString(),
      type, docNum, date, reference,
      party: { ...party },
      items: items.map((i) => ({ ...i })),
      notes, grandTotal, hasPrice,
    };

    dispatch(saveLetterhead(record));
    saveNum(type, docNum);

    setPdfLoading(true);
    const toastId = toast.loading('Generating PDF…');
    try {
      const docData = { cfg, docNum, date, reference, party, items, notes, hasPrice, grandTotal };
      await capturePdf(docData, `${docNum}.pdf`);
      toast.success(`${docNum} saved & PDF downloaded!`, { id: toastId });
      setDocNum(getAutoNum(type));
    } catch (err) {
      console.error('PDF error:', err);
      toast.error('PDF generation failed', { id: toastId });
      setHiddenDocData(null);
    } finally {
      setPdfLoading(false);
    }
  };

  /* ── SECONDARY: save to history only (no PDF) ── */
  const handleSaveDraft = () => {
    if (!items.some((i) => i.name.trim())) {
      toast.error('Add at least one item name before saving');
      return;
    }
    const record = {
      id: uid(),
      savedAt: new Date().toISOString(),
      type, docNum, date, reference,
      party: { ...party },
      items: items.map((i) => ({ ...i })),
      notes, grandTotal, hasPrice,
    };
    dispatch(saveLetterhead(record));
    saveNum(type, docNum);
    toast.success(`${cfg.short} ${docNum} saved to history`);
    setDocNum(getAutoNum(type));
  };

  /* ── Download PDF for a history record ── */
  const handlePrintRecord = async (record) => {
    if (pdfLoading) return;
    const recCfg = TYPES[record.type];
    const docData = {
      cfg: recCfg,
      docNum: record.docNum, date: record.date, reference: record.reference,
      party: record.party, items: record.items, notes: record.notes,
      hasPrice: record.hasPrice, grandTotal: record.grandTotal,
    };
    setPdfLoading(true);
    const toastId = toast.loading('Generating PDF…');
    try {
      await capturePdf(docData, `${record.docNum}.pdf`);
      toast.success('PDF downloaded!', { id: toastId });
    } catch (err) {
      console.error('PDF error:', err);
      toast.error('PDF generation failed', { id: toastId });
      setHiddenDocData(null);
    } finally {
      setPdfLoading(false);
    }
  };

  /* ── WhatsApp share ── */
  const handleWhatsApp = (record) => {
    const c = TYPES[record.type];
    const lines = [
      `*SHAH HOUSE*`,
      `_Official Document — ${c.label}_`,
      ``,
      `Doc No: *${record.docNum}*`,
      `Date: ${fmtDate(record.date)}`,
      ...(record.reference ? [`Reference: ${record.reference}`] : []),
      ``,
      `*${c.partyLabel.toUpperCase()}*`,
      ...(record.party.company ? [record.party.company] : []),
      ...(record.party.name ? [`Contact: ${record.party.name}`] : []),
      ...(record.party.phone ? [`Tel: ${record.party.phone}`] : []),
      ...(record.party.email ? [`Email: ${record.party.email}`] : []),
      ``,
      `*Items (${record.items.length}):*`,
      ...record.items.map((it, i) => {
        const t = lineTotal(it);
        return `${i + 1}. ${it.name || '—'} — ${it.qty} ${it.unit}${t > 0 ? ` — AED ${t.toFixed(2)}` : ''}`;
      }),
      ...(record.hasPrice ? [``, `*Grand Total: ${fmtAED(record.grandTotal)}*`] : []),
      ``,
      `_Shah House · Villa Property · Dubai, UAE_`,
      `_Generated via AHMS Property Management_`,
    ];
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  };

  /* ── Delete ── */
  const handleDelete = (id) => {
    dispatch(deleteLetterhead(id));
    if (detailRecord?.id === id) setDetailRecord(null);
    toast.success('Document removed from history');
  };

  /* ── Load record into editor ── */
  const handleLoadRecord = (record) => {
    setType(record.type);
    setDocNum(record.docNum);
    setDate(record.date);
    setReference(record.reference);
    setParty({ ...record.party });
    setItems(record.items.map((i) => ({ ...i })));
    setNotes(record.notes);
    setActiveTab('create');
    setDetailRecord(null);
    toast.success('Document loaded into editor');
  };

  /* ── Derived history stats ── */
  const filtered   = filter === 'all' ? records : records.filter((r) => r.type === filter);
  const totalValue = records.reduce((s, r) => s + (r.grandTotal || 0), 0);
  const grnCount   = records.filter((r) => r.type === 'received').length;
  const issCount   = records.filter((r) => r.type === 'issued').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
      className="space-y-5"
    >

      {/* ── Hidden A4 render div (off-screen, 794px = A4 at 96dpi) ── */}
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
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Letterhead Generator</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">Create, auto-save and download official Shah House documents</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Tab switcher */}
          <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
            {[
              { key: 'create', icon: FileText, label: 'Create New' },
              { key: 'history', icon: Archive, label: 'History', badge: records.length },
            ].map(({ key, icon: Icon, label, badge }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold transition-all',
                  activeTab === key ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
                {badge > 0 && (
                  <span className="ml-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-navy-900 text-white">{badge}</span>
                )}
              </button>
            ))}
          </div>

          {activeTab === 'create' && (
            <>
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold text-slate-600 bg-white border border-slate-200 hover:border-slate-300 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear
              </button>
              <button
                onClick={() => setMobileView((v) => v === 'form' ? 'preview' : 'form')}
                className="lg:hidden flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold text-slate-600 bg-white border border-slate-200 transition-all"
              >
                <Eye className="w-3.5 h-3.5" /> {mobileView === 'form' ? 'Preview' : 'Edit'}
              </button>
              <button
                onClick={handleSaveDraft}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
              >
                <Save className="w-3.5 h-3.5" /> Save Only
              </button>
              <button
                onClick={handleGenerate}
                disabled={pdfLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all shadow-sm disabled:opacity-60"
                style={{ background: pdfLoading ? '#64748b' : 'linear-gradient(135deg, #0b1d3a 0%, #1e3a6e 100%)' }}
              >
                {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {pdfLoading ? 'Generating…' : 'Generate & Download PDF'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          CREATE TAB
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_560px] gap-6 items-start">

          {/* ════ FORM PANEL ════ */}
          <div className={cn('space-y-4', mobileView === 'preview' && 'hidden lg:block')}>

            {/* ── Step 1: Document type ── */}
            <FormSection step="1" title="Document Type">
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(TYPES).map(([key, c]) => (
                  <button
                    key={key}
                    onClick={() => handleTypeChange(key)}
                    className={cn(
                      'flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition-all',
                      type === key
                        ? 'border-navy-700 bg-navy-50 shadow-sm'
                        : 'border-slate-100 hover:border-slate-200 bg-slate-50/50',
                    )}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0"
                        style={{ background: type === key ? c.accent : '#94a3b8' }}
                      >
                        {c.short}
                      </span>
                      <span className={cn('text-[13px] font-bold flex-1', type === key ? 'text-navy-900' : 'text-slate-600')}>
                        {c.label}
                      </span>
                      {type === key && (
                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full text-white" style={{ background: c.accent }}>
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 pl-10">{type === key ? 'Currently selected document type' : 'Click to select'}</p>
                  </button>
                ))}
              </div>
            </FormSection>

            {/* ── Step 2: Document info ── */}
            <FormSection step="2" title="Document Information">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Document Number</label>
                  <div className="relative">
                    <input value={docNum} onChange={(e) => setDocNum(e.target.value)} className={cn(INPUT, 'pr-9 font-bold tracking-wide')} />
                    <button onClick={freshDocNum} title="Generate new number"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-accent-500 transition-colors">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className={LABEL}>Date</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={INPUT} />
                </div>
                <div className="col-span-2">
                  <label className={LABEL}>Reference / PO Number <span className="text-slate-300 font-normal normal-case">(optional)</span></label>
                  <input placeholder="e.g. PO-2026-045" value={reference} onChange={(e) => setReference(e.target.value)} className={INPUT} />
                </div>
              </div>
            </FormSection>

            {/* ── Step 3: Party info ── */}
            <FormSection step="3" title={cfg.partyLabel}>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="flex items-center gap-1 text-[10.5px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      <Building2 className="w-3 h-3" /> Company / Firm
                    </label>
                    <input placeholder="Company or firm name" value={party.company} onChange={(e) => updateParty('company', e.target.value)} className={INPUT} />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-[10.5px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      <User className="w-3 h-3" /> Contact Person
                    </label>
                    <input placeholder="Full name" value={party.name} onChange={(e) => updateParty('name', e.target.value)} className={INPUT} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="flex items-center gap-1 text-[10.5px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      <Phone className="w-3 h-3" /> Phone
                    </label>
                    <input placeholder="+971 55 …" value={party.phone} onChange={(e) => updateParty('phone', e.target.value)} className={INPUT} />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-[10.5px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                      <Mail className="w-3 h-3" /> Email <span className="text-slate-300 normal-case font-normal">(opt.)</span>
                    </label>
                    <input placeholder="email@example.com" value={party.email} onChange={(e) => updateParty('email', e.target.value)} className={INPUT} />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-1 text-[10.5px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                    <MapPin className="w-3 h-3" /> Address <span className="text-slate-300 normal-case font-normal">(opt.)</span>
                  </label>
                  <textarea placeholder="Full address…" rows={2} value={party.address} onChange={(e) => updateParty('address', e.target.value)} className={cn(INPUT, 'resize-none')} />
                </div>
              </div>
            </FormSection>

            {/* ── Step 4: Items ── */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-navy-900 text-white text-[10px] font-black flex items-center justify-center shrink-0">4</span>
                  <div>
                    <p className="text-[13px] font-bold text-slate-800">Materials / Items</p>
                    <p className="text-[11px] text-slate-400">{items.length} item{items.length !== 1 ? 's' : ''} listed</p>
                  </div>
                </div>
                <button onClick={addItem} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-bold text-white bg-navy-900 hover:bg-navy-800 transition-all">
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </button>
              </div>
              <div className="divide-y divide-slate-50">
                {items.map((item, idx) => (
                  <div key={item.id} className="p-4">
                    <div className="flex items-start gap-2 mb-3">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-black flex items-center justify-center shrink-0 mt-2">
                        {idx + 1}
                      </span>
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input placeholder="Material / item name *" value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} className={cn(INPUT, 'font-semibold')} />
                        <input placeholder="Description / spec" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} className={INPUT} />
                      </div>
                      <button onClick={() => removeItem(item.id)}
                        className="w-8 h-8 mt-1 rounded-lg flex items-center justify-center text-slate-200 hover:text-red-400 hover:bg-red-50 transition-all shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pl-8">
                      <div>
                        <label className="text-[9.5px] font-bold text-slate-400 mb-1 block uppercase tracking-wider">Quantity</label>
                        <input type="number" min="0" step="0.01" value={item.qty} onChange={(e) => updateItem(item.id, 'qty', e.target.value)} className={INPUT} />
                      </div>
                      <div>
                        <label className="text-[9.5px] font-bold text-slate-400 mb-1 block uppercase tracking-wider">Unit</label>
                        <select value={item.unit} onChange={(e) => updateItem(item.id, 'unit', e.target.value)} className={cn(INPUT, 'cursor-pointer')}>
                          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9.5px] font-bold text-slate-400 mb-1 block uppercase tracking-wider">Unit Price (AED)</label>
                        <input type="number" min="0" step="0.01" placeholder="0.00 (optional)" value={item.unitPrice} onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)} className={INPUT} />
                      </div>
                    </div>
                    {parseFloat(item.unitPrice) > 0 && (
                      <p className="pl-8 mt-1.5 text-[11px] text-slate-400">
                        Line total: <span className="font-bold text-navy-700">{fmtAED(lineTotal(item))}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {hasPrice && (
                <div className="px-5 py-4 bg-navy-50 border-t border-navy-100 flex justify-end items-center gap-4">
                  <div className="text-right">
                    <p className="text-[10px] font-semibold text-navy-400 mb-0.5 uppercase tracking-wider">Grand Total</p>
                    <p className="text-xl font-black text-navy-900 tracking-tight">{fmtAED(grandTotal)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Step 5: Notes ── */}
            <FormSection step="5" title="Notes / Remarks" optional>
              <textarea
                placeholder="Any notes, conditions, special instructions, payment terms…"
                rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
                className={cn(INPUT, 'resize-none')}
              />
            </FormSection>

            {/* ── Flow tip ── */}
            <div className="flex items-start gap-3 p-4 rounded-2xl border" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%)', borderColor: '#c7d7fc' }}>
              <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-[12px] font-bold text-blue-900 mb-0.5">One-click workflow</p>
                <p className="text-[11.5px] text-blue-700">
                  Click <strong>Generate &amp; Download PDF</strong> to auto-save this document to History and download the PDF instantly.
                  Use <strong>Save Only</strong> to store without downloading.
                </p>
              </div>
            </div>
          </div>

          {/* ════ PREVIEW PANEL ════ */}
          <div className={cn('lg:sticky lg:top-6', mobileView === 'form' && 'hidden lg:block')}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Live Preview</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveDraft}
                  className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <Save className="w-3 h-3" /> Save Only
                </button>
                <span className="w-px h-3.5 bg-slate-200" />
                <button
                  onClick={handleGenerate}
                  disabled={pdfLoading}
                  className="flex items-center gap-1 text-[11px] font-bold text-navy-700 hover:text-navy-900 transition-colors disabled:opacity-50"
                >
                  {pdfLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                  {pdfLoading ? 'Generating…' : 'Download PDF'}
                </button>
              </div>
            </div>
            <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.12)', border: '1px solid #e2e8f0' }}>
              <LetterheadDoc cfg={cfg} docNum={docNum} date={date} reference={reference} party={party} items={items} notes={notes} hasPrice={hasPrice} grandTotal={grandTotal} />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          HISTORY TAB
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div className="space-y-6">

          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Documents" value={records.length} sub="All document types" color="navy" />
            <StatCard label="Goods Received" value={grnCount} sub="GRN documents" color="green" />
            <StatCard label="Material Issued" value={issCount} sub="ISS documents" color="blue" />
            <StatCard label="Total Value" value={fmtAED(totalValue)} sub="Combined across all docs" color="gold" small />
          </div>

          {/* Filter bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Filter:</span>
            {[
              { key: 'all', label: 'All Documents', count: records.length },
              { key: 'received', label: 'GRN — Received', count: grnCount },
              { key: 'issued', label: 'ISS — Issued', count: issCount },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[12px] font-semibold transition-all border',
                  filter === f.key
                    ? 'bg-navy-900 text-white border-navy-900'
                    : 'text-slate-600 bg-white border-slate-200 hover:border-slate-300',
                )}
              >
                {f.label}
                <span className={cn('text-[9px] font-black px-1.5 py-0.5 rounded-full', filter === f.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500')}>
                  {f.count}
                </span>
              </button>
            ))}
            <button
              onClick={() => { setActiveTab('create'); setDocNum(getAutoNum(type)); }}
              className="ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[12px] font-bold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #0b1d3a, #1e3a6e)' }}
            >
              <Plus className="w-3.5 h-3.5" /> New Document
            </button>
          </div>

          {/* Empty state */}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mb-5">
                <Archive className="w-9 h-9 text-slate-300" />
              </div>
              <p className="text-[15px] font-bold text-slate-400 mb-1.5">No documents yet</p>
              <p className="text-[12.5px] text-slate-300 mb-5">
                {filter === 'all'
                  ? 'Create a document and click "Generate & Download PDF" to save it here.'
                  : `No ${TYPES[filter]?.short} documents saved.`}
              </p>
              <button
                onClick={() => setActiveTab('create')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #0b1d3a, #1e3a6e)' }}
              >
                <FileText className="w-4 h-4" /> Create First Document
              </button>
            </div>
          )}

          {/* Cards grid */}
          {filtered.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map((record, i) => (
                <HistoryCard
                  key={record.id}
                  record={record}
                  index={i}
                  onDetail={() => setDetailRecord(record)}
                  onPrint={() => handlePrintRecord(record)}
                  onWhatsApp={() => handleWhatsApp(record)}
                  onDelete={() => handleDelete(record.id)}
                  pdfLoading={pdfLoading}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Detail Modal ── */}
      <AnimatePresence>
        {detailRecord && (
          <DetailModal
            record={detailRecord}
            onClose={() => setDetailRecord(null)}
            onPrint={() => handlePrintRecord(detailRecord)}
            onWhatsApp={() => handleWhatsApp(detailRecord)}
            onDelete={() => handleDelete(detailRecord.id)}
            onLoad={() => handleLoadRecord(detailRecord)}
            pdfLoading={pdfLoading}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FORM SECTION wrapper
═══════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════
   STAT CARD
═══════════════════════════════════════════════════════════ */
function StatCard({ label, value, sub, color, small }) {
  const palettes = {
    navy:  { bg: 'from-[#0b1d3a] to-[#1e3a6e]', text: 'text-white', sub: 'text-blue-200', icon: '#C9A227' },
    green: { bg: 'from-emerald-600 to-emerald-700', text: 'text-white', sub: 'text-emerald-200', icon: '#fff' },
    blue:  { bg: 'from-blue-600 to-blue-700', text: 'text-white', sub: 'text-blue-200', icon: '#fff' },
    gold:  { bg: 'from-amber-500 to-amber-600', text: 'text-white', sub: 'text-amber-100', icon: '#fff' },
  };
  const p = palettes[color];
  return (
    <div className={`bg-gradient-to-br ${p.bg} rounded-2xl p-5 relative overflow-hidden`} style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 translate-x-8 -translate-y-8" style={{ background: 'white' }} />
      <TrendingUp className={`w-4 h-4 mb-3 opacity-60 ${p.text}`} />
      <p className={`${small ? 'text-[17px]' : 'text-[28px]'} font-black ${p.text} leading-none mb-1.5`}>{value}</p>
      <p className={`text-[10px] font-bold ${p.text} opacity-90 uppercase tracking-wider mb-0.5`}>{label}</p>
      <p className={`text-[9.5px] ${p.sub} opacity-80`}>{sub}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   HISTORY CARD — premium document-style design
═══════════════════════════════════════════════════════════ */
function HistoryCard({ record, index, onDetail, onPrint, onWhatsApp, onDelete, pdfLoading }) {
  const cfg       = TYPES[record.type];
  const partyName = record.party.company || record.party.name;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.28 }}
      className="bg-white rounded-2xl overflow-hidden group hover:shadow-xl transition-all duration-300"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid #f1f5f9' }}
    >
      {/* Top accent bar */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${cfg.accent}, ${cfg.accent}99)` }} />

      {/* Document fold corner */}
      <div style={{
        position: 'absolute', top: 4, right: 0,
        borderStyle: 'solid', borderWidth: '0 20px 20px 0',
        borderColor: `transparent ${cfg.accentMid} transparent transparent`,
        zIndex: 1,
      }} />

      {/* Card body */}
      <div className="p-5 relative">
        {/* Row 1: badge + saved date */}
        <div className="flex items-center justify-between mb-3">
          <span
            className="text-[9.5px] font-black px-2.5 py-1 rounded-full text-white tracking-wider"
            style={{ background: cfg.accent, boxShadow: `0 2px 8px ${cfg.accent}44` }}
          >
            {cfg.short}
          </span>
          <span className="text-[10px] text-slate-300 font-medium">{fmtDateShort(record.savedAt)}</span>
        </div>

        {/* Doc number */}
        <p className="text-[18px] font-black text-navy-900 tracking-tight leading-none mb-1">
          {record.docNum}
        </p>
        <p className="text-[11px] text-slate-400 mb-4">
          {cfg.label} &nbsp;·&nbsp; {fmtDate(record.date)}
        </p>

        {/* Party info tinted box */}
        {partyName ? (
          <div className="rounded-xl p-3 mb-4" style={{ background: cfg.accentLight, border: `1px solid ${cfg.accentMid}` }}>
            <p className="text-[12.5px] font-bold text-slate-800 leading-tight mb-1 truncate">{partyName}</p>
            {record.party.name && record.party.company && (
              <p className="text-[10.5px] text-slate-500 mb-0.5">Contact: {record.party.name}</p>
            )}
            {record.party.phone && (
              <p className="text-[10.5px] font-medium" style={{ color: cfg.accent }}>
                Tel: {record.party.phone}
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-xl p-3 mb-4 bg-slate-50 border border-slate-100">
            <p className="text-[11px] text-slate-300 italic">No party specified</p>
          </div>
        )}

        {/* Items + Total */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-black text-white" style={{ background: cfg.accent }}>
              {record.items.length}
            </span>
            <span className="text-[11px] text-slate-500">item{record.items.length !== 1 ? 's' : ''}</span>
          </div>
          {record.hasPrice ? (
            <span className="text-[13.5px] font-black text-navy-900 tracking-tight">{fmtAED(record.grandTotal)}</span>
          ) : (
            <span className="text-[10px] text-slate-300 italic">no pricing</span>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-stretch border-t border-slate-100">
        <button
          onClick={onDetail}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 text-[11.5px] font-bold text-navy-800 hover:bg-navy-50 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" /> View Details
        </button>
        <div className="w-px bg-slate-100" />
        <button
          onClick={onPrint}
          disabled={pdfLoading}
          title="Download PDF"
          className="w-11 flex items-center justify-center text-slate-400 hover:text-navy-700 hover:bg-navy-50 transition-colors disabled:opacity-40"
        >
          {pdfLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={onWhatsApp}
          title="Share on WhatsApp"
          className="w-11 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          title="Delete"
          className="w-11 flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DETAIL MODAL
═══════════════════════════════════════════════════════════ */
function DetailModal({ record, onClose, onPrint, onWhatsApp, onDelete, onLoad, pdfLoading }) {
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
        className="bg-white rounded-2xl overflow-hidden w-full max-w-[700px] my-8 flex flex-col"
        style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.38)', maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-2 h-10 rounded-full shrink-0" style={{ background: cfg.accent }} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full text-white" style={{ background: cfg.accent }}>
                  {cfg.short}
                </span>
                <p className="text-[15px] font-black text-navy-900">{record.docNum}</p>
              </div>
              <p className="text-[11px] text-slate-400">{fmtDate(record.date)}{record.reference ? ` · Ref: ${record.reference}` : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={onLoad} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all">
              Edit & Reuse
            </button>
            <button onClick={onWhatsApp} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white rounded-lg transition-all" style={{ background: '#25D366' }}>
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </button>
            <button
              onClick={onPrint}
              disabled={pdfLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white rounded-lg transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #0b1d3a, #1e3a6e)' }}
            >
              {pdfLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {pdfLoading ? 'Generating…' : 'Download PDF'}
            </button>
            <button onClick={onDelete} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all">
              <X className="w-4 h-4" />
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
            party={record.party}
            items={record.items}
            notes={record.notes}
            hasPrice={record.hasPrice}
            grandTotal={record.grandTotal}
          />
        </div>

        {/* Modal footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50 shrink-0">
          <p className="text-[10.5px] text-slate-400">
            Saved {fmtDateShort(record.savedAt)} &nbsp;·&nbsp; {record.items.length} item{record.items.length !== 1 ? 's' : ''}
            {record.hasPrice ? ` &nbsp;·&nbsp; ${fmtAED(record.grandTotal)}` : ''}
          </p>
          <button onClick={onClose} className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-200">
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   INLINE SVG ICONS (print-safe, no external deps)
═══════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════
   LETTERHEAD DOCUMENT — rendered for preview AND pdf capture
═══════════════════════════════════════════════════════════ */
function LetterheadDoc({ cfg, docNum, date, reference, party, items, notes, hasPrice, grandTotal }) {
  const partyDisplay = party.company || party.name;
  const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
  const accent = cfg.accent;

  const metaFields = [
    { label: 'Document No.', value: docNum || `${cfg.short}-DRAFT` },
    { label: 'Date', value: fmtDate(date) },
    ...(reference ? [{ label: 'Reference / PO', value: reference }] : []),
  ];

  return (
    <div style={{ fontFamily: font, color: '#0f172a', fontSize: 12, background: '#fff' }}>

      {/* ── Header ── */}
      <div style={{ background: 'linear-gradient(145deg, #060f1e 0%, #0b1d3a 48%, #0d2349 100%)', position: 'relative', overflow: 'hidden' }}>

        {/* Gold top accent bar */}
        <div style={{ height: 3.5, background: 'linear-gradient(90deg, #a37818 0%, #C9A227 40%, #e8c84a 65%, #C9A227 100%)' }} />

        {/* "SH" watermark */}
        <div style={{ position: 'absolute', bottom: -18, right: -8, opacity: 0.04, fontSize: 130, fontWeight: 900, color: 'white', letterSpacing: '-0.04em', lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>
          SH
        </div>

        {/* Main content */}
        <div style={{ padding: '22px 28px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>

          {/* Logo + wordmark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 60, height: 60, borderRadius: 16,
              background: 'rgba(255,255,255,0.07)',
              border: '1.5px solid rgba(201,162,39,0.32)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.07)',
            }}>
              <LHIcon size={44} />
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: 900, fontSize: 22, letterSpacing: '0.09em', lineHeight: 1, textTransform: 'uppercase' }}>
                SHAH HOUSE
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, marginTop: 5, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                Premium Villa Property&nbsp; · &nbsp;Dubai, UAE
              </div>
              <div style={{ marginTop: 8, height: 1.5, width: 140, background: 'linear-gradient(90deg, #C9A227 0%, rgba(201,162,39,0.15) 100%)' }} />
            </div>
          </div>

          {/* Document type badge */}
          <div style={{
            borderRadius: 12, flexShrink: 0,
            border: `1.5px solid ${accent}40`,
            borderLeft: `4px solid ${accent}`,
            background: 'rgba(255,255,255,0.055)',
            padding: '13px 20px',
            textAlign: 'right',
            boxShadow: `0 0 24px ${accent}15, inset 0 1px 0 rgba(255,255,255,0.05)`,
          }}>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 7.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.22em', marginBottom: 6 }}>
              Official Document
            </div>
            <div style={{ color: 'white', fontWeight: 800, fontSize: 13.5, lineHeight: 1.35 }}>
              {cfg.label}
            </div>
            <div style={{
              display: 'inline-block', marginTop: 9,
              background: accent, borderRadius: 5,
              padding: '3px 11px',
              color: 'white', fontWeight: 900, fontSize: 11, letterSpacing: '0.1em',
              boxShadow: `0 3px 10px ${accent}55`,
            }}>
              {cfg.short}
            </div>
          </div>
        </div>

        {/* Meta fields bar */}
        <div style={{ margin: '18px 28px 0', padding: '14px 0 22px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexWrap: 'wrap', gap: 0 }}>
          {metaFields.map((f, i) => (
            <div key={f.label} style={{
              paddingRight: 36, marginRight: 36,
              borderRight: i < metaFields.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
            }}>
              <div style={{ color: '#C9A227', fontSize: 7, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 5, opacity: 0.88 }}>
                {f.label}
              </div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: 12.5 }}>{f.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Party section ── */}
      <div style={{ padding: '16px 28px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', borderLeft: `4px solid ${accent}` }}>
        <div style={{ fontSize: 7, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: accent, marginBottom: 9, opacity: 0.88 }}>
          {cfg.partyLabel}
        </div>
        {partyDisplay ? (
          <div>
            {party.company && (
              <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', marginBottom: 4, letterSpacing: '-0.01em' }}>
                {party.company}
              </div>
            )}
            {party.name && (
              <div style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>
                <span style={{ color: '#94a3b8', fontWeight: 600 }}>Contact Person: </span>
                <strong style={{ color: '#475569' }}>{party.name}</strong>
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 28px', marginTop: 2 }}>
              {party.phone   && <div style={{ fontSize: 10.5, color: '#64748b' }}>Tel: {party.phone}</div>}
              {party.email   && <div style={{ fontSize: 10.5, color: '#64748b' }}>Email: {party.email}</div>}
              {party.address && <div style={{ fontSize: 10.5, color: '#64748b' }}>Address: {party.address}</div>}
            </div>
          </div>
        ) : (
          <span style={{ color: '#cbd5e1', fontStyle: 'italic', fontSize: 12 }}>— not specified —</span>
        )}
      </div>

      {/* ── Items table ── */}
      <div style={{ padding: '20px 28px' }}>
        <div style={{ fontSize: 7, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#94a3b8', marginBottom: 11 }}>
          Materials &amp; Items
        </div>
        <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: 'linear-gradient(90deg, #0b1d3a 0%, #0d2449 100%)' }}>
                {['#', 'Material Name', 'Description', 'Qty', 'Unit', ...(hasPrice ? ['Unit Price', 'Total (AED)'] : [])].map((h, i) => (
                  <th key={h} style={{
                    padding: '10px 11px',
                    color: 'rgba(255,255,255,0.80)', fontWeight: 700, fontSize: 8,
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    textAlign: i === 0 ? 'center' : (hasPrice && i >= 5 ? 'right' : i >= 3 ? 'center' : 'left'),
                    ...(i === 0 ? { width: 30 } : {}),
                    borderBottom: `2px solid ${accent}55`,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc' }}>
                  <td style={{ padding: '9px 11px', textAlign: 'center', color: '#94a3b8', fontWeight: 700, fontSize: 10, borderBottom: '1px solid #f1f5f9' }}>{i + 1}</td>
                  <td style={{ padding: '9px 11px', fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #f1f5f9', fontSize: 11.5 }}>
                    {item.name || <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>—</span>}
                  </td>
                  <td style={{ padding: '9px 11px', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>{item.description || '—'}</td>
                  <td style={{ padding: '9px 11px', textAlign: 'center', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #f1f5f9' }}>{item.qty}</td>
                  <td style={{ padding: '9px 11px', textAlign: 'center', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>{item.unit}</td>
                  {hasPrice && (
                    <td style={{ padding: '9px 11px', textAlign: 'right', color: '#475569', borderBottom: '1px solid #f1f5f9', fontVariantNumeric: 'tabular-nums' }}>
                      {item.unitPrice ? fmtAED(item.unitPrice) : <span style={{ color: '#e2e8f0' }}>—</span>}
                    </td>
                  )}
                  {hasPrice && (
                    <td style={{ padding: '9px 11px', textAlign: 'right', fontWeight: 800, color: '#0b1d3a', borderBottom: '1px solid #f1f5f9', fontVariantNumeric: 'tabular-nums' }}>
                      {item.unitPrice ? fmtAED(lineTotal(item)) : <span style={{ color: '#e2e8f0' }}>—</span>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {hasPrice && (
              <tfoot>
                <tr style={{ background: 'linear-gradient(90deg, #eef1f8, #e8eef7)' }}>
                  <td colSpan={5} style={{ borderTop: '2px solid #0b1d3a' }} />
                  <td style={{ padding: '12px 11px', fontWeight: 700, fontSize: 10.5, color: '#334155', borderTop: '2px solid #0b1d3a', textAlign: 'right' }}>Grand Total</td>
                  <td style={{ padding: '12px 11px', textAlign: 'right', fontWeight: 900, fontSize: 15.5, color: '#0b1d3a', borderTop: '2px solid #0b1d3a', fontVariantNumeric: 'tabular-nums' }}>
                    {fmtAED(grandTotal)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ── Notes ── */}
      {notes && (
        <div style={{ margin: '0 28px 20px', padding: '14px 18px', background: '#fffbeb', border: '1px solid #fde68a', borderLeft: '4px solid #d97706', borderRadius: 10 }}>
          <div style={{ fontSize: 7, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#92400e', marginBottom: 7 }}>
            Remarks / Notes
          </div>
          <div style={{ fontSize: 11.5, color: '#78350f', lineHeight: 1.75 }}>{notes}</div>
        </div>
      )}

      {/* ── Signatures ── */}
      <div style={{ padding: '22px 28px 26px', borderTop: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
        {[
          { title: cfg.actionLabel,  sub: 'Shah House — Authorized Signatory' },
          { title: cfg.otherLabel,   sub: party.company || party.name || 'Counterparty' },
        ].map((sig, i) => (
          <div key={i}>
            <div style={{ fontWeight: 800, fontSize: 11.5, color: '#0f172a', marginBottom: 2 }}>{sig.title}</div>
            <div style={{ fontSize: 9.5, color: '#94a3b8', marginBottom: 16 }}>{sig.sub}</div>
            <div style={{ borderTop: '1.5px solid #cbd5e1', marginBottom: 16 }} />
            {['Name:', 'Date:', 'Sign:'].map((label) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 10, color: '#94a3b8', width: 38, flexShrink: 0 }}>{label}</span>
                <div style={{ flex: 1, borderBottom: '1px solid #e2e8f0' }} />
              </div>
            ))}
            <div style={{ marginTop: 14, height: 50, borderRadius: 8, border: '1.5px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafbfc' }}>
              <span style={{ color: '#d1d5db', fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Official Stamp</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Footer ── */}
      <div style={{ background: '#0b1d3a', padding: '12px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LHIconTiny size={16} />
          <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 8.5 }}>
            Shah House &nbsp;·&nbsp; Villa Property &nbsp;·&nbsp; Dubai, UAE &nbsp;·&nbsp; Confidential
          </span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 8.5, whiteSpace: 'nowrap' }}>
          AHMS &nbsp;·&nbsp; {new Date().toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </div>
    </div>
  );
}
