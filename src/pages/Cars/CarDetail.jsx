import { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Car, Edit, AlertCircle, Fuel, Gauge, FileText,
  Camera, ChevronLeft, ChevronRight, Trash2, Plus,
} from 'lucide-react';
import { selectCarById, addCarImage, removeCarImage } from '../../store/slices/carsSlice';
import Badge   from '../../components/ui/Badge';
import Button  from '../../components/ui/Button';
import { cn }  from '../../utils/cn';
import toast   from 'react-hot-toast';
import OverviewTab  from './tabs/OverviewTab';
import ExpensesTab  from './tabs/ExpensesTab';
import FuelTab      from './tabs/FuelTab';
import DocumentsTab from './tabs/DocumentsTab';

const TABS = [
  { id: 'overview',  label: 'Overview',  icon: Car      },
  { id: 'expenses',  label: 'Expenses',  icon: Gauge    },
  { id: 'fuel',      label: 'Fuel Log',  icon: Fuel     },
  { id: 'documents', label: 'Documents', icon: FileText },
];

const getDays    = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);
const regStatus  = (expiry) => {
  const days = getDays(expiry);
  if (days < 0)   return { label: 'Expired',       variant: 'danger',  days };
  if (days <= 30) return { label: 'Expiring Soon', variant: 'warning', days };
  return            { label: 'Active',          variant: 'success', days };
};

export default function CarDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const fileRef   = useRef(null);

  const [tab,    setTab]    = useState('overview');
  const [imgIdx, setImgIdx] = useState(0);

  const car = useSelector(selectCarById(id));

  if (!car) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-3">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
        <Car className="w-8 h-8 text-slate-300" strokeWidth={1.5} />
      </div>
      <p className="text-slate-600 font-semibold">Vehicle not found</p>
      <Link to="/cars" className="text-accent-600 text-sm hover:underline font-medium">← Back to Fleet</Link>
    </div>
  );

  const reg     = regStatus(car.registrationExpiry);
  const ins     = regStatus(car.insuranceExpiry);
  const regDays = getDays(car.registrationExpiry);
  const images  = car.images ?? [];
  const activeIdx = Math.min(imgIdx, Math.max(images.length - 1, 0));
  const activeImg = images[activeIdx] ?? null;

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please select an image file');
    const reader = new FileReader();
    reader.onloadend = () => {
      dispatch(addCarImage({ carId: car.id, imageUrl: reader.result }));
      setImgIdx(0);
      toast.success('Photo added');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemove = (index, e) => {
    e.stopPropagation();
    dispatch(removeCarImage({ carId: car.id, index }));
    setImgIdx(0);
    toast.success('Photo removed');
  };

  const prevImg = () => setImgIdx((i) => (i - 1 + images.length) % images.length);
  const nextImg = () => setImgIdx((i) => (i + 1) % images.length);

  return (
    <div className="space-y-5">
      {/* Back */}
      <button onClick={() => navigate('/cars')}
        className="flex items-center gap-2 text-[13px] text-slate-500 hover:text-slate-800 font-medium transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Fleet
      </button>

      {/* ── Hero Banner ── */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="relative rounded-3xl overflow-hidden min-h-45">

          {/* Background — image or gradient */}
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

          {/* Image nav arrows (only when >1 image) */}
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

          {/* Image counter */}
          {images.length > 0 && (
            <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/35 backdrop-blur-sm border border-white/15">
              <Camera className="w-3 h-3 text-white/70" />
              <span className="text-[11px] font-semibold text-white/80">{activeIdx + 1} / {images.length}</span>
            </div>
          )}

          {/* Upload camera button */}
          <button onClick={() => fileRef.current?.click()}
            className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/35 hover:bg-black/55 border border-white/20 backdrop-blur-sm transition-all">
            <Camera className="w-3.5 h-3.5 text-white" />
            <span className="text-[11px] font-semibold text-white">
              {images.length === 0 ? 'Add Photo' : 'Add More'}
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

          {/* Main content */}
          <div className="relative z-10 p-7">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
              <div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Badge variant={reg.variant} dot>{reg.label}</Badge>
                  <Badge variant={ins.variant}>Insurance {ins.label}</Badge>
                  {car.nickname && <Badge variant="navy">{car.nickname}</Badge>}
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
                  className="border-white/20! text-white! hover:bg-white/10!">
                  Edit Vehicle
                </Button>
              </div>
            </div>

            {/* Alerts */}
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
            {/* Add more button */}
            <button onClick={() => fileRef.current?.click()}
              className="shrink-0 w-20 h-14 rounded-xl border-2 border-dashed border-slate-200 hover:border-accent-400 hover:bg-accent-50 flex flex-col items-center justify-center gap-0.5 transition-all group">
              <Plus className="w-4 h-4 text-slate-300 group-hover:text-accent-500" />
              <span className="text-[9px] text-slate-300 group-hover:text-accent-500 font-semibold">Add</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-white border border-slate-100 rounded-2xl p-1.5" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] sm:text-[13px] font-semibold transition-all duration-150',
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
        {tab === 'overview'  && <OverviewTab  car={car} />}
        {tab === 'expenses'  && <ExpensesTab  carId={car.id} />}
        {tab === 'fuel'      && <FuelTab      carId={car.id} />}
        {tab === 'documents' && <DocumentsTab car={car} />}
      </motion.div>
    </div>
  );
}
