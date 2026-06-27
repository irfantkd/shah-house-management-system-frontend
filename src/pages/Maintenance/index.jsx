import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  RiAddLine, RiCalendar2Line, RiListCheck2, RiEditLine, RiDeleteBinLine,
  RiCheckLine, RiAlertLine, RiToolsLine, RiArrowLeftLine, RiArrowRightLine,
} from 'react-icons/ri';
import { selectMaintenance, addMaintenance, updateMaintenance, deleteMaintenance, markCompleted } from '../../store/slices/maintenanceSlice';
import { selectCompanies } from '../../store/slices/companiesSlice';
import { selectAreas } from '../../store/slices/areasSlice';
import { selectAssets } from '../../store/slices/assetsSlice';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Field, Input, Select, Textarea, FormGrid, FormSection, FormActions } from '../../components/ui/FormField';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { cn } from '../../utils/cn';

const TYPES       = ['inspection','cleaning','service','repair','replacement','testing'];
const RECURRENCES = ['one-time','weekly','monthly','bi-annual','annual'];
const STATUS_OPTS = ['scheduled','overdue','completed'];

function toDateStr(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function buildGrid(y, m) {
  const first = new Date(y,m,1), last = new Date(y,m+1,0);
  const off = (first.getDay()+6)%7, cells = [];
  for (let i=off;i>0;i--) cells.push({date:new Date(y,m,1-i),current:false});
  for (let d=1;d<=last.getDate();d++) cells.push({date:new Date(y,m,d),current:true});
  let p=1; while(cells.length<42) cells.push({date:new Date(y,m+1,p++),current:false});
  return cells;
}
function fmtDate(s) { return s ? new Date(s+'T00:00:00').toLocaleDateString('en-AE',{day:'numeric',month:'short',year:'numeric'}) : '—'; }

export default function MaintenancePage() {
  const dispatch  = useDispatch();
  const items     = useSelector(selectMaintenance);
  const companies = useSelector(selectCompanies);
  const areas     = useSelector(selectAreas);
  const assets    = useSelector(selectAssets);
  const [filter,   setFilter]    = useState('all');
  const [view,     setView]      = useState('list');
  const [modal,    setModal]     = useState(null);
  const [delTarget,setDelTarget] = useState(null);
  const [viewDate, setViewDate]  = useState(() => new Date(new Date().getFullYear(), new Date().getMonth()));

  const filtered = items.filter((m) => filter === 'all' || m.status === filter);
  const stats = {
    total:     items.length,
    scheduled: items.filter((m) => m.status === 'scheduled').length,
    overdue:   items.filter((m) => m.status === 'overdue').length,
    completed: items.filter((m) => m.status === 'completed').length,
  };

  const year = viewDate.getFullYear(), month = viewDate.getMonth();
  const cells = useMemo(() => buildGrid(year, month), [year, month]);
  const byDate = useMemo(() => {
    const map = {};
    items.forEach((i) => { if (!map[i.scheduledDate]) map[i.scheduledDate]=[]; map[i.scheduledDate].push(i); });
    return map;
  }, [items]);

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Maintenance Schedule</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">Track scheduled, overdue, and completed maintenance tasks</p>
        </div>
        <Button variant="primary" icon={RiAddLine} onClick={() => setModal('add')}>Schedule Task</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Tasks', value: stats.total,     color: 'bg-navy-50 text-navy-700',       icon: RiToolsLine     },
          { label: 'Scheduled',   value: stats.scheduled, color: 'bg-accent-50 text-accent-700',   icon: RiCalendar2Line },
          { label: 'Overdue',     value: stats.overdue,   color: 'bg-danger-50 text-danger-700',   icon: RiAlertLine     },
          { label: 'Completed',   value: stats.completed, color: 'bg-success-50 text-success-700', icon: RiCheckLine     },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4" style={{ boxShadow: '0 1px 8px rgb(0 0 0/0.06)' }}>
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', s.color)}><s.icon className="w-5 h-5" /></div>
            <div><p className="text-2xl font-bold text-navy-900 leading-none">{s.value}</p><p className="text-[12px] text-slate-400 mt-0.5">{s.label}</p></div>
          </motion.div>
        ))}
      </div>

      {stats.overdue > 0 && (
        <div className="flex items-center gap-3 bg-danger-50 border border-danger-200 rounded-2xl px-5 py-4">
          <RiAlertLine className="w-5 h-5 text-danger-600 shrink-0" />
          <p className="text-[13px] font-semibold text-danger-800 flex-1">{stats.overdue} task{stats.overdue > 1 ? 's are' : ' is'} overdue — schedule service as soon as possible.</p>
          <button onClick={() => setFilter('overdue')} className="text-[12px] font-bold text-danger-700 hover:underline">View →</button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[['all','All'], ['scheduled','Scheduled'], ['overdue','Overdue'], ['completed','Completed']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={cn('flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-semibold whitespace-nowrap border transition-all',
                filter === v ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300')}>
              {l}
              <span className={cn('text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center', filter === v ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500')}>
                {v === 'all' ? stats.total : (stats[v] ?? 0)}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shrink-0">
          {[['calendar', RiCalendar2Line], ['list', RiListCheck2]].map(([v, Icon]) => (
            <button key={v} onClick={() => setView(v)}
              className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-all', view === v ? 'bg-navy-900 text-white' : 'text-slate-400 hover:text-slate-600')}>
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Calendar view */}
      {view === 'calendar' ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-5" style={{ boxShadow: '0 1px 8px rgb(0 0 0/0.06)' }}>
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => setViewDate(new Date(year, month-1))} className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-navy-50 hover:text-navy-700 transition-all"><RiArrowLeftLine className="w-4 h-4" /></button>
            <h2 className="text-[15px] font-bold text-navy-900">{viewDate.toLocaleDateString('en-AE',{month:'long',year:'numeric'})}</h2>
            <button onClick={() => setViewDate(new Date(year, month+1))} className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-navy-50 hover:text-navy-700 transition-all"><RiArrowRightLine className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-7 mb-2">
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              const ds = toDateStr(cell.date), evs = byDate[ds] ?? [];
              const isToday = ds === toDateStr(new Date());
              return (
                <div key={i} className={cn('min-h-[60px] rounded-xl p-1.5 transition-colors', !cell.current && 'opacity-20', isToday && 'bg-navy-900', cell.current && !isToday && 'hover:bg-slate-50')}>
                  <span className={cn('block text-center text-[12px] font-semibold mb-1', isToday ? 'text-white' : 'text-slate-700')}>{cell.date.getDate()}</span>
                  {evs.slice(0,2).map((ev) => (
                    <div key={ev.id} className={cn('text-[9px] font-semibold px-1 py-0.5 rounded-md mb-0.5 truncate',
                      ev.status === 'overdue' ? 'bg-danger-100 text-danger-700' : ev.status === 'completed' ? 'bg-success-100 text-success-700' : 'bg-accent-100 text-accent-700')}>
                      {ev.title}
                    </div>
                  ))}
                  {evs.length > 2 && <div className="text-[9px] text-slate-400 pl-1">+{evs.length-2}</div>}
                </div>
              );
            })}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <RiCalendar2Line className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-400">No tasks in this filter</p>
          <button onClick={() => setModal('add')} className="mt-3 text-accent-600 text-[13px] font-semibold hover:underline">+ Schedule first task</button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: '0 1px 8px rgb(0 0 0/0.06)' }}>
          {filtered.map((item, i) => (
            <MaintenanceRow key={item.id} item={item} last={i === filtered.length - 1}
              onEdit={() => setModal(item)} onDelete={() => setDelTarget(item)}
              onComplete={() => { dispatch(markCompleted(item.id)); toast.success('Marked as completed!'); }}
            />
          ))}
        </div>
      )}

      <MaintenanceModal open={modal !== null} item={modal !== 'add' ? modal : null} companies={companies} areas={areas} assets={assets}
        onClose={() => setModal(null)}
        onSave={(data) => {
          if (modal !== 'add') { dispatch(updateMaintenance({ ...modal, ...data })); toast.success('Task updated!'); }
          else { dispatch(addMaintenance(data)); toast.success('Task scheduled!'); }
          setModal(null);
        }}
      />
      <ConfirmDialog open={!!delTarget} onClose={() => setDelTarget(null)}
        onConfirm={() => { dispatch(deleteMaintenance(delTarget.id)); toast.success('Task deleted'); setDelTarget(null); }}
        title="Delete Task" message={`Delete "${delTarget?.title}"?`}
      />
    </motion.div>
  );
}

