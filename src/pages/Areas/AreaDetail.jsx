import { useState, useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  RiArrowLeftLine, RiBox3Line, RiMapPin2Line, RiRulerLine,
  RiCalendarCheckLine, RiHammerLine, RiAddLine,
  RiCloseCircleLine, RiArrowRightLine, RiSearchLine,
  RiCheckboxCircleLine, RiTimerLine, RiToolsLine, RiAlertLine,
  RiTempColdLine, RiDropLine, RiFlashlightLine, RiPlugLine,
  RiShieldCheckLine, RiLeafLine, RiSofaLine, RiThermometerLine,
  RiContrastDropLine, RiLightbulbLine, RiBuildingLine,
  RiAttachmentLine, RiEditLine,
  RiLayoutGridLine, RiListCheck2, RiHome4Line,
  RiCalendarEventLine, RiBankCardLine,
} from 'react-icons/ri';
import { selectAreaById } from '../../store/slices/areasSlice';
import { selectAssets, updateAsset } from '../../store/slices/assetsSlice';
import { selectTasks } from '../../store/slices/tasksSlice';
import Badge from '../../components/ui/Badge';
import { cn } from '../../utils/cn';

/* ─── area type → gradient/colour ─── */
const TYPE_META = {
  Bedroom:      { grad: 'linear-gradient(135deg,#1e3a8a,#312e81)', light: '#eff6ff', text: '#1d4ed8',  emoji: '🛏️' },
  Bathroom:     { grad: 'linear-gradient(135deg,#0e7490,#1d4ed8)', light: '#ecfeff', text: '#0891b2',  emoji: '🚿' },
  Kitchen:      { grad: 'linear-gradient(135deg,#c2410c,#d97706)', light: '#fff7ed', text: '#c2410c',  emoji: '🍳' },
  'Living Room':{ grad: 'linear-gradient(135deg,#1d4ed8,#0b1d3a)', light: '#eff6ff', text: '#2563eb',  emoji: '🛋️' },
  'Dining Room':{ grad: 'linear-gradient(135deg,#7c3aed,#4f46e5)', light: '#f5f3ff', text: '#7c3aed',  emoji: '🍽️' },
  Garden:       { grad: 'linear-gradient(135deg,#15803d,#16a34a)', light: '#f0fdf4', text: '#16a34a',  emoji: '🌿' },
  'Pool Area':  { grad: 'linear-gradient(135deg,#0284c7,#06b6d4)', light: '#e0f2fe', text: '#0284c7',  emoji: '🏊' },
  Garage:       { grad: 'linear-gradient(135deg,#475569,#334155)', light: '#f8fafc', text: '#475569',  emoji: '🚗' },
  Office:       { grad: 'linear-gradient(135deg,#6d28d9,#7c3aed)', light: '#f5f3ff', text: '#6d28d9',  emoji: '💼' },
  Storage:      { grad: 'linear-gradient(135deg,#64748b,#475569)', light: '#f8fafc', text: '#64748b',  emoji: '📦' },
  Utility:      { grad: 'linear-gradient(135deg,#b45309,#d97706)', light: '#fffbeb', text: '#b45309',  emoji: '🔧' },
  Balcony:      { grad: 'linear-gradient(135deg,#0f766e,#0d9488)', light: '#f0fdfa', text: '#0f766e',  emoji: '🏠' },
  Roof:         { grad: 'linear-gradient(135deg,#d97706,#f59e0b)', light: '#fffbeb', text: '#d97706',  emoji: '☀️' },
  Other:        { grad: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)', light: '#f0f5ff', text: '#0b1d3a',  emoji: '📍' },
};
const typeMeta = (t) => TYPE_META[t] ?? TYPE_META.Other;

