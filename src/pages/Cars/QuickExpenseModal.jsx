import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Plus, Wrench } from 'lucide-react';
import { selectCars, addCarExpense } from '../../store/slices/carsSlice';
import { CAR_EXPENSE_TYPES } from '../../data/mockCars';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';

const TYPE_OPTS = Object.entries(CAR_EXPENSE_TYPES).map(([k, v]) => ({ value: k, label: v.label }));
const BLANK = { type: 'service', description: '', amount: '', vendor: '', date: new Date().toISOString().split('T')[0], mileage: '', notes: '' };

export default function QuickExpenseModal({ open, onClose }) {
  const dispatch = useDispatch();
  const cars     = useSelector(selectCars);
  const [carId,  setCarId]  = useState('');
  const [form,   setForm]   = useState(BLANK);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const selectedCar = cars.find((c) => c.id === carId) ?? cars[0];
  const effectiveId = carId || cars[0]?.id;

  const handleClose = () => { onClose(); setCarId(''); setForm(BLANK); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!effectiveId)               return toast.error('No vehicle available');
    if (!form.description || !form.amount || !form.date) return toast.error('Fill required fields');
    dispatch(addCarExpense({ ...form, carId: effectiveId, amount: Number(form.amount), mileage: form.mileage ? Number(form.mileage) : undefined }));
    toast.success(`Expense added to ${selectedCar?.make} ${selectedCar?.model}`);
    handleClose();
  };

  if (!cars.length) return null;

  const cfg = CAR_EXPENSE_TYPES[form.type] ?? CAR_EXPENSE_TYPES.other;

  return (
    <Modal open={open} onClose={handleClose} title="Log Expense" subtitle="Select vehicle and enter expense details" size="md">
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Vehicle selector */}
        <div>
          <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Select Vehicle</label>
          <div className="grid grid-cols-1 gap-2">
            {cars.map((car) => (
              <button key={car.id} type="button" onClick={() => setCarId(car.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                  effectiveId === car.id
                    ? 'border-accent-500 bg-accent-50'
                    : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                }`}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ background: `linear-gradient(135deg, #0b1d3a, #1e3a6e)` }}>
                  {car.images?.[0]
                    ? <img src={car.images[0]} alt="" className="w-full h-full object-cover" />
                    : <Wrench className="w-4 h-4 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-slate-800">{car.make} {car.model} <span className="font-normal text-slate-400">· {car.year}</span></p>
                  <p className="text-[11px] text-slate-500">{car.plateNumber} · {car.driverName}</p>
                </div>
                {effectiveId === car.id && <div className="w-2 h-2 rounded-full bg-accent-500 shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        {/* Expense fields */}
        <div>
          <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-3">Expense Details</label>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Expense Type *</label>
              <select value={form.type} onChange={(e) => set('type', e.target.value)} className={INPUT}>
                {TYPE_OPTS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {/* Type preview chip */}
            <div className="col-span-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold" style={{ background: cfg.bg, color: cfg.color }}>
                <Wrench className="w-3.5 h-3.5" /> {cfg.label}
              </span>
            </div>

            <div className="col-span-2">
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Description *</label>
              <input value={form.description} onChange={(e) => set('description', e.target.value)} required
                placeholder="e.g. Full Annual Service" className={INPUT} />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Amount (AED) *</label>
              <input value={form.amount} onChange={(e) => set('amount', e.target.value)} type="number" min="0" required placeholder="0.00" className={INPUT} />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Date *</label>
              <input value={form.date} onChange={(e) => set('date', e.target.value)} type="date" required className={INPUT} />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Vendor / Garage</label>
              <input value={form.vendor} onChange={(e) => set('vendor', e.target.value)} placeholder="e.g. Al Futtaim Toyota" className={INPUT} />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Odometer (km)</label>
              <input value={form.mileage} onChange={(e) => set('mileage', e.target.value)} type="number" min="0" placeholder="45000" className={INPUT} />
            </div>
            <div className="col-span-2">
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Notes</label>
              <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2}
                placeholder="Additional details…" className={`${INPUT} h-auto py-2.5 resize-none`} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-1 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={handleClose}>Cancel</Button>
          <Button type="submit" icon={Plus}>Add Expense</Button>
        </div>
      </form>
    </Modal>
  );
}

const INPUT = 'w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] text-slate-700 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500';
