import { Car, User, Phone, FileText, Shield, Info, TrendingUp, Fuel, AlertTriangle, Clock, DollarSign } from 'lucide-react';
import { useGetQuery } from '../../../api/apiSlice';

const fmt     = (n) => Number(n).toLocaleString('en-AE', { maximumFractionDigits: 0 });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
const daysUntil = (d) => d ? Math.ceil((new Date(d) - new Date()) / 86400000) : null;

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

function ExpiryBadge({ label, date }) {
  const days = daysUntil(date);
  if (days === null) return null;
  const isOver = days < 0;
  const isSoon = days >= 0 && days <= 30;
  if (!isOver && !isSoon) return null;
  return (
    <div className={`mt-3 flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-[12px] font-semibold ${
      isOver ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'
    }`}>
      {isOver ? <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> : <Clock className="w-3.5 h-3.5 shrink-0" />}
      {label}: {isOver ? `expired ${Math.abs(days)} days ago` : `expires in ${days} days`}
    </div>
  );
}

export default function OverviewTab({ car }) {
  const { data: stats } = useGetQuery({ path: `/cars/${car.id}/stats` }, { skip: !car?.id });

  const regDays = daysUntil(car.registrationExpiry);
  const insDays = daysUntil(car.insuranceExpiry);
  const hasAlert = (regDays !== null && regDays <= 30) || (insDays !== null && insDays <= 30);

  return (
    <div className="space-y-5">

      {/* Live Stats Banner */}
      {stats && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0b1d3a 0%, #152d5e 100%)', boxShadow: '0 4px 24px rgba(11,29,58,0.22)' }}>
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-3.5 h-3.5 text-white/40" />
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">All-Time Spend</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total Expenses', value: `AED ${fmt(stats.allTime?.expenses ?? 0)}`, color: '#93c5fd' },
                { label: 'Fuel Cost',      value: `AED ${fmt(stats.allTime?.fuel ?? 0)}`,     color: '#fcd34d' },
                { label: 'Combined Total', value: `AED ${fmt(stats.allTime?.combined ?? 0)}`, color: '#c4b5fd' },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</p>
                  <p className="text-[20px] font-black leading-none tracking-tight text-white">{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* This month strip */}
          <div className="border-t border-white/8 bg-black/12 px-5 py-3 flex items-center gap-6 flex-wrap">
            <span className="text-[10px] font-bold text-white/35 uppercase tracking-widest">This Month</span>
            {[
              { label: 'Expenses', val: stats.thisMonth?.expenses ?? 0, color: '#93c5fd' },
              { label: 'Fuel',     val: stats.thisMonth?.fuel     ?? 0, color: '#fcd34d' },
            ].map((s) => (
              <span key={s.label} className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</span>
                <span className="text-[13px] font-bold" style={{ color: s.val > 0 ? s.color : 'rgba(255,255,255,0.25)' }}>
                  {s.val > 0 ? `AED ${fmt(s.val)}` : '—'}
                </span>
              </span>
            ))}
            {(stats.allTime?.fillCount ?? 0) > 0 && (
              <span className="flex items-center gap-1.5 ml-auto">
                <span className="text-[10px] font-semibold text-white/35">Avg Fill</span>
                <span className="text-[13px] font-bold text-amber-200">AED {fmt(stats.allTime?.avgFill ?? 0)}</span>
                <span className="text-[10px] text-white/25">· {stats.allTime.fillCount} fills</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Expiry alerts */}
      {hasAlert && (
        <div className="space-y-2">
          <ExpiryBadge label="Registration" date={car.registrationExpiry} />
          <ExpiryBadge label="Insurance"    date={car.insuranceExpiry} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Vehicle Details */}
        <Card title="Vehicle Details" icon={Car} iconBg="#eff6ff">
          <InfoRow label="Make"           value={car.make} />
          <InfoRow label="Model"          value={car.model} />
          <InfoRow label="Year"           value={car.year} />
          <InfoRow label="Color"          value={car.colorName} />
          <InfoRow label="Category"       value={car.category} />
          <InfoRow label="VIN"            value={car.vin} />
          <InfoRow label="Odometer"       value={car.odometer ? `${car.odometer.toLocaleString()} km` : null} />
          <InfoRow label="Purchase Date"  value={fmtDate(car.purchaseDate)} />
          <InfoRow label="Purchase Price" value={car.purchasePrice ? `AED ${car.purchasePrice.toLocaleString()}` : null} />
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
          <InfoRow label="Expiry Date"       value={fmtDate(car.registrationExpiry)} />
          <InfoRow label="Renewal Fee"       value={car.registrationFee ? `AED ${car.registrationFee.toLocaleString()}` : null} />
          <ExpiryBadge label="Registration" date={car.registrationExpiry} />
          {!hasAlert && (
            <div className="mt-3 p-3.5 rounded-xl bg-blue-50 border border-blue-100">
              <div className="flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] font-bold text-blue-700 mb-0.5">Dubai RTA Rule</p>
                  <p className="text-[11px] text-blue-600 leading-relaxed">
                    Vehicles must renew registration annually. Fines apply for expired Mulkiya.
                    RTA inspection required at renewal.
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Insurance */}
        <Card title="Insurance" icon={Shield} iconBg="#faf5ff">
          <InfoRow label="Insurance Company" value={car.insuranceCompany} />
          <InfoRow label="Policy Number"     value={car.insurancePolicy} />
          <InfoRow label="Expiry Date"       value={fmtDate(car.insuranceExpiry)} />
          <InfoRow label="Coverage Type"     value="Comprehensive" />
          <ExpiryBadge label="Insurance" date={car.insuranceExpiry} />
          <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
            <p className="text-[11px] text-emerald-700 font-medium">
              Comprehensive coverage — third-party, own damage &amp; theft included
            </p>
          </div>
        </Card>

      </div>
    </div>
  );
}
