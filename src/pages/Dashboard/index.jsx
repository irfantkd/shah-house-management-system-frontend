import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import {
  RiFileList3Line, RiToolsLine, RiAlertLine, RiCalendarCheckLine,
  RiArrowRightLine, RiMapPin2Line, RiBuildingLine,
  RiHome4Line, RiBankCardLine, RiTimeLine, RiCheckboxCircleLine,
  RiUploadCloudLine, RiHammerLine, RiCarLine, RiGasStationLine,
  RiUserLine, RiTeamLine, RiShieldLine, RiBellLine, RiReceiptLine,
} from 'react-icons/ri';
import {
  BedDouble, ShowerHead, UtensilsCrossed, Sofa, Utensils,
  TreeDeciduous, Waves, Car, Briefcase, Package, Wrench,
  Wind, Sun, MapPin, Building2, Home, Banknote, AlertTriangle,
} from 'lucide-react';
import { useGetQuery } from '../../api/apiSlice';
import { selectCurrentPropertyId } from '../../store/slices/propertiesSlice';
import { selectAuthUser }           from '../../store/slices/authSlice';
import { selectCurrency }           from '../../store/slices/settingsSlice';
import { fmtCurrency }              from '../../utils/fmtCurrency';
import { cn } from '../../utils/cn';
import QuickFuelModal        from '../Cars/QuickFuelModal';
import QuickExpenseModal     from '../Cars/QuickExpenseModal';
import QuickHomeExpenseModal from './QuickHomeExpenseModal';

const LOW_BALANCE = 500;
const fmt = (n) => Number(n ?? 0).toLocaleString('en-AE', { maximumFractionDigits: 0 });

function fmtRelative(dateStr) {
  if (!dateStr) return '';
  const days = Math.floor((new Date() - new Date(dateStr + 'T00:00:00')) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)  return `${days}d ago`;
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-AE', { day: 'numeric', month: 'short' });
}
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
function getDaysUntil(d) { return Math.ceil((new Date(d) - new Date()) / 86400000); }

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay, ease: [0.4, 0, 0.2, 1] },
});

const STATUS_CFG = {
  scheduled:       { label: 'Scheduled',     color: '#2563eb', bg: '#eff6ff' },
  'in-progress':   { label: 'In Progress',   color: '#d97706', bg: '#fffbeb' },
  overdue:         { label: 'Overdue',        color: '#dc2626', bg: '#fef2f2' },
  'on-hold':       { label: 'On Hold',        color: '#64748b', bg: '#f1f5f9' },
  completed:       { label: 'Completed',      color: '#16a34a', bg: '#f0fdf4' },
};

const TYPE_META = {
  Bedroom:      { Icon: BedDouble,       grad: 'linear-gradient(135deg,#1e3a8a,#312e81)', text: '#1d4ed8' },
  Bathroom:     { Icon: ShowerHead,      grad: 'linear-gradient(135deg,#0e7490,#1d4ed8)', text: '#0891b2' },
  Kitchen:      { Icon: UtensilsCrossed, grad: 'linear-gradient(135deg,#c2410c,#d97706)', text: '#c2410c' },
  'Living Room':{ Icon: Sofa,            grad: 'linear-gradient(135deg,#1d4ed8,#0b1d3a)', text: '#2563eb' },
  'Dining Room':{ Icon: Utensils,        grad: 'linear-gradient(135deg,#7c3aed,#4f46e5)', text: '#7c3aed' },
  Garden:       { Icon: TreeDeciduous,   grad: 'linear-gradient(135deg,#15803d,#16a34a)', text: '#16a34a' },
  'Pool Area':  { Icon: Waves,           grad: 'linear-gradient(135deg,#0284c7,#06b6d4)', text: '#0284c7' },
  Garage:       { Icon: Car,             grad: 'linear-gradient(135deg,#475569,#334155)', text: '#475569' },
  Office:       { Icon: Briefcase,       grad: 'linear-gradient(135deg,#6d28d9,#7c3aed)', text: '#6d28d9' },
  Storage:      { Icon: Package,         grad: 'linear-gradient(135deg,#64748b,#475569)', text: '#64748b' },
  Utility:      { Icon: Wrench,          grad: 'linear-gradient(135deg,#b45309,#d97706)', text: '#b45309' },
  Balcony:      { Icon: Wind,            grad: 'linear-gradient(135deg,#0f766e,#0d9488)', text: '#0f766e' },
  Roof:         { Icon: Sun,             grad: 'linear-gradient(135deg,#d97706,#f59e0b)', text: '#d97706' },
  Other:        { Icon: MapPin,          grad: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)', text: '#0b1d3a' },
};
const typeMeta = (t) => TYPE_META[t] ?? TYPE_META.Other;

