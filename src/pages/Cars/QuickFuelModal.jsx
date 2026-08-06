import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Plus, Fuel, Wallet } from 'lucide-react';
import { useGetQuery, usePostMutation } from '../../api/apiSlice';
import { selectCurrentPropertyId } from '../../store/slices/propertiesSlice';
import Modal  from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { cn } from '../../utils/cn';
import toast  from 'react-hot-toast';
import DatePicker from '../../components/ui/DatePicker';

const fmt = (n) => Number(n).toLocaleString('en-AE', { maximumFractionDigits: 0 });

const BLANK = {
  date:       new Date().toISOString().split('T')[0],
  totalPrice: '',
  liters:     '',
  mileage:    '',
};

export default function QuickFuelModal({ open, onClose }) {
  const propertyId = useSelector(selectCurrentPropertyId);

  const { data: cars       = [] } = useGetQuery({ path: '/cars',   params: { propertyId } }, { skip: !propertyId });
  const { data: walletData, refetch: refetchWallet } = useGetQuery({ path: '/wallet', params: { propertyId } }, { skip: !propertyId });
  const vehicleBalance = walletData?.vehicle?.balance ?? 0;

  const [addFuelMut]      = usePostMutation();
  const [deductWalletMut] = usePostMutation();

  const [carId,        setCarId]        = useState('');
  const [form,         setForm]         = useState(BLANK);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const effectiveId = carId || cars[0]?.id;
  const selectedCar = cars.find((c) => c.id === effectiveId) ?? cars[0];

  const handleClose = () => {
    onClose();
    setCarId('');
    setForm(BLANK);
    setIsSubmitting(false);
  };
  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!effectiveId)     return toast.error('No vehicle available');
    if (!form.totalPrice) return toast.error('Enter total price');
    const totalPrice = Number(form.totalPrice);
    const liters     = form.liters  ? Number(form.liters)  : undefined;
    const mileage    = form.mileage ? Number(form.mileage) : undefined;
    setIsSubmitting(true);
    try {
      const carData = await addFuelMut({ path: `/cars/${effectiveId}/fuel-logs`, body: { date: form.date, totalPrice, liters, mileage } }).unwrap();
      const sourceId = carData.data?.id ?? '';
      await deductWalletMut({ path: '/wallet/deduct', body: { propertyId, walletType: 'vehicle', amount: totalPrice, description: `Fuel${liters ? ` — ${liters}L` : ''}`, date: form.date, category: 'Fuel', carId: effectiveId, sourceId, sourceModel: 'FuelLog' } }).unwrap();
      await refetchWallet();
      toast.success(`Fuel logged for ${selectedCar?.make} ${selectedCar?.model}`);
      handleClose();
    } catch (err) {
      toast.error(err.data?.error || 'Failed to log fuel');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Log Fuel Fill-up" subtitle="Select vehicle and enter fuel details" size="md">
      {!cars.length ? (
        <div className="py-10 text-center">
          <Fuel className="w-10 h-10 mx-auto mb-3 text-slate-200" />
          <p className="text-[14px] font-semibold text-slate-500">No vehicles in your fleet</p>
          <p className="text-[12px] text-slate-400 mt-1">Add a vehicle first to log fuel.</p>
          <Link to="/cars" onClick={handleClose}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' }}>
            <Plus className="w-3.5 h-3.5" /> Go to Fleet
          </Link>
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Vehicle selector */}
        <div>
          <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Select Vehicle</label>
          <div className="grid grid-cols-1 gap-2">
            {cars.map((car) => (
              <button key={car.id} type="button" onClick={() => setCarId(car.id)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left',
                  effectiveId === car.id
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-slate-100 bg-slate-50 hover:border-slate-200',
                )}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ background: 'linear-gradient(135deg, #0b1d3a, #1e3a6e)' }}>
                  {car.images?.[0]
                    ? <img src={car.images[0]} alt="" className="w-full h-full object-cover" />
                    : <Fuel className="w-4 h-4 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-slate-800">
                    {car.make} {car.model} <span className="font-normal text-slate-400">· {car.year}</span>
                  </p>
                  <p className="text-[11px] text-slate-500">{car.plateNumber} · {car.driverName}</p>
                </div>
                {effectiveId === car.id && <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        {/* Vehicle Wallet balance */}
        <VehicleWalletPanel balance={vehicleBalance} deduction={Number(form.totalPrice) || 0} />

        {/* Fuel fields */}
        <div>
          <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-3">Fuel Details</label>
          <div className="space-y-3">

            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Date *</label>
              <DatePicker value={form.date} onChange={(v) => setField('date', v)} required className={INPUT} />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Total Price (AED) *</label>
              <input value={form.totalPrice} onChange={(e) => setField('totalPrice', e.target.value)}
                type="number" min="0" step="0.01" required placeholder="e.g. 220" className={INPUT} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">
                  Liters Filled <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input value={form.liters} onChange={(e) => setField('liters', e.target.value)}
                  type="number" min="0" step="0.01" placeholder="e.g. 65" className={INPUT} />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">
                  Odometer (km) <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input value={form.mileage} onChange={(e) => setField('mileage', e.target.value)}
                  type="number" min="0" placeholder="e.g. 45200" className={INPUT} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-1 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" icon={Plus} loading={isSubmitting}>Log Fill-up</Button>
        </div>
      </form>
      )}
    </Modal>
  );
}

const LOW_THRESHOLD = 5000;

const INPUT = 'w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] text-slate-700 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500';

function VehicleWalletPanel({ balance, deduction }) {
  const isNeg = balance < 0;
  const isLow = !isNeg && balance < LOW_THRESHOLD;
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0b1d3a 0%, #152d5e 100%)', boxShadow: '0 4px 20px rgba(11,29,58,0.25)' }}>
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-3.5 h-3.5 text-white/40" />
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Vehicle Wallet</span>
          </div>
          {isNeg ? (
            <span className="text-[10px] font-bold text-red-300 bg-red-500/20 border border-red-400/20 px-2.5 py-0.5 rounded-full">Overdraft</span>
          ) : isLow ? (
            <Link to="/wallet" className="text-[10px] font-bold text-amber-300 bg-amber-500/20 border border-amber-400/20 px-2.5 py-0.5 rounded-full hover:bg-amber-500/30 transition-colors">
              Low · Top Up
            </Link>
          ) : null}
        </div>
        <p className={cn('text-[32px] font-black leading-none tracking-tight', isNeg ? 'text-red-300' : 'text-white')}>
          {isNeg ? `− AED ${fmt(Math.abs(balance))}` : `AED ${fmt(balance)}`}
        </p>
        <p className="text-[11px] text-white/35 mt-1.5 font-medium">Current Balance</p>
      </div>
      {deduction > 0 && (
        <div className="px-5 py-3 border-t border-white/8 bg-black/12 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-white/45">This fill-up</span>
          <span className="text-[13px] font-bold text-red-300">− AED {fmt(deduction)}</span>
        </div>
      )}
    </div>
  );
}
