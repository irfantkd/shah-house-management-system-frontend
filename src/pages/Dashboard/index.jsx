import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import {
  RiFileList3Line, RiToolsLine, RiAlertLine, RiCalendarCheckLine,
  RiArrowRightLine, RiArrowRightSLine, RiMapPin2Line, RiBuildingLine,
  RiArrowUpLine, RiArrowDownLine, RiBellLine, RiBox3Line,
  RiShieldCheckLine, RiHome4Line, RiDropLine, RiLeafLine,
  RiBankCardLine, RiTimeLine, RiCheckboxCircleLine, RiAddLine,
  RiUploadCloudLine, RiHammerLine, RiCarLine, RiGasStationLine,
} from 'react-icons/ri';
import { selectContracts } from '../../store/slices/contractsSlice';
import { selectMaintenance } from '../../store/slices/maintenanceSlice';
import { selectRepairs } from '../../store/slices/repairsSlice';
import { selectAssets } from '../../store/slices/assetsSlice';
import { selectAreas } from '../../store/slices/areasSlice';
import { selectAuthUser } from '../../store/slices/authSlice';
import { selectCars, selectCarExpenses, selectFuelLogs as selectFleetFuel } from '../../store/slices/carsSlice';
import { selectExpenses } from '../../store/slices/expensesSlice';
import { EXPENSE_CATEGORIES, PROPERTY_CATS, HOUSEHOLD_CATS } from '../../data/mockExpenses';
import { selectUnreadCount } from '../../store/slices/notificationsSlice';
import {
  upcomingSchedule, recentActivities, expiringItems,
} from '../../data/mockDashboard';
import Badge from '../../components/ui/Badge';
import { cn } from '../../utils/cn';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
function getDaysUntil(d) { return Math.ceil((new Date(d) - new Date()) / 86400000); }
function fmtDate(d) { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', weekday: 'short' }); }

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.38, delay, ease: [0.4, 0, 0.2, 1] },
});

const TYPE_LABELS  = { maintenance: 'Maintenance', service: 'Service', inspection: 'Inspection', repair: 'Repair' };
const TYPE_VARIANT = { maintenance: 'primary', service: 'default', inspection: 'warning', repair: 'danger' };

const ACT_CFG = {
  contract:    { icon: RiFileList3Line,      bg: '#eff6ff', color: '#2563eb' },
  repair:      { icon: RiToolsLine,          bg: '#f0fdf4', color: '#16a34a' },
  document:    { icon: RiUploadCloudLine,    bg: '#eff6ff', color: '#2563eb' },
  warranty:    { icon: RiAlertLine,          bg: '#fffbeb', color: '#d97706' },
  maintenance: { icon: RiCheckboxCircleLine, bg: '#f0fdf4', color: '#16a34a' },
};

const TYPE_META = {
  Bedroom:      { emoji: '🛏️', grad: 'linear-gradient(135deg,#1e3a8a,#312e81)', light: '#eff6ff', text: '#1d4ed8'  },
  Bathroom:     { emoji: '🚿', grad: 'linear-gradient(135deg,#0e7490,#1d4ed8)', light: '#ecfeff', text: '#0891b2'  },
  Kitchen:      { emoji: '🍳', grad: 'linear-gradient(135deg,#c2410c,#d97706)', light: '#fff7ed', text: '#c2410c'  },
  'Living Room':{ emoji: '🛋️', grad: 'linear-gradient(135deg,#1d4ed8,#0b1d3a)', light: '#eff6ff', text: '#2563eb'  },
  'Dining Room':{ emoji: '🍽️', grad: 'linear-gradient(135deg,#7c3aed,#4f46e5)', light: '#f5f3ff', text: '#7c3aed'  },
  Garden:       { emoji: '🌿', grad: 'linear-gradient(135deg,#15803d,#16a34a)', light: '#f0fdf4', text: '#16a34a'  },
  'Pool Area':  { emoji: '🏊', grad: 'linear-gradient(135deg,#0284c7,#06b6d4)', light: '#e0f2fe', text: '#0284c7'  },
  Garage:       { emoji: '🚗', grad: 'linear-gradient(135deg,#475569,#334155)', light: '#f8fafc', text: '#475569'  },
  Office:       { emoji: '💼', grad: 'linear-gradient(135deg,#6d28d9,#7c3aed)', light: '#f5f3ff', text: '#6d28d9'  },
  Storage:      { emoji: '📦', grad: 'linear-gradient(135deg,#64748b,#475569)', light: '#f8fafc', text: '#64748b'  },
  Utility:      { emoji: '🔧', grad: 'linear-gradient(135deg,#b45309,#d97706)', light: '#fffbeb', text: '#b45309'  },
  Balcony:      { emoji: '🏠', grad: 'linear-gradient(135deg,#0f766e,#0d9488)', light: '#f0fdfa', text: '#0f766e'  },
  Roof:         { emoji: '☀️', grad: 'linear-gradient(135deg,#d97706,#f59e0b)', light: '#fffbeb', text: '#d97706'  },
  Other:        { emoji: '📍', grad: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)', light: '#f0f5ff', text: '#0b1d3a'  },
};
const typeMeta = (t) => TYPE_META[t] ?? TYPE_META.Other;

