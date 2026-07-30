import { useState, useEffect } from 'react';
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  RiArrowLeftLine, RiEditLine, RiDeleteBinLine, RiAddLine,
  RiMapPin2Line, RiShieldCheckLine, RiCalendarCheckLine,
  RiToolsLine, RiFileTextLine, RiCheckboxCircleLine,
  RiTimerLine, RiCloseCircleLine, RiThermometerLine,
  RiDropLine, RiFlashlightLine, RiPlugLine, RiSofaLine,
  RiLeafLine, RiContrastDropLine, RiBuildingLine, RiBox3Line,
  RiLightbulbLine, RiTempColdLine, RiCloseLine, RiCheckLine,
  RiDownload2Line, RiEyeLine, RiFileWarningLine,
  RiInformationLine, RiHistoryLine,
} from 'react-icons/ri';
import {
  Package, Shield, CalendarClock, FolderOpen, Hash,
  AlertTriangle, MapPin, Wrench, Upload,
} from 'lucide-react';
import { useGetQuery, usePutMutation, useDeleteMutation } from '../../api/apiSlice';
import { selectCurrentPropertyId } from '../../store/slices/propertiesSlice';
import PageLoader    from '../../components/ui/PageLoader';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Modal         from '../../components/ui/Modal';
import { Field, Input, Select, Textarea, FormGrid, FormSection, FormActions } from '../../components/ui/FormField';
import { cn } from '../../utils/cn';

/* ── constants ─────────────────────────────────────────────────────────────── */
const ASSET_CATS     = ['HVAC','Plumbing','Electrical','Appliances','Furniture','Security','Garden','Pool','Structural','Other'];
const CONDITIONS     = ['excellent','good','fair','poor'];
const WARRANTY_TYPES = ['Parts & Labor','Parts Only','Labor Only','Manufacturer'];

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
  operational:    { label: 'Operational',  icon: RiCheckboxCircleLine, color: '#16a34a', bg: '#f0fdf4' },
  'service-due':  { label: 'Service Due',  icon: RiTimerLine,          color: '#d97706', bg: '#fffbeb' },
  'under-repair': { label: 'Under Repair', icon: RiToolsLine,          color: '#dc2626', bg: '#fef2f2' },
  inactive:       { label: 'Inactive',     icon: RiCloseCircleLine,    color: '#64748b', bg: '#f8fafc' },
};
const statusMeta = (s) => STATUS_META[s] ?? STATUS_META.operational;

const SVC_STATUS = {
  completed: { label: 'Completed', color: '#16a34a', bg: '#f0fdf4' },
  pending:   { label: 'Pending',   color: '#d97706', bg: '#fffbeb' },
  cancelled: { label: 'Cancelled', color: '#64748b', bg: '#f8fafc' },
};

function daysUntil(d) { return d ? Math.ceil((new Date(d + 'T00:00:00') - new Date()) / 86400000) : null; }
function fmtDate(d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!d) return '—';
  const dt = new Date(d + (d.length === 10 ? 'T00:00:00' : ''));
  return isNaN(dt) ? '—' : dt.toLocaleDateString('en-AE', opts);
}

const TABS = [
  { id: 'details',  label: 'Details',        icon: RiInformationLine  },
  { id: 'warranty', label: 'Warranty',        icon: RiShieldCheckLine  },
  { id: 'history',  label: 'Service History', icon: RiHistoryLine      },
  { id: 'schedule', label: 'Schedule',        icon: RiCalendarCheckLine },
  { id: 'docs',     label: 'Documents',       icon: RiFileTextLine     },
];

