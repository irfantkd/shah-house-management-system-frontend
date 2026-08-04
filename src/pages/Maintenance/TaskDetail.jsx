import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import DatePicker from '../../components/ui/DatePicker';
import toast from 'react-hot-toast';
import {
  RiArrowLeftLine, RiEditLine, RiDeleteBinLine, RiCheckLine,
  RiWalletLine, RiAddCircleLine, RiCalendar2Line, RiBuilding2Line,
  RiFileTextLine, RiArrowRightSLine, RiCheckboxCircleLine,
  RiPlayLine, RiPauseCircleLine, RiCloseCircleLine, RiRefreshLine,
  RiMapPin2Line, RiTimeLine, RiRepeatLine, RiAlertLine,
} from 'react-icons/ri';
import {
  Settings2, Wrench, ClipboardList, Search, Sparkles,
  Zap, Bug, Droplets, Wind, Settings, TreeDeciduous, Waves,
  Tv2, Shield, PaintBucket, Building,
} from 'lucide-react';
import { useGetQuery, usePostMutation, usePatchMutation, useDeleteMutation } from '../../api/apiSlice';
import { selectCurrentPropertyId } from '../../store/slices/propertiesSlice';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Field, Input, Select, Textarea, FormGrid } from '../../components/ui/FormField';
import { cn } from '../../utils/cn';

// ── Constants (shared config) ────────────────────────────────────────────────
const STATUS_CFG = {
  scheduled:     { label: 'Scheduled',   hex: '#2563eb', bg: 'rgba(37,99,235,0.12)',   color: '#1d4ed8',  border: '1px solid rgba(37,99,235,0.22)'  },
  'in-progress': { label: 'In Progress', hex: '#d97706', bg: 'rgba(234,88,12,0.13)',   color: '#c2410c',  border: '1px solid rgba(234,88,12,0.24)'   },
  'on-hold':     { label: 'On Hold',     hex: '#9333ea', bg: 'rgba(147,51,234,0.12)',  color: '#7e22ce',  border: '1px solid rgba(147,51,234,0.22)'  },
  overdue:       { label: 'Overdue',     hex: '#dc2626', bg: 'rgba(220,38,38,0.14)',   color: '#b91c1c',  border: '1px solid rgba(220,38,38,0.26)'   },
  completed:     { label: 'Completed',   hex: '#16a34a', bg: 'rgba(22,163,74,0.12)',   color: '#15803d',  border: '1px solid rgba(22,163,74,0.22)'   },
  cancelled:     { label: 'Cancelled',   hex: '#64748b', bg: 'rgba(100,116,139,0.10)', color: '#475569',  border: '1px solid rgba(100,116,139,0.20)' },
};
const PRIORITY_CFG = {
  critical: { label: 'Critical', hex: '#dc2626' },
  high:     { label: 'High',     hex: '#ea580c' },
  medium:   { label: 'Medium',   hex: '#2563eb' },
  low:      { label: 'Low',      hex: '#64748b' },
};
const NEXT_STATUSES = {
  scheduled:     ['in-progress', 'on-hold', 'cancelled'],
  'in-progress': ['on-hold', 'scheduled'],
  'on-hold':     ['in-progress', 'cancelled'],
  overdue:       ['in-progress', 'on-hold', 'cancelled'],
  completed:     ['scheduled'],
  cancelled:     ['scheduled'],
};
const CAT_CFG = {
  Maintenance: { hex: '#16a34a', Icon: Settings2 },
  Repair:      { hex: '#dc2626', Icon: Wrench    },
};
const CUSTOM_PALETTE = ['#7c3aed','#0891b2','#d97706','#be185d','#0f766e','#1e40af'];
function getCatCfg(cat) {
  if (CAT_CFG[cat]) return CAT_CFG[cat];
  const keys = Object.keys(CAT_CFG);
  return { hex: CUSTOM_PALETTE[keys.length % CUSTOM_PALETTE.length], Icon: ClipboardList };
}
const TYPE_ICON = {
  'ac / cooling': Wind, plumbing: Droplets, electrical: Zap, cleaning: Sparkles,
  'pest control': Bug, 'pool & water': Waves, garden: TreeDeciduous,
  'security / cctv': Shield, appliance: Tv2, structural: Building, painting: PaintBucket, other: ClipboardList,
};
function typeIcon(t) {
  if (!t) return ClipboardList;
  const k = t.toLowerCase();
  if (TYPE_ICON[k]) return TYPE_ICON[k];
  if (k.includes('clean')) return Sparkles;
  if (k.includes('ac') || k.includes('cool')) return Wind;
  if (k.includes('plumb') || k.includes('tap') || k.includes('water')) return Droplets;
  if (k.includes('electr')) return Zap;
  if (k.includes('pool')) return Waves;
  if (k.includes('garden') || k.includes('irrig')) return TreeDeciduous;
  if (k.includes('repair') || k.includes('fix')) return Wrench;
  return ClipboardList;
}
function fmtDate(s) {
  if (!s) return '—';
  return new Date(s+'T00:00:00').toLocaleDateString('en-AE', { day:'numeric', month:'short', year:'numeric' });
}
function daysUntil(s) {
  if (!s) return null;
  return Math.ceil((new Date(s+'T00:00:00') - new Date()) / 86400000);
}

