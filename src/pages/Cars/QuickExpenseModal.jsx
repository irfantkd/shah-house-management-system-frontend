import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { Plus, Wrench, Wallet, Car, Home } from 'lucide-react';
import { selectCars, addCarExpense } from '../../store/slices/carsSlice';
import { selectVehicleWallet, selectHomeWallet, deductFromWallet, LOW_BALANCE_THRESHOLD } from '../../store/slices/walletSlice';
import { CAR_EXPENSE_TYPES } from '../../data/mockCars';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

const fmt = (n) => Number(n).toLocaleString('en-AE', { maximumFractionDigits: 0 });

const TYPE_OPTS = Object.entries(CAR_EXPENSE_TYPES).map(([k, v]) => ({ value: k, label: v.label }));
const BLANK = { type: 'service', description: '', amount: '', vendor: '', date: new Date().toISOString().split('T')[0], mileage: '', notes: '' };

export default function QuickExpenseModal({ open, onClose }) {
  const dispatch      = useDispatch();
  const cars          = useSelector(selectCars);
  const vehicleWallet = useSelector(selectVehicleWallet);
  const homeWallet    = useSelector(selectHomeWallet);
  const [carId,   setCarId]   = useState('');
  const [wallet,  setWallet]  = useState('vehicle');
  const [form,    setForm]    = useState(BLANK);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const selectedCar = cars.find((c) => c.id === carId) ?? cars[0];
  const effectiveId = carId || cars[0]?.id;

  const handleClose = () => { onClose(); setCarId(''); setWallet('vehicle'); setForm(BLANK); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!effectiveId)               return toast.error('No vehicle available');
    if (!form.description || !form.amount || !form.date) return toast.error('Fill required fields');
    const amt       = Number(form.amount);
    const selWallet = wallet === 'vehicle' ? vehicleWallet : homeWallet;
    const expType   = CAR_EXPENSE_TYPES[form.type]?.label ?? form.type;
    dispatch(addCarExpense({ ...form, carId: effectiveId, amount: amt, mileage: form.mileage ? Number(form.mileage) : undefined }));
    dispatch(deductFromWallet({ wallet, amount: amt, description: form.description, date: form.date, category: expType }));
    const afterBal    = selWallet.balance - amt;
    const walletLabel = wallet === 'vehicle' ? 'Vehicle' : 'Home';
    if (afterBal < LOW_BALANCE_THRESHOLD)
      toast(`${walletLabel} wallet now AED ${fmt(Math.max(0, afterBal))} — top up soon`, { icon: '⚠️' });
    else toast.success(`Expense added to ${selectedCar?.make} ${selectedCar?.model} · deducted from ${walletLabel} Wallet`);
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

        {/* Wallet selector */}
        <div>
          <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Deduct from Wallet</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { k: 'vehicle', label: 'Vehicle Wallet', icon: Car,  bal: vehicleWallet.balance, color: '#0b1d3a', bg: '#eef2fb' },
              { k: 'home',    label: 'Home Wallet',    icon: Home, bal: homeWallet.balance,    color: '#16a34a', bg: '#f0fdf4' },
            ].map(({ k, label, icon: Icon, bal, color, bg }) => (
              <button key={k} type="button" onClick={() => setWallet(k)}
                className="flex flex-col gap-1.5 p-3 rounded-xl border-2 text-left transition-all"
                style={wallet === k
                  ? { borderColor: color, background: bg }
                  : { borderColor: '#e2e8f0', background: '#f8fafc' }}>
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" style={{ color: wallet === k ? color : '#94a3b8' }} />
                  <span className="text-[11px] font-bold truncate" style={{ color: wallet === k ? color : '#64748b' }}>{label}</span>
                  {wallet === k && (
                    <span className="ml-auto shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-black"
                      style={{ background: color }}>✓</span>
                  )}
                </div>
                <p className="text-[15px] font-bold" style={{ color: wallet === k ? color : '#94a3b8' }}>
                  AED {fmt(bal)}
                </p>
              </button>
            ))}
          </div>
        </div>
        {/* Selected wallet balance + after preview */}
        {(() => {
          const selW  = wallet === 'vehicle' ? vehicleWallet : homeWallet;
          const wLbl  = wallet === 'vehicle' ? 'Vehicle Wallet' : 'Home Wallet';
          const bal   = selW.balance;
          const cost  = Number(form.amount) || 0;
          const after = bal - cost;
          const low   = bal < LOW_BALANCE_THRESHOLD;
          const empty = bal <= 0;
          return (
            <div className={cn('flex items-center gap-3 p-3 rounded-xl border',
              empty ? 'bg-red-50 border-red-200' : low ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100')}>
              <Wallet className={cn('w-4 h-4 shrink-0', empty ? 'text-red-500' : low ? 'text-amber-600' : 'text-slate-400')} />
              <div className="flex-1">
                <p className="text-[11px] text-slate-400">{wLbl} — deducted on submit</p>
                <p className={cn('text-[15px] font-bold', empty ? 'text-red-600' : low ? 'text-amber-700' : 'text-slate-800')}>
                  AED {fmt(bal)}
                </p>
              </div>
              {cost > 0 && (
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-slate-400">After</p>
                  <p className={cn('text-[13px] font-bold', after < 0 ? 'text-red-600' : after < LOW_BALANCE_THRESHOLD ? 'text-amber-600' : 'text-emerald-600')}>
                    AED {fmt(Math.max(0, after))}
                  </p>
                </div>
              )}
              {(empty || low) && (
                <Link to="/wallet" className={cn('shrink-0 text-[11px] font-bold px-2.5 py-1.5 rounded-lg', empty ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>
                  {empty ? 'Deposit' : 'Top Up'}
                </Link>
              )}
            </div>
          );
        })()}

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
