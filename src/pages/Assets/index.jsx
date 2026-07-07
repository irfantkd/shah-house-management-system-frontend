import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  RiAddLine, RiSearchLine, RiLayoutGridLine, RiListCheck2,
  RiEditLine, RiDeleteBinLine, RiArrowRightLine, RiBox3Line,
  RiAlertLine, RiBankCardLine, RiToolsLine, RiFilter3Line,
  RiMapPin2Line, RiShieldCheckLine,
  RiTempColdLine, RiThermometerLine, RiDropLine, RiFlashlightLine,
  RiPlugLine, RiLeafLine, RiSofaLine, RiLightbulbLine,
  RiBuildingLine, RiContrastDropLine,
  RiCheckboxCircleLine, RiTimerLine, RiCloseCircleLine, RiCloseLine,
  RiArrowDownSLine, RiArrowLeftLine, RiBuilding2Line, RiAttachmentLine,
} from 'react-icons/ri';
import { selectAssets, addAsset, updateAsset, deleteAsset } from '../../store/slices/assetsSlice';
import { selectAreas } from '../../store/slices/areasSlice';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Field, Input, Select, Textarea, FormGrid, FormSection, FormActions } from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import { cn } from '../../utils/cn';

const ASSET_CATS     = ['HVAC','Plumbing','Electrical','Appliances','Furniture','Security','Garden','Pool','Structural','Other'];
const CONDITIONS     = ['excellent','good','fair','poor'];
const WARRANTY_TYPES = ['Parts & Labor','Parts Only','Labor Only','Manufacturer'];
const STATUS_LIST    = ['All','Operational','Service Due','Under Repair'];

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
  operational:    { label: 'Operational',  icon: RiCheckboxCircleLine, color: '#16a34a', bg: '#f0fdf4', strip: '#16a34a' },
  'service-due':  { label: 'Service Due',  icon: RiTimerLine,          color: '#d97706', bg: '#fffbeb', strip: '#d97706' },
  'under-repair': { label: 'Under Repair', icon: RiToolsLine,          color: '#dc2626', bg: '#fef2f2', strip: '#dc2626' },
  inactive:       { label: 'Inactive',     icon: RiCloseCircleLine,    color: '#64748b', bg: '#f8fafc', strip: '#94a3b8' },
};
const statusMeta = (s) => STATUS_META[s] ?? STATUS_META.operational;

const STATUS_FILTER_MAP = { 'All': null, 'Operational': 'operational', 'Service Due': 'service-due', 'Under Repair': 'under-repair' };

function daysUntil(d) { return d ? Math.ceil((new Date(d + 'T00:00:00') - new Date()) / 86400000) : null; }
function fmtDate(s) { return s ? new Date(s + 'T00:00:00').toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; }

