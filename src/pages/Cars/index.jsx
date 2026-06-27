import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { Car, Fuel, AlertTriangle, Plus, Search, User, ChevronRight, Gauge, Camera, X, Wrench } from 'lucide-react';
import {
  selectCars, selectCarExpenses, selectFuelLogs, addCar, addCarImage,
} from '../../store/slices/carsSlice';
import { CAR_EXPENSE_TYPES, CAR_CATEGORIES } from '../../data/mockCars';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import QuickExpenseModal from './QuickExpenseModal';
import QuickFuelModal from './QuickFuelModal';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

const fade = (d = 0) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, delay: d, ease: [0.4, 0, 0.2, 1] } });
const getDays = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);

const regStatus = (expiry) => {
  const days = getDays(expiry);
  if (days < 0)   return { color: '#dc2626', bg: '#fef2f2', days };
  if (days <= 30) return { color: '#d97706', bg: '#fffbeb', days };
  return            { color: '#16a34a', bg: '#f0fdf4', days };
};

const BLANK = {
  nickname: '', make: '', model: '', year: new Date().getFullYear(), colorName: '', color: '#94a3b8',
  plateNumber: '', vin: '', category: 'SUV',
  driverName: '', driverPhone: '',
  registrationNumber: '', registrationExpiry: '', registrationFee: '',
  insuranceCompany: '', insurancePolicy: '', insuranceExpiry: '',
  odometer: '', purchaseDate: '', purchasePrice: '', notes: '',
};