/* ─── asset category → icon + colour ─── */
const CAT_META = {
  climate:    { icon: RiTempColdLine,    bg: '#eff6ff', color: '#2563eb', label: 'Climate'    },
  HVAC:       { icon: RiThermometerLine, bg: '#fff7ed', color: '#c2410c', label: 'HVAC'       },
  Plumbing:   { icon: RiDropLine,        bg: '#ecfeff', color: '#0891b2', label: 'Plumbing'   },
  water:      { icon: RiDropLine,        bg: '#ecfeff', color: '#0891b2', label: 'Water'      },
  Electrical: { icon: RiFlashlightLine,  bg: '#fefce8', color: '#ca8a04', label: 'Electrical' },
  power:      { icon: RiLightbulbLine,   bg: '#fefce8', color: '#ca8a04', label: 'Power'      },
  Appliances: { icon: RiPlugLine,        bg: '#f0fdf4', color: '#16a34a', label: 'Appliances' },
  appliances: { icon: RiPlugLine,        bg: '#f0fdf4', color: '#16a34a', label: 'Appliances' },
  Furniture:  { icon: RiSofaLine,        bg: '#f5f3ff', color: '#7c3aed', label: 'Furniture'  },
  Security:   { icon: RiShieldCheckLine, bg: '#f0f5ff', color: '#0b1d3a', label: 'Security'   },
  security:   { icon: RiShieldCheckLine, bg: '#f0f5ff', color: '#0b1d3a', label: 'Security'   },
  Garden:     { icon: RiLeafLine,        bg: '#f0fdf4', color: '#15803d', label: 'Garden'     },
  Pool:       { icon: RiContrastDropLine,bg: '#e0f2fe', color: '#0284c7', label: 'Pool'       },
  Structural: { icon: RiBuildingLine,    bg: '#f8fafc', color: '#475569', label: 'Structural' },
  Other:      { icon: RiBox3Line,        bg: '#f1f5f9', color: '#64748b', label: 'Other'      },
};
const catMeta = (c) => CAT_META[c] ?? CAT_META.Other;

/* ─── asset status ─── */
const STATUS_META = {
  operational:   { label: 'Operational',  icon: RiCheckboxCircleLine, color: '#16a34a', bg: '#f0fdf4' },
  'service-due': { label: 'Service Due',  icon: RiTimerLine,          color: '#d97706', bg: '#fffbeb' },
  'under-repair':{ label: 'Under Repair', icon: RiToolsLine,          color: '#dc2626', bg: '#fef2f2' },
  inactive:      { label: 'Inactive',     icon: RiCloseCircleLine,    color: '#64748b', bg: '#f8fafc' },
};
const statusMeta = (s) => STATUS_META[s] ?? STATUS_META.operational;

function daysUntil(d) { return d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null; }
function fmtDate(d)   { return d ? new Date(d+'T00:00:00').toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '—'; }

const TABS = ['overview', 'assets', 'history'];

