import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RiCalendarLine, RiArrowLeftSLine, RiArrowRightSLine,
  RiCalendarCheckLine, RiFileList3Line, RiAlertLine, RiToolsLine,
  RiShieldCheckLine, RiMoneyDollarCircleLine, RiCheckboxCircleLine,
  RiCloseLine, RiUser3Line, RiArrowRightLine, RiMapPinLine,
  RiBuilding2Line, RiCalendar2Line, RiFilterLine,
} from 'react-icons/ri';
import { useGetQuery } from '../../api/apiSlice';
import { selectCurrentPropertyId } from '../../store/slices/propertiesSlice';
import { cn } from '../../utils/cn';

/* ── Event type config ──────────────────────────────────────────────────────── */
const EVENT_CFG = {
  birthday:    { label: 'Birthday',    dot: '#ec4899', bg: '#fdf2f8', color: '#be185d', icon: RiUser3Line            },
  overdue:     { label: 'Overdue',     dot: '#dc2626', bg: '#fef2f2', color: '#b91c1c', icon: RiAlertLine           },
  repair:      { label: 'Repair',      dot: '#ea580c', bg: '#fff7ed', color: '#c2410c', icon: RiToolsLine           },
  contract:    { label: 'Contract',    dot: '#d97706', bg: '#fffbeb', color: '#b45309', icon: RiFileList3Line        },
  maintenance: { label: 'Maintenance', dot: '#3b82f6', bg: '#eff6ff', color: '#1d4ed8', icon: RiCalendarCheckLine    },
  warranty:    { label: 'Warranty',    dot: '#7c3aed', bg: '#f5f3ff', color: '#6d28d9', icon: RiShieldCheckLine      },
  expense:     { label: 'Expense',     dot: '#0891b2', bg: '#ecfeff', color: '#0e7490', icon: RiMoneyDollarCircleLine },
  completed:   { label: 'Completed',   dot: '#16a34a', bg: '#f0fdf4', color: '#15803d', icon: RiCheckboxCircleLine    },
};

const DOT_PRIORITY = ['overdue', 'birthday', 'repair', 'contract', 'maintenance', 'warranty', 'expense', 'completed'];

const BASE_YEAR = new Date().getFullYear();

/* ── Helpers ─────────────────────────────────────────────────────────────────── */
function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
const todayStr = toDateStr(new Date());

function buildGrid(year, month) {
  const first  = new Date(year, month, 1);
  const last   = new Date(year, month + 1, 0);
  const offset = (first.getDay() + 6) % 7;
  const cells  = [];
  for (let i = offset; i > 0; i--)         cells.push({ date: new Date(year, month, 1-i),   current: false });
  for (let d = 1; d <= last.getDate(); d++) cells.push({ date: new Date(year, month, d),     current: true  });
  let p = 1;
  while (cells.length < 42)                cells.push({ date: new Date(year, month+1, p++), current: false });
  return cells;
}

function fmtDate(s) {
  return s ? new Date(s+'T00:00:00').toLocaleDateString('en-AE', { day:'numeric', month:'short', year:'numeric' }) : '—';
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr+'T00:00:00') - new Date(todayStr+'T00:00:00')) / 86400000);
}

function daysLabel(days) {
  if (days === null) return null;
  if (days < -1)  return { text: `${Math.abs(days)}d overdue`, color: '#dc2626', bg: '#fef2f2' };
  if (days === -1) return { text: '1d overdue',  color: '#dc2626', bg: '#fef2f2' };
  if (days === 0)  return { text: 'Today',       color: '#c2410c', bg: '#fff7ed' };
  if (days === 1)  return { text: 'Tomorrow',    color: '#d97706', bg: '#fffbeb' };
  if (days <= 7)   return { text: `In ${days}d`, color: '#d97706', bg: '#fffbeb' };
  if (days <= 30)  return { text: `In ${days}d`, color: '#3b82f6', bg: '#eff6ff' };
  return { text: `In ${days}d`, color: '#64748b', bg: '#f8fafc' };
}