export default function Dashboard() {
  const user        = useSelector(selectAuthUser);
  const contracts   = useSelector(selectContracts);
  const maintenance = useSelector(selectMaintenance);
  const repairs     = useSelector(selectRepairs);
  const assets      = useSelector(selectAssets);
  const areas       = useSelector(selectAreas);
  const unread      = useSelector(selectUnreadCount);
  const cars        = useSelector(selectCars);
  const fleetFuel   = useSelector(selectFleetFuel);
  const allExpenses = useSelector(selectExpenses);
  const carExpenses = useSelector(selectCarExpenses);
  const [loading, setLoading] = useState(true);

  useEffect(() => { const t = setTimeout(() => setLoading(false), 800); return () => clearTimeout(t); }, []);

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Fleet helpers
  const fleetCurM     = new Date().getMonth();
  const fleetCurY     = new Date().getFullYear();
  const fleetFuelMo   = fleetFuel
    .filter((f) => { const d = new Date(f.date); return d.getMonth() === fleetCurM && d.getFullYear() === fleetCurY; })
    .reduce((s, f) => s + f.totalPrice, 0);
  const inCurMonth  = (d) => { const dt = new Date(d); return dt.getMonth() === fleetCurM && dt.getFullYear() === fleetCurY; };
  const propTotal   = allExpenses.filter((e) => inCurMonth(e.date) && PROPERTY_CATS.has(e.category)).reduce((s, e) => s + e.amount, 0);
  const houseTotal  = allExpenses.filter((e) => inCurMonth(e.date) && HOUSEHOLD_CATS.has(e.category)).reduce((s, e) => s + e.amount, 0);
  const vehicleTotal = carExpenses.filter((e) => inCurMonth(e.date)).reduce((s, e) => s + e.amount, 0);
  const grandTotal  = propTotal + houseTotal + vehicleTotal + fleetFuelMo;

  const curMonthLabel = new Date(fleetCurY, fleetCurM, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const dashExpSegs = [
    { category: 'Property & Services', amount: propTotal,    color: '#2563eb' },
    { category: 'Household & Daily',   amount: houseTotal,   color: '#16a34a' },
    { category: 'Fleet — Vehicle',     amount: vehicleTotal, color: '#0b1d3a' },
    { category: 'Fleet — Fuel',        amount: fleetFuelMo,  color: '#d97706' },
  ]
    .filter((s) => s.amount > 0)
    .map((s) => ({ ...s, percent: grandTotal > 0 ? Math.round((s.amount / grandTotal) * 100) : 0 }));

  const carsAlertCount = cars.filter((c) => {
    const d = Math.ceil((new Date(c.registrationExpiry) - new Date()) / 86400000);
    return d <= 30;
  }).length;

  // Per-area asset count
  const areaAssetCount = assets.reduce((m, a) => {
    if (a.areaId) m[a.areaId] = (m[a.areaId] ?? 0) + 1;
    return m;
  }, {});

  const stats = [
    {
      label: 'Active Contracts',
      value: contracts.filter((c) => c.status === 'active').length || 12,
      icon: RiFileList3Line,
      color: '#2563eb',
      bg: '#eff6ff',
      border: '#bfdbfe',
      trend: '+2 this month',
      up: true,
      href: '/contracts',
    },
    {
      label: 'Upcoming Maintenance',
      value: maintenance.filter((m) => m.status === 'scheduled').length || 5,
      icon: RiCalendarCheckLine,
      color: '#d97706',
      bg: '#fffbeb',
      border: '#fde68a',
      trend: '3 due this week',
      up: null,
      href: '/maintenance',
    },
    {
      label: 'Open Repairs',
      value: repairs.filter((r) => r.status !== 'completed').length || 2,
      icon: RiHammerLine,
      color: '#dc2626',
      bg: '#fef2f2',
      border: '#fecaca',
      trend: '1 critical',
      up: false,
      href: '/repairs',
    },
    {
      label: 'Total Assets',
      value: assets.length || 18,
      icon: RiBox3Line,
      color: '#0b1d3a',
      bg: '#f0f5ff',
      border: '#c7d7f5',
      trend: `${areas.length || 10} areas tracked`,
      up: true,
      href: '/assets',
    },
  ];

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">

      {/* ── Hero Banner ── */}
      <motion.div {...fadeUp(0)}>
        <div className="relative overflow-hidden rounded-3xl p-7"
          style={{ background: 'linear-gradient(135deg, #0b1d3a 0%, #1e3a6e 55%, #0f2648 100%)' }}>

          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-[0.06]"
            style={{ background: 'radial-gradient(circle, #93c5fd, transparent)', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-1/2 w-64 h-64 rounded-full opacity-[0.04]"
            style={{ background: 'radial-gradient(circle, #60a5fa, transparent)', transform: 'translate(-50%, 50%)' }} />
          <div className="absolute top-0 left-0 right-0 h-px opacity-30"
            style={{ background: 'linear-gradient(90deg, transparent, #93c5fd, transparent)' }} />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(147,197,253,0.3)' }}>
                <RiHome4Line className="w-7 h-7 text-blue-300" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-blue-300/60 font-bold uppercase tracking-[0.2em]">Property Management</span>
                </div>
                <h1 className="text-white font-bold text-2xl sm:text-3xl leading-tight tracking-tight">
                  {getGreeting()}, {user?.name?.split(' ')[0] ?? 'Welcome'} 👋
                </h1>
                <p className="text-blue-200/50 text-[13px] mt-0.5">{today}</p>
              </div>
            </div>

            {/* Property badge */}
            <div className="shrink-0 flex items-center gap-3 px-5 py-3 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div>
                <p className="text-blue-100 font-bold text-[15px] leading-tight">Shah House</p>
                <p className="text-blue-200/40 text-[11px]">Dubai, UAE · Villa Property</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50 animate-pulse" />
            </div>
          </div>

          {/* Quick action row */}
          <div className="relative z-10 flex flex-wrap gap-2.5 mt-6">
            {[
              { label: 'Schedule Maintenance', icon: RiCalendarCheckLine, to: '/maintenance' },
              { label: 'Report Repair',        icon: RiHammerLine,        to: '/repairs'     },
              { label: 'New Contract',         icon: RiFileList3Line,     to: '/contracts'   },
              { label: 'Upload Document',      icon: RiUploadCloudLine,   to: '/documents'   },
            ].map(({ label, icon: Icon, to }) => (
              <Link key={to} to={to}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-bold text-blue-100 transition-all"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}>
                <Icon className="w-3.5 h-3.5 text-blue-300" />{label}
              </Link>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} {...fadeUp(0.05 + i * 0.06)}>
            <Link to={s.href}>
              <div className="bg-white rounded-2xl p-5 border hover:shadow-md transition-all duration-200 cursor-pointer group"
                style={{ borderColor: s.border, boxShadow: '0 1px 12px rgba(0,0,0,0.05)' }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: s.bg }}>
                    <s.icon className="w-5 h-5" style={{ color: s.color }} />
                  </div>
                  {s.up !== null && (
                    <span className={cn('text-[10px] font-bold flex items-center gap-0.5', s.up ? 'text-emerald-600' : 'text-red-500')}>
                      {s.up ? <RiArrowUpLine className="w-3 h-3" /> : <RiArrowDownLine className="w-3 h-3" />}
                    </span>
                  )}
                </div>
                <p className="text-3xl font-bold leading-none mb-1.5" style={{ color: '#0b1d3a' }}>{s.value}</p>
                <p className="text-[13px] font-semibold text-slate-700 leading-tight">{s.label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{s.trend}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* ── Property Overview: horizontal scroll of area cards ── */}
      {areas.length > 0 && (
        <motion.div {...fadeUp(0.15)}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[14px] font-bold text-slate-800">Property Overview</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Rooms & spaces in Shah House</p>
            </div>
            <Link to="/areas" className="flex items-center gap-1 text-[12px] text-blue-600 font-bold hover:text-blue-700">
              View all <RiArrowRightLine className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {areas.slice(0, 6).map((area) => {
              const meta  = typeMeta(area.type);
              const count = areaAssetCount[area.id] ?? 0;
              return (
                <Link key={area.id} to={`/areas/${area.id}`}
                  className="shrink-0 w-36 rounded-2xl overflow-hidden border border-slate-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group bg-white"
                  style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
                  {/* Mini hero */}
                  <div className="h-20 flex items-center justify-center" style={{ background: meta.grad }}>
                    <span className="text-3xl select-none">{meta.emoji}</span>
                  </div>
                  <div className="p-3">
                    <p className="text-[12px] font-bold text-slate-800 truncate leading-tight">{area.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <RiBox3Line className="w-3 h-3" />{count} asset{count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Fleet Overview ── */}
      {cars.length > 0 && (
        <motion.div {...fadeUp(0.17)}>
          <div className="bg-white rounded-2xl border border-slate-100 p-5" style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.05)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, #0b1d3a, #1e3a6e)' }}>
                  <RiCarLine className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-slate-800">Fleet Overview</p>
                  <p className="text-[11px] text-slate-400">{cars.length} vehicle{cars.length !== 1 ? 's' : ''} · Shah House</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {carsAlertCount > 0 && (
                  <span className="flex items-center gap-1.5 text-[12px] font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100">
                    <RiAlertLine className="w-3.5 h-3.5" /> {carsAlertCount} reg. alert{carsAlertCount !== 1 ? 's' : ''}
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-[12px] font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100">
                  <RiGasStationLine className="w-3.5 h-3.5" /> AED {fleetFuelMo.toFixed(0)} fuel/mo
                </span>
                <Link to="/cars" className="flex items-center gap-1 text-[12px] text-blue-600 font-bold hover:text-blue-700">
                  Manage <RiArrowRightLine className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cars.slice(0, 3).map((car) => {
                const regDays = Math.ceil((new Date(car.registrationExpiry) - new Date()) / 86400000);
                const expired  = regDays < 0;
                const expiring = regDays >= 0 && regDays <= 30;
                return (
                  <Link key={car.id} to={`/cars/${car.id}`}
                    className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all group bg-slate-50/60">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `linear-gradient(135deg, #0b1d3a, #1e3a6e)` }}>
                      <RiCarLine className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-slate-800 truncate leading-tight">{car.make} {car.model}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{car.plateNumber} · {car.driverName.split(' ')[0]}</p>
                    </div>
                    <div className="shrink-0">
                      {expired  && <span className="text-[10px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">Expired</span>}
                      {expiring && <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">{regDays}d left</span>}
                      {!expired && !expiring && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Active</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT — 2/3 */}
        <div className="lg:col-span-2 space-y-6">

          {/* Upcoming Schedule */}
          <motion.div {...fadeUp(0.18)}>
            <SectionCard
              title="Upcoming Schedule"
              subtitle="Next 14 days"
              action={<Link to="/maintenance" className="flex items-center gap-1 text-[12px] text-blue-600 font-bold hover:text-blue-700">View all <RiArrowRightLine className="w-3.5 h-3.5" /></Link>}
            >
              <div className="space-y-1.5">
                {upcomingSchedule.slice(0, 5).map((item) => {
                  const days   = getDaysUntil(item.date);
                  const urgent = days <= 3;
                  const soon   = days <= 7;
                  return (
                    <div key={item.id}
                      className="flex items-center gap-3.5 p-3 rounded-2xl hover:bg-slate-50 transition-colors group cursor-pointer">
                      {/* Date pill */}
                      <div className={cn('shrink-0 w-12 text-center rounded-xl py-1.5',
                        urgent ? 'bg-red-50' : soon ? 'bg-amber-50' : 'bg-blue-50')}>
                        <p className={cn('text-[9px] font-bold uppercase', urgent ? 'text-red-500' : soon ? 'text-amber-600' : 'text-blue-500')}>
                          {new Date(item.date + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short' })}
                        </p>
                        <p className={cn('text-[18px] font-bold leading-none mt-0.5', urgent ? 'text-red-600' : soon ? 'text-amber-700' : 'text-blue-700')}>
                          {new Date(item.date + 'T00:00:00').getDate()}
                        </p>
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-800 truncate">{item.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            <RiBuildingLine className="w-3 h-3" />{item.company}
                          </span>
                          <span className="text-slate-200 text-[10px]">•</span>
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            <RiMapPin2Line className="w-3 h-3" />{item.area}
                          </span>
                        </div>
                      </div>
                      {/* Right */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={TYPE_VARIANT[item.type] ?? 'default'} size="sm">
                          {TYPE_LABELS[item.type] ?? item.type}
                        </Badge>
                        <span className={cn('text-[11px] font-semibold hidden sm:block', urgent ? 'text-red-500' : 'text-slate-400')}>
                          {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`}
                        </span>
                        <RiArrowRightSLine className="w-4 h-4 text-slate-200 group-hover:text-slate-400 transition-colors" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </motion.div>

          {/* Recent Activity */}
          <motion.div {...fadeUp(0.22)}>
            <SectionCard
              title="Recent Activity"
              subtitle="Latest updates across all modules"
              action={<Link to="/history" className="flex items-center gap-1 text-[12px] text-blue-600 font-bold hover:text-blue-700">Full history <RiArrowRightLine className="w-3.5 h-3.5" /></Link>}
            >
              <div className="space-y-0.5">
                {recentActivities.map((item) => {
                  const cfg  = ACT_CFG[item.type] ?? ACT_CFG.contract;
                  const Icon = cfg.icon;
                  return (
                    <div key={item.id}
                      className="flex items-center gap-3.5 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: cfg.bg }}>
                        <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-800">{item.title}</p>
                        <p className="text-[11px] text-slate-400 truncate">{item.detail}</p>
                      </div>
                      <span className="text-[11px] text-slate-300 whitespace-nowrap shrink-0 flex items-center gap-1">
                        <RiTimeLine className="w-3 h-3" />{item.time}
                      </span>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </motion.div>
        </div>

        {/* RIGHT — 1/3 */}
        <div className="space-y-6">

          {/* Property Health */}
          <motion.div {...fadeUp(0.2)}>
            <div className="bg-white rounded-2xl border border-slate-100 p-5"
              style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.05)' }}>
              <p className="text-[13px] font-bold text-slate-800 mb-0.5">Property Health</p>
              <p className="text-[11px] text-slate-400 mb-4">Shah House — overall status</p>
              <div className="flex items-center justify-center mb-5">
                <HealthDonut score={84} />
              </div>
              <div className="grid grid-cols-2 gap-2.5 mb-4">
                {[
                  { label: 'Contracts',  value: contracts.filter((c) => c.status === 'active').length || 12, icon: RiFileList3Line,  color: '#2563eb', bg: '#eff6ff' },
                  { label: 'Assets',     value: assets.length || 18,                                         icon: RiBox3Line,        color: '#16a34a', bg: '#f0fdf4' },
                  { label: 'Repairs',    value: repairs.filter((r) => r.status !== 'completed').length || 2, icon: RiHammerLine,      color: '#dc2626', bg: '#fef2f2' },
                  { label: 'Alerts',     value: unread || 3,                                                  icon: RiBellLine,        color: '#d97706', bg: '#fffbeb' },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-2.5 p-3 rounded-xl" style={{ background: s.bg }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-white">
                      <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                    </div>
                    <div>
                      <p className="text-[15px] font-bold leading-none" style={{ color: s.color }}>{s.value}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Per-area mini bars */}
              {areas.length > 0 && (
                <div className="border-t border-slate-50 pt-4 space-y-2.5">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Areas at a Glance</p>
                  {areas.slice(0, 4).map((area) => {
                    const meta  = typeMeta(area.type);
                    const count = areaAssetCount[area.id] ?? 0;
                    const maxCount = Math.max(...areas.map((a) => areaAssetCount[a.id] ?? 0), 1);
                    const barPct   = Math.round((count / maxCount) * 100);
                    return (
                      <Link key={area.id} to={`/areas/${area.id}`} className="flex items-center gap-2.5 group hover:opacity-80 transition-opacity">
                        <span className="text-base select-none w-5 text-center">{meta.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-semibold text-slate-700 truncate">{area.name}</span>
                            <span className="text-[10px] text-slate-400 shrink-0 ml-1">{count}</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${barPct}%`, background: meta.text }} />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>

          {/* Monthly Expenses */}
          <motion.div {...fadeUp(0.24)}>
            <SectionCard
              title="Monthly Expenses"
              subtitle="June 2026"
              action={<Link to="/expenses" className="text-[12px] text-blue-600 font-bold hover:text-blue-700">Details →</Link>}
            >
              <div className="flex items-end gap-2 mb-4">
                <p className="text-3xl font-bold tracking-tight leading-none" style={{ color: '#0b1d3a' }}>AED 4,850</p>
                <span className="text-[11px] text-emerald-600 font-bold mb-0.5 flex items-center gap-0.5">
                  <RiArrowDownLine className="w-3 h-3" />8% less
                </span>
              </div>
              {/* Stacked bar */}
              <div className="flex rounded-full overflow-hidden h-2.5 mb-3.5">
                {monthlyExpenses.map((e) => (
                  <div key={e.category} style={{ width: `${e.percent}%`, background: e.color }} title={`${e.category}: AED ${e.amount}`} />
                ))}
              </div>
              <div className="space-y-2">
                {monthlyExpenses.slice(0, 5).map((e) => (
                  <div key={e.category} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: e.color }} />
                      <span className="text-[12px] text-slate-600 truncate">{e.category}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-16 bg-slate-100 rounded-full h-1 hidden sm:block">
                        <div className="h-1 rounded-full" style={{ width: `${e.percent}%`, background: e.color }} />
                      </div>
                      <span className="text-[12px] font-bold text-slate-700 w-16 text-right">
                        {e.amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </motion.div>

          {/* Expiring Soon */}
          <motion.div {...fadeUp(0.28)}>
            <SectionCard
              title="Expiring Soon"
              subtitle="Needs attention"
              action={<Link to="/contracts" className="text-[12px] text-blue-600 font-bold hover:text-blue-700">View all →</Link>}
            >
              <div className="space-y-2">
                {expiringItems.map((item) => (
                  <div key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-slate-800 truncate">{item.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{item.company}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold',
                        item.status === 'danger'  ? 'bg-red-50 text-red-600'    :
                        item.status === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600',
                      )}>
                        {item.expiresIn}d left
                      </span>
                      <RiArrowRightSLine className="w-4 h-4 text-slate-200 group-hover:text-slate-400 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </motion.div>

        </div>
      </div>
    </div>
  );
}

/* ─── Section card wrapper ─── */
function SectionCard({ title, subtitle, action, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5"
      style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.05)' }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[14px] font-bold text-slate-800 leading-tight">{title}</p>
          {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0 ml-3">{action}</div>}
      </div>
      {children}
    </div>
  );
}

/* ─── Health donut SVG ─── */
function HealthDonut({ score }) {
  const r = 48, circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color  = score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : '#dc2626';
  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
        <circle cx="64" cy="64" r={r} stroke="#f1f5f9" strokeWidth="10" fill="none" />
        <circle cx="64" cy="64" r={r} stroke={color} strokeWidth="10" fill="none"
          strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold leading-none" style={{ color }}>{score}</span>
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">Score</span>
      </div>
    </div>
  );
}

/* ─── Loading skeleton ─── */
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-44 rounded-3xl bg-slate-200" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0,1,2,3].map((i) => <div key={i} className="h-28 rounded-2xl bg-slate-200" />)}
      </div>
      <div className="flex gap-3 overflow-x-auto">
        {[0,1,2,3,4,5].map((i) => <div key={i} className="shrink-0 w-36 h-36 rounded-2xl bg-slate-200" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-80 rounded-2xl bg-slate-200" />
          <div className="h-60 rounded-2xl bg-slate-200" />
        </div>
        <div className="space-y-6">
          <div className="h-64 rounded-2xl bg-slate-200" />
          <div className="h-52 rounded-2xl bg-slate-200" />
        </div>
      </div>
    </div>
  );
}