export default function CarsPage() {
  const dispatch = useDispatch();
  const cars     = useSelector(selectCars);
  const allExp   = useSelector(selectCarExpenses);
  const allFuel  = useSelector(selectFuelLogs);

  const [search,      setSearch]      = useState('');
  const [filter,      setFilter]      = useState('all');
  const [showAdd,     setShowAdd]     = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [showFuel,    setShowFuel]    = useState(false);
  const [form,        setForm]        = useState(BLANK);
  const fileRefs = useRef({});

  const now  = new Date();
  const curM = now.getMonth(), curY = now.getFullYear();
  const thisMonth = (d) => { const dt = new Date(d); return dt.getMonth() === curM && dt.getFullYear() === curY; };

  const monthlyFuel = allFuel.filter((f) => thisMonth(f.date)).reduce((s, f) => s + f.totalPrice, 0);
  const monthlyExp  = allExp.filter((e)  => thisMonth(e.date)).reduce((s, e) => s + e.amount, 0);
  const alertCount  = cars.filter((c)    => getDays(c.registrationExpiry) <= 30).length;

  const filtered = cars.filter((c) => {
    const q     = search.toLowerCase();
    const match = !q || [c.make, c.model, c.plateNumber, c.driverName, c.nickname].some((v) => v?.toLowerCase().includes(q));
    const days  = getDays(c.registrationExpiry);
    const filt  = filter === 'all' || (filter === 'expiring' && days >= 0 && days <= 30) || (filter === 'expired' && days < 0);
    return match && filt;
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.make || !form.model || !form.plateNumber || !form.registrationExpiry) return toast.error('Fill required fields');
    dispatch(addCar({ ...form, year: Number(form.year), purchasePrice: Number(form.purchasePrice) || 0, odometer: Number(form.odometer) || 0, registrationFee: Number(form.registrationFee) || 0, images: [], status: 'active' }));
    toast.success('Vehicle added to fleet');
    setShowAdd(false);
    setForm(BLANK);
  };

  const handleImageUpload = (carId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please select an image file');
    const reader = new FileReader();
    reader.onloadend = () => {
      dispatch(addCarImage({ carId, imageUrl: reader.result }));
      toast.success('Photo uploaded successfully');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <motion.div {...fade(0)} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #0b1d3a, #1e3a6e)' }}>
              <Car className="w-4.5 h-4.5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Fleet Management</h1>
          </div>
          <p className="text-slate-500 text-[13px]">Vehicles, registration, expenses & fuel</p>
        </div>
        {/* Quick action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" icon={Wrench} onClick={() => setShowExpense(true)}>Log Expense</Button>
          <Button variant="outline" icon={Fuel}   onClick={() => setShowFuel(true)}>Log Fuel</Button>
          <Button icon={Plus}                      onClick={() => setShowAdd(true)}>Add Vehicle</Button>
        </div>
      </motion.div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Vehicles',      value: cars.length,      icon: Car,          color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', sub: `${cars.filter(c => c.status === 'active').length} active` },
          { label: 'Registration Alerts', value: alertCount,       icon: AlertTriangle, color: '#dc2626', bg: '#fef2f2', border: '#fecaca', sub: 'Expiring within 30 days' },
          { label: 'Fleet Fuel (Month)',  value: `AED ${monthlyFuel.toFixed(0)}`, icon: Fuel, color: '#d97706', bg: '#fffbeb', border: '#fde68a', sub: 'All vehicles this month' },
          { label: 'Fleet Expenses',      value: `AED ${monthlyExp.toLocaleString()}`, icon: Gauge, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', sub: 'Service & repairs this month' },
        ].map((s, i) => (
          <motion.div key={s.label} {...fade(0.05 + i * 0.05)}>
            <div className="bg-white rounded-2xl p-5 border" style={{ borderColor: s.border, boxShadow: '0 1px 12px rgba(0,0,0,0.05)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: s.bg }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <p className="text-2xl font-bold text-slate-900 leading-none mb-1">{s.value}</p>
              <p className="text-[13px] font-semibold text-slate-700">{s.label}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{s.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Search + Filter ── */}
      <motion.div {...fade(0.18)} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by make, model, plate or driver…"
            className="w-full pl-9 pr-9 h-10 rounded-xl border border-slate-200 bg-white text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {[{ k: 'all', l: 'All' }, { k: 'expiring', l: 'Expiring' }, { k: 'expired', l: 'Expired' }].map(({ k, l }) => (
            <button key={k} onClick={() => setFilter(k)}
              className={cn('px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all',
                filter === k ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
              {l}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Cars Grid ── */}
      {filtered.length === 0 ? (
        <EmptyState icon={Car} title={search ? 'No vehicles match your search' : 'No vehicles yet'}
          description="Add your first vehicle to start tracking registration, expenses and fuel."
          action={search ? undefined : () => setShowAdd(true)} actionLabel={search ? undefined : 'Add Vehicle'} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((car, i) => {
            const reg  = regStatus(car.registrationExpiry);
            const ins  = regStatus(car.insuranceExpiry);
            const fuel = allFuel.filter((f) => f.carId === car.id && thisMonth(f.date)).reduce((s, f) => s + f.totalPrice, 0);
            const exp  = allExp.filter((e)  => e.carId === car.id && thisMonth(e.date)).reduce((s, e) => s + e.amount, 0);
            const hasImg = car.images?.[0];

            return (
              <motion.div key={car.id} {...fade(0.05 + i * 0.04)}>
                <Link to={`/cars/${car.id}`}>
                  <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>

                    {/* ── Hero ── */}
                    <div className="relative h-32 overflow-hidden">
                      {/* Background */}
                      {hasImg ? (
                        <>
                          <img src={hasImg} alt={`${car.make} ${car.model}`} className="absolute inset-0 w-full h-full object-cover" />
                          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(11,29,58,0.88) 0%, rgba(30,58,110,0.70) 55%, rgba(0,0,0,0.40) 100%)' }} />
                        </>
                      ) : (
                        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, #0b1d3a 0%, #1e3a6e 55%, ${car.color}44 100%)` }} />
                      )}
                      <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-[0.08]" style={{ background: 'radial-gradient(circle, white, transparent)', transform: 'translate(30%,-30%)' }} />

                      {/* Content */}
                      <div className="absolute inset-0 flex items-center justify-between px-5">
                        <div>
                          <p className="text-white/35 text-[9px] font-bold uppercase tracking-widest">{car.category}</p>
                          <p className="text-white font-bold text-[17px] leading-tight">{car.make}</p>
                          <p className="text-blue-200/60 text-[12px]">{car.model} · {car.year}</p>
                        </div>
                        <div className="text-right">
                          <div className="inline-block px-3 py-1.5 rounded-xl border border-white/20 bg-white/10 mb-1">
                            <p className="text-white font-bold text-[12px] tracking-wider">{car.plateNumber}</p>
                          </div>
                          <p className="text-white/40 text-[10px]">{car.colorName}</p>
                        </div>
                      </div>

                      {/* Camera upload button */}
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); fileRefs.current[car.id]?.click(); }}
                        className="absolute bottom-2 right-2 z-10 w-8 h-8 rounded-xl bg-black/30 hover:bg-black/50 border border-white/20 flex items-center justify-center backdrop-blur-sm transition-all"
                        title="Upload vehicle photo">
                        <Camera className="w-3.5 h-3.5 text-white" />
                      </button>
                      <input
                        ref={(el) => (fileRefs.current[car.id] = el)}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleImageUpload(car.id, e)}
                      />

                      {/* Photo count badge */}
                      {car.images?.length > 0 && (
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/30 backdrop-blur-sm border border-white/10">
                          <Camera className="w-2.5 h-2.5 text-white/70" />
                          <span className="text-[10px] font-semibold text-white/80">{car.images.length}</span>
                        </div>
                      )}
                    </div>

                    {/* ── Card Body ── */}
                    <div className="p-4 space-y-3">
                      {/* Driver */}
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-navy-900 flex items-center justify-center shrink-0">
                          <User className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div>
                          <p className="text-[12px] font-semibold text-slate-800 leading-tight">{car.driverName || 'No driver assigned'}</p>
                          <p className="text-[10px] text-slate-400">{car.driverPhone}</p>
                        </div>
                      </div>

                      {/* Reg + Insurance */}
                      <div className="grid grid-cols-2 gap-2">
                        {[{ label: 'Registration', s: reg }, { label: 'Insurance', s: ins }].map(({ label, s }) => (
                          <div key={label} className="rounded-xl p-2.5" style={{ background: s.bg }}>
                            <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: s.color }}>{label}</p>
                            <p className="text-[12px] font-bold mt-0.5" style={{ color: s.color }}>
                              {s.days < 0 ? 'Expired' : `${s.days}d left`}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Monthly stats */}
                      <div className="flex items-center justify-between pt-2.5 border-t border-slate-50">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <Fuel className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-[12px] font-bold text-slate-700">AED {fuel.toFixed(0)}</span>
                            <span className="text-[10px] text-slate-400">fuel</span>
                          </div>
                          <div className="w-px h-3 bg-slate-100" />
                          <div className="flex items-center gap-1.5">
                            <Gauge className="w-3.5 h-3.5 text-blue-500" />
                            <span className="text-[12px] font-bold text-slate-700">AED {exp.toLocaleString()}</span>
                            <span className="text-[10px] text-slate-400">exp.</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-accent-600 transition-colors" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Add Vehicle Modal ── */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Vehicle" subtitle="Enter vehicle details, registration & driver info" size="lg">
        <form onSubmit={handleAdd} className="space-y-5">
          <Section label="Vehicle Details">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nickname" value={form.nickname} onChange={(v) => set('nickname', v)} placeholder="e.g. White Ranger" />
              <Field label="Category" value={form.category} onChange={(v) => set('category', v)} type="select" options={CAR_CATEGORIES} />
              <Field label="Make *" value={form.make} onChange={(v) => set('make', v)} placeholder="e.g. Land Rover" required />
              <Field label="Model *" value={form.model} onChange={(v) => set('model', v)} placeholder="e.g. Range Rover Vogue" required />
              <Field label="Year" value={form.year} onChange={(v) => set('year', v)} type="number" placeholder="2024" />
              <Field label="Color Name" value={form.colorName} onChange={(v) => set('colorName', v)} placeholder="e.g. Pearl White" />
              <Field label="Plate Number *" value={form.plateNumber} onChange={(v) => set('plateNumber', v)} placeholder="Dubai A 12345" required />
              <Field label="VIN" value={form.vin} onChange={(v) => set('vin', v)} placeholder="17-character VIN" />
              <Field label="Odometer (km)" value={form.odometer} onChange={(v) => set('odometer', v)} type="number" placeholder="0" />
              <Field label="Purchase Price (AED)" value={form.purchasePrice} onChange={(v) => set('purchasePrice', v)} type="number" placeholder="0" />
            </div>
          </Section>
          <Section label="Driver Information">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Driver Name" value={form.driverName} onChange={(v) => set('driverName', v)} placeholder="Full name" />
              <Field label="Driver Phone" value={form.driverPhone} onChange={(v) => set('driverPhone', v)} placeholder="+971 50 000 0000" />
            </div>
          </Section>
          <Section label="Registration (Dubai — Annual Renewal)">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Registration Number" value={form.registrationNumber} onChange={(v) => set('registrationNumber', v)} placeholder="RN-2025-XXXXX" />
              <Field label="Expiry Date *" value={form.registrationExpiry} onChange={(v) => set('registrationExpiry', v)} type="date" required />
              <Field label="Registration Fee (AED)" value={form.registrationFee} onChange={(v) => set('registrationFee', v)} type="number" placeholder="1200" />
            </div>
          </Section>
          <Section label="Insurance">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Insurance Company" value={form.insuranceCompany} onChange={(v) => set('insuranceCompany', v)} placeholder="e.g. AXA Insurance UAE" />
              <Field label="Policy Number" value={form.insurancePolicy} onChange={(v) => set('insurancePolicy', v)} placeholder="Policy no." />
              <Field label="Insurance Expiry" value={form.insuranceExpiry} onChange={(v) => set('insuranceExpiry', v)} type="date" />
            </div>
          </Section>
          <div>
            <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2}
              placeholder="Any additional notes…"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 resize-none" />
          </div>
          <div className="flex justify-end gap-2.5 pt-1 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" icon={Plus}>Add Vehicle</Button>
          </div>
        </form>
      </Modal>

      {/* ── Quick Action Modals ── */}
      <QuickExpenseModal open={showExpense} onClose={() => setShowExpense(false)} />
      <QuickFuelModal    open={showFuel}    onClose={() => setShowFuel(false)}    />
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">{label}</p>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder, required, options }) {
  const cls = 'w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] text-slate-700 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500';
  return (
    <div>
      <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">{label}</label>
      {type === 'select'
        ? <select value={value} onChange={(e) => onChange(e.target.value)} className={cls}>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select>
        : <input value={value} onChange={(e) => onChange(e.target.value)} type={type} placeholder={placeholder} required={required} className={cls} />}
    </div>
  );
}
