import { useState } from 'react';
import { useSelector } from 'react-redux';
import { MapPin, Navigation, Hash, Building2, Globe, Copy, Pencil, Save, X, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetQuery, usePutMutation } from '../../../api/apiSlice';
import { selectCurrentPropertyId } from '../../../store/slices/propertiesSlice';
import Card, { CardHeader } from '../../../components/ui/Card';

const INP = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] text-slate-800 placeholder:text-slate-300 focus:border-navy-400 focus:ring-2 focus:ring-navy-100 outline-none transition-all bg-white';
const LBL = 'block text-[10.5px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider';

function AddressRow({ icon: Icon, label, value, copyable }) {
  const handleCopy = () => { navigator.clipboard.writeText(value); toast.success('Copied!'); };
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0 group">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
          <Icon className="w-3.5 h-3.5 text-slate-500" />
        </div>
        <div>
          <p className="text-[10.5px] text-slate-400 font-semibold uppercase tracking-wider">{label}</p>
          <p className="text-[13px] font-semibold text-slate-800">{value || '—'}</p>
        </div>
      </div>
      {copyable && value && (
        <button onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all">
          <Copy className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export default function AddressTab() {
  const propertyId = useSelector(selectCurrentPropertyId);
  const { data: home = {} } = useGetQuery({ path: '/home-info', params: { propertyId } }, { skip: !propertyId });
  const [updateHomeInfo] = usePutMutation();
  const address = home.address ?? {};

  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({});

  const startEdit = () => { setForm({ ...address, lat: address.coordinates?.lat ?? '', lng: address.coordinates?.lng ?? '' }); setEditing(true); };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.villa?.trim()) { toast.error('Villa / Unit number is required'); return; }
    if (!form.city?.trim())  { toast.error('City is required'); return; }
    const { lat, lng, ...rest } = form;
    try {
      await updateHomeInfo({ path: `/home-info?propertyId=${propertyId}`, body: { address: { ...address, ...rest, coordinates: { lat: parseFloat(lat) || 0, lng: parseFloat(lng) || 0 } } } }).unwrap();
      toast.success('Address updated');
      setEditing(false);
    } catch (err) { toast.error(err.data?.error || 'Failed to save'); }
  };

  const fullAddress = [address.villa, address.street, address.district, address.city, address.emirate, address.country].filter(Boolean).join(', ');

  if (editing) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-navy-900 text-white tracking-wider">EDITING</span>
            <p className="text-[13px] font-semibold text-slate-600">Property Address</p>
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

        <Card>
          <CardHeader title="Street address" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LBL}>Villa / Unit No. *</label>
              <input value={form.villa ?? ''} onChange={(e) => set('villa', e.target.value)} className={INP} placeholder="e.g. Villa 12" />
            </div>
            <div>
              <label className={LBL}>Street</label>
              <input value={form.street ?? ''} onChange={(e) => set('street', e.target.value)} className={INP} placeholder="Street name" />
            </div>
            <div>
              <label className={LBL}>District / Area</label>
              <input value={form.district ?? ''} onChange={(e) => set('district', e.target.value)} className={INP} placeholder="e.g. Al Barsha 3" />
            </div>
            <div>
              <label className={LBL}>City *</label>
              <input value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} className={INP} placeholder="e.g. Dubai" />
            </div>
            <div>
              <label className={LBL}>Emirate</label>
              <select value={form.emirate ?? ''} onChange={(e) => set('emirate', e.target.value)} className={INP}>
                {['Dubai','Abu Dhabi','Sharjah','Ajman','Ras Al Khaimah','Fujairah','Umm Al Quwain'].map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LBL}>Country</label>
              <input value={form.country ?? ''} onChange={(e) => set('country', e.target.value)} className={INP} placeholder="United Arab Emirates" />
            </div>
            <div>
              <label className={LBL}>P.O. Box</label>
              <input value={form.poBox ?? ''} onChange={(e) => set('poBox', e.target.value)} className={INP} placeholder="e.g. 123456" />
            </div>
            <div>
              <label className={LBL}>Makani Number</label>
              <input value={form.makani ?? ''} onChange={(e) => set('makani', e.target.value)} className={INP} placeholder="e.g. 4512 8765" />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="GPS coordinates" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LBL}>Latitude</label>
              <input type="number" step="any" value={form.lat ?? ''} onChange={(e) => set('lat', e.target.value)} className={INP} placeholder="e.g. 25.0657" />
            </div>
            <div>
              <label className={LBL}>Longitude</label>
              <input type="number" step="any" value={form.lng ?? ''} onChange={(e) => set('lng', e.target.value)} className={INP} placeholder="e.g. 55.1713" />
            </div>
          </div>
          <p className="text-[11.5px] text-slate-400 mt-3">Enter coordinates to enable "Open in Maps" link. Find them on Google Maps by right-clicking your location.</p>
        </Card>
      </div>
    );
  }

  /* ── Read view ── */
  return (
    <div className="space-y-5">
      {/* Map card */}
      <Card padding={false} className="overflow-hidden">
        <div className="h-52 relative flex items-center justify-center" style={{ background: 'linear-gradient(145deg, #060f1e 0%, #0b1d3a 60%, #0d2449 100%)' }}>
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, transparent, #C9A227 40%, #C9A227 60%, transparent)' }} />
          <div className="flex flex-col items-center gap-3 relative z-10">
            <div className="w-14 h-14 rounded-full border-4 border-white shadow-2xl flex items-center justify-center" style={{ background: '#C9A227' }}>
              <MapPin className="w-6 h-6 text-white fill-white" />
            </div>
            <div className="bg-white/95 backdrop-blur-sm px-5 py-2.5 rounded-2xl shadow-xl text-center">
              <p className="text-[14px] font-black text-navy-900">{address.villa}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{address.district}, {address.city}</p>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[12px] text-slate-500">
            <Navigation className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium">
              {address.coordinates?.lat && address.coordinates?.lng
                ? `${address.coordinates.lat}, ${address.coordinates.lng}`
                : 'No coordinates set'}
            </span>
          </div>
          {address.coordinates?.lat && address.coordinates?.lng && (
            <button
              onClick={() => window.open(`https://maps.google.com/?q=${address.coordinates.lat},${address.coordinates.lng}`, '_blank')}
              className="flex items-center gap-1.5 text-[12px] font-bold text-navy-700 hover:text-navy-900 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open in Google Maps
            </button>
          )}
        </div>
      </Card>

      {/* Address details */}
      <Card>
        <CardHeader
          title="Full address"
          action={
            <button onClick={startEdit} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          }
        />
        <AddressRow icon={Building2} label="Villa / Unit"  value={address.villa}    copyable />
        <AddressRow icon={MapPin}    label="Street"        value={address.street}   copyable />
        <AddressRow icon={MapPin}    label="District"      value={address.district} copyable />
        <AddressRow icon={Building2} label="City"          value={address.city}     copyable />
        <AddressRow icon={Globe}     label="Emirate"       value={address.emirate}  copyable />
        <AddressRow icon={Globe}     label="Country"       value={address.country}  copyable />
        <AddressRow icon={Hash}      label="P.O. Box"      value={address.poBox}    copyable />
        <AddressRow icon={Hash}      label="Makani Number" value={address.makani}   copyable />
      </Card>

      {/* Copy full address */}
      <button
        onClick={() => { navigator.clipboard.writeText(fullAddress); toast.success('Full address copied!'); }}
        className="w-full p-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 hover:bg-white hover:border-navy-200 transition-all text-[13px] text-slate-500 hover:text-navy-700 font-semibold flex items-center justify-center gap-2 group"
      >
        <Copy className="w-4 h-4" /> Copy full address to clipboard
      </button>
    </div>
  );
}
