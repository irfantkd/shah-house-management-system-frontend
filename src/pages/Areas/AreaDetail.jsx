import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useForm, useWatch } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  RiArrowLeftLine, RiBox3Line, RiMapPin2Line, RiRulerLine,
  RiCalendarCheckLine, RiHammerLine, RiAddLine,
  RiCloseCircleLine, RiArrowRightLine, RiSearchLine,
  RiCheckboxCircleLine, RiTimerLine, RiToolsLine,
  RiTempColdLine, RiDropLine, RiFlashlightLine, RiPlugLine,
  RiShieldCheckLine, RiLeafLine, RiSofaLine, RiThermometerLine,
  RiContrastDropLine, RiLightbulbLine, RiBuildingLine,
  RiAttachmentLine, RiEditLine, RiDeleteBinLine,
  RiLayoutGridLine, RiListCheck2, RiHome4Line,
  RiCalendarEventLine, RiArrowDownSLine, RiCheckLine,
} from 'react-icons/ri';
import {
  BedDouble, ShowerHead, UtensilsCrossed, Sofa, Utensils,
  TreeDeciduous, Waves, Car, Briefcase, Package, Wrench,
  Wind, Sun, MapPin, Layers,
} from 'lucide-react';
import { useGetQuery, usePostMutation, usePutMutation, useDeleteMutation } from '../../api/apiSlice';
import { selectCurrentPropertyId, selectCurrentProperty } from '../../store/slices/propertiesSlice';
import Modal         from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import PageLoader    from '../../components/ui/PageLoader';
import { Field, Input, Select, Textarea, FormGrid, FormActions } from '../../components/ui/FormField';
import { cn } from '../../utils/cn';

/* ── constants ─────────────────────────────────────────────────────────────── */
const AREA_TYPES = [
  'Bedroom','Bathroom','Kitchen','Living Room','Dining Room',
  'Office','Storage','Garage','Garden','Pool Area',
  'Utility','Balcony','Roof','Other',
];

const TYPE_META = {
  Bedroom:      { grad: 'linear-gradient(135deg,#1e3a8a,#312e81)', light: '#eff6ff', text: '#1d4ed8',  Icon: BedDouble       },
  Bathroom:     { grad: 'linear-gradient(135deg,#0e7490,#1d4ed8)', light: '#ecfeff', text: '#0891b2',  Icon: ShowerHead      },
  Kitchen:      { grad: 'linear-gradient(135deg,#c2410c,#d97706)', light: '#fff7ed', text: '#c2410c',  Icon: UtensilsCrossed },
  'Living Room':{ grad: 'linear-gradient(135deg,#1d4ed8,#0b1d3a)', light: '#eff6ff', text: '#2563eb',  Icon: Sofa            },
  'Dining Room':{ grad: 'linear-gradient(135deg,#7c3aed,#4f46e5)', light: '#f5f3ff', text: '#7c3aed',  Icon: Utensils        },
  Garden:       { grad: 'linear-gradient(135deg,#15803d,#16a34a)', light: '#f0fdf4', text: '#16a34a',  Icon: TreeDeciduous   },
  'Pool Area':  { grad: 'linear-gradient(135deg,#0284c7,#06b6d4)', light: '#e0f2fe', text: '#0284c7',  Icon: Waves           },
  Garage:       { grad: 'linear-gradient(135deg,#475569,#334155)', light: '#f8fafc', text: '#475569',  Icon: Car             },
  Office:       { grad: 'linear-gradient(135deg,#6d28d9,#7c3aed)', light: '#f5f3ff', text: '#6d28d9',  Icon: Briefcase       },
  Storage:      { grad: 'linear-gradient(135deg,#64748b,#475569)', light: '#f8fafc', text: '#64748b',  Icon: Package         },
  Utility:      { grad: 'linear-gradient(135deg,#b45309,#d97706)', light: '#fffbeb', text: '#b45309',  Icon: Wrench          },
  Balcony:      { grad: 'linear-gradient(135deg,#0f766e,#0d9488)', light: '#f0fdfa', text: '#0f766e',  Icon: Wind            },
  Roof:         { grad: 'linear-gradient(135deg,#d97706,#f59e0b)', light: '#fffbeb', text: '#d97706',  Icon: Sun             },
  Other:        { grad: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)', light: '#f0f5ff', text: '#0b1d3a',  Icon: MapPin          },
};
const typeMeta = (t) => TYPE_META[t] ?? TYPE_META.Other;

