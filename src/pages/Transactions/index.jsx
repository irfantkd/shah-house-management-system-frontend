import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  RiWalletLine, RiCarLine, RiHome4Line, RiBuildingLine, RiBankCardLine,
  RiArrowDownLine, RiArrowUpLine, RiSearchLine, RiCloseLine,
  RiReceiptLine, RiFileTextLine, RiTeamLine,
  RiArrowLeftLine, RiArrowRightLine, RiAlertLine, RiAddLine,
  RiArrowDownCircleLine, RiStore2Line, RiCheckboxCircleLine, RiCalendar2Line,
} from 'react-icons/ri';
import DatePicker from '../../components/ui/DatePicker';
import { useGetQuery, usePostMutation } from '../../api/apiSlice';
import { selectCurrentPropertyId, selectCurrentProperty } from '../../store/slices/propertiesSlice';
import Modal  from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { cn } from '../../utils/cn';

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt     = (n) => Number(n || 0).toLocaleString('en-AE', { maximumFractionDigits: 0 });
const fmtAED  = (n) => `AED ${fmt(n)}`;
const fmtDate = (d) => d
  ? new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })
  : '—';

// ─── Config ─────────────────────────────────────────────────────────────────

const WALLET_CFG = {
  vehicle:  { label: 'Vehicle Wallet', short: 'Vehicle',  Icon: RiCarLine,      color: '#0b1d3a', bg: '#eef2fb', grad: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' },
  home:     { label: 'Home Wallet',    short: 'Home',     Icon: RiHome4Line,    color: '#16a34a', bg: '#f0fdf4', grad: 'linear-gradient(135deg,#14532d,#16a34a)' },
  property: { label: 'Property Wallet',short: 'Property', Icon: RiBuildingLine, color: '#0891b2', bg: '#ecfeff', grad: 'linear-gradient(135deg,#0e7490,#0891b2)' },
  salary:   { label: 'Salary Wallet',  short: 'Salary',   Icon: RiBankCardLine, color: '#7c3aed', bg: '#f5f3ff', grad: 'linear-gradient(135deg,#4c1d95,#7c3aed)' },
};

const TABS = [
  { id: 'money',     label: 'All Money',  Icon: RiWalletLine   },
  { id: 'expenses',  label: 'Expenses',   Icon: RiReceiptLine  },
  { id: 'contracts', label: 'Contracts',  Icon: RiFileTextLine },
  { id: 'salaries',  label: 'Salaries',   Icon: RiTeamLine     },
];

const PERIODS = [
  { k: 'all',    l: 'All Time'   },
  { k: 'week',   l: 'This Week'  },
  { k: 'month',  l: 'This Month' },
  { k: 'lastm',  l: 'Last Month' },
  { k: '3month', l: '3 Months'   },
  { k: 'year',   l: 'This Year'  },
  { k: 'custom', l: 'Custom'     },
];

const BLANK_DEP = {
  wallet: 'vehicle',
  amount: '',
  note:   '',
  date:   new Date().toISOString().split('T')[0],
};

// ─── Shared UI ──────────────────────────────────────────────────────────────

function PeriodBar({ value, onChange, customFrom = '', customTo = '', onCustomFromChange, onCustomToChange }) {
  const today    = new Date().toISOString().split('T')[0];
  const hasRange = customFrom || customTo;
  const dayCount = customFrom && customTo
    ? Math.max(0, Math.round((new Date(customTo) - new Date(customFrom)) / 86400000) + 1)
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none', paddingBottom: '2px' }}>
        {PERIODS.map(({ k, l }) => {
          const active   = value === k;
          const isCustom = k === 'custom';
          return (
            <button key={k}
              onClick={() => {
                onChange(k);
                if (k !== 'custom' && onCustomFromChange) { onCustomFromChange(''); onCustomToChange(''); }
              }}
              className={cn(
                'shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-bold transition-all border whitespace-nowrap',
                active
                  ? 'text-white border-transparent shadow-md'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700',
              )}
              style={active ? { background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' } : {}}>
              {isCustom && <RiCalendar2Line className="w-3.5 h-3.5 shrink-0" />}
              {l}
              {isCustom && hasRange && active && <span className="ml-0.5 w-2 h-2 rounded-full bg-blue-300 shrink-0" />}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {value === 'custom' && onCustomFromChange && (
          <motion.div key="custom-date"
            initial={{ opacity: 0, y: -6, scaleY: 0.96 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -6, scaleY: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{ transformOrigin: 'top' }}>
            <div className="bg-white rounded-2xl border border-slate-100 p-4"
              style={{ boxShadow: '0 2px 12px rgba(11,29,58,0.07)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg,#eff6ff,#ecfeff)' }}>
                    <RiCalendar2Line className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-slate-800 leading-none">Custom Date Range</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Filter by a specific period</p>
                  </div>
                </div>
                {hasRange && (
                  <button onClick={() => { onCustomFromChange(''); onCustomToChange(''); }}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                    <RiCloseLine className="w-3.5 h-3.5" /> Clear
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Start Date</label>
                  <div className="relative">
                    <RiCalendar2Line className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none z-10"
                      style={{ color: customFrom ? '#2563eb' : '#94a3b8' }} />
                    <input type="date" value={customFrom}
                      max={customTo || today}
                      onChange={(e) => onCustomFromChange(e.target.value)}
                      className="w-full h-10 pl-8 pr-2 rounded-xl border text-[12px] outline-none transition-all"
                      style={{
                        borderColor: customFrom ? '#93c5fd' : '#e2e8f0',
                        background:  customFrom ? '#eff6ff' : '#fff',
                        color:       customFrom ? '#1d4ed8' : '#374151',
                        fontWeight:  customFrom ? '600' : '400',
                      }} />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">End Date</label>
                  <div className="relative">
                    <RiCalendar2Line className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none z-10"
                      style={{ color: customTo ? '#2563eb' : '#94a3b8' }} />
                    <input type="date" value={customTo}
                      min={customFrom || undefined}
                      max={today}
                      onChange={(e) => onCustomToChange(e.target.value)}
                      className="w-full h-10 pl-8 pr-2 rounded-xl border text-[12px] outline-none transition-all"
                      style={{
                        borderColor: customTo ? '#93c5fd' : '#e2e8f0',
                        background:  customTo ? '#eff6ff' : '#fff',
                        color:       customTo ? '#1d4ed8' : '#374151',
                        fontWeight:  customTo ? '600' : '400',
                      }} />
                  </div>
                </div>
              </div>
              {hasRange ? (
                <div className="mt-2.5 flex items-center justify-between gap-2 px-3 py-2 rounded-xl"
                  style={{ background: 'linear-gradient(135deg,#eff6ff,#ecfeff)', border: '1px solid #bfdbfe' }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    <span className="text-[11px] font-semibold text-slate-700 truncate">
                      {customFrom ? fmtDate(customFrom) : 'Any start'} → {customTo ? fmtDate(customTo) : 'Today'}
                    </span>
                  </div>
                  {dayCount !== null && (
                    <span className="shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-black text-blue-700"
                      style={{ background: '#dbeafe' }}>
                      {dayCount}d
                    </span>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-[10px] text-slate-400 text-center">Select start and end dates to filter</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatRow({ stats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="bg-white rounded-2xl border border-slate-100 px-4 py-3.5"
          style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{s.label}</p>
          <p className="text-[18px] font-black leading-none tabular-nums" style={{ color: s.color ?? '#0b1d3a' }}>
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function MonthHeader({ label, inTotal, outTotal }) {
  return (
    <div className="flex items-center justify-between mb-2 px-0.5">
      <p className="text-[13px] font-bold text-slate-700">{label}</p>
      <div className="flex items-center gap-3 text-[11px] font-bold">
        {inTotal  > 0 && <span className="text-emerald-600">+{fmtAED(inTotal)}</span>}
        {outTotal > 0 && <span className="text-red-500">−{fmtAED(outTotal)}</span>}
      </div>
    </div>
  );
}

function ListCard({ children, fading }) {
  return (
    <div className={cn('bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50 overflow-hidden transition-opacity duration-200',
      fading && 'opacity-50')}
      style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
      {children}
    </div>
  );
}

function TxnRowSkeleton() {
  return (
    <div className="animate-pulse flex items-center gap-3 px-4 py-3.5">
      <div className="w-9 h-9 rounded-xl bg-slate-100 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-slate-100 rounded-full w-3/4" />
        <div className="h-2.5 bg-slate-100 rounded-full w-1/2" />
      </div>
      <div className="text-right space-y-1.5 shrink-0">
        <div className="h-3 bg-slate-100 rounded-full w-20" />
        <div className="h-2.5 bg-slate-100 rounded-full w-14 ml-auto" />
      </div>
    </div>
  );
}

function groupByMonth(items, key = 'date') {
  const map = {};
  items.forEach((item) => {
    const d     = item[key] ? new Date(item[key] + (item[key].length === 10 ? 'T00:00:00' : '')) : new Date();
    const gKey  = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-AE', { month: 'long', year: 'numeric' });
    if (!map[gKey]) map[gKey] = { key: gKey, label, items: [] };
    map[gKey].items.push(item);
  });
  return Object.values(map).sort((a, b) => b.key.localeCompare(a.key));
}

// ─── Skeleton / Error ───────────────────────────────────────────────────────

function TransactionsSkeleton() {
  return (
    <div className="space-y-5 pb-8 animate-pulse">
      <div className="rounded-2xl h-44 bg-navy-800/80" style={{ background: 'linear-gradient(135deg,#0b1d3a,#152d5e)' }} />
      <div className="h-14 rounded-2xl bg-slate-100" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="rounded-2xl h-16 bg-slate-100" />)}
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
        {[...Array(6)].map((_, i) => <TxnRowSkeleton key={i} />)}
      </div>
    </div>
  );
}

function TransactionsError({ message, onRetry }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: '#fef2f2' }}>
        <RiAlertLine className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-lg font-bold text-slate-900">Failed to load transactions</h2>
      <p className="text-sm text-slate-500 max-w-sm">{message}</p>
      <button onClick={onRetry}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white hover:opacity-90 transition-all"
        style={{ background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' }}>
        Try Again
      </button>
    </div>
  );
}

// ─── Pagination bar ──────────────────────────────────────────────────────────

function Pagination({ page, totalPages, total, limit, onChange }) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);
  return (
    <div className="flex items-center justify-between px-1">
      <p className="text-[12px] text-slate-400">Showing {from}–{to} of {total}</p>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1}
          className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-all">
          <RiArrowLeftLine className="w-3.5 h-3.5" />
        </button>
        <span className="text-[12px] font-semibold text-slate-600 min-w-15 text-center">
          {page} / {totalPages}
        </span>
        <button onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}
          className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-all">
          <RiArrowRightLine className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 1 — All Money (server-side filtering + pagination)
// ─────────────────────────────────────────────────────────────────────────────

const TXN_LIMIT = 30;

function AllMoneyTab({ propertyId, txnVersion }) {
  const [period,    setPeriod]    = useState('month');
  const [customFrom,setCustomFrom]= useState('');
  const [customTo,  setCustomTo]  = useState('');
  const [walletF,   setWalletF]   = useState('all');
  const [typeF,     setTypeF]     = useState('all');
  const [search,    setSearch]    = useState('');
  const [searchIn,  setSearchIn]  = useState('');
  const [page,      setPage]      = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchIn); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchIn]);

  useEffect(() => { setPage(1); }, [period, walletF, typeF, customFrom, customTo]);

  const params = useMemo(() => ({
    propertyId,
    ...(period !== 'all' && period !== 'custom' && { period }),
    ...(period === 'custom' && customFrom && { startDate: customFrom }),
    ...(period === 'custom' && customTo   && { endDate:   customTo   }),
    ...(walletF !== 'all' && { walletType: walletF }),
    ...(typeF === 'in'    && { txnType: 'credit' }),
    ...(typeF === 'out'   && { txnType: 'debit'  }),
    ...(search.trim()     && { search: search.trim() }),
    page,
    limit: TXN_LIMIT,
  }), [propertyId, period, customFrom, customTo, walletF, typeF, search, page]);

  const { data: result = {}, isLoading, isFetching, refetch: refetchTxns } = useGetQuery(
    { path: '/wallet/transactions', params },
    { skip: !propertyId },
  );

  // Refresh when parent signals a mutation happened (deposit / expense added)
  useEffect(() => {
    if (txnVersion > 0) refetchTxns();
  }, [txnVersion]);

  const txns       = result.items ?? [];
  const stats      = result.stats ?? { totalIn: 0, totalOut: 0, net: 0 };
  const totalPages = result.pages ?? 1;
  const totalItems = result.total ?? 0;

  const groups = useMemo(() => groupByMonth(txns), [txns]);

  const netPositive = stats.net >= 0;
  const netDisplay  = stats.net < 0
    ? `−${fmtAED(Math.abs(stats.net))}`
    : fmtAED(stats.net);

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      {isFetching && !isLoading && (
        <div className="fixed top-0 left-0 right-0 z-9999 h-0.75 overflow-hidden">
          <div className="h-full w-full" style={{ background: 'linear-gradient(90deg,#0b1d3a 0%,#1e3a6e 40%,#0891b2 70%,#0b1d3a 100%)', backgroundSize: '200% 100%', animation: 'slide 1.5s linear infinite' }} />
        </div>
      )}
      {/* Stats — always computed server-side for the full filtered dataset */}
      <div className={cn('grid grid-cols-2 sm:grid-cols-4 gap-3 transition-opacity duration-200', isFetching && !isLoading && 'opacity-60')}>
        {[
          { label: 'Money In',     value: isLoading ? '…' : `+${fmtAED(stats.totalIn)}`,  color: '#16a34a' },
          { label: 'Money Out',    value: isLoading ? '…' : `−${fmtAED(stats.totalOut)}`, color: '#dc2626' },
          { label: 'Net Balance',  value: isLoading ? '…' : netDisplay,                   color: netPositive ? '#16a34a' : '#dc2626' },
          { label: 'Transactions', value: isLoading ? '…' : totalItems,                   color: '#0b1d3a' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 px-4 py-3.5"
            style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{s.label}</p>
            <p className="text-[18px] font-black leading-none tabular-nums" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3"
        style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        <PeriodBar
          value={period}
          onChange={(v) => { setPeriod(v); if (v !== 'custom') { setCustomFrom(''); setCustomTo(''); } }}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
        />
        <div className="flex flex-wrap gap-2 items-center">
          {/* Wallet filter */}
          <div className="flex bg-slate-50 border border-slate-100 rounded-xl p-1 gap-0.5">
            {['all', 'vehicle', 'home', 'property', 'salary'].map((k) => (
              <button key={k} onClick={() => setWalletF(k)}
                className={cn('px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-all',
                  walletF === k ? 'text-white' : 'text-slate-500 hover:text-slate-700')}
                style={walletF === k ? { background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' } : {}}>
                {k === 'all' ? 'All' : WALLET_CFG[k].short}
              </button>
            ))}
          </div>
          {/* Type filter */}
          <div className="flex bg-slate-50 border border-slate-100 rounded-xl p-1 gap-0.5">
            {[['all', 'All'], ['in', 'In ↓'], ['out', 'Out ↑']].map(([k, l]) => (
              <button key={k} onClick={() => setTypeF(k)}
                className={cn('px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all',
                  typeF === k ? 'text-white' : 'text-slate-500 hover:text-slate-700')}
                style={typeF === k ? { background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' } : {}}>
                {l}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="relative flex-1 min-w-40">
            <RiSearchLine className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
            <input value={searchIn} onChange={(e) => setSearchIn(e.target.value)}
              placeholder="Search description, category…"
              className="w-full h-8.5 pl-8 pr-7 rounded-xl border border-slate-200 text-[12px] text-slate-700 placeholder:text-slate-400 bg-slate-50 focus:outline-none focus:border-blue-400 transition-colors" />
            {searchIn && (
              <button onClick={() => { setSearchIn(''); setSearch(''); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                <RiCloseLine className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50 overflow-hidden">
          {[...Array(8)].map((_, i) => <TxnRowSkeleton key={i} />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-100">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <RiWalletLine className="w-7 h-7 text-slate-300" />
          </div>
          <p className="font-semibold text-slate-400 text-[14px]">No transactions found</p>
          <p className="text-slate-300 text-[12px] mt-1">Adjust your filters or use Deposit to add funds.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const gIn  = group.items.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
            const gOut = group.items.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
            return (
              <div key={group.key}>
                <MonthHeader label={group.label} inTotal={gIn} outTotal={gOut} />
                <ListCard fading={isFetching && !isLoading}>
                  {group.items.map((txn) => {
                    const wCfg = WALLET_CFG[txn.walletType] ?? WALLET_CFG.vehicle;
                    const WIcon = wCfg.Icon;
                    const isIn  = txn.type === 'credit';
                    return (
                      <div key={txn.id ?? txn._id}
                        className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/60 transition-colors">
                        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                          isIn ? 'bg-emerald-50' : 'bg-red-50')}>
                          {isIn
                            ? <RiArrowDownLine className="w-4 h-4 text-emerald-600" />
                            : <RiArrowUpLine   className="w-4 h-4 text-red-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-slate-800 truncate leading-tight">
                            {isIn
                              ? (txn.note || txn.description || 'Deposit')
                              : (txn.description || txn.category || 'Expense')}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: wCfg.bg, color: wCfg.color }}>
                              <WIcon className="w-2.5 h-2.5" />
                              {wCfg.short}
                            </span>
                            {txn.category && txn.category !== 'Deposit' && (
                              <span className="text-[10px] text-slate-400">{txn.category}</span>
                            )}
                            <span className="text-slate-200">·</span>
                            <span className="text-[10px] text-slate-400">{fmtDate(txn.date)}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={cn('text-[15px] font-black tabular-nums',
                            isIn ? 'text-emerald-600' : 'text-red-500')}>
                            {isIn ? '+' : '−'}{fmtAED(txn.amount)}
                          </p>
                          {txn.balanceAfter != null && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Bal {fmtAED(txn.balanceAfter)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </ListCard>
              </div>
            );
          })}
        </div>
      )}

      <Pagination
        page={page} totalPages={totalPages} total={totalItems}
        limit={TXN_LIMIT} onChange={setPage}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2 — Expenses (server-side filtering, category colours from backend)
// ─────────────────────────────────────────────────────────────────────────────

const EXP_LIMIT = 20;

function HouseExpensesTab({ propertyId, walletMap, refetchWallet, txnVersion, onMutated }) {
  const [period,    setPeriod]    = useState('month');
  const [customFrom,setCustomFrom]= useState('');
  const [customTo,  setCustomTo]  = useState('');
  const [catF,      setCatF]      = useState('all');
  const [search,    setSearch]    = useState('');
  const [searchIn,  setSearchIn]  = useState('');
  const [page,      setPage]      = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchIn); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchIn]);
  useEffect(() => { setPage(1); }, [period, catF, customFrom, customTo]);

  // Categories for colour lookup + dropdown
  const { data: allCats = [] } = useGetQuery(
    { path: '/expense-categories', params: { propertyId } },
    { skip: !propertyId },
  );
  const catMap = useMemo(() => {
    const m = {};
    allCats.forEach((c) => { m[c.name] = { color: c.color, bg: c.bg }; });
    return m;
  }, [allCats]);

  const params = useMemo(() => ({
    propertyId,
    ...(period !== 'all' && period !== 'custom' && { period }),
    ...(period === 'custom' && customFrom && { startDate: customFrom }),
    ...(period === 'custom' && customTo   && { endDate:   customTo   }),
    ...(catF !== 'all' && { category: catF }),
    ...(search.trim() && { search: search.trim() }),
    page,
    limit: EXP_LIMIT,
  }), [propertyId, period, customFrom, customTo, catF, search, page]);

  const { data: expResult = {}, isLoading: expLoading, isFetching: expFetching, refetch: refetchExp } = useGetQuery(
    { path: '/expenses', params },
    { skip: !propertyId },
  );

  // Refresh when parent signals a mutation (deposit or external change)
  useEffect(() => {
    if (txnVersion > 0) refetchExp();
  }, [txnVersion]);

  const expenses   = expResult.items   ?? [];
  const totalRows  = expResult.total   ?? 0;
  const totalPages = expResult.pages   ?? 1;

  // totalSpent comes from the server's full-filter aggregate via /expenses/stats;
  // here we show the page-visible total and rely on totalRows for the record count
  const totalSpent = useMemo(
    () => expenses.reduce((s, e) => s + (e.amount ?? 0), 0),
    [expenses],
  );

  const groups = useMemo(() => groupByMonth(expenses), [expenses]);

  // ── Add expense modal ──────────────────────────────────────────────────────
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    category: '', description: '', vendor: '', amount: '',
    walletType: 'home', date: new Date().toISOString().split('T')[0],
  });
  const setA = (k, v) => setAddForm((f) => ({ ...f, [k]: v }));

  const [addMut]    = usePostMutation();
  const [deductMut] = usePostMutation();
  const [addingExp, setAddingExp] = useState(false);

  // Segment categories for the selected segment
  const { data: segCats = [] } = useGetQuery(
    { path: '/expense-categories', params: { propertyId } },
    { skip: !propertyId || !showAdd },
  );

  // Pre-select first category when modal opens
  useEffect(() => {
    if (showAdd && segCats.length > 0 && !addForm.category) {
      setA('category', segCats[0].name);
    }
  }, [showAdd, segCats]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const amt = Number(addForm.amount);
    if (!addForm.description || !amt) return toast.error('Fill all required fields');
    setAddingExp(true);
    try {
      const segment = addForm.walletType === 'property' ? 'property' : 'household';
      const result = await addMut({
        path: '/expenses',
        body: {
          propertyId,
          category:    addForm.category,
          description: addForm.description,
          vendor:      addForm.vendor,
          amount:      amt,
          walletType:  addForm.walletType,
          date:        addForm.date,
          segment,
        },
      }).unwrap();
      const sourceId = result.id ?? '';
      await deductMut({
        path: '/wallet/deduct',
        body: {
          propertyId,
          walletType:  addForm.walletType,
          amount:      amt,
          description: addForm.description,
          date:        addForm.date,
          category:    addForm.category,
          sourceId,
          sourceModel: 'Expense',
        },
      }).unwrap();
      setPage(1);
      await Promise.all([refetchWallet(), refetchExp()]);
      onMutated?.();
      toast.success(`AED ${fmt(amt)} expense logged`);
      setShowAdd(false);
      setAddForm({ category: '', description: '', vendor: '', amount: '', walletType: 'home', date: new Date().toISOString().split('T')[0] });
    } catch (err) {
      toast.error(err?.data?.error ?? 'Failed to log expense');
    } finally {
      setAddingExp(false);
    }
  };

  const watchedWallet = addForm.walletType;
  const watchedAmount = parseFloat(addForm.amount) || 0;
  const walletBalance = walletMap[watchedWallet]?.balance ?? 0;
  const afterBalance  = walletBalance - watchedAmount;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className={cn('flex gap-3 transition-opacity duration-200', expFetching && !expLoading && 'opacity-60')}>
          <div className="bg-white rounded-2xl border border-slate-100 px-4 py-3.5" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Page Spent</p>
            <p className="text-[18px] font-black leading-none tabular-nums text-red-500">−{fmtAED(totalSpent)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 px-4 py-3.5" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Total Records</p>
            <p className="text-[18px] font-black leading-none tabular-nums text-navy-900">{totalRows}</p>
          </div>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-[12px] font-bold hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' }}>
          <RiAddLine className="w-4 h-4" /> Add Expense
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3"
        style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        <PeriodBar
          value={period}
          onChange={(v) => { setPeriod(v); if (v !== 'custom') { setCustomFrom(''); setCustomTo(''); } }}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
        />
        <div className="flex flex-wrap gap-2 items-center">
          <select value={catF} onChange={(e) => setCatF(e.target.value)}
            className="h-8.5 pl-3 pr-7 rounded-xl border border-slate-200 text-[12px] text-slate-700 bg-slate-50 focus:outline-none focus:border-blue-400 cursor-pointer appearance-none">
            <option value="all">All Categories</option>
            {allCats.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <div className="relative flex-1 min-w-40">
            <RiSearchLine className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
            <input value={searchIn} onChange={(e) => setSearchIn(e.target.value)} placeholder="Search expenses…"
              className="w-full h-8.5 pl-8 pr-7 rounded-xl border border-slate-200 text-[12px] text-slate-700 placeholder:text-slate-400 bg-slate-50 focus:outline-none focus:border-blue-400 transition-colors" />
            {searchIn && (
              <button onClick={() => { setSearchIn(''); setSearch(''); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                <RiCloseLine className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      {expLoading ? (
        <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50 overflow-hidden">
          {[...Array(6)].map((_, i) => <TxnRowSkeleton key={i} />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-100">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <RiReceiptLine className="w-7 h-7 text-slate-300" />
          </div>
          <p className="font-semibold text-slate-400 text-[14px]">No expenses found</p>
          <p className="text-slate-300 text-[12px] mt-1">Adjust filters or log a new expense.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const gTotal = group.items.reduce((s, e) => s + (e.amount ?? 0), 0);
            return (
              <div key={group.key}>
                <div className="flex items-center justify-between mb-2 px-0.5">
                  <p className="text-[13px] font-bold text-slate-700">{group.label}</p>
                  <span className="text-[11px] font-bold text-red-500">−{fmtAED(gTotal)}</span>
                </div>
                <ListCard fading={expFetching && !expLoading}>
                  {group.items.map((exp) => {
                    const cfg     = catMap[exp.category] ?? { color: '#64748b', bg: '#f1f5f9' };
                    const wCfg    = WALLET_CFG[exp.walletType];
                    return (
                      <div key={exp.id ?? exp._id}
                        className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/60 transition-colors">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: cfg.bg }}>
                          <RiReceiptLine className="w-4 h-4" style={{ color: cfg.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-slate-800 truncate leading-tight">
                            {exp.description}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: cfg.bg, color: cfg.color }}>
                              {exp.category}
                            </span>
                            {wCfg && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                style={{ background: wCfg.bg, color: wCfg.color }}>
                                <wCfg.Icon className="w-2.5 h-2.5" />
                                {wCfg.short}
                              </span>
                            )}
                            {exp.vendor && (
                              <>
                                <span className="text-slate-200">·</span>
                                <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                  <RiStore2Line className="w-2.5 h-2.5" />
                                  {exp.vendor}
                                </span>
                              </>
                            )}
                            <span className="text-slate-200">·</span>
                            <span className="text-[10px] text-slate-400">{fmtDate(exp.date)}</span>
                          </div>
                        </div>
                        <p className="text-[15px] font-black text-red-500 tabular-nums shrink-0">
                          −{fmtAED(exp.amount)}
                        </p>
                      </div>
                    );
                  })}
                </ListCard>
              </div>
            );
          })}
        </div>
      )}

      <Pagination
        page={page} totalPages={totalPages} total={totalRows}
        limit={EXP_LIMIT} onChange={setPage}
      />

      {/* Add Expense Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Log Expense" subtitle="Deducts from the selected wallet" size="md">
        <form onSubmit={handleAddExpense} className="space-y-4">
          {/* Wallet selector */}
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Deduct from Wallet</p>
            <div className="grid grid-cols-3 gap-2">
              {['home', 'property', 'vehicle'].map((k) => {
                const cfg = WALLET_CFG[k];
                const bal = walletMap[k]?.balance ?? 0;
                const sel = addForm.walletType === k;
                return (
                  <button key={k} type="button" onClick={() => setA('walletType', k)}
                    className="flex flex-col gap-0.5 p-3 rounded-xl border-2 text-left transition-all"
                    style={sel ? { borderColor: cfg.color, background: cfg.bg } : { borderColor: '#e2e8f0', background: '#f8fafc' }}>
                    <span className="text-[11px] font-bold" style={{ color: sel ? cfg.color : '#64748b' }}>{cfg.short}</span>
                    <span className="text-[14px] font-black tabular-nums" style={{ color: sel ? cfg.color : '#94a3b8' }}>
                      {fmtAED(bal)}
                    </span>
                  </button>
                );
              })}
            </div>
            {watchedAmount > 0 && (
              <div className={cn('mt-2 flex items-center justify-between px-4 py-2.5 rounded-xl border text-[12px]',
                afterBalance < 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100')}>
                <span className="text-slate-500">Balance after</span>
                <span className={cn('font-black', afterBalance < 0 ? 'text-red-600' : 'text-emerald-700')}>
                  {afterBalance < 0 ? `−${fmtAED(Math.abs(afterBalance))}` : fmtAED(afterBalance)}
                </span>
              </div>
            )}
          </div>

          {/* Category */}
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Category *</p>
            <select value={addForm.category} onChange={(e) => setA('category', e.target.value)}
              className="w-full h-10 pl-3 pr-8 rounded-xl border border-slate-200 text-[13px] text-slate-800 focus:outline-none focus:border-blue-400 bg-white appearance-none cursor-pointer">
              {segCats.length === 0
                ? <option value="">Loading…</option>
                : segCats.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          {/* Description */}
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Description *</p>
            <input value={addForm.description} onChange={(e) => setA('description', e.target.value)} required
              placeholder="e.g. Monthly grocery shop"
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] text-slate-800 focus:outline-none focus:border-blue-400" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Amount (AED) *</p>
              <input type="number" min="0.01" step="0.01" value={addForm.amount}
                onChange={(e) => setA('amount', e.target.value)} required placeholder="0.00"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] text-slate-800 focus:outline-none focus:border-blue-400" />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Date</p>
              <DatePicker value={addForm.date} onChange={(v) => setA('date', v)}
                className="w-full rounded-xl border border-slate-200 bg-white text-[13px] text-slate-800 outline-none focus:ring-2 focus:ring-accent-400 focus:border-accent-400 transition-all h-10 px-3.5" />
            </div>
          </div>

          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Vendor</p>
            <input value={addForm.vendor} onChange={(e) => setA('vendor', e.target.value)}
              placeholder="e.g. Carrefour, LuLu Hypermarket"
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] text-slate-800 focus:outline-none focus:border-blue-400" />
          </div>

          <div className="flex justify-end gap-2.5 pt-1 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" icon={RiAddLine} loading={addingExp}>Log Expense</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 3 — Contracts
// ─────────────────────────────────────────────────────────────────────────────

function ContractsTab({ contracts }) {
  const [period,    setPeriod]    = useState('all');
  const [customFrom,setCustomFrom]= useState('');
  const [customTo,  setCustomTo]  = useState('');
  const [search,    setSearch]    = useState('');

  const allPayments = useMemo(() => {
    return contracts.flatMap((c) =>
      (c.paymentHistory ?? []).map((p, i) => ({
        ...p,
        _rowId:           `${c._id ?? c.id}-${i}`,
        contractTitle:    c.title ?? c.name ?? 'Contract',
        contractCategory: c.category ?? '',
        contractId:       c._id ?? c.id,
      }))
    ).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [contracts]);

  const filtered = useMemo(() => {
    let list = allPayments;
    if (period !== 'all') {
      const now   = new Date();
      const today = now.toISOString().split('T')[0];
      let pStart  = null;
      let pEnd    = today;
      if (period === 'week')   { const s = new Date(now); s.setDate(now.getDate() - 7); pStart = s.toISOString().split('T')[0]; }
      if (period === 'month')  { pStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]; }
      if (period === 'lastm')  { const s = new Date(now.getFullYear(), now.getMonth() - 1, 1); const e = new Date(now.getFullYear(), now.getMonth(), 0); pStart = s.toISOString().split('T')[0]; pEnd = e.toISOString().split('T')[0]; }
      if (period === '3month') { const s = new Date(now); s.setMonth(now.getMonth() - 3); pStart = s.toISOString().split('T')[0]; }
      if (period === 'year')   { pStart = `${now.getFullYear()}-01-01`; }
      if (period === 'custom') { pStart = customFrom || null; pEnd = customTo || today; }
      if (pStart) list = list.filter((p) => (p.date ?? '') >= pStart && (p.date ?? '') <= pEnd);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.contractTitle.toLowerCase().includes(q) || (p.note ?? '').toLowerCase().includes(q));
    }
    return list;
  }, [allPayments, period, search, customFrom, customTo]);

  const totalPaid = filtered.reduce((s, p) => s + (p.amount ?? 0), 0);
  const groups    = useMemo(() => groupByMonth(filtered), [filtered]);

  return (
    <div className="space-y-4">
      <StatRow stats={[
        { label: 'Total Paid', value: fmtAED(totalPaid), color: '#dc2626'  },
        { label: 'Payments',   value: filtered.length,   color: '#0b1d3a'  },
        { label: 'Contracts',  value: contracts.length,  color: '#7c3aed'  },
      ]} />

      <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3"
        style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        <PeriodBar
          value={period}
          onChange={(v) => { setPeriod(v); if (v !== 'custom') { setCustomFrom(''); setCustomTo(''); } }}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
        />
        <div className="relative max-w-sm">
          <RiSearchLine className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contracts…"
            className="w-full h-8.5 pl-8 pr-7 rounded-xl border border-slate-200 text-[12px] text-slate-700 placeholder:text-slate-400 bg-slate-50 focus:outline-none focus:border-blue-400 transition-colors" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
              <RiCloseLine className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-100">
          <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
            <RiFileTextLine className="w-7 h-7 text-violet-300" />
          </div>
          <p className="font-semibold text-slate-400 text-[14px]">No contract payments found</p>
          <p className="text-slate-300 text-[12px] mt-1">Record a payment from the Contracts page.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const gTotal = group.items.reduce((s, p) => s + (p.amount ?? 0), 0);
            return (
              <div key={group.key}>
                <div className="flex items-center justify-between mb-2 px-0.5">
                  <p className="text-[13px] font-bold text-slate-700">{group.label}</p>
                  <span className="text-[11px] font-bold text-red-500">−{fmtAED(gTotal)}</span>
                </div>
                <ListCard>
                  {group.items.map((p) => (
                    <div key={p._rowId} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/60 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                        <RiFileTextLine className="w-4 h-4 text-violet-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-800 truncate leading-tight">{p.contractTitle}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {p.contractCategory && (
                            <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600">
                              {p.contractCategory}
                            </span>
                          )}
                          {p.walletType && WALLET_CFG[p.walletType] && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: WALLET_CFG[p.walletType].bg, color: WALLET_CFG[p.walletType].color }}>
                              {WALLET_CFG[p.walletType].short}
                            </span>
                          )}
                          {p.note && <span className="text-[10px] text-slate-400 truncate max-w-35">{p.note}</span>}
                          <span className="text-slate-200">·</span>
                          <span className="text-[10px] text-slate-400">{fmtDate(p.date)}</span>
                        </div>
                      </div>
                      <p className="text-[15px] font-black text-red-500 tabular-nums shrink-0">
                        −{fmtAED(p.amount)}
                      </p>
                    </div>
                  ))}
                </ListCard>
              </div>
            );
          })}
        </div>
      )}

      {contracts.length > 0 && (
        <div>
          <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-3">Per-Contract Summary</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {contracts.map((c) => {
              const paid = (c.paymentHistory ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);
              return (
                <Link key={c._id ?? c.id} to={`/contracts/${c._id ?? c.id}`}
                  className="bg-white rounded-2xl border border-slate-100 p-4 hover:border-slate-200 hover:shadow-sm transition-all group"
                  style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-[13px] font-bold text-slate-800 truncate group-hover:text-blue-700 transition-colors">
                      {c.title ?? c.name}
                    </p>
                    {c.status && (
                      <span className={cn('shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold',
                        c.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                        {c.status}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-slate-400">{(c.paymentHistory ?? []).length} payments</span>
                    <span className="font-bold text-slate-700">{fmtAED(paid)} paid</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 4 — Salaries
// ─────────────────────────────────────────────────────────────────────────────

function SalariesTab({ employees }) {
  const [period,    setPeriod]    = useState('month');
  const [customFrom,setCustomFrom]= useState('');
  const [customTo,  setCustomTo]  = useState('');
  const [search,    setSearch]    = useState('');

  const allPayments = useMemo(() => {
    return employees.flatMap((emp) =>
      (emp.salaryHistory ?? []).map((s, i) => ({
        ...s,
        _rowId:       `${emp._id ?? emp.id}-${i}`,
        employeeName: emp.name ?? 'Employee',
        employeeRole: emp.role ?? emp.position ?? '',
        paidOnKey:    s.paidOn ?? s.date ?? '',
      }))
    ).sort((a, b) => new Date(b.paidOnKey) - new Date(a.paidOnKey));
  }, [employees]);

  const filtered = useMemo(() => {
    let list = allPayments;
    if (period !== 'all') {
      const now   = new Date();
      const today = now.toISOString().split('T')[0];
      let pStart  = null;
      let pEnd    = today;
      if (period === 'week')   { const s = new Date(now); s.setDate(now.getDate() - 7); pStart = s.toISOString().split('T')[0]; }
      if (period === 'month')  { pStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]; }
      if (period === 'lastm')  { const s = new Date(now.getFullYear(), now.getMonth() - 1, 1); const e = new Date(now.getFullYear(), now.getMonth(), 0); pStart = s.toISOString().split('T')[0]; pEnd = e.toISOString().split('T')[0]; }
      if (period === '3month') { const s = new Date(now); s.setMonth(now.getMonth() - 3); pStart = s.toISOString().split('T')[0]; }
      if (period === 'year')   { pStart = `${now.getFullYear()}-01-01`; }
      if (period === 'custom') { pStart = customFrom || null; pEnd = customTo || today; }
      if (pStart) list = list.filter((p) => (p.paidOnKey ?? '') >= pStart && (p.paidOnKey ?? '') <= pEnd);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.employeeName.toLowerCase().includes(q) || (s.employeeRole ?? '').toLowerCase().includes(q));
    }
    return list;
  }, [allPayments, period, search, customFrom, customTo]);

  const totalPaid = filtered.reduce((s, p) => s + (p.amount ?? 0), 0);
  const groups    = useMemo(() => groupByMonth(filtered, 'paidOnKey'), [filtered]);

  return (
    <div className="space-y-4">
      <StatRow stats={[
        { label: 'Total Paid', value: fmtAED(totalPaid), color: '#7c3aed' },
        { label: 'Payments',   value: filtered.length,   color: '#0b1d3a' },
        { label: 'Employees',  value: employees.length,  color: '#0b1d3a' },
      ]} />

      <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3"
        style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        <PeriodBar
          value={period}
          onChange={(v) => { setPeriod(v); if (v !== 'custom') { setCustomFrom(''); setCustomTo(''); } }}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
        />
        <div className="relative max-w-sm">
          <RiSearchLine className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employees…"
            className="w-full h-8.5 pl-8 pr-7 rounded-xl border border-slate-200 text-[12px] text-slate-700 placeholder:text-slate-400 bg-slate-50 focus:outline-none focus:border-blue-400 transition-colors" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
              <RiCloseLine className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-100">
          <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
            <RiTeamLine className="w-7 h-7 text-violet-300" />
          </div>
          <p className="font-semibold text-slate-400 text-[14px]">No salary payments found</p>
          <p className="text-slate-300 text-[12px] mt-1">Pay an employee from the Employees page to see records.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const gTotal = group.items.reduce((s, p) => s + (p.amount ?? 0), 0);
            return (
              <div key={group.key}>
                <div className="flex items-center justify-between mb-2 px-0.5">
                  <p className="text-[13px] font-bold text-slate-700">{group.label}</p>
                  <span className="text-[11px] font-bold text-violet-600">−{fmtAED(gTotal)}</span>
                </div>
                <ListCard>
                  {group.items.map((s) => {
                    const isBonus     = s.type === 'bonus';
                    const isDeduction = s.type === 'deduction';
                    return (
                      <div key={s._rowId} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/60 transition-colors">
                        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                          isBonus ? 'bg-emerald-50' : isDeduction ? 'bg-red-50' : 'bg-violet-50')}>
                          <RiTeamLine className={cn('w-4 h-4',
                            isBonus ? 'text-emerald-600' : isDeduction ? 'text-red-500' : 'text-violet-600')} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-slate-800 truncate leading-tight">{s.employeeName}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {s.employeeRole && <span className="text-[10px] text-slate-400">{s.employeeRole}</span>}
                            <span className={cn('inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize',
                              isBonus ? 'bg-emerald-50 text-emerald-700' : isDeduction ? 'bg-red-50 text-red-600' : 'bg-violet-50 text-violet-700')}>
                              {s.type ?? 'salary'}
                            </span>
                            {s.month && <span className="text-[10px] text-slate-400">{s.month}</span>}
                            {s.wallet && WALLET_CFG[s.wallet] && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                style={{ background: WALLET_CFG[s.wallet].bg, color: WALLET_CFG[s.wallet].color }}>
                                {WALLET_CFG[s.wallet].short}
                              </span>
                            )}
                            <span className="text-slate-200">·</span>
                            <span className="text-[10px] text-slate-400">{fmtDate(s.paidOnKey)}</span>
                          </div>
                        </div>
                        <p className={cn('text-[15px] font-black tabular-nums shrink-0',
                          isBonus ? 'text-emerald-600' : 'text-violet-700')}>
                          {isBonus ? '+' : '−'}{fmtAED(s.amount)}
                        </p>
                      </div>
                    );
                  })}
                </ListCard>
              </div>
            );
          })}
        </div>
      )}

      {employees.length > 0 && (
        <div>
          <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-3">Per-Employee Summary</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {employees.map((emp) => {
              const totalEmpPaid = (emp.salaryHistory ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);
              return (
                <Link key={emp._id ?? emp.id} to={`/employees/${emp._id ?? emp.id}`}
                  className="bg-white rounded-2xl border border-slate-100 p-4 hover:border-slate-200 hover:shadow-sm transition-all group"
                  style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                      <RiTeamLine className="w-4 h-4 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-slate-800 truncate group-hover:text-violet-700 transition-colors">{emp.name}</p>
                      {(emp.role ?? emp.position) && <p className="text-[11px] text-slate-400">{emp.role ?? emp.position}</p>}
                    </div>
                    {emp.salary && (
                      <p className="text-[12px] font-bold text-slate-500 shrink-0">{fmtAED(emp.salary)}/mo</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[12px] border-t border-slate-50 pt-2 mt-1">
                    <span className="text-slate-400">{(emp.salaryHistory ?? []).length} payments</span>
                    <span className="font-bold text-violet-700">{fmtAED(totalEmpPaid)} total</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const propertyId = useSelector(selectCurrentPropertyId);
  const property   = useSelector(selectCurrentProperty);

  // Wallet balances — gates the whole page
  const {
    data: walletData, isLoading: walletLoading, isError: walletError, error: walletErr,
    refetch: refetchWallet,
  } = useGetQuery(
    { path: '/wallet', params: { propertyId } },
    { skip: !propertyId },
  );

  // This-month stats for the header strip — lightweight (stats only, limit:1 fetches 1 item but aggregates all)
  const { data: monthResult, refetch: refetchMonthStats } = useGetQuery(
    { path: '/wallet/transactions', params: { propertyId, period: 'month', limit: 1 } },
    { skip: !propertyId },
  );
  const monthStats = monthResult?.stats ?? { totalIn: 0, totalOut: 0, net: 0 };

  // Contracts & employees — small lists, fetched for the tab data
  const { data: contracts = [] } = useGetQuery({ path: '/contracts',  params: { propertyId } }, { skip: !propertyId });
  const { data: employees = [] } = useGetQuery({ path: '/employees',  params: { propertyId } }, { skip: !propertyId });

  const EMPTY_W   = { balance: 0, totalDeposited: 0 };
  const walletMap = {
    vehicle:  { ...EMPTY_W, ...walletData?.vehicle  },
    home:     { ...EMPTY_W, ...walletData?.home     },
    property: { ...EMPTY_W, ...walletData?.property },
    salary:   { ...EMPTY_W, ...walletData?.salary   },
  };

  const [tab,     setTab]     = useState('money');
  const [showDep, setShowDep] = useState(false);
  const [depForm, setDepForm] = useState(BLANK_DEP);
  const [depositing, setDepositing] = useState(false);
  const setD = (k, v) => setDepForm((f) => ({ ...f, [k]: v }));

  // Version counter — incremented after any mutation; child tabs listen to refetch
  const [txnVersion, setTxnVersion] = useState(0);
  const bumpTxnVersion = () => setTxnVersion((v) => v + 1);

  const [depositMut] = usePostMutation();

  const handleDeposit = async (e) => {
    e.preventDefault();
    const amt = Number(depForm.amount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    setDepositing(true);
    try {
      await depositMut({
        path: '/wallet/deposit',
        body: { propertyId, walletType: depForm.wallet, amount: amt, description: depForm.note || 'Deposit', date: depForm.date },
      }).unwrap();
      // Refresh wallet chips + header strip stats + the transaction list in AllMoneyTab
      await Promise.all([refetchWallet(), refetchMonthStats()]);
      bumpTxnVersion();
      toast.success(`+${fmtAED(amt)} added to ${WALLET_CFG[depForm.wallet].label}`);
      setShowDep(false);
      setDepForm(BLANK_DEP);
    } catch (err) {
      toast.error(err?.data?.error ?? 'Deposit failed');
    } finally {
      setDepositing(false);
    }
  };

  // Called by HouseExpensesTab after logging an expense
  const handleExpenseMutated = async () => {
    await Promise.all([refetchMonthStats()]);
    bumpTxnVersion();
  };

  if (walletLoading || !propertyId) return <TransactionsSkeleton />;
  if (walletError) return (
    <TransactionsError
      message={walletErr?.data?.message ?? 'Could not load wallet data. Please try again.'}
      onRetry={refetchWallet}
    />
  );

  return (
    <div className="space-y-5 pb-8">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg,#0b1d3a 0%,#152d5e 100%)', boxShadow: '0 4px 24px rgba(11,29,58,0.25)' }}>
          <div className="px-5 pt-5 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <RiBankCardLine className="w-4 h-4 text-white" />
                  </div>
                  <h1 className="text-[22px] font-black text-white tracking-tight">Transactions</h1>
                </div>
                {property && (
                  <p className="text-[11px] font-semibold text-white/35 pl-10">
                    {property.name} · All financial flows in one place
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setShowDep(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-[12px] font-bold hover:bg-emerald-400 transition-colors">
                  <RiArrowDownCircleLine className="w-3.5 h-3.5" /> Deposit
                </button>
                <button onClick={() => setTab('expenses')}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white text-[12px] font-bold hover:bg-white/15 transition-colors">
                  <RiAddLine className="w-3.5 h-3.5" /> Log Expense
                </button>
              </div>
            </div>

            {/* Wallet balance chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(WALLET_CFG).map(([key, cfg]) => {
                const w   = walletMap[key];
                const bal = w.balance ?? 0;
                const neg = bal < 0;
                const { Icon } = cfg;
                return (
                  <Link key={key} to={`/wallet/${key}`}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: neg ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.12)' }}>
                      <Icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest truncate">{cfg.short}</p>
                      <p className={cn('text-[13px] font-black leading-tight tabular-nums truncate',
                        neg ? 'text-red-300' : 'text-white')}>
                        {neg ? `−${fmtAED(Math.abs(bal))}` : fmtAED(bal)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* This-month strip */}
          <div className="border-t border-white/8 bg-black/10 px-5 py-3 grid grid-cols-3 gap-4">
            {[
              { label: 'In this month',  value: `+${fmtAED(monthStats.totalIn)}`,  color: '#4ade80' },
              { label: 'Out this month', value: `−${fmtAED(monthStats.totalOut)}`, color: '#f87171' },
              { label: 'Net this month', value: monthStats.net < 0 ? `−${fmtAED(Math.abs(monthStats.net))}` : `+${fmtAED(monthStats.net)}`, color: monthStats.net >= 0 ? '#4ade80' : '#f87171' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-0.5">{s.label}</p>
                <p className="text-[14px] font-black tabular-nums" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Tab Bar ───────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-white border border-slate-100 rounded-2xl p-1.5 overflow-x-auto"
        style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        {TABS.map((t) => {
          const { Icon } = t;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all whitespace-nowrap flex-1 justify-center',
                active ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50')}
              style={active ? { background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' } : {}}>
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ───────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          {tab === 'money'     && <AllMoneyTab     propertyId={propertyId} txnVersion={txnVersion} />}
          {tab === 'expenses'  && <HouseExpensesTab propertyId={propertyId} walletMap={walletMap} refetchWallet={refetchWallet} txnVersion={txnVersion} onMutated={handleExpenseMutated} />}
          {tab === 'contracts' && <ContractsTab    contracts={contracts} />}
          {tab === 'salaries'  && <SalariesTab     employees={employees} />}
        </motion.div>
      </AnimatePresence>

      {/* ── Deposit Modal ─────────────────────────────────────────────── */}
      <Modal open={showDep} onClose={() => setShowDep(false)} title="Deposit Funds" subtitle="Add money to a wallet" size="sm">
        <form onSubmit={handleDeposit} className="space-y-4">
          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Select Wallet</p>
            <div className="grid grid-cols-2 gap-2">
              {['vehicle', 'home', 'property'].map((k) => {
                const cfg = WALLET_CFG[k];
                const { Icon } = cfg;
                const bal = walletMap[k]?.balance ?? 0;
                const sel = depForm.wallet === k;
                return (
                  <button key={k} type="button" onClick={() => setD('wallet', k)}
                    className="flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all"
                    style={{ borderColor: sel ? cfg.color : '#e2e8f0', background: sel ? cfg.bg : '#f8fafc' }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: sel ? cfg.color : '#e2e8f0' }}>
                      <Icon className="w-4 h-4" style={{ color: sel ? '#fff' : '#64748b' }} />
                    </div>
                    <div>
                      <p className="text-[12px] font-bold" style={{ color: sel ? cfg.color : '#475569' }}>{cfg.short}</p>
                      <p className="text-[11px] tabular-nums" style={{ color: sel ? cfg.color : '#94a3b8' }}>{fmtAED(bal)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Amount (AED) *</p>
            <input value={depForm.amount} onChange={(e) => setD('amount', e.target.value)}
              type="number" min="1" step="0.01" required placeholder="e.g. 10,000"
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] text-slate-800 focus:outline-none focus:border-blue-400" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Date</p>
              <DatePicker value={depForm.date} onChange={(v) => setD('date', v)}
                className="w-full rounded-xl border border-slate-200 bg-white text-[13px] text-slate-800 outline-none focus:ring-2 focus:ring-accent-400 focus:border-accent-400 transition-all h-10 px-3.5" />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Note / Source</p>
              <input value={depForm.note} onChange={(e) => setD('note', e.target.value)}
                placeholder="From Mr. Shah"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] text-slate-800 focus:outline-none focus:border-blue-400" />
            </div>
          </div>

          {Number(depForm.amount) > 0 && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
              <RiCheckboxCircleLine className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="flex-1">
                <p className="text-[11px] text-emerald-600">To {WALLET_CFG[depForm.wallet].label}</p>
                <p className="text-[20px] font-black text-emerald-700 tabular-nums">+{fmtAED(Number(depForm.amount))}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-slate-400">New balance</p>
                <p className="text-[13px] font-black text-emerald-700 tabular-nums">
                  {fmtAED((walletMap[depForm.wallet]?.balance ?? 0) + Number(depForm.amount || 0))}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-1 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setShowDep(false)}>Cancel</Button>
            <Button type="submit" icon={RiArrowDownCircleLine} loading={depositing}>Deposit</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
