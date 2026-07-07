import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  History, Wrench, CalendarClock, DollarSign, CheckCircle2,
  Building2, MapPin, Filter,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectTasks } from '../../store/slices/tasksSlice';
import Badge from '../../components/ui/Badge';
import { StatCardSkeleton } from '../../components/ui/LoadingSkeleton';
import { cn } from '../../utils/cn';

const FILTERS = ['All', 'Maintenance', 'Repairs'];

function fmtDate(str) {
  return new Date(str + 'T00:00:00').toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtMonthYear(str) {
  const [y, m] = str.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-AE', { month: 'long', year: 'numeric' });
}

export default function HistoryPage() {
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('All');
  const tasks = useSelector(selectTasks);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  const allEvents = useMemo(() =>
    tasks
      .filter((t) => t.status === 'completed' && t.completedDate)
      .map((t) => ({
        id: t.id,
        type: t.category === 'Repair' ? 'repair' : 'maintenance',
        title: t.title,
        asset: t.assetName,
        area: t.areaName,
        company: t.companyName,
        date: t.completedDate,
        cost: t.actualCost ?? t.estimatedCost ?? 0,
        subLabel: t.type || t.category,
      }))
      .sort((a, b) => b.date.localeCompare(a.date)),
  [tasks]);

  const filtered = useMemo(() => {
    if (filter === 'Maintenance') return allEvents.filter((e) => e.type === 'maintenance');
    if (filter === 'Repairs')     return allEvents.filter((e) => e.type === 'repair');
    return allEvents;
  }, [allEvents, filter]);

  // Group by month
  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((e) => {
      const key = e.date.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    });
    return Array.from(map.entries()).map(([key, events]) => ({
      key,
      label: fmtMonthYear(key),
      total: events.reduce((s, e) => s + (e.cost ?? 0), 0),
      events,
    }));
  }, [filtered]);

  const totalCost  = allEvents.reduce((s, e) => s + (e.cost ?? 0), 0);
  const totalCount = allEvents.length;
  const curMonth        = new Date().toISOString().slice(0, 7);
  const thisMonthEvents = allEvents.filter((e) => e.date.startsWith(curMonth));
  const thisMonthCost   = thisMonthEvents.reduce((s, e) => s + (e.cost ?? 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
      className="space-y-6"
    >
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Maintenance History</h1>
        <p className="text-[13px] text-slate-400 mt-0.5">Complete record of all completed maintenance and resolved repairs</p>
      </div>

      {/* ── Stats ── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Activities', value: totalCount,                                icon: History,       color: 'bg-navy-50 text-navy-700'       },
            { label: 'Maintenance Done', value: allEvents.filter((e) => e.type === 'maintenance').length, icon: CalendarClock, color: 'bg-accent-50 text-accent-700'   },
            { label: 'Repairs Resolved', value: allEvents.filter((e) => e.type === 'repair').length,      icon: Wrench,        color: 'bg-success-50 text-success-700' },
            { label: 'Total Spent',      value: `AED ${(totalCost / 1000).toFixed(1)}K`,   icon: DollarSign,    color: 'bg-warning-50 text-warning-700' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4"
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
              <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', s.color)}>
                <s.icon className="w-5 h-5" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-2xl font-bold text-navy-900 leading-none">{s.value}</p>
                <p className="text-[12px] text-slate-400 mt-1">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Filter ── */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <div className="flex items-center gap-2 flex-wrap">
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
            </button>
          ))}
        </div>
      </div>

      {/* ── Timeline ── */}
      {!loading && (
        <div className="space-y-8">
          {grouped.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center" style={{ boxShadow: 'var(--shadow-card)' }}>
              <History className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-[13px] text-slate-400">No history found for this filter.</p>
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
                  <span className="text-[12px] font-semibold text-slate-500">
                    {group.events.length} item{group.events.length > 1 ? 's' : ''} ·{' '}
                    <span className="text-navy-700">AED {group.total.toLocaleString()}</span>
                  </span>
                </div>

                {/* Events */}
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-[15px] top-5 bottom-2 w-px bg-slate-150 hidden sm:block" />

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
  const isMaint = event.type === 'maintenance';

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-start gap-4"
    >
      {/* Dot */}
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 relative z-10',
        isMaint ? 'bg-accent-100 border-2 border-accent-300' : 'bg-warning-100 border-2 border-warning-300',
      )}>
        {isMaint
          ? <CalendarClock className="w-3.5 h-3.5 text-accent-600" />
          : <Wrench className="w-3.5 h-3.5 text-warning-600" />
        }
      </div>

      {/* Card */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-start justify-between gap-3 p-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant={isMaint ? 'primary' : 'warning'} size="sm">
                {isMaint ? 'Maintenance' : 'Repair'}
              </Badge>
              <Badge variant="success" size="sm" dot>Completed</Badge>
            </div>
            <h3 className="text-[14px] font-semibold text-slate-800 leading-tight">{event.title}</h3>

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {event.asset} · {event.area}
              </span>
              {event.company && (
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> {event.company}
                </span>
              )}
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="text-[13px] font-bold text-navy-700">AED {event.cost?.toLocaleString() ?? '—'}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center justify-end gap-1">
              <CheckCircle2 className="w-3 h-3 text-success-500" />
              {fmtDate(event.date)}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
