import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  RiAddLine, RiEditLine, RiDeleteBinLine, RiFileTextLine,
  RiAlertLine, RiArrowRightLine, RiCalendarLine, RiTimeLine,
  RiRefreshLine, RiCheckLine, RiWalletLine, RiBuilding2Line,
} from 'react-icons/ri';
import { selectContracts, addContract, updateContract, deleteContract } from '../../store/slices/contractsSlice';
import { selectCompanies } from '../../store/slices/companiesSlice';
import { selectHomeWallet, deductFromWallet } from '../../store/slices/walletSlice';
import { CATEGORY_CFG } from '../../data/mockCompanies';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Field, Input, Select, Textarea, FormGrid, FormSection, FormActions } from '../../components/ui/FormField';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { cn } from '../../utils/cn';

const COST_PERIODS = ['monthly','quarterly','bi-annual','annual','one-time'];
const STATUS_OPTS  = ['active','expiring','expired'];

// Category accent colors (hex) — matches Companies CAT_HEX
const CAT_HEX = {
  'Climate / AC':      '#2563eb',
  'Pool & Water':      '#0891b2',
  'Garden':            '#16a34a',
  'Cleaning':          '#9333ea',
  'Security / CCTV':   '#1e3a6e',
  'Electrical':        '#d97706',
  'Plumbing':          '#1d4ed8',
  'Pest Control':      '#ea580c',
  'Painting':          '#e11d48',
  'Power / Generator': '#ca8a04',
};
const catColor = (cat) => CAT_HEX[cat] ?? '#0b1d3a';

const STATUS_CFG = {
  active:   { hex:'#16a34a', bg:'rgba(22,163,74,0.14)',  color:'#86efac', border:'1px solid rgba(22,163,74,0.25)',  label:'Active'   },
  expiring: { hex:'#d97706', bg:'rgba(217,119,6,0.14)',  color:'#fbbf24', border:'1px solid rgba(217,119,6,0.25)',  label:'Expiring' },
  expired:  { hex:'#dc2626', bg:'rgba(220,38,38,0.18)',  color:'#fca5a5', border:'1px solid rgba(220,38,38,0.30)',  label:'Expired'  },
};

// First two initials of a string
const inits = (str) => {
  if (!str) return '??';
  const parts = str.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0]+parts[1][0]).toUpperCase() : str.substring(0,2).toUpperCase();
};

function daysUntil(dateStr) {
  return Math.ceil((new Date(dateStr+'T00:00:00') - new Date()) / 86400000);
}
function fmtDate(str) {
  if (!str) return '—';
  return new Date(str+'T00:00:00').toLocaleDateString('en-AE',{day:'numeric',month:'short',year:'numeric'});
}

