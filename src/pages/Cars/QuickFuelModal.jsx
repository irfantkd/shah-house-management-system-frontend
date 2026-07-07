import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { Plus, Fuel, Droplets, Wallet } from 'lucide-react';
import { selectCars, addFuelLog } from '../../store/slices/carsSlice';
import { selectVehicleWallet, deductFromWallet, LOW_BALANCE_THRESHOLD } from '../../store/slices/walletSlice';
import { FUEL_STATIONS } from '../../data/mockCars';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

const fmt = (n) => Number(n).toLocaleString('en-AE', { maximumFractionDigits: 0 });

const BLANK = { date: new Date().toISOString().split('T')[0], liters: '', pricePerLiter: '3.12', totalPrice: '', station: '', mileage: '' };

export default function QuickFuelModal({ open, onClose }) {
  const dispatch      = useDispatch();
  const cars          = useSelector(selectCars);
  const vehicleWallet = useSelector(selectVehicleWallet);
  const [carId,  setCarId]  = useState('');
  const [form,   setForm]   = useState(BLANK);

  const effectiveId = carId || cars[0]?.id;
  const selectedCar = cars.find((c) => c.id === effectiveId) ?? cars[0];

  const handleClose = () => { onClose(); setCarId(''); setForm(BLANK); };

  const setField = (k, v) => {
    setForm((prev) => {
      const next = { ...prev, [k]: v };
      if (k === 'liters' || k === 'pricePerLiter') {
        const l = parseFloat(k === 'liters' ? v : prev.liters) || 0;
        const p = parseFloat(k === 'pricePerLiter' ? v : prev.pricePerLiter) || 0;
        if (l && p) next.totalPrice = (l * p).toFixed(2);
      }
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!effectiveId)                          return toast.error('No vehicle available');
    if (!form.liters || !form.pricePerLiter)  return toast.error('Enter liters and price per liter');
    const liters        = Number(form.liters);
    const pricePerLiter = Number(form.pricePerLiter);
    const totalPrice    = Number(form.totalPrice) || +(liters * pricePerLiter).toFixed(2);
    dispatch(addFuelLog({ ...form, carId: effectiveId, liters, pricePerLiter, totalPrice, mileage: form.mileage ? Number(form.mileage) : undefined }));
    dispatch(deductFromWallet({ wallet: 'vehicle', amount: totalPrice, description: `Fuel — ${liters}L${form.station ? ' @ ' + form.station : ''}`, date: form.date }));
    const afterBal = vehicleWallet.balance - totalPrice;
    if (afterBal < LOW_BALANCE_THRESHOLD)
      toast(`Vehicle wallet now AED ${fmt(Math.max(0, afterBal))} — top up soon`, { icon: '⚠️' });
    else toast.success(`Fuel logged for ${selectedCar?.make} ${selectedCar?.model}`);
    handleClose();
  };

  if (!cars.length) return null;

  const calcTotal = Number(form.liters) && Number(form.pricePerLiter)
    ? (Number(form.liters) * Number(form.pricePerLiter)).toFixed(2)
    : null;

  return (
    <Modal open={open} onClose={handleClose} title="Log Fuel Fill-up" subtitle="Select vehicle and enter fuel details" size="md">
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Vehicle selector */}
        <div>
          <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Select Vehicle</label>
          <div className="grid grid-cols-1 gap-2">
            {cars.map((car) => (
              <button key={car.id} type="button" onClick={() => setCarId(car.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                  effectiveId === car.id
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                }`}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #0b1d3a, #1e3a6e)' }}>
                  {car.images?.[0]
                    ? <img src={car.images[0]} alt="" className="w-full h-full object-cover" />
                    : <Fuel className="w-4 h-4 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-slate-800">{car.make} {car.model} <span className="font-normal text-slate-400">· {car.year}</span></p>
                  <p className="text-[11px] text-slate-500">{car.plateNumber} · {car.driverName}</p>
                </div>
                {effectiveId === car.id && <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        {/* Vehicle Wallet balance */}
        {(() => {
          const bal   = vehicleWallet.balance;
          const cost  = calcTotal ? Number(calcTotal) : 0;
          const after = bal - cost;
          const low   = bal < LOW_BALANCE_THRESHOLD;
          const empty = bal <= 0;
          return (
            <div className={cn('flex items-center gap-3 p-3 rounded-xl border',
              empty ? 'bg-red-50 border-red-200' : low ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100')}>
              <Wallet className={cn('w-4 h-4 shrink-0', empty ? 'text-red-500' : low ? 'text-amber-600' : 'text-slate-400')} />
              <div className="flex-1">
                <p className="text-[11px] text-slate-400">Vehicle Wallet — auto-deducted on submit</p>
                <p className={cn('text-[15px] font-bold', empty ? 'text-red-600' : low ? 'text-amber-700' : 'text-slate-800')}>AED {fmt(bal)}</p>
              </div>
              {cost > 0 && <div className="text-right shrink-0">
                <p className="text-[10px] text-slate-400">After</p>
                <p className={cn('text-[13px] font-bold', after < 0 ? 'text-red-600' : after < LOW_BALANCE_THRESHOLD ? 'text-amber-600' : 'text-emerald-600')}>AED {fmt(Math.max(0, after))}</p>
              </div>}
              {(empty || low) && <Link to="/wallet" className={cn('shrink-0 text-[11px] font-bold px-2.5 py-1.5 rounded-lg', empty ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>{empty ? 'Deposit' : 'Top Up'}</Link>}
            </div>
          );
        })()}

        {/* Fuel fields */}
        <div>
          <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-3">Fuel Details</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Date *</label>
              <input value={form.date} onChange={(e) => setField('date', e.target.value)} type="date" required className={INPUT} />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Station</label>
              <select value={form.station} onChange={(e) => setField('station', e.target.value)} className={INPUT}>
                <option value="">Select station…</option>
                {FUEL_STATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Liters Filled *</label>
              <input value={form.liters} onChange={(e) => setField('liters', e.target.value)}
                type="number" min="0" step="0.01" required placeholder="65.5" className={INPUT} />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Price per Liter (AED) *</label>
              <input value={form.pricePerLiter} onChange={(e) => setField('pricePerLiter', e.target.value)}
                type="number" min="0" step="0.001" required placeholder="3.12" className={INPUT} />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Total Price (AED)</label>
              <input value={form.totalPrice} onChange={(e) => setField('totalPrice', e.target.value)}
                type="number" min="0" step="0.01" placeholder="Auto-calculated" className={`${INPUT} bg-slate-50`} />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Odometer (km)</label>
              <input value={form.mileage} onChange={(e) => setField('mileage', e.target.value)}
                type="number" min="0" placeholder="45200" className={INPUT} />
            </div>
          </div>
        </div>

        {/* Live total preview */}
        {calcTotal && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-100">
            <Fuel className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <p className="text-[11px] text-amber-600 font-medium">Calculated Total</p>
              <p className="text-[20px] font-bold text-amber-700 leading-tight">AED {calcTotal}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[11px] text-amber-600">{form.liters} L</p>
              <p className="text-[11px] text-amber-600">@ AED {form.pricePerLiter}/L</p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2.5 pt-1 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={handleClose}>Cancel</Button>
          <Button type="submit" icon={Plus}>Log Fill-up</Button>
        </div>
      </form>
    </Modal>
  );
}

const INPUT = 'w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] text-slate-700 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500';
