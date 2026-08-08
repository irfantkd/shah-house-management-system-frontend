import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History, Wrench, CalendarClock, Receipt, Banknote,
  Search, X, TrendingUp, TrendingDown, Building2, MapPin,
  ArrowUpCircle, ArrowDownCircle, ChevronLeft, ChevronRight,
  CheckCircle2, Wallet, LayoutList,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { useGetQuery } from '../../api/apiSlice';
import { selectCurrentPropertyId } from '../../store/slices/propertiesSlice';
import { cn } from '../../utils/cn';

// ── Constants ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 30;

const FILTERS = [
  { key: '',            label: 'All Activity' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'repair',      label: 'Repairs' },
  { key: 'expense',     label: 'Expenses' },
  { key: 'deposit',     label: 'Deposits' },
  { key: 'debit',       label: 'Debits' },
];

const KIND_CFG = {
  maintenance: {
    label:  'Maintenance',
    icon:   CalendarClock,
    strip:  '#3b82f6',
    badge:  { bg: '#eff6ff', text: '#1d4ed8' },
    dot:    { bg: '#dbeafe', border: '#93c5fd' },
  },
  repair: {
    label:  'Repair',
    icon:   Wrench,
    strip:  '#f59e0b',
    badge:  { bg: '#fffbeb', text: '#b45309' },
    dot:    { bg: '#fef3c7', border: '#fcd34d' },
  },
  expense: {
    label:  'Expense',
    icon:   Receipt,
    strip:  '#ef4444',
    badge:  { bg: '#fef2f2', text: '#b91c1c' },
    dot:    { bg: '#fee2e2', border: '#fca5a5' },
  },
  deposit: {
    label:  'Deposit',
    icon:   ArrowUpCircle,
    strip:  '#10b981',
    badge:  { bg: '#ecfdf5', text: '#047857' },
    dot:    { bg: '#d1fae5', border: '#6ee7b7' },
  },
  debit: {
    label:  'Debit',
    icon:   ArrowDownCircle,
    strip:  '#8b5cf6',
    badge:  { bg: '#f5f3ff', text: '#6d28d9' },
    dot:    { bg: '#ede9fe', border: '#c4b5fd' },
  },
};

