import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useForm, Controller } from 'react-hook-form';
import DatePicker from '../../components/ui/DatePicker';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  RiAddLine, RiSearchLine, RiCalendar2Line, RiArrowLeftLine, RiArrowRightLine,
  RiEditLine, RiDeleteBinLine, RiWalletLine, RiHome4Line, RiShoppingCart2Line,
  RiFilter3Line, RiReceiptLine, RiCheckboxCircleLine, RiCloseLine,
  RiArrowUpLine, RiArrowDownLine, RiStore2Line, RiLeafLine,
} from 'react-icons/ri';
import {
  useGetQuery, usePostMutation, usePutMutation, useDeleteMutation,
} from '../../api/apiSlice';
import { selectCurrentPropertyId } from '../../store/slices/propertiesSlice';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { MotionSwipeableRow } from '../../components/ui/SwipeableRow';
import {
  Field, Input, Select, Textarea, FormGrid, FormActions,
} from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import { cn } from '../../utils/cn';

// ── Color presets for custom category picker ──────────────────────────────────
const COLOR_PRESETS = [
  { color: '#9333ea', bg: '#f5f3ff' },
  { color: '#2563eb', bg: '#eff6ff' },
  { color: '#16a34a', bg: '#f0fdf4' },
  { color: '#0891b2', bg: '#ecfeff' },
  { color: '#dc2626', bg: '#fef2f2' },
  { color: '#ea580c', bg: '#fff7ed' },
  { color: '#ca8a04', bg: '#fefce8' },
  { color: '#e11d48', bg: '#ffe4e6' },
  { color: '#7c3aed', bg: '#ede9fe' },
  { color: '#059669', bg: '#d1fae5' },
  { color: '#0b1d3a', bg: '#eef2fb' },
  { color: '#64748b', bg: '#f1f5f9' },
];

// Look up color/bg from the live backend category list; fallback to slate
const catCfgFrom = (cats, name) =>
  cats.find((c) => c.name === name) ?? { color: '#64748b', bg: '#f1f5f9' };

const SEG_CFG = {
  property:  { label: 'Property & Services', color: '#2563eb', bg: '#eff6ff', Icon: RiHome4Line },
  household: { label: 'Household & Daily',   color: '#16a34a', bg: '#f0fdf4', Icon: RiShoppingCart2Line },
};

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function fmtAED(n) {
  return `AED ${(n ?? 0).toLocaleString('en-AE', { maximumFractionDigits: 0 })}`;
}
function fmtDate(s) {
  if (!s) return '—';
  return new Date(s + 'T00:00:00').toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' });
}