function getRelativeLabel(dateStr) {
  const days = daysUntil(dateStr);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days > 1 && days <= 6) {
    return new Date(dateStr+'T00:00:00').toLocaleDateString('en-AE', { weekday: 'long', day: 'numeric', month: 'short' });
  }
  return new Date(dateStr+'T00:00:00').toLocaleDateString('en-AE', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
}

/* ── EventCard ────────────────────────────────────────────────────────────────── */
function EventCard({ ev, showDate = true, compact = false, idx = 0 }) {
  const cfg  = EVENT_CFG[ev.type] ?? EVENT_CFG.maintenance;
  const Icon = cfg.icon;
  const days = daysUntil(ev.date);
  const dl   = daysLabel(days);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ delay: idx * 0.03, duration: 0.2 }}
    >
      <Link
        to={ev.link}
        className="group block rounded-2xl border transition-all duration-200 overflow-hidden"
        style={{ background: '#fff', borderColor: '#f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = cfg.dot + '40';
          e.currentTarget.style.boxShadow = `0 6px 20px ${cfg.dot}18`;
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#f1f5f9';
          e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        {/* Color accent bar */}
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${cfg.dot}, ${cfg.dot}40)` }} />

        <div className="p-3.5 flex items-start gap-3">
          {/* Icon */}
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: cfg.bg }}>
            <Icon className="w-4.5 h-4.5" style={{ color: cfg.dot }} />
          </div>

          <div className="flex-1 min-w-0">
            {/* Type badge */}
            <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md mb-1"
              style={{ background: cfg.bg, color: cfg.color }}>
              {cfg.label}
            </span>

            {/* Title */}
            <p className="text-[13px] font-bold text-slate-800 leading-snug line-clamp-2">{ev.title}</p>

            {/* Meta */}
            {ev.meta && (
              <p className="flex items-center gap-1 text-[11px] text-slate-400 mt-1 truncate">
                {ev.metaIcon === 'location'
                  ? <RiMapPinLine className="w-3 h-3 shrink-0" />
                  : ev.metaIcon === 'company'
                  ? <RiBuilding2Line className="w-3 h-3 shrink-0" />
                  : null}
                {ev.meta}
              </p>
            )}

            {/* Sub-line */}
            {ev.sub && <p className="text-[11px] text-slate-500 mt-0.5">{ev.sub}</p>}

            {/* Amount */}
            {ev.amount != null && (
              <p className="text-[12px] font-black mt-1" style={{ color: cfg.color }}>
                AED {Number(ev.amount).toLocaleString('en-AE', { maximumFractionDigits: 0 })}
              </p>
            )}

            {/* Bottom row: days badge + date */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
              <div className="flex items-center gap-1.5">
                {dl && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg"
                    style={{ background: dl.bg, color: dl.color }}>
                    {dl.text}
                  </span>
                )}
                {showDate && (
                  <span className="text-[10px] text-slate-400">{fmtDate(ev.date)}</span>
                )}
              </div>
              <span className="flex items-center gap-0.5 text-[11px] font-semibold transition-colors"
                style={{ color: cfg.color }}>
                View
                <RiArrowRightLine className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ── DateDivider ─────────────────────────────────────────────────────────────── */
function DateDivider({ dateStr }) {
  const label = getRelativeLabel(dateStr);
  const days  = daysUntil(dateStr);
  const isUrgent = days !== null && days <= 0;
  return (
    <div className="flex items-center gap-2 pt-1 pb-0.5">
      <span className={cn(
        'text-[11px] font-black uppercase tracking-widest shrink-0',
        isUrgent ? 'text-danger-500' : 'text-slate-400',
      )}>
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────────── */
export default function CalendarPageView() {
  const propertyId = useSelector(selectCurrentPropertyId);

  const { data: tasks     = [] } = useGetQuery({ path: '/tasks',     params: { propertyId } }, { skip: !propertyId });
  const { data: contracts = [] } = useGetQuery({ path: '/contracts', params: { propertyId } }, { skip: !propertyId });
  const { data: assets    = [] } = useGetQuery({ path: '/assets',    params: { propertyId } }, { skip: !propertyId });
  const { data: expenses  = [] } = useGetQuery({ path: '/expenses',  params: { propertyId } }, { skip: !propertyId });
  const { data: employees = [] } = useGetQuery({ path: '/employees', params: { propertyId } }, { skip: !propertyId });

  const [viewDate,    setViewDate]    = useState(() => new Date(new Date().getFullYear(), new Date().getMonth()));
  const [selectedDay, setSelectedDay] = useState(null);
  const [typeFilter,  setTypeFilter]  = useState('all');

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const cells = useMemo(() => buildGrid(year, month), [year, month]);

  const goToToday = () => {
    setViewDate(new Date(new Date().getFullYear(), new Date().getMonth()));
    setSelectedDay(todayStr);
  };
  const prevMonth = () => { setViewDate(new Date(year, month - 1)); setSelectedDay(null); };
  const nextMonth = () => { setViewDate(new Date(year, month + 1)); setSelectedDay(null); };

  /* ── Build unified event list ── */
  const allEvents = useMemo(() => {
    const evs = [];

    tasks.forEach((t) => {
      const dateStr = t.status === 'completed' ? (t.completedDate || t.scheduledDate) : t.scheduledDate;
      if (!dateStr) return;
      const isRepair = t.category === 'Repair';
      const type = t.status === 'completed' ? 'completed'
        : t.status === 'overdue' ? 'overdue'
        : isRepair               ? 'repair'
        : 'maintenance';
      const loc = [t.floor, t.areaName].filter(Boolean).join(' › ');
      evs.push({
        id: t.id, title: t.title, date: dateStr, type,
        meta: t.companyName || loc || '',
        metaIcon: t.companyName ? 'company' : loc ? 'location' : null,
        sub: t.status !== 'completed' ? (t.priority ? `${t.priority.charAt(0).toUpperCase()}${t.priority.slice(1)} priority` : '') : '',
        link: `/maintenance/${t.id}`,
      });
    });

    contracts.forEach((c) => {
      if (!c.endDate || c.status === 'terminated') return;
      evs.push({
        id: `cnt-${c.id}`, title: `Contract Expiry: ${c.title || c.companyName}`,
        date: c.endDate, type: 'contract',
        meta: c.companyName ?? '', metaIcon: 'company',
        sub: c.cost > 0 ? `AED ${Number(c.cost).toLocaleString()} / ${c.costPeriod ?? 'period'}` : '',
        link: `/contracts/${c.id}`,
      });
    });

    assets.forEach((a) => {
      const exp = a.warranty?.expiryDate;
      if (!exp) return;
      const d = daysUntil(exp);
      if (d < -90 || d > 730) return;
      evs.push({
        id: `war-${a.id}`, title: `Warranty Expiry: ${a.name}`,
        date: exp, type: 'warranty',
        meta: a.warranty.provider || '', metaIcon: 'company',
        sub: a.category ?? '',
        link: `/assets/${a.id}`,
      });
    });

    expenses.forEach((e) => {
      if (!e.date) return;
      evs.push({
        id: `exp-${e.id}`, title: e.description || e.category || 'Expense',
        date: e.date, type: 'expense',
        meta: e.company ?? '', metaIcon: e.company ? 'company' : null,
        sub: e.category ?? '', amount: e.amount,
        link: '/expenses',
      });
    });

    const empArr = Array.isArray(employees) ? employees : (employees?.items ?? []);
    empArr.forEach((e) => {
      if (!e.dateOfBirth) return;
      const parts = e.dateOfBirth.split('-');
      if (parts.length < 3) return;
      const [birthYearStr, mm, dd] = parts;
      if (!mm || !dd) return;
      const birthYear = parseInt(birthYearStr, 10);
      for (let y = BASE_YEAR - 1; y <= BASE_YEAR + 2; y++) {
        const age = y - birthYear;
        evs.push({
          id: `bday-${e.id}-${y}`, title: `${e.name}'s Birthday`,
          date: `${y}-${mm}-${dd}`, type: 'birthday',
          meta: e.role ?? '', metaIcon: null,
          sub: age > 0 ? `Turning ${age}` : '',
          link: `/employees/${e.id}`,
        });
      }
    });

    return evs;
  }, [tasks, contracts, assets, expenses, employees]);

  const filteredEvents = useMemo(() => (
    typeFilter === 'all' ? allEvents : allEvents.filter((e) => e.type === typeFilter)
  ), [allEvents, typeFilter]);

  const eventsByDate = useMemo(() => {
    const map = {};
    filteredEvents.forEach((e) => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [filteredEvents]);

  const typeCounts = useMemo(() => {
    const map = {};
    allEvents.forEach((e) => { map[e.type] = (map[e.type] ?? 0) + 1; });
    return map;
  }, [allEvents]);

  const selectedEvents = selectedDay ? (eventsByDate[selectedDay] ?? []) : [];

  /* Upcoming = next 60 days, sorted, grouped */
  const upcoming = useMemo(() => {
    const now   = new Date(todayStr + 'T00:00:00');
    const limit = new Date(now); limit.setDate(limit.getDate() + 60);
    return filteredEvents
      .filter((e) => { const d = new Date(e.date+'T00:00:00'); return d >= now && d <= limit; })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 20);
  }, [filteredEvents]);

  const upcomingGrouped = useMemo(() => {
    const groups = {};
    upcoming.forEach((ev) => {
      if (!groups[ev.date]) groups[ev.date] = [];
      groups[ev.date].push(ev);
    });
    return Object.entries(groups);
  }, [upcoming]);

  const monthKey        = `${year}-${String(month+1).padStart(2,'0')}`;
  const monthEventCount = Object.entries(eventsByDate).filter(([k]) => k.startsWith(monthKey)).reduce((s, [, a]) => s + a.length, 0);

  /* Stats for header */
  const todayCount    = (eventsByDate[todayStr] ?? []).length;
  const weekCount     = (() => {
    let c = 0;
    for (let i = 0; i <= 7; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      c += (eventsByDate[toDateStr(d)] ?? []).length;
    }
    return c;
  })();
  const overdueCount  = allEvents.filter((e) => e.type === 'overdue').length;

  const displayList = selectedDay ? selectedEvents : upcomingGrouped.flatMap(([, evs]) => evs);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-navy-900 tracking-tight">Events Calendar</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">
            All events across maintenance, repairs, contracts, warranties, birthdays & expenses
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={goToToday}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl border border-slate-200 bg-white text-[12px] font-bold text-slate-600 hover:border-navy-300 hover:text-navy-800 transition-all"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
          >
            <RiCalendar2Line className="w-3.5 h-3.5" />
            Today
          </button>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Events',    value: allEvents.length,   color: '#0b1d3a', bg: '#f0f3fa' },
          { label: 'Today',           value: todayCount,         color: '#c2410c', bg: '#fff7ed' },
          { label: 'This Week',       value: weekCount,          color: '#1d4ed8', bg: '#eff6ff' },
          { label: 'Overdue',         value: overdueCount,       color: '#b91c1c', bg: '#fef2f2' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 px-4 py-3.5 flex items-center gap-3"
            style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: s.bg }}>
              <span className="text-[15px] font-black" style={{ color: s.color }}>{s.value}</span>
            </div>
            <span className="text-[12px] font-semibold text-slate-500">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setTypeFilter('all')}
          className={cn(
            'flex items-center gap-1.5 px-3 h-8 rounded-xl text-[12px] font-bold whitespace-nowrap border transition-all shrink-0',
            typeFilter === 'all'
              ? 'bg-navy-900 text-white border-navy-900'
              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300',
          )}>
          <RiFilterLine className="w-3.5 h-3.5" />
          All
          <span className={cn('text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shrink-0',
            typeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500')}>
            {allEvents.length}
          </span>
        </button>
        {Object.entries(EVENT_CFG).map(([key, cfg]) => {
          const count  = typeCounts[key] ?? 0;
          if (count === 0) return null;
          const active = typeFilter === key;
          const Icon   = cfg.icon;
          return (
            <button key={key}
              onClick={() => setTypeFilter(active ? 'all' : key)}
              className={cn('flex items-center gap-1.5 px-3 h-8 rounded-xl text-[12px] font-bold whitespace-nowrap border transition-all shrink-0')}
              style={active
                ? { background: cfg.dot, color: '#fff', borderColor: cfg.dot }
                : { background: '#fff', color: cfg.color, borderColor: '#e2e8f0' }}>
              <Icon className="w-3.5 h-3.5" />
              {cfg.label}
              <span className={cn('text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shrink-0')}
                style={active ? { background: 'rgba(255,255,255,0.25)' } : { background: `${cfg.dot}18`, color: cfg.dot }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Main layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">

        {/* ── Calendar ── */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5"
          style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>

          {/* Month navigation */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={prevMonth}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all">
              <RiArrowLeftSLine className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h2 className="text-[16px] font-black text-navy-900">
                {viewDate.toLocaleDateString('en-AE', { month: 'long', year: 'numeric' })}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">{monthEventCount} event{monthEventCount !== 1 ? 's' : ''} this month</p>
            </div>
            <button
              onClick={nextMonth}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all">
              <RiArrowRightSLine className="w-5 h-5" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} className="text-center text-[10px] font-black text-slate-300 uppercase tracking-widest py-2">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((cell, i) => {
              const ds       = toDateStr(cell.date);
              const evs      = eventsByDate[ds] ?? [];
              const isToday  = ds === todayStr;
              const isSel    = ds === selectedDay;
              const dots     = DOT_PRIORITY.filter((t) => evs.some((e) => e.type === t)).slice(0, 3);
              const visEvs   = evs.slice(0, 2);
              const moreEvs  = evs.length - visEvs.length;

              return (
                <button
                  key={i}
                  onClick={() => cell.current && setSelectedDay(isSel ? null : ds)}
                  disabled={!cell.current}
                  className={cn(
                    'flex flex-col items-center sm:items-start text-left rounded-xl transition-all duration-150',
                    'min-h-[44px] sm:min-h-[76px] p-1.5 sm:p-2',
                    !cell.current  && 'opacity-15 cursor-default pointer-events-none',
                    cell.current && !isToday && !isSel && 'hover:bg-slate-50 cursor-pointer active:scale-95',
                    isSel && 'ring-2 ring-accent-400 ring-offset-1',
                  )}
                  style={
                    isToday && !isSel ? { background: '#0b1d3a', borderRadius: '10px' }
                    : isSel          ? { background: '#eff6ff', borderRadius: '10px' }
                    : {}
                  }
                >
                  {/* Date number */}
                  <span className={cn(
                    'text-[12px] font-black leading-none w-6 h-6 rounded-lg flex items-center justify-center shrink-0',
                    isToday && !isSel ? 'text-white' :
                    isSel ? 'text-accent-700' :
                    cell.date.getDay() === 0 || cell.date.getDay() === 6 ? 'text-slate-400' :
                    'text-slate-700',
                  )}>
                    {cell.date.getDate()}
                  </span>

                  {/* Mobile: colored dots */}
                  {evs.length > 0 && (
                    <div className="sm:hidden flex items-center gap-0.5 mt-1 flex-wrap justify-center">
                      {dots.map((type) => (
                        <span key={type} className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: EVENT_CFG[type]?.dot }} />
                      ))}
                      {evs.length > 3 && (
                        <span className="text-[8px] font-bold" style={{ color: '#94a3b8' }}>+{evs.length - 3}</span>
                      )}
                    </div>
                  )}

                  {/* Desktop: event strips */}
                  {evs.length > 0 && (
                    <div className="hidden sm:flex flex-col gap-0.5 w-full mt-1">
                      {visEvs.map((ev) => {
                        const cfg = EVENT_CFG[ev.type] ?? EVENT_CFG.maintenance;
                        return (
                          <div
                            key={ev.id}
                            className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md truncate leading-snug"
                            style={{ background: `${cfg.dot}18`, color: cfg.color }}
                          >
                            {ev.title}
                          </div>
                        );
                      })}
                      {moreEvs > 0 && (
                        <div className="text-[9px] font-bold text-slate-400 px-1">+{moreEvs} more</div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-5 pt-4 border-t border-slate-100">
            {Object.entries(EVENT_CFG).map(([key, cfg]) => {
              const count  = typeCounts[key] ?? 0;
              if (count === 0) return null;
              const active = typeFilter === key;
              return (
                <button key={key}
                  onClick={() => setTypeFilter(typeFilter === key ? 'all' : key)}
                  className="flex items-center gap-1.5 hover:opacity-75 transition-opacity">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.dot }} />
                  <span className={cn('text-[11px] font-semibold', active ? 'text-slate-900 font-black' : 'text-slate-400')}>
                    {cfg.label}
                  </span>
                  <span className="text-[10px] font-bold text-slate-300">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Side panel ── */}
        <div className="bg-white rounded-2xl border border-slate-100 flex flex-col overflow-hidden"
          style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)', maxHeight: '80vh' }}>

          {/* Panel header */}
          <div className="px-4 py-4 border-b border-slate-100 shrink-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-[14px] font-black text-navy-900 leading-tight">
                  {selectedDay
                    ? new Date(selectedDay+'T00:00:00').toLocaleDateString('en-AE', { weekday: 'long', day: 'numeric', month: 'long' })
                    : 'Upcoming Events'}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {selectedDay
                    ? `${selectedEvents.length} event${selectedEvents.length !== 1 ? 's' : ''} · tap a card to view detail`
                    : `Next 60 days · ${upcoming.length} event${upcoming.length !== 1 ? 's' : ''}`}
                </p>
              </div>
              {selectedDay && (
                <button
                  onClick={() => setSelectedDay(null)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all shrink-0">
                  <RiCloseLine className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Event list */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="popLayout" initial={false}>
              {displayList.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-16 text-center px-6"
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
                    <RiCalendarLine className="w-7 h-7 text-slate-200" />
                  </div>
                  <p className="text-[13px] font-semibold text-slate-400">
                    {selectedDay ? 'No events on this day' : 'No upcoming events'}
                  </p>
                  {selectedDay && (
                    <p className="text-[11px] text-slate-300 mt-1">Tap another day to see its events</p>
                  )}
                  {!selectedDay && typeFilter !== 'all' && (
                    <button
                      onClick={() => setTypeFilter('all')}
                      className="mt-3 text-[11px] font-bold text-accent-600 hover:underline">
                      Clear filter
                    </button>
                  )}
                </motion.div>
              ) : selectedDay ? (
                /* Selected day: flat list */
                <div className="p-3 space-y-2">
                  {selectedEvents.map((ev, idx) => (
                    <EventCard key={ev.id} ev={ev} showDate={false} idx={idx} />
                  ))}
                </div>
              ) : (
                /* Upcoming: grouped by date */
                <div className="p-3 space-y-1">
                  {upcomingGrouped.map(([dateStr, evs]) => (
                    <div key={dateStr}>
                      <DateDivider dateStr={dateStr} />
                      <div className="space-y-2 mt-1.5 mb-3">
                        {evs.map((ev, idx) => (
                          <EventCard key={ev.id} ev={ev} showDate={false} idx={idx} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