function InfoRow({ label, value }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 py-3 border-b border-slate-50 last:border-0')}>
      <span className="text-[12px] text-slate-400 font-medium shrink-0 min-w-25">{label}</span>
      <span className="text-[13px] font-semibold text-slate-800 text-right">{value || '—'}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   AssetDetail
══════════════════════════════════════════════════════════════════════════════ */
export default function AssetDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const propertyId = useSelector(selectCurrentPropertyId);

  const { data: asset, isLoading, isError } = useGetQuery(
    { path: `/assets/${id}` },
    { skip: !id },
  );
  const { data: areas = [] } = useGetQuery(
    { path: '/areas', params: { propertyId } },
    { skip: !propertyId },
  );

  const [updateAssetMut, { isLoading: isUpdating  }] = usePutMutation();
  const [deleteAssetMut, { isLoading: isDeleting  }] = useDeleteMutation();
  const [unassignMut,    { isLoading: isUnassigning }] = usePutMutation();

  const [tab,          setTab]          = useState('details');
  const [editOpen,     setEditOpen]     = useState(false);
  const [deleteOpen,   setDeleteOpen]   = useState(false);
  const [unassignOpen, setUnassignOpen] = useState(false);

  // ── Loading / error ────────────────────────────────────────────────────────
  if (isLoading) return <PageLoader icon={Package} text="Loading asset…" />;
  if (isError || !asset) return <Navigate to="/assets" replace />;

  const canDelete = !asset.areaId;
  const cm        = catMeta(asset.category);
  const sm          = statusMeta(asset.status);
  const warranty    = asset.warranty    ?? {};
  const maintenance = asset.maintenance ?? {};
  const serviceHistory = asset.serviceHistory ?? [];
  const documents      = asset.documents      ?? [];

  const warrantyDays   = daysUntil(warranty.expiryDate);
  const warrantyActive = warrantyDays !== null && warrantyDays >= 0;
  const nextServiceDays = daysUntil(maintenance.nextService);
  const totalSpend     = serviceHistory.reduce((s, i) => s + (i.cost || 0), 0);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSave = async (data) => {
    if (isUpdating) return;
    try {
      const assignedArea = areas.find((a) => a.id === data.areaId);
      await updateAssetMut({
        path: `/assets/${id}`,
        body: {
          ...asset,
          ...data,
          areaId:   data.areaId   || null,
          areaName: assignedArea?.name || '',
          serialNumber: data.serial ?? asset.serialNumber,
          purchasePrice: parseFloat(data.purchasePrice) || 0,
          currentValue:  parseFloat(data.currentValue)  || 0,
          warranty: { ...asset.warranty, ...data.warranty },
        },
      }).unwrap();
      toast.success('Asset updated!');
      setEditOpen(false);
    } catch (err) { toast.error(err.data?.error || 'Failed to update'); }
  };

  const handleUnassign = async () => {
    if (isUnassigning) return;
    try {
      await unassignMut({
        path: `/assets/${id}`,
        body: { ...asset, areaId: null, areaName: '' },
      }).unwrap();
      toast.success(`"${asset.name}" freed from ${asset.areaName}`);
      setUnassignOpen(false);
    } catch (err) { toast.error(err.data?.error || 'Failed to unassign'); }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    try {
      await deleteAssetMut({ path: `/assets/${id}` }).unwrap();
      toast.success(`"${asset.name}" deleted`);
      navigate('/assets');
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
          to="/assets"
          className="flex items-center gap-1.5 text-[13px] font-bold text-slate-500 hover:text-slate-800 transition-colors group"
        >
          <span className="w-8 h-8 rounded-xl border border-slate-200 bg-white flex items-center justify-center group-hover:border-slate-300 transition-all"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <RiArrowLeftLine className="w-4 h-4" />
          </span>
          <span className="hidden sm:block">Back to Assets</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold border border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-all"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
          >
            <RiEditLine className="w-4 h-4" />
            <span className="hidden sm:block">Edit Asset</span>
          </button>
          {asset.areaId && (
            <button
              onClick={() => setUnassignOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-bold border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
            >
              <RiMapPin2Line className="w-4 h-4" />
              <span className="hidden sm:block">Unassign</span>
            </button>
          )}
          <button
            onClick={() => {
              if (!canDelete) {
                toast(`Unassign "${asset.name}" from "${asset.areaName}" before deleting`, { icon: '⚠️' });
                return;
              }
              setDeleteOpen(true);
            }}
            title={!canDelete ? `Unassign from "${asset.areaName}" first` : 'Delete asset'}
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
      <div className="relative rounded-3xl overflow-hidden"
        style={{ background: 'linear-gradient(150deg, #0a172e 0%, #0c1f3f 55%, #0e2550 100%)' }}>
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        {/* Category color strip */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: cm.color }} />
        {/* Decorative rings */}
        <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.10)', pointerEvents: 'none' }} />
        {/* Watermark text */}
        <div style={{ position: 'absolute', right: 16, bottom: -12, fontSize: 88, fontWeight: 900, lineHeight: 1, color: 'rgba(255,255,255,0.04)', letterSpacing: '-3px', userSelect: 'none', pointerEvents: 'none' }}>
          {asset.name.substring(0, 4).toUpperCase()}
        </div>

        <div className="relative z-10 p-5 sm:p-8 pt-6 sm:pt-8">
          {/* Top row */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl shrink-0 flex items-center justify-center"
                style={{ background: `${cm.color}22`, border: '2.5px solid rgba(255,255,255,0.15)', boxShadow: `0 4px 20px ${cm.color}50` }}>
                <cm.icon className="w-8 h-8" style={{ color: cm.color }} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: sm.bg, color: sm.color }}>
                    <sm.icon className="w-3 h-3" />{sm.label}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${cm.color}22`, color: cm.color, border: `1px solid ${cm.color}30` }}>
                    {cm.label}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">{asset.name}</h1>
                {(asset.brand || asset.model) && (
                  <p className="text-[13px] mt-1" style={{ color: 'rgba(255,255,255,0.42)' }}>
                    {[asset.brand, asset.model].filter(Boolean).join(' · ')}
                  </p>
                )}
                {asset.areaName && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <Link to={`/areas/${asset.areaId}`}
                      className="flex items-center gap-1 text-[12px] hover:underline"
                      style={{ color: 'rgba(255,255,255,0.40)' }}>
                      <RiMapPin2Line className="w-3.5 h-3.5" />{asset.areaName}
                    </Link>
                    <button
                      onClick={() => setUnassignOpen(true)}
                      title="Unassign from this area"
                      className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full transition-all"
                      style={{ background: 'rgba(251,191,36,0.15)', color: 'rgba(251,191,36,0.85)', border: '1px solid rgba(251,191,36,0.25)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(251,191,36,0.25)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(251,191,36,0.15)')}>
                      <RiCloseCircleLine className="w-3 h-3" />Free
                    </button>
                  </div>
                )}
              </div>
            </div>

            <Link to="/maintenance"
              className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold text-white whitespace-nowrap transition-all"
              style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.10)')}>
              <CalendarClock className="w-4 h-4" />Book Service
            </Link>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {[
              { label: 'Purchase Date',   value: fmtDate(asset.purchaseDate, { month: 'short', year: 'numeric' }) },
              { label: 'Service Records', value: serviceHistory.length },
              { label: 'Total Spent',     value: `AED ${totalSpend.toLocaleString()}` },
              { label: 'Next Service',
                value: nextServiceDays === null ? '—' : nextServiceDays < 0 ? 'Overdue' : `${nextServiceDays}d`,
                warn: nextServiceDays !== null && nextServiceDays < 0,
              },
            ].map((s) => (
              <div key={s.label} className="text-center rounded-2xl px-2 sm:px-4 py-3"
                style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${s.warn ? '#dc2626' : 'rgba(255,255,255,0.10)'}` }}>
                <p className={cn('text-lg sm:text-2xl font-bold leading-none', s.warn ? 'text-red-400' : 'text-white')}>{s.value}</p>
                <p className="text-[9px] sm:text-[11px] mt-1 font-medium leading-snug" style={{ color: 'rgba(255,255,255,0.38)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-1.5 flex items-center gap-1 overflow-x-auto"
        style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-[12px] sm:text-[13px] font-semibold whitespace-nowrap transition-all duration-150',
              tab === t.id ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50',
            )}
            style={tab === t.id ? { background: '#0b1d3a' } : {}}>
            <t.icon className="w-4 h-4 shrink-0" />
            <span className="hidden sm:block">{t.label}</span>
            <span className="sm:hidden">{t.label.split(' ')[0]}</span>
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

          {/* ─── Details ─── */}
          {tab === 'details' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <InfoCard title="Asset Information" icon={RiBox3Line}>
                <InfoRow label="Name"          value={asset.name}                  />
                <InfoRow label="Category"      value={cm.label}                    />
                <InfoRow label="Brand"         value={asset.brand}                 />
                <InfoRow label="Model"         value={asset.model}                 />
                <InfoRow label="Serial Number" value={asset.serialNumber}          />
                <InfoRow label="Condition"     value={asset.condition}             />
                <InfoRow label="Status"        value={sm.label}                    />
                <InfoRow label="Location"      value={asset.areaName || 'Unassigned'} />
              </InfoCard>

              <InfoCard title="Purchase & Value" icon={RiCheckboxCircleLine}>
                <InfoRow label="Purchase Date"  value={fmtDate(asset.purchaseDate)}     />
                <InfoRow label="Purchase Price" value={`AED ${(asset.purchasePrice ?? 0).toLocaleString()}`} />
                <InfoRow label="Current Value"  value={`AED ${(asset.currentValue  ?? 0).toLocaleString()}`} />
                <InfoRow label="Install Date"   value={fmtDate(asset.installDate)}      />
                <InfoRow label="Installer"      value={asset.installer}                 />
              </InfoCard>

              {asset.notes && (
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5"
                  style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-3">Notes</p>
                  <p className="text-[14px] text-slate-700 leading-relaxed">{asset.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* ─── Warranty ─── */}
          {tab === 'warranty' && (
            <div className="space-y-5">
              {/* Warranty status hero */}
              <div className="relative rounded-2xl overflow-hidden p-6"
                style={{ background: warrantyActive ? 'linear-gradient(135deg, #0b1d3a, #1e3a6e)' : 'linear-gradient(135deg, #374151, #4b5563)' }}>
                <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
                <div className="flex items-start gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.20)' }}>
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <span className="inline-block text-[10px] font-bold px-2.5 py-1 rounded-full mb-2"
                      style={{ background: warrantyActive ? 'rgba(34,197,94,0.2)' : 'rgba(107,114,128,0.3)', color: warrantyActive ? '#86efac' : '#d1d5db' }}>
                      {warrantyActive ? 'Active Warranty' : 'Warranty Expired'}
                    </span>
                    <p className="text-white font-bold text-xl leading-tight">{warranty.type || 'Not specified'}</p>
                    <p className="text-[13px] mt-0.5" style={{ color: 'rgba(255,255,255,0.50)' }}>{warranty.provider || '—'}</p>
                  </div>
                </div>
                {warrantyDays !== null && (
                  <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between relative z-10">
                    <span className="text-[12px] text-white/50">{warrantyActive ? 'Expires' : 'Expired'}</span>
                    <span className={cn('text-[15px] font-bold', warrantyActive ? 'text-white' : 'text-red-400')}>
                      {warrantyDays < 0 ? `${Math.abs(warrantyDays)} days ago` : `In ${warrantyDays} days · ${fmtDate(warranty.expiryDate)}`}
                    </span>
                  </div>
                )}
              </div>

              <InfoCard title="Warranty Details" icon={RiShieldCheckLine}>
                <InfoRow label="Provider"      value={warranty.provider}     />
                <InfoRow label="Contact Phone" value={warranty.phone}        />
                <InfoRow label="Policy Number" value={warranty.policyNumber} />
                <InfoRow label="Coverage"      value={warranty.coverage}     />
                <InfoRow label="Type"          value={warranty.type}         />
                <InfoRow label="Start Date"    value={fmtDate(warranty.startDate)}  />
                <InfoRow label="Expiry Date"   value={fmtDate(warranty.expiryDate)} />
              </InfoCard>
            </div>
          )}

          {/* ─── Service History ─── */}
          {tab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[13px] text-slate-500 font-medium">
                  {serviceHistory.length} record{serviceHistory.length !== 1 ? 's' : ''} · Total AED {totalSpend.toLocaleString()}
                </p>
                <Link to="/maintenance"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all"
                  style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  <RiAddLine className="w-3.5 h-3.5" />Add Record
                </Link>
              </div>

              {serviceHistory.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center"
                  style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                  <RiHistoryLine className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-[14px] font-semibold text-slate-400">No service records yet</p>
                  <p className="text-[12px] text-slate-400 mt-1">Service history will appear here after maintenance visits.</p>
                </div>
              ) : (
                serviceHistory.map((svc, i) => {
                  const ss = SVC_STATUS[svc.status] ?? SVC_STATUS.completed;
                  return (
                    <motion.div key={svc.id ?? i}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}>
                      <div className="bg-white rounded-2xl border border-slate-100 p-5"
                        style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                              style={{ background: ss.bg }}>
                              <Wrench className="w-5 h-5" style={{ color: ss.color }} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[14px] font-bold text-slate-800 truncate">{svc.type}</p>
                              <p className="text-[12px] text-slate-400">{fmtDate(svc.date)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: ss.bg, color: ss.color }}>
                              {ss.label}
                            </span>
                            {(svc.cost > 0) && (
                              <span className="text-[13px] font-bold" style={{ color: '#0b1d3a' }}>AED {svc.cost.toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-50">
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Company</p>
                            <p className="text-[12px] font-semibold text-slate-700">{svc.company || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Technician</p>
                            <p className="text-[12px] font-semibold text-slate-700">{svc.technician || '—'}</p>
                          </div>
                          {svc.notes && (
                            <div className="col-span-2 sm:col-span-1">
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Notes</p>
                              <p className="text-[12px] text-slate-600 leading-relaxed">{svc.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}

          {/* ─── Schedule ─── */}
          {tab === 'schedule' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Frequency',    value: maintenance.frequency   || '—', icon: CalendarClock, warn: false },
                  { label: 'Last Service', value: fmtDate(maintenance.lastService), icon: RiCheckboxCircleLine, warn: false },
                  { label: 'Next Service',
                    value: nextServiceDays === null ? '—' : nextServiceDays < 0 ? 'Overdue' : fmtDate(maintenance.nextService),
                    icon: nextServiceDays !== null && nextServiceDays < 0 ? AlertTriangle : RiTimerLine,
                    warn: nextServiceDays !== null && nextServiceDays < 0,
                  },
                ].map((s) => (
                  <div key={s.label}
                    className="bg-white rounded-2xl border p-5 text-center"
                    style={{ borderColor: s.warn ? '#fca5a5' : '#f1f5f9', background: s.warn ? '#fef2f2' : '#fff', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                      style={{ background: s.warn ? '#fee2e2' : '#f8fafc' }}>
                      {typeof s.icon === 'function'
                        ? <s.icon className="w-5 h-5" style={{ color: s.warn ? '#dc2626' : '#64748b' }} />
                        : <s.icon className="w-5 h-5" style={{ color: s.warn ? '#dc2626' : '#64748b' }} />}
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">{s.label}</p>
                    <p className={cn('text-[17px] font-bold leading-tight', s.warn ? 'text-red-600' : 'text-slate-800')}>{s.value}</p>
                  </div>
                ))}
              </div>

              <InfoCard title="Maintenance Details" icon={RiToolsLine}>
                <InfoRow label="Service Company"   value={maintenance.company}                    />
                <InfoRow label="Frequency"         value={maintenance.frequency}                  />
                <InfoRow label="Last Service Date" value={fmtDate(maintenance.lastService)}       />
                <InfoRow label="Next Service Date" value={fmtDate(maintenance.nextService)}       />
              </InfoCard>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/maintenance"
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-[14px] text-white"
                  style={{ background: 'linear-gradient(135deg, #0b1d3a, #1e3a6e)' }}>
                  <CalendarClock className="w-5 h-5" />Schedule Service Now
                </Link>
              </div>
            </div>
          )}

          {/* ─── Documents ─── */}
          {tab === 'docs' && (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
              style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <p className="text-[15px] font-bold text-slate-800">Documents</p>
                  <p className="text-[12px] text-slate-400">{documents.length} file{documents.length !== 1 ? 's' : ''}</p>
                </div>
                <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all">
                  <Upload className="w-4 h-4" />Upload
                </button>
              </div>

              {documents.length === 0 ? (
                <div className="p-12 text-center">
                  <RiFileWarningLine className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-[14px] font-semibold text-slate-400">No documents yet</p>
                  <p className="text-[12px] text-slate-400 mt-1">Upload warranties, manuals, or receipts.</p>
                </div>
              ) : (
                documents.map((doc) => {
                  const ext = (doc.type ?? doc.name?.split('.').pop() ?? '').toLowerCase();
                  const extColors = { pdf: { bg: '#fef2f2', color: '#dc2626' }, jpg: { bg: '#f0f5ff', color: '#2563eb' }, png: { bg: '#f0fdf4', color: '#16a34a' } };
                  const ec = extColors[ext] ?? { bg: '#f8fafc', color: '#64748b' };
                  return (
                    <div key={doc.id ?? doc.name} className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors group">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-[10px] font-black"
                        style={{ background: ec.bg, color: ec.color }}>
                        {ext.toUpperCase() || 'DOC'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-800 truncate">{doc.name}</p>
                        <p className="text-[11px] text-slate-400">{doc.size ?? ''}{doc.uploaded ? ` · ${fmtDate(doc.uploaded)}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-all">
                          <RiEyeLine className="w-3.5 h-3.5" />
                        </button>
                        <button className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-green-600 transition-all">
                          <RiDownload2Line className="w-3.5 h-3.5" />
                        </button>
                        <button className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all">
                          <RiDeleteBinLine className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* ── Unassign Confirm ── */}
      <ConfirmDialog
        open={unassignOpen}
        onClose={() => setUnassignOpen(false)}
        onConfirm={handleUnassign}
        loading={isUnassigning}
        title="Unassign from Area"
        message={`Remove "${asset.name}" from "${asset.areaName}"? The asset will become unassigned and can be assigned to a different area.`}
        confirmLabel="Unassign"
      />

      {/* ── Edit Modal ── */}
      <EditAssetModal
        open={editOpen}
        asset={asset}
        areas={areas}
        onClose={() => setEditOpen(false)}
        onSave={handleSave}
        isSubmitting={isUpdating}
      />

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={isDeleting}
        title="Delete Asset"
        message={`Delete "${asset.name}"? This cannot be undone.`}
        confirmLabel="Delete Asset"
      />
    </motion.div>
  );
}

/* ══ Info Card wrapper ══ */
function InfoCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5"
      style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-slate-400" />
        <p className="text-[13px] font-bold text-slate-700">{title}</p>
      </div>
      {children}
    </div>
  );
}

/* ══ Edit Asset Modal ══ */
function EditAssetModal({ open, onClose, asset, areas, onSave, isSubmitting }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    if (!open || !asset) return;
    reset({
      name:          asset.name              ?? '',
      category:      asset.category          ?? '',
      status:        asset.status            ?? 'operational',
      condition:     asset.condition         ?? 'good',
      brand:         asset.brand             ?? '',
      model:         asset.model             ?? '',
      serial:        asset.serialNumber      ?? '',
      purchaseDate:  asset.purchaseDate      ?? '',
      purchasePrice: asset.purchasePrice     ?? '',
      currentValue:  asset.currentValue      ?? '',
      installDate:   asset.installDate       ?? '',
      installer:     asset.installer         ?? '',
      areaId:        asset.areaId            ?? '',
      notes:         asset.notes             ?? '',
      // warranty fields
      wProvider:     asset.warranty?.provider    ?? '',
      wPhone:        asset.warranty?.phone       ?? '',
      wPolicy:       asset.warranty?.policyNumber ?? '',
      wType:         asset.warranty?.type        ?? 'Parts & Labor',
      wCoverage:     asset.warranty?.coverage    ?? '',
      wStart:        asset.warranty?.startDate   ?? '',
      wExpiry:       asset.warranty?.expiryDate  ?? '',
      // maintenance fields
      mFrequency:    asset.maintenance?.frequency   ?? '',
      mLastService:  asset.maintenance?.lastService ?? '',
      mNextService:  asset.maintenance?.nextService ?? '',
      mCompany:      asset.maintenance?.company     ?? '',
    });
  }, [open, asset, reset]);

  const onSubmit = (d) => {
    const assignedArea = areas.find((a) => a.id === d.areaId);
    onSave({
      name:          d.name,
      category:      d.category,
      status:        d.status,
      condition:     d.condition,
      brand:         d.brand        ?? '',
      model:         d.model        ?? '',
      serialNumber:  d.serial       ?? '',
      purchaseDate:  d.purchaseDate ?? '',
      purchasePrice: parseFloat(d.purchasePrice) || 0,
      currentValue:  parseFloat(d.currentValue)  || 0,
      installDate:   d.installDate  ?? '',
      installer:     d.installer    ?? '',
      areaId:        d.areaId       || null,
      areaName:      assignedArea?.name || '',
      notes:         d.notes        ?? '',
      warranty: {
        provider:      d.wProvider ?? '',
        phone:         d.wPhone    ?? '',
        policyNumber:  d.wPolicy   ?? '',
        type:          d.wType     ?? '',
        coverage:      d.wCoverage ?? '',
        startDate:     d.wStart    ?? '',
        expiryDate:    d.wExpiry   ?? '',
      },
      maintenance: {
        frequency:   d.mFrequency   ?? '',
        lastService: d.mLastService  ?? '',
        nextService: d.mNextService  ?? '',
        company:     d.mCompany      ?? '',
      },
    });
  };

  return (
    <Modal open={open} onClose={onClose} size="lg"
      title="Edit Asset"
      subtitle={`Update details for ${asset?.name ?? 'this asset'}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <FormGrid>
          <Field label="Asset Name" required error={errors.name?.message}>
            <Input {...register('name', { required: 'Required' })} placeholder="e.g. Daikin Split AC" />
          </Field>
          <Field label="Category" required error={errors.category?.message}>
            <Select {...register('category', { required: 'Required' })} placeholder="Select category"
              options={ASSET_CATS.map((c) => ({ value: c, label: c }))} />
          </Field>
        </FormGrid>

        <FormGrid>
          <Field label="Status">
            <Select {...register('status')} options={[
              { value: 'operational',  label: 'Operational'  },
              { value: 'service-due',  label: 'Service Due'  },
              { value: 'under-repair', label: 'Under Repair' },
              { value: 'inactive',     label: 'Inactive'     },
            ]} />
          </Field>
          <Field label="Condition">
            <Select {...register('condition')} options={CONDITIONS.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))} />
          </Field>
        </FormGrid>

        <Field label="Assign to Area">
          <Select {...register('areaId')} options={[
            { value: '', label: 'Not assigned' },
            ...areas.map((a) => ({ value: a.id, label: a.floorName ? `${a.name} · ${a.floorName}` : a.name })),
          ]} />
        </Field>

        <FormSection title="Make & Model">
          <FormGrid>
            <Field label="Brand"><Input {...register('brand')}    placeholder="e.g. Daikin" /></Field>
            <Field label="Model"><Input {...register('model')}    placeholder="e.g. FTKM50TVMF" /></Field>
            <Field label="Serial Number"><Input {...register('serial')} placeholder="Serial / barcode" /></Field>
          </FormGrid>
        </FormSection>

        <FormSection title="Purchase & Value">
          <FormGrid>
            <Field label="Purchase Date"><Input {...register('purchaseDate')} type="date" /></Field>
            <Field label="Install Date"><Input {...register('installDate')} type="date" /></Field>
            <Field label="Installer"><Input {...register('installer')} placeholder="Installer name" /></Field>
            <Field label="Purchase Price (AED)"><Input {...register('purchasePrice')} type="number" min="0" step="0.01" placeholder="0.00" /></Field>
            <Field label="Current Value (AED)"><Input {...register('currentValue')} type="number" min="0" step="0.01" placeholder="0.00" /></Field>
          </FormGrid>
        </FormSection>

        <FormSection title="Warranty">
          <FormGrid>
            <Field label="Provider"><Input {...register('wProvider')} placeholder="e.g. Daikin UAE" /></Field>
            <Field label="Contact Phone"><Input {...register('wPhone')} placeholder="+971 4 XXX XXXX" /></Field>
            <Field label="Policy Number"><Input {...register('wPolicy')} placeholder="Policy #" /></Field>
            <Field label="Warranty Type">
              <Select {...register('wType')} options={WARRANTY_TYPES.map((t) => ({ value: t, label: t }))} />
            </Field>
            <Field label="Coverage"><Input {...register('wCoverage')} placeholder="e.g. Full parts and labor" /></Field>
            <Field label="Start Date"><Input {...register('wStart')} type="date" /></Field>
            <Field label="Expiry Date"><Input {...register('wExpiry')} type="date" /></Field>
          </FormGrid>
        </FormSection>

        <FormSection title="Maintenance Schedule">
          <FormGrid>
            <Field label="Service Company"><Input {...register('mCompany')} placeholder="e.g. Carrier Service UAE" /></Field>
            <Field label="Frequency"><Input {...register('mFrequency')} placeholder="e.g. Every 3 months" /></Field>
            <Field label="Last Service Date"><Input {...register('mLastService')} type="date" /></Field>
            <Field label="Next Service Date"><Input {...register('mNextService')} type="date" /></Field>
          </FormGrid>
        </FormSection>

        <Field label="Notes">
          <Textarea {...register('notes')} rows={2} placeholder="Additional notes…" />
        </Field>

        <FormActions onCancel={onClose} submitLabel="Update Asset" loading={isSubmitting} />
      </form>
    </Modal>
  );
}