const WALLET_LABELS = {
  vehicle:  'Vehicle',
  home:     'Home',
  property: 'Property',
  salary:   'Salary',
};

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtDate(str) {
  if (!str) return '—';
  return new Date(str + 'T00:00:00').toLocaleDateString('en-AE', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}
function fmtMonthYear(str) {
  const [y, m] = str.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-AE', {
    month: 'long', year: 'numeric',
  });
}
function fmtAED(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `AED ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `AED ${(v / 1_000).toFixed(1)}K`;
  return `AED ${v.toLocaleString()}`;
}
function fmtAEDFull(n) {
  return `AED ${(Number(n) || 0).toLocaleString('en-AE', { maximumFractionDigits: 0 })}`;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ className }) {
  return <div className={cn('animate-pulse bg-slate-100 rounded-xl', className)} />;
}
function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0,1,2,3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100" style={{ boxShadow:'0 1px 8px rgba(0,0,0,0.05)' }}>
            <Skeleton className="w-10 h-10 mb-4" />
            <Skeleton className="h-7 w-20 mb-2" />
            <Skeleton className="h-3.5 w-28" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {[0,1,2,3,4,5].map((i) => (
          <div key={i} className="flex items-start gap-4">
            <Skeleton className="w-8 h-8 rounded-full shrink-0 mt-0.5" />
            <div className="flex-1 bg-white rounded-2xl border border-slate-100 p-4" style={{ boxShadow:'0 1px 8px rgba(0,0,0,0.05)' }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-16 rounded-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <div className="space-y-1 text-right">
                  <Skeleton className="h-4 w-20 ml-auto" />
                  <Skeleton className="h-3 w-16 ml-auto" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Pagination ─────────────────────────────────────────────────────────────────
function getPagNums(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  if (page <= 4)  return [1, 2, 3, 4, 5, '…', pages];
  if (page >= pages - 3) return [1, '…', pages-4, pages-3, pages-2, pages-1, pages];
  return [1, '…', page-1, page, page+1, '…', pages];
}
function PagBtn({ onClick, disabled, active, children }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={cn('min-w-8 h-8 px-2 rounded-xl text-[12px] font-semibold transition-all border',
        active
          ? 'bg-navy-900 text-white border-navy-900'
          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed')}>
      {children}
    </button>
  );
}
function PaginationBar({ page, pages, total, limit, onPage }) {
  if (pages <= 1) return null;
  const from = (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
      <p className="text-[12px] text-slate-400">
        Showing <span className="font-bold text-slate-600">{from}–{to}</span> of <span className="font-bold text-slate-600">{total}</span> activities
      </p>
      <div className="flex items-center gap-1.5">
        <PagBtn onClick={() => onPage(page - 1)} disabled={page <= 1}><ChevronLeft className="w-4 h-4" /></PagBtn>
        {getPagNums(page, pages).map((n, i) =>
          n === '…'
            ? <span key={`e${i}`} className="text-slate-400 text-[12px] px-1">…</span>
            : <PagBtn key={n} onClick={() => onPage(n)} active={n === page}>{n}</PagBtn>
        )}
        <PagBtn onClick={() => onPage(page + 1)} disabled={page >= pages}><ChevronRight className="w-4 h-4" /></PagBtn>
      </div>
    </div>
  );
}

// ── Timeline Event Card ────────────────────────────────────────────────────────
function EventCard({ event, index }) {
  const cfg = KIND_CFG[event.kind] ?? KIND_CFG.maintenance;
  const Icon = cfg.icon;
  const isCredit = event.kind === 'deposit';
  const isDebit  = event.kind === 'debit';

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.3) }}
      className="flex items-start gap-3 sm:gap-4"
    >
      {/* Timeline dot */}
      <div className="flex flex-col items-center shrink-0 mt-0.5">
        <div className="w-8 h-8 rounded-full flex items-center justify-center relative z-10"
          style={{ background: cfg.dot.bg, border: `2px solid ${cfg.dot.border}` }}>
          <Icon className="w-3.5 h-3.5" style={{ color: cfg.strip }} />
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-100 overflow-hidden hover:border-slate-200 hover:shadow-sm transition-all"
        style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        {/* Colored left strip */}
        <div className="flex">
          <div className="w-1 shrink-0 rounded-l-2xl" style={{ background: cfg.strip }} />
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {/* Badge row */}
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide"
                    style={{ background: cfg.badge.bg, color: cfg.badge.text }}>
                    {cfg.label}
                  </span>
                  {(event.kind === 'maintenance' || event.kind === 'repair') && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" />Completed
                    </span>
                  )}
                  {event.walletType && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-50 text-slate-500 border border-slate-100 flex items-center gap-1">
                      <Wallet className="w-2.5 h-2.5" />{WALLET_LABELS[event.walletType] ?? event.walletType} Wallet
                    </span>
                  )}
                </div>

                {/* Title */}
                <p className="text-[14px] font-bold text-slate-800 leading-tight truncate">{event.title}</p>

                {/* Meta row */}
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                  {(event.asset || event.area) && (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {[event.asset, event.area].filter(Boolean).join(' · ')}
                    </span>
                  )}
                  {event.company && (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Building2 className="w-3 h-3 shrink-0" />{event.company}
                    </span>
                  )}
                  {event.vendor && (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Building2 className="w-3 h-3 shrink-0" />{event.vendor}
                    </span>
                  )}
                  {event.subLabel && (
                    <span className="text-[11px] text-slate-400">{event.subLabel}</span>
                  )}
                </div>
              </div>

              {/* Amount + date */}
              <div className="text-right shrink-0">
                <p className={cn('text-[14px] font-black tabular-nums',
                  isCredit ? 'text-emerald-600' : isDebit ? 'text-violet-600' : 'text-slate-800')}>
                  {isCredit ? '+' : isDebit ? '−' : ''}{fmtAEDFull(event.amount)}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">{fmtDate(event.date)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function HistoryPage() {
  const propertyId = useSelector(selectCurrentPropertyId);

  const [typeFilter,     setTypeFilter]    = useState('');
  const [search,         setSearch]        = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page,           setPage]          = useState(1);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page on filter change
  const setFilter = (f) => { setTypeFilter(f); setPage(1); };

  // ── Single API call ─────────────────────────────────────────────────────────
  const { data: raw, isLoading, isFetching } = useGetQuery(
    {
      path:   '/history',
      params: {
        propertyId,
        ...(typeFilter       && { type:   typeFilter }),
        ...(debouncedSearch  && { search: debouncedSearch }),
        page,
        limit: PAGE_SIZE,
      },
    },
    {
      skip:                     !propertyId,
      refetchOnMountOrArgChange: 60,   // cache 60 s
    },
  );

  const items  = raw?.items  ?? [];
  const stats  = raw?.stats  ?? {};
  const total  = raw?.total  ?? 0;
  const pages  = raw?.pages  ?? 1;

  // Group current page items by month
  const grouped = useMemo(() => {
    const map = new Map();
    items.forEach((e) => {
      const key = e.date?.slice(0, 7) ?? 'unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    });
    return Array.from(map.entries()).map(([key, events]) => ({
      key,
      label:  key === 'unknown' ? 'Unknown date' : fmtMonthYear(key),
      total:  events.reduce((s, e) => s + (e.amount ?? 0), 0),
      events,
    }));
  }, [items]);

  // Stat cards — populated from the stats object returned by the API
  const statCards = [
    {
      label: 'Total Activities',
      value: stats.total ?? 0,
      icon:  LayoutList,
      color: '#0b1d3a',
      bg:    '#eef2ff',
    },
    {
      label: 'Tasks Completed',
      value: stats.tasks ?? 0,
      icon:  CalendarClock,
      color: '#0891b2',
      bg:    '#ecfeff',
    },
    {
      label: 'Total Spent',
      value: fmtAED(stats.totalSpent ?? 0),
      icon:  TrendingDown,
      color: '#dc2626',
      bg:    '#fef2f2',
    },
    {
      label: 'Total Deposited',
      value: fmtAED(stats.totalDeposited ?? 0),
      icon:  TrendingUp,
      color: '#16a34a',
      bg:    '#f0fdf4',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="space-y-6"
    >
      {/* ── Page header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)', boxShadow: '0 4px 14px rgba(11,29,58,0.35)' }}>
            <History className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-[22px] font-black text-slate-900 leading-tight">Activity History</h1>
            <p className="text-[12px] text-slate-400 mt-0.5">
              Maintenance · Repairs · Expenses · Wallet activity — complete record
            </p>
          </div>
        </div>
        {!isLoading && total > 0 && (
          <div className="px-3.5 py-1.5 rounded-2xl text-[12px] font-bold"
            style={{ background: '#f0f5ff', color: '#1e3a6e', border: '1px solid #c7d7ff' }}>
            {total.toLocaleString()} records
          </div>
        )}
      </div>

      {isLoading ? (
        <PageSkeleton />
      ) : (
        <>
          {/* ── Stat cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((s, i) => (
              <motion.div key={s.label}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-white rounded-2xl p-4 flex items-center gap-4 border border-slate-100"
                style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: s.bg }}>
                  <s.icon className="w-5 h-5" style={{ color: s.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[20px] font-black text-slate-900 leading-none truncate">{s.value}</p>
                  <p className="text-[11px] font-bold text-slate-400 mt-1 leading-tight">{s.label}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── Filter pills + search ── */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Filter pills — horizontally scrollable on mobile */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {FILTERS.map((f) => {
                const count = f.key === ''             ? stats.total
                            : f.key === 'maintenance'  ? stats.tasks     // approximate
                            : f.key === 'repair'       ? stats.tasks     // shown below
                            : f.key === 'expense'      ? stats.expenses
                            : f.key === 'deposit'      ? stats.deposits
                            : f.key === 'debit'        ? stats.debits
                            : null;
                const active = typeFilter === f.key;
                return (
                  <button key={f.key} onClick={() => setFilter(f.key)}
                    className={cn(
                      'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-bold whitespace-nowrap transition-all border shrink-0',
                      active
                        ? 'text-white border-transparent'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700',
                    )}
                    style={active ? { background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)', borderColor: 'transparent' } : {}}>
                    {f.label}
                    {count != null && count > 0 && (
                      <span className={cn('text-[10px] font-black tabular-nums',
                        active ? 'text-white/60' : 'text-slate-400')}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative sm:ml-auto sm:w-64 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input type="text"
                placeholder="Search history…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-8 rounded-xl border border-slate-200 bg-white text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* ── Timeline ── */}
          <div className={cn('space-y-8 transition-opacity duration-200', isFetching ? 'opacity-50' : 'opacity-100')}>
            {grouped.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center"
                style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
                  <History className="w-8 h-8 text-slate-200" strokeWidth={1.5} />
                </div>
                <p className="text-[15px] font-bold text-slate-500">No history found</p>
                <p className="text-[13px] text-slate-300 mt-1">
                  {search
                    ? `No results for "${search}"`
                    : typeFilter
                      ? 'Nothing recorded for this category yet'
                      : 'No activity recorded yet'}
                </p>
                {(search || typeFilter) && (
                  <button onClick={() => { setSearch(''); setFilter(''); }}
                    className="mt-4 text-[12px] font-bold text-blue-600 hover:text-blue-700 transition-colors">
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div key={`${typeFilter}-${debouncedSearch}-${page}`}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-8">
                  {grouped.map((group) => (
                    <div key={group.key}>
                      {/* Month header */}
                      <div className="flex items-center gap-3 mb-4 sticky top-0 bg-white/80 backdrop-blur-sm py-2 -mx-1 px-1 rounded-xl z-10">
                        <div className="h-px flex-1 bg-slate-100" />
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[13px] font-black text-slate-700">{group.label}</span>
                          <span className="text-[11px] text-slate-400">
                            {group.events.length} item{group.events.length !== 1 ? 's' : ''}
                          </span>
                          {group.total > 0 && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: '#f0f5ff', color: '#1e3a6e' }}>
                              AED {group.total.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div className="h-px flex-1 bg-slate-100" />
                      </div>

                      {/* Events with timeline line */}
                      <div className="relative">
                        <div className="absolute left-3.5 top-4 bottom-4 w-px bg-slate-100 hidden sm:block" />
                        <div className="space-y-3">
                          {group.events.map((event, ei) => (
                            <EventCard key={event.id} event={event} index={ei} />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* ── Pagination ── */}
          {pages > 1 && (
            <PaginationBar
              page={page} pages={pages} total={total} limit={PAGE_SIZE}
              onPage={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            />
          )}
        </>
      )}
    </motion.div>
  );
}