const EXPIRY_ICON  = { contract: RiFileList3Line, warranty: RiShieldLine, 'car-reg': RiCarLine, 'car-ins': RiAlertLine };
const EXPIRY_COLOR = { contract: '#2563eb', warranty: '#7c3aed', 'car-reg': '#d97706', 'car-ins': '#dc2626' };
const EXPIRY_BG    = { contract: '#eff6ff', warranty: '#f5f3ff', 'car-reg': '#fffbeb', 'car-ins': '#fef2f2' };

const ACT_CFG = {
  repair:      { icon: RiToolsLine,          bg: '#fff7ed', color: '#ea580c' },
  maintenance: { icon: RiCheckboxCircleLine, bg: '#f0fdf4', color: '#16a34a' },
};

const EMPTY_WALLET = { balance: 0, totalDeposited: 0 };
const EMPTY_DASH = {
  expenses: {}, home: {}, stats: {},
  wallet: { home: EMPTY_WALLET, vehicle: EMPTY_WALLET, salary: EMPTY_WALLET, property: EMPTY_WALLET },
  upcomingSchedule: [], recentActivities: [], recentTransactions: [],
  expiringContracts: [], expiringWarranties: [], allExpiryAlerts: [],
  areas: [], cars: [], staff: [], owners: [],
  healthScore: 0, fleetFuelMonth: 0,
};

