import { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Car, Edit, AlertCircle, Fuel, Gauge,
  Camera, ChevronLeft, ChevronRight, Trash2, Plus, X, Save, BarChart2, Loader2,
} from 'lucide-react';
import PageLoader from '../../components/ui/PageLoader';
import { useGetQuery, usePutMutation } from '../../api/apiSlice';
import Badge   from '../../components/ui/Badge';
import Button  from '../../components/ui/Button';
import { cn }  from '../../utils/cn';
import toast   from 'react-hot-toast';
import OverviewTab from './tabs/OverviewTab';
import ExpensesTab from './tabs/ExpensesTab';
import FuelTab     from './tabs/FuelTab';
import StatsTab    from './tabs/StatsTab';
import { CAR_CATEGORIES } from '../../data/mockCars';
import DatePicker from '../../components/ui/DatePicker';

const TABS = [
  { id: 'overview',  label: 'Overview',  icon: Car       },
  { id: 'expenses',  label: 'Expenses',  icon: Gauge     },
  { id: 'fuel',      label: 'Fuel Log',  icon: Fuel      },
  { id: 'stats',     label: 'Stats',     icon: BarChart2 },
];

const INP_E = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] text-slate-800 placeholder:text-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white';
const LBL_E = 'block text-[10.5px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider';

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

const getDays   = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);
const regStatus = (expiry) => {
  const days = getDays(expiry);
  if (days < 0)   return { label: 'Expired',       variant: 'danger',  days };
  if (days <= 30) return { label: 'Expiring Soon', variant: 'warning', days };
  return            { label: 'Active',          variant: 'success', days };
};

