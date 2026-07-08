import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RiArrowLeftSLine, RiArrowRightSLine,
  RiLogoutBoxRLine, RiSettings3Line, RiAddLine,
  RiCheckLine, RiArrowUpDownLine, RiBuilding2Line,
  RiCloseLine, RiMapPin2Line,
} from 'react-icons/ri';
import ShahHouseLogo from '../ui/ShahHouseLogo';
import { NAV_GROUPS } from '../../constants/navigation';
import { selectAuthUser, logoutUser } from '../../store/slices/authSlice';
import { selectUnreadCount } from '../../store/slices/notificationsSlice';
import { selectUpcomingBirthdays } from '../../store/slices/employeesSlice';
import { selectOwnerBirthdays } from '../../store/slices/ownersSlice';
import {
  selectProperties, selectCurrentProperty, selectCurrentPropertyId,
  addProperty, setCurrentProperty,
} from '../../store/slices/propertiesSlice';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

const SIDEBAR_FULL = 260;
const SIDEBAR_MINI = 68;

const PROPERTY_TYPES = ['Villa', 'Flat', 'Apartment', 'Penthouse', 'House', 'Townhouse', 'Studio', 'Duplex'];
const PROPERTY_EMOJIS = ['🏛️', '🏡', '🏠', '🏢', '🏰', '🌊', '🌴', '🏘️', '🏗️', '🏚️'];