/* ════════════════════════════════════════════════════════ */
export default function AreaDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();

  const area    = useSelector(selectAreaById(id));
  const allAssets = useSelector(selectAssets);
  const tasks = useSelector(selectTasks);

  const areaAssets    = useMemo(() => allAssets.filter((a) => a.areaId === id), [allAssets, id]);
  const otherAssets   = useMemo(() => allAssets.filter((a) => a.areaId !== id), [allAssets, id]);
  const allAreas      = useSelector((s) => s.areas.items);

  const [tab,           setTab]           = useState('assets');
  const [assetView,     setAssetView]     = useState('grid');
  const [statusFilter,  setStatusFilter]  = useState('all');
  const [assignOpen,    setAssignOpen]    = useState(false);

  if (!area) return <Navigate to="/areas" replace />;

  const meta = typeMeta(area.type);

  const filteredAssets = areaAssets.filter((a) => statusFilter === 'all' || a.status === statusFilter);

  const areaHistory = tasks
    .filter((t) => t.areaId === id || t.areaName === area.name)
    .sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate));

  const handleUnassign = (asset) => {
    dispatch(updateAsset({ ...asset, areaId: '', areaName: '' }));
    toast.success(`${asset.name} unassigned from ${area.name}`);
  };

  const handleAssign = (asset) => {
    dispatch(updateAsset({ ...asset, areaId: id, areaName: area.name }));
    toast.success(`${asset.name} assigned to ${area.name}`);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-5">

      {/* ── Back ── */}
      <Link to="/areas" className="inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-700 font-semibold transition-colors">
        <RiArrowLeftLine className="w-3.5 h-3.5" />Back to Areas
      </Link>

      {/* ── Hero ── */}
      <div className="relative rounded-3xl overflow-hidden" style={{ background: meta.grad }}>
        {/* subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="absolute top-0 left-0 right-0 h-px opacity-30"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)' }} />

        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shrink-0"
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
                {meta.emoji}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Shah House</span>
                  <span className="text-white/20">·</span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">{area.floor ?? 'Ground Floor'}</span>
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight">{area.name}</h1>
                <div className="flex items-center gap-3 mt-1.5 text-white/50 text-[13px]">
                  {area.type && <span className="flex items-center gap-1"><RiMapPin2Line className="w-3.5 h-3.5" />{area.type}</span>}
                  {area.size && <span className="flex items-center gap-1"><RiRulerLine className="w-3.5 h-3.5" />{area.size}</span>}
                </div>
              </div>
            </div>

            <Link to="/maintenance"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold text-white shrink-0 transition-all"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}>
              <RiCalendarCheckLine className="w-4 h-4" />Schedule Service
            </Link>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Assigned Assets',  value: areaAssets.length },
              { label: 'Need Attention',   value: areaAssets.filter((a) => a.status === 'service-due' || a.status === 'under-repair').length },
              { label: 'History Records',  value: areaHistory.length },
            ].map((s) => (
              <div key={s.label} className="text-center rounded-2xl px-3 py-3"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <p className="text-2xl font-bold text-white leading-none">{s.value}</p>
                <p className="text-white/40 text-[11px] mt-1 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-1.5 flex items-center gap-1" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        {[
          { id: 'overview', label: 'Overview',    icon: RiHome4Line       },
          { id: 'assets',   label: 'Assets',      icon: RiBox3Line,  badge: areaAssets.length },
          { id: 'history',  label: 'History',     icon: RiCalendarEventLine, badge: areaHistory.length },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-all duration-150',
              tab === t.id ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50',
            )}>
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.badge > 0 && (
              <span className={cn('min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center',
                tab === t.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500')}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>

          {/* ── Overview ── */}
          {tab === 'overview' && (
            <div className="space-y-5">
              {area.description && (
                <div className="bg-white rounded-2xl border border-slate-100 p-5" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                  <p className="text-[13px] font-bold text-slate-500 uppercase tracking-wide mb-2">About this area</p>
                  <p className="text-[14px] text-slate-700 leading-relaxed">{area.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Type',     value: area.type ?? '—'       },
                  { label: 'Floor',    value: area.floor ?? '—'       },
                  { label: 'Size',     value: area.size ?? '—'        },
                  { label: 'Assets',   value: areaAssets.length       },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-5" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                    <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1.5">{s.label}</p>
                    <p className="text-[18px] font-bold text-navy-900 leading-tight">{s.value}</p>
                  </div>
                ))}
              </div>
              {/* Asset mini-preview */}
              {areaAssets.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 p-5" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[13px] font-bold text-slate-800">Assets in this area</p>
                    <button onClick={() => setTab('assets')}
                      className="flex items-center gap-1 text-[12px] text-blue-600 font-bold hover:text-blue-700">
                      View all <RiArrowRightLine className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {areaAssets.slice(0, 6).map((a) => {
                      const cm = catMeta(a.category);
                      return (
                        <div key={a.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[12px] font-semibold"
                          style={{ background: cm.bg, borderColor: cm.color + '30', color: cm.color }}>
                          <cm.icon className="w-3.5 h-3.5 shrink-0" />
                          {a.name}
                        </div>
                      );
                    })}
                    {areaAssets.length > 6 && (
                      <div className="flex items-center px-3 py-1.5 rounded-xl bg-slate-100 text-[12px] font-semibold text-slate-500">
                        +{areaAssets.length - 6} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Assets ── */}
          {tab === 'assets' && (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {['all', 'operational', 'service-due', 'under-repair', 'inactive'].map((s) => {
                    const sm = s === 'all' ? null : statusMeta(s);
                    const count = s === 'all' ? areaAssets.length : areaAssets.filter((a) => a.status === s).length;
                    return (
                      <button key={s} onClick={() => setStatusFilter(s)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all border',
                          statusFilter === s
                            ? 'bg-navy-900 text-white border-navy-900'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700',
                        )}>
                        {s === 'all' ? 'All' : sm.label}
                        <span className={cn('min-w-4.5 h-4.5 px-1 rounded-full text-[10px] flex items-center justify-center',
                          statusFilter === s ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500')}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 gap-0.5">
                    {[['grid', RiLayoutGridLine], ['list', RiListCheck2]].map(([v, Icon]) => (
                      <button key={v} onClick={() => setAssetView(v)}
                        className={cn('w-7 h-7 rounded-lg flex items-center justify-center transition-all', assetView === v ? 'bg-navy-900 text-white' : 'text-slate-400 hover:text-slate-600')}>
                        <Icon className="w-3.5 h-3.5" />
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setAssignOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-[13px] text-white transition-all"
                    style={{ background: 'linear-gradient(135deg, #0b1d3a, #1e3a6e)' }}>
                    <RiAttachmentLine className="w-4 h-4" />Assign Asset
                  </button>
                </div>
              </div>

              {/* Empty state */}
              {filteredAssets.length === 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 p-14 text-center" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <RiBox3Line className="w-7 h-7 text-slate-300" />
                  </div>
                  <p className="font-bold text-slate-500 text-[15px]">No assets {statusFilter !== 'all' ? `with status "${statusMeta(statusFilter).label}"` : 'in this area'}</p>
                  <p className="text-slate-400 text-[13px] mt-1 mb-4">
                    {statusFilter !== 'all' ? 'Try a different filter.' : 'Assign assets from the button above to start tracking them here.'}
                  </p>
                  {statusFilter === 'all' && (
                    <button onClick={() => setAssignOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-[13px] text-white"
                      style={{ background: '#0b1d3a' }}>
                      <RiAddLine className="w-4 h-4" />Assign First Asset
                    </button>
                  )}
                </div>
              )}

              {/* Grid view */}
              {filteredAssets.length > 0 && assetView === 'grid' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  <AnimatePresence mode="popLayout">
                    {filteredAssets.map((asset, i) => (
                      <motion.div key={asset.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ delay: i * 0.04 }}>
                        <AssetCard asset={asset} onUnassign={() => handleUnassign(asset)} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* List view */}
              {filteredAssets.length > 0 && assetView === 'list' && (
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                  <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 grid grid-cols-12 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <span className="col-span-1" />
                    <span className="col-span-4">Asset</span>
                    <span className="col-span-2 hidden sm:block">Category</span>
                    <span className="col-span-2">Status</span>
                    <span className="col-span-2 hidden md:block">Next Service</span>
                    <span className="col-span-1" />
                  </div>
                  {filteredAssets.map((asset, i) => (
                    <AssetRow key={asset.id} asset={asset} last={i === filteredAssets.length - 1} onUnassign={() => handleUnassign(asset)} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── History ── */}
          {tab === 'history' && (
            <div className="space-y-3">
              {areaHistory.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                  <RiCalendarEventLine className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="font-bold text-slate-500">No history records yet</p>
                  <p className="text-slate-400 text-[13px] mt-1">Maintenance and repair records for this area will appear here.</p>
                </div>
              ) : areaHistory.map((item, i) => {
                const isRepair = !!item.reportedDate;
                return (
                  <motion.div key={item.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                    <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                        isRepair ? 'bg-red-50' : 'bg-blue-50')}>
                        {isRepair
                          ? <RiHammerLine className="w-5 h-5 text-red-500" />
                          : <RiCalendarCheckLine className="w-5 h-5 text-blue-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-slate-800 truncate">{item.title}</p>
                        <p className="text-[12px] text-slate-400 truncate">
                          {item.companyName ?? '—'} · {isRepair ? `Priority: ${item.priority}` : `Type: ${item.type}`}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        {(item.cost || item.estimatedCost) && (
                          <p className="text-[13px] font-bold text-slate-700">
                            AED {(item.cost || item.estimatedCost || 0).toLocaleString()}
                          </p>
                        )}
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {fmtDate(item.scheduledDate ?? item.reportedDate)}
                        </p>
                        <span className={cn('inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold',
                          item.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600')}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* ── Assign Asset Modal ── */}
      <AssignModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        otherAssets={otherAssets}
        allAreas={allAreas}
        areaName={area.name}
        onAssign={handleAssign}
      />
    </motion.div>
  );
}

/* ─── Asset card (grid) ─── */
function AssetCard({ asset, onUnassign }) {
  const cm = catMeta(asset.category);
  const sm = statusMeta(asset.status);
  const warrantyDays = daysUntil(asset.warranty?.expiryDate);
  const nextService  = asset.maintenance?.nextService;
  const warrantyColor = warrantyDays === null ? null : warrantyDays < 0 ? '#dc2626' : warrantyDays < 90 ? '#d97706' : '#16a34a';
  const warrantyBg    = warrantyDays === null ? null : warrantyDays < 0 ? '#fef2f2' : warrantyDays < 90 ? '#fffbeb' : '#f0fdf4';

  return (
    <div
      className="group rounded-3xl overflow-hidden bg-white flex flex-col"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.1)' }}>

      {/* ══ HEADER — dark navy ══ */}
      <div
        className="relative px-5 pt-4 pb-4 overflow-hidden"
        style={{ background: 'linear-gradient(150deg, #0a172e 0%, #0c1f3f 55%, #0e2550 100%)' }}>

        {/* Category accent bar */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:cm.color, opacity:0.85 }} />

        {/* Decorative rings */}
        <div style={{ position:'absolute', top:-36, right:-36, width:130, height:130, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.06)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:-18, right:-18, width:80,  height:80,  borderRadius:'50%', border:'1px solid rgba(255,255,255,0.09)', pointerEvents:'none' }} />

        {/* Ghost watermark */}
        <div style={{
          position:'absolute', right:12, bottom:-6,
          fontSize:68, fontWeight:900, lineHeight:1,
          color:'rgba(255,255,255,0.04)',
          letterSpacing:'-2px',
          userSelect:'none', pointerEvents:'none',
        }}>
          {asset.name.substring(0,4).toUpperCase()}
        </div>

        {/* Status badge */}
        <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
          style={{ background: sm.bg, color: sm.color, zIndex:10 }}>
          <sm.icon className="w-3 h-3" />{sm.label}
        </div>

        {/* Category icon + name — fully inside header */}
        <div className="relative flex items-center gap-3.5 mt-1" style={{ zIndex:5 }}>
          <div
            className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center"
            style={{ background:`${cm.color}22`, border:'2.5px solid rgba(255,255,255,0.12)', boxShadow:`0 4px 16px ${cm.color}40` }}>
            <cm.icon className="w-7 h-7" style={{ color: cm.color }} />
          </div>
          <div className="min-w-0 flex-1 pr-10">
            <p className="text-[17px] font-black text-white leading-tight truncate">{asset.name}</p>
            <p className="text-[11px] font-semibold mt-0.5" style={{ color:'rgba(255,255,255,0.42)' }}>
              {[asset.brand, asset.model].filter(Boolean).join(' · ') || cm.label}
            </p>
          </div>
        </div>

        {/* Unassign button — hover reveal */}
        <div className="absolute bottom-3.5 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ zIndex:10 }}>
          <button onClick={onUnassign} title="Unassign from this area"
            className="w-7 h-7 rounded-xl flex items-center justify-center text-white/60 hover:text-red-300 hover:bg-red-500/25 border border-white/10 transition-all">
            <RiCloseCircleLine className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ══ BODY ══ */}
      <div className="flex-1 flex flex-col px-5 pt-4 pb-4 gap-3">

        {/* Warranty pill */}
        {warrantyDays !== null && (
          <div className="flex items-center justify-between px-3 py-2.5 rounded-2xl"
            style={{ background: warrantyBg ?? '#f8fafc', border:`1px solid ${warrantyColor ? warrantyColor + '22' : '#f1f5f9'}` }}>
            <span className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: warrantyColor ?? '#64748b' }}>
              <RiShieldCheckLine className="w-3.5 h-3.5" /> Warranty
            </span>
            <span className="text-[12px] font-bold" style={{ color: warrantyColor ?? '#64748b' }}>
              {warrantyDays < 0 ? 'Expired' : `${warrantyDays}d left`}
            </span>
          </div>
        )}

        {/* Next service */}
        {nextService && (
          <div className="flex items-center justify-between px-3 py-2.5 rounded-2xl bg-slate-50"
            style={{ border:'1px solid #f1f5f9' }}>
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500">
              <RiCalendarCheckLine className="w-3.5 h-3.5" /> Next Service
            </span>
            <span className="text-[12px] font-bold text-slate-700">{fmtDate(nextService)}</span>
          </div>
        )}

        <div className="flex-1" />

        {/* Footer */}
        <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
          <div>
            {asset.purchasePrice && (
              <>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Value</p>
                <p className="text-[16px] font-black leading-tight" style={{ color:'#0b1d3a' }}>
                  AED {asset.purchasePrice.toLocaleString()}
                </p>
              </>
            )}
          </div>
          <Link to={`/assets/${asset.id}`}
            className="flex items-center gap-1.5 text-[12px] font-bold text-slate-400 hover:text-slate-800 transition-colors">
            View <RiArrowRightLine className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Asset row (list) ─── */
function AssetRow({ asset, last, onUnassign }) {
  const cm = catMeta(asset.category);
  const sm = statusMeta(asset.status);
  const StatusIcon = sm.icon;
  return (
    <div className={cn('flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors group', !last && 'border-b border-slate-50')}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: cm.bg }}>
        <cm.icon className="w-4 h-4" style={{ color: cm.color }} />
      </div>
      <div className="flex-1 min-w-0 col-span-4">
        <p className="text-[13px] font-semibold text-slate-800 truncate">{asset.name}</p>
        <p className="text-[11px] text-slate-400 truncate">{[asset.brand, asset.model].filter(Boolean).join(' · ')}</p>
      </div>
      <span className="hidden sm:block text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0" style={{ background: cm.bg, color: cm.color }}>{cm.label}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="w-2 h-2 rounded-full" style={{ background: sm.color }} />
        <span className="text-[12px] font-semibold text-slate-700">{sm.label}</span>
      </div>
      <span className="hidden md:block text-[12px] text-slate-500 shrink-0">
        {asset.maintenance?.nextService ? fmtDate(asset.maintenance.nextService) : '—'}
      </span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Link to={`/assets/${asset.id}`} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
          <RiArrowRightLine className="w-3.5 h-3.5" />
        </Link>
        <button onClick={onUnassign} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
          <RiCloseCircleLine className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ─── Assign Asset Modal ─── */
function AssignModal({ open, onClose, otherAssets, allAreas, areaName, onAssign }) {
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState(new Set());

  if (!open) return null;

  const filtered = otherAssets.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    (a.brand ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (a.category ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const toggle = (id) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handleAssignSelected = () => {
    const toAssign = otherAssets.filter((a) => selected.has(a.id));
    toAssign.forEach((a) => onAssign(a));
    setSelected(new Set());
    setSearch('');
    onClose();
  };

  const getAreaName = (areaId) => {
    if (!areaId) return 'Unassigned';
    const a = allAreas.find((ar) => ar.id === areaId);
    return a?.name ?? 'Unknown Area';
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}>
          <motion.div initial={{ opacity: 0, y: -20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }} transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl overflow-hidden w-full max-w-lg"
            style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>

            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-100">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h2 className="text-[17px] font-bold text-slate-900">Assign Assets</h2>
                  <p className="text-[12px] text-slate-400 mt-0.5">to <span className="font-bold text-slate-600">{areaName}</span></p>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                  <RiCloseCircleLine className="w-5 h-5" />
                </button>
              </div>
              <div className="relative mt-3">
                <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, brand, category…"
                  className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-[13px] placeholder-slate-400 outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
              </div>
            </div>

            {/* Asset list */}
            <div className="max-h-80 overflow-y-auto px-3 py-2">
              {filtered.length === 0 ? (
                <div className="py-8 text-center">
                  <RiBox3Line className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-[13px] text-slate-400 font-medium">
                    {otherAssets.length === 0 ? 'All assets are already in this area.' : 'No assets match your search.'}
                  </p>
                </div>
              ) : filtered.map((asset) => {
                const cm = catMeta(asset.category);
                const isSelected = selected.has(asset.id);
                const currentArea = getAreaName(asset.areaId);
                return (
                  <div key={asset.id} onClick={() => toggle(asset.id)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all mb-1',
                      isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent',
                    )}>
                    {/* Checkbox */}
                    <div className={cn(
                      'w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all',
                      isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300',
                    )}>
                      {isSelected && (
                        <svg width="10" height="10" viewBox="0 0 10 10">
                          <polyline points="2,5.5 4,7.5 8,3" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>

                    {/* Icon */}
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: cm.bg }}>
                      <cm.icon className="w-4 h-4" style={{ color: cm.color }} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-slate-800 truncate">{asset.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {[asset.brand, asset.model].filter(Boolean).join(' · ')}
                        {currentArea !== 'Unassigned' && (
                          <span className="ml-1.5 text-amber-600 font-semibold">· Currently in {currentArea}</span>
                        )}
                      </p>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: cm.bg, color: cm.color }}>
                      {cm.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              <p className="text-[12px] text-slate-400">
                {selected.size > 0 ? <span className="font-bold text-slate-700">{selected.size} asset{selected.size !== 1 ? 's' : ''} selected</span> : 'Click assets to select them'}
              </p>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="px-4 py-2 rounded-xl text-[13px] font-semibold text-slate-600 hover:bg-slate-200 transition-all">
                  Cancel
                </button>
                <button onClick={handleAssignSelected} disabled={selected.size === 0}
                  className={cn('px-5 py-2 rounded-xl text-[13px] font-bold text-white transition-all',
                    selected.size > 0 ? 'opacity-100 cursor-pointer' : 'opacity-40 cursor-not-allowed')}
                  style={{ background: 'linear-gradient(135deg, #0b1d3a, #1e3a6e)' }}>
                  Assign {selected.size > 0 ? `${selected.size} Asset${selected.size !== 1 ? 's' : ''}` : 'Assets'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
