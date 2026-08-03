import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  RiAddLine, RiEditLine, RiDeleteBinLine, RiAlertLine, RiToolsLine,
  RiArrowDownSLine, RiArrowUpSLine, RiLoader4Line, RiWalletLine,
  RiBuilding2Line, RiCheckLine, RiLayoutGridLine, RiListCheck2,
  RiArrowLeftSLine, RiArrowRightSLine,
} from 'react-icons/ri';
import { Wrench, Pencil, Trash2 } from 'lucide-react';
import { useGetQuery, usePostMutation, usePutMutation, useDeleteMutation, usePatchMutation } from '../../api/apiSlice';
import { selectCurrentPropertyId } from '../../store/slices/propertiesSlice';
import { MotionSwipeableRow } from '../../components/ui/SwipeableRow';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import PageLoader from '../../components/ui/PageLoader';
import { Field, Input, Select, Textarea, FormGrid, FormSection, FormActions } from '../../components/ui/FormField';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { cn } from '../../utils/cn';

const PAGE_SIZE = 10;

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

// Used by RepairRow list view for badge classes + progress step
const REPAIR_STATUS_CFG = {
  reported:         { bg: 'bg-amber-100',   text: 'text-amber-700',   step: 0 },
  'in-progress':    { bg: 'bg-blue-100',    text: 'text-blue-700',    step: 1 },
  'awaiting-parts': { bg: 'bg-purple-100',  text: 'text-purple-700',  step: 2 },
  completed:        { bg: 'bg-green-100',   text: 'text-green-700',   step: 3 },
};

function fmtDate(s) { return s ? new Date(s+'T00:00:00').toLocaleDateString('en-AE',{day:'numeric',month:'short',year:'numeric'}) : '—'; }

// ─── Pagination helpers ───────────────────────────────────────────────────────
function getPagNums(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, '…', pages];
  if (page >= pages - 3) return [1, '…', pages-4, pages-3, pages-2, pages-1, pages];
  return [1, '…', page-1, page, page+1, '…', pages];
}

function PagBtn({ onClick, disabled, active, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'min-w-8 h-8 px-2 rounded-lg text-[12px] font-semibold transition-all border',
        active
          ? 'bg-navy-900 text-white border-navy-900'
          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed',
      )}
    >
      {children}
    </button>
  );
}

function PaginationBar({ page, pages, onPage }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1.5 py-4">
      <PagBtn onClick={() => onPage(page - 1)} disabled={page <= 1}>
        <RiArrowLeftSLine className="w-4 h-4" />
      </PagBtn>
      {getPagNums(page, pages).map((n, i) =>
        n === '…'
          ? <span key={`e${i}`} className="text-slate-400 text-[12px] px-1">…</span>
          : <PagBtn key={n} onClick={() => onPage(n)} active={n === page}>{n}</PagBtn>
      )}
      <PagBtn onClick={() => onPage(page + 1)} disabled={page >= pages}>
        <RiArrowRightSLine className="w-4 h-4" />
      </PagBtn>
    </div>
  );
}

