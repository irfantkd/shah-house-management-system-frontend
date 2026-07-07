import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus, Cake, Phone, Mail, ArrowRight,
  Pencil, Trash2, BadgeCheck, Home, X,
} from 'lucide-react';
import {
  selectOwners, selectOwnerBirthdays,
  addOwner, updateOwner, deleteOwner,
} from '../../store/slices/ownersSlice';
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

const BLANK = { name: '', phone: '', email: '', dateOfBirth: '', notes: '' };
const INP   = 'w-full h-11 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 transition-all';

// ── Card ──────────────────────────────────────────────────────────────────────
function OwnerCard({ own, bday, onEdit, onDelete }) {
  const color = avatarColor(own.name);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3 }}
      className="group rounded-3xl overflow-hidden bg-white flex flex-col"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.1)' }}>

      {/* ══════════════ HEADER ══════════════
          Avatar sits INSIDE the header to avoid
          any overflow-hidden clipping issues.
          The avatar + name are side-by-side in a row.
      ════════════════════════════════════ */}
      <div
        className="relative px-5 pt-4 pb-4 overflow-hidden"
        style={{ background: 'linear-gradient(150deg, #0a172e 0%, #0c1f3f 55%, #0e2550 100%)' }}>

        {/* Decorative circles */}
        <div style={{ position:'absolute', top:-36, right:-36, width:130, height:130, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.06)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:-18, right:-18, width:80,  height:80,  borderRadius:'50%', border:'1px solid rgba(255,255,255,0.09)', pointerEvents:'none' }} />

        {/* Accent colour bar at very top */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 3, background: color, opacity: 0.9,
        }} />

        {/* Ghost watermark — behind content */}
        <div style={{
          position: 'absolute', right: 12, bottom: -8,
          fontSize: 80, fontWeight: 900, lineHeight: 1,
          color: 'rgba(255,255,255,0.05)',
          letterSpacing: '-3px',
          userSelect: 'none', pointerEvents: 'none',
        }}>
          {initials(own.name)}
        </div>

        {/* Birthday badge */}
        {bday && (
          <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
            style={{ background: '#f59e0b', boxShadow: '0 2px 8px rgba(245,158,11,0.5)', zIndex: 10 }}>
            <Cake className="w-3 h-3" />
            {bday.daysUntilBirthday === 0 ? '🎉 Today!' : `${bday.daysUntilBirthday} days`}
          </div>
        )}

        {/* Avatar + Name row — fully within header */}
        <div className="relative flex items-center gap-4 mt-1" style={{ zIndex: 5 }}>
          {/* Avatar — visible initials, clean border */}
          <div
            className="w-[54px] h-[54px] rounded-2xl shrink-0 flex items-center justify-center text-white text-[20px] font-black select-none"
            style={{
              background: color,
              border: '2.5px solid rgba(255,255,255,0.22)',
              boxShadow: `0 4px 20px ${color}70, 0 0 0 1px rgba(255,255,255,0.08)`,
            }}>
            {initials(own.name)}
          </div>

          {/* Name + subtitle */}
          <div className="min-w-0 flex-1 pr-2">
            <p className="text-[18px] font-black text-white leading-tight truncate">{own.name}</p>
            <p className="text-[11px] font-semibold mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>
              Shah House · Owner
            </p>
          </div>
        </div>

        {/* Edit / delete — visible on hover */}
        <div className="absolute bottom-3.5 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ zIndex: 10 }}>
          <button onClick={onEdit}
            className="w-7 h-7 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/15 border border-white/10 transition-all">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete}
            className="w-7 h-7 rounded-xl flex items-center justify-center text-white/60 hover:text-red-300 hover:bg-red-500/25 border border-white/10 transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ══════════════ BODY ══════════════ */}
      <div className="flex-1 flex flex-col px-5 pt-4 pb-5 gap-3">

        {/* Contact info */}
        <div className="space-y-2.5">
          {own.dateOfBirth && (
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${color}18` }}>
                <Cake className="w-3.5 h-3.5" style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-slate-700">{fmtDate(own.dateOfBirth)}</p>
                {calcAge(own.dateOfBirth) >= 0 && (
                  <p className="text-[11px] text-slate-400">{calcAge(own.dateOfBirth)} years old</p>
                )}
              </div>
            </div>
          )}
          {own.phone && (
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${color}18` }}>
                <Phone className="w-3.5 h-3.5" style={{ color }} />
              </div>
              <p className="text-[13px] font-semibold text-slate-700 truncate">{own.phone}</p>
            </div>
          )}
          {own.email && (
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${color}18` }}>
                <Mail className="w-3.5 h-3.5" style={{ color }} />
              </div>
              <p className="text-[13px] font-semibold text-slate-700 truncate">{own.email}</p>
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* View profile CTA */}
        <div className="border-t border-slate-100 pt-3 mt-1">
          <Link to={`/owners/${own.id}`} className="flex items-center justify-between group/cta">
            <span className="text-[13px] font-bold text-slate-800">View Full Profile</span>
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 group-hover/cta:scale-110 transition-transform"
              style={{ background: color }}>
              <ArrowRight className="w-3.5 h-3.5 text-white" />
            </div>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function OwnersPage() {
  const dispatch  = useDispatch();
  const owners    = useSelector(selectOwners);
  const birthdays = useSelector(selectOwnerBirthdays);

  const [drawer,     setDrawer]     = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);
  const [form,       setForm]       = useState(BLANK);

  const setF     = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const openAdd  = ()     => { setForm(BLANK); setDrawer('add'); };
  const openEdit = (own)  => { setForm({ ...BLANK, ...own }); setDrawer(own); };

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');
    if (!form.dateOfBirth) return toast.error('Date of birth is required');
    if (drawer === 'add') {
      dispatch(addOwner(form));
      toast.success(`${form.name} added`);
    } else {
      dispatch(updateOwner({ ...form, id: drawer.id }));
      toast.success('Owner updated');
    }
    setDrawer(null);
  };

  const handleDelete = () => {
    dispatch(deleteOwner(delConfirm.id));
    toast.success(`${delConfirm.name} removed`);
    setDelConfirm(null);
  };

  return (
    <>
      <div className="space-y-8">

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)', boxShadow: '0 4px 14px rgba(11,29,58,0.35)' }}>
              <Home className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-[22px] font-black text-slate-900 leading-tight">Owners</h1>
              <p className="text-[12px] text-slate-400">Shah House · {owners.length} {owners.length === 1 ? 'owner' : 'owners'}</p>
            </div>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-5 h-10 rounded-2xl text-[13px] font-bold text-white hover:opacity-90 active:scale-[0.97] transition-all"
            style={{ background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)', boxShadow: '0 4px 14px rgba(11,29,58,0.3)' }}>
            <UserPlus className="w-4 h-4" /> Add Owner
          </button>
        </motion.div>

        {/* Birthday alert */}
        <AnimatePresence>
          {birthdays.length > 0 && (
            <motion.div key="bday"
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-start gap-4 px-5 py-4 rounded-3xl"
                style={{
                  background: 'linear-gradient(135deg,#fffbeb,#fef9ec)',
                  border: '1px solid #fde68a',
                  boxShadow: '0 2px 16px rgba(245,158,11,0.12)',
                }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: '#f59e0b', boxShadow: '0 4px 12px rgba(245,158,11,0.4)' }}>
                  <Cake className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <p className="text-[11px] font-black text-amber-900 uppercase tracking-wider">Birthday Reminder</p>
                  {birthdays.map((o) => (
                    <div key={o.id} className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[9px] font-black shrink-0"
                        style={{ background: avatarColor(o.name) }}>
                        {initials(o.name)}
                      </div>
                      <span className="text-[14px] font-bold text-amber-950">{o.name}</span>
                      <span className="text-[12px] text-amber-600">
                        {o.daysUntilBirthday === 0 ? '— 🎉 Today!' : o.daysUntilBirthday === 1 ? '— Tomorrow' : `— in ${o.daysUntilBirthday} days`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cards */}
        {owners.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence>
              {owners.map((own) => (
                <OwnerCard
                  key={own.id}
                  own={own}
                  bday={birthdays.find((b) => b.id === own.id)}
                  onEdit={() => openEdit(own)}
                  onDelete={() => setDelConfirm(own)}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-3xl border-2 border-dashed border-slate-200 py-24 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Home className="w-8 h-8 text-slate-300" strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p className="text-[15px] font-bold text-slate-400">No owners yet</p>
              <p className="text-[13px] text-slate-300 mt-1">Add the owners of Shah House</p>
            </div>
            <button onClick={openAdd}
              className="flex items-center gap-2 px-5 h-10 rounded-2xl text-[13px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' }}>
              <UserPlus className="w-4 h-4" /> Add First Owner
            </button>
          </motion.div>
        )}
      </div>

      {/* ── Side Drawer ── */}
      <AnimatePresence>
        {drawer && (
          <>
            <motion.div key="bg"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDrawer(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
            <motion.div key="panel"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 flex flex-col shadow-2xl">

              <div className="px-6 py-5 shrink-0 flex items-center justify-between"
                style={{ background: 'linear-gradient(150deg, #0a172e, #0c1f3f)' }}>
                <div>
                  <p className="text-[16px] font-black text-white">
                    {drawer === 'add' ? 'Add Owner' : 'Edit Owner'}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Shah House</p>
                </div>
                <button onClick={() => setDrawer(null)}
                  className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Live preview */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-4 shrink-0 bg-slate-50">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-[16px] font-black"
                  style={{ background: form.name ? avatarColor(form.name) : '#cbd5e1' }}>
                  {form.name ? initials(form.name) : <Home className="w-5 h-5 text-white/60" />}
                </div>
                <div>
                  <p className="text-[15px] font-bold text-slate-800">{form.name || 'New Owner'}</p>
                  <p className="text-[12px] text-slate-400">
                    {form.dateOfBirth ? `${calcAge(form.dateOfBirth)} years old` : 'Shah House Owner'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {[
                  { label: 'Full Name *',     key: 'name',        type: 'text',  placeholder: 'e.g. Mirfan Shah',  required: true },
                  { label: 'Date of Birth *', key: 'dateOfBirth', type: 'date',  placeholder: '',                  required: true },
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
                <button type="button" onClick={() => setDrawer(null)}
                  className="flex-1 h-11 rounded-2xl border-2 border-slate-200 text-[14px] font-bold text-slate-600 hover:bg-slate-50 transition-all">
                  Cancel
                </button>
                <button onClick={handleSave}
                  className="flex-1 h-11 rounded-2xl text-[14px] font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                  style={{ background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)', boxShadow: '0 4px 14px rgba(11,29,58,0.3)' }}>
                  <BadgeCheck className="w-4 h-4" />
                  {drawer === 'add' ? 'Add Owner' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Delete confirm ── */}
      <AnimatePresence>
        {delConfirm && (
          <>
            <motion.div key="del-bg"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDelConfirm(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
            <motion.div key="del-box"
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
                  <strong className="text-slate-700">{delConfirm.name}</strong> will be permanently removed.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setDelConfirm(null)}
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
