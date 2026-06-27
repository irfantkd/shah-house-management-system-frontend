import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Fuel, Plus, Trash2, Droplets, TrendingUp, MapPin } from 'lucide-react';
import { selectFuelLogsByCarId, addFuelLog, deleteFuelLog } from '../../../store/slices/carsSlice';
import { FUEL_STATIONS } from '../../../data/mockCars';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import EmptyState from '../../../components/ui/EmptyState';
import toast from 'react-hot-toast';

const BLANK = {
  date: new Date().toISOString().split('T')[0],
  liters: '', pricePerLiter: '3.12', totalPrice: '', station: '', mileage: '',
};

const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function FuelTab({ carId }) {
  const dispatch  = useDispatch();
  const logs      = useSelector(selectFuelLogsByCarId(carId));
  const [showAdd, setShowAdd] = useState(false);
  const [form,    setForm]    = useState(BLANK);

  const sorted    = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date));
  const totalL    = logs.reduce((s, f) => s + f.liters, 0);
  const totalAED  = logs.reduce((s, f) => s + f.totalPrice, 0);
  const avgFill   = logs.length ? totalAED / logs.length : 0;
  const avgPPL    = logs.length ? logs.reduce((s, f) => s + f.pricePerLiter, 0) / logs.length : 0;

  // Group by month
  const byMonth = sorted.reduce((acc, f) => {
    const key = new Date(f.date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    if (!acc[key]) acc[key] = { logs: [], totalL: 0, totalAED: 0 };
    acc[key].logs.push(f);
    acc[key].totalL   += f.liters;
    acc[key].totalAED += f.totalPrice;
    return acc;
  }, {});

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

  const handleSubmit = (ev) => {
    ev.preventDefault();
    if (!form.liters || !form.pricePerLiter) return toast.error('Enter liters and price per liter');
    const liters        = Number(form.liters);
    const pricePerLiter = Number(form.pricePerLiter);
    const totalPrice    = Number(form.totalPrice) || +(liters * pricePerLiter).toFixed(2);
    dispatch(addFuelLog({
      ...form, carId, liters, pricePerLiter, totalPrice,
      mileage: form.mileage ? Number(form.mileage) : undefined,
    }));
    toast.success('Fuel fill logged');
    setShowAdd(false);
    setForm(BLANK);
  };

  const handleDelete = (id) => { dispatch(deleteFuelLog(id)); toast.success('Fuel log removed'); };

  const calcTotal = Number(form.liters) && Number(form.pricePerLiter)
    ? (Number(form.liters) * Number(form.pricePerLiter)).toFixed(2) : null;

  return (
    <div className="space-y-5">

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Liters',    value: `${totalL.toFixed(1)} L`,          icon: Droplets,   color: '#0891b2', bg: '#ecfeff' },
          { label: 'Total Cost',      value: `AED ${totalAED.toFixed(0)}`,       icon: Fuel,       color: '#d97706', bg: '#fffbeb' },
          { label: 'Avg per Fill-up', value: `AED ${avgFill.toFixed(0)}`,        icon: TrendingUp, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Avg Price / L',   value: `AED ${avgPPL.toFixed(2)}`,         icon: MapPin,     color: '#7c3aed', bg: '#f5f3ff' },
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

      {/* Add button */}
      <div className="flex justify-end">
        <Button icon={Plus} size="sm" onClick={() => setShowAdd(true)}>Log Fuel Fill</Button>
      </div>

      {/* Fuel logs grouped by month */}
      {sorted.length === 0 ? (
        <EmptyState icon={Fuel} title="No fuel logs yet"
          description="Log your first fuel fill-up to track consumption and monthly cost."
          action={() => setShowAdd(true)} actionLabel="Log Fuel Fill" />
      ) : (
        Object.entries(byMonth).map(([month, data]) => (
          <div key={month}>
            {/* Month header */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-bold text-slate-800">{month}</p>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-[12px] text-slate-500">
                  <Droplets className="w-3.5 h-3.5 text-cyan-500" />{data.totalL.toFixed(1)} L
                </span>
                <span className="text-[12px] font-bold text-slate-800">AED {data.totalAED.toFixed(0)}</span>
              </div>
            </div>

            {/* Log entries */}
            <div className="space-y-2">
              {data.logs.map((log) => (
                <div key={log.id}
                  className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4"
                  style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <Fuel className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[15px] font-bold text-slate-800">{log.liters} L</span>
                      <span className="text-[12px] text-slate-400">@ AED {log.pricePerLiter}/L</span>
                      {log.station && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">{log.station}</span>
                      )}
                    </div>
                    {log.mileage && (
                      <p className="text-[11px] text-slate-400 mt-0.5">{log.mileage.toLocaleString()} km odometer</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[14px] font-bold text-slate-900">AED {log.totalPrice.toFixed(1)}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{fmtDate(log.date)}</p>
                  </div>
                  <button onClick={() => handleDelete(log.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Add Fuel Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Log Fuel Fill-up" subtitle="Track liters, price and total cost">
        <form onSubmit={handleSubmit} className="space-y-4">
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
                type="number" min="0" step="0.01" placeholder="Auto-calculated"
                className={`${INPUT} bg-slate-50`} />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Odometer (km)</label>
              <input value={form.mileage} onChange={(e) => setField('mileage', e.target.value)}
                type="number" min="0" placeholder="e.g. 45200" className={INPUT} />
            </div>
          </div>

          {/* Live calculation preview */}
          {calcTotal && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-100">
              <Fuel className="w-4 h-4 text-amber-600 shrink-0" />
              <div className="flex items-baseline gap-2">
                <p className="text-[13px] text-amber-800 font-semibold">Calculated Total:</p>
                <p className="text-[18px] font-bold text-amber-700">AED {calcTotal}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-1">
            <Button variant="outline" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" icon={Plus}>Log Fill-up</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

const INPUT = 'w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] text-slate-700 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500';
