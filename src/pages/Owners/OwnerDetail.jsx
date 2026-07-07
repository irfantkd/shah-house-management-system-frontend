import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Cake, Phone, Mail, Pencil, Trash2,
  BadgeCheck, X, Home,
} from 'lucide-react';
import { selectOwners, updateOwner, deleteOwner } from '../../store/slices/ownersSlice';
import toast from 'react-hot-toast';

const AVATAR_COLORS = [
  '#2563eb','#7c3aed','#059669','#dc2626',
  '#d97706','#0891b2','#db2777','#16a34a',
];
const avatarColor = (name = '') => {
  const s = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[s % AVATAR_COLORS.length];
};
const initials = (n = '') =>
  n.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const calcAge = (dob) => {
  const t = new Date(), d = new Date(dob);
  let a = t.getFullYear() - d.getFullYear();
  if (t < new Date(t.getFullYear(), d.getMonth(), d.getDate())) a--;
  return a;
};
const nextBday = (dob) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dob);
  const yr = today.getFullYear();
  let next = new Date(yr, d.getMonth(), d.getDate());
  if (next < today) next = new Date(yr + 1, d.getMonth(), d.getDate());
  return Math.round((next - today) / 86_400_000);
};

const INP   = 'w-full h-11 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 transition-all';
const BLANK = { name: '', phone: '', email: '', dateOfBirth: '', notes: '' };