export default function AssetsPage() {
  const dispatch       = useDispatch();
  const assets         = useSelector(selectAssets);
  const areas          = useSelector(selectAreas);
  const [search,       setSearch]     = useState('');
  const [catFilt,      setCatFilt]    = useState('All');
  const [statusFilt,   setStatusFilt] = useState('All');
  const [view,         setView]       = useState('grid');
  const [modal,        setModal]        = useState(null);   // null | 'add' | asset object (edit)
  const [delTarget,    setDelTarget]    = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);  // single-asset assign
  const [bulkAssign,   setBulkAssign]   = useState(false); // bulk assign modal

  const filtered = assets.filter((a) => {
    const q   = search.toLowerCase();
    const ms  = a.name.toLowerCase().includes(q) || (a.brand ?? '').toLowerCase().includes(q) || (a.areaName ?? '').toLowerCase().includes(q);
    const mc  = catFilt === 'All' || a.category === catFilt;
    const sv  = STATUS_FILTER_MAP[statusFilt];
    const mst = !sv || a.status === sv;
    return ms && mc && mst;
  });

  const cats         = [...new Set(assets.map((a) => a.category))];
  const warningCount = assets.filter((a) => { const d = daysUntil(a.warranty?.expiryDate); return d !== null && d >= 0 && d < 90; }).length;
  const totalValue   = assets.reduce((s, a) => s + (a.currentValue ?? a.purchasePrice ?? 0), 0);
  const needService  = assets.filter((a) => a.status === 'service-due' || a.status === 'under-repair').length;
  const unassigned   = assets.filter((a) => !a.areaId).length;

  const handleSave = (data) => {
    if (modal !== 'add') {
      dispatch(updateAsset({ ...modal, ...data }));
      toast.success('Asset updated!');
    } else {
      dispatch(addAsset(data));
      toast.success('Asset added!');
    }
    setModal(null);
  };

  const handleAssignArea = (asset, areaId) => {
    const area = areas.find((a) => a.id === areaId);
    dispatch(updateAsset({ ...asset, areaId: areaId || '', areaName: area?.name || '' }));
    toast.success(areaId ? `Assigned to ${area?.name}` : 'Unassigned from area');
    setAssignTarget(null);
  };

  const handleBulkAssign = (area, selectedAssetIds) => {
    const toAssign = assets.filter((a) => selectedAssetIds.has(a.id));
    toAssign.forEach((a) => dispatch(updateAsset({ ...a, areaId: area.id, areaName: area.name })));
    toast.success(`${toAssign.length} asset${toAssign.length !== 1 ? 's' : ''} assigned to ${area.name}`);
    setBulkAssign(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Assets</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">{assets.length} assets · {unassigned} unassigned</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setBulkAssign(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-[13px] border border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 transition-all"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <RiAttachmentLine className="w-4 h-4" />Assign to Area
          </button>
          <Button variant="primary" icon={RiAddLine} onClick={() => setModal('add')}>Add Asset</Button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Assets',       value: assets.length,                         icon: RiBox3Line,    color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
          { label: 'Total Value',        value: `AED ${totalValue.toLocaleString()}`,  icon: RiBankCardLine,color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
          { label: 'Warranties Expiring',value: warningCount,                          icon: RiAlertLine,   color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
          { label: 'Need Service',       value: needService,                           icon: RiToolsLine,   color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="bg-white rounded-2xl p-5 border" style={{ borderColor: s.border, boxShadow: '0 1px 12px rgba(0,0,0,0.05)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: s.bg }}>
              <s.icon className="w-5 h-5" style={{ color: s.color }} />
            </div>
            <p className="text-2xl font-bold leading-none mb-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[12px] text-slate-500 font-medium">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Unassigned banner ── */}
      {unassigned > 0 && (
        <div className="flex items-center gap-3 rounded-2xl px-5 py-3.5" style={{ background: '#f0f5ff', border: '1px solid #c7d7f5' }}>
          <RiMapPin2Line className="w-5 h-5 shrink-0" style={{ color: '#0b1d3a' }} />
          <p className="text-[13px] font-semibold flex-1" style={{ color: '#0b1d3a' }}>
            {unassigned} asset{unassigned !== 1 ? 's' : ''} not yet assigned to an area.
          </p>
          <button onClick={() => setStatusFilt('All')} className="text-[12px] font-bold hover:underline" style={{ color: '#1d4ed8' }}>
            Show all →
          </button>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search assets, brand, area…"
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-[13px] placeholder-slate-400 outline-none transition-all"
            onFocus={(e) => (e.currentTarget.style.boxShadow = '0 0 0 2px #93c5fd')}
            onBlur={(e) => (e.currentTarget.style.boxShadow = '')} />
        </div>
        <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 gap-0.5">
          {[['grid', RiLayoutGridLine], ['list', RiListCheck2]].map(([v, Icon]) => (
            <button key={v} onClick={() => setView(v)}
              className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                view === v ? 'text-white' : 'text-slate-400 hover:text-slate-600')}
              style={view === v ? { background: '#0b1d3a' } : {}}>
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* ── Category pills ── */}
      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['All', ...cats].map((cat) => {
            const m = catMeta(cat);
            const active = catFilt === cat;
            return (
              <button key={cat} onClick={() => setCatFilt(cat)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold whitespace-nowrap border transition-all shrink-0"
                style={active
                  ? { background: '#0b1d3a', color: '#fff', borderColor: '#0b1d3a' }
                  : { background: '#fff', color: '#64748b', borderColor: '#e2e8f0' }}>
                {cat !== 'All' && <m.icon className="w-3.5 h-3.5" style={{ color: active ? '#fff' : m.color }} />}
                {cat}
              </button>
            );
          })}
        </div>

        {/* Status filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <span className="flex items-center text-[11px] text-slate-400 font-bold uppercase tracking-wider shrink-0 self-center pr-1">
            <RiFilter3Line className="w-3.5 h-3.5 mr-1" />Status:
          </span>
          {STATUS_LIST.map((s) => {
            const active = statusFilt === s;
            const sm = s !== 'All' ? statusMeta(STATUS_FILTER_MAP[s]) : null;
            return (
              <button key={s} onClick={() => setStatusFilt(s)}
                className="px-3 py-1.5 rounded-xl text-[12px] font-semibold whitespace-nowrap border transition-all shrink-0"
                style={active
                  ? { background: sm?.color ?? '#0b1d3a', color: '#fff', borderColor: sm?.color ?? '#0b1d3a' }
                  : { background: '#fff', color: '#64748b', borderColor: '#e2e8f0' }}>
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Empty state ── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
          <RiBox3Line className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-400">No assets found</p>
          <button onClick={() => setModal('add')} className="mt-3 text-[13px] font-semibold hover:underline" style={{ color: '#2563eb' }}>+ Add first asset</button>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ delay: i * 0.04 }}>
                <AssetCard asset={a} areas={areas}
                  onEdit={() => setModal(a)}
                  onDelete={() => setDelTarget(a)}
                  onAssign={() => setAssignTarget(a)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
          {filtered.map((a, i) => (
            <AssetRow key={a.id} asset={a}
              last={i === filtered.length - 1}
              onEdit={() => setModal(a)}
              onDelete={() => setDelTarget(a)}
              onAssign={() => setAssignTarget(a)} />
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      <AssetModal open={modal !== null} asset={modal !== 'add' ? modal : null}
        onClose={() => setModal(null)} onSave={handleSave} />

      <AssignAreaModal open={!!assignTarget} asset={assignTarget} areas={areas}
        onClose={() => setAssignTarget(null)}
        onAssign={(areaId) => handleAssignArea(assignTarget, areaId)} />

      <BulkAssignModal open={bulkAssign} areas={areas} assets={assets}
        onClose={() => setBulkAssign(false)}
        onAssign={handleBulkAssign} />

      <ConfirmDialog open={!!delTarget} onClose={() => setDelTarget(null)}
        onConfirm={() => { dispatch(deleteAsset(delTarget.id)); toast.success('Asset deleted'); setDelTarget(null); }}
        title="Delete Asset" message={`Delete "${delTarget?.name}"? This cannot be undone.`} />
    </motion.div>
  );
}

/* ═══ Asset Card ═══ */
function AssetCard({ asset: a, areas, onEdit, onDelete, onAssign }) {
  const cm  = catMeta(a.category);
  const sm  = statusMeta(a.status);
  const days = daysUntil(a.warranty?.expiryDate);
  const warrantyColor = days === null ? null : days < 30 ? '#dc2626' : days < 180 ? '#d97706' : '#16a34a';
  const warrantyBg    = days === null ? null : days < 30 ? '#fef2f2' : days < 180 ? '#fffbeb' : '#f0fdf4';
  const hasArea = !!a.areaId;

  return (
    <div
      className="group rounded-3xl overflow-hidden bg-white flex flex-col"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.1)' }}>

      {/* ══ HEADER — dark navy ══ */}
      <div
        className="relative px-5 pt-4 pb-4 overflow-hidden"
        style={{ background: 'linear-gradient(150deg, #0a172e 0%, #0c1f3f 55%, #0e2550 100%)' }}>

        {/* Category accent bar at very top */}
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
          {a.name.substring(0,4).toUpperCase()}
        </div>

        {/* Status badge — top right */}
        <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
          style={{ background: sm.bg, color: sm.color, zIndex:10 }}>
          <sm.icon className="w-3 h-3" />
          {sm.label}
        </div>

        {/* Category icon + name row — fully inside header */}
        <div className="relative flex items-center gap-3.5 mt-1" style={{ zIndex:5 }}>
          <div
            className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center"
            style={{ background:`${cm.color}22`, border:'2.5px solid rgba(255,255,255,0.12)', boxShadow:`0 4px 16px ${cm.color}40` }}>
            <cm.icon className="w-7 h-7" style={{ color: cm.color }} />
          </div>
          <div className="min-w-0 flex-1 pr-10">
            <p className="text-[17px] font-black text-white leading-tight truncate">{a.name}</p>
            {(a.brand || a.model) ? (
              <p className="text-[11px] font-semibold mt-0.5" style={{ color:'rgba(255,255,255,0.42)' }}>
                {[a.brand, a.model].filter(Boolean).join(' · ')}
              </p>
            ) : (
              <p className="text-[11px] font-semibold mt-0.5" style={{ color:'rgba(255,255,255,0.42)' }}>{cm.label}</p>
            )}
          </div>
        </div>

        {/* Edit / delete — hover reveal */}
        <div className="absolute bottom-3.5 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ zIndex:10 }}>
          <button onClick={onEdit}
            className="w-7 h-7 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/15 border border-white/10 transition-all">
            <RiEditLine className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete}
            className="w-7 h-7 rounded-xl flex items-center justify-center text-white/60 hover:text-red-300 hover:bg-red-500/25 border border-white/10 transition-all">
            <RiDeleteBinLine className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ══ BODY ══ */}
      <div className="flex-1 flex flex-col px-5 pt-4 pb-4 gap-3">

        {/* Area assignment */}
        <div className="flex items-center gap-2 p-3 rounded-2xl"
          style={{ background: hasArea ? `${cm.color}0d` : '#f8fafc', border:`1px solid ${hasArea ? cm.color + '22' : '#f1f5f9'}` }}>
          {hasArea ? (
            <>
              <RiMapPin2Line className="w-3.5 h-3.5 shrink-0" style={{ color: cm.color }} />
              <Link to={`/areas/${a.areaId}`}
                className="flex-1 text-[13px] font-bold truncate hover:underline"
                style={{ color:'#0b1d3a' }}
                onClick={(e) => e.stopPropagation()}>
                {a.areaName}
              </Link>
              <button onClick={onAssign}
                className="text-[11px] font-bold px-2 py-0.5 rounded-lg transition-all shrink-0 hover:opacity-70"
                style={{ color: cm.color }}>
                Change
              </button>
            </>
          ) : (
            <button onClick={onAssign}
              className="w-full flex items-center justify-center gap-1.5 text-[12px] font-bold py-0.5 text-slate-400 hover:text-slate-700 transition-colors">
              <RiMapPin2Line className="w-3.5 h-3.5" />
              Assign to Area
            </button>
          )}
        </div>

        {/* Warranty */}
        {a.warranty?.expiryDate && (
          <div className="flex items-center justify-between px-3 py-2.5 rounded-2xl"
            style={{ background: warrantyBg ?? '#f8fafc', border:`1px solid ${warrantyColor ? warrantyColor + '22' : '#f1f5f9'}` }}>
            <span className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: warrantyColor ?? '#64748b' }}>
              <RiShieldCheckLine className="w-3.5 h-3.5" /> Warranty
            </span>
            <span className="text-[12px] font-bold" style={{ color: warrantyColor ?? '#64748b' }}>
              {days !== null && days < 0 ? 'Expired' : days !== null ? `${days}d left` : ''} · {fmtDate(a.warranty.expiryDate)}
            </span>
          </div>
        )}

        <div className="flex-1" />

        {/* Footer */}
        <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Value</p>
            <p className="text-[16px] font-black leading-tight" style={{ color:'#0b1d3a' }}>
              AED {(a.currentValue ?? a.purchasePrice ?? 0).toLocaleString()}
            </p>
          </div>
          <Link to={`/assets/${a.id}`}
            className="flex items-center gap-1.5 text-[12px] font-bold text-slate-400 hover:text-slate-800 transition-colors">
            View <RiArrowRightLine className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ═══ Asset List Row ═══ */
function AssetRow({ asset: a, last, onEdit, onDelete, onAssign }) {
  const cm = catMeta(a.category);
  const sm = statusMeta(a.status);
  const hasArea = !!a.areaId;
  return (
    <div className={cn('flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group', !last && 'border-b border-slate-50')}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: cm.bg }}>
        <cm.icon className="w-4 h-4" style={{ color: cm.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-slate-800 truncate">{a.name}</p>
        <p className="text-[11px] text-slate-400 truncate">{[a.brand, a.model].filter(Boolean).join(' · ') || '—'}</p>
      </div>
      <span className="hidden sm:flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
        style={{ background: cm.bg, color: cm.color }}>
        <cm.icon className="w-3 h-3" />{cm.label}
      </span>
      <span className="hidden md:flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
        style={{ background: sm.bg, color: sm.color }}>
        <sm.icon className="w-3 h-3" />{sm.label}
      </span>
      {/* Area badge */}
      {hasArea ? (
        <Link to={`/areas/${a.areaId}`}
          className="hidden lg:inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 hover:opacity-80"
          style={{ background: '#f0f5ff', color: '#0b1d3a' }}>
          <RiMapPin2Line className="w-3 h-3" />{a.areaName}
        </Link>
      ) : (
        <button onClick={onAssign}
          className="hidden lg:inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 border border-dashed hover:border-blue-400 hover:text-blue-600 transition-all"
          style={{ borderColor: '#cbd5e1', color: '#94a3b8' }}>
          <RiMapPin2Line className="w-3 h-3" />Assign
        </button>
      )}
      <span className="hidden md:block text-[12px] font-bold shrink-0" style={{ color: '#0b1d3a' }}>
        AED {(a.currentValue ?? a.purchasePrice ?? 0).toLocaleString()}
      </span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={onEdit} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
          <RiEditLine className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
          <RiDeleteBinLine className="w-3.5 h-3.5" />
        </button>
        <Link to={`/assets/${a.id}`} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
          <RiArrowRightLine className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

/* ═══ Add / Edit Asset Modal — NO area field on Add ═══ */
function AssetModal({ open, onClose, asset, onSave }) {
  const { register, handleSubmit, reset } = useForm();
  const isEdit = !!asset;

  useEffect(() => {
    if (!open) return;
    reset(asset ? {
      name: asset.name, category: asset.category,
      brand: asset.brand ?? '', model: asset.model ?? '',
      serial: asset.serialNumber ?? asset.serial ?? '', condition: asset.condition ?? 'good',
      status: asset.status ?? 'operational',
      purchaseDate: asset.purchaseDate ?? '', purchasePrice: asset.purchasePrice ?? '',
      currentValue: asset.currentValue ?? '', notes: asset.notes ?? '',
      wProvider: asset.warranty?.provider ?? '', wPhone: asset.warranty?.phone ?? '',
      wType: asset.warranty?.type ?? 'Parts & Labor',
      wStart: asset.warranty?.startDate ?? '', wExpiry: asset.warranty?.expiryDate ?? '',
    } : { condition: 'good', status: 'operational', wType: 'Parts & Labor' });
  }, [open, asset]);

  const onSubmit = (d) => {
    onSave({
      name: d.name, category: d.category,
      brand: d.brand ?? '', model: d.model ?? '',
      serialNumber: d.serial ?? '', condition: d.condition,
      status: d.status ?? 'operational',
      purchaseDate: d.purchaseDate ?? '',
      purchasePrice: parseFloat(d.purchasePrice) || 0,
      currentValue: parseFloat(d.currentValue) || 0,
      notes: d.notes ?? '',
      warranty: {
        provider: d.wProvider ?? '', phone: d.wPhone ?? '', type: d.wType ?? '',
        startDate: d.wStart ?? '', expiryDate: d.wExpiry ?? '',
      },
    });
  };

  return (
    <Modal open={open} onClose={onClose} size="lg"
      title={isEdit ? 'Edit Asset' : 'Add New Asset'}
      subtitle={isEdit ? 'Update asset details' : 'Enter asset details — assign to an area afterwards'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <FormGrid>
          <Field label="Asset Name" required>
            <Input {...register('name', { required: 'Required' })} placeholder="e.g. Daikin Split AC" />
          </Field>
          <Field label="Category" required>
            <Select {...register('category', { required: 'Required' })} placeholder="Select category"
              options={ASSET_CATS.map((c) => ({ value: c, label: c }))} />
          </Field>
        </FormGrid>
        <FormGrid>
          <Field label="Status">
            <Select {...register('status')}
              options={[
                { value: 'operational',  label: 'Operational'  },
                { value: 'service-due',  label: 'Service Due'  },
                { value: 'under-repair', label: 'Under Repair' },
                { value: 'inactive',     label: 'Inactive'     },
              ]} />
          </Field>
          <Field label="Condition">
            <Select {...register('condition')}
              options={CONDITIONS.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))} />
          </Field>
        </FormGrid>
        <FormSection title="Make & Model">
          <FormGrid>
            <Field label="Brand"><Input {...register('brand')} placeholder="e.g. Daikin" /></Field>
            <Field label="Model"><Input {...register('model')} placeholder="e.g. FTKM50TVMF" /></Field>
            <Field label="Serial Number"><Input {...register('serial')} placeholder="Serial / barcode" /></Field>
          </FormGrid>
        </FormSection>
        <FormSection title="Purchase & Value">
          <FormGrid>
            <Field label="Purchase Date"><Input {...register('purchaseDate')} type="date" /></Field>
            <Field label="Purchase Price (AED)"><Input {...register('purchasePrice')} type="number" min="0" step="0.01" placeholder="0.00" /></Field>
            <Field label="Current Value (AED)"><Input {...register('currentValue')} type="number" min="0" step="0.01" placeholder="0.00" /></Field>
          </FormGrid>
        </FormSection>
        <FormSection title="Warranty">
          <FormGrid>
            <Field label="Warranty Provider"><Input {...register('wProvider')} placeholder="e.g. Daikin UAE" /></Field>
            <Field label="Provider Phone"><Input {...register('wPhone')} placeholder="+971 4 XXX XXXX" /></Field>
            <Field label="Warranty Type">
              <Select {...register('wType')} options={WARRANTY_TYPES.map((t) => ({ value: t, label: t }))} />
            </Field>
            <Field label="Warranty Start"><Input {...register('wStart')} type="date" /></Field>
            <Field label="Warranty Expiry"><Input {...register('wExpiry')} type="date" /></Field>
          </FormGrid>
        </FormSection>
        <Field label="Notes"><Textarea {...register('notes')} rows={2} placeholder="Additional notes…" /></Field>

        {/* Area note (not a field) */}
        {!isEdit && (
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl" style={{ background: '#f0f5ff', border: '1px solid #c7d7f5' }}>
            <RiMapPin2Line className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#2563eb' }} />
            <p className="text-[12px] text-slate-600">
              <strong className="text-slate-800">Area assignment</strong> — After adding the asset, use the <strong>"Assign to Area"</strong> button on the card to assign it to a room.
            </p>
          </div>
        )}

        <FormActions onCancel={onClose} submitLabel={isEdit ? 'Update Asset' : 'Add Asset'} />
      </form>
    </Modal>
  );
}

/* ═══ Assign to Area Modal ═══ */
function AssignAreaModal({ open, onClose, asset, areas, onAssign }) {
  const [selected, setSelected] = useState('');

  useEffect(() => {
    if (open) setSelected(asset?.areaId ?? '');
  }, [open, asset]);

  if (!open || !asset) return null;

  const cm = catMeta(asset.category);

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}>
          <motion.div initial={{ opacity: 0, y: -16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }} transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl overflow-hidden w-full max-w-sm"
            style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }}>

            <div className="px-6 pt-6 pb-4 border-b border-slate-100">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-[16px] font-bold text-slate-900">Assign to Area</h2>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: cm.bg }}>
                      <cm.icon className="w-3 h-3" style={{ color: cm.color }} />
                    </div>
                    <p className="text-[12px] text-slate-500 font-medium">{asset.name}</p>
                  </div>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                  <RiCloseLine className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-2">
              {/* Unassign option */}
              <button onClick={() => setSelected('')}
                className={cn('w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all',
                  selected === '' ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white hover:bg-slate-50')}>
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <RiCloseCircleLine className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-slate-700">Unassigned</p>
                  <p className="text-[11px] text-slate-400">Remove from current area</p>
                </div>
                {selected === '' && <RiCheckboxCircleLine className="w-5 h-5 ml-auto shrink-0" style={{ color: '#dc2626' }} />}
              </button>

              <div className="border-t border-slate-100 pt-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">Areas</p>
                <div className="space-y-1 max-h-56 overflow-y-auto">
                  {areas.map((area) => {
                    const isActive = selected === area.id;
                    return (
                      <button key={area.id} onClick={() => setSelected(area.id)}
                        className={cn('w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-left transition-all',
                          isActive ? 'border-blue-200 bg-blue-50' : 'border-transparent hover:bg-slate-50 hover:border-slate-200')}>
                        <RiMapPin2Line className="w-4 h-4 shrink-0" style={{ color: isActive ? '#2563eb' : '#94a3b8' }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-slate-800 truncate">{area.name}</p>
                          {area.floor && <p className="text-[11px] text-slate-400">{area.floor}</p>}
                        </div>
                        {isActive && <RiCheckboxCircleLine className="w-5 h-5 shrink-0" style={{ color: '#2563eb' }} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-5 pb-5 flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all">
                Cancel
              </button>
              <button onClick={() => onAssign(selected)}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all"
                style={{ background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' }}>
                {selected ? 'Assign' : 'Unassign'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═══ Bulk Assign Modal — Step 1: pick area, Step 2: pick assets ═══ */
const TYPE_EMOJI = {
  Bedroom:'🛏️', Bathroom:'🚿', Kitchen:'🍳', 'Living Room':'🛋️', 'Dining Room':'🍽️',
  Garden:'🌿', 'Pool Area':'🏊', Garage:'🚗', Office:'💼', Storage:'📦',
  Utility:'🔧', Balcony:'🏠', Roof:'☀️', Other:'📍',
};
const typeEmoji = (t) => TYPE_EMOJI[t] ?? '📍';

function BulkAssignModal({ open, onClose, areas, assets, onAssign }) {
  const [step,          setStep]          = useState(1);
  const [selectedArea,  setSelectedArea]  = useState(null);
  const [selectedIds,   setSelectedIds]   = useState(new Set());
  const [areaSearch,    setAreaSearch]    = useState('');
  const [assetSearch,   setAssetSearch]   = useState('');

  useEffect(() => {
    if (!open) { setStep(1); setSelectedArea(null); setSelectedIds(new Set()); setAreaSearch(''); setAssetSearch(''); }
  }, [open]);

  const filteredAreas  = areas.filter((a) =>
    a.name.toLowerCase().includes(areaSearch.toLowerCase()) ||
    (a.floor ?? '').toLowerCase().includes(areaSearch.toLowerCase()),
  );

  const filteredAssets = assets.filter((a) =>
    a.name.toLowerCase().includes(assetSearch.toLowerCase()) ||
    (a.brand ?? '').toLowerCase().includes(assetSearch.toLowerCase()) ||
    (a.category ?? '').toLowerCase().includes(assetSearch.toLowerCase()),
  );

  const toggleAsset = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredAssets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAssets.map((a) => a.id)));
    }
  };

  const handleConfirm = () => onAssign(selectedArea, selectedIds);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}>
          <motion.div initial={{ opacity: 0, y: -20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }} transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl overflow-hidden w-full max-w-lg flex flex-col"
            style={{ boxShadow: '0 28px 80px rgba(0,0,0,0.25)', maxHeight: '90vh' }}>

            {/* ── Header ── */}
            <div className="shrink-0 px-6 pt-5 pb-4 border-b border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {step === 2 && (
                    <button onClick={() => { setStep(1); setSelectedIds(new Set()); }}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-all">
                      <RiArrowLeftLine className="w-4 h-4" />
                    </button>
                  )}
                  <div>
                    <h2 className="text-[17px] font-bold text-slate-900 leading-tight">Assign Assets to Area</h2>
                    <p className="text-[12px] text-slate-400 mt-0.5">
                      {step === 1 ? 'Step 1 of 2 — Choose an area' : `Step 2 of 2 — Select assets for ${selectedArea?.name}`}
                    </p>
                  </div>
                </div>
                <button onClick={onClose}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                  <RiCloseLine className="w-5 h-5" />
                </button>
              </div>

              {/* Step indicator */}
              <div className="flex items-center gap-2">
                {[1, 2].map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all"
                        style={step >= s ? { background: '#0b1d3a', color: '#fff' } : { background: '#e2e8f0', color: '#94a3b8' }}>
                        {s}
                      </div>
                      <span className="text-[11px] font-semibold" style={{ color: step >= s ? '#0b1d3a' : '#94a3b8' }}>
                        {s === 1 ? 'Select Area' : 'Select Assets'}
                      </span>
                    </div>
                    {s === 1 && <div className="flex-1 h-px bg-slate-200 w-8" />}
                  </div>
                ))}
                {selectedArea && step === 2 && (
                  <span className="ml-auto flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: '#f0f5ff', color: '#0b1d3a' }}>
                    {typeEmoji(selectedArea.type)} {selectedArea.name}
                  </span>
                )}
              </div>
            </div>

            {/* ── Step 1: Area picker ── */}
            {step === 1 && (
              <>
                <div className="shrink-0 px-4 pt-4 pb-2">
                  <div className="relative">
                    <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input value={areaSearch} onChange={(e) => setAreaSearch(e.target.value)}
                      placeholder="Search areas…" autoFocus
                      className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-[13px] placeholder-slate-400 outline-none transition-all"
                      onFocus={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 0 0 2px #93c5fd'; }}
                      onBlur={(e)  => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.boxShadow = ''; }} />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5">
                  {filteredAreas.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 text-[13px]">No areas found</div>
                  ) : filteredAreas.map((area) => {
                    const isActive = selectedArea?.id === area.id;
                    const areaAssetCount = assets.filter((a) => a.areaId === area.id).length;
                    return (
                      <button key={area.id} onClick={() => setSelectedArea(area)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all"
                        style={isActive
                          ? { background: '#eff6ff', borderColor: '#93c5fd' }
                          : { background: '#fff', borderColor: '#e2e8f0' }}
                        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = '#f8fafc'; }}
                        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = '#fff'; }}>
                        {/* Area emoji */}
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                          style={{ background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' }}>
                          {typeEmoji(area.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-slate-800 truncate">{area.name}</p>
                          <p className="text-[11px] text-slate-400">{area.floor ?? '—'} · {areaAssetCount} asset{areaAssetCount !== 1 ? 's' : ''} currently</p>
                        </div>
                        {isActive
                          ? <RiCheckboxCircleLine className="w-5 h-5 shrink-0" style={{ color: '#2563eb' }} />
                          : <div className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <div className="shrink-0 px-5 py-4 border-t border-slate-100 bg-slate-50 flex gap-2">
                  <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-all">
                    Cancel
                  </button>
                  <button onClick={() => selectedArea && setStep(2)} disabled={!selectedArea}
                    className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all"
                    style={{ background: selectedArea ? 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' : '#e2e8f0', color: selectedArea ? '#fff' : '#94a3b8', cursor: selectedArea ? 'pointer' : 'not-allowed' }}>
                    Select Assets →
                  </button>
                </div>
              </>
            )}

            {/* ── Step 2: Asset multi-select ── */}
            {step === 2 && (
              <>
                <div className="shrink-0 px-4 pt-4 pb-2 space-y-2">
                  <div className="relative">
                    <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input value={assetSearch} onChange={(e) => setAssetSearch(e.target.value)}
                      placeholder="Search by name, brand, category…" autoFocus
                      className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-[13px] placeholder-slate-400 outline-none transition-all"
                      onFocus={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 0 0 2px #93c5fd'; }}
                      onBlur={(e)  => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.boxShadow = ''; }} />
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <button onClick={toggleAll}
                      className="text-[12px] font-bold hover:underline" style={{ color: '#2563eb' }}>
                      {selectedIds.size === filteredAssets.length && filteredAssets.length > 0 ? 'Deselect all' : 'Select all'}
                    </button>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {selectedIds.size} selected · {filteredAssets.length} shown
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-1.5">
                  {filteredAssets.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 text-[13px]">No assets found</div>
                  ) : filteredAssets.map((asset) => {
                    const cm = catMeta(asset.category);
                    const isSelected = selectedIds.has(asset.id);
                    const alreadyHere = asset.areaId === selectedArea?.id;
                    return (
                      <button key={asset.id} onClick={() => toggleAsset(asset.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all"
                        style={isSelected
                          ? { background: '#eff6ff', borderColor: '#93c5fd' }
                          : { background: '#fff', borderColor: '#e2e8f0' }}
                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = '#fff'; }}>

                        {/* Checkbox */}
                        <div className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all"
                          style={isSelected ? { background: '#2563eb', borderColor: '#2563eb' } : { borderColor: '#cbd5e1' }}>
                          {isSelected && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <polyline points="1.5,4 3.5,6.5 8.5,1.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>

                        {/* Category icon */}
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: cm.bg }}>
                          <cm.icon className="w-4 h-4" style={{ color: cm.color }} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-slate-800 truncate">{asset.name}</p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {[asset.brand, asset.model].filter(Boolean).join(' · ') || cm.label}
                          </p>
                        </div>

                        {/* Current area badge */}
                        {alreadyHere ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                            Already here
                          </span>
                        ) : asset.areaId ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 truncate max-w-[80px]"
                            style={{ background: '#fff7ed', color: '#c2410c' }}>
                            {asset.areaName}
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: '#f1f5f9', color: '#94a3b8' }}>
                            Unassigned
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="shrink-0 px-5 py-4 border-t border-slate-100 bg-slate-50 flex gap-2">
                  <button onClick={() => { setStep(1); setSelectedIds(new Set()); }}
                    className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-all">
                    ← Back
                  </button>
                  <button onClick={handleConfirm} disabled={selectedIds.size === 0}
                    className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all"
                    style={{ background: selectedIds.size > 0 ? 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' : '#e2e8f0', color: selectedIds.size > 0 ? '#fff' : '#94a3b8', cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed' }}>
                    Assign {selectedIds.size > 0 ? `${selectedIds.size} Asset${selectedIds.size !== 1 ? 's' : ''}` : 'Assets'}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
