import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  RiBellLine, RiCheckDoubleLine, RiDeleteBinLine, RiFilterLine,
  RiAlertLine, RiToolsLine, RiShieldLine, RiCheckLine, RiCakeLine,
  RiCarLine, RiFileList3Line, RiNotificationLine, RiPassportLine,
  RiRefreshLine, RiTeamLine, RiVipCrownLine, RiArrowRightLine,
  RiDeleteBin2Line,
} from 'react-icons/ri';
import { useGetQuery, usePatchMutation, useDeleteMutation, usePostMutation } from '../../api/apiSlice';
import { selectCurrentPropertyId } from '../../store/slices/propertiesSlice';
import { cn } from '../../utils/cn';

/* ── Notification type config (mirrors Navbar.jsx exactly) ─────────────────── */
const NOTIF_CFG = {
  contract:    { icon: RiFileList3Line,   dot: '#d97706', bg: '#fffbeb', color: '#b45309', label: 'Contract'    },
  maintenance: { icon: RiToolsLine,       dot: '#3b82f6', bg: '#eff6ff', color: '#1d4ed8', label: 'Maintenance' },
  repair:      { icon: RiAlertLine,       dot: '#ea580c', bg: '#fff7ed', color: '#c2410c', label: 'Repair'      },
  warranty:    { icon: RiShieldLine,      dot: '#7c3aed', bg: '#f5f3ff', color: '#6d28d9', label: 'Warranty'    },
  birthday:    { icon: RiCakeLine,        dot: '#ec4899', bg: '#fdf2f8', color: '#be185d', label: 'Birthday'    },
  car:         { icon: RiCarLine,         dot: '#0891b2', bg: '#ecfeff', color: '#0e7490', label: 'Vehicle'     },
  passport:    { icon: RiPassportLine,    dot: '#0891b2', bg: '#f0f9ff', color: '#0e7490', label: 'Passport'    },
  employee:    { icon: RiShieldLine,      dot: '#dc2626', bg: '#fff1f2', color: '#b91c1c', label: 'Visa'        },
  general:     { icon: RiNotificationLine,dot: '#64748b', bg: '#f8fafc', color: '#475569', label: 'General'     },
};

const PRIORITY_BORDER = { high: '#ef4444', medium: '#f59e0b', low: '#3b82f6' };
const PRIORITY_BG     = { high: '#fef2f2', medium: '#fffbeb', low: '#ffffff' };

const ALL_TYPES = ['all', 'contract', 'maintenance', 'repair', 'warranty', 'car', 'employee', 'passport', 'birthday', 'general'];

function fmtAgo(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const m  = Math.floor(ms / 60000);
  if (m < 2)   return 'Just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}d ago` : new Date(iso).toLocaleDateString('en-AE', { day: 'numeric', month: 'short' });
}

function fmtDate(s) {
  if (!s) return '';
  const d    = new Date(s + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff  = Math.ceil((d - today) / 86400000);
  if (diff === 0)  return 'Today';
  if (diff === 1)  return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0)   return `${Math.abs(diff)}d overdue`;
  if (diff <= 14) return `In ${diff}d`;
  return d.toLocaleDateString('en-AE', { day: 'numeric', month: 'short' });
}

const avatarGrad = (name = '') => {
  const PALETTES = [['#0b1d3a','#1e3a6e'],['#16a34a','#14532d'],['#7c3aed','#5b21b6'],['#dc2626','#991b1b'],['#d97706','#92400e'],['#0891b2','#155e75']];
  const s = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const [a, b] = PALETTES[s % PALETTES.length];
  return `linear-gradient(135deg,${a},${b})`;
};
const initials = (name = '') => name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();