function InfoRow({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-slate-100 last:border-0">
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: `${color}15` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-[15px] font-semibold text-slate-800 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function OwnerDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const owners   = useSelector(selectOwners);
  const own      = owners.find((o) => o.id === id);

  const [editDrawer, setEditDrawer] = useState(false);
  const [delOpen,    setDelOpen]    = useState(false);
  const [form,       setForm]       = useState(BLANK);
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openEdit = () => { setForm({ ...BLANK, ...own }); setEditDrawer(true); };
  const handleSave = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');
    dispatch(updateOwner({ ...form, id: own.id }));
    toast.success('Owner updated');
    setEditDrawer(false);
  };
  const handleDelete = () => {
    dispatch(deleteOwner(own.id));
    toast.success(`${own.name} removed`);
    navigate('/owners');
  };

  if (!own) {
    return (
      <div className="text-center py-24">
        <p className="text-slate-400 font-semibold mb-4">Owner not found</p>
        <Link to="/owners" className="text-blue-600 font-bold hover:underline">← Back to Owners</Link>
      </div>
    );
  }

  const color          = avatarColor(own.name);
  const bdayDays       = own.dateOfBirth ? nextBday(own.dateOfBirth) : null;
  const showBdayBadge  = bdayDays !== null && bdayDays <= 7;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        className="max-w-xl mx-auto">

        <div className="rounded-3xl overflow-hidden"
          style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.07), 0 20px 60px rgba(0,0,0,0.13)' }}>

          {/* ════════════════════════════════════════
              HERO HEADER
              Avatar sits INSIDE the header section so
              overflow-hidden never clips it. The avatar
              is large and centred below the nav row.
          ════════════════════════════════════════ */}
          <div
            className="relative overflow-hidden px-6 pt-4 pb-6"
            style={{ background: 'linear-gradient(150deg, #060e1e 0%, #091833 55%, #0d2147 100%)' }}>

            {/* Accent bar */}
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:color, opacity:0.9 }} />

            {/* Decorative rings */}
            <div style={{ position:'absolute', top:-44, right:-44, width:180, height:180, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.05)', pointerEvents:'none' }} />
            <div style={{ position:'absolute', top:-22, right:-22, width:110, height:110, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.08)', pointerEvents:'none' }} />

            {/* Ghost watermark */}
            <div style={{
              position:'absolute', right:14, bottom:-8,
              fontSize:120, fontWeight:900, lineHeight:1,
              color:'rgba(255,255,255,0.04)',
              letterSpacing:'-5px',
              userSelect:'none', pointerEvents:'none',
            }}>
              {initials(own.name)}
            </div>

            {/* Nav row — back + edit + delete */}
            <div className="relative flex items-center justify-between mb-5" style={{ zIndex: 5 }}>
              <Link to="/owners"
                className="flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/18 border border-white/10 transition-all"
                style={{ color: 'rgba(255,255,255,0.65)' }}>
                <ChevronLeft className="w-4 h-4" /> Owners
              </Link>
              <div className="flex gap-2">
                <button onClick={openEdit}
                  className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 text-white/70 hover:text-white hover:bg-white/20 border border-white/10 transition-all">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => setDelOpen(true)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 text-white/70 hover:text-red-300 hover:bg-red-500/25 border border-white/10 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Avatar + name — centred, fully inside header */}
            <div className="relative flex flex-col items-center text-center gap-3" style={{ zIndex: 5 }}>
              {/* Avatar */}
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center text-white text-[28px] font-black select-none"
                style={{
                  background: color,
                  border: '3px solid rgba(255,255,255,0.2)',
                  boxShadow: `0 8px 28px ${color}70, 0 0 0 1px rgba(255,255,255,0.08)`,
                }}>
                {initials(own.name)}
              </div>

              {/* Name + subtitle */}
              <div>
                <p className="text-[24px] font-black text-white leading-tight">{own.name}</p>
                <p className="text-[12px] font-semibold mt-1" style={{ color: 'rgba(255,255,255,0.38)' }}>
                  Shah House · Owner
                </p>
              </div>

              {/* Birthday badge */}
              {showBdayBadge && (
                <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-bold text-white"
                  style={{ background: '#f59e0b', boxShadow: '0 2px 10px rgba(245,158,11,0.5)' }}>
                  <Cake className="w-3.5 h-3.5" />
                  {bdayDays === 0 ? '🎉 Birthday Today!' : `Birthday in ${bdayDays} days`}
                </div>
              )}
            </div>
          </div>

          {/* ════════════════════════════════════════
              WHITE BODY — info rows + actions
          ════════════════════════════════════════ */}
          <div className="bg-white px-6 pb-6 pt-5">

            {/* Section label */}
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Owner Information
            </p>

            {/* Info rows */}
            <div>
              {own.dateOfBirth && (
                <InfoRow icon={Cake} label="Date of Birth" color={color}
                  value={`${fmtDate(own.dateOfBirth)}  ·  ${calcAge(own.dateOfBirth)} years old`} />
              )}
              {own.phone && (
                <InfoRow icon={Phone} label="Phone Number" color={color} value={own.phone} />
              )}
              {own.email && (
                <InfoRow icon={Mail}  label="Email Address" color={color} value={own.email} />
              )}
              {!own.dateOfBirth && !own.phone && !own.email && (
                <p className="text-[13px] text-slate-400 py-4 text-center">No details recorded yet</p>
              )}
            </div>

            {/* Notes */}
            {own.notes && (
              <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Notes</p>
                <p className="text-[14px] text-slate-700 leading-relaxed">{own.notes}</p>
              </div>
            )}

            {/* Footer actions */}
            <div className="flex items-center gap-3 mt-6 pt-5 border-t border-slate-100">
              <button onClick={openEdit}
                className="flex-1 h-11 rounded-2xl border-2 border-slate-200 text-[14px] font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 transition-all">
                <Pencil className="w-4 h-4" /> Edit Owner
              </button>
              <button onClick={() => setDelOpen(true)}
                className="h-11 w-11 rounded-2xl border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Edit Drawer ── */}
      <AnimatePresence>
        {editDrawer && (
          <>
            <motion.div key="ed-bg"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setEditDrawer(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
            <motion.div key="ed-panel"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 flex flex-col shadow-2xl">

              <div className="px-6 py-5 shrink-0 flex items-center justify-between"
                style={{ background: 'linear-gradient(150deg, #060e1e, #091833)' }}>
                <div>
                  <p className="text-[16px] font-black text-white">Edit Owner</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Shah House</p>
                </div>
                <button onClick={() => setEditDrawer(false)}
                  className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-4 shrink-0 bg-slate-50">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-[16px] font-black"
                  style={{ background: form.name ? avatarColor(form.name) : '#cbd5e1' }}>
                  {form.name ? initials(form.name) : <Home className="w-5 h-5 text-white/60" />}
                </div>
                <div>
                  <p className="text-[15px] font-bold text-slate-800">{form.name || 'Owner'}</p>
                  <p className="text-[12px] text-slate-400">
                    {form.dateOfBirth ? `${calcAge(form.dateOfBirth)} years old` : 'Shah House Owner'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {[
                  { label: 'Full Name *',     key: 'name',        type: 'text',  placeholder: 'e.g. Mirfan Shah', required: true },
                  { label: 'Date of Birth *', key: 'dateOfBirth', type: 'date',  placeholder: '',                 required: true },
                  { label: 'Phone Number',    key: 'phone',       type: 'text',  placeholder: '+971 50 000 0000' },
                  { label: 'Email Address',   key: 'email',       type: 'email', placeholder: 'email@example.com' },
                ].map(({ label, key, type, placeholder, required }) => (
                  <div key={key}>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{label}</label>
                    <input
                      value={form[key] ?? ''}
                      onChange={(e) => setF(key, e.target.value)}
                      type={type}
                      required={required}
                      placeholder={placeholder}
                      className={INP} />
                    {key === 'dateOfBirth' && form.dateOfBirth && (
                      <p className="text-[12px] text-slate-400 mt-1.5 ml-1">{calcAge(form.dateOfBirth)} years old</p>
                    )}
                  </div>
                ))}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Notes</label>
                  <textarea value={form.notes ?? ''} onChange={(e) => setF('notes', e.target.value)}
                    rows={3} placeholder="Any additional notes…" className={`${INP} h-auto py-3 resize-none`} />
                </div>
              </form>

              <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0">
                <button type="button" onClick={() => setEditDrawer(false)}
                  className="flex-1 h-11 rounded-2xl border-2 border-slate-200 text-[14px] font-bold text-slate-600 hover:bg-slate-50 transition-all">
                  Cancel
                </button>
                <button onClick={handleSave}
                  className="flex-1 h-11 rounded-2xl text-[14px] font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                  style={{ background: 'linear-gradient(135deg,#060e1e,#0d2147)', boxShadow: '0 4px 14px rgba(6,14,30,0.35)' }}>
                  <BadgeCheck className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Delete confirm ── */}
      <AnimatePresence>
        {delOpen && (
          <>
            <motion.div key="del-bg"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDelOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
            <motion.div key="del-modal"
              initial={{ opacity: 0, scale: 0.88, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
              <div className="bg-white rounded-3xl p-7 w-full max-w-xs pointer-events-auto text-center"
                style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }}>
                <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-7 h-7 text-red-500" />
                </div>
                <h3 className="text-[17px] font-black text-slate-900 mb-2">Remove Owner?</h3>
                <p className="text-[13px] text-slate-500 leading-relaxed mb-6">
                  <strong className="text-slate-700">{own.name}</strong> will be permanently removed.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setDelOpen(false)}
                    className="flex-1 h-11 rounded-2xl border-2 border-slate-200 text-[14px] font-bold text-slate-600 hover:bg-slate-50 transition-all">
                    Cancel
                  </button>
                  <button onClick={handleDelete}
                    className="flex-1 h-11 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-[14px] font-bold transition-colors">
                    Remove
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
