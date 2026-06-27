import { MapPin, Navigation, Hash, Building2, Globe, Copy, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import Card, { CardHeader } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';

function AddressRow({ icon: Icon, label, value }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    toast.success('Copied!');
  };
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0 group">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
          <Icon className="w-3.5 h-3.5 text-slate-500" />
        </div>
        <div>
          <p className="text-[11px] text-slate-400 font-medium">{label}</p>
          <p className="text-[13px] font-semibold text-slate-800">{value}</p>
        </div>
      </div>
      <button
        onClick={handleCopy}
        className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function AddressTab({ address, onEdit }) {
  const fullAddress = `${address.villa}, ${address.street}, ${address.district}, ${address.city}, ${address.emirate}, ${address.country}`;

  return (
    <div className="space-y-5">

      {/* Map placeholder */}
      <Card padding={false} className="overflow-hidden">
        <div className="h-52 bg-gradient-to-br from-navy-800 to-navy-950 relative flex items-center justify-center">
          {/* Decorative grid */}
          <div className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          {/* Pin */}
          <div className="flex flex-col items-center gap-2 relative z-10">
            <div className="w-12 h-12 rounded-full bg-accent-600 border-4 border-white shadow-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" fill="currentColor" />
            </div>
            <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg">
              <p className="text-[13px] font-bold text-navy-900">{address.villa}</p>
              <p className="text-[11px] text-slate-500">{address.district}, {address.city}</p>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[12px] text-slate-500">
            <Navigation className="w-3.5 h-3.5" />
            <span>{address.coordinates.lat}, {address.coordinates.lng}</span>
          </div>
          <button
            onClick={() => window.open(`https://maps.google.com/?q=${address.coordinates.lat},${address.coordinates.lng}`, '_blank')}
            className="text-[12px] text-accent-600 font-semibold hover:text-accent-700 transition-colors"
          >
            Open in Maps →
          </button>
        </div>
      </Card>

      {/* Address details */}
      <Card>
        <CardHeader
          title="Full address"
          action={<Button variant="ghost" size="sm" icon={Pencil} onClick={onEdit}>Edit</Button>}
        />
        <AddressRow icon={Building2} label="Villa / Unit"   value={address.villa}    />
        <AddressRow icon={MapPin}    label="Street"         value={address.street}   />
        <AddressRow icon={MapPin}    label="District"       value={address.district} />
        <AddressRow icon={Building2} label="City"           value={address.city}     />
        <AddressRow icon={Globe}     label="Emirate"        value={address.emirate}  />
        <AddressRow icon={Globe}     label="Country"        value={address.country}  />
        <AddressRow icon={Hash}      label="P.O. Box"       value={address.poBox}    />
        <AddressRow icon={Hash}      label="Makani Number"  value={address.makani}   />
      </Card>

      {/* Copy full address */}
      <button
        onClick={() => { navigator.clipboard.writeText(fullAddress); toast.success('Full address copied!'); }}
        className="w-full p-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 hover:bg-white hover:border-accent-200 transition-all text-[13px] text-slate-500 hover:text-accent-600 font-medium flex items-center justify-center gap-2 group"
      >
        <Copy className="w-4 h-4 group-hover:text-accent-600 transition-colors" />
        Copy full address to clipboard
      </button>

    </div>
  );
}
