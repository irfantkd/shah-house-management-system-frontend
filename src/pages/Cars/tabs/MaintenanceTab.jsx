import { useState, useMemo } from 'react';
import { Wrench, Plus, Trash2, AlertTriangle, Clock, CheckCircle, DollarSign, Calendar, Gauge, Edit2 } from 'lucide-react';
import { useGetQuery, usePostMutation, usePutMutation, useDeleteMutation } from '../../../api/apiSlice';
import Button     from '../../../components/ui/Button';
import Modal      from '../../../components/ui/Modal';
import EmptyState from '../../../components/ui/EmptyState';
import { cn }     from '../../../utils/cn';
import toast      from 'react-hot-toast';

const SERVICE_TYPES = [
  'Oil Change', 'Tyre Rotation', 'Tyre Replacement', 'Brake Service',
  'Battery', 'Air Filter', 'AC Service', 'Full Service', 'Detailing',
  'Transmission', 'Wheel Alignment', 'Other',
];

const fmt     = (n) => Number(n).toLocaleString('en-AE', { maximumFractionDigits: 0 });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const daysUntil = (d) => d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null;

const TYPE_COLORS = {
  'Oil Change':        { bg: '#fffbeb', color: '#d97706' },
  'Tyre Rotation':     { bg: '#f0fdf4', color: '#16a34a' },
  'Tyre Replacement':  { bg: '#f0fdf4', color: '#15803d' },
  'Brake Service':     { bg: '#fff1f2', color: '#e11d48' },
  'Battery':           { bg: '#fefce8', color: '#ca8a04' },
  'Air Filter':        { bg: '#f0f9ff', color: '#0284c7' },
  'AC Service':        { bg: '#ecfeff', color: '#0891b2' },
  'Full Service':      { bg: '#f5f3ff', color: '#7c3aed' },
  'Detailing':         { bg: '#fff7ed', color: '#ea580c' },
  'Transmission':      { bg: '#fdf4ff', color: '#a21caf' },
  'Wheel Alignment':   { bg: '#f0fdf4', color: '#059669' },
  'Other':             { bg: '#f8fafc', color: '#64748b' },
};

const BLANK = {
  type:           'Oil Change',
  date:           new Date().toISOString().split('T')[0],
  vendor:         '',
  cost:           '',
  mileage:        '',
  nextDueDate:    '',
  nextDueMileage: '',
  notes:          '',
};

const INPUT = 'w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] text-slate-700 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500';

