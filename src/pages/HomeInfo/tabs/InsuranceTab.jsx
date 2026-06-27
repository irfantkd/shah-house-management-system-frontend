import { Shield, Phone, Mail, Calendar, CreditCard, DollarSign, CheckCircle2, Pencil, AlertTriangle } from 'lucide-react';
import Card, { CardHeader } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';

function getDaysUntilExpiry(dateStr) {
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
}

export default function InsuranceTab({ insurance, onEdit }) {
  const daysLeft = getDaysUntilExpiry(insurance.expiryDate);
  const expiryStatus = daysLeft < 30 ? 'danger' : daysLeft < 90 ? 'warning' : 'success';

  return (
    <div className="space-y-5">

      {/* Insurance hero card */}
      <div className="rounded-2xl bg-gradient-to-br from-navy-900 to-navy-800 p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/[0.03] rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-1/2 w-32 h-32 bg-accent-600/10 rounded-full translate-y-1/2" />

        <div className="flex items-start justify-between relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                <Shield className="w-4.5 h-4.5 text-white" />
              </div>
              <Badge variant="default" size="sm" className="bg-white/10 text-white/80 border-0">Active</Badge>
            </div>
            <p className="text-white/50 text-[11px] font-medium uppercase tracking-widest mb-1">Coverage Amount</p>
            <p className="text-3xl font-bold text-white tracking-tight">
              AED {insurance.coverage.toLocaleString()}
            </p>
          </div>
          <Button variant="outline" size="sm" icon={Pencil} onClick={onEdit}
            className="!bg-white/10 !border-white/20 !text-white hover:!bg-white/20"
          >
            Edit
          </Button>
        </div>

        <div className="mt-5 pt-5 border-t border-white/10 grid grid-cols-2 gap-4 relative z-10">
          <div>
            <p className="text-white/40 text-[11px] font-medium">Policy Number</p>
            <p className="text-white font-semibold text-[13px] mt-0.5">{insurance.policyNumber}</p>
          </div>
          <div>
            <p className="text-white/40 text-[11px] font-medium">Annual Premium</p>
            <p className="text-white font-semibold text-[13px] mt-0.5">AED {insurance.premium.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Expiry alert */}
      {daysLeft < 90 && (
        <div className={`flex items-center gap-3 p-4 rounded-2xl border ${
          expiryStatus === 'danger'
            ? 'bg-danger-50 border-danger-100'
            : 'bg-warning-50 border-warning-100'
        }`}>
          <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${expiryStatus === 'danger' ? 'text-danger-500' : 'text-warning-500'}`} />
          <div className="flex-1">
            <p className={`text-[13px] font-semibold ${expiryStatus === 'danger' ? 'text-danger-700' : 'text-warning-700'}`}>
              Insurance expires in {daysLeft} days
            </p>
            <p className={`text-[12px] mt-0.5 ${expiryStatus === 'danger' ? 'text-danger-500' : 'text-warning-500'}`}>
              Contact {insurance.provider} to renew your policy.
            </p>
          </div>
          <Button variant={expiryStatus === 'danger' ? 'danger' : 'warning'} size="sm">Renew now</Button>
        </div>
      )}

      {/* Policy details */}
      <Card>
        <CardHeader title="Policy details" />
        <div className="space-y-0">
          {[
            { icon: Shield,       label: 'Provider',      value: insurance.provider             },
            { icon: CreditCard,   label: 'Type',          value: insurance.type                 },
            { icon: Calendar,     label: 'Start date',    value: new Date(insurance.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) },
            { icon: Calendar,     label: 'Expiry date',   value: new Date(insurance.expiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) },
            { icon: Phone,        label: 'Contact',       value: insurance.contactPhone          },
            { icon: Mail,         label: 'Email',         value: insurance.contactEmail          },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                <row.icon className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-medium">{row.label}</p>
                <p className="text-[13px] font-semibold text-slate-800">{row.value}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Coverage benefits */}
      <Card>
        <CardHeader title="Coverage includes" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {insurance.benefits.map((benefit) => (
            <div key={benefit} className="flex items-center gap-2.5 p-3 rounded-xl bg-success-50 border border-success-100">
              <CheckCircle2 className="w-4 h-4 text-success-600 flex-shrink-0" />
              <span className="text-[13px] text-success-700 font-medium">{benefit}</span>
            </div>
          ))}
        </div>
      </Card>

    </div>
  );
}
