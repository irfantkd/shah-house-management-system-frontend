import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  RiBellLine, RiCheckDoubleLine, RiDeleteBinLine, RiFilterLine,
  RiAlertLine, RiInformationLine, RiCalendarLine, RiToolsLine,
  RiShieldLine, RiMoneyDollarCircleLine, RiCheckLine, RiCakeLine, RiTeamLine,
  RiVipCrownLine,
} from 'react-icons/ri';
import { selectNotifications, selectUnreadCount, markRead, markAllRead, dismissNotification } from '../../store/slices/notificationsSlice';
import { selectUpcomingBirthdays } from '../../store/slices/employeesSlice';
import { selectOwnerBirthdays }    from '../../store/slices/ownersSlice';
import { NOTIF_TYPE_CFG } from '../../data/mockNotifications';
import { cn } from '../../utils/cn';

const PALETTES = [
  ['#0b1d3a','#1e3a6e'], ['#16a34a','#14532d'], ['#7c3aed','#5b21b6'],
  ['#dc2626','#991b1b'], ['#d97706','#92400e'], ['#0891b2','#155e75'],
];
const avatarGrad = (name = '') => {
  const s = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const [a, b] = PALETTES[s % PALETTES.length];
  return `linear-gradient(135deg,${a},${b})`;
};
const initials = (name = '') => name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
const fmtBday  = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

const TYPE_ICONS = {
  maintenance: RiToolsLine,
  repair:      RiAlertLine,
  warranty:    RiShieldLine,
  contract:    RiCalendarLine,
  payment:     RiMoneyDollarCircleLine,
  info:        RiInformationLine,
};

function fmtAgo(iso) {
  const ms  = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 2)  return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24)  return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

const TYPES = ['all', 'maintenance', 'repair', 'warranty', 'contract', 'payment', 'info'];

