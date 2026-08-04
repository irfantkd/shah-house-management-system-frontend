import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Car, Fuel, AlertTriangle, Plus, Search, User, ChevronRight, Gauge, Camera, X,
  Wrench, FileBarChart, Edit2, Trash2, Loader2, Power,
} from 'lucide-react';
import { useGetQuery, usePostMutation, usePutMutation, useDeleteMutation } from '../../api/apiSlice';
import { selectCurrentPropertyId } from '../../store/slices/propertiesSlice';
import { CAR_CATEGORIES } from '../../data/mockCars';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import PageLoader from '../../components/ui/PageLoader';
import { MotionSwipeableRow } from '../../components/ui/SwipeableRow';
import QuickExpenseModal from './QuickExpenseModal';
import QuickFuelModal from './QuickFuelModal';
import ReportsTab from './tabs/ReportsTab';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';
import DatePicker from '../../components/ui/DatePicker';

const fade = (d = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay: d, ease: [0.4, 0, 0.2, 1] },
});
const getDays = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);

const regStatus = (expiry) => {
  const days = getDays(expiry);
  if (days < 0)   return { color: '#dc2626', bg: '#fef2f2', days };
  if (days <= 30) return { color: '#d97706', bg: '#fffbeb', days };
  return            { color: '#16a34a', bg: '#f0fdf4', days };
};

const BLANK = {
  nickname: '', makeModel: '', colorName: '', color: '#94a3b8',
  plateNumber: '', vin: '', category: 'SUV',
  driverName: '', driverPhone: '',
  registrationNumber: '', registrationExpiry: '', registrationFee: '',
  insuranceCompany: '', insurancePolicy: '', insuranceExpiry: '',
  odometer: '', purchaseDate: '', purchasePrice: '', notes: '',
  status: 'active',
};

function parseMakeModelYear(input) {
  const tokens = (input || '').trim().split(/\s+/);
  const last = tokens[tokens.length - 1] ?? '';
  if (/^(19|20)\d{2}$/.test(last) && tokens.length > 1) {
    const year = parseInt(last, 10);
    const rest = tokens.slice(0, -1);
    return { make: rest[0] ?? '', model: rest.slice(1).join(' ') || rest[0] || '', year };
  }
  return { make: tokens[0] ?? '', model: tokens.slice(1).join(' ') || tokens[0] || '', year: new Date().getFullYear() };
}

