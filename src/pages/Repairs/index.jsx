import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  RiAddLine, RiEditLine, RiDeleteBinLine, RiAlertLine, RiToolsLine,
  RiArrowDownSLine, RiArrowUpSLine, RiLoader4Line,
} from 'react-icons/ri';
import { selectRepairs, addRepair, updateRepair, deleteRepair, updateRepairStatus } from '../../store/slices/repairsSlice';
import { selectCompanies } from '../../store/slices/companiesSlice';
import { selectAreas } from '../../store/slices/areasSlice';
import { selectAssets } from '../../store/slices/assetsSlice';
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

function fmtDate(s) { return s ? new Date(s+'T00:00:00').toLocaleDateString('en-AE',{day:'numeric',month:'short',year:'numeric'}) : 'â€”'; }

export default function RepairsPage() {
  const dispatch   = useDispatch();
  const repairs    = useSelector(selectRepairs);
  const companies  = useSelector(selectCompanies);
  const areas      = useSelector(selectAreas);
  const assets     = useSelector(selectAssets);
  const [tab,      setTab]       = useState('all');
  const [pri,      setPri]       = useState('all');
  const [modal,    setModal]     = useState(null);
  const [delTarget,setDelTarget] = useState(null);
  const [expanded, setExpanded]  = useState(null);

  const criticalOpen = repairs.filter((r) => r.priority === 'critical' && r.status !== 'completed').length;
  const filtered = repairs.filter((r) => (tab === 'all' || r.status === tab) && (pri === 'all' || r.priority === pri));

  const stats = {
    total:     repairs.length,
    reported:  repairs.filter((r) => r.status === 'reported').length,
    inProgress:repairs.filter((r) => r.status === 'in-progress').length,
    awaiting:  repairs.filter((r) => r.status === 'awaiting-parts').length,
    completed: repairs.filter((r) => r.status === 'completed').length,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Repairs</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">Log and track all repair issues across the villa</p>
        </div>
        <Button variant="primary" icon={RiAddLine} onClick={() => setModal('add')}>Report Issue</Button>
      </div>

      {/* Critical alert */}
      {criticalOpen > 0 && (
        <div className="flex items-center gap-3 bg-danger-50 border border-danger-200 rounded-2xl px-5 py-4">
          <RiAlertLine className="w-5 h-5 text-danger-600 shrink-0" />
          <p className="text-[13px] font-bold text-danger-800 flex-1">{criticalOpen} critical issue{criticalOpen > 1 ? 's require' : ' requires'} immediate attention.</p>
          <button onClick={() => { setPri('critical'); setTab('all'); }} className="text-[12px] font-bold text-danger-700 hover:underline">View â†’</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:'Reported',      value: stats.reported,   color:'bg-warning-50 text-warning-700' },
          { label:'In Progress',   value: stats.inProgress, color:'bg-accent-50 text-accent-700'   },
          { label:'Awaiting Parts',value: stats.awaiting,   color:'bg-purple-50 text-purple-700'   },
          { label:'Completed',     value: stats.completed,  color:'bg-success-50 text-success-700' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4" style={{ boxShadow: '0 1px 8px rgb(0 0 0/0.06)' }}>
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', s.color)}><RiToolsLine className="w-5 h-5" /></div>
            <div><p className="text-2xl font-bold text-navy-900 leading-none">{s.value}</p><p className="text-[12px] text-slate-400 mt-0.5">{s.label}</p></div>
          </motion.div>
        ))}
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[['all','All'], ['reported','Reported'], ['in-progress','In Progress'], ['awaiting-parts','Awaiting Parts'], ['completed','Completed']].map(([v, l]) => {
          const count = v === 'all' ? stats.total : repairs.filter((r) => r.status === v).length;
          return (
            <button key={v} onClick={() => setTab(v)}
              className={cn('flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-semibold whitespace-nowrap border transition-all',
                tab === v ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300')}>
              {l}
              <span className={cn('text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center', tab === v ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500')}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Priority pills */}
      <div className="flex gap-2">
        {['all', ...PRIORITIES].map((p) => (
          <button key={p} onClick={() => setPri(p)}
            className={cn('px-3 py-1.5 rounded-lg text-[11px] font-bold border capitalize transition-all',
              pri === p ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300')}>
            {p === 'all' ? 'All Priority' : p}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <RiToolsLine className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-400">No repairs in this filter</p>
          <button onClick={() => setModal('add')} className="mt-3 text-accent-600 text-[13px] font-semibold hover:underline">+ Report first issue</button>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((r, i) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ delay: i * 0.04 }}>
                <RepairCard repair={r} expanded={expanded === r.id}
                  onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
                  onEdit={() => setModal(r)} onDelete={() => setDelTarget(r)}
                  onStatusChange={(s) => { dispatch(updateRepairStatus({ id: r.id, status: s })); toast.success('Status updated!'); }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <RepairModal open={modal !== null} repair={modal !== 'add' ? modal : null} companies={companies} areas={areas} assets={assets}
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

function RepairCard({ repair: r, expanded, onToggle, onEdit, onDelete, onStatusChange }) {
  const sc = REPAIR_STATUS_CFG[r.status] ?? REPAIR_STATUS_CFG.reported;
  const borderColor = { critical:'border-l-danger-500', high:'border-l-warning-500', medium:'border-l-accent-400', low:'border-l-slate-300' }[r.priority] ?? 'border-l-slate-300';
  const steps = ['reported','in-progress','awaiting-parts','completed'];

  return (
    <div className={cn('bg-white rounded-2xl border-l-4 border border-slate-100', borderColor)} style={{ boxShadow: '0 1px 8px rgb(0 0 0/0.06)' }}>
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h3 className="text-[14px] font-bold text-slate-900">{r.title}</h3>
              <Badge variant={r.priority === 'critical' ? 'danger' : r.priority === 'high' ? 'warning' : 'default'} size="sm">{r.priority}</Badge>
            </div>
            <p className="text-[12px] text-slate-500">{r.assetName || 'â€”'} Â· {r.companyName || 'Unassigned'}</p>
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

        {/* Progress steps */}
        <div className="flex items-center gap-1 mt-3 mb-2">
          {steps.map((s, i) => (
            <div key={s} className="flex-1 flex flex-col items-center gap-1">
              <div className={cn('w-full h-1.5 rounded-full transition-all', (sc.step ?? 0) >= i ? 'bg-accent-500' : 'bg-slate-100')} />
              <span className={cn('text-[9px] font-semibold hidden sm:block', (sc.step ?? 0) >= i ? 'text-accent-600' : 'text-slate-300')}>
                {STATUS_LABELS[s]}
              </span>
            </div>
          ))}
        </div>

        {/* Expanded detail */}
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <div className="pt-4 mt-2 border-t border-slate-100 space-y-3">
                {r.description && <p className="text-[13px] text-slate-600 leading-relaxed">{r.description}</p>}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[12px]">
                  <div><span className="text-slate-400">Reported: </span><span className="font-semibold text-slate-700">{fmtDate(r.reportedDate)}</span></div>
                  {r.completedDate && <div><span className="text-slate-400">Completed: </span><span className="font-semibold text-slate-700">{fmtDate(r.completedDate)}</span></div>}
                  <div><span className="text-slate-400">Est. Cost: </span><span className="font-semibold text-slate-700">AED {(r.estimatedCost ?? 0).toLocaleString()}</span></div>
                  {r.actualCost > 0 && <div><span className="text-slate-400">Actual: </span><span className="font-semibold text-slate-700">AED {r.actualCost.toLocaleString()}</span></div>}
                </div>
                {r.notes && <p className="text-[12px] text-slate-500 bg-slate-50 rounded-xl px-4 py-3 leading-relaxed">{r.notes}</p>}
                {/* Quick status change */}
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
    } : { priority: 'medium', status: 'reported', reportedDate: new Date().toISOString().split('T')[0], areaId: '', assetId: '' });
  }, [open, repair]);

  const status     = watch('status');
  const areaId     = watch('areaId');
  const areaAssets = assets.filter((a) => !areaId || a.areaId === areaId);

  useEffect(() => { setValue('assetId', ''); }, [areaId]);

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
          <Input {...register('title', { required: 'Required' })} placeholder="e.g. Living Room AC not cooling" />
        </Field>
        <Field label="Description" hint="Describe what is wrong and when it started">
          <Textarea {...register('description')} rows={2} placeholder="What is the issue? When did it start?" />
        </Field>
        <FormGrid>
          <Field label="Area / Room" hint="Select the area first">
            <Select {...register('areaId')} placeholder="— Select area —"
              options={areas.map((a) => ({ value: a.id, label: `${a.emoji ?? ''} ${a.name}`.trim() }))} />
          </Field>
          <Field label="Asset / Equipment" hint={areaId ? `${areaAssets.length} assets in this area` : 'Select area first'}>
            <Select {...register('assetId')} placeholder={areaId ? '— Select asset —' : '— Pick area first —'}
              options={areaAssets.map((a) => ({ value: a.id, label: a.name }))} />
          </Field>
          <Field label="Assigned Company">
            <Select {...register('companyId')} placeholder="Select company" options={companies.map((c) => ({ value: c.id, label: c.name }))} />
          </Field>
          <Field label="Reported Date" required>
            <Input {...register('reportedDate', { required: 'Required' })} type="date" />
          </Field>
        </FormGrid>
        <FormSection title="Priority & Status">
          <FormGrid>
            <Field label="Priority" required>
              <Select {...register('priority', { required: 'Required' })}
                options={PRIORITIES.map((p) => ({ value: p, label: p.charAt(0).toUpperCase()+p.slice(1) }))} />
            </Field>
            <Field label="Current Status">
              <Select {...register('status')} options={STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))} />
            </Field>
            {status === 'completed' && <Field label="Completed Date"><Input {...register('completedDate')} type="date" /></Field>}
            <Field label="Estimated Cost (AED)"><Input {...register('estimatedCost')} type="number" min="0" step="0.01" placeholder="0.00" /></Field>
            {status === 'completed' && <Field label="Actual Cost (AED)"><Input {...register('actualCost')} type="number" min="0" step="0.01" placeholder="0.00" /></Field>}
          </FormGrid>
        </FormSection>
        <Field label="Notes"><Textarea {...register('notes')} rows={2} placeholder="Parts required, access notes, follow-up actionsâ€¦" /></Field>
        <FormActions onCancel={onClose} submitLabel={repair ? 'Update Repair' : 'Report Issue'} />
      </form>
    </Modal>
  );
}