export default function ContractsPage() {
  const dispatch   = useDispatch();
  const contracts  = useSelector(selectContracts);
  const companies  = useSelector(selectCompanies);
  const homeWallet = useSelector(selectHomeWallet);

  const [filter,    setFilter]   = useState('all');
  const [modal,     setModal]    = useState(null);
  const [delTarget, setDelTarget]= useState(null);
  const [payTarget, setPayTarget]= useState(null);

  const expiringCount = contracts.filter((c) => c.status === 'expiring').length;
  const filtered = contracts.filter((c) => filter === 'all' || c.status === filter);

  const stats = {
    total:    contracts.length,
    active:   contracts.filter((c) => c.status === 'active').length,
    expiring: expiringCount,
    expired:  contracts.filter((c) => c.status === 'expired').length,
    totalMonthly: contracts
      .filter((c) => c.status === 'active')
      .reduce((s, c) => {
        const m = { monthly:1, quarterly:1/3, 'bi-annual':1/6, annual:1/12, 'one-time':0 };
        return s + (c.cost ?? 0) * (m[c.costPeriod] ?? 0);
      }, 0),
  };

  const handlePayNow = (contract) => {
    dispatch(deductFromWallet({
      wallet: 'home',
      amount: contract.cost,
      description: `Contract: ${contract.title}`,
      category: 'Contracts',
      date: new Date().toISOString().split('T')[0],
    }));
    toast.success(`AED ${contract.cost.toLocaleString()} paid from Home Wallet`);
    setPayTarget(null);
  };

  return (
    <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.3 }} className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Contracts</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">{contracts.length} service contracts · track renewals and expirations</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
            <RiWalletLine className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-[12px] font-bold text-emerald-700">AED {homeWallet.balance.toLocaleString()}</span>
            <span className="text-[10px] text-emerald-500 hidden sm:inline">Home Wallet</span>
          </div>
          <Button variant="primary" icon={RiAddLine} onClick={() => setModal('add')}>New Contract</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:'Total',           value:stats.total,    grad:'from-navy-600 to-navy-800',         Icon:RiFileTextLine },
          { label:'Active',          value:stats.active,   grad:'from-success-500 to-success-700',   Icon:RiCheckLine    },
          { label:'Expiring Soon',   value:stats.expiring, grad:'from-warning-500 to-orange-600',    Icon:RiTimeLine     },
          { label:'Monthly Est.',    value:`AED ${Math.round(stats.totalMonthly).toLocaleString()}`, grad:'from-accent-500 to-accent-700', Icon:RiWalletLine },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.07 }}
            className={cn('rounded-2xl p-5 text-white flex items-center gap-4 bg-linear-to-br', s.grad)}>
            <s.Icon className="w-8 h-8 opacity-75 shrink-0" />
            <div>
              <p className="text-2xl font-bold leading-none">{s.value}</p>
              <p className="text-[12px] text-white/70 mt-1">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Expiring alert */}
      {expiringCount > 0 && (
        <div className="flex items-center gap-3 bg-warning-50 border border-warning-200 rounded-2xl px-5 py-4">
          <RiAlertLine className="w-5 h-5 text-warning-600 shrink-0" />
          <p className="text-[13px] font-semibold text-warning-800 flex-1">
            {expiringCount} contract{expiringCount > 1 ? 's' : ''} expiring soon — review and renew before service lapses.
          </p>
          <button onClick={() => setFilter('expiring')} className="text-[12px] font-bold text-warning-700 hover:underline">View →</button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[['all','All'], ['active','Active'], ['expiring','Expiring'], ['expired','Expired']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold whitespace-nowrap border transition-all',
              filter === v ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300')}>
            {l}
            <span className={cn('text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center',
              filter === v ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500')}>
              {v === 'all' ? stats.total : (stats[v] ?? 0)}
            </span>
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <RiFileTextLine className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-400">No contracts found</p>
          <button onClick={() => setModal('add')} className="mt-3 text-accent-600 text-[13px] font-semibold hover:underline">+ Add first contract</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, scale:0.96 }} transition={{ delay:i*0.04 }}>
                <ContractCard contract={c} companies={companies}
                  onEdit={() => setModal(c)} onDelete={() => setDelTarget(c)} onPay={() => setPayTarget(c)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <ContractModal open={modal !== null} contract={modal !== 'add' ? modal : null} companies={companies}
        onClose={() => setModal(null)}
        onSave={(data) => {
          if (modal !== 'add') { dispatch(updateContract({ ...modal, ...data })); toast.success('Contract updated!'); }
          else { dispatch(addContract(data)); toast.success('Contract added!'); }
          setModal(null);
        }}
      />
      <ConfirmDialog open={!!delTarget} onClose={() => setDelTarget(null)}
        onConfirm={() => { dispatch(deleteContract(delTarget.id)); toast.success('Contract deleted'); setDelTarget(null); }}
        title="Delete Contract" message={`Delete "${delTarget?.title}"? This cannot be undone.`}
      />
      {/* Pay now confirm */}
      <ConfirmDialog open={!!payTarget} onClose={() => setPayTarget(null)}
        onConfirm={() => handlePayNow(payTarget)}
        title="Pay from Home Wallet"
        message={`Deduct AED ${payTarget?.cost?.toLocaleString()} for "${payTarget?.title}" from Home Wallet (balance: AED ${homeWallet.balance.toLocaleString()})?`}
      />
    </motion.div>
  );
}

function ContractCard({ contract: c, companies, onEdit, onDelete, onPay }) {
  const company = companies?.find((co) => co.id === c.companyId);
  const color   = catColor(company?.category ?? c.category ?? '');
  const sCfg    = STATUS_CFG[c.status] ?? STATUS_CFG.active;
  const days    = c.endDate ? daysUntil(c.endDate) : null;
  const ci      = inits(c.title);

  return (
    <div className="group rounded-3xl overflow-hidden bg-white flex flex-col"
      style={{ boxShadow:'0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(11,29,58,0.10)' }}>

      {/* HEADER */}
      <div className="relative px-5 pt-4 pb-4 overflow-hidden"
        style={{ background:'linear-gradient(150deg, #0a172e 0%, #0c1f3f 55%, #0e2550 100%)' }}>

        {/* status accent bar */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:sCfg.hex, zIndex:2 }} />

        {/* rings */}
        <div style={{ position:'absolute', top:-36, right:-36, width:130, height:130, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.06)', pointerEvents:'none', zIndex:1 }} />
        <div style={{ position:'absolute', top:-18, right:-18, width:80,  height:80,  borderRadius:'50%', border:'1px solid rgba(255,255,255,0.09)', pointerEvents:'none', zIndex:1 }} />

        {/* ghost watermark */}
        <div style={{ position:'absolute', right:8, bottom:-4, fontSize:70, fontWeight:900, lineHeight:1, color:'rgba(255,255,255,0.04)', letterSpacing:'-3px', userSelect:'none', pointerEvents:'none', zIndex:1 }}>{ci}</div>

        {/* status badge */}
        <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-[11px] font-bold"
          style={{ background:sCfg.bg, color:sCfg.color, border:sCfg.border, zIndex:10 }}>
          {sCfg.label}
        </div>

        {/* avatar + title */}
        <div className="relative flex items-center gap-3.5 mt-1" style={{ zIndex:5 }}>
          <div className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center text-[17px] font-black text-white select-none"
            style={{ background:`${color}28`, border:'2.5px solid rgba(255,255,255,0.13)', boxShadow:`0 4px 20px ${color}40` }}>
            {ci}
          </div>
          <div className="min-w-0 flex-1 pr-10">
            <p className="text-[15px] font-black text-white leading-snug line-clamp-2">{c.title}</p>
            <p className="text-[11px] font-semibold mt-0.5" style={{ color:'rgba(255,255,255,0.42)' }}>
              {c.companyName || '—'}{c.category ? ` · ${c.category}` : ''}
            </p>
          </div>
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

        {/* date range */}
        <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
          <RiCalendarLine className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <span>{fmtDate(c.startDate)}</span>
          <span className="text-slate-300">→</span>
          <span className="font-medium">{fmtDate(c.endDate)}</span>
        </div>

        {/* company link */}
        {(company || c.companyName) && (
          <div className="flex items-center gap-2 text-[12px] text-slate-600">
            <RiBuilding2Line className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            {company
              ? <Link to={`/companies/${company.id}`} className="font-medium truncate hover:text-navy-700 transition-colors">{company.name}</Link>
              : <span className="font-medium truncate">{c.companyName}</span>
            }
          </div>
        )}

        {/* days remaining chip */}
        {days !== null && (
          <div className={cn('inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-xl text-[11px] font-bold',
            days < 0   ? 'bg-danger-50 text-danger-600' :
            days < 30  ? 'bg-warning-50 text-warning-600' :
            days < 90  ? 'bg-amber-50 text-amber-600' :
                         'bg-success-50 text-success-600')}>
            <RiTimeLine className="w-3 h-3" />
            {days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days} days left`}
          </div>
        )}

        {c.autoRenew && (
          <div className="flex items-center gap-1.5 text-[11px] text-accent-600 font-semibold">
            <RiRefreshLine className="w-3.5 h-3.5" /> Auto-renews
          </div>
        )}

        <div className="flex-1" />

        {/* footer: cost + pay + detail link */}
        <div className="border-t border-slate-100 pt-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Contract Value</p>
            <p className="text-[13px] font-bold" style={{ color:'#0b1d3a' }}>
              AED {(c.cost ?? 0).toLocaleString()} <span className="text-[11px] text-slate-400 font-normal">/ {c.costPeriod}</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {c.status !== 'expired' && (
              <button onClick={onPay}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all"
                style={{ background:'rgba(22,163,74,0.10)', color:'#16a34a' }}
                onMouseEnter={(e) => { e.currentTarget.style.background='rgba(22,163,74,0.18)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background='rgba(22,163,74,0.10)'; }}>
                <RiWalletLine className="w-3 h-3" />Pay
              </button>
            )}
            <Link to={`/contracts/${c.id}`}
              className="flex items-center gap-1 text-[12px] font-bold text-slate-400 hover:text-navy-800 transition-colors">
              View <RiArrowRightLine className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContractModal({ open, onClose, contract: c, companies, onSave }) {
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();
  useEffect(() => {
    if (!open) return;
    reset(c ? {
      title: c.title, companyId: c.companyId ?? '', category: c.category ?? '',
      description: c.description ?? '', startDate: c.startDate, endDate: c.endDate,
      cost: c.cost, costPeriod: c.costPeriod, renewalReminder: c.renewalReminder ?? 30,
      autoRenew: c.autoRenew ? 'true' : 'false', status: c.status, notes: c.notes ?? '',
    } : { costPeriod:'annual', renewalReminder:30, status:'active', autoRenew:'false' });
  }, [open, c]);

  const cost = watch('cost');

  const onSubmit = (d) => {
    const comp = companies.find((co) => co.id === d.companyId);
    onSave({ ...d,
      cost: parseFloat(d.cost) || 0,
      renewalReminder: parseInt(d.renewalReminder) || 30,
      autoRenew: d.autoRenew === 'true',
      companyName: comp?.name ?? c?.companyName ?? '',
      category: comp?.category ?? d.category ?? '',
    });
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title={c ? 'Edit Contract' : 'Add New Contract'} subtitle="Service contract details and renewal settings">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Field label="Contract Title" required error={errors.title?.message}>
          <Input {...register('title', { required:'Required' })} placeholder="e.g. Annual AC Maintenance Contract" />
        </Field>
        <FormGrid>
          <Field label="Service Company" required error={errors.companyId?.message}>
            <Select {...register('companyId', { required:'Required' })} placeholder="Select company"
              options={companies.map((co) => ({ value:co.id, label:co.name }))} />
          </Field>
          <Field label="Status">
            <Select {...register('status')} options={STATUS_OPTS.map((s) => ({ value:s, label:s.charAt(0).toUpperCase()+s.slice(1) }))} />
          </Field>
        </FormGrid>
        <FormSection title="Duration & Cost">
          <FormGrid>
            <Field label="Start Date" required error={errors.startDate?.message}>
              <Input {...register('startDate', { required:'Required' })} type="date" />
            </Field>
            <Field label="End Date" required error={errors.endDate?.message}>
              <Input {...register('endDate', { required:'Required' })} type="date" />
            </Field>
            <Field label="Contract Value (AED)" required error={errors.cost?.message}>
              <Input {...register('cost', { required:'Required' })} type="number" min="0" step="0.01" placeholder="0.00" />
            </Field>
            <Field label="Billing Period">
              <Select {...register('costPeriod')} options={COST_PERIODS.map((p) => ({ value:p, label:p.charAt(0).toUpperCase()+p.slice(1) }))} />
            </Field>
          </FormGrid>
          {parseFloat(cost) > 0 && (
            <div className="flex items-center gap-2 mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <RiWalletLine className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-[12px] text-emerald-700 font-medium">
                Use the "Pay" button on the contract card to deduct AED {parseFloat(cost).toLocaleString()} from Home Wallet.
              </p>
            </div>
          )}
        </FormSection>
        <FormGrid>
          <Field label="Renewal Reminder (days before)" hint="Days before expiry to notify you">
            <Input {...register('renewalReminder')} type="number" min="0" placeholder="30" />
          </Field>
          <Field label="Auto Renew">
            <Select {...register('autoRenew')} options={[{ value:'false', label:'No — Manual renewal' }, { value:'true', label:'Yes — Auto renew' }]} />
          </Field>
        </FormGrid>
        <Field label="Description">
          <Textarea {...register('description')} rows={2} placeholder="What services does this contract cover?" />
        </Field>
        <Field label="Notes">
          <Textarea {...register('notes')} rows={2} placeholder="Internal notes, terms, conditions…" />
        </Field>
        <FormActions onCancel={onClose} submitLabel={c ? 'Update Contract' : 'Add Contract'} />
      </form>
    </Modal>
  );
}