export default function CarDetail() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const fileRef     = useRef(null);

  const [tab,          setTab]        = useState('overview');
  const [imgIdx,       setImgIdx]     = useState(0);
  const [showEdit,     setShowEdit]   = useState(false);
  const [editForm,     setEditForm]   = useState({});
  const [localImages,  setLocalImages] = useState([]);

  const { data: car, isLoading, isError } = useGetQuery({ path: `/cars/${id}` });
  const [updateCarMut, { isLoading: isSaving }] = usePutMutation();

  if (isLoading) return <PageLoader icon={Car} text="Loading vehicle…" />;

  if (isError || !car) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
          <Car className="w-8 h-8 text-slate-300" strokeWidth={1.5} />
        </div>
        <p className="text-slate-600 font-semibold">Vehicle not found</p>
        <p className="text-[12px] text-slate-400">{isError ? 'Could not load vehicle data.' : 'This vehicle may have been removed.'}</p>
        <button onClick={() => navigate('/cars')}
          className="flex items-center gap-2 text-[13px] text-accent-600 hover:underline font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Fleet
        </button>
      </div>
    );
  }

  const reg     = regStatus(car.registrationExpiry);
  const ins     = regStatus(car.insuranceExpiry);
  const regDays = getDays(car.registrationExpiry);
  const backendImages = car.images ?? [];
  const images  = [...backendImages, ...localImages];
  const activeIdx = Math.min(imgIdx, Math.max(images.length - 1, 0));
  const activeImg = images[activeIdx] ?? null;

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please select an image file');
    const reader = new FileReader();
    reader.onloadend = () => {
      setLocalImages((prev) => [...prev, reader.result]);
      setImgIdx(0);
      toast.success('Photo added');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemove = (index, e) => {
    e.stopPropagation();
    if (index < backendImages.length) { toast.error('Cannot remove synced photos here'); return; }
    setLocalImages((prev) => prev.filter((_, i) => i !== index - backendImages.length));
    setImgIdx(0);
    toast.success('Photo removed');
  };

  const prevImg = () => setImgIdx((i) => (i - 1 + images.length) % images.length);
  const nextImg = () => setImgIdx((i) => (i + 1) % images.length);

  const startEdit = () => {
    setEditForm({
      makeModel:          [car.make, car.model, car.year].filter(Boolean).join(' '),
      category:           car.category           ?? 'SUV',
      nickname:           car.nickname           ?? '',
      plateNumber:        car.plateNumber        ?? '',
      color:              car.color              ?? '#94a3b8',
      colorName:          car.colorName          ?? '',
      odometer:           car.odometer           ?? 0,
      driverName:         car.driverName         ?? '',
      driverPhone:        car.driverPhone        ?? '',
      vin:                car.vin                ?? '',
      registrationNumber: car.registrationNumber ?? '',
      registrationExpiry: car.registrationExpiry ?? '',
      registrationFee:    car.registrationFee    ?? 0,
      insuranceCompany:   car.insuranceCompany   ?? '',
      insurancePolicy:    car.insurancePolicy    ?? '',
      insuranceExpiry:    car.insuranceExpiry    ?? '',
      purchaseDate:       car.purchaseDate       ?? '',
      purchasePrice:      car.purchasePrice      ?? 0,
      notes:              car.notes              ?? '',
      status:             car.status             ?? 'active',
    });
    setShowEdit(true);
  };

  const handleEditSave = async () => {
    if (!editForm.makeModel?.trim())   { toast.error('Make & model is required'); return; }
    if (!editForm.plateNumber?.trim()) { toast.error('Plate number is required'); return; }
    const { make, model, year } = parseMakeModelYear(editForm.makeModel);
    const { makeModel, ...rest } = editForm;
    try {
      await updateCarMut({
        path: `/cars/${id}`,
        body: { ...rest, make, model, year, odometer: +editForm.odometer, purchasePrice: +editForm.purchasePrice, registrationFee: +editForm.registrationFee },
      }).unwrap();
      toast.success(`${make} ${model} updated`);
      setShowEdit(false);
    } catch (err) { toast.error(err.data?.error || 'Failed to update vehicle'); }
  };

  const setF = (k, v) => setEditForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-5">

      {/* ── Back button (mobile-prominent) ── */}
      <button onClick={() => navigate('/cars')}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[13px] text-slate-700 font-semibold transition-colors sm:bg-transparent sm:px-0 sm:py-0 sm:text-slate-500 sm:hover:bg-transparent sm:hover:text-slate-800">
        <ArrowLeft className="w-4 h-4" /> Back to Fleet
      </button>

      {/* ── Hero Banner ── */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="relative rounded-3xl overflow-hidden min-h-45">

          {activeImg ? (
            <>
              <img src={activeImg} alt={`${car.make} ${car.model}`}
                className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0"
                style={{ background: 'linear-gradient(135deg, rgba(11,29,58,0.90) 0%, rgba(30,58,110,0.75) 55%, rgba(0,0,0,0.50) 100%)' }} />
            </>
          ) : (
            <>
              <div className="absolute inset-0"
                style={{ background: `linear-gradient(135deg, #0b1d3a 0%, #1e3a6e 60%, ${car.color}55 100%)` }} />
              <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-[0.06]"
                style={{ background: 'radial-gradient(circle, white, transparent)', transform: 'translate(30%,-30%)' }} />
              <div className="absolute inset-x-0 top-0 h-px opacity-25"
                style={{ background: 'linear-gradient(90deg, transparent, #93c5fd, transparent)' }} />
            </>
          )}

          {images.length > 1 && (
            <>
              <button onClick={prevImg}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-xl bg-black/35 hover:bg-black/55 border border-white/20 flex items-center justify-center backdrop-blur-sm transition-all">
                <ChevronLeft className="w-4 h-4 text-white" />
              </button>
              <button onClick={nextImg}
                className="absolute right-14 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-xl bg-black/35 hover:bg-black/55 border border-white/20 flex items-center justify-center backdrop-blur-sm transition-all">
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
            </>
          )}

          {images.length > 0 && (
            <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/35 backdrop-blur-sm border border-white/15">
              <Camera className="w-3 h-3 text-white/70" />
              <span className="text-[11px] font-semibold text-white/80">{activeIdx + 1} / {images.length}</span>
            </div>
          )}

          <button onClick={() => fileRef.current?.click()}
            className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/35 hover:bg-black/55 border border-white/20 backdrop-blur-sm transition-all">
            <Camera className="w-3.5 h-3.5 text-white" />
            <span className="text-[11px] font-semibold text-white">
              {images.length === 0 ? 'Add Photo' : 'Add More'}
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

          <div className="relative z-10 p-7">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
              <div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Badge variant={reg.variant} dot>{reg.label}</Badge>
                  <Badge variant={ins.variant}>Insurance {ins.label}</Badge>
                  {car.nickname && <Badge variant="navy">{car.nickname}</Badge>}
                  {car.status === 'inactive' && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/25 text-slate-200 border border-slate-400/30">
                      Inactive
                    </span>
                  )}
                </div>
                <h1 className="text-white font-bold text-2xl sm:text-3xl leading-tight">
                  {car.make} {car.model}
                </h1>
                <p className="text-blue-200/55 text-[13px] mt-0.5">{car.year} · {car.colorName} · {car.category}</p>
                <div className="mt-4 inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/10 border border-white/15">
                  <p className="text-white font-bold text-lg tracking-widest">{car.plateNumber}</p>
                  <span className="text-white/30 text-xs">·</span>
                  <p className="text-blue-200/60 text-[12px]">{car.odometer?.toLocaleString()} km</p>
                </div>
              </div>
              <div className="shrink-0">
                <Button variant="outline" size="sm" icon={Edit}
                  onClick={startEdit}
                  className="border-white/20! text-white! hover:bg-white/10!">
                  Edit Vehicle
                </Button>
              </div>
            </div>

            {regDays >= 0 && regDays <= 30 && (
              <div className="mt-5 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-amber-500/15 border border-amber-400/25 w-fit">
                <AlertCircle className="w-4 h-4 text-amber-300 shrink-0" />
                <p className="text-amber-200 text-[12px] font-semibold">
                  Dubai registration expires in <span className="text-amber-100">{regDays} day{regDays !== 1 ? 's' : ''}</span> — renew at RTA to avoid fines
                </p>
              </div>
            )}
            {regDays < 0 && (
              <div className="mt-5 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-red-500/15 border border-red-400/25 w-fit">
                <AlertCircle className="w-4 h-4 text-red-300 shrink-0" />
                <p className="text-red-200 text-[12px] font-semibold">
                  Registration expired — renew immediately at RTA to avoid driving fines
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Photo Gallery Strip ── */}
      {images.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }}>
          <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {images.map((src, i) => (
              <div key={i} className="relative shrink-0 group">
                <button onClick={() => setImgIdx(i)}
                  className={cn(
                    'w-20 h-14 rounded-xl overflow-hidden border-2 transition-all',
                    activeIdx === i ? 'border-accent-500 shadow-md shadow-accent-500/20' : 'border-transparent hover:border-slate-300',
                  )}>
                  <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                </button>
                <button onClick={(e) => handleRemove(i, e)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10">
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
            <button onClick={() => fileRef.current?.click()}
              className="shrink-0 w-20 h-14 rounded-xl border-2 border-dashed border-slate-200 hover:border-accent-400 hover:bg-accent-50 flex flex-col items-center justify-center gap-0.5 transition-all group">
              <Plus className="w-4 h-4 text-slate-300 group-hover:text-accent-500" />
              <span className="text-[9px] text-slate-300 group-hover:text-accent-500 font-semibold">Add</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Tabs (scrollable on mobile) ── */}
      <div className="flex gap-1 bg-white border border-slate-100 rounded-2xl p-1.5 overflow-x-auto"
        style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)', scrollbarWidth: 'none' }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              'shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[12px] sm:text-[13px] font-semibold transition-all duration-150',
              tab === t.id ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800',
            )}>
            <t.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.label}</span>
            <span className="sm:hidden">{t.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {tab === 'overview'  && <OverviewTab car={car} />}
        {tab === 'expenses'  && <ExpensesTab carId={car.id} />}
        {tab === 'fuel'      && <FuelTab     carId={car.id} />}
        {tab === 'stats'     && <StatsTab    carId={car.id} />}
      </motion.div>

      {/* ── Edit Vehicle Modal (comprehensive) ── */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowEdit(false)} />
          <div className="relative w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between shrink-0"
              style={{ background: 'linear-gradient(135deg, #0b1d3a, #1e3a6e)' }}>
              <div>
                <p className="text-white font-bold text-[16px]">Edit Vehicle</p>
                <p className="text-white/50 text-[12px]">{car.make} {car.model} · {car.plateNumber}</p>
              </div>
              <button onClick={() => setShowEdit(false)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            {/* Form */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-5">

                {/* Vehicle Details */}
                <Section>
                  <p className={LBL_E}>Vehicle Details</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className={LBL_E}>Make & Model *</label>
                      <input value={editForm.makeModel ?? ''} onChange={(e) => setF('makeModel', e.target.value)} className={INP_E} placeholder="e.g. Land Rover Range Rover 2024" />
                    </div>
                    <div>
                      <label className={LBL_E}>Category</label>
                      <select value={editForm.category} onChange={(e) => setF('category', e.target.value)} className={INP_E}>
                        {CAR_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={LBL_E}>Plate Number *</label>
                      <input value={editForm.plateNumber} onChange={(e) => setF('plateNumber', e.target.value)} className={INP_E} placeholder="e.g. B 12345" />
                    </div>
                    <div>
                      <label className={LBL_E}>Nickname</label>
                      <input value={editForm.nickname} onChange={(e) => setF('nickname', e.target.value)} className={INP_E} placeholder="e.g. Family Cruiser" />
                    </div>
                    <div>
                      <label className={LBL_E}>Color Name</label>
                      <input value={editForm.colorName} onChange={(e) => setF('colorName', e.target.value)} className={INP_E} placeholder="e.g. Pearl White" />
                    </div>
                    <div>
                      <label className={LBL_E}>VIN</label>
                      <input value={editForm.vin} onChange={(e) => setF('vin', e.target.value)} className={INP_E} placeholder="17-char VIN" />
                    </div>
                    <div>
                      <label className={LBL_E}>Odometer (km)</label>
                      <input type="number" min="0" value={editForm.odometer} onChange={(e) => setF('odometer', e.target.value)} className={INP_E} />
                    </div>
                    <div>
                      <label className={LBL_E}>Purchase Date</label>
                      <DatePicker value={editForm.purchaseDate} onChange={(v) => setF('purchaseDate', v)} className={INP_E} />
                    </div>
                    <div>
                      <label className={LBL_E}>Purchase Price (AED)</label>
                      <input type="number" min="0" value={editForm.purchasePrice} onChange={(e) => setF('purchasePrice', e.target.value)} className={INP_E} />
                    </div>
                  </div>
                </Section>

                {/* Driver */}
                <Section>
                  <p className={LBL_E}>Driver Information</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={LBL_E}>Driver Name</label>
                      <input value={editForm.driverName} onChange={(e) => setF('driverName', e.target.value)} className={INP_E} placeholder="Driver's full name" />
                    </div>
                    <div>
                      <label className={LBL_E}>Driver Phone</label>
                      <input value={editForm.driverPhone} onChange={(e) => setF('driverPhone', e.target.value)} className={INP_E} placeholder="+971 50 …" />
                    </div>
                  </div>
                </Section>

                {/* Registration */}
                <Section>
                  <p className={LBL_E}>Registration</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={LBL_E}>Registration Number</label>
                      <input value={editForm.registrationNumber} onChange={(e) => setF('registrationNumber', e.target.value)} className={INP_E} placeholder="RN-XXXXX" />
                    </div>
                    <div>
                      <label className={LBL_E}>Registration Expiry</label>
                      <DatePicker value={editForm.registrationExpiry} onChange={(v) => setF('registrationExpiry', v)} className={INP_E} />
                    </div>
                    <div>
                      <label className={LBL_E}>Registration Fee (AED)</label>
                      <input type="number" min="0" value={editForm.registrationFee} onChange={(e) => setF('registrationFee', e.target.value)} className={INP_E} />
                    </div>
                  </div>
                </Section>

                {/* Insurance */}
                <Section>
                  <p className={LBL_E}>Insurance</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={LBL_E}>Insurance Company</label>
                      <input value={editForm.insuranceCompany} onChange={(e) => setF('insuranceCompany', e.target.value)} className={INP_E} placeholder="e.g. AXA Insurance" />
                    </div>
                    <div>
                      <label className={LBL_E}>Policy Number</label>
                      <input value={editForm.insurancePolicy} onChange={(e) => setF('insurancePolicy', e.target.value)} className={INP_E} placeholder="Policy no." />
                    </div>
                    <div>
                      <label className={LBL_E}>Insurance Expiry</label>
                      <DatePicker value={editForm.insuranceExpiry} onChange={(v) => setF('insuranceExpiry', v)} className={INP_E} />
                    </div>
                  </div>
                </Section>

                {/* Status */}
                <Section>
                  <p className={LBL_E}>Vehicle Status</p>
                  <div className="flex gap-2">
                    {['active', 'inactive'].map((s) => (
                      <button key={s} type="button" onClick={() => setF('status', s)}
                        className={cn(
                          'flex-1 py-2.5 rounded-xl text-[13px] font-semibold border transition-all capitalize',
                          editForm.status === s
                            ? s === 'active' ? 'bg-green-50 border-green-300 text-green-700' : 'bg-slate-100 border-slate-300 text-slate-600'
                            : 'border-slate-200 text-slate-400 hover:border-slate-300',
                        )}>
                        {s === 'active' ? '● Active' : '○ Inactive'}
                      </button>
                    ))}
                  </div>
                </Section>

                {/* Notes */}
                <div>
                  <label className={LBL_E}>Notes</label>
                  <textarea value={editForm.notes} onChange={(e) => setF('notes', e.target.value)} rows={3}
                    placeholder="Any additional notes…"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] text-slate-800 placeholder:text-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white resize-none" />
                </div>

              </div>
            </div>
            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end shrink-0">
              <button onClick={() => setShowEdit(false)}
                className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all">
                Cancel
              </button>
              <button onClick={handleEditSave} disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #0b1d3a, #1e3a6e)' }}>
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {isSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ children }) {
  return <div className="space-y-3">{children}</div>;
}
