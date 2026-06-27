import { Phone, Mail, MessageCircle, Globe, CreditCard, Pencil, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import Card, { CardHeader } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';

function InfoRow({ icon: Icon, label, value, copyable }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied!`);
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
      {copyable && (
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export default function OwnerTab({ owner, onEdit }) {
  return (
    <div className="space-y-5">

      {/* Owner profile */}
      <Card>
        <CardHeader
          title="Owner information"
          action={
            <Button variant="ghost" size="sm" icon={Pencil} onClick={onEdit}>Edit</Button>
          }
        />
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-500 to-navy-700 flex items-center justify-center flex-shrink-0 shadow-md">
            <span className="text-white text-2xl font-bold">{owner.name[0]}</span>
          </div>
          <div>
            <p className="text-xl font-bold text-navy-900">{owner.title} {owner.name} {owner.surname}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="default" size="sm">{owner.nationality}</Badge>
              <Badge variant="primary" size="sm" dot>Home Owner</Badge>
            </div>
          </div>
        </div>
        <InfoRow icon={Phone}          label="Primary Phone"    value={owner.phone}          copyable />
        <InfoRow icon={Phone}          label="Alternative"      value={owner.phoneAlt}        copyable />
        <InfoRow icon={Mail}           label="Email"            value={owner.email}           copyable />
        <InfoRow icon={MessageCircle}  label="WhatsApp"         value={owner.whatsapp}        copyable />
      </Card>

      {/* Identity documents */}
      <Card>
        <CardHeader title="Identity documents" />
        <InfoRow icon={Globe}        label="Nationality"       value={owner.nationality}             />
        <InfoRow icon={CreditCard}   label="Passport Number"   value={owner.passportNumber}   copyable />
        <InfoRow icon={CreditCard}   label="Emirates ID"       value={owner.emiratesId}       copyable />
        <InfoRow icon={CreditCard}   label="ID Expiry"         value={new Date(owner.idExpiry).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />
      </Card>

    </div>
  );
}