/* ── Notification card ──────────────────────────────────────────────────────── */
function NotifCard({ notif: n, onMarkRead, onDismiss }) {
  const cfg  = NOTIF_CFG[n.type] ?? NOTIF_CFG.general;
  const Icon = cfg.icon;
  const dateLabel = fmtDate(n.date);
  const priColor  = PRIORITY_BORDER[n.priority] ?? PRIORITY_BORDER.low;
  const priBg     = PRIORITY_BG[n.priority]     ?? PRIORITY_BG.low;

  return (
    <div className="rounded-2xl border border-slate-100 overflow-hidden transition-all hover:shadow-sm"
      style={{ background: priBg, borderLeft: `4px solid ${n.read ? '#e2e8f0' : priColor}` }}>
      <div className="px-5 py-4">
        <div className="flex items-start gap-3">
          {/* Type icon */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: cfg.bg }}>
            <Icon className="w-4.5 h-4.5" style={{ color: cfg.dot }} />
          </div>

          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-start justify-between gap-2">
              <p className={cn('text-[14px] leading-snug', n.read ? 'font-medium text-slate-600' : 'font-bold text-slate-900')}>
                {n.icon && <span className="mr-1">{n.icon}</span>}
                {n.title}
              </p>
              <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0 mt-0.5">{fmtAgo(n.createdAt)}</span>
            </div>

            {/* Message */}
            {n.message && (
              <p className="text-[12.5px] text-slate-500 mt-1 leading-relaxed">{n.message}</p>
            )}

            {/* Tags + actions */}
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              {/* Type label */}
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                style={{ background: cfg.bg, color: cfg.color }}>
                {cfg.label}
              </span>

              {/* Priority badge (urgent only) */}
              {n.priority === 'high' && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-red-50 text-red-600">Urgent</span>
              )}
              {n.priority === 'medium' && !n.read && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-600">Medium</span>
              )}

              {/* Date chip */}
              {dateLabel && (
                <span className={cn('text-[11px] font-semibold',
                  dateLabel.includes('overdue') ? 'text-red-500' :
                  dateLabel === 'Today' ? 'text-amber-600' : 'text-slate-400')}>
                  {dateLabel}
                </span>
              )}

              {/* Link */}
              {n.link && (
                <Link to={n.link}
                  className="flex items-center gap-1 text-[11px] font-semibold text-accent-600 hover:text-accent-700 transition-colors">
                  {n.linkLabel || 'View'} <RiArrowRightLine className="w-3 h-3" />
                </Link>
              )}

              {/* Mark read */}
              {!n.read && (
                <button onClick={onMarkRead}
                  className="flex items-center gap-1 text-[11px] font-semibold text-navy-600 hover:text-navy-700 transition-colors">
                  <RiCheckLine className="w-3.5 h-3.5" /> Mark read
                </button>
              )}

              {/* Dismiss */}
              <button onClick={onDismiss}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-red-500 transition-colors ml-auto">
                <RiDeleteBinLine className="w-3.5 h-3.5" /> Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Birthday mini-card ─────────────────────────────────────────────────────── */
