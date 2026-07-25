import { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  BedDouble, Bath, Car, Waves, Leaf, Zap, Cpu, Sun,
  Layers, Ruler, CalendarDays, Pencil, Save, X, CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetQuery, usePutMutation } from '../../../api/apiSlice';
import { selectCurrentPropertyId } from '../../../store/slices/propertiesSlice';
import Card, { CardHeader } from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';

const INP = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] text-slate-800 placeholder:text-slate-300 focus:border-navy-400 focus:ring-2 focus:ring-navy-100 outline-none transition-all bg-white';
const LBL = 'block text-[10.5px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider';

const FEATURES = [
  { key: 'pool',      icon: Waves,  label: 'Swimming Pool',  color: 'text-accent-500',  bg: 'bg-accent-50'   },
  { key: 'garden',    icon: Leaf,   label: 'Garden',         color: 'text-emerald-600', bg: 'bg-emerald-50'  },
  { key: 'generator', icon: Zap,    label: 'Generator',      color: 'text-amber-600',   bg: 'bg-amber-50'    },
  { key: 'smart',     icon: Cpu,    label: 'Smart Home',     color: 'text-blue-600',    bg: 'bg-blue-50'     },
  { key: 'solar',     icon: Sun,    label: 'Solar System',   color: 'text-orange-500',  bg: 'bg-orange-50'   },
];

const PROPERTY_TYPES = ['Villa', 'Apartment', 'Flat', 'Penthouse', 'House', 'Townhouse', 'Duplex', 'Studio'];
const STATUS_OPTIONS  = ['Primary Residence', 'Secondary Residence', 'Rental', 'Vacant', 'Under Renovation'];