const CAT_META = {
  HVAC:       { icon: RiThermometerLine,  bg: '#fff7ed', color: '#c2410c', label: 'HVAC'       },
  Plumbing:   { icon: RiDropLine,         bg: '#ecfeff', color: '#0891b2', label: 'Plumbing'   },
  Electrical: { icon: RiFlashlightLine,   bg: '#fefce8', color: '#ca8a04', label: 'Electrical' },
  Appliances: { icon: RiPlugLine,         bg: '#f0fdf4', color: '#16a34a', label: 'Appliances' },
  Furniture:  { icon: RiSofaLine,         bg: '#f5f3ff', color: '#7c3aed', label: 'Furniture'  },
  Security:   { icon: RiShieldCheckLine,  bg: '#f0f5ff', color: '#0b1d3a', label: 'Security'   },
  Garden:     { icon: RiLeafLine,         bg: '#f0fdf4', color: '#15803d', label: 'Garden'     },
  Pool:       { icon: RiContrastDropLine, bg: '#e0f2fe', color: '#0284c7', label: 'Pool'       },
  Structural: { icon: RiBuildingLine,     bg: '#f8fafc', color: '#475569', label: 'Structural' },
  climate:    { icon: RiTempColdLine,     bg: '#eff6ff', color: '#2563eb', label: 'Climate'    },
  power:      { icon: RiLightbulbLine,    bg: '#fefce8', color: '#ca8a04', label: 'Power'      },
  Other:      { icon: RiBox3Line,         bg: '#f1f5f9', color: '#64748b', label: 'Other'      },
};
const catMeta = (c) => CAT_META[c] ?? CAT_META.Other;

const STATUS_META = {
  operational:   { label: 'Operational',  icon: RiCheckboxCircleLine, color: '#16a34a', bg: '#f0fdf4' },
  'service-due': { label: 'Service Due',  icon: RiTimerLine,          color: '#d97706', bg: '#fffbeb' },
  'under-repair':{ label: 'Under Repair', icon: RiToolsLine,          color: '#dc2626', bg: '#fef2f2' },
  inactive:      { label: 'Inactive',     icon: RiCloseCircleLine,    color: '#64748b', bg: '#f8fafc' },
};
const statusMeta = (s) => STATUS_META[s] ?? STATUS_META.operational;

const FLOOR_COLORS = [
  { label: 'Navy',    value: '#0b1d3a' }, { label: 'Royal',  value: '#1d4ed8' },
  { label: 'Teal',    value: '#0f766e' }, { label: 'Purple', value: '#7c3aed' },
  { label: 'Green',   value: '#15803d' }, { label: 'Amber',  value: '#b45309' },
  { label: 'Rose',    value: '#be185d' }, { label: 'Slate',  value: '#475569' },
];

function daysUntil(d) { return d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null; }
function fmtDate(d)   { return d ? new Date(d + 'T00:00:00').toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; }