function BirthdayCard({ person, type = 'employee' }) {
  const days = person.daysUntilBirthday ?? 999;
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${type === 'owner' ? 'bg-violet-50/60 border-violet-100' : 'bg-white/70 border-amber-100'}`}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[11px] font-black shrink-0"
        style={{ background: type === 'owner' ? 'linear-gradient(135deg,#4c1d95,#6d28d9)' : avatarGrad(person.name) }}>
        {initials(person.name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-slate-800 truncate">{person.name}</p>
        <p className="text-[11px] text-slate-500">{type === 'owner' ? 'Owner' : 'Employee'}</p>
      </div>
      <div className="text-right shrink-0">
        {days === 0
          ? <span className={`text-[12px] font-black px-2.5 py-1 rounded-xl ${type === 'owner' ? 'text-violet-700 bg-violet-100' : 'text-amber-700 bg-amber-100'}`}>Today!</span>
          : days === 1
            ? <span className={`text-[12px] font-bold ${type === 'owner' ? 'text-violet-700' : 'text-amber-700'}`}>Tomorrow</span>
            : <span className={`text-[12px] font-bold ${type === 'owner' ? 'text-violet-700' : 'text-amber-700'}`}>In {days}d</span>}
      </div>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────────────────────── */
export default function NotificationsPage() {
  const propertyId = useSelector(selectCurrentPropertyId);

  const { data: all = [], refetch } = useGetQuery({ path: '/notifications', params: { propertyId } }, { skip: !propertyId });
  const { data: empStats   = {} }   = useGetQuery({ path: '/employees/stats', params: { propertyId } }, { skip: !propertyId });
  const { data: ownerStats = {} }   = useGetQuery({ path: '/owners/stats',   params: { propertyId } }, { skip: !propertyId });

  const [markReadMut]    = usePatchMutation();
  const [markAllReadMut] = usePatchMutation();
  const [dismissMut]     = useDeleteMutation();
  const [generateMut]    = usePostMutation();
  const [deleteMut]      = useDeleteMutation();

  const [tab,          setTab]          = useState('all');
  const [showRead,     setShowRead]     = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const unread    = all.filter((n) => !n.read).length;
  const highCount = all.filter((n) => !n.read && n.priority === 'high').length;

  /* Birthday data from stats (lightweight) */
  const upcomingBirthdays    = empStats.upcomingBirthdays        ?? [];
  const upcomingOwnerBirthdays = ownerStats.upcomingBirthdays    ?? [];

  /* Filtered notification list */
  const filtered = all.filter((n) => {
    if (tab !== 'all' && n.type !== tab) return false;
    if (!showRead && n.read) return false;
    return true;
  });

  /* Type unread counts for tab badges */
  const typeCounts = {};
  all.forEach((n) => { if (!n.read) typeCounts[n.type] = (typeCounts[n.type] ?? 0) + 1; });

  /* Visible types (only those that have notifications) */
  const activeTypes = ALL_TYPES.filter((t) => t === 'all' || (typeCounts[t] ?? 0) > 0 || all.some((n) => n.type === t));

  const handleMarkRead = async (id) => {
    try { await markReadMut({ path: `/notifications/${id}/read`, body: {} }).unwrap(); }
    catch { toast.error('Failed to mark read'); }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllReadMut({ path: `/notifications/read-all?propertyId=${propertyId}`, body: {} }).unwrap();
      toast.success('All notifications marked as read');
    } catch { toast.error('Failed to mark all read'); }
  };

  const handleDismiss = async (id) => {
    try {
      await dismissMut({ path: `/notifications/${id}` }).unwrap();
      toast.success('Notification dismissed');
    } catch { toast.error('Failed to dismiss'); }
  };

  const handleGenerate = async () => {
    if (!propertyId || isGenerating) return;
    setIsGenerating(true);
    try {
      const res = await generateMut({ path: `/notifications/generate?propertyId=${propertyId}`, body: {} }).unwrap();
      refetch();
      toast.success(res?.message || 'Alerts refreshed');
    } catch { toast.error('Failed to refresh alerts'); }
    finally { setIsGenerating(false); }
  };

  const handleClearRead = async () => {
    try {
      await deleteMut({ path: `/notifications?propertyId=${propertyId}` }).unwrap();
      toast.success('Read notifications cleared');
    } catch { toast.error('Failed to clear'); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className="max-w-3xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #0b1d3a, #1e3a6e)' }}>
              <RiBellLine className="w-5 h-5 text-white" />
            </div>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none ring-2 ring-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Notifications</h1>
            <p className="text-[13px] text-slate-400 mt-0.5">
              {unread > 0
                ? <><span className={highCount > 0 ? 'text-red-500 font-semibold' : 'text-amber-600 font-semibold'}>{unread} unread</span> · {all.length} total</>
                : `All caught up · ${all.length} total`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleGenerate}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 text-[12px] font-semibold rounded-xl transition-all">
            <RiRefreshLine className={cn('w-3.5 h-3.5', isGenerating && 'animate-spin')} />
            Refresh
          </button>
          {unread > 0 && (
            <button onClick={handleMarkAllRead}
              className="flex items-center gap-2 px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white text-[13px] font-semibold rounded-xl transition-all">
              <RiCheckDoubleLine className="w-4 h-4" /> Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* ── Summary stats row ── */}
      {all.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Unread',  value: unread,                                      color: '#dc2626', bg: '#fef2f2' },
            { label: 'Urgent',  value: highCount,                                   color: '#ea580c', bg: '#fff7ed' },
            { label: 'Total',   value: all.length,                                  color: '#2563eb', bg: '#eff6ff' },
            { label: 'Types',   value: Object.keys(typeCounts).length || 0,         color: '#7c3aed', bg: '#f5f3ff' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-4"
              style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
              <p className="text-2xl font-black leading-none" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[11px] font-semibold text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Filter + toggle ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 flex-1 no-scrollbar">
          {activeTypes.map((t) => {
            const count = t === 'all' ? unread : (typeCounts[t] ?? 0);
            const cfg   = t !== 'all' ? NOTIF_CFG[t] : null;
            return (
              <button key={t} onClick={() => setTab(t)}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold whitespace-nowrap border transition-all shrink-0',
                  tab === t ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300')}>
                {cfg && <cfg.icon className="w-3 h-3 shrink-0" />}
                {t === 'all' ? 'All' : cfg?.label ?? t}
                {count > 0 && (
                  <span className={cn('text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shrink-0',
                    tab === t ? 'bg-white/20 text-white' : 'bg-red-500 text-white')}>
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <button onClick={() => setShowRead((v) => !v)}
          className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold border transition-all shrink-0',
            !showRead ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-slate-500 border-slate-200')}>
          <RiFilterLine className="w-3.5 h-3.5" />{showRead ? 'Hide Read' : 'Show Read'}
        </button>
      </div>

      {/* ── Upcoming Birthdays (from stats — lightweight) ── */}
      <AnimatePresence>
        {tab === 'all' && upcomingBirthdays.length > 0 && (
          <motion.div key="emp-bday" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="rounded-2xl border border-amber-200 overflow-hidden"
              style={{ background: 'linear-gradient(135deg,#fffbeb,#fef3c7)' }}>
              <div className="flex items-center gap-2 px-5 py-3 border-b border-amber-100">
                <RiCakeLine className="w-4 h-4 text-amber-600" />
                <p className="text-[13px] font-bold text-amber-900">Employee Birthday Reminders</p>
                <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-400 text-white text-[10px] font-black">{upcomingBirthdays.length}</span>
              </div>
              <div className="p-4 space-y-2">
                {upcomingBirthdays.map((emp) => <BirthdayCard key={emp.id} person={emp} type="employee" />)}
                <Link to="/employees" className="flex items-center gap-1.5 pt-1 text-[12px] font-bold text-amber-700 hover:text-amber-900 transition-colors">
                  <RiTeamLine className="w-3.5 h-3.5" /> View all employees →
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {tab === 'all' && upcomingOwnerBirthdays.length > 0 && (
          <motion.div key="owner-bday" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="rounded-2xl border border-violet-200 overflow-hidden"
              style={{ background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)' }}>
              <div className="flex items-center gap-2 px-5 py-3 border-b border-violet-100">
                <RiCakeLine className="w-4 h-4 text-violet-600" />
                <p className="text-[13px] font-bold text-violet-900">Owner Birthday Reminders</p>
                <span className="ml-auto px-2 py-0.5 rounded-full bg-violet-500 text-white text-[10px] font-black">{upcomingOwnerBirthdays.length}</span>
              </div>
              <div className="p-4 space-y-2">
                {upcomingOwnerBirthdays.map((own) => <BirthdayCard key={own.id} person={own} type="owner" />)}
                <Link to="/owners" className="flex items-center gap-1.5 pt-1 text-[12px] font-bold text-violet-700 hover:text-violet-900 transition-colors">
                  <RiVipCrownLine className="w-3.5 h-3.5" /> View all owners →
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Notification list ── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center"
          style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <RiBellLine className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-400">
            {tab !== 'all' ? `No ${NOTIF_CFG[tab]?.label ?? tab} notifications` : 'All caught up!'}
          </p>
          <p className="text-[12px] text-slate-300 mt-1">
            {!showRead && unread === 0 ? 'Toggle "Show Read" to see past notifications' : 'No alerts to show right now'}
          </p>
          <button onClick={handleGenerate}
            className="mt-4 flex items-center gap-1.5 text-[12px] font-bold text-accent-600 hover:text-accent-700 mx-auto">
            <RiRefreshLine className={cn('w-3.5 h-3.5', isGenerating && 'animate-spin')} />
            Refresh alerts from your data
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence mode="popLayout">
            {filtered.map((n, i) => (
              <motion.div key={n.id}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 40, scale: 0.95 }}
                transition={{ delay: Math.min(i * 0.025, 0.3) }}>
                <NotifCard notif={n}
                  onMarkRead={() => handleMarkRead(n.id)}
                  onDismiss={() => handleDismiss(n.id)} />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Clear read button */}
          {all.filter((n) => n.read).length > 3 && (
            <div className="flex justify-end pt-2">
              <button onClick={handleClearRead}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-400 hover:text-red-500 transition-colors">
                <RiDeleteBin2Line className="w-3.5 h-3.5" /> Clear all read notifications
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