export default function OverviewTab() {
  const propertyId = useSelector(selectCurrentPropertyId);
  const { data: home = {} } = useGetQuery({ path: '/home-info', params: { propertyId } }, { skip: !propertyId });
  const [updateHomeInfo] = usePutMutation();
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({});

  const startEdit = () => {
    setForm({
      name: home.name ?? '',
      type: home.type ?? 'Villa',
      status: home.status ?? 'Primary Residence',
      description: home.description ?? '',
      bedrooms:  home.bedrooms  ?? '',
      bathrooms: home.bathrooms ?? '',
      floors:    home.floors    ?? '',
      parking:   home.parking   ?? '',
      size:      home.size      ?? '',
      landSize:  home.landSize  ?? '',
      yearBuilt: home.yearBuilt ?? '',
      renovated: home.renovated ?? '',
      pool:      home.pool      ?? false,
      garden:    home.garden    ?? false,
      generator: home.generator ?? false,
      smart:     home.smart     ?? false,
      solar:     home.solar     ?? false,
    });
    setEditing(true);
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name?.trim()) { toast.error('Property name is required'); return; }
    try {
      await updateHomeInfo({ path: `/home-info?propertyId=${propertyId}`, body: {
        ...form,
        bedrooms: +form.bedrooms, bathrooms: +form.bathrooms,
        floors: +form.floors, parking: +form.parking,
        size: +form.size, landSize: +form.landSize,
        yearBuilt: +form.yearBuilt, renovated: +form.renovated,
      }}).unwrap();
      toast.success('Overview updated');
      setEditing(false);
    } catch (err) { toast.error(err.data?.error || 'Failed to save'); }
  };

  const specs = [
    { icon: BedDouble,    label: 'Bedrooms',   value: home.bedrooms ?? '—'                                           },
    { icon: Bath,         label: 'Bathrooms',  value: home.bathrooms ?? '—'                                          },
    { icon: Layers,       label: 'Floors',     value: home.floors ?? '—'                                             },
    { icon: Car,          label: 'Parking',    value: home.parking != null ? `${home.parking} cars` : '—'            },
    { icon: Ruler,        label: 'Built-up',   value: home.size != null ? `${home.size.toLocaleString()} m²` : '—'  },
    { icon: Ruler,        label: 'Plot Area',  value: home.landSize != null ? `${home.landSize.toLocaleString()} m²` : '—' },
    { icon: CalendarDays, label: 'Year Built', value: home.yearBuilt ?? '—'                                          },
  ].filter((s) => s.value !== '—');

  const activeFeatures = FEATURES.filter((f) => home[f.key]);

  if (editing) {
    return (
      <div className="space-y-5">
        {/* Edit header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-navy-900 text-white tracking-wider">EDITING</span>
            <p className="text-[13px] font-semibold text-slate-600">Overview &amp; Specifications</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setEditing(false)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
            <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold text-white transition-all" style={{ background: 'linear-gradient(135deg, #0b1d3a, #1e3a6e)' }}>
              <Save className="w-3.5 h-3.5" /> Save Changes
            </button>
          </div>
        </div>

        {/* Identity */}
        <Card>
          <CardHeader title="Property identity" />
          <div className="space-y-4">
            <div>
              <label className={LBL}>Property Name</label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} className={INP} placeholder="e.g. Villa Al Marfa" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LBL}>Property Type</label>
                <div className="flex flex-wrap gap-2">
                  {PROPERTY_TYPES.map((t) => (
                    <button key={t} onClick={() => set('type', t)}
                      className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold border transition-all ${form.type === t ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={LBL}>Status</label>
                <select value={form.status} onChange={(e) => set('status', e.target.value)} className={INP}>
                  {STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={LBL}>Description</label>
              <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={4} className={`${INP} resize-none`} placeholder="Describe the property…" />
            </div>
          </div>
        </Card>

        {/* Specs */}
        <Card>
          <CardHeader title="Property specifications" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { key: 'bedrooms',  label: 'Bedrooms',    type: 'number', min: 1 },
              { key: 'bathrooms', label: 'Bathrooms',   type: 'number', min: 1 },
              { key: 'floors',    label: 'Floors',      type: 'number', min: 1 },
              { key: 'parking',   label: 'Parking Cars',type: 'number', min: 0 },
              { key: 'size',      label: 'Built-up m²', type: 'number', min: 1 },
              { key: 'landSize',  label: 'Plot m²',     type: 'number', min: 1 },
              { key: 'yearBuilt', label: 'Year Built',  type: 'number', min: 1900 },
              { key: 'renovated', label: 'Renovated',   type: 'number', min: 1900 },
            ].map((f) => (
              <div key={f.key}>
                <label className={LBL}>{f.label}</label>
                <input type={f.type} min={f.min} value={form[f.key]} onChange={(e) => set(f.key, e.target.value)} className={INP} />
              </div>
            ))}
          </div>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader title="Amenities & features" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {FEATURES.map((f) => (
              <button
                key={f.key}
                onClick={() => set(f.key, !form[f.key])}
                className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${
                  form[f.key] ? `${f.bg} border-current ${f.color}` : 'bg-slate-50 border-slate-100 text-slate-400'
                }`}
              >
                <f.icon className="w-4.5 h-4.5 shrink-0" strokeWidth={1.8} />
                <span className="text-[13px] font-semibold">{f.label}</span>
                <div className="ml-auto shrink-0">
                  {form[f.key]
                    ? <CheckCircle2 className="w-4 h-4" />
                    : <div className="w-4 h-4 rounded-full border-2 border-slate-300" />}
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* About */}
      <Card>
        <CardHeader
          title="About this property"
          action={
            <button onClick={startEdit} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          }
        />
        <p className="text-[14px] text-slate-600 leading-relaxed">{home.description}</p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Badge variant="default">{home.type}</Badge>
          <Badge variant="success" dot>{home.status}</Badge>
        </div>
      </Card>

      {/* Specs grid */}
      <Card>
        <CardHeader title="Property specifications" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {specs.map((s) => (
            <div key={s.label} className="flex flex-col gap-2 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className="flex items-center gap-2">
                <s.icon className="w-4 h-4 text-slate-400" strokeWidth={1.8} />
                <span className="text-[10.5px] text-slate-400 font-semibold uppercase tracking-wider">{s.label}</span>
              </div>
              <p className="text-[20px] font-black text-navy-900 leading-none">{s.value}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader title="Amenities & features" />
        {activeFeatures.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {activeFeatures.map((f) => (
              <div key={f.key} className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border ${f.bg} border-slate-100`}>
                <f.icon className={`w-4 h-4 ${f.color}`} strokeWidth={1.8} />
                <span className={`text-[13px] font-semibold ${f.color}`}>{f.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-slate-400">No amenities recorded. Click Edit to add.</p>
        )}
      </Card>
    </div>
  );
}
