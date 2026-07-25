import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Phone, Mail, MessageCircle, Pencil, Copy, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetQuery, usePutMutation } from '../../../api/apiSlice';
import { selectCurrentPropertyId } from '../../../store/slices/propertiesSlice';
import Card, { CardHeader } from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';

const INP = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] text-slate-800 placeholder:text-slate-300 focus:border-navy-400 focus:ring-2 focus:ring-navy-100 outline-none transition-all bg-white';
const LBL = 'block text-[10.5px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider';

const TITLES = ['Mr', 'Mrs', 'Ms', 'Dr', 'Eng', 'H.H.', 'Sheikh'];

function InfoRow({ icon: Icon, label, value, copyable }) {
  const handleCopy = () => { navigator.clipboard.writeText(value); toast.success(`${label} copied!`); };
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

export default function OwnerTab() {
  const propertyId = useSelector(selectCurrentPropertyId);
  const { data: home = {} } = useGetQuery({ path: '/home-info', params: { propertyId } }, { skip: !propertyId });
  const [updateHomeInfo] = usePutMutation();
  const owner = home.owner ?? {};

  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({});

  const startEdit = () => { setForm({ ...owner }); setEditing(true); };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name?.trim())    { toast.error('First name is required'); return; }
    if (!form.surname?.trim()) { toast.error('Surname is required'); return; }
    try {
      await updateHomeInfo({ path: `/home-info?propertyId=${propertyId}`, body: { owner: { ...owner, ...form } } }).unwrap();
      toast.success('Owner information updated');
      setEditing(false);
    } catch (err) { toast.error(err.data?.error || 'Failed to save'); }
  };

  if (editing) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-navy-900 text-white tracking-wider">EDITING</span>
            <p className="text-[13px] font-semibold text-slate-600">Owner Information</p>
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

        {/* Personal info */}
        <Card>
          <CardHeader title="Personal information" />
          <div className="space-y-4">
            <div>
              <label className={LBL}>Title</label>
              <div className="flex flex-wrap gap-2">
                {TITLES.map((t) => (
                  <button key={t} onClick={() => set('title', t)}
                    className={`px-3.5 py-2 rounded-xl text-[12px] font-bold border transition-all ${form.title === t ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LBL}>First Name *</label>
                <input value={form.name} onChange={(e) => set('name', e.target.value)} className={INP} placeholder="First name" />
              </div>
              <div>
                <label className={LBL}>Surname *</label>
                <input value={form.surname} onChange={(e) => set('surname', e.target.value)} className={INP} placeholder="Last name" />
              </div>
            </div>
            <div>
              <label className={LBL}>Nationality</label>
              <input value={form.nationality} onChange={(e) => set('nationality', e.target.value)} className={INP} placeholder="e.g. British" />
            </div>
          </div>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader title="Contact information" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: 'phone',    label: 'Primary Phone',   placeholder: '+971 50 …' },
              { key: 'phoneAlt', label: 'Alternative Phone',placeholder: '+971 55 …' },
              { key: 'email',    label: 'Email',            placeholder: 'email@example.com' },
              { key: 'whatsapp', label: 'WhatsApp',         placeholder: '+971 50 …' },
            ].map((f) => (
              <div key={f.key}>
                <label className={LBL}>{f.label}</label>
                <input value={form[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} className={INP} placeholder={f.placeholder} />
              </div>
            ))}
          </div>
        </Card>

      </div>
    );
  }

  /* ── Read view ── */
  const fullName = [owner.title, owner.name, owner.surname].filter(Boolean).join(' ') || '—';

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Owner information"
          action={
            <button onClick={startEdit} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          }
        />
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-md text-white text-2xl font-black"
            style={{ background: 'linear-gradient(135deg, #0b1d3a 0%, #1e3a6e 100%)' }}>
            {owner.name?.[0] ?? 'O'}
          </div>
          <div>
            <p className="text-xl font-black text-navy-900 tracking-tight">{fullName}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge variant="default" size="sm">{owner.nationality}</Badge>
              <Badge variant="primary" size="sm" dot>Home Owner</Badge>
            </div>
          </div>
        </div>
        <InfoRow icon={Phone}         label="Primary Phone"  value={owner.phone}    copyable />
        <InfoRow icon={Phone}         label="Alternative"    value={owner.phoneAlt} copyable />
        <InfoRow icon={Mail}          label="Email"          value={owner.email}    copyable />
        <InfoRow icon={MessageCircle} label="WhatsApp"       value={owner.whatsapp} copyable />
      </Card>
    </div>
  );
}