const PAGE_SIZE = 10;

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function ExpensesPage() {
  const propertyId = useSelector(selectCurrentPropertyId);
  const now = new Date();

  // ── Filter state (all sent to backend) ────────────────────────────────────
  const [year,        setYear]        = useState(now.getFullYear());
  const [month,       setMonth]       = useState(now.getMonth());
  const [segment,     setSegment]     = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [search,      setSearch]      = useState('');
  const [page,        setPage]        = useState(1);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [modal,     setModal]     = useState(null); // null | 'add' | expense obj
  const [delTarget, setDelTarget] = useState(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [year, month, segment]);

  // ── API params ────────────────────────────────────────────────────────────
  const baseParams = {
    propertyId,
    year,
    month,
  };
  const listParams = {
    ...baseParams,
    ...(segment !== 'all' && { segment }),
    ...(search && { search }),
    page,
    limit: PAGE_SIZE,
  };

  const { data: listResult = {} } = useGetQuery(
    { path: '/expenses', params: listParams },
    { skip: !propertyId },
  );
  const expenses  = listResult.items  ?? [];
  const totalRows = listResult.total  ?? 0;
  const totalPages = listResult.pages ?? 1;

  const { data: stats = {} } = useGetQuery(
    { path: '/expenses/stats', params: baseParams },
    { skip: !propertyId },
  );

  const { data: walletData, refetch: refetchWallet } = useGetQuery(
    { path: '/wallet', params: { propertyId } },
    { skip: !propertyId },
  );
  const homeBalance     = walletData?.home?.balance     ?? 0;
  const vehicleBalance  = walletData?.vehicle?.balance  ?? 0;
  const propertyBalance = walletData?.property?.balance ?? 0;

  // All categories for this property (color lookup in rows + breakdown chart)
  const { data: allCats = [] } = useGetQuery(
    { path: '/expense-categories', params: { propertyId } },
    { skip: !propertyId },
  );

  const [addMut]    = usePostMutation();
  const [updateMut] = usePutMutation();
  const [deleteMut] = useDeleteMutation();
  const [deductMut] = usePostMutation();

  // ── Month navigation ──────────────────────────────────────────────────────
  const prevMonth = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  };
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  // ── Category breakdown (only for current month, all segments) ─────────────
  const catBreakdown = useMemo(() => {
    if (!stats.byCategory) return [];
    return stats.byCategory.map((c) => ({
      ...c,
      cfg: catCfgFrom(allCats, c.category),
      pct: stats.total > 0 ? Math.round((c.amount / stats.total) * 100) : 0,
    }));
  }, [stats, allCats]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSave = async (data) => {
    try {
      if (modal !== 'add' && modal?.id) {
        await updateMut({ path: `/expenses/${modal.id}`, body: data }).unwrap();
        await refetchWallet();
        toast.success('Expense updated');
      } else {
        // Create expense first to get its id, then link the wallet transaction via sourceId
        const result = await addMut({ path: '/expenses', body: { ...data, propertyId } }).unwrap();
        const sourceId = result.data?.id ?? '';
        if (Number(data.amount) > 0) {
          await deductMut({
            path: '/wallet/deduct',
            body: {
              propertyId,
              walletType: data.walletType ?? 'home',
              amount: Number(data.amount),
              description: data.description,
              date: data.date,
              category: data.category,
              sourceId,
              sourceModel: 'Expense',
            },
          }).unwrap();
          await refetchWallet();
        }
        toast.success('Expense logged');
      }
      setModal(null);
    } catch (err) {
      toast.error(err?.data?.error ?? 'Failed to save expense');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMut({ path: `/expenses/${delTarget.id}` }).unwrap();
      await refetchWallet();
      toast.success('Expense deleted');
      setDelTarget(null);
    } catch {
      toast.error('Failed to delete');
    }
  };

  // ── Stat cards ────────────────────────────────────────────────────────────
  const statCards = [
    {
      label: 'Total Spending',
      value: fmtAED(stats.total),
      sub: `${stats.count ?? 0} transactions`,
      color: '#0b1d3a',
      grad: 'linear-gradient(135deg, #0b1d3a, #1e3a6e)',
      light: false,
    },
    {
      label: 'Property & Services',
      value: fmtAED(stats.property),
      sub: stats.total > 0 ? `${Math.round(((stats.property ?? 0) / stats.total) * 100)}% of total` : '0%',
      color: '#2563eb',
      bg: '#eff6ff',
      light: true,
    },
    {
      label: 'Household & Daily',
      value: fmtAED(stats.household),
      sub: stats.total > 0 ? `${Math.round(((stats.household ?? 0) / stats.total) * 100)}% of total` : '0%',
      color: '#16a34a',
      bg: '#f0fdf4',
      light: true,
    },
  ];

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #0b1d3a, #1e3a6e)' }}>
              <RiReceiptLine className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Expenses</h1>
          </div>
          <p className="text-slate-400 text-[13px]">Property services, household & daily spending</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Wallet balances */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
            <RiWalletLine className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-[12px] font-bold text-emerald-700">{fmtAED(homeBalance)}</span>
            <span className="text-[10px] text-emerald-500 hidden sm:inline">Home</span>
          </div>

          {/* Month picker */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl px-1 py-1">
            <button onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
              <RiArrowLeftLine className="w-4 h-4 text-slate-500" />
            </button>
            <span className="text-[13px] font-bold text-slate-800 min-w-27.5 text-center">
              {MONTH_NAMES[month]} {year}
            </span>
            <button onClick={nextMonth} disabled={isCurrentMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-30">
              <RiArrowRightLine className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          <Button variant="primary" icon={RiAddLine} onClick={() => setModal('add')}>Log Expense</Button>
        </div>
      </motion.div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((s, i) => (
          <motion.div key={s.label}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            {s.light ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-5 h-full"
                style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-3" style={{ background: s.bg }}>
                  {s.color === '#2563eb'
                    ? <RiHome4Line className="w-4 h-4" style={{ color: s.color }} />
                    : <RiShoppingCart2Line className="w-4 h-4" style={{ color: s.color }} />}
                </div>
                <p className="text-2xl font-black text-slate-900 leading-none tabular-nums">{s.value}</p>
                <p className="text-[12px] font-semibold mt-1" style={{ color: s.color }}>{s.label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{s.sub}</p>
              </div>
            ) : (
              <div className="rounded-2xl p-5 h-full flex flex-col justify-between"
                style={{ background: s.grad, boxShadow: '0 4px 20px rgba(11,29,58,0.25)' }}>
                <RiReceiptLine className="w-6 h-6 text-blue-300" />
                <div>
                  <p className="text-2xl font-black text-white leading-none tabular-nums mt-3">{s.value}</p>
                  <p className="text-blue-200/70 text-[12px] font-semibold mt-1">{s.label}</p>
                  <p className="text-blue-300/50 text-[11px] mt-0.5">{s.sub}</p>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* ── Spending breakdown (only when there's data) ── */}
      {(stats.total ?? 0) > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <div className="bg-white rounded-2xl border border-slate-100 p-5"
            style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.05)' }}>
            <p className="text-[14px] font-bold text-slate-800 mb-4">
              Breakdown — {MONTH_NAMES[month]} {year}
            </p>

            {/* Stacked bar */}
            <div className="flex rounded-full overflow-hidden h-2.5 mb-5 bg-slate-100">
              {[
                { key: 'property',  color: '#2563eb', amount: stats.property  ?? 0 },
                { key: 'household', color: '#16a34a', amount: stats.household ?? 0 },
              ].filter((s) => s.amount > 0).map((s, idx, arr) => (
                <div key={s.key}
                  style={{ width: `${(s.amount / stats.total) * 100}%`, background: s.color }}
                  className={cn('transition-all duration-700',
                    idx === 0 && 'rounded-l-full',
                    idx === arr.length - 1 && 'rounded-r-full')} />
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Segment bars */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">By Segment</p>
                {Object.entries(SEG_CFG).map(([key, s]) => {
                  const amount = stats[key] ?? 0;
                  const pct    = stats.total > 0 ? (amount / stats.total) * 100 : 0;
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: s.bg }}>
                        <s.Icon className="w-4 h-4" style={{ color: s.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-1">
                          <span className="text-[12px] font-semibold text-slate-700 truncate">{s.label}</span>
                          <span className="text-[10px] text-slate-400 ml-2 shrink-0">{Math.round(pct)}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: s.color }} />
                        </div>
                      </div>
                      <span className="text-[13px] font-bold text-slate-800 shrink-0 min-w-22.5 text-right tabular-nums">
                        {fmtAED(amount)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Top categories */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Top Categories</p>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                  {catBreakdown.slice(0, 8).map((c) => (
                    <div key={c.category} className="flex items-center gap-2.5 py-0.5">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.cfg.color }} />
                      <span className="text-[12px] text-slate-600 flex-1 truncate">{c.category}</span>
                      <span className="text-[10px] text-slate-400 w-8 text-right">{c.pct}%</span>
                      <span className="text-[12px] font-bold text-slate-800 min-w-20 text-right tabular-nums">
                        {fmtAED(c.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Transaction list ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
          style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.05)' }}>

          {/* List header + filters */}
          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div>
                <p className="text-[14px] font-bold text-slate-800">Transactions</p>
                <p className="text-[11px] text-slate-400">{totalRows} records · {MONTH_NAMES[month]} {year}</p>
              </div>
              <div className="sm:ml-auto flex items-center gap-2">
                <Button variant="outline" size="sm" icon={RiAddLine} onClick={() => setModal('add')}>
                  Log Expense
                </Button>
              </div>
            </div>

            {/* Filters row */}
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Search */}
              <div className="relative flex-1 min-w-0">
                <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search description, vendor, category…"
                  className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-[13px] placeholder-slate-400 outline-none transition-all focus:border-navy-400"
                />
                {searchInput && (
                  <button onClick={() => { setSearchInput(''); setSearch(''); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                    <RiCloseLine className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Segment filter */}
              <div className="flex gap-1 p-1 bg-slate-100 rounded-xl shrink-0">
                {[
                  { k: 'all',       l: 'All'       },
                  { k: 'property',  l: 'Property'  },
                  { k: 'household', l: 'Household' },
                ].map(({ k, l }) => (
                  <button key={k} onClick={() => setSegment(k)}
                    className={cn('px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap',
                      segment === k ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700')}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Rows */}
          {expenses.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <RiReceiptLine className="w-7 h-7 text-slate-300" strokeWidth={1.5} />
              </div>
              <p className="font-semibold text-slate-400 text-[14px]">
                {search || segment !== 'all' ? 'No matching expenses' : `No expenses for ${MONTH_NAMES[month]} ${year}`}
              </p>
              <p className="text-slate-300 text-[12px] mt-1">
                {search || segment !== 'all' ? 'Try adjusting your filters.' : 'Log property or household spending to get started.'}
              </p>
              <button onClick={() => setModal('add')}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #0b1d3a, #1e3a6e)' }}>
                <RiAddLine className="w-3.5 h-3.5" /> Log First Expense
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              <AnimatePresence mode="popLayout">
                {expenses.map((item, i) => {
                  const cfg    = catCfgFrom(allCats, item.category);
                  const segCfg = SEG_CFG[item.segment] ?? SEG_CFG.property;
                  const SegIcon = segCfg.Icon;
                  return (
                    <MotionSwipeableRow
                      key={item.id}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ delay: i * 0.02 }}
                      onSwipeRight={() => setModal(item)}
                      onSwipeLeft={() => setDelTarget(item)}
                      leftIcon={<RiEditLine style={{ color: '#2563eb', width: 20, height: 20 }} />}
                      leftLabel="Edit" leftBg="#eff6ff" leftColor="#2563eb"
                      rightIcon={<RiDeleteBinLine style={{ color: '#dc2626', width: 20, height: 20 }} />}
                      rightLabel="Delete" rightBg="#fef2f2" rightColor="#dc2626"
                    >
                      <div className="group flex items-center gap-3.5 px-5 py-3.5 hover:bg-slate-50/70 transition-colors">

                        {/* Category avatar */}
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: cfg.bg }}>
                          <SegIcon className="w-4 h-4" style={{ color: cfg.color }} />
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-slate-800 leading-tight truncate">
                            {item.description}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {item.vendor && (
                              <>
                                <RiStore2Line className="w-3 h-3 text-slate-300 shrink-0" />
                                <span className="text-[11px] text-slate-400 truncate max-w-35">{item.vendor}</span>
                                <span className="text-slate-200 text-[10px]">·</span>
                              </>
                            )}
                            <span className="text-[11px] text-slate-400">{fmtDate(item.date)}</span>
                          </div>
                        </div>

                        {/* Category chip (hidden on mobile) */}
                        <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-xl text-[10px] font-bold shrink-0"
                          style={{ background: cfg.bg, color: cfg.color }}>
                          {item.category}
                        </span>

                        {/* Segment chip */}
                        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold shrink-0"
                          style={{ background: segCfg.bg, color: segCfg.color }}>
                          <segCfg.Icon className="w-3 h-3" />
                          {item.segment === 'property' ? 'Property' : 'Household'}
                        </span>

                        {/* Amount */}
                        <p className="text-[14px] font-bold text-slate-900 shrink-0 tabular-nums">
                          {fmtAED(item.amount)}
                        </p>

                        {/* Actions — desktop only, swipe on mobile */}
                        <div className="hidden sm:flex items-center gap-1 shrink-0">
                          <button onClick={() => setModal(item)} title="Edit expense"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-all">
                            <RiEditLine className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDelTarget(item)} title="Delete expense"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                            <RiDeleteBinLine className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </MotionSwipeableRow>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {/* Footer: total + pagination */}
          {expenses.length > 0 && (
            <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <p className="text-[12px] text-slate-500">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalRows)} of {totalRows}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-bold text-slate-700 mr-3">
                  Page total: {fmtAED(expenses.reduce((s, e) => s + (e.amount ?? 0), 0))}
                </span>
                {totalPages > 1 && (
                  <>
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                      className="w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-all">
                      <RiArrowLeftLine className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[12px] text-slate-500 font-medium">{page} / {totalPages}</span>
                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                      className="w-7 h-7 rounded-lg flex items-center justify-center border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-all">
                      <RiArrowRightLine className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Add / Edit Modal ── */}
      <ExpenseModal
        open={modal !== null}
        item={modal !== 'add' ? modal : null}
        homeBalance={homeBalance}
        vehicleBalance={vehicleBalance}
        propertyBalance={propertyBalance}
        onClose={() => setModal(null)}
        onSave={handleSave}
      />

      {/* ── Delete confirm ── */}
      <ConfirmDialog
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={handleDelete}
        title="Delete Expense"
        message={`Delete "${delTarget?.description}" (${fmtAED(delTarget?.amount)})? The amount will be refunded back to your ${delTarget?.walletType === 'vehicle' ? 'Vehicle' : delTarget?.walletType === 'property' ? 'Property' : 'Home'} Wallet.`}
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ExpenseModal — Add / Edit
// ─────────────────────────────────────────────────────────────────────────────
const LOW_THRESHOLD = 5000;
const DP_CLS = 'w-full rounded-xl border border-slate-200 bg-white text-[13px] text-slate-800 outline-none focus:ring-2 focus:ring-accent-400 focus:border-accent-400 transition-all h-10 px-3.5';
const CUSTOM_SENTINEL = '__custom__';

function ExpenseModal({ open, item, homeBalance, vehicleBalance, propertyBalance, onClose, onSave }) {
  const propertyId = useSelector(selectCurrentPropertyId);

  const {
    register, handleSubmit, reset, watch,
    setValue, control, formState: { isSubmitting, errors },
  } = useForm();

  const [segment,     setSegment]     = useState('property');
  const [showAddCat,  setShowAddCat]  = useState(false);
  const [newCatName,  setNewCatName]  = useState('');
  const [newCatColor, setNewCatColor] = useState(COLOR_PRESETS[0]);
  const [addingCat,   setAddingCat]   = useState(false);

  // ── Fetch categories from backend for this segment ────────────────────────
  const { data: segCats = [], refetch: refetchCats } = useGetQuery(
    { path: '/expense-categories', params: { propertyId, segment } },
    { skip: !propertyId || !open },
  );
  const [createCatMut] = usePostMutation();

  const isEdit = !!item;

  useEffect(() => {
    if (!open) { setShowAddCat(false); setNewCatName(''); return; }
    const seg = item?.segment ?? 'property';
    setSegment(seg);
    setShowAddCat(false);
    setNewCatName('');
    reset(item
      ? {
          category:   item.category,
          description: item.description,
          vendor:      item.vendor ?? '',
          amount:      item.amount,
          date:        item.date,
          walletType:  item.walletType ?? 'home',
          notes:       item.notes ?? '',
        }
      : {
          category:    '',
          description: '',
          vendor:      '',
          amount:      '',
          date:        new Date().toISOString().split('T')[0],
          walletType:  'home',
          notes:       '',
        },
    );
  }, [open, item]);

  // Once segCats load, set default category if form is blank
  useEffect(() => {
    if (!open || isEdit) return;
    const current = watch('category');
    if (!current && segCats.length > 0) setValue('category', segCats[0].name);
  }, [segCats, open, isEdit]);

  const handleSegmentChange = (seg) => {
    setSegment(seg);
    setShowAddCat(false);
    setValue('category', ''); // will get reset when segCats reload
  };

  const handleCategoryChange = (e) => {
    if (e.target.value === CUSTOM_SENTINEL) {
      setShowAddCat(true);
      // keep previous value in the select until custom is saved
    } else {
      setValue('category', e.target.value);
      setShowAddCat(false);
    }
  };

  const handleAddCustomCat = async () => {
    const name = newCatName.trim();
    if (!name) return;
    setAddingCat(true);
    try {
      await createCatMut({
        path: '/expense-categories',
        body: { propertyId, name, segment, color: newCatColor.color, bg: newCatColor.bg },
      }).unwrap();
      await refetchCats();
      setValue('category', name);
      setShowAddCat(false);
      setNewCatName('');
      toast.success(`Category "${name}" added`);
    } catch (err) {
      toast.error(err?.data?.error ?? 'Failed to create category');
    } finally {
      setAddingCat(false);
    }
  };

  const watchedWallet = watch('walletType', 'home');
  const watchedAmount = parseFloat(watch('amount', '0')) || 0;
  const watchedCat    = watch('category', '');
  const balance       = watchedWallet === 'vehicle' ? vehicleBalance : watchedWallet === 'property' ? propertyBalance : homeBalance;
  const after         = balance - watchedAmount;
  const selectedCatCfg = segCats.find((c) => c.name === watchedCat) ?? { color: '#64748b', bg: '#f1f5f9' };

  const onSubmit = async (d) => {
    await onSave({ ...d, segment, amount: parseFloat(d.amount) || 0 });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Edit Expense' : 'Log Expense'}
      subtitle={isEdit ? `Editing: ${item.description}` : 'Record property or household spending'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* ── Segment toggle ── */}
        {!isEdit && (
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
            {Object.entries(SEG_CFG).map(([k, s]) => (
              <button key={k} type="button" onClick={() => handleSegmentChange(k)}
                className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[12px] font-bold transition-all',
                  segment === k ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600')}>
                <s.Icon className="w-3.5 h-3.5" style={{ color: segment === k ? s.color : undefined }} />
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Wallet selector (new expenses only) ── */}
        {!isEdit && (
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Deduct from Wallet</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { k: 'home',     label: 'Home Wallet',     bal: homeBalance,     color: '#16a34a', bg: '#f0fdf4' },
                { k: 'property', label: 'Property Wallet', bal: propertyBalance, color: '#0891b2', bg: '#ecfeff' },
                { k: 'vehicle',  label: 'Vehicle Wallet',  bal: vehicleBalance,  color: '#0b1d3a', bg: '#eef2fb' },
              ].map(({ k, label, bal, color, bg }) => {
                const sel = watchedWallet === k;
                return (
                  <button key={k} type="button" onClick={() => setValue('walletType', k)}
                    className="flex flex-col gap-1 p-3 rounded-xl border-2 text-left transition-all"
                    style={sel ? { borderColor: color, background: bg } : { borderColor: '#e2e8f0', background: '#f8fafc' }}>
                    <span className="text-[11px] font-bold" style={{ color: sel ? color : '#64748b' }}>{label}</span>
                    <span className="text-[15px] font-black" style={{ color: sel ? color : '#94a3b8' }}>{fmtAED(bal)}</span>
                    {sel && <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color }}>Selected ✓</span>}
                  </button>
                );
              })}
            </div>
            {watchedAmount > 0 && (
              <div className={cn('mt-2 flex items-center justify-between px-4 py-2.5 rounded-xl border text-[12px]',
                after < 0 ? 'bg-red-50 border-red-200' : after < LOW_THRESHOLD ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100')}>
                <span className="text-slate-500">{watchedWallet === 'vehicle' ? 'Vehicle' : watchedWallet === 'property' ? 'Property' : 'Home'} wallet after deduction</span>
                <span className={cn('font-black', after < 0 ? 'text-red-600' : after < LOW_THRESHOLD ? 'text-amber-600' : 'text-emerald-700')}>
                  {after < 0 ? `− ${fmtAED(Math.abs(after))}` : fmtAED(after)}
                </span>
              </div>
            )}
            <input type="hidden" {...register('walletType')} />
          </div>
        )}

        {/* ── Category ── */}
        <Field label="Category" required>
          {/* Hidden RHF-controlled value */}
          <input type="hidden" {...register('category', { required: 'Category is required' })} />

          {/* Visual select */}
          <div className="flex gap-2 items-start">
            <div className="flex-1 relative">
              <select
                value={showAddCat ? CUSTOM_SENTINEL : watchedCat}
                onChange={handleCategoryChange}
                className="w-full h-10 pl-3 pr-8 rounded-xl border border-slate-200 text-[13px] text-slate-800 focus:outline-none focus:border-blue-400 bg-white appearance-none cursor-pointer">
                {segCats.map((c) => (
                  <option key={c.id} value={c.name}>{c.isCustom ? `★ ${c.name}` : c.name}</option>
                ))}
                <option value={CUSTOM_SENTINEL}>＋ Add custom category…</option>
              </select>
              {/* colour swatch */}
              {watchedCat && !showAddCat && (
                <span className="absolute right-8 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full pointer-events-none"
                  style={{ background: selectedCatCfg.color }} />
              )}
            </div>
          </div>
          {errors.category && <p className="text-[11px] text-red-500 mt-1">{errors.category.message}</p>}

          {/* ── Inline new category panel ── */}
          <AnimatePresence>
            {showAddCat && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden">
                <div className="mt-2 p-3.5 rounded-xl border border-blue-200 bg-blue-50/60 space-y-3">
                  <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest">New Custom Category</p>

                  {/* Name input */}
                  <input
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomCat(); } }}
                    placeholder="e.g. Landscaping, Gym, Car Wash…"
                    className="w-full h-9 px-3 rounded-lg border border-blue-200 bg-white text-[13px] text-slate-800 placeholder-slate-400 outline-none focus:border-blue-400"
                  />

                  {/* Color picker */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 mb-2">Pick a colour</p>
                    <div className="flex flex-wrap gap-2">
                      {COLOR_PRESETS.map((preset) => (
                        <button key={preset.color} type="button"
                          onClick={() => setNewCatColor(preset)}
                          className="w-6 h-6 rounded-full border-2 transition-all"
                          style={{
                            background: preset.color,
                            borderColor: newCatColor.color === preset.color ? '#1e3a6e' : 'transparent',
                            transform: newCatColor.color === preset.color ? 'scale(1.25)' : 'scale(1)',
                          }}
                        />
                      ))}
                    </div>
                    {/* Preview chip */}
                    <span className="inline-flex items-center mt-2 px-2.5 py-1 rounded-lg text-[11px] font-bold"
                      style={{ background: newCatColor.bg, color: newCatColor.color }}>
                      {newCatName || 'Preview'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button type="button" onClick={handleAddCustomCat} disabled={!newCatName.trim() || addingCat}
                      className="flex-1 h-8 rounded-lg text-[12px] font-bold text-white flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #0b1d3a, #1e3a6e)' }}>
                      {addingCat ? (
                        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                      ) : <RiAddLine className="w-3.5 h-3.5" />}
                      {addingCat ? 'Adding…' : 'Add Category'}
                    </button>
                    <button type="button" onClick={() => { setShowAddCat(false); setNewCatName(''); }}
                      className="px-3 h-8 rounded-lg text-[12px] font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all">
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Field>

        {/* ── Core fields ── */}
        <Field label="Description" required error={errors.description?.message}>
          <Input
            {...register('description', { required: 'Required' })}
            placeholder={segment === 'household' ? 'e.g. Weekly grocery shop at Lulu' : 'e.g. Monthly pool service'}
          />
        </Field>

        <FormGrid>
          <Field label="Amount (AED)" required error={errors.amount?.message}>
            <Input
              {...register('amount', { required: 'Required', min: { value: 0.01, message: 'Must be > 0' } })}
              type="number" min="0.01" step="0.01" placeholder="0.00"
            />
          </Field>
          <Field label="Date" required>
            <Controller name="date" control={control} rules={{ required: true }}
              render={({ field }) => <DatePicker value={field.value ?? ''} onChange={field.onChange} className={DP_CLS} />} />
          </Field>
        </FormGrid>

        <Field label="Vendor / Company">
          <Input
            {...register('vendor')}
            placeholder={segment === 'household' ? 'e.g. Lulu Hypermarket, Carrefour' : 'e.g. Clean Masters LLC'}
          />
        </Field>

        <Field label="Notes">
          <Textarea {...register('notes')} rows={2} placeholder="Invoice number, reference, any observations…" />
        </Field>

        <FormActions
          onCancel={onClose}
          loading={isSubmitting}
          submitLabel={isEdit ? 'Update Expense' : 'Log Expense'}
        />
      </form>
    </Modal>
  );
}
