import { Car, User, Phone, FileText, Shield, Hash, Gauge, CalendarDays, Banknote, Info } from 'lucide-react';

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0 gap-4">
      <span className="text-[12px] text-slate-500 shrink-0">{label}</span>
      <span className="text-[13px] font-semibold text-slate-800 text-right truncate max-w-[58%]">{value ?? '—'}</span>
    </div>
  );
}

function Card({ title, icon: Icon, iconBg = '#f8fafc', children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: iconBg }}>
          <Icon className="w-4 h-4 text-slate-600" />
        </div>
        <p className="text-[14px] font-bold text-slate-800">{title}</p>
      </div>
      {children}
    </div>
  );
}

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

export default function OverviewTab({ car }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

      {/* Vehicle Details */}
      <Card title="Vehicle Details" icon={Car} iconBg="#eff6ff">
        <InfoRow label="Make"              value={car.make} />
        <InfoRow label="Model"             value={car.model} />
        <InfoRow label="Year"              value={car.year} />
        <InfoRow label="Color"             value={car.colorName} />
        <InfoRow label="Category"          value={car.category} />
        <InfoRow label="VIN"               value={car.vin} />
        <InfoRow label="Odometer"          value={car.odometer ? `${car.odometer.toLocaleString()} km` : null} />
        <InfoRow label="Purchase Date"     value={fmt(car.purchaseDate)} />
        <InfoRow label="Purchase Price"    value={car.purchasePrice ? `AED ${car.purchasePrice.toLocaleString()}` : null} />
      </Card>

      {/* Driver Information */}
      <Card title="Driver Information" icon={User} iconBg="#f0fdf4">
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 mb-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #0b1d3a, #1e3a6e)' }}>
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-slate-800 leading-tight">{car.driverName || 'Not assigned'}</p>
            {car.driverPhone && (
              <p className="text-[12px] text-slate-500 mt-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> {car.driverPhone}
              </p>
            )}
          </div>
        </div>
        {car.notes && (
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
            <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wide mb-1">Notes</p>
            <p className="text-[13px] text-slate-700 leading-relaxed">{car.notes}</p>
          </div>
        )}
      </Card>

      {/* Registration */}
      <Card title="Registration — Dubai (Annual)" icon={FileText} iconBg="#f0fdf4">
        <InfoRow label="Registration No." value={car.registrationNumber} />
        <InfoRow label="Expiry Date"       value={fmt(car.registrationExpiry)} />
        <InfoRow label="Renewal Fee"       value={car.registrationFee ? `AED ${car.registrationFee.toLocaleString()}` : null} />

        <div className="mt-3 p-3.5 rounded-xl bg-blue-50 border border-blue-100">
          <div className="flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] font-bold text-blue-700 mb-0.5">Dubai RTA Rule</p>
              <p className="text-[11px] text-blue-600 leading-relaxed">
                All vehicles in Dubai must renew their registration annually. Fines apply for expired registration.
                Renewal includes an RTA vehicle inspection and Mulkiya certificate update.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Insurance */}
      <Card title="Insurance" icon={Shield} iconBg="#faf5ff">
        <InfoRow label="Insurance Company"  value={car.insuranceCompany} />
        <InfoRow label="Policy Number"      value={car.insurancePolicy} />
        <InfoRow label="Expiry Date"        value={fmt(car.insuranceExpiry)} />
        <InfoRow label="Coverage Type"      value="Comprehensive" />

        <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-2.5">
          <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
          <p className="text-[11px] text-emerald-700 font-medium">
            Comprehensive coverage — third-party, own damage & theft included
          </p>
        </div>
      </Card>

    </div>
  );
}