export default function MaintenanceTab({ carId }) {
  const { data: records = [], refetch } = useGetQuery({ path: `/cars/${carId}/maintenance` }, { skip: !carId });

  const [addMaintenanceMut]    = usePostMutation();
  const [updateMaintenanceMut] = usePutMutation();
  const [deleteMaintenanceMut] = useDeleteMutation();

  const [showAdd,     setShowAdd]     = useState(false);
  const [editingRec,  setEditingRec]  = useState(null);
  const [form,        setForm]        = useState(BLANK);

  const sorted = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));

  const stats = useMemo(() => {
    const totalCost = records.reduce((s, r) => s + (Number(r.cost) || 0), 0);
    const dates     = records.map((r) => r.date).filter(Boolean).sort();
    const lastDate  = dates[dates.length - 1] ?? null;
    const upcoming  = records
      .filter((r) => r.nextDueDate)
      .map((r)    => ({ ...r, days: daysUntil(r.nextDueDate) }))
      .filter((r) => r.days !== null)
      .sort((a, b) => a.days - b.days);
    const nextDue = upcoming[0] ?? null;
    return { totalCost, lastDate, nextDue, count: records.length };
  }, [records]);

  const overdue  = records.filter((r) => r.nextDueDate && daysUntil(r.nextDueDate) < 0);
  const upcoming = records.filter((r) => { const d = daysUntil(r.nextDueDate); return d !== null && d >= 0 && d <= 30; });

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openAdd = () => { setEditingRec(null); setForm(BLANK); setShowAdd(true); };
  const openEdit = (rec) => {
    setEditingRec(rec);
    setForm({
      type:           rec.type           ?? 'Oil Change',
      date:           rec.date           ? rec.date.split('T')[0]           : new Date().toISOString().split('T')[0],
      vendor:         rec.vendor         ?? '',
      cost:           rec.cost           ?? '',
      mileage:        rec.mileage        ?? '',
      nextDueDate:    rec.nextDueDate    ? rec.nextDueDate.split('T')[0]    : '',
      nextDueMileage: rec.nextDueMileage ?? '',
      notes:          rec.notes          ?? '',
    });
    setShowAdd(true);
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!form.date) return toast.error('Date is required');
    const payload = {
      type:           form.type,
      date:           form.date,
      vendor:         form.vendor         || undefined,
      cost:           form.cost           ? Number(form.cost)           : 0,
      mileage:        form.mileage        ? Number(form.mileage)        : undefined,
      nextDueDate:    form.nextDueDate    || undefined,
      nextDueMileage: form.nextDueMileage ? Number(form.nextDueMileage) : undefined,
      notes:          form.notes          || undefined,
    };
    try {
      if (editingRec) {
        await updateMaintenanceMut({
          path: `/cars/${carId}/maintenance/${editingRec.id ?? editingRec._id}`,
          body: payload,
        }).unwrap();
        toast.success(`${form.type} record updated`);
      } else {
        await addMaintenanceMut({ path: `/cars/${carId}/maintenance`, body: payload }).unwrap();
        toast.success(`${form.type} logged`);
      }
      await refetch();
      setShowAdd(false);
      setEditingRec(null);
      setForm(BLANK);
    } catch (err) { toast.error(err.data?.error || 'Failed to save record'); }
  };

  const handleDelete = async (rec) => {
    try {
      await deleteMaintenanceMut({ path: `/cars/${carId}/maintenance/${rec.id ?? rec._id}` }).unwrap();
      await refetch();
      toast.success('Record removed');
    } catch { toast.error('Failed to remove record'); }
  };

  const typeColor = (t) => TYPE_COLORS[t] ?? TYPE_COLORS['Other'];

  return (
    <div className="space-y-5">

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Records', value: stats.count,                                            icon: CheckCircle, color: '#0b1d3a', bg: '#f0f5ff' },
          { label: 'Total Cost',    value: `AED ${fmt(stats.totalCost)}`,                           icon: DollarSign,  color: '#d97706', bg: '#fffbeb' },
          { label: 'Last Service',  value: stats.lastDate ? fmtDate(stats.lastDate) : '—',          icon: Calendar,    color: '#0891b2', bg: '#ecfeff' },
          { label: 'Next Due',
            value: stats.nextDue
              ? daysUntil(stats.nextDue.nextDueDate) < 0 ? 'Overdue' : `${daysUntil(stats.nextDue.nextDueDate)}d`
              : '—',
            icon:  Gauge,
            color: stats.nextDue && daysUntil(stats.nextDue.nextDueDate) < 0 ? '#e11d48' : '#16a34a',
            bg:    stats.nextDue && daysUntil(stats.nextDue.nextDueDate) < 0 ? '#fff1f2' : '#f0fdf4' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-4" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5" style={{ background: s.bg }}>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <p className="text-[17px] font-bold text-slate-900 leading-tight">{s.value}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-bold text-red-700">Overdue Service</p>
            <div className="space-y-1 mt-1">
              {overdue.map((r) => (
                <p key={r.id ?? r._id} className="text-[12px] text-red-600">
                  {r.type} — was due {fmtDate(r.nextDueDate)} ({Math.abs(daysUntil(r.nextDueDate))}d overdue)
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-bold text-amber-800">Due Soon</p>
            <div className="space-y-1 mt-1">
              {upcoming.map((r) => (
                <p key={r.id ?? r._id} className="text-[12px] text-amber-700">
                  {r.type} — due {fmtDate(r.nextDueDate)} ({daysUntil(r.nextDueDate)}d)
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add button */}
      <div className="flex justify-end">
        <Button icon={Plus} size="sm" onClick={openAdd}>Add Service Record</Button>
      </div>

      {/* Service history */}
      {sorted.length === 0 ? (
        <EmptyState icon={Wrench} title="No service records yet"
          description="Log your first service to keep your vehicle in top shape."
          action={openAdd} actionLabel="Add Service Record" />
      ) : (
        <div className="space-y-3">
          {sorted.map((r) => {
            const tc     = typeColor(r.type);
            const nextD  = daysUntil(r.nextDueDate);
            const isOver = nextD !== null && nextD < 0;
            const isSoon = nextD !== null && nextD >= 0 && nextD <= 30;
            return (
              <div key={r.id ?? r._id} className="bg-white rounded-2xl border border-slate-100 p-4" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: tc.bg }}>
                    <Wrench className="w-4 h-4" style={{ color: tc.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-bold text-slate-800">{r.type}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: tc.bg, color: tc.color }}>{r.type}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap text-[11px] text-slate-400">
                      <span>{fmtDate(r.date)}</span>
                      {r.vendor && <span>@ {r.vendor}</span>}
                      {r.mileage  && <span>{Number(r.mileage).toLocaleString()} km</span>}
                    </div>
                    {r.notes && <p className="text-[11px] text-slate-400 mt-1 italic leading-relaxed">{r.notes}</p>}
                    {r.nextDueDate && (
                      <div className={cn('mt-2 flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg w-fit',
                        isOver ? 'bg-red-50 text-red-600' : isSoon ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-500')}>
                        {isOver ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        Next due: {fmtDate(r.nextDueDate)}
                        {r.nextDueMileage && ` · ${Number(r.nextDueMileage).toLocaleString()} km`}
                        {nextD !== null && (
                          <span className={isOver ? 'text-red-500' : isSoon ? 'text-amber-600' : 'text-slate-400'}>
                            ({isOver ? `${Math.abs(nextD)}d overdue` : `${nextD}d`})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[15px] font-bold text-slate-800">AED {fmt(r.cost)}</p>
                    <div className="flex items-center gap-1 mt-1.5 justify-end">
                      <button onClick={() => openEdit(r)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-all">
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button onClick={() => handleDelete(r)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Service Modal */}
      <Modal
        open={showAdd}
        onClose={() => { setShowAdd(false); setEditingRec(null); setForm(BLANK); }}
        title={editingRec ? 'Edit Service Record' : 'Add Service Record'}
        subtitle={editingRec ? 'Update service details' : 'Log a completed service or schedule an upcoming one'}>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Service Type chips */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-600 mb-2">Service Type</label>
            <div className="flex flex-wrap gap-2">
              {SERVICE_TYPES.map((t) => {
                const tc = typeColor(t);
                return (
                  <button key={t} type="button"
                    onClick={() => setField('type', t)}
                    className={cn(
                      'text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all',
                      form.type === t ? 'border-transparent shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300',
                    )}
                    style={form.type === t ? { background: tc.bg, color: tc.color, borderColor: tc.color + '40' } : {}}>
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Date *</label>
              <input value={form.date} onChange={(e) => setField('date', e.target.value)} type="date" required className={INPUT} />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Workshop <span className="font-normal text-slate-400">(optional)</span></label>
              <input value={form.vendor} onChange={(e) => setField('vendor', e.target.value)}
                type="text" placeholder="e.g. Al Futtaim Auto" className={INPUT} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Cost (AED)</label>
              <input value={form.cost} onChange={(e) => setField('cost', e.target.value)}
                type="number" min="0" step="0.01" placeholder="0" className={INPUT} />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Odometer (km) <span className="font-normal text-slate-400">(optional)</span></label>
              <input value={form.mileage} onChange={(e) => setField('mileage', e.target.value)}
                type="number" min="0" placeholder="e.g. 45000" className={INPUT} />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Next Service Reminder (optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Next Due Date</label>
                <input value={form.nextDueDate} onChange={(e) => setField('nextDueDate', e.target.value)} type="date" className={INPUT} />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Next Due Mileage (km)</label>
                <input value={form.nextDueMileage} onChange={(e) => setField('nextDueMileage', e.target.value)}
                  type="number" min="0" placeholder="e.g. 50000" className={INPUT} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Notes <span className="font-normal text-slate-400">(optional)</span></label>
            <textarea value={form.notes} onChange={(e) => setField('notes', e.target.value)}
              rows={2} placeholder="Any notes about the service…"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[13px] text-slate-700 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 resize-none" />
          </div>

          <div className="flex justify-end gap-2.5 pt-1">
            <Button variant="outline" type="button"
              onClick={() => { setShowAdd(false); setEditingRec(null); setForm(BLANK); }}>Cancel</Button>
            <Button type="submit" icon={editingRec ? Edit2 : Plus}>
              {editingRec ? 'Save Changes' : 'Save Record'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