const EXPENSE_CATS = ['Labour', 'Parts / Materials', 'Replacement Item', 'Inspection Fee', 'Other'];

// ── Task Detail Page ─────────────────────────────────────────────────────────
export default function TaskDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const propertyId = useSelector(selectCurrentPropertyId);

  const { data: task, isLoading }        = useGetQuery({ path: `/tasks/${id}` });
  const { data: companies = [] }         = useGetQuery({ path: '/companies' });
  const { data: contracts = [] }         = useGetQuery({ path: '/contracts', params: { propertyId } }, { skip: !propertyId });
  const { data: walletData, refetch: refetchWallet } = useGetQuery({ path: '/wallet', params: { propertyId } }, { skip: !propertyId });
  const homeWallet    = { balance: walletData?.home?.balance    ?? 0 };
  const vehicleWallet = { balance: walletData?.vehicle?.balance ?? 0 };

  const [patchTaskMut]    = usePatchMutation();
  const [deleteTaskMut]   = useDeleteMutation();
  const [addExpenseMut]   = usePostMutation();
  const [deductWalletMut] = usePostMutation();

  const [showExpense,  setShowExpense]  = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [showDelete,   setShowDelete]   = useState(false);

  if (isLoading) return null;
  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <RiAlertLine className="w-12 h-12 text-slate-300" />
        <p className="text-[15px] font-semibold text-slate-500">Task not found</p>
        <button onClick={() => navigate('/maintenance')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-navy-900 text-white text-[13px] font-semibold">
          <RiArrowLeftLine className="w-4 h-4" /> Back to Maintenance
        </button>
      </div>
    );
  }

  const catCfg   = getCatCfg(task.category);
  const sBadge   = STATUS_CFG[task.status] ?? STATUS_CFG.scheduled;
  const prioHex  = PRIORITY_CFG[task.priority]?.hex ?? '#64748b';
  const prioLbl  = PRIORITY_CFG[task.priority]?.label ?? task.priority;
  const TaskTypeIcon = typeIcon(task.type);
  const company  = companies.find((c) => c.id === task.companyId);
  const contract = contracts.find((c) => c.id === task.contractId);
  const nextSts  = NEXT_STATUSES[task.status] ?? [];
  const daysLeft = daysUntil(task.scheduledDate);
  const expenses = task.expenses ?? [];
  const expTotal = expenses.reduce((s, e) => s + (e.amount ?? 0), 0);

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'completed') { setShowComplete(true); return; }
    try {
      await patchTaskMut({ path: `/tasks/${id}`, body: { status: newStatus } }).unwrap();
      toast.success(`Status → ${STATUS_CFG[newStatus]?.label ?? newStatus}`);
    } catch { toast.error('Failed to update status'); }
  };

  const handleDelete = async () => {
    try {
      await deleteTaskMut({ path: `/tasks/${id}` }).unwrap();
      toast.success('Task deleted');
      navigate('/maintenance');
    } catch { toast.error('Failed to delete task'); }
  };

  const locationParts = [task.floor, task.areaName, task.assetName].filter(Boolean);

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className="space-y-5 max-w-3xl">

      {/* ── Back nav ── */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/maintenance')}
          className="flex items-center gap-2 text-[13px] font-semibold text-slate-500 hover:text-navy-800 transition-colors">
          <RiArrowLeftLine className="w-4 h-4" />
          Maintenance & Repairs
        </button>
        <div className="flex items-center gap-2">
          <Link to={`/maintenance`} state={{ editId: task.id }}
            onClick={() => navigate('/maintenance', { state: { editId: task.id } })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 transition-all">
            <RiEditLine className="w-3.5 h-3.5" /> Edit
          </Link>
          <button onClick={() => setShowDelete(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-100 text-[12px] font-semibold text-red-500 hover:bg-red-50 transition-all">
            <RiDeleteBinLine className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>

      {/* ── Hero card ── */}
      <div className="rounded-3xl overflow-hidden" style={{ boxShadow: '0 4px 24px rgba(11,29,58,0.18)' }}>
        <div className="relative px-6 pt-5 pb-6"
          style={{ background: 'linear-gradient(150deg, #0a172e 0%, #0c1f3f 55%, #0e2550 100%)' }}>

          {/* Priority top bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: prioHex }} />

          {/* Decorative rings */}
          <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.05)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', top:-20, right:-20, width:90, height:90, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.08)', pointerEvents:'none' }} />
          {/* Ghost watermark */}
          <catCfg.Icon style={{ position:'absolute', right:12, bottom:-8, width:80, height:80, color:'rgba(255,255,255,0.06)', userSelect:'none', pointerEvents:'none' }} />

          {/* Status + priority */}
          <div className="flex items-center gap-2 mb-4">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
              style={{ background: sBadge.bg, color: sBadge.color, border: sBadge.border }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: sBadge.hex }} />
              {sBadge.label}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black"
              style={{ background: `${prioHex}30`, color: prioHex }}>
              {prioLbl}
            </span>
          </div>

          {/* Title row */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl shrink-0 flex flex-col items-center justify-center gap-1"
              style={{ background: `${catCfg.hex}25`, border: '2px solid rgba(255,255,255,0.12)' }}>
              <catCfg.Icon className="w-6 h-6 text-white" strokeWidth={1.5} />
              <span className="text-[8px] font-black text-white/30 leading-none">{task.category.toUpperCase().slice(0,4)}</span>
            </div>
            <div className="flex-1 min-w-0 mt-0.5">
              <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1">{task.category}</p>
              <h1 className="text-xl font-black text-white leading-tight">{task.title}</h1>
              {task.type && (
                <p className="text-[13px] text-white/60 mt-1 flex items-center gap-1.5">
                  <TaskTypeIcon className="w-3.5 h-3.5" strokeWidth={1.5} />{task.type}
                </p>
              )}
            </div>
          </div>

          {/* Date chip at bottom */}
          {task.status !== 'completed' && task.scheduledDate && (
            <div className="flex items-center gap-2 mt-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/8"
                style={{ background: 'rgba(255,255,255,0.08)' }}>
                <RiCalendar2Line className="w-3.5 h-3.5 text-white/50" />
                <span className="text-[12px] font-semibold text-white/70">{fmtDate(task.scheduledDate)}</span>
              </div>
              {task.status === 'scheduled' && daysLeft !== null && (
                <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-xl',
                  daysLeft < 0  ? 'bg-red-500/20 text-red-300' :
                  daysLeft <= 3 ? 'bg-amber-500/20 text-amber-300' :
                                  'bg-white/8 text-white/50')}
                  style={daysLeft > 3 ? { background: 'rgba(255,255,255,0.08)' } : {}}>
                  {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Today' : `${daysLeft}d away`}
                </span>
              )}
            </div>
          )}
          {task.status === 'completed' && task.completedDate && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl mt-4 self-start w-fit"
              style={{ background: 'rgba(22,163,74,0.18)' }}>
              <RiCheckboxCircleLine className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[12px] font-semibold text-emerald-300">Completed {fmtDate(task.completedDate)}</span>
            </div>
          )}
        </div>

        {/* ── Status action bar ── */}
        <div className="px-5 py-3 flex items-center gap-2 flex-wrap"
          style={{ background: 'rgba(11,29,58,0.96)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>

          {nextSts.filter((s) => s !== 'completed').map((s) => {
            const sc = STATUS_CFG[s];
            return (
              <button key={s} onClick={() => handleStatusChange(s)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all"
                style={{ background: sc.bg, color: sc.color, border: sc.border }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.75'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}>
                {s === 'in-progress' && <RiPlayLine className="w-3 h-3" />}
                {s === 'on-hold'     && <RiPauseCircleLine className="w-3 h-3" />}
                {s === 'scheduled'   && <RiCalendar2Line className="w-3 h-3" />}
                {s === 'cancelled'   && <RiCloseCircleLine className="w-3 h-3" />}
                {sc.label}
              </button>
            );
          })}

          <button onClick={() => setShowExpense(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all"
            style={{ background: 'rgba(217,119,6,0.15)', color: '#fbbf24' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(217,119,6,0.28)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(217,119,6,0.15)'; }}>
            <RiAddCircleLine className="w-3 h-3" /> Add Expense
          </button>

          {task.status !== 'completed' && task.status !== 'cancelled' && (
            <button onClick={() => setShowComplete(true)}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all"
              style={{ background: 'rgba(22,163,74,0.18)', color: '#4ade80' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(22,163,74,0.30)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(22,163,74,0.18)'; }}>
              <RiCheckLine className="w-3 h-3" /> Mark Complete
            </button>
          )}
          {(task.status === 'completed' || task.status === 'cancelled') && (
            <button onClick={() => handleStatusChange('scheduled')}
              className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-white/40 hover:text-white/60 transition-colors">
              <RiRefreshLine className="w-3 h-3" /> Reopen
            </button>
          )}
        </div>
      </div>

      {/* ── Detail grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Location */}
        {locationParts.length > 0 && (
          <InfoCard icon={RiMapPin2Line} label="Location">
            <div className="flex items-center gap-1 flex-wrap">
              {locationParts.map((p, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <RiArrowRightSLine className="w-3.5 h-3.5 text-slate-300" />}
                  <span className={cn('text-[13px] font-semibold', i === locationParts.length - 1 ? 'text-slate-800' : 'text-slate-500')}>{p}</span>
                </span>
              ))}
            </div>
          </InfoCard>
        )}

        {/* Dates */}
        <InfoCard icon={RiCalendar2Line} label="Schedule">
          <div className="space-y-1">
            {task.scheduledDate && (
              <p className="text-[13px] font-semibold text-slate-800">Scheduled: <span className="font-normal text-slate-500">{fmtDate(task.scheduledDate)}</span></p>
            )}
            {task.completedDate && (
              <p className="text-[13px] font-semibold text-emerald-700">Completed: <span className="font-normal">{fmtDate(task.completedDate)}</span></p>
            )}
            {task.recurrence && task.recurrence !== 'one-time' && (
              <p className="text-[12px] text-slate-400 flex items-center gap-1">
                <RiRepeatLine className="w-3.5 h-3.5" />
                {task.recurrence.charAt(0).toUpperCase() + task.recurrence.slice(1)}
              </p>
            )}
          </div>
        </InfoCard>

        {/* Company */}
        {(company || task.companyName) && (
          <InfoCard icon={RiBuilding2Line} label="Service Company">
            {company
              ? <Link to={`/companies/${company.id}`} className="text-[13px] font-semibold text-navy-700 hover:underline">{company.name}</Link>
              : <p className="text-[13px] font-semibold text-slate-800">{task.companyName}</p>
            }
          </InfoCard>
        )}

        {/* Contract */}
        {(contract || task.contractId) && (
          <InfoCard icon={RiFileTextLine} label="Contract">
            {contract
              ? <Link to={`/contracts/${contract.id}`} className="text-[13px] font-semibold text-navy-700 hover:underline">{contract.title}</Link>
              : <p className="text-[13px] font-semibold text-slate-500">Contract on file</p>
            }
          </InfoCard>
        )}
      </div>

      {/* Notes */}
      {task.notes && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
          <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-2">Notes</p>
          <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap">{task.notes}</p>
        </div>
      )}

      {/* Completion notes */}
      {task.completionNotes && (
        <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-5">
          <p className="text-[10px] font-black text-emerald-600 tracking-widest uppercase mb-2">Completion Notes</p>
          <p className="text-[13px] text-emerald-800 leading-relaxed whitespace-pre-wrap">{task.completionNotes}</p>
        </div>
      )}

      {/* ── Expenses ── */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[14px] font-bold text-slate-900">Expenses</p>
            {expenses.length > 0 && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                AED {expTotal.toLocaleString()} total · {expenses.length} item{expenses.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button onClick={() => setShowExpense(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-100 text-[12px] font-bold text-amber-700 hover:bg-amber-100 transition-all">
            <RiAddCircleLine className="w-3.5 h-3.5" /> Add Expense
          </button>
        </div>

        {expenses.length === 0 ? (
          <div className="py-8 text-center">
            <RiWalletLine className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-[12px] text-slate-400">No expenses logged yet</p>
            <p className="text-[11px] text-slate-300 mt-0.5">Parts, labour, or any cost paid for this task</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {expenses.map((exp) => (
              <div key={exp.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800">{exp.description || exp.category}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{exp.category} · {fmtDate(exp.date)}</p>
                  {exp.notes && <p className="text-[11px] text-slate-400 truncate mt-0.5">{exp.notes}</p>}
                </div>
                <span className="text-[14px] font-black text-amber-700 shrink-0">
                  AED {(exp.amount ?? 0).toLocaleString()}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between px-5 py-3 bg-amber-50">
              <span className="text-[12px] font-semibold text-amber-700">Total spent</span>
              <span className="text-[15px] font-black text-amber-800">AED {expTotal.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Complete Modal ── */}
      <CompleteModal open={showComplete} task={task}
        onClose={() => setShowComplete(false)}
        onConfirm={async ({ completedDate, completionNotes }) => {
          try {
            await patchTaskMut({ path: `/tasks/${id}`, body: { status: 'completed', completedDate, completionNotes } }).unwrap();
            toast.success('Task marked as completed!');
            setShowComplete(false);
          } catch { toast.error('Failed to complete task'); }
        }} />

      {/* ── Expense Modal ── */}
      <ExpenseModal open={showExpense} task={task} homeWallet={homeWallet} vehicleWallet={vehicleWallet}
        onClose={() => setShowExpense(false)}
        onSave={async (expense) => {
          try {
            const ops = [addExpenseMut({ path: `/tasks/${id}/expenses`, body: { ...expense, propertyId } }).unwrap()];
            if (expense.amount > 0) {
              const walletType = expense.walletType ?? 'home';
              ops.push(deductWalletMut({ path: '/wallet/deduct', body: { propertyId, walletType, amount: expense.amount, description: `${task.title} — ${expense.description || expense.category}`, category: task.category, date: expense.date } }).unwrap());
            }
            await Promise.all(ops);
            await refetchWallet();
            toast.success(`Expense AED ${expense.amount.toLocaleString()} added`);
            setShowExpense(false);
          } catch { toast.error('Failed to add expense'); }
        }} />

      {/* ── Delete Confirm ── */}
      <ConfirmDialog open={showDelete} onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Delete Task"
        message={`Delete "${task.title}"? This cannot be undone.`} />
    </motion.div>
  );
}

// ── Small re-usable info card ────────────────────────────────────────────────
function InfoCard({ icon: Icon, label, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-slate-300" />
        <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">{label}</p>
      </div>
      {children}
    </div>
  );
}

const DP_CLS = 'w-full rounded-xl border border-slate-200 bg-white text-[13px] text-slate-800 outline-none focus:ring-2 focus:ring-accent-400 focus:border-accent-400 transition-all h-10 px-3.5';

// ── Complete Modal ────────────────────────────────────────────────────────────
function CompleteModal({ open, task, onClose, onConfirm }) {
  const { register, handleSubmit, reset, control } = useForm();

  const onOpen = () => reset({ completedDate: new Date().toISOString().split('T')[0], completionNotes: '' });
  useState(() => { if (open) onOpen(); }, [open]);

  if (!task) return null;
  return (
    <Modal open={open} onClose={onClose} title="Mark as Completed" subtitle={task.title}>
      <form onSubmit={handleSubmit((d) => onConfirm({ completedDate: d.completedDate, completionNotes: d.completionNotes || '' }))}
        className="space-y-4">
        <Field label="Completion Date" required>
          <Controller name="completedDate" control={control} rules={{ required: true }}
            render={({ field }) => <DatePicker value={field.value ?? ''} onChange={field.onChange} className={DP_CLS} />} />
        </Field>
        <Field label="Completion Notes" hint="What was done, parts used, observations">
          <Textarea {...register('completionNotes')} rows={3}
            placeholder="e.g. Replaced filters, topped up refrigerant, next service in 6 months…" />
        </Field>
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-100">
          <RiWalletLine className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[12px] text-amber-700">
            <strong>Had a cost?</strong> Use the <strong>Add Expense</strong> button to record parts or labour — only added costs are deducted from your Home Wallet.
          </p>
        </div>
        <div className="flex gap-3 pt-1 border-t border-slate-100">
          <button type="button" onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-all">
            Cancel
          </button>
          <button type="submit"
            className="flex-1 h-10 rounded-xl text-[13px] font-bold text-white flex items-center justify-center gap-2 transition-all"
            style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
            <RiCheckboxCircleLine className="w-4 h-4" /> Mark Complete
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Expense Modal ─────────────────────────────────────────────────────────────
function ExpenseModal({ open, task, homeWallet, vehicleWallet, onClose, onSave }) {
  const { register, handleSubmit, reset, watch, control } = useForm();
  const [walletType, setWalletType] = useState('home');
  const amount  = parseFloat(watch('amount') ?? 0) || 0;
  const balance = walletType === 'vehicle' ? (vehicleWallet?.balance ?? 0) : (homeWallet?.balance ?? 0);
  const newBal  = balance - amount;

  useState(() => {
    if (open) { setWalletType('home'); reset({ date: new Date().toISOString().split('T')[0], amount: '', category: 'Labour' }); }
  }, [open]);

  if (!task) return null;
  return (
    <Modal open={open} onClose={onClose} title="Add Expense" subtitle={`For: ${task.title}`}>
      <form onSubmit={handleSubmit((d) => onSave({
        description: d.description, category: d.category, date: d.date,
        amount: parseFloat(d.amount) || 0, notes: d.notes || '', walletType,
      }))} className="space-y-4">

        {/* Wallet selector */}
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Deduct from Wallet</p>
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

        <Field label="Description" required>
          <Input {...register('description', { required: true })}
            placeholder="e.g. Replaced AC filter, Labour charge, New pump…" />
        </Field>

        <FormGrid>
          <Field label="Category">
            <select {...register('category')}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] text-slate-800 focus:outline-none focus:border-navy-400 bg-white">
              {EXPENSE_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Date" required>
            <Controller name="date" control={control} rules={{ required: true }}
              render={({ field }) => <DatePicker value={field.value ?? ''} onChange={field.onChange} className={DP_CLS} />} />
          </Field>
        </FormGrid>

        <Field label="Amount (AED)" required>
          <Input {...register('amount', { required: true, min: 0 })} type="number" step="0.01" min="0"
            placeholder="0.00" />
        </Field>

        {amount > 0 && (
          <div className="flex items-center justify-between p-3 rounded-xl border"
            style={{ background: walletType === 'vehicle' ? '#eef2fb' : '#f0fdf4', borderColor: walletType === 'vehicle' ? '#c7d2f0' : '#bbf7d0' }}>
            <span className="text-[12px] text-slate-500">{walletType === 'vehicle' ? 'Vehicle' : 'Home'} Wallet after deduction</span>
            <span className={cn('text-[14px] font-black', newBal < 0 ? 'text-red-600' : walletType === 'vehicle' ? 'text-navy-700' : 'text-emerald-700')}>
              {newBal < 0 ? `− AED ${Math.abs(newBal).toLocaleString()}` : `AED ${newBal.toLocaleString()}`}
            </span>
          </div>
        )}

        <Field label="Notes (optional)">
          <Textarea {...register('notes')} rows={2} placeholder="Receipt number, supplier, additional details…" />
        </Field>

        <div className="flex gap-3 pt-1 border-t border-slate-100">
          <button type="button" onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-all">
            Cancel
          </button>
          <button type="submit"
            className="flex-1 h-10 rounded-xl text-[13px] font-bold text-white flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}>
            <RiWalletLine className="w-4 h-4" /> Save Expense
          </button>
        </div>
      </form>
    </Modal>
  );
}