/* ══════════════════════════════════════════════════════════════════════════════
   AreaDetail
══════════════════════════════════════════════════════════════════════════════ */
export default function AreaDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const propertyId = useSelector(selectCurrentPropertyId);
  const property   = useSelector(selectCurrentProperty);

  const { data: area, isLoading: areaLoading, isError: areaError } = useGetQuery(
    { path: `/areas/${id}` },
    { skip: !id },
  );
  const { data: areaAssets = [] } = useGetQuery(
    { path: '/assets', params: { propertyId, areaId: id } },
    { skip: !propertyId || !id },
  );
  const { data: allAssets = [] } = useGetQuery(
    { path: '/assets', params: { propertyId } },
    { skip: !propertyId },
  );
  const { data: tasks = [] } = useGetQuery(
    { path: '/tasks', params: { propertyId } },
    { skip: !propertyId },
  );
  const { data: floors = [] } = useGetQuery(
    { path: '/floors', params: { propertyId } },
    { skip: !propertyId },
  );
  const { data: allAreas = [] } = useGetQuery(
    { path: '/areas', params: { propertyId } },
    { skip: !propertyId },
  );

  const [addAreaMut,    { isLoading: isAdding }]   = usePostMutation();
  const [updateAreaMut, { isLoading: isUpdating }] = usePutMutation();
  const [deleteAreaMut, { isLoading: isDeleting }] = useDeleteMutation();
  const [updateAssetMut] = usePutMutation();

  const [tab,          setTab]          = useState('assets');
  const [assetView,    setAssetView]    = useState('grid');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editOpen,     setEditOpen]     = useState(false);
  const [deleteOpen,   setDeleteOpen]   = useState(false);
  const [assignOpen,   setAssignOpen]   = useState(false);

  // ── Loading / error ────────────────────────────────────────────────────────
  if (areaLoading) return <PageLoader icon={Layers} text="Loading area…" />;
  if (areaError || !area) return <Navigate to="/areas" replace />;

  const meta         = typeMeta(area.type);
  const assetCount   = areaAssets.length;
  const canDelete    = assetCount === 0;
  const otherAssets  = allAssets.filter((a) => a.areaId !== id);

  const filteredAssets = areaAssets.filter(
    (a) => statusFilter === 'all' || a.status === statusFilter,
  );

  const areaHistory = tasks
    .filter((t) => t.areaId === id || t.areaName === area.name)
    .sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate));

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleUnassign = async (asset) => {
    try {
      await updateAssetMut({
        path: `/assets/${asset.id}`,
        body: { ...asset, areaId: null, areaName: '' },
      }).unwrap();
      toast.success(`${asset.name} unassigned`);
    } catch (err) { toast.error(err.data?.error || 'Failed to unassign'); }
  };

  const handleAssign = async (asset) => {
    try {
      await updateAssetMut({
        path: `/assets/${asset.id}`,
        body: { ...asset, areaId: id, areaName: area.name },
      }).unwrap();
      toast.success(`${asset.name} assigned to ${area.name}`);
    } catch (err) { toast.error(err.data?.error || 'Failed to assign'); }
  };

  const handleSave = async (data) => {
    try {
      await updateAreaMut({ path: `/areas/${id}`, body: data }).unwrap();
      toast.success('Area updated!');
      setEditOpen(false);
    } catch (err) { toast.error(err.data?.error || 'Failed to save'); }
  };

  const handleDelete = async () => {
    try {
      await deleteAreaMut({ path: `/areas/${id}` }).unwrap();
      toast.success(`"${area.name}" deleted`);
      navigate('/areas');
    } catch (err) { toast.error(err.data?.error || 'Failed to delete'); }
  };

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >

      {/* ── Top action bar ── */}
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/areas"
          className="flex items-center gap-1.5 text-[13px] font-bold text-slate-500 hover:text-slate-800 transition-colors group"
        >
          <span className="w-8 h-8 rounded-xl border border-slate-200 bg-white flex items-center justify-center group-hover:border-slate-300 transition-all"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <RiArrowLeftLine className="w-4 h-4" />
          </span>
          <span className="hidden sm:block">Back to Areas</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-all"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
          >
            <RiEditLine className="w-4 h-4" />
            <span className="hidden sm:block">Edit Area</span>
          </button>

          <button
            onClick={() => {
              if (!canDelete) {
                toast(`Remove all ${assetCount} asset${assetCount !== 1 ? 's' : ''} from this area before deleting`, { icon: '⚠️' });
                return;
              }
              setDeleteOpen(true);
            }}
            title={!canDelete ? 'Remove all assets from this area first' : 'Delete area'}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold border transition-all',
              canDelete
                ? 'border-slate-200 bg-white text-red-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600'
                : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed',
            )}
            style={{ boxShadow: canDelete ? '0 1px 4px rgba(0,0,0,0.06)' : 'none' }}
          >
            <RiDeleteBinLine className="w-4 h-4" />
            <span className="hidden sm:block">Delete</span>
          </button>
        </div>
      </div>

      {/* ── Hero ── */}
      <div className="relative rounded-3xl overflow-hidden" style={{ background: meta.grad }}>
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        {/* Top shimmer line */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)' }} />
        {/* Decorative rings */}
        <div style={{ position: 'absolute', bottom: -60, right: -60, width: 220, height: 220, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -30, right: -30, width: 140, height: 140, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.12)', pointerEvents: 'none' }} />
        {/* Watermark icon */}
        <meta.Icon style={{ position: 'absolute', right: 20, bottom: -16, width: 140, height: 140, color: 'rgba(255,255,255,0.06)', pointerEvents: 'none', userSelect: 'none' }} />

        <div className="relative z-10 p-5 sm:p-8">
          {/* Top row: icon + name + schedule button */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.22)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                <meta.Icon className="w-8 h-8 text-white" strokeWidth={1.5} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                    {property?.name ?? 'Shah House'}
                  </span>
                  {area.floorName && (
                    <>
                      <span className="text-white/20">·</span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">{area.floorName}</span>
                    </>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">{area.name}</h1>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {area.type && (
                    <span className="flex items-center gap-1.5 text-[12px] font-semibold text-white/55">
                      <RiMapPin2Line className="w-3.5 h-3.5" />{area.type}
                    </span>
                  )}
                  {area.size && (
                    <span className="flex items-center gap-1.5 text-[12px] font-semibold text-white/55">
                      <RiRulerLine className="w-3.5 h-3.5" />{area.size}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Link to="/maintenance"
              className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold text-white transition-all whitespace-nowrap"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}>
              <RiCalendarCheckLine className="w-4 h-4" />Schedule Service
            </Link>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: 'Assets',        value: assetCount },
              { label: 'Need Attention', value: areaAssets.filter((a) => a.status === 'service-due' || a.status === 'under-repair').length },
              { label: 'Service Records', value: areaHistory.length },
            ].map((s) => (
              <div key={s.label} className="text-center rounded-2xl px-2 sm:px-4 py-3"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <p className="text-xl sm:text-2xl font-bold text-white leading-none">{s.value}</p>
                <p className="text-white/40 text-[9px] sm:text-[11px] mt-1 font-medium leading-snug">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-1.5 flex items-center gap-1 overflow-x-auto"
        style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        {[
          { id: 'overview', label: 'Overview',  icon: RiHome4Line         },
          { id: 'assets',   label: 'Assets',    icon: RiBox3Line,     badge: assetCount      },
          { id: 'history',  label: 'History',   icon: RiCalendarEventLine, badge: areaHistory.length },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-all duration-150',
              tab === t.id ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50',
            )}
            style={tab === t.id ? { background: '#0b1d3a' } : {}}>
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
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >

          {/* ─── Overview tab ─── */}
          {tab === 'overview' && (
            <div className="space-y-5">

              {/* Description */}
              {area.description && (
                <div className="bg-white rounded-2xl border border-slate-100 p-5"
                  style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">About this area</p>
                  <p className="text-[14px] text-slate-700 leading-relaxed">{area.description}</p>
                </div>
              )}

              {/* Info grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Type',      value: area.type       ?? '—',          color: meta.text, bg: meta.light },
                  { label: 'Floor',     value: area.floorName  ?? 'Unassigned', color: '#0b1d3a', bg: '#f0f5ff'  },
                  { label: 'Size',      value: area.size       ?? 'Not set',    color: '#475569', bg: '#f8fafc'  },
                  { label: 'Assets',    value: assetCount,                       color: '#16a34a', bg: '#f0fdf4'  },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-5"
                    style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: s.bg }}>
                      <span className="text-[11px] font-black" style={{ color: s.color }}>
                        {typeof s.value === 'number' ? s.value : s.value.charAt(0)}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">{s.label}</p>
                    <p className="text-[15px] font-bold text-slate-800 leading-tight truncate">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Quick asset preview */}
              {assetCount > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 p-5"
                  style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[14px] font-bold text-slate-800">Assets in this area</p>
                    <button onClick={() => setTab('assets')}
                      className="flex items-center gap-1 text-[12px] font-bold hover:underline" style={{ color: '#1d4ed8' }}>
                      View all <RiArrowRightLine className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {areaAssets.slice(0, 8).map((a) => {
                      const cm = catMeta(a.category);
                      return (
                        <Link key={a.id} to={`/assets/${a.id}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[12px] font-semibold hover:opacity-75 transition-opacity"
                          style={{ background: cm.bg, borderColor: cm.color + '30', color: cm.color }}>
                          <cm.icon className="w-3.5 h-3.5 shrink-0" />
                          {a.name}
                        </Link>
                      );
                    })}
                    {assetCount > 8 && (
                      <button onClick={() => setTab('assets')}
                        className="flex items-center px-3 py-1.5 rounded-xl bg-slate-100 text-[12px] font-semibold text-slate-500 hover:bg-slate-200 transition-colors">
                        +{assetCount - 8} more
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Empty state when no assets */}
              {assetCount === 0 && (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center"
                  style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.03)' }}>
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                    <RiBox3Line className="w-7 h-7 text-slate-300" />
                  </div>
                  <p className="font-bold text-slate-400 text-[14px]">No assets assigned yet</p>
                  <p className="text-slate-400 text-[12px] mt-1 mb-4">Track equipment and furniture by assigning them to this area.</p>
                  <button onClick={() => { setTab('assets'); setAssignOpen(true); }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-[13px] text-white"
                    style={{ background: '#0b1d3a' }}>
                    <RiAddLine className="w-4 h-4" />Assign First Asset
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ─── Assets tab ─── */}
          {tab === 'assets' && (
            <div className="space-y-4">

              {/* Filter + view toolbar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {['all', 'operational', 'service-due', 'under-repair', 'inactive'].map((s) => {
                    const sm    = s !== 'all' ? statusMeta(s) : null;
                    const count = s === 'all' ? assetCount : areaAssets.filter((a) => a.status === s).length;
                    const active = statusFilter === s;
                    return (
                      <button key={s} onClick={() => setStatusFilter(s)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all border',
                          active ? 'text-white border-transparent' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300',
                        )}
                        style={active ? { background: sm?.color ?? '#0b1d3a', borderColor: sm?.color ?? '#0b1d3a' } : {}}>
                        {s === 'all' ? 'All' : sm.label}
                        <span className={cn('min-w-4.5 h-4.5 px-1 rounded-full text-[10px] flex items-center justify-center',
                          active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500')}>
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
                        className={cn('w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                          assetView === v ? 'text-white' : 'text-slate-400 hover:text-slate-600')}
                        style={assetView === v ? { background: '#0b1d3a' } : {}}>
                        <Icon className="w-3.5 h-3.5" />
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setAssignOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-[13px] text-white transition-all"
                    style={{ background: 'linear-gradient(135deg, #0b1d3a, #1e3a6e)' }}>
                    <RiAttachmentLine className="w-4 h-4" />
                    <span className="hidden sm:block">Assign Asset</span>
                    <span className="sm:hidden">Assign</span>
                  </button>
                </div>
              </div>

              {/* Empty */}
              {filteredAssets.length === 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 p-14 text-center"
                  style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <RiBox3Line className="w-7 h-7 text-slate-300" />
                  </div>
                  <p className="font-bold text-slate-500 text-[15px]">
                    {statusFilter !== 'all' ? `No "${statusMeta(statusFilter).label}" assets` : 'No assets in this area'}
                  </p>
                  <p className="text-slate-400 text-[13px] mt-1 mb-4">
                    {statusFilter !== 'all' ? 'Try a different status filter.' : 'Assign assets from the button above.'}
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

              {/* Grid */}
              {filteredAssets.length > 0 && assetView === 'grid' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  <AnimatePresence mode="popLayout">
                    {filteredAssets.map((asset, i) => (
                      <motion.div key={asset.id}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96 }} transition={{ delay: i * 0.04 }}>
                        <AssetCard asset={asset} onUnassign={() => handleUnassign(asset)} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* List */}
              {filteredAssets.length > 0 && assetView === 'list' && (
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
                  style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                  <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center text-[11px] font-bold text-slate-400 uppercase tracking-wider gap-4">
                    <span className="w-9 shrink-0" />
                    <span className="flex-1">Asset</span>
                    <span className="hidden sm:block w-28 shrink-0">Category</span>
                    <span className="w-28 shrink-0">Status</span>
                    <span className="hidden md:block w-28 shrink-0">Warranty</span>
                    <span className="w-16 shrink-0 text-right">Value</span>
                    <span className="w-16 shrink-0" />
                  </div>
                  {filteredAssets.map((asset, i) => (
                    <AssetRow
                      key={asset.id}
                      asset={asset}
                      last={i === filteredAssets.length - 1}
                      onUnassign={() => handleUnassign(asset)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── History tab ─── */}
          {tab === 'history' && (
            <div className="space-y-3">
              {areaHistory.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center"
                  style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                    <RiCalendarEventLine className="w-7 h-7 text-slate-300" />
                  </div>
                  <p className="font-bold text-slate-500 text-[14px]">No history yet</p>
                  <p className="text-slate-400 text-[13px] mt-1">Maintenance and repair records will appear here.</p>
                </div>
              ) : (
                areaHistory.map((item, i) => {
                  const isRepair = !!item.reportedDate;
                  return (
                    <motion.div key={item.id}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}>
                      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4"
                        style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', isRepair ? 'bg-red-50' : 'bg-blue-50')}>
                          {isRepair
                            ? <RiHammerLine className="w-5 h-5 text-red-500" />
                            : <RiCalendarCheckLine className="w-5 h-5 text-blue-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-slate-800 truncate">{item.title}</p>
                          <p className="text-[12px] text-slate-400 truncate">
                            {item.companyName ?? '—'}
                            {' · '}
                            {isRepair ? `Priority: ${item.priority}` : `Type: ${item.type}`}
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
                })
              )}
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* ── Modals ── */}
      <EditAreaModal
        open={editOpen}
        area={area}
        floors={floors}
        propertyName={property?.name}
        onClose={() => setEditOpen(false)}
        onSave={handleSave}
        isSubmitting={isUpdating}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={isDeleting}
        title="Delete Area"
        message={`Delete "${area.name}"? This cannot be undone.`}
        confirmLabel="Delete Area"
      />

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

/* ══ Asset Card ══ */
function AssetCard({ asset, onUnassign }) {
  const cm           = catMeta(asset.category);
  const sm           = statusMeta(asset.status);
  const warrantyDays = daysUntil(asset.warranty?.expiryDate);
  const wColor       = warrantyDays === null ? null : warrantyDays < 0 ? '#dc2626' : warrantyDays < 90 ? '#d97706' : '#16a34a';
  const wBg          = warrantyDays === null ? null : warrantyDays < 0 ? '#fef2f2' : warrantyDays < 90 ? '#fffbeb' : '#f0fdf4';

  return (
    <div className="group rounded-3xl overflow-hidden bg-white flex flex-col"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.1)' }}>

      {/* Dark header */}
      <div className="relative px-5 pt-4 pb-5 overflow-hidden"
        style={{ background: 'linear-gradient(150deg, #0a172e 0%, #0c1f3f 55%, #0e2550 100%)' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: cm.color, opacity: 0.85 }} />
        <div style={{ position: 'absolute', top: -36, right: -36, width: 130, height: 130, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: -18, right: -18, width: 80, height: 80, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.09)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 12, bottom: -6, fontSize: 68, fontWeight: 900, lineHeight: 1, color: 'rgba(255,255,255,0.04)', letterSpacing: '-2px', userSelect: 'none', pointerEvents: 'none' }}>
          {asset.name.substring(0, 4).toUpperCase()}
        </div>

        <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
          style={{ background: sm.bg, color: sm.color, zIndex: 10 }}>
          <sm.icon className="w-3 h-3" />{sm.label}
        </div>

        <div className="relative flex items-center gap-3.5 mt-1" style={{ zIndex: 5 }}>
          <div className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center"
            style={{ background: `${cm.color}22`, border: '2.5px solid rgba(255,255,255,0.12)', boxShadow: `0 4px 16px ${cm.color}40` }}>
            <cm.icon className="w-7 h-7" style={{ color: cm.color }} />
          </div>
          <div className="min-w-0 flex-1 pr-10">
            <p className="text-[17px] font-black text-white leading-tight truncate">{asset.name}</p>
            <p className="text-[11px] font-semibold mt-0.5" style={{ color: 'rgba(255,255,255,0.42)' }}>
              {[asset.brand, asset.model].filter(Boolean).join(' · ') || cm.label}
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col px-5 pt-4 pb-4 gap-3">
        {warrantyDays !== null && (
          <div className="flex items-center justify-between px-3 py-2.5 rounded-2xl"
            style={{ background: wBg ?? '#f8fafc', border: `1px solid ${wColor ? wColor + '22' : '#f1f5f9'}` }}>
            <span className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: wColor ?? '#64748b' }}>
              <RiShieldCheckLine className="w-3.5 h-3.5" />Warranty
            </span>
            <span className="text-[12px] font-bold" style={{ color: wColor ?? '#64748b' }}>
              {warrantyDays < 0 ? 'Expired' : `${warrantyDays}d left`}
            </span>
          </div>
        )}

        {asset.maintenance?.nextService && (
          <div className="flex items-center justify-between px-3 py-2.5 rounded-2xl bg-slate-50" style={{ border: '1px solid #f1f5f9' }}>
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500">
              <RiCalendarCheckLine className="w-3.5 h-3.5" />Next Service
            </span>
            <span className="text-[12px] font-bold text-slate-700">{fmtDate(asset.maintenance.nextService)}</span>
          </div>
        )}

        <div className="flex-1" />

        <div className="border-t border-slate-100 pt-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            {(asset.currentValue || asset.purchasePrice) && (
              <>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Value</p>
                <p className="text-[16px] font-black leading-tight truncate" style={{ color: '#0b1d3a' }}>
                  AED {(asset.currentValue ?? asset.purchasePrice ?? 0).toLocaleString()}
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={onUnassign} title="Unassign from this area"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-100 transition-all">
              <RiCloseCircleLine className="w-3.5 h-3.5" />
            </button>
            <Link to={`/assets/${asset.id}`}
              className="flex items-center gap-1 text-[12px] font-bold text-slate-400 hover:text-slate-800 transition-colors px-2 py-1.5">
              View <RiArrowRightLine className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══ Asset List Row ══ */
function AssetRow({ asset, last, onUnassign }) {
  const cm = catMeta(asset.category);
  const sm = statusMeta(asset.status);
  const wd = daysUntil(asset.warranty?.expiryDate);
  return (
    <div className={cn('flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors', !last && 'border-b border-slate-50')}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: cm.bg }}>
        <cm.icon className="w-4 h-4" style={{ color: cm.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-slate-800 truncate">{asset.name}</p>
        <p className="text-[11px] text-slate-400 truncate">{[asset.brand, asset.model].filter(Boolean).join(' · ') || '—'}</p>
      </div>
      <span className="hidden sm:flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 w-28 justify-center"
        style={{ background: cm.bg, color: cm.color }}>
        <cm.icon className="w-3 h-3" />{cm.label}
      </span>
      <div className="flex items-center gap-1.5 shrink-0 w-28">
        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: sm.color }} />
        <span className="text-[12px] font-semibold text-slate-700 truncate">{sm.label}</span>
      </div>
      <span className="hidden md:block text-[12px] text-slate-500 shrink-0 w-28 truncate">
        {wd !== null ? (wd < 0 ? 'Expired' : `${wd}d left`) : '—'}
      </span>
      <span className="text-[12px] font-bold shrink-0 w-16 text-right" style={{ color: '#0b1d3a' }}>
        {(asset.currentValue || asset.purchasePrice)
          ? `AED ${(asset.currentValue ?? asset.purchasePrice).toLocaleString()}`
          : '—'}
      </span>
      <div className="flex items-center gap-1 shrink-0 w-16 justify-end">
        <button onClick={onUnassign} title="Unassign"
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
          <RiCloseCircleLine className="w-3.5 h-3.5" />
        </button>
        <Link to={`/assets/${asset.id}`}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
          <RiArrowRightLine className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

/* ══ Edit Area Modal ══ */
function EditAreaModal({ open, onClose, area, floors, propertyName, onSave, isSubmitting }) {
  const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm();
  const selectedType    = useWatch({ control, name: 'type' });
  const selectedFloorId = useWatch({ control, name: 'floorId', defaultValue: '' });
  const [floorOpen, setFloorOpen] = useState(false);

  useEffect(() => {
    if (!open || !area) return;
    const isCustom = area.type && !AREA_TYPES.includes(area.type);
    reset({
      name:        area.name        ?? '',
      type:        isCustom ? 'Other' : (area.type ?? ''),
      customType:  isCustom ? area.type : '',
      floorId:     area.floorId     ?? '',
      floorName:   area.floorName   ?? '',
      description: area.description ?? '',
      size:        area.size        ?? '',
    });
  }, [open, area, reset]);

  const handleSave = ({ customType, ...data }) => {
    const finalType = data.type === 'Other' ? (customType?.trim() || 'Other') : data.type;
    onSave({ ...data, type: finalType });
  };

  const selectedFloor = floors.find((f) => f.id === selectedFloorId);

  return (
    <Modal open={open} onClose={onClose} title="Edit Area"
      subtitle={`Update details for ${area?.name ?? 'this area'} in ${propertyName ?? 'your property'}`}>
      <form onSubmit={handleSubmit(handleSave)} className="space-y-5">
        <Field label="Area Name" required error={errors.name?.message}>
          <Input {...register('name', { required: 'Name is required' })} placeholder="e.g. Master Bedroom" />
        </Field>

        <FormGrid>
          <Field label="Area Type" required error={errors.type?.message}>
            <Select {...register('type', { required: 'Type is required' })} placeholder="Select type"
              options={AREA_TYPES.map((t) => ({ value: t, label: t }))} />
          </Field>
          <Field label="Size / Area">
            <Input {...register('size')} placeholder="e.g. 45 sqm" />
          </Field>
        </FormGrid>

        {selectedType === 'Other' && (
          <Field label="Custom Type Name" required error={errors.customType?.message}>
            <Input {...register('customType', { required: 'Required when type is Other' })}
              placeholder="e.g. Gym, Cinema Room…" />
          </Field>
        )}

        {/* Floor picker */}
        <Field label="Floor">
          <div className="relative">
            <button type="button" onClick={() => setFloorOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] hover:border-slate-300 transition-colors"
              style={{ minHeight: '42px' }}>
              {selectedFloor ? (
                <span className="flex items-center gap-2 text-slate-700 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: selectedFloor.color ?? '#0b1d3a' }} />
                  <span className="truncate">{selectedFloor.name}</span>
                </span>
              ) : (
                <span className="text-slate-400">No floor selected</span>
              )}
              <RiArrowDownSLine className={cn('w-4 h-4 text-slate-400 shrink-0 transition-transform', floorOpen && 'rotate-180')} />
            </button>
            {floorOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden py-1 max-h-48 overflow-y-auto">
                <button type="button" onClick={() => { setValue('floorId', ''); setValue('floorName', ''); setFloorOpen(false); }}
                  className={cn('w-full flex items-center gap-2 px-3 py-2 text-[13px] text-left transition-colors',
                    !selectedFloorId ? 'bg-slate-50 text-slate-600 font-semibold' : 'text-slate-400 hover:bg-slate-50')}>
                  No floor
                </button>
                {floors.map((f) => (
                  <button key={f.id} type="button"
                    onClick={() => { setValue('floorId', f.id); setValue('floorName', f.name); setFloorOpen(false); }}
                    className={cn('w-full flex items-center gap-2 px-3 py-2 text-[13px] text-left transition-colors',
                      selectedFloorId === f.id ? 'bg-slate-50 font-semibold' : 'text-slate-700 hover:bg-slate-50')}>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: f.color ?? '#0b1d3a' }} />
                    <span style={selectedFloorId === f.id ? { color: f.color ?? '#0b1d3a' } : {}}>{f.name}</span>
                    {selectedFloorId === f.id && <RiCheckLine className="w-3.5 h-3.5 ml-auto" style={{ color: f.color ?? '#0b1d3a' }} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Field>

        <Field label="Description / Notes">
          <Textarea {...register('description')} rows={3} placeholder="Special features, access notes…" />
        </Field>

        <FormActions onCancel={onClose} submitLabel="Update Area" loading={isSubmitting} />
      </form>
    </Modal>
  );
}

/* ══ Assign Asset Modal ══ */
function AssignModal({ open, onClose, otherAssets, allAreas, areaName, onAssign }) {
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState(new Set());

  useEffect(() => { if (!open) { setSearch(''); setSelected(new Set()); } }, [open]);

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

  const getAreaName = (areaId) => {
    if (!areaId) return null;
    return allAreas.find((ar) => ar.id === areaId)?.name ?? null;
  };

  const handleConfirm = async () => {
    const toAssign = otherAssets.filter((a) => selected.has(a.id));
    await Promise.all(toAssign.map((a) => onAssign(a)));
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}>
        <motion.div initial={{ opacity: 0, y: -20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.97 }} transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl overflow-hidden w-full max-w-lg flex flex-col"
          style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.25)', maxHeight: '90vh' }}>

          <div className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-[17px] font-bold text-slate-900">Assign Assets</h2>
                <p className="text-[12px] text-slate-400 mt-0.5">
                  to <span className="font-bold text-slate-600">{areaName}</span>
                </p>
              </div>
              <button onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                <RiCloseCircleLine className="w-5 h-5" />
              </button>
            </div>
            <div className="relative">
              <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, brand, category…"
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-[13px] placeholder-slate-400 outline-none focus:bg-white focus:border-blue-400 transition-all" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
            {filtered.length === 0 ? (
              <div className="py-10 text-center">
                <RiBox3Line className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-[13px] text-slate-400 font-medium">
                  {otherAssets.length === 0 ? 'All assets are already in this area.' : 'No assets match your search.'}
                </p>
              </div>
            ) : (
              filtered.map((asset) => {
                const cm        = catMeta(asset.category);
                const isSelected = selected.has(asset.id);
                const currentArea = getAreaName(asset.areaId);
                return (
                  <div key={asset.id} onClick={() => toggle(asset.id)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all mb-1',
                      isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent',
                    )}>
                    <div className={cn('w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all',
                      isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300')}>
                      {isSelected && (
                        <svg width="10" height="10" viewBox="0 0 10 10">
                          <polyline points="2,5.5 4,7.5 8,3" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: cm.bg }}>
                      <cm.icon className="w-4 h-4" style={{ color: cm.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-slate-800 truncate">{asset.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {[asset.brand, asset.model].filter(Boolean).join(' · ')}
                        {currentArea && <span className="ml-1.5 text-amber-600 font-semibold">· In {currentArea}</span>}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: cm.bg, color: cm.color }}>
                      {cm.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
            <p className="text-[12px] text-slate-400">
              {selected.size > 0
                ? <span className="font-bold text-slate-700">{selected.size} asset{selected.size !== 1 ? 's' : ''} selected</span>
                : 'Click assets to select them'}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={onClose}
                className="px-4 py-2 rounded-xl text-[13px] font-semibold text-slate-600 hover:bg-slate-200 transition-all">
                Cancel
              </button>
              <button onClick={handleConfirm} disabled={selected.size === 0}
                className={cn('px-5 py-2 rounded-xl text-[13px] font-bold text-white transition-all',
                  selected.size > 0 ? 'opacity-100 cursor-pointer' : 'opacity-40 cursor-not-allowed')}
                style={{ background: 'linear-gradient(135deg, #0b1d3a, #1e3a6e)' }}>
                Assign {selected.size > 0 ? `${selected.size} Asset${selected.size !== 1 ? 's' : ''}` : 'Assets'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
