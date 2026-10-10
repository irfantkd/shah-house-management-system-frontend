import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RiMenu2Line, RiBellLine, RiSearchLine, RiCloseLine,
  RiArrowRightSLine, RiHome4Line, RiSettingsLine,
  RiLogoutBoxRLine, RiUserLine, RiArrowRightLine,
  RiCheckDoubleLine, RiDeleteBin2Line, RiRefreshLine,
  RiCalendarLine, RiToolsLine, RiShieldLine, RiAlertLine,
  RiCarLine, RiCakeLine, RiFileList3Line, RiCheckboxCircleLine,
  RiNotificationLine, RiPassportLine,
} from 'react-icons/ri';
import { selectAuthUser, logoutUser } from '../../store/slices/authSlice';
import { useGetQuery, usePatchMutation, useDeleteMutation, usePostMutation } from '../../api/apiSlice';
import { selectCurrentPropertyId } from '../../store/slices/propertiesSlice';
import { getNavLabel, ALL_NAV_ITEMS } from '../../constants/navigation';
import { cn } from '../../utils/cn';
import { getInitials } from '../../utils/getInitials';
import { playNotificationChime, showBrowserNotification } from '../../utils/notificationUtils';
import toast from 'react-hot-toast';

/* ── Notification type config ──────────────────────────────────────────────── */
const NOTIF_CFG = {
  contract:    { icon: RiFileList3Line,      dot: '#d97706', bg: '#fffbeb', color: '#b45309', label: 'Contract'    },
  maintenance: { icon: RiToolsLine,          dot: '#16a34a', bg: '#f0fdf4', color: '#15803d', label: 'Maintenance' },
  repair:      { icon: RiAlertLine,          dot: '#ea580c', bg: '#fff7ed', color: '#c2410c', label: 'Repair'      },
  warranty:    { icon: RiShieldLine,         dot: '#7c3aed', bg: '#f5f3ff', color: '#6d28d9', label: 'Warranty'    },
  birthday:    { icon: RiCakeLine,           dot: '#ec4899', bg: '#fdf2f8', color: '#be185d', label: 'Birthday'    },
  car:         { icon: RiCarLine,            dot: '#0891b2', bg: '#ecfeff', color: '#0e7490', label: 'Vehicle'     },
  passport:    { icon: RiPassportLine,       dot: '#0891b2', bg: '#f0f9ff', color: '#0e7490', label: 'Passport'    },
  employee:    { icon: RiShieldLine,         dot: '#dc2626', bg: '#fff1f2', color: '#b91c1c', label: 'Visa'        },
  general:     { icon: RiNotificationLine,   dot: '#64748b', bg: '#f8fafc', color: '#475569', label: 'General'     },
};

const PRIORITY_DOT = { high: '#dc2626', medium: '#d97706', low: '#94a3b8' };

function fmtAgo(iso) {
  const ms  = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 2)  return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24)  return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return d < 30 ? `${d}d ago` : new Date(iso).toLocaleDateString('en-AE', { day: 'numeric', month: 'short' });
}

