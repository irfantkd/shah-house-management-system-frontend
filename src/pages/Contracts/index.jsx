import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  RiAddLine, RiEditLine, RiDeleteBinLine, RiFileTextLine,
  RiAlertLine, RiArrowRightLine, RiCalendarLine, RiTimeLine,
  RiRefreshLine, RiCheckLine,
} from 'react-icons/ri';
import { selectContracts, addContract, updateContract, deleteContract } from '../../store/slices/contractsSlice';
import { selectCompanies } from '../../store/slices/companiesSlice';
import { CATEGORY_CFG } from '../../data/mockCompanies';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Field, Input, Select, Textarea, FormGrid, FormSection, FormActions } from '../../components/ui/FormField';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { cn } from '../../utils/cn';

const COST_PERIODS = ['monthly','quarterly','bi-annual','annual','one-time'];
const STATUS_OPTS  = ['active','expiring','expired'];

const STATUS_CFG = {
  active:   { variant: 'success', label: 'Active',   border: 'border-l-success-400' },
  expiring: { variant: 'warning', label: 'Expiring', border: 'border-l-warning-400' },
  expired:  { variant: 'danger',  label: 'Expired',  border: 'border-l-danger-400'  },
};

function daysUntil(dateStr) {
  return Math.ceil((new Date(dateStr + 'T00:00:00') - new Date()) / 86400000);
}
function fmtDate(str) {
  if (!str) return '—';
  return new Date(str + 'T00:00:00').toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ContractsPage() {
  const dispatch   = useDispatch();
  const contracts  = useSelector(selectContracts);
  const companies  = useSelector(selectCompanies);
  const [filter,   setFilter]    = useState('all');
  const [modal,    setModal]     = useState(null);
  const [delTarget,setDelTarget] = useState(null);

  const expiringCount = contracts.filter((c) => c.status === 'expiring').length;
  const filtered = contracts.filter((c) => filter === 'all' || c.status === filter);

  const stats = {
    total:    contracts.length,
    active:   contracts.filter((c) => c.status === 'active').length,
    expiring: expiringCount,
    expired:  contracts.filter((c) => c.status === 'expired').length,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Contracts</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">{contracts.length} service contracts · track renewals and expirations</p>
        </div>
        <Button variant="primary" icon={RiAddLine} onClick={() => setModal('add')}>New Contract</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total',    value: stats.total,    color: 'bg-navy-50 text-navy-700',       icon: RiFileTextLine },
          { label: 'Active',   value: stats.active,   color: 'bg-success-50 text-success-700', icon: RiCheckLine    },
          { label: 'Expiring', value: stats.expiring, color: 'bg-warning-50 text-warning-700', icon: RiTimeLine     },
          { label: 'Expired',  value: stats.expired,  color: 'bg-danger-50 text-danger-600',   icon: RiAlertLine    },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4" style={{ boxShadow: '0 1px 8px rgb(0 0 0/0.06)' }}>
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', s.color)}><s.icon className="w-5 h-5" /></div>
            <div><p className="text-2xl font-bold text-navy-900 leading-none">{s.value}</p><p className="text-[12px] text-slate-400 mt-0.5">{s.label}</p></div>
          </motion.div>
        ))}
      </div>

      {expiringCount > 0 && (
        <div className="flex items-center gap-3 bg-warning-50 border border-warning-200 rounded-2xl px-5 py-4">
          <RiAlertLine className="w-5 h-5 text-warning-600 flex-shrink-0" />
          <p className="text-[13px] font-semibold text-warning-800 flex-1">
            {expiringCount} contract{expiringCount > 1 ? 's' : ''} expiring soon — review and renew before service lapses.
          </p>
          <button onClick={() => setFilter('expiring')} className="text-[12px] font-bold text-warning-700 hover:underline">View →</button>
        </div>
      )}

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

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <RiFileTextLine className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-400">No contracts found</p>
          <button onClick={() => setModal('add')} className="mt-3 text-accent-600 text-[13px] font-semibold hover:underline">+ Add first contract</button>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ delay: i * 0.04 }}>
                <ContractCard contract={c} onEdit={() => setModal(c)} onDelete={() => setDelTarget(c)} />
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
    </motion.div>
  );
}