function MaintenanceRow({ item, last, onEdit, onDelete, onComplete }) {
  const statusColor = item.status === 'overdue' ? 'text-danger-600 bg-danger-50' : item.status === 'completed' ? 'text-success-600 bg-success-50' : 'text-accent-600 bg-accent-50';
  return (
    <div className={cn('flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group', !last && 'border-b border-slate-50', item.status === 'overdue' && 'bg-danger-50/40')}>
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', statusColor)}>
        <RiToolsLine className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-slate-800 truncate">{item.title}</p>
        <p className="text-[11px] text-slate-400">{item.assetName || '—'} · {item.companyName || 'Unassigned'}</p>
      </div>
      <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
        <Badge variant={item.status === 'overdue' ? 'danger' : item.status === 'completed' ? 'success' : 'primary'} dot>
          {item.status.charAt(0).toUpperCase()+item.status.slice(1)}
        </Badge>
        <span className="text-[11px] text-slate-400">{fmtDate(item.scheduledDate)}</span>
      </div>
      {item.cost > 0 && <span className="hidden lg:block text-[12px] font-semibold text-slate-500 shrink-0">AED {item.cost.toLocaleString()}</span>}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {item.status !== 'completed' && (
          <button onClick={onComplete} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-success-600 hover:bg-success-50 transition-all">
            <RiCheckLine className="w-3.5 h-3.5" />Done
          </button>
        )}
        <button onClick={onEdit}   className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-accent-600 hover:bg-accent-50 transition-all"><RiEditLine className="w-3.5 h-3.5" /></button>
        <button onClick={onDelete} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-danger-500 hover:bg-danger-50 transition-all"><RiDeleteBinLine className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

function MaintenanceModal({ open, onClose, item, companies, areas, assets, onSave }) {
  const { register, handleSubmit, reset, watch, setValue } = useForm();
  useEffect(() => {
    if (!open) return;
    reset(item ? {
      title: item.title, areaId: item.areaId ?? '', assetId: item.assetId ?? '',
      companyId: item.companyId ?? '', type: item.type ?? 'service',
      scheduledDate: item.scheduledDate, status: item.status,
      completedDate: item.completedDate ?? '', cost: item.cost ?? '',
      recurrence: item.recurrence ?? 'one-time', notes: item.notes ?? '',
    } : { status: 'scheduled', recurrence: 'one-time', type: 'service', areaId: '', assetId: '' });
  }, [open, item]);

  const status   = watch('status');
  const areaId   = watch('areaId');
  const areaAssets = assets.filter((a) => !areaId || a.areaId === areaId);

  useEffect(() => { setValue('assetId', ''); }, [areaId]);

  const onSubmit = (d) => {
    const comp  = companies.find((c) => c.id === d.companyId);
    const area  = areas.find((a) => a.id === d.areaId);
    const asset = assets.find((a) => a.id === d.assetId);
    onSave({
      ...d,
      cost: parseFloat(d.cost) || 0,
      companyName: comp?.name  ?? item?.companyName ?? '',
      areaName:    area?.name  ?? item?.areaName    ?? '',
      assetName:   asset?.name ?? item?.assetName   ?? '',
    });
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title={item ? 'Edit Maintenance Task' : 'Schedule New Maintenance'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Field label="Task Title" required>
          <Input {...register('title', { required: 'Required' })} placeholder="e.g. AC Full Service & Filter Replacement" />
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
        </FormGrid>
        <FormGrid>
          <Field label="Service Company">
            <Select {...register('companyId')} placeholder="Select company"
              options={companies.map((c) => ({ value: c.id, label: c.name }))} />
          </Field>
          <Field label="Maintenance Type">
            <Select {...register('type')} options={TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase()+t.slice(1) }))} />
          </Field>
        </FormGrid>
        <FormSection title="Schedule & Status">
          <FormGrid>
            <Field label="Scheduled Date" required>
              <Input {...register('scheduledDate', { required: 'Required' })} type="date" />
            </Field>
            <Field label="Status">
              <Select {...register('status')} options={STATUS_OPTS.map((s) => ({ value: s, label: s.charAt(0).toUpperCase()+s.slice(1) }))} />
            </Field>
            {status === 'completed' && (
              <Field label="Completion Date">
                <Input {...register('completedDate')} type="date" />
              </Field>
            )}
            <Field label="Recurrence">
              <Select {...register('recurrence')} options={RECURRENCES.map((r) => ({ value: r, label: r.charAt(0).toUpperCase()+r.slice(1) }))} />
            </Field>
            <Field label="Cost (AED)">
              <Input {...register('cost')} type="number" min="0" step="0.01" placeholder="0.00" />
            </Field>
          </FormGrid>
        </FormSection>
        <Field label="Notes">
          <Textarea {...register('notes')} rows={2} placeholder="Special instructions, parts needed, access requirements…" />
        </Field>
        <FormActions onCancel={onClose} submitLabel={item ? 'Update Task' : 'Schedule Task'} />
      </form>
    </Modal>
  );
}