export default function CarsPage() {
  const propertyId = useSelector(selectCurrentPropertyId);

  const { data: cars = [], isLoading: isFetching, isError } = useGetQuery(
    { path: '/cars', params: { propertyId } },
    { skip: !propertyId },
  );

  const [addCarMut,    { isLoading: isAdding }]   = usePostMutation();
  const [updateCarMut, { isLoading: isUpdating }] = usePutMutation();
  const [deleteCarMut, { isLoading: isDeleting }] = useDeleteMutation();

  const [view,         setView]        = useState('fleet');
  const [search,       setSearch]      = useState('');
  const [filter,       setFilter]      = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAdd,      setShowAdd]     = useState(false);
  const [showExpense,  setShowExpense] = useState(false);
  const [showFuel,     setShowFuel]    = useState(false);
  const [form,         setForm]        = useState(BLANK);

  const [editCar,   setEditCar]   = useState(null);
  const [editForm,  setEditForm]  = useState(BLANK);
  const [deleteCar, setDeleteCar] = useState(null);

  const [addErrors,  setAddErrors]  = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [addApiErr,  setAddApiErr]  = useState('');
  const [editApiErr, setEditApiErr] = useState('');

  const [localImages, setLocalImages] = useState({});
  const fileRefs = useRef({});

  const now  = new Date();
  const curM = now.getMonth(), curY = now.getFullYear();
  const thisMonth = (d) => { const dt = new Date(d); return dt.getMonth() === curM && dt.getFullYear() === curY; };

  const monthlyFuel = cars.reduce((s, c) => s + (c.fuelLogs ?? []).filter((f) => thisMonth(f.date)).reduce((ss, f) => ss + (f.totalPrice || 0), 0), 0);
  const monthlyExp  = cars.reduce((s, c) => s + (c.expenses ?? []).filter((e) => thisMonth(e.date)).reduce((ss, e) => ss + (e.amount || 0), 0), 0);
  const alertCount  = cars.filter((c) => getDays(c.registrationExpiry) <= 30).length;

  const filtered = cars.filter((c) => {
    const q     = search.toLowerCase();
    const match = !q || [c.make, c.model, c.plateNumber, c.driverName, c.nickname].some((v) => v?.toLowerCase().includes(q));
    const days  = getDays(c.registrationExpiry);
    const filt  = filter === 'all' || (filter === 'expiring' && days >= 0 && days <= 30) || (filter === 'expired' && days < 0);
    const sFltr = statusFilter === 'all' || c.status === statusFilter;
    return match && filt && sFltr;
  });

  const set  = (k, v) => { setForm((f) => ({ ...f, [k]: v }));  setAddErrors((e) => { const n = { ...e }; delete n[k]; return n; }); };
  const setE = (k, v) => { setEditForm((f) => ({ ...f, [k]: v })); setEditErrors((e) => { const n = { ...e }; delete n[k]; return n; }); };

  function validateCarForm(f, requireExpiry = true) {
    const errs = {};
    if (!f.makeModel?.trim())       errs.makeModel    = 'Make & Model is required (e.g. Toyota Land Cruiser 2023)';
    if (!f.plateNumber?.trim())     errs.plateNumber  = 'Plate number is required';
    if (requireExpiry && !f.registrationExpiry) errs.registrationExpiry = 'Registration expiry date is required';

    if (f.vin?.trim() && f.vin.trim().length !== 17)
      errs.vin = 'VIN must be exactly 17 characters';

    if (f.driverPhone?.trim()) {
      const ph = f.driverPhone.trim().replace(/[\s\-()]/g, '');
      if (!/^(\+971|00971|0)[0-9]{8,9}$/.test(ph) && !/^[0-9]{9,10}$/.test(ph))
        errs.driverPhone = 'Enter a valid phone number (e.g. +971 50 123 4567)';
    }

    if (f.odometer !== '' && f.odometer !== undefined) {
      if (isNaN(Number(f.odometer)) || Number(f.odometer) < 0)
        errs.odometer = 'Enter a valid positive number';
    }
    if (f.purchasePrice !== '' && f.purchasePrice !== undefined) {
      if (isNaN(Number(f.purchasePrice)) || Number(f.purchasePrice) < 0)
        errs.purchasePrice = 'Enter a valid positive amount';
    }
    if (f.registrationFee !== '' && f.registrationFee !== undefined) {
      if (isNaN(Number(f.registrationFee)) || Number(f.registrationFee) < 0)
        errs.registrationFee = 'Enter a valid positive amount';
    }
    if (f.registrationExpiry && f.insuranceExpiry) {
      if (f.insuranceExpiry < f.registrationExpiry)
        errs.insuranceExpiry = 'Insurance expiry should not be before registration expiry';
    }
    return errs;
  }

  const handleAdd = async (e) => {
    e.preventDefault();
    setAddApiErr('');
    const errs = validateCarForm(form, true);
    if (Object.keys(errs).length) { setAddErrors(errs); return; }

    const { make, model, year } = parseMakeModelYear(form.makeModel);
    const { makeModel, ...rest } = form;
    try {
      await addCarMut({
        path: '/cars',
        body: { ...rest, make, model, year, propertyId,
          purchasePrice: Number(form.purchasePrice) || 0,
          odometer: Number(form.odometer) || 0,
          registrationFee: Number(form.registrationFee) || 0 },
      }).unwrap();
      toast.success('Vehicle added to fleet');
      setShowAdd(false);
      setForm(BLANK);
      setAddErrors({});
    } catch (err) {
      const msg = err.data?.error || err.data?.message || 'Failed to add vehicle. Please try again.';
      setAddApiErr(msg);
    }
  };

  const openEdit = (car) => {
    setEditCar(car);
    setEditErrors({});
    setEditApiErr('');
    setEditForm({
      makeModel: [car.make, car.model, car.year].filter(Boolean).join(' '),
      category: car.category ?? 'SUV', nickname: car.nickname ?? '',
      plateNumber: car.plateNumber ?? '', color: car.color ?? '#94a3b8',
      colorName: car.colorName ?? '', odometer: car.odometer ?? '',
      driverName: car.driverName ?? '', driverPhone: car.driverPhone ?? '',
      registrationNumber: car.registrationNumber ?? '',
      registrationExpiry: car.registrationExpiry ?? '',
      registrationFee: car.registrationFee ?? '',
      insuranceCompany: car.insuranceCompany ?? '',
      insurancePolicy: car.insurancePolicy ?? '',
      insuranceExpiry: car.insuranceExpiry ?? '',
      vin: car.vin ?? '', purchaseDate: car.purchaseDate ?? '',
      purchasePrice: car.purchasePrice ?? '', notes: car.notes ?? '',
      status: car.status ?? 'active',
    });
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    setEditApiErr('');
    const errs = validateCarForm(editForm, false);
    if (Object.keys(errs).length) { setEditErrors(errs); return; }

    const { make, model, year } = parseMakeModelYear(editForm.makeModel);
    const { makeModel, ...rest } = editForm;
    try {
      await updateCarMut({
        path: `/cars/${editCar.id}`,
        body: { ...rest, make, model, year,
          odometer: Number(editForm.odometer) || 0,
          purchasePrice: Number(editForm.purchasePrice) || 0,
          registrationFee: Number(editForm.registrationFee) || 0 },
      }).unwrap();
      toast.success(`${make} ${model} updated`);
      setEditCar(null);
      setEditErrors({});
    } catch (err) {
      const msg = err.data?.error || err.data?.message || 'Failed to update vehicle. Please try again.';
      setEditApiErr(msg);
    }
  };

  const handleToggleStatus = async (car) => {
    const newStatus = car.status === 'active' ? 'inactive' : 'active';
    try {
      await updateCarMut({ path: `/cars/${car.id}`, body: { status: newStatus } }).unwrap();
      toast.success(`${car.make} ${car.model} marked ${newStatus}`);
    } catch (err) { toast.error(err.data?.error || 'Failed to update status'); }
  };

  const handleDeleteCar = async () => {
    if (!deleteCar) return;
    try {
      await deleteCarMut({ path: `/cars/${deleteCar.id}` }).unwrap();
      toast.success('Vehicle removed from fleet');
      setDeleteCar(null);
    } catch (err) {
      toast.error(err.data?.error || 'Failed to delete vehicle');
      setDeleteCar(null);
    }
  };

  const handleImageUpload = (carId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please select an image file');
    const reader = new FileReader();
    reader.onloadend = () => {
      setLocalImages((prev) => ({ ...prev, [carId]: [...(prev[carId] ?? []), reader.result] }));
      toast.success('Photo uploaded');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ── Global loader while initial fetch ───────────────────────────────────────
  if (isFetching && cars.length === 0) {
    return <PageLoader icon={Car} text="Loading fleet data…" />;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[56vh] gap-4">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>
        <div className="text-center">
          <p className="text-[15px] font-bold text-slate-800">Failed to load fleet data</p>
          <p className="text-[12px] text-slate-400 mt-1">Check your connection and refresh the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <motion.div {...fade(0)} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #0b1d3a, #1e3a6e)' }}>
              <Car className="w-4.5 h-4.5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Fleet Management</h1>
          </div>
          <p className="text-slate-500 text-[13px]">Vehicles, registration, expenses & fuel</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {view === 'fleet' && <>
            <Button variant="outline" icon={Wrench} onClick={() => setShowExpense(true)}>Log Expense</Button>
            <Button variant="outline" icon={Fuel}   onClick={() => setShowFuel(true)}>Log Fuel</Button>
            <Button icon={Plus}                      onClick={() => setShowAdd(true)}>Add Vehicle</Button>
          </>}
        </div>
      </motion.div>

      {/* ── View toggle ── */}
      <motion.div {...fade(0.03)}>
        <div className="inline-flex gap-1 bg-white border border-slate-200 rounded-xl p-1"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <button onClick={() => setView('fleet')}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all',
              view === 'fleet' ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800')}>
            <Car className="w-3.5 h-3.5" /> Fleet
          </button>
          <button onClick={() => setView('reports')}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all',
              view === 'reports' ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800')}>
            <FileBarChart className="w-3.5 h-3.5" /> Reports
          </button>
        </div>
      </motion.div>

      {/* ── Reports view ── */}
      {view === 'reports' && (
        <motion.div key="reports" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <ReportsTab />
        </motion.div>
      )}

      {/* ── Fleet view ── */}
      {view === 'fleet' && <>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Vehicles',     value: cars.length,  icon: Car,           color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', sub: `${cars.filter(c => c.status === 'active').length} active` },
            { label: 'Reg. Alerts',        value: alertCount,   icon: AlertTriangle,  color: '#dc2626', bg: '#fef2f2', border: '#fecaca', sub: 'Expiring within 30 days' },
            { label: 'Fleet Fuel (Month)', value: `AED ${monthlyFuel.toFixed(0)}`, icon: Fuel, color: '#d97706', bg: '#fffbeb', border: '#fde68a', sub: 'All vehicles this month' },
            { label: 'Fleet Expenses',     value: `AED ${monthlyExp.toLocaleString()}`, icon: Gauge, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', sub: 'Service & repairs this month' },
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

        {/* Search + Filters */}
        <motion.div {...fade(0.18)} className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by make, model, plate or driver…"
              className="w-full pl-9 pr-9 h-10 rounded-xl border border-slate-200 bg-white text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
              {[{ k: 'all', l: 'All Reg.' }, { k: 'expiring', l: 'Expiring' }, { k: 'expired', l: 'Expired' }].map(({ k, l }) => (
                <button key={k} onClick={() => setFilter(k)}
                  className={cn('px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all',
                    filter === k ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                  {l}
                </button>
              ))}
            </div>
            <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
              {[{ k: 'all', l: 'All Status' }, { k: 'active', l: 'Active' }, { k: 'inactive', l: 'Inactive' }].map(({ k, l }) => (
                <button key={k} onClick={() => setStatusFilter(k)}
                  className={cn('px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all',
                    statusFilter === k ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Swipe hint (mobile only) ── */}
        {filtered.length > 0 && (
          <p className="sm:hidden text-[10px] text-slate-400 font-semibold uppercase tracking-widest text-center">
            ← Swipe card to edit or delete →
          </p>
        )}

        {/* Cars Grid */}
        {filtered.length === 0 ? (
          <EmptyState icon={Car}
            title={search ? 'No vehicles match your search' : 'No vehicles yet'}
            description="Add your first vehicle to start tracking registration, expenses and fuel."
            action={search ? undefined : () => setShowAdd(true)}
            actionLabel={search ? undefined : 'Add Vehicle'} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            <AnimatePresence>
              {filtered.map((car, i) => {
                const canDelete = !car.expenses?.length && !car.fuelLogs?.length && !car.maintenance?.length;
                return (
                  <MotionSwipeableRow
                    key={car.id}
                    {...fade(0.05 + i * 0.04)}
                    className="rounded-3xl overflow-hidden"
                    style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(11,29,58,0.10)' }}
                    onSwipeRight={() => openEdit(car)}
                    onSwipeLeft={() => canDelete
                      ? setDeleteCar(car)
                      : toast('Remove all expense, fuel & maintenance records first', { icon: '⚠️' })
                    }
                    leftIcon={<Edit2  style={{ color: '#2563eb', width: 20, height: 20 }} />}
                    leftLabel="Edit"   leftBg="#eff6ff"  leftColor="#2563eb"
                    rightIcon={<Trash2 style={{ color: '#dc2626', width: 20, height: 20 }} />}
                    rightLabel="Delete" rightBg="#fef2f2" rightColor="#dc2626"
                  >
                    <CarCard
                      car={{ ...car, images: [...(car.images ?? []), ...(localImages[car.id] ?? [])] }}
                      thisMonth={thisMonth}
                      fileRefs={fileRefs}
                      onImageUpload={handleImageUpload}
                      onEdit={() => openEdit(car)}
                      onDelete={() => canDelete ? setDeleteCar(car) : toast('Remove all records first', { icon: '⚠️' })}
                      onToggleStatus={() => handleToggleStatus(car)}
                      canDelete={canDelete}
                    />
                  </MotionSwipeableRow>
                );
              })}
            </AnimatePresence>
          </div>
        )}

      </>}

      {/* ── Add Vehicle Modal ── */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setAddErrors({}); setAddApiErr(''); setForm(BLANK); }}
        title="Add Vehicle" subtitle="Enter vehicle details, registration & driver info" size="lg">
        <form onSubmit={handleAdd} className="space-y-5" noValidate>

          {/* API error banner */}
          {addApiErr && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-50 border border-red-200">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-[12px] text-red-700 font-medium">{addApiErr}</p>
              <button type="button" onClick={() => setAddApiErr('')} className="ml-auto text-red-400 hover:text-red-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Validation error summary */}
          {Object.keys(addErrors).length > 0 && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[12px] text-amber-700 font-medium">
                Please fix {Object.keys(addErrors).length} error{Object.keys(addErrors).length > 1 ? 's' : ''} below before submitting.
              </p>
            </div>
          )}

          <Section label="Vehicle Details">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nickname" value={form.nickname} onChange={(v) => set('nickname', v)} placeholder="e.g. White Ranger" />
              <Field label="Category" value={form.category} onChange={(v) => set('category', v)} type="select" options={CAR_CATEGORIES} />
              <Field label="Make & Model" value={form.makeModel} onChange={(v) => set('makeModel', v)}
                placeholder="e.g. Land Rover Range Rover 2024" required span2
                error={addErrors.makeModel} onClearError={() => setAddErrors((e) => { const n={...e}; delete n.makeModel; return n; })} />
              <Field label="Color Name" value={form.colorName} onChange={(v) => set('colorName', v)} placeholder="e.g. Pearl White" />
              <Field label="Plate Number" value={form.plateNumber} onChange={(v) => set('plateNumber', v)}
                placeholder="Dubai A 12345" required
                error={addErrors.plateNumber} onClearError={() => setAddErrors((e) => { const n={...e}; delete n.plateNumber; return n; })} />
              <Field label="VIN" value={form.vin} onChange={(v) => set('vin', v)} placeholder="17-character VIN"
                error={addErrors.vin} onClearError={() => setAddErrors((e) => { const n={...e}; delete n.vin; return n; })} />
              <Field label="Odometer (km)" value={form.odometer} onChange={(v) => set('odometer', v)} type="number" placeholder="0"
                error={addErrors.odometer} onClearError={() => setAddErrors((e) => { const n={...e}; delete n.odometer; return n; })} />
              <Field label="Purchase Price (AED)" value={form.purchasePrice} onChange={(v) => set('purchasePrice', v)} type="number" placeholder="0"
                error={addErrors.purchasePrice} onClearError={() => setAddErrors((e) => { const n={...e}; delete n.purchasePrice; return n; })} />
            </div>
          </Section>

          <Section label="Driver">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Driver Name" value={form.driverName} onChange={(v) => set('driverName', v)} placeholder="Full name" />
              <Field label="Driver Phone" value={form.driverPhone} onChange={(v) => set('driverPhone', v)} placeholder="+971 50 000 0000"
                error={addErrors.driverPhone} onClearError={() => setAddErrors((e) => { const n={...e}; delete n.driverPhone; return n; })} />
            </div>
          </Section>

          <Section label="Registration">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Registration Number" value={form.registrationNumber} onChange={(v) => set('registrationNumber', v)} placeholder="RN-2025-XXXXX" />
              <Field label="Expiry Date" value={form.registrationExpiry} onChange={(v) => set('registrationExpiry', v)} type="date" required
                error={addErrors.registrationExpiry} onClearError={() => setAddErrors((e) => { const n={...e}; delete n.registrationExpiry; return n; })} />
              <Field label="Registration Fee (AED)" value={form.registrationFee} onChange={(v) => set('registrationFee', v)} type="number" placeholder="1200"
                error={addErrors.registrationFee} onClearError={() => setAddErrors((e) => { const n={...e}; delete n.registrationFee; return n; })} />
            </div>
          </Section>

          <Section label="Insurance">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Insurance Company" value={form.insuranceCompany} onChange={(v) => set('insuranceCompany', v)} placeholder="e.g. AXA Insurance UAE" />
              <Field label="Policy Number" value={form.insurancePolicy} onChange={(v) => set('insurancePolicy', v)} placeholder="Policy no." />
              <Field label="Insurance Expiry" value={form.insuranceExpiry} onChange={(v) => set('insuranceExpiry', v)} type="date"
                error={addErrors.insuranceExpiry} onClearError={() => setAddErrors((e) => { const n={...e}; delete n.insuranceExpiry; return n; })} />
            </div>
          </Section>

          <div>
            <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2}
              placeholder="Any additional notes…"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 resize-none" />
          </div>

          <div className="flex justify-end gap-2.5 pt-1 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => { setShowAdd(false); setAddErrors({}); setAddApiErr(''); setForm(BLANK); }}>Cancel</Button>
            <Button type="submit" disabled={isAdding}>
              {isAdding
                ? <span className="flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding…</span>
                : <span className="flex items-center gap-2"><Plus className="w-3.5 h-3.5" /> Add Vehicle</span>}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Vehicle Modal ── */}
      <Modal open={!!editCar} onClose={() => { setEditCar(null); setEditErrors({}); setEditApiErr(''); }}
        title="Edit Vehicle" subtitle={editCar ? `${editCar.make} ${editCar.model} · ${editCar.plateNumber}` : ''} size="lg">
        <form onSubmit={handleEditSave} className="space-y-5" noValidate>

          {/* API error banner */}
          {editApiErr && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-50 border border-red-200">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-[12px] text-red-700 font-medium">{editApiErr}</p>
              <button type="button" onClick={() => setEditApiErr('')} className="ml-auto text-red-400 hover:text-red-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Validation error summary */}
          {Object.keys(editErrors).length > 0 && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[12px] text-amber-700 font-medium">
                Please fix {Object.keys(editErrors).length} error{Object.keys(editErrors).length > 1 ? 's' : ''} below before saving.
              </p>
            </div>
          )}

          <Section label="Vehicle Details">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nickname" value={editForm.nickname} onChange={(v) => setE('nickname', v)} placeholder="e.g. White Ranger" />
              <Field label="Category" value={editForm.category} onChange={(v) => setE('category', v)} type="select" options={CAR_CATEGORIES} />
              <Field label="Make & Model" value={editForm.makeModel} onChange={(v) => setE('makeModel', v)}
                placeholder="e.g. Land Rover Range Rover 2024" required span2
                error={editErrors.makeModel} onClearError={() => setEditErrors((e) => { const n={...e}; delete n.makeModel; return n; })} />
              <Field label="Color Name" value={editForm.colorName} onChange={(v) => setE('colorName', v)} placeholder="e.g. Pearl White" />
              <Field label="Plate Number" value={editForm.plateNumber} onChange={(v) => setE('plateNumber', v)}
                placeholder="Dubai A 12345" required
                error={editErrors.plateNumber} onClearError={() => setEditErrors((e) => { const n={...e}; delete n.plateNumber; return n; })} />
              <Field label="VIN" value={editForm.vin} onChange={(v) => setE('vin', v)} placeholder="17-character VIN"
                error={editErrors.vin} onClearError={() => setEditErrors((e) => { const n={...e}; delete n.vin; return n; })} />
              <Field label="Odometer (km)" value={editForm.odometer} onChange={(v) => setE('odometer', v)} type="number" placeholder="0"
                error={editErrors.odometer} onClearError={() => setEditErrors((e) => { const n={...e}; delete n.odometer; return n; })} />
              <Field label="Purchase Price (AED)" value={editForm.purchasePrice} onChange={(v) => setE('purchasePrice', v)} type="number" placeholder="0"
                error={editErrors.purchasePrice} onClearError={() => setEditErrors((e) => { const n={...e}; delete n.purchasePrice; return n; })} />
            </div>
          </Section>

          <Section label="Driver">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Driver Name" value={editForm.driverName} onChange={(v) => setE('driverName', v)} placeholder="Full name" />
              <Field label="Driver Phone" value={editForm.driverPhone} onChange={(v) => setE('driverPhone', v)} placeholder="+971 50 000 0000"
                error={editErrors.driverPhone} onClearError={() => setEditErrors((e) => { const n={...e}; delete n.driverPhone; return n; })} />
            </div>
          </Section>

          <Section label="Registration">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Registration Number" value={editForm.registrationNumber} onChange={(v) => setE('registrationNumber', v)} placeholder="RN-2025-XXXXX" />
              <Field label="Expiry Date" value={editForm.registrationExpiry} onChange={(v) => setE('registrationExpiry', v)} type="date"
                error={editErrors.registrationExpiry} onClearError={() => setEditErrors((e) => { const n={...e}; delete n.registrationExpiry; return n; })} />
              <Field label="Registration Fee (AED)" value={editForm.registrationFee} onChange={(v) => setE('registrationFee', v)} type="number" placeholder="1200"
                error={editErrors.registrationFee} onClearError={() => setEditErrors((e) => { const n={...e}; delete n.registrationFee; return n; })} />
            </div>
          </Section>

          <Section label="Insurance">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Insurance Company" value={editForm.insuranceCompany} onChange={(v) => setE('insuranceCompany', v)} placeholder="e.g. AXA Insurance UAE" />
              <Field label="Policy Number" value={editForm.insurancePolicy} onChange={(v) => setE('insurancePolicy', v)} placeholder="Policy no." />
              <Field label="Insurance Expiry" value={editForm.insuranceExpiry} onChange={(v) => setE('insuranceExpiry', v)} type="date"
                error={editErrors.insuranceExpiry} onClearError={() => setEditErrors((e) => { const n={...e}; delete n.insuranceExpiry; return n; })} />
            </div>
          </Section>

          <Section label="Status">
            <div className="flex gap-2">
              {['active', 'inactive'].map((s) => (
                <button key={s} type="button" onClick={() => setE('status', s)}
                  className={cn('flex-1 py-2.5 rounded-xl text-[13px] font-semibold border transition-all',
                    editForm.status === s
                      ? s === 'active' ? 'bg-green-50 border-green-300 text-green-700' : 'bg-slate-100 border-slate-300 text-slate-600'
                      : 'border-slate-200 text-slate-400 hover:border-slate-300')}>
                  {s === 'active' ? '● Active' : '○ Inactive'}
                </button>
              ))}
            </div>
          </Section>

          <div>
            <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Notes</label>
            <textarea value={editForm.notes} onChange={(e) => setE('notes', e.target.value)} rows={2}
              placeholder="Any additional notes…"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 resize-none" />
          </div>

          <div className="flex justify-end gap-2.5 pt-1 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => { setEditCar(null); setEditErrors({}); setEditApiErr(''); }}>Cancel</Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating
                ? <span className="flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</span>
                : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirmation ── */}
      <ConfirmDialog
        open={!!deleteCar}
        onClose={() => setDeleteCar(null)}
        onConfirm={handleDeleteCar}
        loading={isDeleting}
        title="Delete Vehicle"
        message={deleteCar ? `Remove ${deleteCar.make} ${deleteCar.model} (${deleteCar.plateNumber}) from the fleet? This cannot be undone.` : ''}
        confirmLabel="Delete Vehicle"
      />

      {/* ── Quick Action Modals ── */}
      <QuickExpenseModal open={showExpense} onClose={() => setShowExpense(false)} />
      <QuickFuelModal    open={showFuel}    onClose={() => setShowFuel(false)}    />
    </div>
  );
}

// ── CarCard — inner content only (MotionSwipeableRow provides the shell) ──────
function CarCard({ car, thisMonth, fileRefs, onImageUpload, onEdit, onDelete, onToggleStatus, canDelete }) {
  const reg      = regStatus(car.registrationExpiry);
  const ins      = regStatus(car.insuranceExpiry);
  const fuel     = (car.fuelLogs ?? []).filter((f) => thisMonth(f.date)).reduce((s, f) => s + (f.totalPrice || 0), 0);
  const exp      = (car.expenses ?? []).filter((e) => thisMonth(e.date)).reduce((s, e) => s + (e.amount || 0), 0);
  const hasImg   = car.images?.[0];
  const accent   = car.color || '#2563eb';
  const makeInits = car.make.substring(0, 2).toUpperCase();
  const regAlert  = reg.days < 0 || reg.days <= 30;
  const isActive  = car.status !== 'inactive';

  return (
    <div className="bg-white flex flex-col" style={{ opacity: isActive ? 1 : 0.72 }}>

      {/* ── HEADER + BODY — wrapped in Link for tap navigation ── */}
      <Link to={`/cars/${car.id}`} className="block group">

        {/* Header */}
        <div className="relative px-5 pt-4 pb-4 overflow-hidden"
          style={{ background: 'linear-gradient(150deg, #0a172e 0%, #0c1f3f 55%, #0e2550 100%)' }}>

          {hasImg && (
            <>
              <img src={hasImg} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover"
                style={{ zIndex: 0, opacity: 0.18 }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(150deg, rgba(10,23,46,0.96) 0%, rgba(12,31,63,0.88) 60%, rgba(14,37,80,0.80) 100%)', zIndex: 1 }} />
            </>
          )}

          {/* Color accent bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: accent, zIndex: 3 }} />
          {/* Decorative rings */}
          <div style={{ position: 'absolute', top: -36, right: -36, width: 130, height: 130, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.06)', pointerEvents: 'none', zIndex: 2 }} />
          <div style={{ position: 'absolute', top: -18, right: -18, width: 80,  height: 80,  borderRadius: '50%', border: '1px solid rgba(255,255,255,0.09)', pointerEvents: 'none', zIndex: 2 }} />
          {/* Ghost plate watermark */}
          <div style={{ position: 'absolute', right: 8, bottom: -2, fontSize: 44, fontWeight: 900, lineHeight: 1, color: 'rgba(255,255,255,0.04)', letterSpacing: '3px', userSelect: 'none', pointerEvents: 'none', zIndex: 2, fontFamily: 'monospace' }}>
            {car.plateNumber}
          </div>

          {/* Registration alert badge */}
          {regAlert && (
            <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold"
              style={{ background: 'rgba(220,38,38,0.18)', color: '#fca5a5', border: '1px solid rgba(220,38,38,0.30)', zIndex: 10 }}>
              <AlertTriangle className="w-2.5 h-2.5" />
              {reg.days < 0 ? 'Reg. Expired' : `${reg.days}d left`}
            </div>
          )}

          {/* Make initials avatar + name */}
          <div className="relative flex items-center gap-3.5 mt-1" style={{ zIndex: 5 }}>
            <div className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center text-[15px] font-black text-white select-none"
              style={{ background: `${accent}28`, border: '2.5px solid rgba(255,255,255,0.13)', boxShadow: `0 4px 20px ${accent}40` }}>
              {makeInits}
            </div>
            <div className="min-w-0 flex-1 pr-10">
              <p className="text-[16px] font-black text-white leading-tight truncate">
                {car.nickname || `${car.make} ${car.model}`}
              </p>
              <p className="text-[11px] font-semibold mt-0.5" style={{ color: 'rgba(255,255,255,0.42)' }}>
                {car.nickname ? `${car.make} ${car.model} · ` : ''}{car.year} · {car.category}
              </p>
            </div>
          </div>

          {/* Plate + camera */}
          <div className="relative flex items-center justify-between mt-3" style={{ zIndex: 5 }}>
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl border border-white/20 bg-white/10">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: accent }} />
              <p className="text-white font-bold text-[12px] tracking-wider">{car.plateNumber}</p>
              {car.colorName && <p className="text-white/40 text-[10px]">· {car.colorName}</p>}
            </div>
            <div className="flex items-center gap-1.5">
              {car.images?.length > 0 && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/25 border border-white/10">
                  <Camera className="w-2.5 h-2.5 text-white/60" />
                  <span className="text-[10px] font-semibold text-white/60">{car.images.length}</span>
                </div>
              )}
              <button type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); fileRefs.current[car.id]?.click(); }}
                className="w-8 h-8 rounded-xl bg-black/25 hover:bg-black/45 border border-white/15 flex items-center justify-center transition-all"
                title="Upload vehicle photo">
                <Camera className="w-3.5 h-3.5 text-white" />
              </button>
              <input ref={(el) => (fileRefs.current[car.id] = el)} type="file" accept="image/*"
                className="hidden" onClick={(e) => e.stopPropagation()}
                onChange={(e) => onImageUpload(car.id, e)} />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 pt-4 pb-3 flex flex-col gap-3">
          {/* Driver */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(11,29,58,0.06)' }}>
              <User className="w-4 h-4" style={{ color: '#0b1d3a' }} />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-slate-800 truncate leading-tight">
                {car.driverName || 'No driver assigned'}
              </p>
              {car.driverPhone && <p className="text-[10px] text-slate-400">{car.driverPhone}</p>}
            </div>
          </div>

          {/* Registration + Insurance pills */}
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

          {/* Monthly stats footer */}
          <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between">
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
            <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-navy-700 transition-colors" />
          </div>
        </div>
      </Link>

      {/* ── ACTION BAR — outside Link so buttons don't navigate ── */}
      <div className="border-t border-slate-100 px-5 py-2.5 flex items-center gap-2">

        {/* Status toggle */}
        <button onClick={onToggleStatus}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all',
            isActive
              ? 'bg-green-50 text-green-600 hover:bg-green-100'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
          )}
          title={isActive ? 'Mark as inactive' : 'Mark as active'}>
          <Power className="w-3 h-3" />
          {isActive ? 'Active' : 'Inactive'}
        </button>

        <div className="flex-1" />

        {/* Edit (always visible) */}
        <button onClick={onEdit}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-all"
          title="Edit vehicle">
          <Edit2 className="w-3.5 h-3.5" />
        </button>

        {/* Delete */}
        {canDelete ? (
          <button onClick={onDelete}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
            title="Delete vehicle">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={() => toast('Remove all expense, fuel & maintenance records first', { icon: '⚠️' })}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-200 cursor-not-allowed"
            title="Cannot delete — vehicle has records">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
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

function Field({ label, value, onChange, type = 'text', placeholder, required, options, span2, error, onClearError }) {
  const base = 'w-full h-10 px-3 rounded-xl border text-[13px] text-slate-700 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 transition-colors';
  const cls  = error
    ? `${base} border-red-400 focus:ring-red-400/30 focus:border-red-400`
    : `${base} border-slate-200 focus:ring-accent-500/30 focus:border-accent-500`;

  const handleChange = (v) => { onChange(v); if (error && onClearError) onClearError(); };

  return (
    <div className={span2 ? 'col-span-2' : ''}>
      <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {type === 'select'
        ? <select value={value} onChange={(e) => handleChange(e.target.value)}
            className={cls}>
            {options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        : type === 'date'
          ? <DatePicker value={value} onChange={handleChange} required={required} className={cls} hasError={!!error} />
          : <input value={value} onChange={(e) => handleChange(e.target.value)}
              type={type} placeholder={placeholder} required={required} className={cls} />
      }
      {error && <p className="text-red-500 text-[11px] mt-1 flex items-center gap-1"><span>⚠</span>{error}</p>}
    </div>
  );
}
