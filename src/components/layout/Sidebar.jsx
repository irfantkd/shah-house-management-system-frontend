import { useDispatch, useSelector } from 'react-redux';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RiArrowLeftSLine, RiArrowRightSLine, RiHome4Line,
  RiLogoutBoxRLine, RiSettings3Line,
} from 'react-icons/ri';
import { NAV_GROUPS } from '../../constants/navigation';
import { selectAuthUser, logoutUser } from '../../store/slices/authSlice';
import { selectUnreadCount } from '../../store/slices/notificationsSlice';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

const SIDEBAR_FULL = 260;
const SIDEBAR_MINI = 68;

export default function Sidebar({ isOpen, onClose, collapsed, onToggleCollapse }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user     = useSelector(selectAuthUser);
  const unread   = useSelector(selectUnreadCount);

  const handleLogout = () => {
    dispatch(logoutUser());
    toast.success('Signed out successfully');
    navigate('/login', { replace: true });
  };

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-20 lg:hidden backdrop-blur-sm" />
        )}
      </AnimatePresence>

      <motion.aside
        animate={{ width: collapsed ? SIDEBAR_MINI : SIDEBAR_FULL }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          'fixed left-0 top-0 h-full z-30 flex flex-col overflow-hidden select-none',
          'transition-transform duration-300 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{ background: 'linear-gradient(180deg, #0b1d3a 0%, #0f2648 100%)', boxShadow: '4px 0 24px rgb(0 0 0/0.25)' }}
      >
        {/* ── Logo ── */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-white/[0.07] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-accent-600 flex items-center justify-center shrink-0 shadow-lg shadow-accent-900/50">
              <RiHome4Line className="w-4 h-4 text-white" />
            </div>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <p className="text-white font-bold text-[15px] leading-tight whitespace-nowrap">Shah House</p>
                  <p className="text-white/35 text-[10px] whitespace-nowrap">Property Management</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button onClick={onToggleCollapse}
            className="hidden lg:flex w-7 h-7 rounded-lg items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-colors shrink-0">
            {collapsed ? <RiArrowRightSLine className="w-4 h-4" /> : <RiArrowLeftSLine className="w-4 h-4" />}
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2" style={{ scrollbarWidth: 'none' }}>
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-1">
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
                    className="px-3 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white/25">
                    {group.label}
                  </motion.p>
                )}
              </AnimatePresence>
              {collapsed && <div className="h-3" />}

              {group.items.map((item) => (
                <NavItem
                  key={item.path}
                  item={item}
                  collapsed={collapsed}
                  badge={item.path === '/notifications' ? (unread > 0 ? unread : undefined) : undefined}
                  onClose={onClose}
                />
              ))}
            </div>
          ))}
        </nav>

        {/* ── Footer ── */}
        <div className="border-t border-white/[0.07] shrink-0">
          {/* Settings quick link */}
          <div className="px-2 pt-2">
            <NavLink to="/settings" onClick={onClose}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all',
                collapsed && 'justify-center',
                isActive ? 'bg-accent-600 text-white' : 'text-white/40 hover:text-white hover:bg-white/8',
              )}>
              <RiSettings3Line className="w-4 h-4 shrink-0" />
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
                    className="whitespace-nowrap">Settings</motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          </div>

          {/* User card + logout */}
          <div className={cn('flex items-center gap-3 px-4 py-3', collapsed && 'justify-center px-2')}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-[12px] font-bold shadow"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
              {user?.initials ?? 'MR'}
            </div>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
                  className="flex-1 min-w-0">
                  <p className="text-white text-[13px] font-semibold truncate leading-tight">{user?.name ?? 'Home Owner'}</p>
                  <p className="text-white/35 text-[11px] truncate">{user?.email ?? ''}</p>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
                  onClick={handleLogout}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-white/10 transition-all shrink-0"
                  title="Sign out">
                  <RiLogoutBoxRLine className="w-4 h-4" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.aside>
    </>
  );
}

function NavItem({ item, collapsed, badge, onClose }) {
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      onClick={() => onClose?.()}
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 mb-0.5 group',
          isActive
            ? 'bg-accent-600 text-white shadow-md shadow-accent-900/30'
            : 'text-white/50 hover:text-white hover:bg-white/8',
          collapsed && 'justify-center px-0',
        )
      }
    >
      {({ isActive }) => (
        <>
          <item.icon className={cn('w-[18px] h-[18px] shrink-0 transition-colors', isActive ? 'text-white' : 'text-white/50 group-hover:text-white/90')} />

          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
                className="whitespace-nowrap flex-1 truncate">
                {item.label}
              </motion.span>
            )}
          </AnimatePresence>

          {badge && !collapsed && (
            <span className="ml-auto shrink-0 h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
          {badge && collapsed && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-navy-900" />
          )}

          {/* Tooltip (collapsed) */}
          {collapsed && (
            <div className="absolute left-full ml-2.5 px-3 py-1.5 bg-navy-800 border border-white/10 text-white text-[12px] font-semibold rounded-xl whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity shadow-xl z-50">
              {item.label}{badge ? ` · ${badge} new` : ''}
            </div>
          )}
        </>
      )}
    </NavLink>
  );
}
