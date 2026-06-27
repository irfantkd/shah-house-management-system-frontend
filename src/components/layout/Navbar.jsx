import { useState, useRef, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RiMenu2Line, RiBellLine, RiSearchLine, RiCloseLine,
  RiArrowRightSLine, RiHome4Line, RiSettingsLine,
  RiLogoutBoxRLine, RiUserLine, RiArrowRightLine,
} from 'react-icons/ri';
import { selectAuthUser, logoutUser } from '../../store/slices/authSlice';
import { selectNotifications, selectUnreadCount, markRead } from '../../store/slices/notificationsSlice';
import { getNavLabel, ALL_NAV_ITEMS } from '../../constants/navigation';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

export default function Navbar({ onMenuClick }) {
  const dispatch      = useDispatch();
  const navigate      = useNavigate();
  const { pathname }  = useLocation();
  const user          = useSelector(selectAuthUser);
  const notifications = useSelector(selectNotifications);
  const unread        = useSelector(selectUnreadCount);
  const [notifOpen,  setNotifOpen]  = useState(false);
  const [userOpen,   setUserOpen]   = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const notifRef = useRef(null);
  const userRef  = useRef(null);

  const recentNotifs = notifications.slice(0, 5);
  const pageLabel    = getNavLabel(pathname);
  const pageItem     = ALL_NAV_ITEMS.find((i) => (i.path === '/' ? pathname === '/' : pathname.startsWith(i.path)));
  const PageIcon     = pageItem?.icon;

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userRef.current  && !userRef.current.contains(e.target))  setUserOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Ctrl+K / Cmd+K opens search
  useEffect(() => {
    const onKey = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const handleLogout = () => {
    setUserOpen(false);
    dispatch(logoutUser());
    toast.success('Signed out successfully');
    navigate('/login', { replace: true });
  };

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center px-4 sm:px-6 gap-3 sticky top-0 z-10 shrink-0">
      {/* Mobile hamburger */}
      <button onClick={onMenuClick}
        className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
        <RiMenu2Line className="w-5 h-5" />
      </button>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[13px] flex-1 min-w-0">
        <Link to="/" className="text-slate-400 hover:text-slate-600 transition-colors shrink-0">
          <RiHome4Line className="w-4 h-4" />
        </Link>
        {pathname !== '/' && (
          <>
            <RiArrowRightSLine className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <div className="flex items-center gap-1.5 min-w-0">
              {PageIcon && <PageIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
              <span className="text-slate-700 font-semibold truncate">{pageLabel}</span>
            </div>
          </>
        )}
      </nav>

      {/* Search button — desktop */}
      <button onClick={() => setSearchOpen(true)}
        className="hidden md:flex items-center gap-2.5 h-9 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 text-[13px] hover:border-slate-300 hover:bg-white transition-all w-48 shrink-0">
        <RiSearchLine className="w-3.5 h-3.5 shrink-0" />
        <span className="flex-1">Search…</span>
        <kbd className="text-[10px] bg-slate-200 text-slate-400 px-1.5 py-0.5 rounded font-mono shrink-0">⌘K</kbd>
      </button>
      {/* Search — mobile */}
      <button onClick={() => setSearchOpen(true)}
        className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
        <RiSearchLine className="w-4 h-4" />
      </button>

      {/* Notifications */}
      <div className="relative shrink-0" ref={notifRef}>
        <button onClick={() => { setNotifOpen((v) => !v); setUserOpen(false); }}
          className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
          <RiBellLine className="w-[18px] h-[18px]" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none ring-2 ring-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        <AnimatePresence>
          {notifOpen && (
            <motion.div initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }} transition={{ duration: 0.15 }}
              className="absolute right-0 top-11 w-80 bg-white rounded-2xl border border-slate-100 z-50 overflow-hidden"
              style={{ boxShadow: '0 8px 32px rgb(0 0 0/0.15)' }}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="text-[14px] font-bold text-slate-800">Notifications</span>
                {unread > 0 && <span className="text-[11px] text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full">{unread} unread</span>}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {recentNotifs.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <RiBellLine className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-[13px] text-slate-400">All caught up!</p>
                  </div>
                ) : recentNotifs.map((n) => (
                  <div key={n.id} onClick={() => dispatch(markRead(n.id))}
                    className={cn('flex gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors', !n.read && 'bg-blue-50/60')}>
                    <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', n.read ? 'bg-slate-200' : 'bg-accent-500')} />
                    <div className="min-w-0">
                      <p className={cn('text-[13px] truncate', n.read ? 'font-medium text-slate-600' : 'font-bold text-slate-800')}>{n.title}</p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{n.message}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50">
                <Link to="/notifications" onClick={() => setNotifOpen(false)}
                  className="flex items-center gap-1.5 text-[13px] text-accent-600 font-bold hover:text-accent-700 transition-colors">
                  View all notifications <RiArrowRightLine className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User dropdown */}
      <div className="relative shrink-0" ref={userRef}>
        <button onClick={() => { setUserOpen((v) => !v); setNotifOpen(false); }}
          className="flex items-center gap-2.5 pl-1 py-1 pr-2 rounded-xl hover:bg-slate-50 transition-colors">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold shadow-sm shrink-0"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
            {user?.initials ?? 'MR'}
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
                    style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                    {user?.initials ?? 'MR'}
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
                <button onClick={handleLogout}
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
    </header>
  );
}

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
      className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-[12vh] px-4 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: -16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.97 }} transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-2xl overflow-hidden border border-slate-100"
        style={{ boxShadow: '0 24px 64px rgb(0 0 0/0.25)' }}>
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
          <RiSearchLine className="w-4 h-4 text-slate-400 shrink-0" />
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, contracts, assets, repairs…"
            className="flex-1 text-[14px] text-slate-800 placeholder-slate-400 outline-none bg-transparent" />
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
            <RiCloseLine className="w-4 h-4" />
          </button>
        </div>
        <div className="py-2 max-h-72 overflow-y-auto">
          {navMatches.length === 0 ? (
            <p className="px-4 py-6 text-[13px] text-center text-slate-400">No pages match "{query}"</p>
          ) : navMatches.map((item) => (
            <Link key={item.path} to={item.path} onClick={onClose}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors group">
              <div className="w-8 h-8 rounded-lg bg-navy-50 flex items-center justify-center shrink-0 group-hover:bg-navy-100 transition-colors">
                <item.icon className="w-4 h-4 text-navy-600" />
              </div>
              <span className="text-[13px] font-semibold text-slate-700">{item.label}</span>
              <RiArrowRightLine className="w-3.5 h-3.5 text-slate-300 ml-auto group-hover:text-slate-500 transition-colors" />
            </Link>
          ))}
        </div>
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex items-center gap-3">
          <kbd className="text-[10px] bg-white border border-slate-200 text-slate-400 px-1.5 py-0.5 rounded font-mono">↵</kbd>
          <span className="text-[11px] text-slate-400">to open</span>
          <kbd className="ml-2 text-[10px] bg-white border border-slate-200 text-slate-400 px-1.5 py-0.5 rounded font-mono">Esc</kbd>
          <span className="text-[11px] text-slate-400">to close</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