function ContractCard({ contract: c, onEdit, onDelete }) {
  const cfg  = STATUS_CFG[c.status] ?? STATUS_CFG.active;
  const days = c.endDate ? daysUntil(c.endDate) : null;
  return (
    <div className={cn('bg-white rounded-2xl border-l-4 border border-slate-100 group hover:shadow-md transition-all duration-200', cfg.border)}
      style={{ boxShadow: '0 1px 8px rgb(0 0 0/0.06)' }}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="text-[15px] font-bold text-slate-900">{c.title}</h3>
            <p className="text-[12px] text-slate-500 mt-0.5">{c.companyName}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant={cfg.variant} dot>{cfg.label}</Badge>
            {c.autoRenew && <Badge variant="default"><RiRefreshLine className="w-3 h-3" />Auto</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[12px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <RiCalendarLine className="w-3.5 h-3.5 text-slate-400" />
            {fmtDate(c.startDate)} – {fmtDate(c.endDate)}
          </span>
          <span className="font-bold text-navy-700">AED {(c.cost ?? 0).toLocaleString()} / {c.costPeriod}</span>
          {days !== null && days < 90 && (
            <span className={cn('font-bold', days < 0 ? 'text-danger-600' : days < 30 ? 'text-warning-600' : 'text-slate-500')}>
              {days < 0 ? `Expired ${Math.abs(days)} days ago` : `${days} days remaining`}
            </span>
          )}
        </div>
        <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-slate-50 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit}   className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-accent-600 hover:bg-accent-50 transition-all"><RiEditLine className="w-3.5 h-3.5" />Edit</button>
          <button onClick={onDelete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-danger-500 hover:bg-danger-50 transition-all"><RiDeleteBinLine className="w-3.5 h-3.5" />Delete</button>
          <Link to={`/contracts/${c.id}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-slate-500 hover:bg-slate-100 transition-all">Details<RiArrowRightLine className="w-3.5 h-3.5" /></Link>
        </div>
      </div>
    </div>
  );
}

function ContractModal({ open, onClose, contract: c, companies, onSave }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  useEffect(() => {
    if (!open) return;
    reset(c ? {
      title: c.title, companyId: c.companyId ?? '', category: c.category ?? '',
      description: c.description ?? '', startDate: c.startDate, endDate: c.endDate,
      cost: c.cost, costPeriod: c.costPeriod, renewalReminder: c.renewalReminder ?? 30,
      autoRenew: c.autoRenew ? 'true' : 'false', status: c.status, notes: c.notes ?? '',
    } : { costPeriod: 'annual', renewalReminder: 30, status: 'active', autoRenew: 'false' });
  }, [open, c]);

  const onSubmit = (d) => {
    const comp = companies.find((co) => co.id === d.companyId);
    onSave({ ...d, cost: parseFloat(d.cost) || 0, renewalReminder: parseInt(d.renewalReminder) || 30,
      autoRenew: d.autoRenew === 'true', companyName: comp?.name ?? c?.companyName ?? '', category: comp?.category ?? d.category ?? '' });
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title={c ? 'Edit Contract' : 'Add New Contract'} subtitle="Service contract details and renewal settings">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Field label="Contract Title" required error={errors.title?.message}>
          <Input {...register('title', { required: 'Required' })} placeholder="e.g. Annual AC Maintenance Contract" />
        </Field>
        <FormGrid>
          <Field label="Service Company" required error={errors.companyId?.message}>
            <Select {...register('companyId', { required: 'Required' })} placeholder="Select company"
              options={companies.map((co) => ({ value: co.id, label: co.name }))} />
          </Field>
          <Field label="Status">
            <Select {...register('status')} options={STATUS_OPTS.map((s) => ({ value: s, label: s.charAt(0).toUpperCase()+s.slice(1) }))} />
          </Field>
        </FormGrid>
        <FormSection title="Duration & Cost">
          <FormGrid>
            <Field label="Start Date" required error={errors.startDate?.message}>
              <Input {...register('startDate', { required: 'Required' })} type="date" />
            </Field>
            <Field label="End Date" required error={errors.endDate?.message}>
              <Input {...register('endDate', { required: 'Required' })} type="date" />
            </Field>
            <Field label="Contract Value (AED)" required error={errors.cost?.message}>
              <Input {...register('cost', { required: 'Required' })} type="number" min="0" step="0.01" placeholder="0.00" />
            </Field>
            <Field label="Billing Period">
              <Select {...register('costPeriod')} options={COST_PERIODS.map((p) => ({ value: p, label: p.charAt(0).toUpperCase()+p.slice(1) }))} />
            </Field>
          </FormGrid>
        </FormSection>
        <FormGrid>
          <Field label="Renewal Reminder (days before)" hint="Days before expiry to notify you">
            <Input {...register('renewalReminder')} type="number" min="0" placeholder="30" />
          </Field>
          <Field label="Auto Renew">
            <Select {...register('autoRenew')} options={[{ value: 'false', label: 'No — Manual renewal' }, { value: 'true', label: 'Yes — Auto renew' }]} />
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
