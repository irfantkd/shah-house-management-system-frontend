import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  RiAddLine, RiEditLine, RiDeleteBinLine, RiAlertLine, RiToolsLine,
  RiArrowDownSLine, RiArrowUpSLine, RiLoader4Line, RiWalletLine,
  RiBuilding2Line, RiCheckLine, RiLayoutGridLine, RiListCheck2,
} from 'react-icons/ri';
import { selectRepairs, addRepair, updateRepair, deleteRepair, updateRepairStatus } from '../../store/slices/repairsSlice';
import { selectCompanies } from '../../store/slices/companiesSlice';
import { selectAreas } from '../../store/slices/areasSlice';
import { selectAssets } from '../../store/slices/assetsSlice';
import { selectHomeWallet, deductFromWallet } from '../../store/slices/walletSlice';
import { PRIORITY_CFG, REPAIR_STATUS_CFG } from '../../data/mockRepairs';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Field, Input, Select, Textarea, FormGrid, FormSection, FormActions } from '../../components/ui/FormField';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { cn } from '../../utils/cn';

const PRIORITIES = ['critical','high','medium','low'];
const STATUSES   = ['reported','in-progress','awaiting-parts','completed'];
const STATUS_LABELS = { reported:'Reported', 'in-progress':'In Progress', 'awaiting-parts':'Awaiting Parts', completed:'Completed' };

const PRIORITY_HEX = { critical:'#dc2626', high:'#ea580c', medium:'#2563eb', low:'#64748b' };
const PRIORITY_BADGE = {
  critical: { bg:'rgba(220,38,38,0.18)',  color:'#fca5a5', border:'1px solid rgba(220,38,38,0.30)', label:'Critical'       },
  high:     { bg:'rgba(234,88,12,0.18)',  color:'#fdba74', border:'1px solid rgba(234,88,12,0.30)', label:'High'           },
  medium:   { bg:'rgba(37,99,235,0.15)',  color:'#93c5fd', border:'1px solid rgba(37,99,235,0.25)', label:'Medium'         },
  low:      { bg:'rgba(100,116,139,0.15)',color:'#cbd5e1', border:'1px solid rgba(100,116,139,0.25)',label:'Low'           },
};
const STATUS_BADGE = {
  reported:         { bg:'rgba(217,119,6,0.14)',  color:'#fbbf24', border:'1px solid rgba(217,119,6,0.25)'   },
  'in-progress':    { bg:'rgba(37,99,235,0.14)',  color:'#93c5fd', border:'1px solid rgba(37,99,235,0.25)'   },
  'awaiting-parts': { bg:'rgba(147,51,234,0.14)', color:'#c4b5fd', border:'1px solid rgba(147,51,234,0.25)'  },
  completed:        { bg:'rgba(22,163,74,0.14)',  color:'#86efac', border:'1px solid rgba(22,163,74,0.25)'   },
};

function fmtDate(s) { return s ? new Date(s+'T00:00:00').toLocaleDateString('en-AE',{day:'numeric',month:'short',year:'numeric'}) : '—'; }