function fmtDate(s) {
  if (!s) return '';
  const d = new Date(s + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  const diff  = Math.ceil((d - today) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0)  return `${Math.abs(diff)}d overdue`;
  if (diff <= 7) return `In ${diff}d`;
  return d.toLocaleDateString('en-AE', { day: 'numeric', month: 'short' });
}

/* ── Individual notification row ─────────────────────────────────────────── */
function NotifRow({ n, onRead, onDelete }) {
  const cfg  = NOTIF_CFG[n.type] ?? NOTIF_CFG.general;
  const Icon = cfg.icon;
  const dateLabel = fmtDate(n.date);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 24, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.16 }}
    >
      <Link
        to={n.link || '/notifications'}
        onClick={() => !n.read && onRead(n.id)}
        className={cn(
          'flex gap-3 px-4 py-3.5 border-b border-slate-50/80 transition-colors group relative',
          n.read ? 'hover:bg-slate-50/70' : 'bg-slate-50/50 hover:bg-slate-50',
        )}
      >
        {/* Priority left stripe */}
        {!n.read && (
          <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full"
            style={{ background: PRIORITY_DOT[n.priority] ?? '#94a3b8' }} />
        )}

        {/* Type icon circle */}
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm"
          style={{ background: cfg.bg, border: `1px solid ${cfg.dot}22` }}>
          <Icon className="w-[17px] h-[17px]" style={{ color: cfg.dot }} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Title + dismiss */}
          <div className="flex items-start justify-between gap-1">
            <p className={cn('text-[12.5px] leading-snug line-clamp-2 pr-1',
              n.read ? 'font-medium text-slate-500' : 'font-bold text-slate-800')}>
              {n.title}
            </p>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(n.id); }}
              className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-md flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0 mt-0.5"
            >
              <RiCloseLine className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Message body */}
          {n.message && (
            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 leading-relaxed">{n.message}</p>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: cfg.bg, color: cfg.color }}>
              {cfg.label}
            </span>
            {n.priority === 'high' && !n.read && (
              <span className="text-[10px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Urgent</span>
            )}
            {dateLabel && (
              <span className={cn('text-[10px] font-semibold',
                dateLabel.includes('overdue') ? 'text-red-500' :
                dateLabel === 'Today' || dateLabel === 'Tomorrow' ? 'text-amber-600' : 'text-slate-400')}>
                {dateLabel}
              </span>
            )}
            <span className="text-[10px] text-slate-300 ml-auto shrink-0">{fmtAgo(n.createdAt)}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ── Main Navbar ─────────────────────────────────────────────────────────── */
export default function Navbar({ onMenuClick }) {
  const dispatch     = useDispatch();
  const navigate     = useNavigate();
  const { pathname } = useLocation();
  const user         = useSelector(selectAuthUser);
  const propertyId   = useSelector(selectCurrentPropertyId);

  const { data: notifications = [], refetch: refetchNotifs } = useGetQuery(
    { path: '/notifications', params: { propertyId } },
    { skip: !propertyId, pollingInterval: 60000 }, // poll every 60s
  );
  const [markReadMut]   = usePatchMutation();
  const [markAllMut]    = usePatchMutation();
  const [deleteMut]     = useDeleteMutation();
  const [generateMut]   = usePostMutation();

  const unread    = notifications.filter((n) => !n.read).length;
  const highCount = notifications.filter((n) => !n.read && n.priority === 'high').length;

  const [notifOpen,     setNotifOpen]     = useState(false);
  const [userOpen,      setUserOpen]      = useState(false);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [notifFilter,   setNotifFilter]   = useState('all');
  const [isGenerating,  setIsGenerating]  = useState(false);
  const [bellShake,     setBellShake]     = useState(false);

  const notifRef    = useRef(null);
  const userRef     = useRef(null);
  const prevUnread  = useRef(unread);

  const pageLabel = getNavLabel(pathname);
  const pageItem  = ALL_NAV_ITEMS.find((i) => (i.path === '/' ? pathname === '/' : pathname.startsWith(i.path)));
  const PageIcon  = pageItem?.icon;

  /* ── Detect new unread notifications — play sound + shake bell ── */
  useEffect(() => {
    if (unread > prevUnread.current) {
      playNotificationChime();
      setBellShake(true);
      setTimeout(() => setBellShake(false), 1000);
      // Also show browser OS notification if not already open
      if (!notifOpen) {
        const newest = notifications.find((n) => !n.read);
        if (newest) {
          showBrowserNotification(newest.title, {
            body: newest.message || '',
            url: newest.link || '/notifications',
          });
        }
      }
    }
    prevUnread.current = unread;
  }, [unread]);

  /* ── Click-outside close ── */
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userRef.current  && !userRef.current.contains(e.target))  setUserOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Ctrl+K search shortcut ── */
  useEffect(() => {
    const onKey = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const handleMarkRead = useCallback(async (id) => {
    try { await markReadMut({ path: `/notifications/${id}/read`, body: {} }).unwrap(); } catch { /* silent */ }
  }, [markReadMut]);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllMut({ path: `/notifications/read-all?propertyId=${propertyId}`, body: {} }).unwrap();
      toast.success('All marked as read');
    } catch { toast.error('Failed'); }
  }, [markAllMut, propertyId]);

  const handleDelete = useCallback(async (id) => {
    try { await deleteMut({ path: `/notifications/${id}` }).unwrap(); } catch { /* silent */ }
  }, [deleteMut]);

  const handleGenerate = async () => {
    if (!propertyId || isGenerating) return;
    setIsGenerating(true);
    try {
      const res = await generateMut({ path: `/notifications/generate?propertyId=${propertyId}`, body: {} }).unwrap();
      refetchNotifs();
      toast.success(res?.message || 'Alerts refreshed');
    } catch { toast.error('Failed to refresh alerts'); }
    finally { setIsGenerating(false); }
  };

  const confirmLogout = () => {
    setLogoutConfirm(false);
    dispatch(logoutUser());
    toast.success('Signed out successfully');
    navigate('/login', { replace: true });
  };

  /* Filtered notification list */
  const TYPES_ORDER = ['contract', 'maintenance', 'repair', 'warranty', 'birthday', 'car', 'passport', 'employee', 'general'];
  const filtered = notifications.filter((n) => notifFilter === 'all' ? true : n.type === notifFilter).slice(0, 30);
  const typeCounts = {};
  notifications.forEach((n) => { if (!n.read) typeCounts[n.type] = (typeCounts[n.type] ?? 0) + 1; });

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center px-4 sm:px-6 gap-3 sticky top-0 z-40 shrink-0">

      {/* Mobile hamburger */}
      <button onClick={onMenuClick}
        className="lg:hidden w-10 h-10 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 active:bg-slate-100 transition-colors">
        <RiMenu2Line className="w-5 h-5" />
      </button>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 flex-1 min-w-0">
        {/* Desktop: home icon (hidden on mobile) */}
        <Link to="/" className="hidden sm:flex text-slate-400 hover:text-slate-600 transition-colors shrink-0">
          <RiHome4Line className="w-4 h-4" />
        </Link>
        {pathname !== '/' ? (
          <>
            <RiArrowRightSLine className="hidden sm:block w-3.5 h-3.5 text-slate-300 shrink-0" />
            <div className="flex items-center gap-1.5 min-w-0">
              {PageIcon && (
                <PageIcon className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-accent-600 sm:text-slate-500 shrink-0" />
              )}
              <span className="text-[15px] sm:text-[13px] font-bold sm:font-semibold text-slate-800 sm:text-slate-700 truncate">
                {pageLabel}
              </span>
            </div>
          </>
        ) : (
          /* Mobile: Dashboard page — show label since home icon is hidden */
          <div className="flex sm:hidden items-center gap-1.5 min-w-0">
            <RiHome4Line className="w-4 h-4 text-accent-600 shrink-0" />
            <span className="text-[15px] font-bold text-slate-800">Dashboard</span>
          </div>
        )}
      </nav>

      {/* Search — desktop */}
      <button onClick={() => setSearchOpen(true)}
        className="hidden md:flex items-center gap-2.5 h-9 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 text-[13px] hover:border-slate-300 hover:bg-white transition-all w-48 shrink-0">
        <RiSearchLine className="w-3.5 h-3.5 shrink-0" />
        <span className="flex-1">Search…</span>
        <kbd className="text-[10px] bg-slate-200 text-slate-400 px-1.5 py-0.5 rounded font-mono shrink-0">⌘K</kbd>
      </button>
      {/* Search — mobile */}
      <button onClick={() => setSearchOpen(true)}
        className="md:hidden w-10 h-10 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 active:bg-slate-100 transition-colors">
        <RiSearchLine className="w-4 h-4" />
      </button>

      {/* ── Notifications bell ── */}
      <div className="relative shrink-0" ref={notifRef}>
        <button
          onClick={() => { setNotifOpen((v) => !v); setUserOpen(false); }}
          className="relative w-10 h-10 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 active:bg-slate-100 transition-colors"
        >
          <motion.div
            animate={bellShake ? { rotate: [0, -18, 18, -14, 14, -8, 8, 0] } : {}}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
          >
            <RiBellLine className="w-4.5 h-4.5" />
          </motion.div>

          {/* Unread badge */}
          {unread > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={cn(
                'absolute top-0.5 right-0.5 min-w-4.5 h-4.5 rounded-full text-white text-[9px] font-black flex items-center justify-center px-1 leading-none ring-2 ring-white',
                highCount > 0 ? 'bg-danger-500' : 'bg-accent-500',
              )}
            >
              {unread > 99 ? '99+' : unread}
            </motion.span>
          )}
        </button>

        {/* ── Notification dropdown ── */}
        <AnimatePresence>
          {notifOpen && (
            <>
              {/* Mobile backdrop */}
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-navy-950/50 backdrop-blur-sm z-40 sm:hidden"
                onClick={() => setNotifOpen(false)}
              />

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ type: 'spring', duration: 0.28, bounce: 0.1 }}
                className={cn(
                  'bg-white border border-slate-100/80 z-50 flex flex-col overflow-hidden',
                  /* mobile: fixed full-width panel below navbar, clears bottom nav */
                  'fixed left-2 right-2 top-[4.25rem] rounded-2xl',
                  /* desktop: absolute dropdown anchored to bell */
                  'sm:absolute sm:inset-auto sm:right-0 sm:top-12 sm:w-[22rem]',
                )}
                style={{
                  boxShadow: 'var(--shadow-overlay)',
                  maxHeight: 'calc(100svh - 5.5rem - 76px)',
                  /* On desktop restore full height */
                }}
              >
                {/* ── Panel header ── */}
                <div className="px-4 pt-4 pb-3 border-b border-slate-100 shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' }}>
                        <RiBellLine className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-[14px] font-black text-navy-900 tracking-tight">Notifications</span>
                      {unread > 0 && (
                        <span className={cn(
                          'text-[10px] font-black px-2 py-0.5 rounded-full leading-none',
                          highCount > 0 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600',
                        )}>
                          {unread} new
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-0.5">
                      <button onClick={handleGenerate} title="Refresh alerts"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all">
                        <RiRefreshLine className={cn('w-3.5 h-3.5', isGenerating && 'animate-spin')} />
                      </button>
                      {unread > 0 && (
                        <button onClick={handleMarkAllRead} title="Mark all as read"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all">
                          <RiCheckDoubleLine className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {/* Close — always visible on mobile */}
                      <button onClick={() => setNotifOpen(false)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all sm:hidden">
                        <RiCloseLine className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Type filter tabs */}
                  <div className="flex gap-1 overflow-x-auto no-scrollbar -mx-0.5 px-0.5">
                    <button
                      onClick={() => setNotifFilter('all')}
                      className={cn(
                        'flex items-center gap-1 px-2.5 h-6 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all shrink-0',
                        notifFilter === 'all' ? 'bg-navy-900 text-white' : 'text-slate-500 hover:bg-slate-100',
                      )}
                    >
                      All
                      {unread > 0 && (
                        <span className={cn('text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 leading-none',
                          notifFilter === 'all' ? 'bg-white/20 text-white' : 'bg-red-500 text-white')}>
                          {unread > 9 ? '9+' : unread}
                        </span>
                      )}
                    </button>
                    {TYPES_ORDER.filter((t) => typeCounts[t] > 0).map((type) => {
                      const cfg = NOTIF_CFG[type];
                      const TIcon = cfg.icon;
                      const active = notifFilter === type;
                      return (
                        <button key={type}
                          onClick={() => setNotifFilter(active ? 'all' : type)}
                          className="flex items-center gap-1 px-2 h-6 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all shrink-0"
                          style={active
                            ? { background: cfg.dot, color: '#fff' }
                            : { color: cfg.color, background: cfg.bg }}
                        >
                          <TIcon className="w-3 h-3 shrink-0" />
                          {cfg.label}
                          <span className="font-black text-[9px]">{typeCounts[type]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Notification list ── */}
                <div className="flex-1 overflow-y-auto overscroll-contain">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {filtered.length === 0 ? (
                      <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="py-10 text-center px-4">
                        <div className="w-11 h-11 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                          <RiBellLine className="w-5 h-5 text-slate-200" />
                        </div>
                        <p className="text-[13px] font-semibold text-slate-400">
                          {notifFilter !== 'all' ? `No ${NOTIF_CFG[notifFilter]?.label} alerts` : 'All caught up!'}
                        </p>
                        <p className="text-[11px] text-slate-300 mt-1">
                          {notifFilter !== 'all' ? 'Switch to All to see everything' : 'No notifications yet'}
                        </p>
                        <button onClick={handleGenerate}
                          className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700 mx-auto transition-colors">
                          <RiRefreshLine className={cn('w-3 h-3', isGenerating && 'animate-spin')} />
                          Refresh alerts
                        </button>
                      </motion.div>
                    ) : (
                      filtered.map((n) => (
                        <NotifRow key={n.id} n={n}
                          onRead={handleMarkRead}
                          onDelete={handleDelete}
                        />
                      ))
                    )}
                  </AnimatePresence>
                </div>

                {/* ── Panel footer ── */}
                <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/80 shrink-0 flex items-center justify-between">
                  <Link to="/notifications" onClick={() => setNotifOpen(false)}
                    className="flex items-center gap-1.5 text-[12px] font-bold text-blue-600 hover:text-blue-700 transition-colors">
                    View all
                    <RiArrowRightLine className="w-3.5 h-3.5" />
                  </Link>
                  {notifications.filter((n) => n.read).length > 5 && (
                    <button
                      onClick={async () => {
                        try { await deleteMut({ path: `/notifications?propertyId=${propertyId}` }).unwrap(); toast.success('Cleared'); }
                        catch { /* silent */ }
                      }}
                      className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <RiDeleteBin2Line className="w-3 h-3" />
                      Clear read
                    </button>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* ── User dropdown ── */}
      <div className="relative shrink-0" ref={userRef}>
        <button onClick={() => { setUserOpen((v) => !v); setNotifOpen(false); }}
          className="flex items-center gap-2.5 pl-1 py-1 pr-2 rounded-xl hover:bg-slate-50 transition-colors">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold shadow-sm shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--brand-darkest), var(--brand-mid))' }}>
            {getInitials(user?.name)}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-[13px] font-bold text-slate-800 leading-tight">{user?.name ?? 'Mirfan'}</p>
            <p className="text-[11px] text-slate-400 leading-tight">{user?.role ?? 'Home Owner'}</p>
          </div>
        </button>

        <AnimatePresence>
          {userOpen && (
            <motion.div initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }} transition={{ duration: 0.15 }}
              className="absolute right-0 top-12 w-56 bg-white rounded-2xl border border-slate-100 z-50 overflow-hidden"
              style={{ boxShadow: '0 8px 32px rgb(0 0 0/0.12)' }}>
              <div className="px-4 py-3.5 border-b border-slate-100" style={{ background: 'linear-gradient(135deg, #f0f5fb, #ffffff)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold shrink-0"
                    style={{ background: 'linear-gradient(135deg, var(--brand-darkest), var(--brand-mid))' }}>
                    {getInitials(user?.name)}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-navy-900 leading-tight">{user?.name ?? 'Mirfan'}</p>
                    <p className="text-[11px] text-slate-500">{user?.email ?? 'admin@villa.ae'}</p>
                  </div>
                </div>
              </div>
              <div className="py-1">
                <Link to="/settings" onClick={() => setUserOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                  <RiUserLine className="w-4 h-4 text-slate-400" />My Profile
                </Link>
                <Link to="/settings" onClick={() => setUserOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                  <RiSettingsLine className="w-4 h-4 text-slate-400" />Settings
                </Link>
              </div>
              <div className="border-t border-slate-100 py-1">
                <button onClick={() => { setUserOpen(false); setLogoutConfirm(true); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold text-red-500 hover:bg-red-50 transition-colors">
                  <RiLogoutBoxRLine className="w-4 h-4" />Sign Out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Search modal */}
      <AnimatePresence>
        {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
      </AnimatePresence>

      {/* Logout confirmation */}
      <AnimatePresence>
        {logoutConfirm && <LogoutModal onCancel={() => setLogoutConfirm(false)} onConfirm={confirmLogout} />}
      </AnimatePresence>
    </header>
  );
}

/* ── Logout confirmation modal ──────────────────────────────────────────── */
function LogoutModal({ onCancel, onConfirm }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-sm"
      style={{ background: 'rgba(0,0,0,0.45)' }} onClick={onCancel}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }} transition={{ duration: 0.18, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-2xl overflow-hidden"
        style={{ boxShadow: '0 24px 64px rgba(11,29,58,0.20)' }}>
        <div className="flex flex-col items-center pt-8 pb-5 px-6 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <RiLogoutBoxRLine className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-[17px] font-bold text-slate-800 mb-1.5">Sign Out?</h2>
          <p className="text-[13px] text-slate-500 leading-relaxed">
            You will be signed out of Shah House Management System. Any unsaved changes will be lost.
          </p>
        </div>
        <div className="flex gap-2.5 px-6 pb-6">
          <button onClick={onCancel}
            className="flex-1 h-10 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 h-10 rounded-xl bg-red-500 text-[13px] font-semibold text-white hover:bg-red-600 active:scale-[0.98] transition-all">
            Yes, Sign Out
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Search modal ────────────────────────────────────────────────────────── */
function SearchModal({ onClose }) {
  const [query, setQuery] = useState('');
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const navMatches = query.length > 0
    ? ALL_NAV_ITEMS.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()))
    : ALL_NAV_ITEMS.slice(0, 8);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center sm:pt-[12vh] px-0 sm:px-4 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.97 }} transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-white sm:rounded-2xl overflow-hidden border-0 sm:border sm:border-slate-100 flex flex-col"
        style={{
          boxShadow: '0 24px 64px rgb(0 0 0/0.25)',
          /* Mobile: full-width from top, limited height so keyboard doesn't obscure */
          maxHeight: 'calc(var(--vh, 100vh) * 0.75)',
        }}>
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100 shrink-0">
          <RiSearchLine className="w-4.5 h-4.5 text-slate-400 shrink-0" />
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, contracts, assets, repairs…"
            className="flex-1 text-[16px] sm:text-[14px] text-slate-800 placeholder-slate-400 outline-none bg-transparent" />
          <button onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 active:bg-slate-200 transition-colors shrink-0">
            <RiCloseLine className="w-4.5 h-4.5" />
          </button>
        </div>
        <div className="py-2 flex-1 overflow-y-auto overscroll-contain">
          {navMatches.length === 0 ? (
            <p className="px-4 py-8 text-[13px] text-center text-slate-400">No pages match "{query}"</p>
          ) : navMatches.map((item) => (
            <Link key={item.path} to={item.path} onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 sm:py-2.5 hover:bg-slate-50 active:bg-slate-50 transition-colors group">
              <div className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl sm:rounded-lg bg-navy-50 flex items-center justify-center shrink-0 group-hover:bg-navy-100 transition-colors">
                <item.icon className="w-4.5 h-4.5 sm:w-4 sm:h-4 text-navy-600" />
              </div>
              <span className="text-[14px] sm:text-[13px] font-semibold text-slate-700">{item.label}</span>
              <RiArrowRightLine className="w-3.5 h-3.5 text-slate-300 ml-auto group-hover:text-slate-500 transition-colors" />
            </Link>
          ))}
        </div>
        <div className="px-4 py-3 sm:py-2.5 border-t border-slate-100 bg-slate-50 flex items-center gap-3 shrink-0">
          {/* Mobile hint */}
          <span className="sm:hidden text-[11px] text-slate-400">Tap any result to navigate</span>
          {/* Desktop keyboard shortcuts */}
          <kbd className="hidden sm:inline text-[10px] bg-white border border-slate-200 text-slate-400 px-1.5 py-0.5 rounded font-mono">↵</kbd>
          <span className="hidden sm:inline text-[11px] text-slate-400">to open</span>
          <kbd className="hidden sm:inline ml-2 text-[10px] bg-white border border-slate-200 text-slate-400 px-1.5 py-0.5 rounded font-mono">Esc</kbd>
          <span className="hidden sm:inline text-[11px] text-slate-400">to close</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