export default function Sidebar({ isOpen, onClose, collapsed, onToggleCollapse }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const user            = useSelector(selectAuthUser);
  const unread          = useSelector(selectUnreadCount);
  const birthdays       = useSelector(selectUpcomingBirthdays);
  const ownerBirthdays  = useSelector(selectOwnerBirthdays);
  const properties      = useSelector(selectProperties);
  const currentProperty = useSelector(selectCurrentProperty);
  const currentId       = useSelector(selectCurrentPropertyId);

  const [propMenuOpen, setPropMenuOpen] = useState(false);
  const [addPropOpen,  setAddPropOpen]  = useState(false);
  const menuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setPropMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    dispatch(logoutUser());
    toast.success('Signed out successfully');
    navigate('/login', { replace: true });
  };

  const handleSwitch = (id) => {
    dispatch(setCurrentProperty(id));
    setPropMenuOpen(false);
    toast.success(`Switched to ${properties.find((p) => p.id === id)?.name}`);
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
        <div className="flex items-center justify-between px-4 h-14 border-b border-white/[0.07] shrink-0">
          <ShahHouseLogo size={32} collapsed={collapsed} />
          <button onClick={onToggleCollapse}
            className="hidden lg:flex w-6 h-6 rounded-lg items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-colors shrink-0">
            {collapsed ? <RiArrowRightSLine className="w-4 h-4" /> : <RiArrowLeftSLine className="w-4 h-4" />}
          </button>
        </div>

        {/* ── Property Switcher ── */}
        <div ref={menuRef} className="relative shrink-0 px-2 py-2 border-b border-white/[0.07]">
          <button
            onClick={() => !collapsed && setPropMenuOpen((o) => !o)}
            title={collapsed ? (currentProperty?.name ?? 'Properties') : undefined}
            className={cn(
              'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all group',
              'hover:bg-white/8',
              collapsed && 'justify-center',
            )}
          >
            {/* Emoji badge */}
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[18px] shrink-0"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {currentProperty?.emoji ?? '🏛️'}
            </div>

            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
                  className="flex-1 min-w-0 text-left">
                  <p className="text-white text-[13px] font-bold truncate leading-tight">{currentProperty?.name ?? 'Shah Villa'}</p>
                  <p className="text-white/35 text-[10px] truncate flex items-center gap-1">
                    <RiBuilding2Line className="w-2.5 h-2.5 shrink-0" />
                    {currentProperty?.type ?? 'Villa'}
                    {currentProperty?.location ? ` · ${currentProperty.location.split(',')[0]}` : ''}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
                  <RiArrowUpDownLine className="w-3.5 h-3.5 text-white/25 group-hover:text-white/50 transition-colors shrink-0" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>

          {/* Property dropdown */}
          <AnimatePresence>
            {propMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.14 }}
                className="absolute left-2 right-2 top-full mt-1 z-50 rounded-2xl overflow-hidden"
                style={{ background: '#0a1f42', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}>

                {/* Header */}
                <div className="px-3 pt-2.5 pb-1.5 border-b border-white/[0.07]">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">My Properties</p>
                </div>

                {/* Property list */}
                <div className="py-1 max-h-52 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                  {properties.map((p) => (
                    <button key={p.id} onClick={() => handleSwitch(p.id)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2 transition-all text-left',
                        p.id === currentId ? 'bg-white/8' : 'hover:bg-white/5',
                      )}>
                      <span className="text-[16px] shrink-0">{p.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-[13px] font-semibold truncate leading-tight">{p.name}</p>
                        <p className="text-white/35 text-[10px] truncate flex items-center gap-1">
                          <RiBuilding2Line className="w-2.5 h-2.5 shrink-0" />{p.type}
                          {p.location ? ` · ${p.location.split(',')[0]}` : ''}
                        </p>
                      </div>
                      {p.id === currentId && (
                        <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                          <RiCheckLine className="w-3 h-3 text-emerald-400" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Add property */}
                <div className="border-t border-white/[0.07] py-1">
                  <button
                    onClick={() => { setPropMenuOpen(false); setAddPropOpen(true); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-all text-left">
                    <div className="w-6 h-6 rounded-lg border border-dashed border-white/20 flex items-center justify-center shrink-0">
                      <RiAddLine className="w-3.5 h-3.5 text-white/40" />
                    </div>
                    <span className="text-[13px] text-white/40 font-medium">Add Property</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2" style={{ scrollbarWidth: 'none' }}>
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-1">
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
                    className="px-3 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/25">
                    {group.label}
                  </motion.p>
                )}
              </AnimatePresence>
              {collapsed && <div className="h-3" />}

              {group.items.map((item) => {
                let badge, badgeColor;
                if (item.path === '/notifications') {
                  const total = unread + birthdays.length + ownerBirthdays.length;
                  if (total > 0) { badge = total; badgeColor = 'bg-red-500'; }
                } else if (item.path === '/employees' && birthdays.length > 0) {
                  badge = birthdays.length;
                  badgeColor = 'bg-amber-500';
                } else if (item.path === '/owners' && ownerBirthdays.length > 0) {
                  badge = ownerBirthdays.length;
                  badgeColor = 'bg-amber-500';
                }
                return (
                  <NavItem
                    key={item.path}
                    item={item}
                    collapsed={collapsed}
                    badge={badge}
                    badgeColor={badgeColor}
                    onClose={onClose}
                  />
                );
              })}
            </div>
          ))}
        </nav>

        {/* ── Footer ── */}
        <div className="border-t border-white/[0.07] shrink-0">
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

      {/* ── Add Property Modal ── */}
      <AddPropertyModal open={addPropOpen} onClose={() => setAddPropOpen(false)} />
    </>
  );
}

/* ── Nav Item ── */
function NavItem({ item, collapsed, badge, badgeColor = 'bg-red-500', onClose }) {
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
          <item.icon className={cn('w-4.5 h-4.5 shrink-0 transition-colors', isActive ? 'text-white' : 'text-white/50 group-hover:text-white/90')} />

          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
                className="whitespace-nowrap flex-1 truncate">
                {item.label}
              </motion.span>
            )}
          </AnimatePresence>

          {badge && !collapsed && (
            <span className={cn('ml-auto shrink-0 h-5 min-w-5 px-1.5 rounded-full text-white text-[10px] font-bold flex items-center justify-center leading-none', badgeColor)}>
              {badge > 99 ? '99+' : badge}
            </span>
          )}
          {badge && collapsed && (
            <span className={cn('absolute top-1 right-1 w-2 h-2 rounded-full ring-2 ring-navy-900', badgeColor)} />
          )}

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

