import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History, Wrench, CalendarClock, DollarSign, CheckCircle2,
  Building2, MapPin, Filter, Receipt, Banknote, Search, X,
  ArrowUpCircle, ArrowDownCircle, TrendingUp,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { useGetQuery } from '../../api/apiSlice';
import { selectCurrentPropertyId } from '../../store/slices/propertiesSlice';
import Badge from '../../components/ui/Badge';
import { StatCardSkeleton } from '../../components/ui/LoadingSkeleton';
import { cn } from '../../utils/cn';

const FILTERS = ['All', 'Maintenance', 'Repairs', 'Expenses', 'Deposits'];

function fmtDate(str) {
  return new Date(str + 'T00:00:00').toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtMonthYear(str) {
  const [y, m] = str.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-AE', { month: 'long', year: 'numeric' });
}
function fmtAED(n) {
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `AED ${(n / 1_000).toFixed(1)}K`;
  return `AED ${n.toLocaleString()}`;
}

export default function HistoryPage() {
  const propertyId = useSelector(selectCurrentPropertyId);

  const { data: tasks = [],        isLoading: tLoad } = useGetQuery(
    { path: '/tasks',               params: { propertyId } },
    { skip: !propertyId },
  );
  const { data: expenses = [],     isLoading: eLoad } = useGetQuery(
    { path: '/expenses',            params: { propertyId } },
    { skip: !propertyId },
  );
  const { data: txnResp,           isLoading: wLoad } = useGetQuery(
    { path: '/wallet/transactions', params: { propertyId, txnType: 'credit', limit: 500 } },
    { skip: !propertyId },
  );

  const deposits = txnResp?.items ?? [];
  const loading  = tLoad || eLoad || wLoad;

  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  // ── Build unified event list ─────────────────────────────────────────────────
  const allEvents = useMemo(() => {
    const taskEvents = tasks
      .filter((t) => t.status === 'completed' && t.completedDate)
      .map((t) => ({
        id:      `task-${t.id}`,
        type:    t.category === 'Repair' ? 'repair' : 'maintenance',
        title:   t.title,
        asset:   t.assetName,
        area:    t.areaName,
        company: t.companyName,
        date:    t.completedDate,
        cost:    t.actualCost ?? t.estimatedCost ?? 0,
        subLabel: t.type || t.category,
      }));

    const expenseEvents = expenses.map((e) => ({
      id:         `exp-${e.id}`,
      type:       'expense',
      title:      e.description,
      date:       e.date,
      cost:       e.amount ?? 0,
      subLabel:   e.category,
      vendor:     e.vendor,
      walletType: e.walletType,
      segment:    e.segment,
    }));

    const depositEvents = deposits.map((d) => ({
      id:         `dep-${d.id}`,
      type:       'deposit',
      title:      d.description || d.note || 'Wallet Deposit',
      date:       d.date,
      cost:       d.amount ?? 0,
      subLabel:   d.category || 'Deposit',
      walletType: d.walletType,
    }));

    return [...taskEvents, ...expenseEvents, ...depositEvents]
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [tasks, expenses, deposits]);

  // ── Filtered ─────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = allEvents;
    if (filter === 'Maintenance') list = list.filter((e) => e.type === 'maintenance');
    else if (filter === 'Repairs')  list = list.filter((e) => e.type === 'repair');
    else if (filter === 'Expenses') list = list.filter((e) => e.type === 'expense');
    else if (filter === 'Deposits') list = list.filter((e) => e.type === 'deposit');

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) =>
        [e.title, e.vendor, e.company, e.area, e.asset, e.subLabel, e.walletType]
          .some((f) => f?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allEvents, filter, search]);

  // ── Group by month ────────────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((e) => {
      const key = e.date.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    });
    return Array.from(map.entries()).map(([key, events]) => ({
      key,
      label:  fmtMonthYear(key),
      total:  events.reduce((s, e) => s + (e.cost ?? 0), 0),
      events,
    }));
  }, [filtered]);

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const taskEvents    = allEvents.filter((e) => e.type === 'maintenance' || e.type === 'repair');
  const expenseEvents = allEvents.filter((e) => e.type === 'expense');
  const depositEvents = allEvents.filter((e) => e.type === 'deposit');
  const totalSpent    = [...taskEvents, ...expenseEvents].reduce((s, e) => s + (e.cost ?? 0), 0);
  const totalDeposits = depositEvents.reduce((s, e) => s + (e.cost ?? 0), 0);

  const stats = [
    {
      label: 'Total Activities',
      value: allEvents.length,
      icon:  History,
      color: 'bg-navy-50 text-navy-700',
    },
    {
      label: 'Tasks Completed',
      value: taskEvents.length,
      icon:  CalendarClock,
      color: 'bg-accent-50 text-accent-700',
    },
    {
      label: 'Total Spent',
      value: fmtAED(totalSpent),
      icon:  DollarSign,
      color: 'bg-warning-50 text-warning-700',
    },
    {
      label: 'Total Deposits',
      value: fmtAED(totalDeposits),
      icon:  TrendingUp,
      color: 'bg-success-50 text-success-700',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
      className="space-y-6"
    >
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Activity History</h1>
        <p className="text-[13px] text-slate-400 mt-0.5">
          Complete record of all maintenance, repairs, expenses and wallet deposits
        </p>
      </div>

      {/* ── Stats ── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4"
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
              <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', s.color)}>
                <s.icon className="w-5 h-5" strokeWidth={1.8} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-navy-900 leading-none truncate">{s.value}</p>
                <p className="text-[12px] text-slate-400 mt-1">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Filters + Search ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-all border',
                filter === f
                  ? 'bg-navy-900 text-white border-navy-900 shadow-sm'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700',
              )}
            >
              {f}
              {f !== 'All' && !loading && (
                <span className={cn(
                  'ml-1.5 text-[10px] font-bold',
                  filter === f ? 'text-white/70' : 'text-slate-400',
                )}>
                  {f === 'Maintenance' && allEvents.filter((e) => e.type === 'maintenance').length}
                  {f === 'Repairs'     && allEvents.filter((e) => e.type === 'repair').length}
                  {f === 'Expenses'    && allEvents.filter((e) => e.type === 'expense').length}
                  {f === 'Deposits'    && allEvents.filter((e) => e.type === 'deposit').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative sm:ml-auto sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search history…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-8 pr-8 rounded-xl border border-slate-200 bg-white text-[12px] text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-accent-400 focus:border-accent-400 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Timeline ── */}
      {!loading && (
        <div className="space-y-8">
          {grouped.length === 0 ? (
            <div
              className="bg-white rounded-2xl border border-slate-100 p-10 text-center"
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
              <History className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-[13px] font-medium text-slate-600 mb-1">No history found</p>
              <p className="text-[12px] text-slate-400">
                {search ? `No results for "${search}"` : 'Nothing recorded for this filter yet.'}
              </p>
            </div>
          ) : (
            grouped.map((group, gi) => (
              <motion.div
                key={group.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: gi * 0.06 }}
              >
                {/* Month header */}
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-[14px] font-bold text-navy-800">{group.label}</h2>
                  <div className="flex-1 h-px bg-slate-100" />
                  <span className="text-[12px] font-semibold text-slate-500 whitespace-nowrap">
                    {group.events.length} item{group.events.length > 1 ? 's' : ''}{' '}
                    {group.total > 0 && (
                      <>· <span className="text-navy-700">AED {group.total.toLocaleString()}</span></>
                    )}
                  </span>
                </div>

                {/* Events */}
                <div className="relative">
                  <div className="absolute left-3.75 top-5 bottom-2 w-px bg-slate-150 hidden sm:block" />
                  <div className="space-y-2">
                    {group.events.map((event, ei) => (
                      <TimelineEvent key={event.id} event={event} index={ei} />
                    ))}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
    </motion.div>
  );
}

function TimelineEvent({ event, index }) {
  const cfg = EVENT_CONFIG[event.type] ?? EVENT_CONFIG.maintenance;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-start gap-4"
    >
      {/* Dot */}
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 relative z-10',
        cfg.dot,
      )}>
        <cfg.icon className="w-3.5 h-3.5" />
      </div>

      {/* Card */}
      <div
        className="flex-1 bg-white rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors overflow-hidden"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <div className="flex items-start justify-between gap-3 p-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant={cfg.badge} size="sm">{cfg.label}</Badge>
              {(event.type === 'maintenance' || event.type === 'repair') && (
                <Badge variant="success" size="sm" dot>Completed</Badge>
              )}
              {event.type === 'deposit' && (
                <Badge variant="success" size="sm" dot>Credit</Badge>
              )}
              {event.type === 'expense' && event.walletType && (
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 px-2 py-0.5 bg-slate-50 rounded-full border border-slate-100">
                  {event.walletType} wallet
                </span>
              )}
              {event.type === 'deposit' && event.walletType && (
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 px-2 py-0.5 bg-slate-50 rounded-full border border-slate-100">
                  {event.walletType} wallet
                </span>
              )}
            </div>

            <h3 className="text-[14px] font-semibold text-slate-800 leading-tight">{event.title}</h3>

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              {(event.asset || event.area) && (
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {[event.asset, event.area].filter(Boolean).join(' · ')}
                </span>
              )}
              {event.company && (
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> {event.company}
                </span>
              )}
              {event.vendor && (
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> {event.vendor}
                </span>
              )}
              {event.subLabel && (
                <span className="text-[11px] text-slate-400">{event.subLabel}</span>
              )}
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className={cn(
              'text-[13px] font-bold',
              event.type === 'deposit' ? 'text-success-600' : 'text-navy-700',
            )}>
              {event.type === 'deposit' ? '+' : ''}AED {event.cost?.toLocaleString() ?? '—'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-end gap-1">
              {event.type === 'deposit'
                ? <ArrowUpCircle className="w-3 h-3 text-success-500" />
                : <CheckCircle2 className="w-3 h-3 text-success-500" />
              }
              {fmtDate(event.date)}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const EVENT_CONFIG = {
  maintenance: {
    label: 'Maintenance',
    badge: 'primary',
    dot:   'bg-accent-100 border-2 border-accent-300',
    icon:  CalendarClock,
  },
  repair: {
    label: 'Repair',
    badge: 'warning',
    dot:   'bg-warning-100 border-2 border-warning-300',
    icon:  Wrench,
  },
  expense: {
    label: 'Expense',
    badge: 'error',
    dot:   'bg-red-100 border-2 border-red-300',
    icon:  Receipt,
  },
  deposit: {
    label: 'Deposit',
    badge: 'success',
    dot:   'bg-success-100 border-2 border-success-300',
    icon:  Banknote,
  },
};