export default function Dashboard() {
  const propertyId = useSelector(selectCurrentPropertyId);
  const user       = useSelector(selectAuthUser);
  const currency   = useSelector(selectCurrency);

  const [fuelOpen,        setFuelOpen]        = useState(false);
  const [carExpenseOpen,  setCarExpenseOpen]  = useState(false);
  const [homeExpenseOpen, setHomeExpenseOpen] = useState(false);
  const [fabOpen,         setFabOpen]         = useState(false);

  const { data: dash = EMPTY_DASH, isLoading, isFetching } = useGetQuery(
    { path: '/dashboard', params: { propertyId } },
    { skip: !propertyId, refetchOnMountOrArgChange: 60 },
  );

  const loading = isLoading || !propertyId;
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const {
    expenses, home, stats, wallet,
    upcomingSchedule, recentActivities,
    allExpiryAlerts, areas, cars, staff, owners,
    healthScore, fleetFuelMonth,
  } = dash;

  const grandTotal = (expenses.property ?? 0) + (expenses.household ?? 0) + (expenses.vehicle ?? 0) + (expenses.fuel ?? 0);
  const dashExpSegs = [
    { category: 'Property & Services', amount: expenses.property ?? 0,  color: '#2563eb' },
    { category: 'Household & Daily',   amount: expenses.household ?? 0, color: '#16a34a' },
    { category: 'Fleet — Vehicle',     amount: expenses.vehicle ?? 0,   color: '#0b1d3a' },
    { category: 'Fleet — Fuel',        amount: expenses.fuel ?? 0,      color: '#d97706' },
  ].filter((s) => s.amount > 0)
   .map((s) => ({ ...s, percent: grandTotal > 0 ? Math.round((s.amount / grandTotal) * 100) : 0 }));

  const curMonthLabel = useMemo(() => {
    const [y, m] = (expenses.month ?? '').split('-');
    if (!y || !m) return '';
    return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }, [expenses.month]);

  const homeInsDays = home.insurance?.expiryDate ? getDaysUntil(home.insurance.expiryDate) : null;
  const maxAreaCount = useMemo(() => Math.max(...areas.map((a) => a.assetCount ?? 0), 1), [areas]);

  const vWal = wallet.vehicle  ?? EMPTY_WALLET;
  const hWal = wallet.home     ?? EMPTY_WALLET;
  const pWal = wallet.property ?? EMPTY_WALLET;
  const sWal = wallet.salary   ?? EMPTY_WALLET;

  const WALLETS_ROW = [
    { key: 'vehicle',  label: 'Vehicle',  w: vWal, color: '#0b1d3a', bg: '#f0f5ff', grad: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)', Icon: Car,       to: '/wallet/vehicle'  },
    { key: 'home',     label: 'Home',     w: hWal, color: '#16a34a', bg: '#f0fdf4', grad: 'linear-gradient(135deg,#14532d,#16a34a)', Icon: Home,      to: '/wallet/home'     },
    { key: 'property', label: 'Property', w: pWal, color: '#0891b2', bg: '#ecfeff', grad: 'linear-gradient(135deg,#164e63,#0891b2)', Icon: Building2, to: '/wallet/property' },
    { key: 'salary',   label: 'Salary',   w: sWal, color: '#7c3aed', bg: '#f5f3ff', grad: 'linear-gradient(135deg,#4c1d95,#7c3aed)', Icon: Banknote,  to: '/wallet/salary'   },
  ];

  if (loading) return <DashboardSkeleton />;

  const alertCount = (stats.openRepairs ?? 0) + (allExpiryAlerts?.length ?? 0) + (stats.carAlerts ?? 0);
  const unread = dash.unreadNotifications ?? 0;

  return (
    <div className="space-y-5 pb-24 sm:pb-6">

      {/* ── Hero banner ── */}
      <motion.div {...fadeUp(0)}>
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-5 sm:p-7"
          style={{ background: 'linear-gradient(135deg, #0b1d3a 0%, #1e3a6e 55%, #0f2648 100%)' }}>

          {/* BG glows */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 opacity-[0.06] rounded-full"
              style={{ background: 'radial-gradient(circle, #93c5fd, transparent)', transform: 'translate(35%,-35%)' }} />
            <div className="absolute bottom-0 left-1/3 w-56 h-56 opacity-[0.04] rounded-full"
              style={{ background: 'radial-gradient(circle, #60a5fa, transparent)', transform: 'translate(-50%,50%)' }} />
          </div>

          {/* Content */}
          <div className="relative z-10">
            {/* Top row: greeting + property chip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <p className="text-[10px] text-blue-300/50 font-bold uppercase tracking-[0.2em] mb-0.5">
                  Shah House Management
                </p>
                <h1 className="text-white font-bold text-xl sm:text-2xl leading-tight">
                  {getGreeting()}, {user?.name?.split(' ')[0] ?? 'Welcome'} 👋
                </h1>
                <p className="text-blue-200/40 text-[11px] mt-0.5 hidden sm:block">{today}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Alert badge */}
                {alertCount > 0 && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-red-300 bg-red-500/20 border border-red-400/20 px-2.5 py-1 rounded-xl">
                    <AlertTriangle className="w-3 h-3" /> {alertCount} alert{alertCount !== 1 ? 's' : ''}
                  </span>
                )}
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-blue-100 font-bold text-[12px]">{home.name || 'Shah House'}</p>
                </div>
              </div>
            </div>

            {/* Quick action links — horizontal scroll on mobile */}
            <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-1 px-1 sm:flex-wrap sm:overflow-visible" style={{ scrollbarWidth: 'none' }}>
              {[
                { label: 'Schedule',     icon: RiCalendarCheckLine, to: '/maintenance' },
                { label: 'New Repair',   icon: RiHammerLine,        to: '/maintenance' },
                { label: 'Contract',     icon: RiFileList3Line,     to: '/contracts'   },
                { label: 'Letterhead',   icon: RiUploadCloudLine,   to: '/letterhead'  },
              ].map(({ label, icon: Icon, to }) => (
                <Link key={label} to={to}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] sm:text-[12px] font-bold text-blue-100 transition-all"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <Icon className="w-3.5 h-3.5 text-blue-300" />{label}
                </Link>
              ))}

              <div className="shrink-0 w-px bg-white/15 self-stretch mx-0.5 hidden sm:block" />

              {[
                { label: 'Log Fuel',      icon: RiGasStationLine, color: '#fbbf24', onClick: () => setFuelOpen(true) },
                { label: 'Fleet Expense', icon: RiCarLine,        color: '#93c5fd', onClick: () => setCarExpenseOpen(true) },
                { label: 'Expense',       icon: RiReceiptLine,    color: '#6ee7b7', onClick: () => setHomeExpenseOpen(true) },
              ].map(({ label, icon: Icon, color, onClick }) => (
                <button key={label} type="button" onClick={onClick}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] sm:text-[12px] font-bold transition-all"
                  style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.15)', color }}>
                  <Icon className="w-3.5 h-3.5" />{label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── KPI stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Contracts',    value: stats.activeContracts ?? 0,    icon: RiFileList3Line,  color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', href: '/contracts'  },
          { label: 'Maintenance',  value: stats.upcomingMaintenance ?? 0, icon: RiCalendarCheckLine, color: '#d97706', bg: '#fffbeb', border: '#fde68a', href: '/maintenance' },
          { label: 'Open Repairs', value: stats.openRepairs ?? 0,        icon: RiHammerLine,     color: '#dc2626', bg: '#fef2f2', border: '#fecaca', href: '/maintenance' },
          { label: 'Staff',        value: stats.activeEmployees ?? 0,    icon: RiTeamLine,       color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', href: '/employees'  },
        ].map((s, i) => (
          <motion.div key={s.label} {...fadeUp(0.04 + i * 0.05)}>
            <Link to={s.href}>
              <div className="bg-white rounded-2xl p-4 sm:p-5 border hover:shadow-md transition-all duration-200 group"
                style={{ borderColor: s.border, boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: s.bg }}>
                  <s.icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <p className="text-2xl sm:text-3xl font-bold leading-none mb-1" style={{ color: '#0b1d3a' }}>{s.value}</p>
                <p className="text-[12px] sm:text-[13px] font-semibold text-slate-600 leading-tight">{s.label}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* ── Wallet balances ── */}
      <motion.div {...fadeUp(0.1)}>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5"
          style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' }}>
                <RiBankCardLine className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-slate-800">Expense Wallets</p>
                <p className="text-[10px] text-slate-400">Vehicle · Home · Property · Salary</p>
              </div>
            </div>
            <Link to="/wallet" className="flex items-center gap-1 text-[11px] text-blue-600 font-bold hover:text-blue-700">
              Manage <RiArrowRightLine className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {WALLETS_ROW.map(({ key, label, w, color, bg, grad, Icon, to }) => {
              const bal   = w?.balance ?? 0;
              const total = w?.totalDeposited ?? 0;
              const pct   = total > 0 ? Math.max(0, Math.min(100, (bal / total) * 100)) : 0;
              const low   = bal < LOW_BALANCE;
              const empty = bal <= 0;
              return (
                <Link key={key} to={to}
                  className="flex flex-col gap-2 p-3.5 rounded-xl border transition-all hover:shadow-sm"
                  style={{ borderColor: empty ? '#fecaca' : low ? '#fde68a' : '#e2e8f0', background: empty ? '#fff5f5' : low ? '#fffbeb' : bg }}>
                  <div className="flex items-center justify-between">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: color }}>
                      <Icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    {(empty || low) && key !== 'salary' && (
                      <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                        empty ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700')}>
                        {empty ? 'Empty' : 'Low'}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 mb-0.5">{label}</p>
                    <p className="text-[14px] font-bold leading-tight tabular-nums" style={{ color: empty ? '#dc2626' : low && key !== 'salary' ? '#d97706' : color }}>
                      {fmtCurrency(bal, currency)}
                    </p>
                  </div>
                  <div className="h-1 bg-white/80 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: empty ? '#dc2626' : low ? '#d97706' : color }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ── Two-column main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* LEFT col (3/5) */}
        <div className="lg:col-span-3 space-y-5">

          {/* Upcoming Schedule */}
          <motion.div {...fadeUp(0.12)}>
            <SectionCard
              title="Upcoming Schedule"
              subtitle={upcomingSchedule.length > 0 ? `${upcomingSchedule.length} pending task${upcomingSchedule.length !== 1 ? 's' : ''}` : 'No pending tasks'}
              action={<Link to="/maintenance" className="flex items-center gap-1 text-[11px] text-blue-600 font-bold hover:text-blue-700">View all <RiArrowRightLine className="w-3 h-3" /></Link>}
            >
              {upcomingSchedule.length === 0 ? (
                <EmptyState icon={RiCalendarCheckLine} text="No scheduled or overdue tasks" sub="Add maintenance tasks from the Maintenance module" />
              ) : (
                <div className="space-y-1.5">
                  {upcomingSchedule.slice(0, 5).map((item) => {
                    const days   = getDaysUntil(item.date);
                    const isOv   = item.status === 'overdue' || days < 0;
                    const isToday = days === 0;
                    const soon   = days <= 3 && days >= 0;
                    const sCfg   = STATUS_CFG[item.status] ?? STATUS_CFG.scheduled;
                    return (
                      <div key={item.id}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                        style={{ borderLeft: `3px solid ${sCfg.color}` }}>
                        {/* Date bubble */}
                        <div className={cn('shrink-0 w-11 text-center rounded-lg py-1.5 border',
                          isOv ? 'bg-red-50 border-red-200' : isToday ? 'bg-blue-50 border-blue-200' : soon ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100')}>
                          <p className={cn('text-[9px] font-bold uppercase',
                            isOv ? 'text-red-500' : isToday ? 'text-blue-600' : soon ? 'text-amber-600' : 'text-slate-400')}>
                            {isOv ? 'OVERD.' : new Date(item.date + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short' })}
                          </p>
                          <p className={cn('text-[17px] font-bold leading-none mt-0.5',
                            isOv ? 'text-red-600' : isToday ? 'text-blue-700' : soon ? 'text-amber-700' : 'text-slate-700')}>
                            {new Date(item.date + 'T00:00:00').getDate()}
                          </p>
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-slate-800 truncate">{item.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {item.company && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                <RiBuildingLine className="w-2.5 h-2.5" />{item.company}
                              </span>
                            )}
                            {item.area && (
                              <>
                                {item.company && <span className="text-slate-200 text-[9px]">·</span>}
                                <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                  <RiMapPin2Line className="w-2.5 h-2.5" />{item.area}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        {/* Status + days */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: sCfg.bg, color: sCfg.color }}>
                            {sCfg.label}
                          </span>
                          <span className={cn('text-[11px] font-bold',
                            isOv ? 'text-red-500' : isToday ? 'text-blue-600' : soon ? 'text-amber-600' : 'text-slate-400')}>
                            {isOv ? `${Math.abs(days)}d overdue` : isToday ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </motion.div>

          {/* Recent Activities */}
          <motion.div {...fadeUp(0.16)}>
            <SectionCard
              title="Recent Activity"
              subtitle="Latest completed tasks"
              action={<Link to="/maintenance" className="flex items-center gap-1 text-[11px] text-blue-600 font-bold hover:text-blue-700">All tasks <RiArrowRightLine className="w-3 h-3" /></Link>}
            >
              {recentActivities.length === 0 ? (
                <EmptyState icon={RiCheckboxCircleLine} text="No completed tasks yet" sub="Tasks marked as completed will appear here" />
              ) : (
                <div className="space-y-0.5">
                  {recentActivities.map((item) => {
                    const cfg  = ACT_CFG[item.type] ?? ACT_CFG.maintenance;
                    const Icon = cfg.icon;
                    return (
                      <div key={item.id}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
                          <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-slate-800 truncate">{item.title}</p>
                          <p className="text-[11px] text-slate-400 truncate">{item.detail}</p>
                        </div>
                        <span className="text-[10px] text-slate-300 whitespace-nowrap shrink-0 flex items-center gap-1">
                          <RiTimeLine className="w-2.5 h-2.5" />{fmtRelative(item.completedDate)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </motion.div>

          {/* Monthly Spending */}
          {grandTotal > 0 && (
            <motion.div {...fadeUp(0.2)}>
              <SectionCard
                title="Monthly Spending"
                subtitle={curMonthLabel}
                action={<Link to="/expenses" className="text-[11px] text-blue-600 font-bold hover:text-blue-700">Full breakdown →</Link>}
              >
                <div className="mb-3">
                  <p className="text-2xl font-bold tracking-tight" style={{ color: '#0b1d3a' }}>
                    {fmtCurrency(grandTotal, currency)}
                  </p>
                </div>
                <div className="flex rounded-full overflow-hidden h-2 mb-4 gap-px bg-slate-100">
                  {dashExpSegs.map((e, i) => (
                    <div key={e.category}
                      style={{ width: `${e.percent}%`, background: e.color }}
                      className={cn(i === 0 && 'rounded-l-full', i === dashExpSegs.length - 1 && 'rounded-r-full')} />
                  ))}
                </div>
                <div className="space-y-2">
                  {dashExpSegs.map((e) => (
                    <div key={e.category} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: e.color }} />
                        <span className="text-[11px] text-slate-600 truncate">{e.category}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-12 bg-slate-100 rounded-full h-1 hidden sm:block">
                          <div className="h-1 rounded-full" style={{ width: `${e.percent}%`, background: e.color }} />
                        </div>
                        <span className="text-[12px] font-bold text-slate-700 tabular-nums">
                          {fmtCurrency(e.amount, currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </motion.div>
          )}
        </div>

        {/* RIGHT col (2/5) */}
        <div className="lg:col-span-2 space-y-5">

          {/* Property Health */}
          <motion.div {...fadeUp(0.14)}>
            <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5"
              style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.05)' }}>
              <p className="text-[13px] font-bold text-slate-800 mb-0.5">Property Health</p>
              <p className="text-[10px] text-slate-400 mb-4">{home.name} — overall status</p>
              <div className="flex items-center justify-center mb-4">
                <HealthDonut score={healthScore} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Contracts',  value: stats.activeContracts ?? 0, icon: RiFileList3Line, color: '#2563eb', bg: '#eff6ff' },
                  { label: 'Staff',      value: stats.activeEmployees ?? 0, icon: RiTeamLine,     color: '#7c3aed', bg: '#f5f3ff' },
                  { label: 'Warranties', value: stats.warrantyAlerts  ?? 0, icon: RiShieldLine,   color: '#0891b2', bg: '#ecfeff' },
                  { label: 'Alerts',     value: unread,                     icon: RiBellLine,     color: '#d97706', bg: '#fffbeb' },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: s.bg }}>
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-white">
                      <s.icon className="w-3 h-3" style={{ color: s.color }} />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold leading-none" style={{ color: s.color }}>{s.value}</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Expiring Soon */}
          <motion.div {...fadeUp(0.18)}>
            <SectionCard
              title="Expiring Soon"
              subtitle="Contracts · Warranties · Registrations"
              action={<Link to="/contracts" className="text-[11px] text-blue-600 font-bold hover:text-blue-700">View →</Link>}
            >
              {allExpiryAlerts.length === 0 ? (
                <EmptyState icon={RiShieldLine} text="All clear" sub="Nothing expiring within the next 60 days" />
              ) : (
                <div className="space-y-1.5">
                  {allExpiryAlerts.map((item) => {
                    const TypeIcon  = EXPIRY_ICON[item.type] ?? RiAlertLine;
                    const typeColor = EXPIRY_COLOR[item.type] ?? '#64748b';
                    const typeBg    = EXPIRY_BG[item.type]   ?? '#f8fafc';
                    return (
                      <div key={item.id}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: typeBg }}>
                          <TypeIcon className="w-3.5 h-3.5" style={{ color: typeColor }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-slate-800 truncate">{item.name}</p>
                          {item.detail && <p className="text-[10px] text-slate-400 truncate">{item.detail}</p>}
                        </div>
                        <span className={cn('shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold',
                          item.status === 'danger'  ? 'bg-red-50 text-red-600' :
                          item.status === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600')}>
                          {item.expiresIn < 0 ? 'Expired' : `${item.expiresIn}d`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </motion.div>

          {/* Areas at a glance */}
          {areas.length > 0 && (
            <motion.div {...fadeUp(0.22)}>
              <SectionCard
                title="Property Spaces"
                subtitle={`${areas.length} area${areas.length !== 1 ? 's' : ''} · ${home.name}`}
                action={<Link to="/areas" className="text-[11px] text-blue-600 font-bold hover:text-blue-700">View →</Link>}
              >
                <div className="space-y-2">
                  {areas.slice(0, 5).map((area) => {
                    const meta   = typeMeta(area.type);
                    const barPct = Math.round(((area.assetCount ?? 0) / maxAreaCount) * 100);
                    return (
                      <Link key={area.id} to={`/areas/${area.id}`} className="flex items-center gap-2.5 group hover:opacity-80 transition-opacity">
                        <meta.Icon className="w-3.5 h-3.5 shrink-0" style={{ color: meta.text }} strokeWidth={1.5} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-semibold text-slate-700 truncate">{area.name}</span>
                            <span className="text-[10px] text-slate-400 shrink-0 ml-1">{area.assetCount}</span>
                          </div>
                          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${barPct}%`, background: meta.text }} />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </SectionCard>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Fleet overview ── */}
      {cars.length > 0 && (
        <motion.div {...fadeUp(0.24)}>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5"
            style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.05)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' }}>
                  <RiCarLine className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-slate-800">Fleet Overview</p>
                  <p className="text-[10px] text-slate-400">{stats.totalCars ?? cars.length} vehicle{(stats.totalCars ?? cars.length) !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {stats.carAlerts > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-xl border border-red-100">
                    <RiAlertLine className="w-3 h-3" /> {stats.carAlerts}
                  </span>
                )}
                <Link to="/cars" className="flex items-center gap-1 text-[11px] text-blue-600 font-bold hover:text-blue-700">
                  Manage <RiArrowRightLine className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Fleet totals */}
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              {[
                { label: 'Fleet Total', value: fmtCurrency(stats.totalCarExpenses ?? 0, currency), color: '#0b1d3a', bg: '#f0f5ff', icon: RiCarLine },
                { label: 'Fuel Total',  value: fmtCurrency(stats.totalFuelCost    ?? 0, currency), color: '#d97706', bg: '#fffbeb', icon: RiGasStationLine },
                { label: 'This Month',  value: fmtCurrency(fleetFuelMonth         ?? 0, currency), color: '#16a34a', bg: '#f0fdf4', icon: RiGasStationLine },
              ].map(({ label, value, color, bg, icon: Icon }) => (
                <div key={label} className="p-3 rounded-xl border border-slate-100" style={{ background: bg }}>
                  <Icon className="w-4 h-4 mb-2" style={{ color }} />
                  <p className="text-[13px] font-bold leading-tight tabular-nums" style={{ color }}>{value}</p>
                  <p className="text-[9.5px] text-slate-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Car cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {cars.map((car) => {
                const regDays     = car.regDays;
                const insDays     = car.insDays;
                const regExpired  = regDays !== null && regDays < 0;
                const regExpiring = regDays !== null && regDays >= 0 && regDays <= 30;
                const insExpired  = insDays !== null && insDays < 0;
                const insExpiring = insDays !== null && insDays >= 0 && insDays <= 30;
                const hasAlert    = regExpired || regExpiring || insExpired || insExpiring;
                return (
                  <Link key={car.id} to={`/cars/${car.id}`}
                    className="flex items-start gap-3 p-3.5 rounded-xl border hover:shadow-sm transition-all bg-slate-50/60"
                    style={{ borderColor: hasAlert ? '#fde68a' : '#f1f5f9' }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' }}>
                      <RiCarLine className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-slate-800 truncate">{car.make} {car.model}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{car.plateNumber}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {regExpired  && <span className="text-[8px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full">Reg Exp.</span>}
                        {regExpiring && <span className="text-[8px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">Reg {regDays}d</span>}
                        {!regExpired && !regExpiring && <span className="text-[8px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">Reg ✓</span>}
                        {insExpired  && <span className="text-[8px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full">Ins Exp.</span>}
                        {insExpiring && <span className="text-[8px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">Ins {insDays}d</span>}
                        {!insExpired && !insExpiring && insDays !== null && <span className="text-[8px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">Ins ✓</span>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Staff + Home info row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

        {/* Home info */}
        <motion.div {...fadeUp(0.26)}>
          <div className="bg-white rounded-2xl border border-slate-100 p-4"
            style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.05)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' }}>
                  <RiHome4Line className="w-3.5 h-3.5 text-white" />
                </div>
                <p className="text-[12px] font-bold text-slate-800">{home.name || 'Home Info'}</p>
              </div>
              <Link to="/home-info" className="text-[10px] text-blue-600 font-bold hover:text-blue-700">Details →</Link>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Owner',    value: `${home.owner?.title ?? ''} ${home.owner?.name ?? '—'}`.trim() },
                { label: 'Location', value: `${home.address?.district ?? ''}, ${home.address?.city ?? 'UAE'}`.replace(/^,\s*/, '') },
                { label: 'Size',     value: home.bedrooms ? `${home.bedrooms}BR · ${home.bathrooms}BA · ${home.size?.toLocaleString()}m²` : '—' },
                { label: 'Insurance',value: homeInsDays !== null && homeInsDays < 30 ? `⚠ ${homeInsDays < 0 ? 'Expired' : `${homeInsDays}d left`}` : home.insurance?.provider ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} className="p-2.5 rounded-lg bg-slate-50">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                  <p className="text-[11px] font-semibold text-slate-700 mt-0.5 truncate">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Staff */}
        {staff.length > 0 && (
          <motion.div {...fadeUp(0.28)}>
            <div className="bg-white rounded-2xl border border-slate-100 p-4"
              style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.05)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                    <RiTeamLine className="w-3.5 h-3.5 text-white" />
                  </div>
                  <p className="text-[12px] font-bold text-slate-800">Staff · {stats.activeEmployees ?? 0} active</p>
                </div>
                <Link to="/employees" className="text-[10px] text-blue-600 font-bold hover:text-blue-700">Manage →</Link>
              </div>
              <div className="space-y-1.5">
                {staff.map((emp) => (
                  <Link key={emp.id} to={`/employees/${emp.id}`}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-100 hover:border-violet-200 hover:bg-violet-50/30 transition-all">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                      <RiUserLine className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-slate-800 truncate">{emp.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{emp.role}</p>
                    </div>
                    <p className="text-[11px] font-bold shrink-0" style={{ color: '#7c3aed' }}>
                      {fmtCurrency(emp.monthlySalary ?? 0, currency)}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Mobile bottom quick-action bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden"
        style={{ background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center justify-around px-2 py-2.5">
          {[
            { label: 'Log Fuel',    Icon: RiGasStationLine, color: '#fbbf24', onClick: () => setFuelOpen(true) },
            { label: 'Fleet Exp.', Icon: RiCarLine,         color: '#93c5fd', onClick: () => setCarExpenseOpen(true) },
            { label: 'Expense',    Icon: RiReceiptLine,     color: '#6ee7b7', onClick: () => setHomeExpenseOpen(true) },
          ].map(({ label, Icon, color, onClick }) => (
            <button key={label} type="button" onClick={onClick}
              className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl active:bg-white/10 transition-colors">
              <Icon className="w-5 h-5" style={{ color }} />
              <span className="text-[9px] font-bold" style={{ color }}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Quick-log modals ── */}
      <QuickFuelModal        open={fuelOpen}        onClose={() => setFuelOpen(false)} />
      <QuickExpenseModal     open={carExpenseOpen}  onClose={() => setCarExpenseOpen(false)} />
      <QuickHomeExpenseModal open={homeExpenseOpen} onClose={() => setHomeExpenseOpen(false)} />
    </div>
  );
}

function SectionCard({ title, subtitle, action, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5"
      style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.05)' }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[13px] font-bold text-slate-800 leading-tight">{title}</p>
          {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0 ml-3">{action}</div>}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ icon: Icon, text, sub }) {
  return (
    <div className="py-8 text-center">
      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
        <Icon className="w-5 h-5 text-slate-300" />
      </div>
      <p className="text-[12px] font-semibold text-slate-400">{text}</p>
      {sub && <p className="text-[10px] text-slate-300 mt-1">{sub}</p>}
    </div>
  );
}

function HealthDonut({ score }) {
  const r = 44, circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color  = score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : '#dc2626';
  const label  = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Needs Attention';
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-28 h-28 flex items-center justify-center">
        <svg width="112" height="112" viewBox="0 0 112 112" className="-rotate-90">
          <circle cx="56" cy="56" r={r} stroke="#f1f5f9" strokeWidth="9" fill="none" />
          <circle cx="56" cy="56" r={r} stroke={color} strokeWidth="9" fill="none"
            strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold leading-none" style={{ color }}>{score}</span>
          <span className="text-[9px] text-slate-400 font-semibold mt-0.5">/ 100</span>
        </div>
      </div>
      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
        style={{ background: color + '18', color }}>
        {label}
      </span>
    </div>
  );
}

function DashboardSkeleton() {
  const p = 'rounded-2xl bg-slate-100 animate-pulse';
  return (
    <div className="space-y-5">
      <div className={`${p} h-36`} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className={`${p} h-24`} />)}
      </div>
      <div className={`${p} h-28`} />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 space-y-5">
          <div className={`${p} h-64`} />
          <div className={`${p} h-48`} />
        </div>
        <div className="lg:col-span-2 space-y-5">
          <div className={`${p} h-56`} />
          <div className={`${p} h-40`} />
        </div>
      </div>
    </div>
  );
}
