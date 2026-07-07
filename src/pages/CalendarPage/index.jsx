import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RiCalendarLine, RiArrowLeftSLine, RiArrowRightSLine,
  RiCalendarCheckLine, RiFileList3Line, RiAlertLine, RiToolsLine,
  RiShieldCheckLine, RiMoneyDollarCircleLine, RiCheckboxCircleLine,
  RiCloseLine,
} from 'react-icons/ri';
import { selectTasks }   from '../../store/slices/tasksSlice';
import { selectContracts }   from '../../store/slices/contractsSlice';
import { selectAssets }      from '../../store/slices/assetsSlice';
import { selectExpenses }    from '../../store/slices/expensesSlice';
import { cn } from '../../utils/cn';

/* ── Event type config ── */
const EVENT_CFG = {
  maintenance: { label: 'Maintenance', dot: '#3b82f6', bg: '#eff6ff', color: '#1d4ed8', icon: RiCalendarCheckLine,      link: '/maintenance' },
  overdue:     { label: 'Overdue',     dot: '#dc2626', bg: '#fef2f2', color: '#b91c1c', icon: RiAlertLine,              link: '/maintenance' },
  completed:   { label: 'Completed',   dot: '#16a34a', bg: '#f0fdf4', color: '#15803d', icon: RiCheckboxCircleLine,     link: '/maintenance' },
  repair:      { label: 'Repair',      dot: '#ea580c', bg: '#fff7ed', color: '#c2410c', icon: RiToolsLine,              link: '/maintenance' },
  contract:    { label: 'Contract',    dot: '#d97706', bg: '#fffbeb', color: '#b45309', icon: RiFileList3Line,          link: '/contracts'   },
  warranty:    { label: 'Warranty',    dot: '#7c3aed', bg: '#f5f3ff', color: '#6d28d9', icon: RiShieldCheckLine,        link: '/assets'      },
  expense:     { label: 'Expense',     dot: '#0891b2', bg: '#ecfeff', color: '#0e7490', icon: RiMoneyDollarCircleLine,  link: '/expenses'    },
};

/* ── Dot colours for the grid cells ── */
const DOT_PRIORITY = ['overdue','repair','contract','maintenance','warranty','expense','completed'];

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function buildGrid(year, month) {
  const first  = new Date(year, month, 1);
  const last   = new Date(year, month + 1, 0);
  const offset = (first.getDay() + 6) % 7; // Mon=0
  const cells  = [];
  for (let i = offset; i > 0; i--)    cells.push({ date: new Date(year, month, 1-i),    current: false });
  for (let d = 1; d <= last.getDate(); d++) cells.push({ date: new Date(year, month, d), current: true  });
  let pad = 1;
  while (cells.length < 42)           cells.push({ date: new Date(year, month+1, pad++), current: false });
  return cells;
}

function fmtDate(s) {
  return s ? new Date(s+'T00:00:00').toLocaleDateString('en-AE', { day:'numeric', month:'short', year:'numeric' }) : '—';
}

const todayStr = toDateStr(new Date());

