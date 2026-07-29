import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  RiAddLine, RiEditLine, RiDeleteBinLine, RiCheckLine,
  RiMapPin2Line, RiBuilding2Line, RiCloseLine,
  RiHotelBedLine, RiDropLine, RiStackLine, RiRuler2Line,
  RiCalendarLine, RiCheckboxCircleLine, RiCommunityLine,
  RiParkingLine, RiFocus3Line,
} from 'react-icons/ri';
import {
  Landmark, Home, Building, Building2, Hotel,
  Waves, TreeDeciduous, LayoutGrid, HardHat, Warehouse,
} from 'lucide-react';
import {
  selectProperties, selectCurrentPropertyId, selectPropertiesStatus,
  setCurrentProperty,
} from '../../store/slices/propertiesSlice';
import { usePostMutation, usePutMutation, useDeleteMutation } from '../../api/apiSlice';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { cn } from '../../utils/cn';

const PROPERTY_TYPES = ['Villa', 'Flat', 'Apartment', 'Penthouse', 'House', 'Townhouse', 'Studio', 'Duplex', 'Farm'];
const PROPERTY_ICONS = [
  { key: 'landmark',  Icon: Landmark      },
  { key: 'home',      Icon: Home          },
  { key: 'building',  Icon: Building      },
  { key: 'building2', Icon: Building2     },
  { key: 'hotel',     Icon: Hotel         },
  { key: 'waves',     Icon: Waves         },
  { key: 'tree',      Icon: TreeDeciduous },
  { key: 'grid',      Icon: LayoutGrid    },
  { key: 'hardhat',   Icon: HardHat       },
  { key: 'warehouse', Icon: Warehouse     },
];
const ICON_BY_KEY = Object.fromEntries(PROPERTY_ICONS.map((p) => [p.key, p.Icon]));
const EMOJI_LEGACY = {
  '🏛️': 'landmark', '🏡': 'home', '🏠': 'building', '🏢': 'building2',
  '🏰': 'hotel', '🌊': 'waves', '🌴': 'tree', '🏘️': 'grid',
  '🏗️': 'hardhat', '🏚️': 'warehouse', '🏙️': 'building2', '🌾': 'tree',
};
function PropIcon({ iconKey, className, style }) {
  const Icon = ICON_BY_KEY[EMOJI_LEGACY[iconKey] ?? iconKey] ?? Landmark;
  return <Icon className={className ?? 'w-5 h-5 text-white'} strokeWidth={1.5} style={style} />;
}
const EMIRATES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah'];

const BLANK = {
  name: '', type: 'Villa', emoji: 'landmark', status: 'active',
  location: '',
  address: { street: '', area: '', emirate: 'Dubai', country: 'UAE' },
  bedrooms: '', bathrooms: '', totalArea: '', plotArea: '',
  yearBuilt: '', parkingSpots: '', description: '',
};

function fmt(n) {
  if (!n || n === 0) return null;
  return Number(n).toLocaleString();
}