export default function RepairsPage() {
  const dispatch   = useDispatch();
  const repairs    = useSelector(selectRepairs);
  const companies  = useSelector(selectCompanies);
  const areas      = useSelector(selectAreas);
  const assets     = useSelector(selectAssets);
  const homeWallet = useSelector(selectHomeWallet);

  const [view,      setView]      = useState('grid');
  const [tab,       setTab]       = useState('all');
  const [pri,       setPri]       = useState('all');
  const [modal,     setModal]     = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [expanded,  setExpanded]  = useState(null);

  const criticalOpen = repairs.filter((r) => r.priority === 'critical' && r.status !== 'completed').length;
  const filtered = repairs.filter((r) => (tab === 'all' || r.status === tab) && (pri === 'all' || r.priority === pri));

  const stats = {
    total:      repairs.length,
    reported:   repairs.filter((r) => r.status === 'reported').length,
    inProgress: repairs.filter((r) => r.status === 'in-progress').length,
    awaiting:   repairs.filter((r) => r.status === 'awaiting-parts').length,
    completed:  repairs.filter((r) => r.status === 'completed').length,
  };

  const handleStatusChange = (repair, status) => {
    dispatch(updateRepairStatus({ id: repair.id, status }));
    if (status === 'completed') {
      const cost = repair.actualCost > 0 ? repair.actualCost : repair.estimatedCost ?? 0;
      if (cost > 0) {
        dispatch(deductFromWallet({
          wallet: 'home',
          amount: cost,
          description: `Repair: ${repair.title}`,
          category: 'Repairs',
          date: new Date().toISOString().split('T')[0],
        }));
        toast.success(`✓ Completed — AED ${cost.toLocaleString()} deducted from Home Wallet`);
        return;
      }
    }
    toast.success('Status updated!');
  };

  return (
    <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.3 }} className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Repairs</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">Log and track all repair issues across the property</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
            <RiWalletLine className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-[12px] font-bold text-emerald-700">AED {homeWallet.balance.toLocaleString()}</span>
            <span className="text-[10px] text-emerald-500 hidden sm:inline">Home Wallet</span>
          </div>
          <Button variant="primary" icon={RiAddLine} onClick={() => setModal('add')}>Report Issue</Button>
        </div>
      </div>

      {/* Critical alert */}
      {criticalOpen > 0 && (
        <div className="flex items-center gap-3 bg-danger-50 border border-danger-200 rounded-2xl px-5 py-4">
          <RiAlertLine className="w-5 h-5 text-danger-600 shrink-0" />
          <p className="text-[13px] font-bold text-danger-800 flex-1">
            {criticalOpen} critical issue{criticalOpen > 1 ? 's require' : ' requires'} immediate attention.
          </p>
          <button onClick={() => { setPri('critical'); setTab('all'); }} className="text-[12px] font-bold text-danger-700 hover:underline">View →</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:'Reported',       value:stats.reported,   grad:'from-warning-500 to-orange-600'    },
          { label:'In Progress',    value:stats.inProgress, grad:'from-accent-500 to-accent-700'     },
          { label:'Awaiting Parts', value:stats.awaiting,   grad:'from-purple-500 to-purple-700'     },
          { label:'Completed',      value:stats.completed,  grad:'from-success-500 to-success-700'   },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.07 }}
            className={cn('rounded-2xl p-5 text-white flex items-center gap-4 bg-linear-to-br', s.grad)}>
            <RiToolsLine className="w-8 h-8 opacity-75 shrink-0" />
            <div>
              <p className="text-2xl font-bold leading-none">{s.value}</p>
              <p className="text-[12px] text-white/70 mt-1">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[['all','All'], ['reported','Reported'], ['in-progress','In Progress'], ['awaiting-parts','Awaiting Parts'], ['completed','Completed']].map(([v, l]) => {
            const count = v === 'all' ? stats.total : repairs.filter((r) => r.status === v).length;
            return (
              <button key={v} onClick={() => setTab(v)}
                className={cn('flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-semibold whitespace-nowrap border transition-all',
                  tab === v ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300')}>
                {l}
                <span className={cn('text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center',
                  tab === v ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500')}>{count}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex gap-1.5 overflow-x-auto">
            {['all', ...PRIORITIES].map((p) => (
              <button key={p} onClick={() => setPri(p)}
                className={cn('px-3 py-1.5 rounded-lg text-[11px] font-bold border capitalize transition-all whitespace-nowrap',
                  pri === p ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300')}>
                {p === 'all' ? 'All' : p}
              </button>
            ))}
          </div>
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1">
            {[['grid', RiLayoutGridLine], ['list', RiListCheck2]].map(([v, Icon]) => (
              <button key={v} onClick={() => setView(v)}
                className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                  view === v ? 'bg-navy-900 text-white' : 'text-slate-400 hover:text-slate-600')}>
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <RiToolsLine className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-400">No repairs in this filter</p>
          <button onClick={() => setModal('add')} className="mt-3 text-accent-600 text-[13px] font-semibold hover:underline">+ Report first issue</button>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((r, i) => (
              <motion.div key={r.id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, scale:0.96 }} transition={{ delay:i*0.04 }}>
                <RepairCard repair={r} companies={companies}
                  onEdit={() => setModal(r)} onDelete={() => setDelTarget(r)}
                  onStatusChange={(s) => handleStatusChange(r, s)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((r, i) => (
              <motion.div key={r.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, x:20 }} transition={{ delay:i*0.04 }}>
                <RepairRow repair={r} expanded={expanded === r.id}
                  onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
                  onEdit={() => setModal(r)} onDelete={() => setDelTarget(r)}
                  onStatusChange={(s) => handleStatusChange(r, s)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <RepairModal open={modal !== null} repair={modal !== 'add' ? modal : null}
        companies={companies} areas={areas} assets={assets}
        onClose={() => setModal(null)}
        onSave={(data) => {
          if (modal !== 'add') { dispatch(updateRepair({ ...modal, ...data })); toast.success('Repair updated!'); }
          else { dispatch(addRepair(data)); toast.success('Issue reported!'); }
          setModal(null);
        }}
      />
      <ConfirmDialog open={!!delTarget} onClose={() => setDelTarget(null)}
        onConfirm={() => { dispatch(deleteRepair(delTarget.id)); toast.success('Repair deleted'); setDelTarget(null); }}
        title="Delete Repair" message={`Delete "${delTarget?.title}"? This cannot be undone.`}
      />
    </motion.div>
  );
}

function RepairCard({ repair: r, companies, onEdit, onDelete, onStatusChange }) {
  const accent   = PRIORITY_HEX[r.priority] ?? '#2563eb';
  const pBadge   = PRIORITY_BADGE[r.priority] ?? PRIORITY_BADGE.medium;
  const sBadge   = STATUS_BADGE[r.status] ?? STATUS_BADGE.reported;
  const steps    = ['reported','in-progress','awaiting-parts','completed'];
  const stepIdx  = steps.indexOf(r.status);
  const company  = companies?.find((c) => c.id === r.companyId);
  const cost     = r.actualCost > 0 ? r.actualCost : r.estimatedCost ?? 0;

  return (
    <div className="group rounded-3xl overflow-hidden bg-white flex flex-col"
      style={{ boxShadow:'0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(11,29,58,0.10)' }}>

      {/* HEADER */}
      <div className="relative px-5 pt-4 pb-4 overflow-hidden"
        style={{ background:'linear-gradient(150deg, #0a172e 0%, #0c1f3f 55%, #0e2550 100%)' }}>

        {/* priority accent bar */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:accent, zIndex:2 }} />

        {/* rings */}
        <div style={{ position:'absolute', top:-36, right:-36, width:130, height:130, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.06)', pointerEvents:'none', zIndex:1 }} />
        <div style={{ position:'absolute', top:-18, right:-18, width:80,  height:80,  borderRadius:'50%', border:'1px solid rgba(255,255,255,0.09)', pointerEvents:'none', zIndex:1 }} />

        {/* ghost watermark */}
        <div style={{ position:'absolute', right:8, bottom:-4, fontSize:70, lineHeight:1, opacity:0.06, userSelect:'none', pointerEvents:'none', zIndex:1 }}>🔧</div>

        {/* priority badge top-right */}
        <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-[11px] font-bold"
          style={{ background:pBadge.bg, color:pBadge.color, border:pBadge.border, zIndex:10 }}>
          {pBadge.label}
        </div>

        {/* icon + title */}
        <div className="relative flex items-center gap-3.5 mt-1" style={{ zIndex:5 }}>
          <div className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center text-[26px] select-none"
            style={{ background:`${accent}28`, border:'2.5px solid rgba(255,255,255,0.13)', boxShadow:`0 4px 20px ${accent}40` }}>
            🔧
          </div>
          <div className="min-w-0 flex-1 pr-10">
            <p className="text-[15px] font-black text-white leading-snug line-clamp-2">{r.title}</p>
            <p className="text-[11px] font-semibold mt-0.5" style={{ color:'rgba(255,255,255,0.42)' }}>
              {r.areaName || '—'}{r.assetName ? ` › ${r.assetName}` : ''}
            </p>
          </div>
        </div>

        {/* progress bar */}
        <div className="relative flex items-center gap-1 mt-3" style={{ zIndex:5 }}>
          {steps.map((s, i) => (
            <div key={s} className="flex-1 h-1 rounded-full transition-all"
              style={{ background: stepIdx >= i ? accent : 'rgba(255,255,255,0.10)' }} />
          ))}
        </div>

        {/* edit/delete hover */}
        <div className="absolute bottom-3.5 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ zIndex:10 }}>
          <button onClick={onEdit}
            className="w-7 h-7 rounded-xl flex items-center justify-center border transition-all"
            style={{ color:'rgba(255,255,255,0.6)', borderColor:'rgba(255,255,255,0.12)', background:'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.background='rgba(255,255,255,0.12)'; e.currentTarget.style.color='#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(255,255,255,0.6)'; }}>
            <RiEditLine className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete}
            className="w-7 h-7 rounded-xl flex items-center justify-center border transition-all"
            style={{ color:'rgba(255,255,255,0.6)', borderColor:'rgba(255,255,255,0.12)', background:'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.background='rgba(239,68,68,0.22)'; e.currentTarget.style.color='#fca5a5'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(255,255,255,0.6)'; }}>
            <RiDeleteBinLine className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 flex flex-col px-5 pt-4 pb-4 gap-3">

        {/* description preview */}
        {r.description && (
          <p className="text-[12px] text-slate-500 line-clamp-2 leading-relaxed">{r.description}</p>
        )}

        {/* company link */}
        {(company || r.companyName) && (
          <div className="flex items-center gap-2 text-[12px] text-slate-600">
            <RiBuilding2Line className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            {company
              ? <Link to={`/companies/${company.id}`} className="font-medium truncate hover:text-navy-700 transition-colors">{company.name}</Link>
              : <span className="font-medium truncate">{r.companyName}</span>
            }
          </div>
        )}

        {/* status badge + date */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold"
            style={{ background:sBadge.bg, color:sBadge.color, border:sBadge.border }}>
            {STATUS_LABELS[r.status]}
          </span>
          <span className="text-[11px] text-slate-400">{fmtDate(r.reportedDate)}</span>
        </div>

        <div className="flex-1" />

        {/* footer: cost + quick status */}
        <div className="border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            {cost > 0 ? (
              <p className="text-[12px] flex items-center gap-1.5 text-slate-600">
                <RiWalletLine className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-bold">AED {cost.toLocaleString()}</span>
                <span className="text-slate-400">{r.actualCost > 0 ? 'actual' : 'estimated'}</span>
              </p>
            ) : <div />}
            {r.status === 'completed' && r.completedDate && (
              <p className="text-[11px] text-success-600 font-semibold">✓ {fmtDate(r.completedDate)}</p>
            )}
          </div>
          {r.status !== 'completed' && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] text-slate-400 self-center">Move to:</span>
              {STATUSES.filter((s) => s !== r.status).map((s) => (
                <button key={s} onClick={() => onStatusChange(s)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all"
                  style={{ background:'rgba(11,29,58,0.05)', color:'#0b1d3a' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background='rgba(11,29,58,0.10)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background='rgba(11,29,58,0.05)'; }}>
                  {s === 'completed' && <RiCheckLine className="w-3 h-3" />}
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RepairRow({ repair: r, expanded, onToggle, onEdit, onDelete, onStatusChange }) {
  const sc = REPAIR_STATUS_CFG[r.status] ?? REPAIR_STATUS_CFG.reported;
  const accent = PRIORITY_HEX[r.priority] ?? '#2563eb';
  const steps  = ['reported','in-progress','awaiting-parts','completed'];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow:'0 1px 8px rgb(0 0 0/0.06)' }}>
      <div className="h-0.5 w-full" style={{ background:accent }} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h3 className="text-[14px] font-bold text-slate-900">{r.title}</h3>
              <Badge variant={r.priority === 'critical' ? 'danger' : r.priority === 'high' ? 'warning' : 'default'} size="sm">{r.priority}</Badge>
            </div>
            <p className="text-[12px] text-slate-500">{r.assetName || '—'} · {r.companyName || 'Unassigned'}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-lg', sc.bg ?? 'bg-slate-100', sc.text ?? 'text-slate-600')}>
              {STATUS_LABELS[r.status]}
            </span>
            <button onClick={onToggle} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all">
              {expanded ? <RiArrowUpSLine className="w-4 h-4" /> : <RiArrowDownSLine className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1 mb-2">
          {steps.map((s, i) => (
            <div key={s} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full h-1.5 rounded-full transition-all" style={{ background:(sc.step ?? 0) >= i ? accent : '#f1f5f9' }} />
              <span className={cn('text-[9px] font-semibold hidden sm:block', (sc.step ?? 0) >= i ? 'text-accent-600' : 'text-slate-300')}>
                {STATUS_LABELS[s]}
              </span>
            </div>
          ))}
        </div>
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:0.2 }} className="overflow-hidden">
              <div className="pt-4 mt-2 border-t border-slate-100 space-y-3">
                {r.description && <p className="text-[13px] text-slate-600 leading-relaxed">{r.description}</p>}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[12px]">
                  <div><span className="text-slate-400">Reported: </span><span className="font-semibold text-slate-700">{fmtDate(r.reportedDate)}</span></div>
                  {r.completedDate && <div><span className="text-slate-400">Completed: </span><span className="font-semibold text-slate-700">{fmtDate(r.completedDate)}</span></div>}
                  <div><span className="text-slate-400">Est. Cost: </span><span className="font-semibold text-slate-700">AED {(r.estimatedCost ?? 0).toLocaleString()}</span></div>
                  {r.actualCost > 0 && <div><span className="text-slate-400">Actual: </span><span className="font-semibold text-slate-700">AED {r.actualCost.toLocaleString()}</span></div>}
                </div>
                {r.notes && <p className="text-[12px] text-slate-500 bg-slate-50 rounded-xl px-4 py-3 leading-relaxed">{r.notes}</p>}
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-[11px] text-slate-400 self-center">Move to:</span>
                  {STATUSES.filter((s) => s !== r.status).map((s) => (
                    <button key={s} onClick={() => onStatusChange(s)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-50 hover:bg-navy-100 text-navy-700 text-[11px] font-bold transition-all">
                      <RiLoader4Line className="w-3 h-3" />{STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-slate-50">
          <button onClick={onEdit}   className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-accent-600 hover:bg-accent-50 transition-all"><RiEditLine className="w-3.5 h-3.5" />Edit</button>
          <button onClick={onDelete} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-danger-500 hover:bg-danger-50 transition-all"><RiDeleteBinLine className="w-3.5 h-3.5" />Delete</button>
        </div>
      </div>
    </div>
  );
}

function RepairModal({ open, onClose, repair, companies, areas, assets, onSave }) {
  const { register, handleSubmit, reset, watch, setValue } = useForm();
  useEffect(() => {
    if (!open) return;
    reset(repair ? {
      title: repair.title, description: repair.description ?? '',
      areaId: repair.areaId ?? '', assetId: repair.assetId ?? '',
      companyId: repair.companyId ?? '', reportedDate: repair.reportedDate,
      priority: repair.priority, status: repair.status,
      completedDate: repair.completedDate ?? '',
      estimatedCost: repair.estimatedCost ?? '', actualCost: repair.actualCost ?? '',
      notes: repair.notes ?? '',
    } : { priority:'medium', status:'reported', reportedDate:new Date().toISOString().split('T')[0], areaId:'', assetId:'' });
  }, [open, repair]);

  const status     = watch('status');
  const areaId     = watch('areaId');
  const estCost    = watch('estimatedCost');
  const actCost    = watch('actualCost');
  const areaAssets = assets.filter((a) => !areaId || a.areaId === areaId);
  useEffect(() => { setValue('assetId', ''); }, [areaId]);

  const displayCost = parseFloat(status === 'completed' && actCost ? actCost : estCost) || 0;

  const onSubmit = (d) => {
    const comp  = companies.find((c) => c.id === d.companyId);
    const area  = areas.find((a) => a.id === d.areaId);
    const asset = assets.find((a) => a.id === d.assetId);
    onSave({ ...d,
      estimatedCost: parseFloat(d.estimatedCost) || 0,
      actualCost: d.actualCost ? parseFloat(d.actualCost) : null,
      companyName: comp?.name  ?? repair?.companyName ?? '',
      areaName:    area?.name  ?? repair?.areaName    ?? '',
      assetName:   asset?.name ?? repair?.assetName   ?? '',
    });
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title={repair ? 'Edit Repair' : 'Report New Issue'} subtitle="Log an issue for tracking and resolution">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Field label="Issue Title" required>
          <Input {...register('title', { required:'Required' })} placeholder="e.g. Living Room AC not cooling" />
        </Field>
        <Field label="Description" hint="Describe what is wrong and when it started">
          <Textarea {...register('description')} rows={2} placeholder="What is the issue? When did it start?" />
        </Field>
        <FormGrid>
          <Field label="Area / Room" hint="Select area first">
            <Select {...register('areaId')} placeholder="— Select area —"
              options={areas.map((a) => ({ value:a.id, label:`${a.emoji ?? ''} ${a.name}`.trim() }))} />
          </Field>
          <Field label="Asset / Equipment" hint={areaId ? `${areaAssets.length} assets in this area` : 'Select area first'}>
            <Select {...register('assetId')} placeholder={areaId ? '— Select asset —' : '— Pick area first —'}
              options={areaAssets.map((a) => ({ value:a.id, label:a.name }))} />
          </Field>
          <Field label="Assigned Company">
            <Select {...register('companyId')} placeholder="Select company"
              options={companies.map((c) => ({ value:c.id, label:c.name }))} />
          </Field>
          <Field label="Reported Date" required>
            <Input {...register('reportedDate', { required:'Required' })} type="date" />
          </Field>
        </FormGrid>
        <FormSection title="Priority & Status">
          <FormGrid>
            <Field label="Priority" required>
              <Select {...register('priority', { required:'Required' })}
                options={PRIORITIES.map((p) => ({ value:p, label:p.charAt(0).toUpperCase()+p.slice(1) }))} />
            </Field>
            <Field label="Current Status">
              <Select {...register('status')} options={STATUSES.map((s) => ({ value:s, label:STATUS_LABELS[s] }))} />
            </Field>
            {status === 'completed' && <Field label="Completed Date"><Input {...register('completedDate')} type="date" /></Field>}
            <Field label="Estimated Cost (AED)"><Input {...register('estimatedCost')} type="number" min="0" step="0.01" placeholder="0.00" /></Field>
            {status === 'completed' && (
              <Field label="Actual Cost (AED)" hint="Will be deducted from Home Wallet">
                <Input {...register('actualCost')} type="number" min="0" step="0.01" placeholder="0.00" />
              </Field>
            )}
          </FormGrid>
          {displayCost > 0 && (
            <div className="flex items-center gap-2 mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <RiWalletLine className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-[12px] text-emerald-700 font-medium">
                AED {displayCost.toLocaleString()} will be deducted from Home Wallet on completion.
              </p>
            </div>
          )}
        </FormSection>
        <Field label="Notes"><Textarea {...register('notes')} rows={2} placeholder="Parts required, access notes, follow-up actions…" /></Field>
        <FormActions onCancel={onClose} submitLabel={repair ? 'Update Repair' : 'Report Issue'} />
      </form>
    </Modal>
  );
}