export default function CalendarPageView() {
  const tasks     = useSelector(selectTasks);
  const contracts = useSelector(selectContracts);
  const assets    = useSelector(selectAssets);
  const expenses    = useSelector(selectExpenses);

  const [viewDate,    setViewDate]    = useState(() => new Date(new Date().getFullYear(), new Date().getMonth()));
  const [selectedDay, setSelectedDay] = useState(null);
  const [typeFilter,  setTypeFilter]  = useState('all');

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const cells = useMemo(() => buildGrid(year, month), [year, month]);

  /* ── Build unified event list from ALL Redux slices ── */
  const allEvents = useMemo(() => {
    const evs = [];

    /* All tasks (maintenance + repairs + custom) */
    tasks.forEach((t) => {
      const dateStr = t.status === 'completed' ? (t.completedDate || t.scheduledDate) : t.scheduledDate;
      if (!dateStr) return;
      const isRepair = t.category === 'Repair';
      evs.push({
        id:    t.id,
        title: t.title,
        date:  dateStr,
        type:  t.status === 'completed' ? 'completed' : t.status === 'overdue' ? 'overdue' : isRepair ? 'repair' : 'maintenance',
        meta:  t.companyName ?? t.areaName ?? '',
        link:  '/maintenance',
        sub:   t.areaName ?? '',
      });
    });

    /* Contracts — show end date for active + expiring-soon */
    contracts.forEach((c) => {
      if (!c.endDate || c.status === 'terminated') return;
      evs.push({
        id:    `cnt-${c.id}`,
        title: `Contract Expires: ${c.title ?? c.companyName}`,
        date:  c.endDate,
        type:  'contract',
        meta:  c.companyName ?? '',
        link:  `/contracts/${c.id}`,
        sub:   c.status,
      });
    });

    /* Assets / Warranty expiry */
    assets.forEach((a) => {
      const exp = a.warranty?.expiryDate;
      if (!exp) return;
      const daysLeft = Math.ceil((new Date(exp+'T00:00:00') - new Date()) / 86400000);
      if (daysLeft > -60 && daysLeft < 365) {
        evs.push({
          id:    `war-${a.id}`,
          title: `Warranty Expires: ${a.name}`,
          date:  exp,
          type:  'warranty',
          meta:  a.warranty.provider ?? '',
          link:  '/assets',
          sub:   a.category ?? '',
        });
      }
    });

    /* Expenses — every expense as a dot */
    expenses.forEach((e) => {
      if (!e.date) return;
      evs.push({
        id:    `exp-${e.id}`,
        title: e.description ?? 'Expense',
        date:  e.date,
        type:  'expense',
        meta:  e.company ?? '',
        link:  '/expenses',
        sub:   e.category ?? '',
        amount: e.amount,
      });
    });

    return evs;
  }, [tasks, contracts, assets, expenses]);

  /* Apply type filter */
  const filteredEvents = useMemo(() => (
    typeFilter === 'all' ? allEvents : allEvents.filter((e) => e.type === typeFilter)
  ), [allEvents, typeFilter]);

  /* Index events by date */
  const eventsByDate = useMemo(() => {
    const map = {};
    filteredEvents.forEach((e) => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [filteredEvents]);

  const selectedEvents = selectedDay ? (eventsByDate[selectedDay] ?? []) : [];

  /* Upcoming = next 60 days */
  const upcoming = useMemo(() => {
    const now   = new Date();
    const limit = new Date(); limit.setDate(limit.getDate() + 60);
    return filteredEvents
      .filter((e) => { const d = new Date(e.date+'T00:00:00'); return d >= now && d <= limit; })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 12);
  }, [filteredEvents]);

  const monthKey         = `${year}-${String(month+1).padStart(2,'0')}`;
  const monthEventCount  = Object.entries(eventsByDate)
    .filter(([k]) => k.startsWith(monthKey))
    .reduce((s, [,arr]) => s + arr.length, 0);

  /* Counts per type for filter bar */
  const typeCounts = useMemo(() => {
    const map = {};
    allEvents.forEach((e) => { map[e.type] = (map[e.type] ?? 0) + 1; });
    return map;
  }, [allEvents]);

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32 }} className="space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Calendar</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">All scheduled maintenance, repairs, contracts, warranties &amp; expenses</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            {monthEventCount} events in {viewDate.toLocaleDateString('en-AE', { month: 'long' })}
          </span>
        </div>
      </div>

      {/* ── Type filter pills ── */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setTypeFilter('all')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all"
          style={typeFilter === 'all'
            ? { background: '#0b1d3a', color: '#fff' }
            : { background: '#fff', color: '#64748b', border: '1px solid #e2e8f0' }}>
          All <span className="opacity-60 font-semibold">{allEvents.length}</span>
        </button>
        {Object.entries(EVENT_CFG).map(([key, cfg]) => {
          const count = typeCounts[key] ?? 0;
          if (count === 0) return null;
          const active = typeFilter === key;
          const Icon = cfg.icon;
          return (
            <button key={key} onClick={() => setTypeFilter(active ? 'all' : key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all border"
              style={active
                ? { background: cfg.dot, color: '#fff', borderColor: cfg.dot }
                : { background: '#fff', color: cfg.color, borderColor: '#e2e8f0' }}>
              <Icon className="w-3.5 h-3.5" />
              {cfg.label}
              <span className="opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Calendar grid + side panel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Calendar ── */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>

          {/* Nav */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => { setViewDate(new Date(year, month-1)); setSelectedDay(null); }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
              <RiArrowLeftSLine className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h2 className="text-[15px] font-bold text-slate-900">
                {viewDate.toLocaleDateString('en-AE', { month: 'long', year: 'numeric' })}
              </h2>
            </div>
            <button onClick={() => { setViewDate(new Date(year, month+1)); setSelectedDay(null); }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
              <RiArrowRightSLine className="w-5 h-5" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => (
              <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest py-1">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              const ds      = toDateStr(cell.date);
              const evs     = eventsByDate[ds] ?? [];
              const isToday = ds === todayStr;
              const isSel   = ds === selectedDay;

              /* Pick up to 3 distinct event type dots, ordered by priority */
              const types = DOT_PRIORITY.filter((t) => evs.some((e) => e.type === t)).slice(0, 3);

              return (
                <button key={i}
                  onClick={() => cell.current && setSelectedDay(isSel ? null : ds)}
                  disabled={!cell.current}
                  className={cn(
                    'flex flex-col items-center pt-1.5 rounded-xl text-[12px] font-medium transition-all min-h-[52px] pb-1',
                    !cell.current  && 'opacity-20 cursor-default',
                    isToday && !isSel && 'text-white',
                    isSel   && 'ring-2 ring-blue-400',
                    !isToday && !isSel && cell.current && 'hover:bg-slate-50 cursor-pointer',
                  )}
                  style={isToday && !isSel ? { background: '#0b1d3a' } : isSel ? { background: '#eff6ff' } : {}}>
                  <span className={cn('leading-none', isToday && !isSel ? 'text-white' : isSel ? 'text-blue-700' : 'text-slate-700')}>
                    {cell.date.getDate()}
                  </span>
                  <div className="flex gap-[3px] mt-1.5 flex-wrap justify-center px-1">
                    {types.map((type) => (
                      <span key={type} className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: EVENT_CFG[type]?.dot ?? '#94a3b8' }} />
                    ))}
                  </div>
                  {evs.length > 3 && (
                    <span className="text-[9px] font-bold mt-0.5" style={{ color: '#64748b' }}>+{evs.length-3}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 mt-5 pt-4 border-t border-slate-100">
            {Object.entries(EVENT_CFG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.dot }} />
                <span className="text-[11px] font-medium text-slate-500">{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Side panel ── */}
        <div className="bg-white rounded-2xl border border-slate-100 flex flex-col overflow-hidden"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>

          <div className="px-5 py-4 border-b border-slate-100 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-bold text-slate-900">
                  {selectedDay
                    ? new Date(selectedDay+'T00:00:00').toLocaleDateString('en-AE', { weekday:'long', day:'numeric', month:'long' })
                    : 'Upcoming Events'}
                </h3>
                {!selectedDay && <p className="text-[11px] text-slate-400 mt-0.5">Next 60 days</p>}
                {selectedDay  && <p className="text-[11px] text-slate-400 mt-0.5">{selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''}</p>}
              </div>
              {selectedDay && (
                <button onClick={() => setSelectedDay(null)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all">
                  <RiCloseLine className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <AnimatePresence mode="popLayout">
              {(selectedDay ? selectedEvents : upcoming).length === 0 ? (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="py-10 text-center">
                  <RiCalendarLine className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-[13px] text-slate-400 font-medium">
                    {selectedDay ? 'No events on this day' : 'No upcoming events'}
                  </p>
                </motion.div>
              ) : (
                (selectedDay ? selectedEvents : upcoming).map((ev, idx) => {
                  const cfg  = EVENT_CFG[ev.type] ?? EVENT_CFG.maintenance;
                  const Icon = cfg.icon;
                  return (
                    <motion.div key={ev.id}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 20 }} transition={{ delay: idx * 0.025 }}>
                      <Link to={ev.link}
                        className="flex items-start gap-3 p-3 rounded-xl border transition-all group block"
                        style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = cfg.bg; e.currentTarget.style.borderColor = cfg.dot+'66'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>

                        {/* Icon badge */}
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: cfg.bg }}>
                          <Icon className="w-4 h-4" style={{ color: cfg.dot }} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-bold text-slate-800 leading-snug line-clamp-2">{ev.title}</p>
                          {ev.meta && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{ev.meta}</p>}
                          {ev.amount != null && (
                            <p className="text-[11px] font-semibold mt-0.5" style={{ color: cfg.color }}>
                              AED {ev.amount.toLocaleString()}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                              style={{ background: cfg.bg, color: cfg.color }}>
                              {cfg.label}
                            </span>
                            {!selectedDay && (
                              <span className="text-[10px] text-slate-400 font-medium">{fmtDate(ev.date)}</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
