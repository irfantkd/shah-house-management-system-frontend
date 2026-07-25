import { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Shield, Phone, Mail, Calendar, CreditCard, DollarSign,
  CheckCircle2, Pencil, AlertTriangle, Save, X, Plus, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetQuery, usePutMutation } from '../../../api/apiSlice';
import { selectCurrentPropertyId } from '../../../store/slices/propertiesSlice';
import Card, { CardHeader } from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';

const INP = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] text-slate-800 placeholder:text-slate-300 focus:border-navy-400 focus:ring-2 focus:ring-navy-100 outline-none transition-all bg-white';
const LBL = 'block text-[10.5px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
const fmtAED  = (n) => `AED ${(+n || 0).toLocaleString('en-AE', { minimumFractionDigits: 0 })}`;

function daysUntil(dateStr) {
  return dateStr ? Math.ceil((new Date(dateStr) - new Date()) / 86400000) : null;
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-slate-500" />
      </div>
      <div>
        <p className="text-[10.5px] text-slate-400 font-semibold uppercase tracking-wider">{label}</p>
        <p className="text-[13px] font-semibold text-slate-800">{value || '—'}</p>
      </div>
    </div>
  );
}

export default function InsuranceTab() {
  const propertyId = useSelector(selectCurrentPropertyId);
  const { data: home = {} } = useGetQuery({ path: '/home-info', params: { propertyId } }, { skip: !propertyId });
  const [updateHomeInfo] = usePutMutation();
  const insurance = home.insurance ?? {};

  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({});
  const [newBenefit, setNewBenefit] = useState('');

  const startEdit = () => { setForm({ ...insurance, benefits: [...(insurance.benefits ?? [])] }); setEditing(true); };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addBenefit = () => {
    const v = newBenefit.trim();
    if (!v) return;
    set('benefits', [...(form.benefits ?? []), v]);
    setNewBenefit('');
  };
  const removeBenefit = (i) => set('benefits', form.benefits.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!form.provider?.trim())     { toast.error('Provider name is required'); return; }
    if (!form.policyNumber?.trim()) { toast.error('Policy number is required'); return; }
    try {
      await updateHomeInfo({ path: `/home-info?propertyId=${propertyId}`, body: { insurance: { ...insurance, ...form, coverage: +form.coverage, premium: +form.premium, renewalReminder: +form.renewalReminder } } }).unwrap();
      toast.success('Insurance details updated');
      setEditing(false);
    } catch (err) { toast.error(err.data?.error || 'Failed to save'); }
  };

  const hasPolicy     = !!insurance.provider;
  const daysLeft      = daysUntil(insurance.expiryDate);
  const expiryStatus  = daysLeft !== null ? (daysLeft < 30 ? 'danger' : daysLeft < 90 ? 'warning' : 'ok') : 'ok';

  if (editing) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-navy-900 text-white tracking-wider">EDITING</span>
            <p className="text-[13px] font-semibold text-slate-600">Insurance Information</p>
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

        {/* Policy details */}
        <Card>
          <CardHeader title="Policy details" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={LBL}>Provider Name *</label>
              <input value={form.provider ?? ''} onChange={(e) => set('provider', e.target.value)} className={INP} placeholder="e.g. Emirates Insurance Company" />
            </div>
            <div>
              <label className={LBL}>Policy Number *</label>
              <input value={form.policyNumber ?? ''} onChange={(e) => set('policyNumber', e.target.value)} className={INP} placeholder="e.g. EIC-2024-78432" />
            </div>
            <div>
              <label className={LBL}>Policy Type</label>
              <input value={form.type ?? ''} onChange={(e) => set('type', e.target.value)} className={INP} placeholder="e.g. Comprehensive Home Insurance" />
            </div>
            <div>
              <label className={LBL}>Coverage Amount (AED)</label>
              <input type="number" min="0" value={form.coverage ?? ''} onChange={(e) => set('coverage', e.target.value)} className={INP} placeholder="e.g. 2500000" />
            </div>
            <div>
              <label className={LBL}>Annual Premium (AED)</label>
              <input type="number" min="0" value={form.premium ?? ''} onChange={(e) => set('premium', e.target.value)} className={INP} placeholder="e.g. 12500" />
            </div>
            <div>
              <label className={LBL}>Start Date</label>
              <input type="date" value={form.startDate ?? ''} onChange={(e) => set('startDate', e.target.value)} className={INP} />
            </div>
            <div>
              <label className={LBL}>Expiry Date</label>
              <input type="date" value={form.expiryDate ?? ''} onChange={(e) => set('expiryDate', e.target.value)} className={INP} />
            </div>
            <div>
              <label className={LBL}>Renewal Reminder (days before)</label>
              <input type="number" min="1" max="365" value={form.renewalReminder ?? 30} onChange={(e) => set('renewalReminder', e.target.value)} className={INP} />
            </div>
          </div>
        </Card>

        {/* Insurer contact */}
        <Card>
          <CardHeader title="Insurer contact" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LBL}>Contact Phone</label>
              <input value={form.contactPhone ?? ''} onChange={(e) => set('contactPhone', e.target.value)} className={INP} placeholder="+971 4 …" />
            </div>
            <div>
              <label className={LBL}>Contact Email</label>
              <input value={form.contactEmail ?? ''} onChange={(e) => set('contactEmail', e.target.value)} className={INP} placeholder="claims@example.ae" />
            </div>
          </div>
        </Card>

        {/* Benefits */}
        <Card>
          <CardHeader title="Coverage benefits" />
          <div className="space-y-2 mb-4">
            {(form.benefits ?? []).map((b, i) => (
              <div key={i} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-[13px] font-medium text-emerald-800 flex-1">{b}</span>
                <button onClick={() => removeBenefit(i)} className="w-6 h-6 rounded-lg flex items-center justify-center text-emerald-400 hover:text-red-400 hover:bg-red-50 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {(form.benefits ?? []).length === 0 && (
              <p className="text-[12px] text-slate-400 italic">No benefits listed yet</p>
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={newBenefit}
              onChange={(e) => setNewBenefit(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addBenefit()}
              className={`${INP} flex-1`}
              placeholder="e.g. Fire & flood coverage"
            />
            <button onClick={addBenefit} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12px] font-bold text-white transition-all shrink-0" style={{ background: '#0b1d3a' }}>
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
        </Card>
      </div>
    );
  }

  /* ── Read view ── */
  return (
    <div className="space-y-5">
      {/* Hero card */}
      <div className="rounded-2xl p-7 relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #060f1e 0%, #0b1d3a 55%, #0d2449 100%)' }}>
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, transparent, #C9A227 40%, #C9A227 60%, transparent)' }} />
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-5" style={{ background: 'white' }} />
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(201,162,39,0.15)', border: '1px solid rgba(201,162,39,0.3)' }}>
                <Shield className="w-5 h-5 text-[#C9A227]" />
              </div>
              {hasPolicy ? (
                <Badge variant="default" size="sm" className="bg-emerald-500/15! text-emerald-300! border-emerald-500/20!">
                  Active Policy
                </Badge>
              ) : (
                <Badge variant="default" size="sm" className="bg-white/10! text-white/45! border-white/20!">
                  Not Configured
                </Badge>
              )}
            </div>
            <p className="text-white/45 text-[10.5px] font-bold uppercase tracking-widest mb-1">Coverage Amount</p>
            <p className="text-3xl font-black text-white tracking-tight">
              {insurance.coverage ? fmtAED(insurance.coverage) : '—'}
            </p>
            <p className="text-white/40 text-[12px] mt-1">
              {insurance.provider || 'No provider set'}
            </p>
          </div>
          <button onClick={startEdit} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-all border border-white/15 shrink-0">
            <Pencil className="w-3.5 h-3.5" /> {hasPolicy ? 'Edit' : 'Add'}
          </button>
        </div>

        {hasPolicy && (
          <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Policy Number',    value: insurance.policyNumber || '—' },
              { label: 'Annual Premium',   value: insurance.premium ? fmtAED(insurance.premium) : '—' },
              { label: 'Renewal Reminder', value: insurance.renewalReminder ? `${insurance.renewalReminder} days before` : '—' },
            ].map((f) => (
              <div key={f.label}>
                <p className="text-white/38 text-[10px] font-bold uppercase tracking-wider">{f.label}</p>
                <p className="text-white font-bold text-[13px] mt-0.5">{f.value}</p>
              </div>
            ))}
          </div>
        )}

        {!hasPolicy && (
          <div className="mt-6 pt-5 border-t border-white/10">
            <p className="text-white/35 text-[13px]">Click <span className="text-white/70 font-semibold">Add</span> to record your home insurance policy details.</p>
          </div>
        )}
      </div>

      {/* Expiry alert — only when policy is active and near expiry */}
      {hasPolicy && daysLeft !== null && daysLeft < 90 && (
        <div className={`flex items-center gap-3 p-4 rounded-2xl border ${expiryStatus === 'danger' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
          <AlertTriangle className={`w-5 h-5 shrink-0 ${expiryStatus === 'danger' ? 'text-red-500' : 'text-amber-500'}`} />
          <div className="flex-1">
            <p className={`text-[13px] font-bold ${expiryStatus === 'danger' ? 'text-red-700' : 'text-amber-700'}`}>
              Policy expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
            </p>
            <p className={`text-[12px] mt-0.5 ${expiryStatus === 'danger' ? 'text-red-500' : 'text-amber-600'}`}>
              Contact {insurance.provider} to renew before {fmtDate(insurance.expiryDate)}.
            </p>
          </div>
        </div>
      )}

      {/* Policy details */}
      <Card>
        <CardHeader title="Policy details" />
        <InfoRow icon={Shield}     label="Provider"      value={insurance.provider}           />
        <InfoRow icon={CreditCard} label="Policy Type"   value={insurance.type}               />
        <InfoRow icon={Calendar}   label="Start Date"    value={fmtDate(insurance.startDate)} />
        <InfoRow icon={Calendar}   label="Expiry Date"   value={fmtDate(insurance.expiryDate)}/>
        <InfoRow icon={Phone}      label="Contact Phone" value={insurance.contactPhone}        />
        <InfoRow icon={Mail}       label="Contact Email" value={insurance.contactEmail}        />
      </Card>

      {/* Coverage benefits */}
      {(insurance.benefits ?? []).length > 0 && (
        <Card>
          <CardHeader title="Coverage includes" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {insurance.benefits.map((b) => (
              <div key={b} className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-[13px] text-emerald-700 font-medium">{b}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