export default function NotificationsPage() {
  const dispatch  = useDispatch();
  const all       = useSelector(selectNotifications);
  const unread    = useSelector(selectUnreadCount);
  const birthdays      = useSelector(selectUpcomingBirthdays);
  const ownerBirthdays = useSelector(selectOwnerBirthdays);
  const [tab,      setTab]      = useState('all');
  const [showRead, setShowRead] = useState(true);

  const filtered = all.filter((n) => {
    if (tab !== 'all' && n.type !== tab) return false;
    if (!showRead && n.read) return false;
    return true;
  });

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center">
              <RiBellLine className="w-5 h-5 text-navy-700" />
            </div>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-danger-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">{unread > 9 ? '9+' : unread}</span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Notifications</h1>
            <p className="text-[13px] text-slate-400 mt-0.5">{unread > 0 ? `${unread} unread` : 'All caught up'} Â· {all.length} total</p>
          </div>
        </div>
        {unread > 0 && (
          <button onClick={() => { dispatch(markAllRead()); toast.success('All marked as read'); }}
            className="flex items-center gap-2 px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white text-[13px] font-semibold rounded-xl transition-all">
            <RiCheckDoubleLine className="w-4 h-4" />Mark All Read
          </button>
        )}
      </div>

      {/* Filter row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
          {TYPES.map((t) => {
            const count = t === 'all' ? all.filter((n) => !n.read).length : all.filter((n) => n.type === t && !n.read).length;
            return (
              <button key={t} onClick={() => setTab(t)}
                className={cn('flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold whitespace-nowrap border transition-all shrink-0 capitalize',
                  tab === t ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300')}>
                {t === 'all' ? 'All' : t}
                {count > 0 && (
                  <span className={cn('text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center',
                    tab === t ? 'bg-white/20 text-white' : 'bg-danger-500 text-white')}>{count}</span>
                )}
              </button>
            );
          })}
        </div>
        <button onClick={() => setShowRead(!showRead)}
          className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold border transition-all shrink-0',
            !showRead ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-slate-500 border-slate-200')}>
          <RiFilterLine className="w-3.5 h-3.5" />{showRead ? 'Hide Read' : 'Show Read'}
        </button>
      </div>

      {/* ── Birthday Reminders ── */}
      <AnimatePresence>
        {birthdays.length > 0 && (
          <motion.div key="bdayblock" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="rounded-2xl border border-amber-200 overflow-hidden" style={{ background: 'linear-gradient(135deg,#fffbeb,#fef3c7)' }}>
              <div className="flex items-center gap-2 px-5 py-3 border-b border-amber-100">
                <RiCakeLine className="w-4 h-4 text-amber-600" />
                <p className="text-[13px] font-bold text-amber-900">Birthday Reminders</p>
                <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-400 text-white text-[10px] font-black">{birthdays.length}</span>
              </div>
              <div className="p-4 space-y-2">
                {birthdays.map((emp) => (
                  <div key={emp.id} className="flex items-center gap-3 p-3 bg-white/70 rounded-xl border border-amber-100">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[11px] font-black shrink-0"
                      style={{ background: avatarGrad(emp.name) }}>
                      {initials(emp.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-slate-800">{emp.name}</p>
                      <p className="text-[11px] text-slate-500">{emp.role} · Birthday {fmtBday(emp.nextBirthday)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {emp.daysUntilBirthday === 0
                        ? <span className="text-[12px] font-black text-amber-700 bg-amber-100 px-2.5 py-1 rounded-xl">🎉 Today!</span>
                        : emp.daysUntilBirthday === 1
                          ? <span className="text-[12px] font-bold text-amber-700">Tomorrow</span>
                          : <span className="text-[12px] font-bold text-amber-700">In {emp.daysUntilBirthday} days</span>}
                    </div>
                  </div>
                ))}
                <Link to="/employees" className="flex items-center gap-1.5 pt-1 text-[12px] font-bold text-amber-700 hover:text-amber-900 transition-colors">
                  <RiTeamLine className="w-3.5 h-3.5" />View all employees →
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Owner Birthday Reminders ── */}
      <AnimatePresence>
        {ownerBirthdays.length > 0 && (
          <motion.div key="ownerbdayblock" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="rounded-2xl border border-violet-200 overflow-hidden" style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)' }}>
              <div className="flex items-center gap-2 px-5 py-3 border-b border-violet-100">
                <RiCakeLine className="w-4 h-4 text-violet-600" />
                <p className="text-[13px] font-bold text-violet-900">Owner Birthdays</p>
                <span className="ml-auto px-2 py-0.5 rounded-full bg-violet-500 text-white text-[10px] font-black">{ownerBirthdays.length}</span>
              </div>
              <div className="p-4 space-y-2">
                {ownerBirthdays.map((own) => (
                  <div key={own.id} className="flex items-center gap-3 p-3 bg-white/70 rounded-xl border border-violet-100">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[11px] font-black shrink-0"
                      style={{ background: `linear-gradient(135deg,#4c1d95,#6d28d9)` }}>
                      {initials(own.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-slate-800">{own.name}</p>
                      <p className="text-[11px] text-slate-500">{own.role} · Birthday {fmtBday(own.nextBirthday)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {own.daysUntilBirthday === 0
                        ? <span className="text-[12px] font-black text-violet-700 bg-violet-100 px-2.5 py-1 rounded-xl">🎉 Today!</span>
                        : own.daysUntilBirthday === 1
                          ? <span className="text-[12px] font-bold text-violet-700">Tomorrow</span>
                          : <span className="text-[12px] font-bold text-violet-700">In {own.daysUntilBirthday} days</span>}
                    </div>
                  </div>
                ))}
                <Link to="/owners" className="flex items-center gap-1.5 pt-1 text-[12px] font-bold text-violet-700 hover:text-violet-900 transition-colors">
                  <RiVipCrownLine className="w-3.5 h-3.5" />View all owners →
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center" style={{ boxShadow: '0 1px 8px rgb(0 0 0/0.06)' }}>
          <RiBellLine className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-400">No notifications in this filter</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {filtered.map((n, i) => (
              <motion.div key={n.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40, scale: 0.95 }} transition={{ delay: i * 0.03 }}>
                <NotifCard notif={n}
                  onMarkRead={() => dispatch(markRead(n.id))}
                  onDismiss={() => { dispatch(dismissNotification(n.id)); toast.success('Notification dismissed'); }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

function NotifCard({ notif: n, onMarkRead, onDismiss }) {
  const TypeIcon = TYPE_ICONS[n.type] ?? RiInformationLine;
  const cfg = NOTIF_TYPE_CFG?.[n.type] ?? { bg: 'bg-slate-100', text: 'text-slate-600', label: n.type };
  const priColor = { high: 'bg-danger-50 border-danger-200', medium: 'bg-warning-50 border-warning-200', low: 'bg-white border-slate-100' }[n.priority ?? 'low'] ?? 'bg-white border-slate-100';

  return (
    <div className={cn('rounded-2xl border px-5 py-4 transition-all', priColor, !n.read && 'border-l-4 border-l-accent-400')}>
      <div className="flex items-start gap-3">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5', cfg.bg)}>
          <TypeIcon className={cn('w-4 h-4', cfg.text)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={cn('text-[14px] leading-snug', n.read ? 'font-medium text-slate-600' : 'font-bold text-slate-900')}>{n.title}</p>
            <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0 mt-0.5">{fmtAgo(n.createdAt)}</span>
          </div>
          <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">{n.message}</p>
          <div className="flex items-center gap-2 mt-2.5">
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-md capitalize', cfg.bg, cfg.text)}>{cfg.label}</span>
            {!n.read && (
              <button onClick={onMarkRead} className="flex items-center gap-1 text-[11px] font-semibold text-accent-600 hover:text-accent-700 transition-colors">
                <RiCheckLine className="w-3.5 h-3.5" />Mark read
              </button>
            )}
            <button onClick={onDismiss} className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-danger-500 transition-colors ml-auto">
              <RiDeleteBinLine className="w-3.5 h-3.5" />Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