/* ── Add Property Modal ── */
function AddPropertyModal({ open, onClose }) {
  const dispatch = useDispatch();
  const [form, setForm] = useState({ name: '', type: 'Villa', location: '', emoji: '🏛️' });
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Property name is required';
    if (!form.location.trim()) e.location = 'Location is required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    dispatch(addProperty({
      name:     form.name.trim(),
      type:     form.type,
      location: form.location.trim(),
      emoji:    form.emoji,
    }));
    toast.success(`${form.name} added & activated`);
    setForm({ name: '', type: 'Villa', location: '', emoji: '🏛️' });
    setErrors({});
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-60 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -16 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="w-full max-w-md rounded-3xl overflow-hidden"
            style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.4)' }}
            onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="relative px-6 pt-5 pb-5 overflow-hidden"
              style={{ background: 'linear-gradient(150deg, #0a172e 0%, #0c1f3f 55%, #0e2550 100%)' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#3b82f6,#6366f1)', opacity:0.9 }} />
              <div style={{ position:'absolute', top:-40, right:-40, width:140, height:140, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.06)', pointerEvents:'none' }} />
              <div style={{ position:'absolute', bottom:-8, right:16, fontSize:72, fontWeight:900, color:'rgba(255,255,255,0.03)', lineHeight:1, userSelect:'none' }}>
                {form.emoji}
              </div>
              <div className="relative flex items-center justify-between" style={{ zIndex:5 }}>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-white/30 mb-1">New Property</p>
                  <h2 className="text-[20px] font-black text-white leading-tight">Add Property</h2>
                  <p className="text-[12px] text-white/40 mt-0.5">Each property has its own isolated data</p>
                </div>
                <button onClick={onClose}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
                  <RiCloseLine className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="bg-white px-6 pt-5 pb-6 space-y-4">

              {/* Emoji picker */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Choose Icon</label>
                <div className="flex flex-wrap gap-2">
                  {PROPERTY_EMOJIS.map((e) => (
                    <button key={e} onClick={() => set('emoji', e)}
                      className={cn(
                        'w-10 h-10 rounded-xl text-[22px] flex items-center justify-center transition-all',
                        form.emoji === e
                          ? 'bg-navy-900 shadow-lg scale-105'
                          : 'bg-slate-100 hover:bg-slate-200',
                      )}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Property Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. Marina Apartment, Palm Villa…"
                  className={cn(
                    'w-full h-11 px-4 rounded-2xl border text-[14px] text-slate-800 placeholder-slate-300 outline-none transition-all',
                    'focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-slate-50 focus:bg-white',
                    errors.name ? 'border-red-300 bg-red-50' : 'border-slate-200',
                  )}
                />
                {errors.name && <p className="text-[11px] text-red-500 mt-1">{errors.name}</p>}
              </div>

              {/* Type */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Property Type</label>
                <div className="flex flex-wrap gap-2">
                  {PROPERTY_TYPES.map((t) => (
                    <button key={t} onClick={() => set('type', t)}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-[12px] font-bold border transition-all',
                        form.type === t
                          ? 'bg-navy-900 text-white border-navy-900'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700',
                      )}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  <RiMapPin2Line className="inline w-3 h-3 mr-1" />Location *
                </label>
                <input
                  value={form.location}
                  onChange={(e) => set('location', e.target.value)}
                  placeholder="e.g. Downtown Dubai, Business Bay…"
                  className={cn(
                    'w-full h-11 px-4 rounded-2xl border text-[14px] text-slate-800 placeholder-slate-300 outline-none transition-all',
                    'focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-slate-50 focus:bg-white',
                    errors.location ? 'border-red-300 bg-red-50' : 'border-slate-200',
                  )}
                />
                {errors.location && <p className="text-[11px] text-red-500 mt-1">{errors.location}</p>}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button onClick={onClose}
                  className="flex-1 h-11 rounded-2xl text-[14px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all">
                  Cancel
                </button>
                <button onClick={handleSubmit}
                  className="flex-1 h-11 rounded-2xl text-[14px] font-bold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #0b1d3a, #1e3a6e)' }}>
                  Add Property
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