function MobileRepairRow({ repair: r, onClick }) {
  const accent  = PRIORITY_HEX[r.priority]  ?? '#2563eb';
  const pBadge  = PRIORITY_BADGE[r.priority] ?? PRIORITY_BADGE.medium;
  const sBadge  = STATUS_BADGE[r.status]     ?? STATUS_BADGE.reported;
  const steps   = ['reported', 'in-progress', 'awaiting-parts', 'completed'];
  const stepIdx = steps.indexOf(r.status);
  const cost    = r.actualCost > 0 ? r.actualCost : r.estimatedCost ?? 0;

  return (
    <div
      className="flex items-center gap-3.5 px-4 py-4 bg-white hover:bg-slate-50/60 active:bg-slate-50 transition-colors cursor-pointer"
      style={{ borderLeft: `3px solid ${accent}` }}
      onClick={onClick}
    >
      <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
        style={{ background: `${accent}18` }}>
        <Wrench className="w-5 h-5" style={{ color: accent }} strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-[13px] font-bold text-slate-900 truncate">{r.title}</p>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
            style={{ background: pBadge.bg, color: pBadge.color, border: pBadge.border }}>
            {pBadge.label}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 truncate">
          {r.areaName || '—'}{r.assetName ? ` › ${r.assetName}` : ''}
          {r.companyName ? ` · ${r.companyName}` : ''}
        </p>
        <div className="flex items-center gap-0.5 mt-1.5">
          {steps.map((s, i) => (
            <div key={s} className="flex-1 h-1 rounded-full transition-all"
              style={{ background: stepIdx >= i ? accent : '#f1f5f9' }} />
          ))}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
          style={{ background: sBadge.bg, color: sBadge.color, border: sBadge.border }}>
          {STATUS_LABELS[r.status]}
        </span>
        {cost > 0 && (
          <span className="text-[10px] font-semibold text-slate-500">
            AED {cost.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}

export default function RepairsPage() {
  const propertyId = useSelector(selectCurrentPropertyId);

  const [view,      setView]      = useState('grid');
  const [tab,       setTab]       = useState('all');
  const [pri,       setPri]       = useState('all');
  const [page,      setPage]      = useState(1);
  const [modal,     setModal]     = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [expanded,  setExpanded]  = useState(null);

  useEffect(() => { setPage(1); }, [tab, pri]);

  // Stats query (no pagination — returns aggregated counts)
  const { data: repairStats = {} } = useGetQuery(
    { path: '/tasks/stats', params: { propertyId, category: 'Repair' } },
    { skip: !propertyId },
  );

  // Paginated list query — backend filters by category + status + priority
  const repairParams = {
    propertyId,
    category: 'Repair',
    page,
    limit: PAGE_SIZE,
    ...(tab !== 'all' && { status: tab }),
    ...(pri !== 'all' && { priority: pri }),
  };
  const { data: rawData, isLoading, isFetching } = useGetQuery(
    { path: '/tasks', params: repairParams },
    { skip: !propertyId },
  );

  const repairs    = rawData?.items ?? (Array.isArray(rawData) ? rawData : []);
  const totalPages = rawData?.pages ?? 1;
  const totalCount = rawData?.total ?? repairs.length;

  const stats = {
    total:      repairStats?.total      ?? 0,
    reported:   repairStats?.byStatus?.reported    ?? 0,
    inProgress: repairStats?.byStatus?.inProgress  ?? 0,
    awaiting:   repairStats?.byStatus?.awaitingParts ?? 0,
    completed:  repairStats?.byStatus?.completed   ?? 0,
  };
  const criticalOpen = repairStats?.criticalOpen ?? 0;

  const { data: companies  = [] } = useGetQuery({ path: '/companies' });
  const { data: areas      = [] } = useGetQuery({ path: '/areas',  params: { propertyId } }, { skip: !propertyId });
  const { data: assets     = [] } = useGetQuery({ path: '/assets', params: { propertyId } }, { skip: !propertyId });
  const { data: walletData, refetch: refetchWallet } = useGetQuery({ path: '/wallet', params: { propertyId } }, { skip: !propertyId });
  const homeWallet    = { balance: walletData?.home?.balance    ?? 0 };
  const vehicleWallet = { balance: walletData?.vehicle?.balance ?? 0 };

  const [addRepairMut,    { isLoading: isAdding   }] = usePostMutation();
  const [updateRepairMut, { isLoading: isUpdating }] = usePutMutation();
  const [deleteRepairMut] = useDeleteMutation();
  const [patchRepairMut]  = usePatchMutation();
  const [deductWalletMut] = usePostMutation();

  const isSubmitting = isAdding || isUpdating;

  const statusTabCounts = {
    all:              stats.total,
    reported:         stats.reported,
    'in-progress':    stats.inProgress,
    'awaiting-parts': stats.awaiting,
    completed:        stats.completed,
  };

  const handleStatusChange = async (repair, status) => {
    const cost = repair.actualCost > 0 ? repair.actualCost : repair.estimatedCost ?? 0;
    const walletType = repair.walletType ?? 'home';
    const walletLabel = walletType === 'vehicle' ? 'Vehicle' : 'Home';
    try {
      await patchRepairMut({ path: `/tasks/${repair.id}`, body: { status, ...(status === 'completed' && cost > 0 ? { actualCost: cost } : {}) } }).unwrap();
      if (status === 'completed' && cost > 0) {
        await deductWalletMut({ path: '/wallet/deduct', body: { propertyId, walletType, amount: cost, description: `Repair: ${repair.title}`, category: 'Repairs', date: new Date().toISOString().split('T')[0] } }).unwrap();
        await refetchWallet();
        toast.success(`Completed — AED ${cost.toLocaleString()} deducted from ${walletLabel} Wallet`);
      } else {
        toast.success('Status updated!');
      }
    } catch { toast.error('Failed to update status'); }
  };

  if (isLoading) return <PageLoader />;

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
            const count = statusTabCounts[v] ?? 0;
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
      <div className={cn('transition-opacity duration-200', isFetching ? 'opacity-50' : 'opacity-100')}>

        {/* ── MOBILE SWIPE LIST — md:hidden ── */}
        <div className="md:hidden rounded-2xl border border-slate-100 overflow-hidden bg-white divide-y divide-slate-50">
          {repairs.length === 0 ? (
            <div className="p-10 text-center">
              <RiToolsLine className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-[13px] font-semibold text-slate-400">No repairs in this filter</p>
              <button onClick={() => setModal('add')} className="mt-2 text-accent-600 text-[12px] font-semibold hover:underline">+ Report first issue</button>
            </div>
          ) : (
            <>
              <p className="text-[10px] text-slate-400 text-center py-1.5 bg-slate-50/80">
                Swipe right to edit · Swipe left to delete (pending only)
              </p>
              <AnimatePresence mode="popLayout">
                {repairs.map((r) => {
                  const isPending = r.status !== 'completed';
                  if (isPending) {
                    return (
                      <MotionSwipeableRow
                        key={r.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, x: -20 }}
                        onSwipeRight={() => setModal(r)}
                        onSwipeLeft={() => setDelTarget(r)}
                        leftIcon={<Pencil style={{ color: '#2563eb', width: 20, height: 20 }} />}
                        leftLabel="Edit" leftBg="#eff6ff" leftColor="#2563eb"
                        rightIcon={<Trash2 style={{ color: '#dc2626', width: 20, height: 20 }} />}
                        rightLabel="Delete" rightBg="#fef2f2" rightColor="#dc2626"
                      >
                        <MobileRepairRow repair={r} onClick={() => setModal(r)} />
                      </MotionSwipeableRow>
                    );
                  }
                  return (
                    <motion.div key={r.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <MobileRepairRow repair={r} onClick={() => {}} />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* ── DESKTOP EMPTY STATE — hidden md:block ── */}
        {repairs.length === 0 && (
          <div className="hidden md:block bg-white rounded-2xl border border-slate-100 p-12 text-center">
            <RiToolsLine className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="font-semibold text-slate-400">No repairs in this filter</p>
            <button onClick={() => setModal('add')} className="mt-3 text-accent-600 text-[13px] font-semibold hover:underline">+ Report first issue</button>
          </div>
        )}

        {/* ── DESKTOP GRID VIEW — hidden md:grid ── */}
        {view === 'grid' && repairs.length > 0 && (
          <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {repairs.map((r, i) => (
                <motion.div key={r.id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, scale:0.96 }} transition={{ delay:i*0.04 }}>
                  <RepairCard repair={r} companies={companies}
                    onEdit={() => setModal(r)} onDelete={() => setDelTarget(r)}
                    onStatusChange={(s) => handleStatusChange(r, s)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* ── DESKTOP LIST VIEW — hidden md:block ── */}
        {view === 'list' && repairs.length > 0 && (
          <div className="hidden md:block space-y-3">
            <AnimatePresence mode="popLayout">
              {repairs.map((r, i) => (
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

        <PaginationBar page={page} pages={totalPages} onPage={setPage} />
      </div>

      <RepairModal open={modal !== null} repair={modal !== 'add' ? modal : null}
        companies={companies} areas={areas} assets={assets}
        homeWallet={homeWallet} vehicleWallet={vehicleWallet}
        isSubmitting={isSubmitting}
        onClose={() => setModal(null)}
        onSave={async (data) => {
          try {
            if (modal !== 'add') { await updateRepairMut({ path: `/tasks/${modal.id}`, body: { ...modal, ...data } }).unwrap(); toast.success('Repair updated!'); }
            else { await addRepairMut({ path: '/tasks', body: { ...data, propertyId, category: 'Repair', status: data.status || 'reported' } }).unwrap(); toast.success('Issue reported!'); }
            setModal(null);
          } catch { toast.error('Failed to save repair'); }
        }}
      />
      <ConfirmDialog open={!!delTarget} onClose={() => setDelTarget(null)}
        onConfirm={async () => { try { await deleteRepairMut({ path: `/tasks/${delTarget.id}` }).unwrap(); toast.success('Repair deleted'); setDelTarget(null); } catch { toast.error('Failed to delete'); } }}
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

        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:accent, zIndex:2 }} />
        <div style={{ position:'absolute', top:-36, right:-36, width:130, height:130, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.06)', pointerEvents:'none', zIndex:1 }} />
        <div style={{ position:'absolute', top:-18, right:-18, width:80,  height:80,  borderRadius:'50%', border:'1px solid rgba(255,255,255,0.09)', pointerEvents:'none', zIndex:1 }} />
        <Wrench style={{ position:'absolute', right:8, bottom:-4, width:70, height:70, color:'rgba(255,255,255,0.06)', userSelect:'none', pointerEvents:'none', zIndex:1 }} />

        <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-[11px] font-bold"
          style={{ background:pBadge.bg, color:pBadge.color, border:pBadge.border, zIndex:10 }}>
          {pBadge.label}
        </div>

        <div className="relative flex items-center gap-3.5 mt-1" style={{ zIndex:5 }}>
          <div className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center"
            style={{ background:`${accent}28`, border:'2.5px solid rgba(255,255,255,0.13)', boxShadow:`0 4px 20px ${accent}40` }}>
            <Wrench className="w-7 h-7 text-white" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1 pr-10">
            <p className="text-[15px] font-black text-white leading-snug line-clamp-2">{r.title}</p>
            <p className="text-[11px] font-semibold mt-0.5" style={{ color:'rgba(255,255,255,0.42)' }}>
              {r.areaName || '—'}{r.assetName ? ` › ${r.assetName}` : ''}
            </p>
          </div>
        </div>

        <div className="relative flex items-center gap-1 mt-3" style={{ zIndex:5 }}>
          {steps.map((s, i) => (
            <div key={s} className="flex-1 h-1 rounded-full transition-all"
              style={{ background: stepIdx >= i ? accent : 'rgba(255,255,255,0.10)' }} />
          ))}
        </div>

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
        {r.description && (
          <p className="text-[12px] text-slate-500 line-clamp-2 leading-relaxed">{r.description}</p>
        )}
        {(company || r.companyName) && (
          <div className="flex items-center gap-2 text-[12px] text-slate-600">
            <RiBuilding2Line className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            {company
              ? <Link to={`/companies/${company.id}`} className="font-medium truncate hover:text-navy-700 transition-colors">{company.name}</Link>
              : <span className="font-medium truncate">{r.companyName}</span>
            }
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold"
            style={{ background:sBadge.bg, color:sBadge.color, border:sBadge.border }}>
            {STATUS_LABELS[r.status]}
          </span>
          <span className="text-[11px] text-slate-400">{fmtDate(r.reportedDate)}</span>
        </div>
        <div className="flex-1" />
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

function RepairModal({ open, onClose, repair, companies, areas, assets, onSave, homeWallet, vehicleWallet, isSubmitting }) {
  const { register, handleSubmit, reset, watch, setValue } = useForm();
  const [walletType, setWalletType] = useState('home');
  useEffect(() => {
    if (!open) return;
    setWalletType(repair?.walletType ?? 'home');
    reset(repair ? {
      title: repair.title, description: repair.description ?? '',
      areaId: repair.areaId ?? '', assetId: repair.assetId ?? '',
      companyId: repair.companyId ?? '', reportedDate: repair.scheduledDate || repair.reportedDate || '',
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
    const { reportedDate, ...rest } = d;
    onSave({
      ...rest,
      scheduledDate: reportedDate,
      areaId:   d.areaId  || null,
      assetId:  d.assetId || null,
      estimatedCost: parseFloat(d.estimatedCost) || 0,
      actualCost: d.actualCost ? parseFloat(d.actualCost) : null,
      companyName: comp?.name  ?? repair?.companyName ?? '',
      areaName:    area?.name  ?? repair?.areaName    ?? '',
      assetName:   asset?.name ?? repair?.assetName   ?? '',
      walletType,
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
              <Field label="Actual Cost (AED)">
                <Input {...register('actualCost')} type="number" min="0" step="0.01" placeholder="0.00" />
              </Field>
            )}
          </FormGrid>
          {status === 'completed' && (
            <div className="mt-3">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Deduct cost from</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { k: 'home',    label: 'Home Wallet',    bal: homeWallet?.balance    ?? 0, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
                  { k: 'vehicle', label: 'Vehicle Wallet', bal: vehicleWallet?.balance ?? 0, color: '#0b1d3a', bg: '#eef2fb', border: '#c7d2f0' },
                ].map(({ k, label, bal, color, bg, border }) => (
                  <button key={k} type="button" onClick={() => setWalletType(k)}
                    className="flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl border-2 text-left transition-all"
                    style={walletType === k
                      ? { background: bg, borderColor: color }
                      : { background: '#f8fafc', borderColor: '#e2e8f0' }}>
                    <span className="text-[11px] font-bold" style={{ color: walletType === k ? color : '#64748b' }}>{label}</span>
                    <span className="text-[13px] font-black" style={{ color: walletType === k ? color : '#1e293b' }}>
                      AED {bal.toLocaleString('en-AE', { maximumFractionDigits: 0 })}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {displayCost > 0 && (
            <div className="flex items-center gap-2 mt-3 p-3 rounded-xl"
              style={{ background: walletType === 'vehicle' ? '#eef2fb' : '#f0fdf4', border: `1px solid ${walletType === 'vehicle' ? '#c7d2f0' : '#bbf7d0'}` }}>
              <RiWalletLine className="w-4 h-4 shrink-0" style={{ color: walletType === 'vehicle' ? '#0b1d3a' : '#16a34a' }} />
              <p className="text-[12px] font-medium" style={{ color: walletType === 'vehicle' ? '#1e3a8a' : '#15803d' }}>
                AED {displayCost.toLocaleString()} will be deducted from {walletType === 'vehicle' ? 'Vehicle' : 'Home'} Wallet on completion.
              </p>
            </div>
          )}
        </FormSection>
        <Field label="Notes"><Textarea {...register('notes')} rows={2} placeholder="Parts required, access notes, follow-up actions…" /></Field>
        <FormActions onCancel={onClose} loading={isSubmitting} submitLabel={repair ? 'Update Repair' : 'Report Issue'} />
      </form>
    </Modal>
  );
}