// ─────────────────────────────────────────────────────────────────────────────
export default function PropertiesPage() {
  const dispatch   = useDispatch();
  const properties = useSelector(selectProperties);
  const currentId  = useSelector(selectCurrentPropertyId);
  const status     = useSelector(selectPropertiesStatus);
  const current    = properties.find((p) => p.id === currentId);

  const [postMut]   = usePostMutation();
  const [putMut]    = usePutMutation();
  const [deleteMut] = useDeleteMutation();

  const [modal,     setModal]     = useState(null);  // null | 'add' | property-object
  const [delTarget, setDelTarget] = useState(null);
  const [deleting,  setDeleting]  = useState(false);

  // Stats
  const totalBeds  = properties.reduce((s, p) => s + (p.bedrooms || 0), 0);
  const totalArea  = properties.reduce((s, p) => s + (p.totalArea || 0), 0);
  const activeCount = properties.filter((p) => p.status !== 'inactive').length;

  const handleSwitch = (id) => {
    if (id === currentId) return;
    const p = properties.find((x) => x.id === id);
    dispatch(setCurrentProperty(id));
    toast.success(`Switched to ${p?.name}`);
  };

  const handleSave = async (data) => {
    const isEdit = modal && modal !== 'add';
    try {
      if (isEdit) {
        await putMut({ path: `/properties/${modal.id}`, body: data }).unwrap();
      } else {
        await postMut({ path: '/properties', body: data }).unwrap();
      }
      toast.success(isEdit ? 'Property updated' : `${data.name} added`);
      setModal(null);
    } catch (err) {
      toast.error(err?.data?.error || (isEdit ? 'Failed to update property' : 'Failed to add property'));
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteMut({ path: `/properties/${delTarget.id}` }).unwrap();
      toast.success(`${delTarget.name} deleted`);
      setDelTarget(null);
    } catch (err) {
      toast.error(err?.data?.error || 'Delete failed');
    }
    setDeleting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">My Properties</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">
            {properties.length} {properties.length === 1 ? 'property' : 'properties'} — each with isolated data
          </p>
        </div>
        <button
          onClick={() => setModal('add')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white transition-opacity hover:opacity-85"
          style={{ background: 'linear-gradient(135deg, #0b1d3a, #1e3a6e)' }}>
          <RiAddLine className="w-4 h-4" /> Add Property
        </button>
      </div>

      {/* ── Summary stats ── */}
      {properties.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Properties', value: properties.length,      icon: RiCommunityLine,      color: 'text-navy-700',    bg: 'bg-navy-50'    },
            { label: 'Active',           value: activeCount,            icon: RiCheckboxCircleLine, color: 'text-emerald-700', bg: 'bg-emerald-50' },
            { label: 'Total Bedrooms',   value: totalBeds || '—',      icon: RiHotelBedLine,            color: 'text-blue-700',    bg: 'bg-blue-50'    },
            { label: 'Total Area (sqft)',value: fmt(totalArea) || '—',  icon: RiRuler2Line,         color: 'text-amber-700',   bg: 'bg-amber-50'   },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 px-4 py-3.5 flex items-center gap-3"
              style={{ boxShadow: '0 1px 6px rgb(0 0 0/0.05)' }}>
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', bg)}>
                <Icon className={cn('w-4 h-4', color)} />
              </div>
              <div>
                <p className="text-[18px] font-black text-slate-800 leading-tight">{value}</p>
                <p className="text-[11px] text-slate-400 leading-tight">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Active property hero ── */}
      {current && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="relative rounded-3xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0b1d3a 0%, #1a3360 60%, #0f2855 100%)' }}
        >
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)', backgroundSize: '12px 12px' }} />
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl bg-accent-500" />
          <PropIcon iconKey={current.emoji} className="w-36 h-36 text-white/4 select-none pointer-events-none" style={{ position:'absolute', right:16, bottom:-8 }} />

          <div className="relative p-6 sm:p-8 flex flex-col sm:flex-row sm:items-start gap-6">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <PropIcon iconKey={current.emoji} className="w-10 h-10 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-500/30">
                  ● Active Property
                </span>
                <span className="bg-white/10 text-white/60 text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/10">
                  {current.type}
                </span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">{current.name}</h2>
              {current.location && (
                <p className="text-white/50 text-[13px] mt-1 flex items-center gap-1.5">
                  <RiMapPin2Line className="w-3.5 h-3.5 shrink-0" />{current.location}
                </p>
              )}
              {current.address?.area && (
                <p className="text-white/35 text-[12px] mt-0.5">
                  {[current.address.area, current.address.emirate, current.address.country].filter(Boolean).join(', ')}
                </p>
              )}

              {/* Detail pills */}
              <div className="flex flex-wrap gap-2 mt-4">
                {current.bedrooms > 0 && (
                  <span className="flex items-center gap-1 text-white/60 text-[11px] font-semibold bg-white/[0.07] px-2.5 py-1 rounded-lg">
                    <RiHotelBedLine className="w-3.5 h-3.5" /> {current.bedrooms} Bed
                  </span>
                )}
                {current.bathrooms > 0 && (
                  <span className="flex items-center gap-1 text-white/60 text-[11px] font-semibold bg-white/[0.07] px-2.5 py-1 rounded-lg">
                    <RiDropLine className="w-3.5 h-3.5" /> {current.bathrooms} Bath
                  </span>
                )}
                {current.totalArea > 0 && (
                  <span className="flex items-center gap-1 text-white/60 text-[11px] font-semibold bg-white/[0.07] px-2.5 py-1 rounded-lg">
                    <RiRuler2Line className="w-3.5 h-3.5" /> {fmt(current.totalArea)} sqft
                  </span>
                )}
                {current.parkingSpots > 0 && (
                  <span className="flex items-center gap-1 text-white/60 text-[11px] font-semibold bg-white/[0.07] px-2.5 py-1 rounded-lg">
                    <RiParkingLine className="w-3.5 h-3.5" /> {current.parkingSpots} Parking
                  </span>
                )}
                {current.yearBuilt && (
                  <span className="flex items-center gap-1 text-white/60 text-[11px] font-semibold bg-white/[0.07] px-2.5 py-1 rounded-lg">
                    <RiCalendarLine className="w-3.5 h-3.5" /> Built {current.yearBuilt}
                  </span>
                )}
                {current.floors?.length > 0 && (
                  <span className="flex items-center gap-1 text-white/60 text-[11px] font-semibold bg-white/[0.07] px-2.5 py-1 rounded-lg">
                    <RiStackLine className="w-3.5 h-3.5" /> {current.floors.length} Floor{current.floors.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => setModal(current)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold shrink-0 transition-all"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}>
              <RiEditLine className="w-4 h-4" /> Edit
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Empty state ── */}
      {status !== 'loading' && properties.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-3xl bg-navy-50 flex items-center justify-center text-[32px] mb-4">🏛️</div>
          <h3 className="text-[16px] font-bold text-slate-700">No properties yet</h3>
          <p className="text-[13px] text-slate-400 mt-1 mb-6">Add your first property to get started</p>
          <button
            onClick={() => setModal('add')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #0b1d3a, #1e3a6e)' }}>
            <RiAddLine className="w-4 h-4" /> Add First Property
          </button>
        </div>
      )}

      {/* ── Property grid ── */}
      {properties.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {properties.map((p, i) => (
              <motion.div key={p.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.04 }}>
                <PropertyCard
                  property={p}
                  isActive={p.id === currentId}
                  isOnly={properties.length === 1}
                  onSwitch={() => handleSwitch(p.id)}
                  onEdit={() => setModal(p)}
                  onDelete={() => setDelTarget(p)}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add-new placeholder */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: properties.length * 0.04 + 0.05 }}>
            <button
              onClick={() => setModal('add')}
              className="w-full h-full min-h-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-navy-700 hover:border-navy-300 hover:bg-navy-50/30 transition-all group">
              <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-slate-200 group-hover:border-navy-300 flex items-center justify-center transition-colors">
                <RiAddLine className="w-6 h-6" />
              </div>
              <p className="text-[13px] font-semibold">Add New Property</p>
            </button>
          </motion.div>
        </div>
      )}

      {/* ── Modals ── */}
      <PropertyFormModal
        open={modal !== null}
        item={modal !== 'add' ? modal : null}
        onClose={() => setModal(null)}
        onSave={handleSave}
      />
      <ConfirmDialog
        open={!!delTarget}
        onClose={() => { if (!deleting) setDelTarget(null); }}
        onConfirm={handleDelete}
        title="Delete Property"
        message={`Delete "${delTarget?.name}"? All data for this property (areas, assets, tasks, employees, expenses, contracts, and more) will be permanently removed.`}
        confirmLabel="Delete Everything"
        loading={deleting}
      />
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function PropertyCard({ property: p, isActive, isOnly, onSwitch, onEdit, onDelete }) {
  return (
    <div
      className={cn(
        'group rounded-3xl overflow-hidden bg-white flex flex-col h-full',
        isActive && 'ring-2 ring-navy-400/40',
      )}
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(11,29,58,0.08)' }}>

      {/* Card header */}
      <div className="relative px-5 pt-5 pb-6 overflow-hidden"
        style={{ background: 'linear-gradient(150deg, #0a172e 0%, #0c1f3f 55%, #0e2550 100%)' }}>
        {isActive && <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-400 rounded-t-3xl" />}
        <PropIcon iconKey={p.emoji} className="w-20 h-20 text-white/5 select-none pointer-events-none" style={{ position:'absolute', right:8, bottom:-4 }} />
        {isActive && (
          <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 z-10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-300">Active</span>
          </div>
        )}
        {!isActive && p.status === 'inactive' && (
          <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-500/20 border border-slate-500/30 z-10">
            <span className="text-[10px] font-bold text-slate-300">Inactive</span>
          </div>
        )}
        <div className="relative flex items-start gap-3.5" style={{ zIndex: 5 }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <PropIcon iconKey={p.emoji} className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0 pt-0.5">
            <p className="text-[15px] font-black text-white leading-snug truncate pr-16">{p.name}</p>
            <p className="text-[11px] text-white/45 mt-0.5 flex items-center gap-1">
              <RiBuilding2Line className="w-3 h-3 shrink-0" />{p.type}
            </p>
          </div>
        </div>
      </div>

      {/* Card body */}
      <div className="flex-1 flex flex-col px-5 py-4 gap-2">
        {(p.location || p.address?.area) && (
          <div className="flex items-center gap-2 text-[12px] text-slate-500">
            <RiMapPin2Line className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <span className="truncate">{p.address?.area ? `${p.address.area}, ${p.address.emirate || p.location}` : p.location}</span>
          </div>
        )}

        {/* Property specs row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {p.bedrooms > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <RiHotelBedLine className="w-3.5 h-3.5 text-slate-300" />{p.bedrooms} bed
            </span>
          )}
          {p.bathrooms > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <RiDropLine className="w-3.5 h-3.5 text-slate-300" />{p.bathrooms} bath
            </span>
          )}
          {p.totalArea > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <RiRuler2Line className="w-3.5 h-3.5 text-slate-300" />{fmt(p.totalArea)} sqft
            </span>
          )}
          {p.parkingSpots > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <RiParkingLine className="w-3.5 h-3.5 text-slate-300" />{p.parkingSpots} parking
            </span>
          )}
        </div>

        {p.yearBuilt && (
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <RiCalendarLine className="w-3.5 h-3.5 text-slate-300 shrink-0" />Built {p.yearBuilt}
          </div>
        )}

        {p.floors?.length > 0 && (
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <RiStackLine className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            {p.floors.join(' · ')}
          </div>
        )}

        <div className="flex-1" />

        <div className="border-t border-slate-100 pt-3 flex items-center gap-2">
          {isActive ? (
            <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold text-emerald-700 bg-emerald-50">
              <RiCheckLine className="w-3.5 h-3.5" /> Active
            </span>
          ) : (
            <button onClick={onSwitch}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold text-navy-700 bg-navy-50 hover:bg-navy-100 transition-colors">
              <RiFocus3Line className="w-3.5 h-3.5" /> Set Active
            </button>
          )}
          <div className="ml-auto flex items-center gap-1">
            <button onClick={onEdit}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
              <RiEditLine className="w-4 h-4" />
            </button>
            <button onClick={onDelete} disabled={isOnly}
              title={isOnly ? 'Cannot delete the only property' : 'Delete property'}
              className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center transition-all',
                isOnly ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-red-500 hover:bg-red-50',
              )}>
              <RiDeleteBinLine className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function FormRow({ children }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function FieldWrap({ label, required, children, error }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
        {label}{required && ' *'}
      </label>
      {children}
      {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function TextInput({ className, ...props }) {
  return (
    <input
      className={cn(
        'w-full h-10 px-3.5 rounded-xl border border-slate-200 text-[13px] text-slate-800 placeholder-slate-300 outline-none transition-all bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400',
        className,
      )}
      {...props}
    />
  );
}

function SelectInput({ children, className, ...props }) {
  return (
    <select
      className={cn(
        'w-full h-10 px-3.5 rounded-xl border border-slate-200 text-[13px] text-slate-800 outline-none transition-all bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 appearance-none cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

const FORM_TABS = ['Basic', 'Location', 'Details', 'Floors'];

function PropertyFormModal({ open, item, onClose, onSave }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ defaultValues: BLANK });
  const [tab,     setTab]     = useState('Basic');
  const [busy,    setBusy]    = useState(false);
  const [emoji,   setEmoji]   = useState('landmark');
  const [propType, setPropType] = useState('Villa');
  const [floors,  setFloors]  = useState([]);
  const [newFloor, setNewFloor] = useState('');

  const watchEmoji = emoji;

  useEffect(() => {
    if (!open) return;
    setTab('Basic');
    setNewFloor('');
    if (item) {
      setEmoji(EMOJI_LEGACY[item.emoji] ?? item.emoji ?? 'landmark');
      setPropType(item.type || 'Villa');
      setFloors(item.floors ?? []);
      reset({
        name:         item.name        || '',
        status:       item.status      || 'active',
        location:     item.location    || '',
        address: {
          street:  item.address?.street  || '',
          area:    item.address?.area    || '',
          emirate: item.address?.emirate || 'Dubai',
          country: item.address?.country || 'UAE',
        },
        bedrooms:     item.bedrooms     || '',
        bathrooms:    item.bathrooms    || '',
        totalArea:    item.totalArea    || '',
        plotArea:     item.plotArea     || '',
        yearBuilt:    item.yearBuilt    || '',
        parkingSpots: item.parkingSpots || '',
        description:  item.description  || '',
      });
    } else {
      setEmoji('🏛️');
      setPropType('Villa');
      setFloors([]);
      reset({
        name: '', status: 'active', location: '',
        address: { street: '', area: '', emirate: 'Dubai', country: 'UAE' },
        bedrooms: '', bathrooms: '', totalArea: '', plotArea: '',
        yearBuilt: '', parkingSpots: '', description: '',
      });
    }
  }, [open, item]);

  const addFloor = () => {
    const name = newFloor.trim();
    if (!name || floors.includes(name)) return;
    setFloors((f) => [...f, name]);
    setNewFloor('');
  };

  const removeFloor = (name) => setFloors((f) => f.filter((x) => x !== name));

  const onSubmit = async (values) => {
    setBusy(true);
    const payload = {
      name:        values.name.trim(),
      type:        propType,
      emoji,
      status:      values.status,
      location:    values.location?.trim() || '',
      address: {
        street:  values.address?.street?.trim()  || '',
        area:    values.address?.area?.trim()    || '',
        emirate: values.address?.emirate         || 'Dubai',
        country: values.address?.country?.trim() || 'UAE',
      },
      bedrooms:     values.bedrooms     ? Number(values.bedrooms)     : 0,
      bathrooms:    values.bathrooms    ? Number(values.bathrooms)    : 0,
      totalArea:    values.totalArea    ? Number(values.totalArea)    : 0,
      plotArea:     values.plotArea     ? Number(values.plotArea)     : 0,
      yearBuilt:    values.yearBuilt    ? Number(values.yearBuilt)    : null,
      parkingSpots: values.parkingSpots ? Number(values.parkingSpots) : 0,
      description:  values.description?.trim() || '',
      floors,
    };
    await onSave(payload);
    setBusy(false);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-60 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -16 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="w-full max-w-lg rounded-3xl overflow-hidden flex flex-col max-h-[90vh]"
            style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.4)' }}
            onClick={(e) => e.stopPropagation()}>

            {/* Modal header */}
            <div className="relative px-6 pt-5 pb-5 overflow-hidden shrink-0"
              style={{ background: 'linear-gradient(150deg, #0a172e 0%, #0c1f3f 55%, #0e2550 100%)' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#3b82f6,#6366f1)', opacity: 0.9 }} />
              <div style={{ position: 'absolute', bottom: -8, right: 16, fontSize: 72, color: 'rgba(255,255,255,0.04)', lineHeight: 1, userSelect: 'none' }}>
                {watchEmoji}
              </div>
              <div className="relative flex items-center justify-between" style={{ zIndex: 5 }}>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-white/30 mb-1">
                    {item ? 'Edit Property' : 'New Property'}
                  </p>
                  <h2 className="text-[20px] font-black text-white leading-tight">
                    {item ? item.name : 'Add Property'}
                  </h2>
                  <p className="text-[12px] text-white/40 mt-0.5">Each property has its own isolated data</p>
                </div>
                <button onClick={onClose}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
                  <RiCloseLine className="w-5 h-5" />
                </button>
              </div>

              {/* Tab bar */}
              <div className="flex gap-1 mt-4 bg-white/5 rounded-xl p-1">
                {FORM_TABS.map((t) => (
                  <button key={t} type="button" onClick={() => setTab(t)}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all',
                      tab === t ? 'bg-white text-navy-900 shadow-sm' : 'text-white/50 hover:text-white/80'
                    )}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal body */}
            <div className="bg-white overflow-y-auto flex-1">
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="px-6 pt-5 pb-6 space-y-4">

                  {/* ── Tab: Basic ── */}
                  {tab === 'Basic' && (
                    <>
                      {/* Icon picker */}
                      <FieldWrap label="Icon">
                        <div className="flex flex-wrap gap-2">
                          {PROPERTY_ICONS.map(({ key, Icon }) => (
                            <button key={key} type="button" onClick={() => setEmoji(key)}
                              className={cn(
                                'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                                emoji === key ? 'bg-navy-900 shadow-lg scale-105' : 'bg-slate-100 hover:bg-slate-200',
                              )}>
                              <Icon className={cn('w-5 h-5', emoji === key ? 'text-white' : 'text-slate-500')} strokeWidth={1.5} />
                            </button>
                          ))}
                        </div>
                      </FieldWrap>

                      {/* Name */}
                      <FieldWrap label="Property Name" required error={errors.name?.message}>
                        <TextInput
                          {...register('name', { required: 'Property name is required' })}
                          placeholder="e.g. Shah Villa, Marina Apartment…"
                          className={errors.name ? 'border-red-300 bg-red-50' : ''}
                        />
                      </FieldWrap>

                      {/* Type chips */}
                      <FieldWrap label="Property Type">
                        <div className="flex flex-wrap gap-2">
                          {PROPERTY_TYPES.map((t) => (
                            <button key={t} type="button" onClick={() => setPropType(t)}
                              className={cn(
                                'px-3 py-1.5 rounded-xl text-[12px] font-bold border transition-all',
                                propType === t
                                  ? 'bg-navy-900 text-white border-navy-900'
                                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700',
                              )}>
                              {t}
                            </button>
                          ))}
                        </div>
                      </FieldWrap>

                      {/* Status */}
                      <FieldWrap label="Status">
                        <SelectInput {...register('status')}>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </SelectInput>
                      </FieldWrap>

                      {/* Description */}
                      <FieldWrap label="Description">
                        <textarea
                          {...register('description')}
                          rows={3}
                          placeholder="Brief description of the property…"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] text-slate-800 placeholder-slate-300 outline-none transition-all bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 resize-none"
                        />
                      </FieldWrap>
                    </>
                  )}

                  {/* ── Tab: Location ── */}
                  {tab === 'Location' && (
                    <>
                      <FieldWrap label="Display Location">
                        <TextInput {...register('location')} placeholder="e.g. Palm Jumeirah, Dubai" />
                      </FieldWrap>
                      <FieldWrap label="Street / Unit">
                        <TextInput {...register('address.street')} placeholder="e.g. Villa 42, Al Sufouh Rd" />
                      </FieldWrap>
                      <FormRow>
                        <FieldWrap label="Area / Community">
                          <TextInput {...register('address.area')} placeholder="e.g. Al Barsha" />
                        </FieldWrap>
                        <FieldWrap label="Emirate">
                          <SelectInput {...register('address.emirate')}>
                            {EMIRATES.map((e) => <option key={e} value={e}>{e}</option>)}
                          </SelectInput>
                        </FieldWrap>
                      </FormRow>
                      <FieldWrap label="Country">
                        <TextInput {...register('address.country')} placeholder="UAE" />
                      </FieldWrap>
                    </>
                  )}

                  {/* ── Tab: Details ── */}
                  {tab === 'Details' && (
                    <>
                      <FormRow>
                        <FieldWrap label="Bedrooms">
                          <TextInput {...register('bedrooms')} type="number" min="0" placeholder="e.g. 5" />
                        </FieldWrap>
                        <FieldWrap label="Bathrooms">
                          <TextInput {...register('bathrooms')} type="number" min="0" placeholder="e.g. 6" />
                        </FieldWrap>
                      </FormRow>
                      <FormRow>
                        <FieldWrap label="Built-up Area (sqft)">
                          <TextInput {...register('totalArea')} type="number" min="0" placeholder="e.g. 6500" />
                        </FieldWrap>
                        <FieldWrap label="Plot Area (sqft)">
                          <TextInput {...register('plotArea')} type="number" min="0" placeholder="e.g. 9000" />
                        </FieldWrap>
                      </FormRow>
                      <FormRow>
                        <FieldWrap label="Year Built">
                          <TextInput {...register('yearBuilt')} type="number" min="1900" max="2099" placeholder="e.g. 2019" />
                        </FieldWrap>
                        <FieldWrap label="Parking Spots">
                          <TextInput {...register('parkingSpots')} type="number" min="0" placeholder="e.g. 3" />
                        </FieldWrap>
                      </FormRow>
                    </>
                  )}

                  {/* ── Tab: Floors ── */}
                  {tab === 'Floors' && (
                    <>
                      <p className="text-[12px] text-slate-500">
                        Define the floors of your property. These are used to organize areas and rooms.
                      </p>

                      {/* Add floor input */}
                      <div className="flex gap-2">
                        <TextInput
                          value={newFloor}
                          onChange={(e) => setNewFloor(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFloor(); } }}
                          placeholder="Floor name, e.g. Ground Floor, Level 1…"
                          className="flex-1"
                        />
                        <button type="button" onClick={addFloor}
                          className="h-10 px-4 rounded-xl text-[12px] font-bold text-white shrink-0"
                          style={{ background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' }}>
                          Add
                        </button>
                      </div>

                      {/* Floor list */}
                      {floors.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <RiStackLine className="w-8 h-8 text-slate-200 mb-2" />
                          <p className="text-[13px] text-slate-400">No floors added yet</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {floors.map((f, i) => (
                            <div key={f} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-2.5 group">
                              <div className="flex items-center gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-navy-100 text-navy-700 text-[10px] font-black flex items-center justify-center shrink-0">
                                  {i + 1}
                                </span>
                                <span className="text-[13px] font-semibold text-slate-700">{f}</span>
                              </div>
                              <button type="button" onClick={() => removeFloor(f)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100">
                                <RiCloseLine className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Footer actions */}
                <div className="px-6 pb-6 flex gap-3 border-t border-slate-100 pt-4 shrink-0">
                  <button type="button" onClick={onClose}
                    className="flex-1 h-11 rounded-2xl text-[14px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={busy}
                    className="flex-1 h-11 rounded-2xl text-[14px] font-bold text-white transition-opacity disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #0b1d3a, #1e3a6e)' }}>
                    {busy ? 'Saving…' : item ? 'Save Changes' : 'Add Property'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
