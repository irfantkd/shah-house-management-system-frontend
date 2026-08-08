import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus, Cake, Phone, Mail, ArrowRight, Pencil, Trash2, BadgeCheck,
  Home, X, Search, ChevronLeft, ChevronRight, Loader2, AlertCircle, FileText,
} from 'lucide-react';
import DatePicker from '../../components/ui/DatePicker';
import { useGetQuery, usePostMutation, usePutMutation, useDeleteMutation } from '../../api/apiSlice';
import { selectCurrentPropertyId } from '../../store/slices/propertiesSlice';
import PageLoader from '../../components/ui/PageLoader';
import { MotionSwipeableRow } from '../../components/ui/SwipeableRow';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';

const PAGE_SIZE = 10;
const TODAY_STR = new Date().toISOString().split('T')[0];
const PHONE_RE  = /^[+\d][\d\s\-().]{5,19}$/;
const EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── Validation ────────────────────────────────────────────────────────────────
function validateOwnerForm(f) {
  const e = {};
  if (!f.name.trim())             e.name        = 'Full name is required';
  else if (f.name.trim().length < 2) e.name     = 'Name must be at least 2 characters';
  if (!f.dateOfBirth)             e.dateOfBirth = 'Date of birth is required';
  else if (f.dateOfBirth >= TODAY_STR) e.dateOfBirth = 'Date of birth must be in the past';
  if (f.phone && f.phone.trim() && !PHONE_RE.test(f.phone.trim())) e.phone = 'Enter a valid phone number';
  if (f.email && f.email.trim() && !EMAIL_RE.test(f.email.trim())) e.email = 'Enter a valid email address';
  return e;
}

const BLANK = { name: '', phone: '', email: '', dateOfBirth: '', notes: '' };

const INP = 'w-full h-11 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 transition-all';
const INP_ERR = 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-400/10';

// ── Pagination ────────────────────────────────────────────────────────────────
function getPagNums(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, '…', pages];
  if (page >= pages - 3) return [1, '…', pages-4, pages-3, pages-2, pages-1, pages];
  return [1, '…', page-1, page, page+1, '…', pages];
}
function PagBtn({ onClick, disabled, active, children }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={cn('min-w-8 h-8 px-2 rounded-xl text-[12px] font-semibold transition-all border',
        active
          ? 'bg-navy-900 text-white border-navy-900'
          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed')}>
      {children}
    </button>
  );
}
function PaginationBar({ page, pages, onPage }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1.5 py-4">
      <PagBtn onClick={() => onPage(page - 1)} disabled={page <= 1}><ChevronLeft className="w-4 h-4" /></PagBtn>
      {getPagNums(page, pages).map((n, i) =>
        n === '…'
          ? <span key={`e${i}`} className="text-slate-400 text-[12px] px-1">…</span>
          : <PagBtn key={n} onClick={() => onPage(n)} active={n === page}>{n}</PagBtn>
      )}
      <PagBtn onClick={() => onPage(page + 1)} disabled={page >= pages}><ChevronRight className="w-4 h-4" /></PagBtn>
    </div>
  );
}

// ── Desktop card ──────────────────────────────────────────────────────────────
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

      <div className="relative px-5 pt-4 pb-4 overflow-hidden"
        style={{ background: 'linear-gradient(150deg, #0a172e 0%, #0c1f3f 55%, #0e2550 100%)' }}>

        <div style={{ position:'absolute', top:-36, right:-36, width:130, height:130, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.06)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:-18, right:-18, width:80,  height:80,  borderRadius:'50%', border:'1px solid rgba(255,255,255,0.09)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:color, opacity:0.9 }} />
        <div style={{
          position:'absolute', right:12, bottom:-8,
          fontSize:80, fontWeight:900, lineHeight:1,
          color:'rgba(255,255,255,0.05)',
          letterSpacing:'-3px', userSelect:'none', pointerEvents:'none',
        }}>
          {initials(own.name)}
        </div>

        {bday && (
          <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
            style={{ background:'#f59e0b', boxShadow:'0 2px 8px rgba(245,158,11,0.5)', zIndex:10 }}>
            <Cake className="w-3 h-3" />
            {bday.daysUntilBirthday === 0 ? 'Today!' : `${bday.daysUntilBirthday}d`}
          </div>
        )}

        <div className="relative flex items-center gap-4 mt-1" style={{ zIndex:5 }}>
          <div className="w-13.5 h-13.5 rounded-2xl shrink-0 flex items-center justify-center text-white text-[20px] font-black select-none"
            style={{ background:color, border:'2.5px solid rgba(255,255,255,0.22)', boxShadow:`0 4px 20px ${color}70, 0 0 0 1px rgba(255,255,255,0.08)` }}>
            {initials(own.name)}
          </div>
          <div className="min-w-0 flex-1 pr-2">
            <p className="text-[18px] font-black text-white leading-tight truncate">{own.name}</p>
            <p className="text-[11px] font-semibold mt-0.5" style={{ color:'rgba(255,255,255,0.38)' }}>Shah House · Owner</p>
          </div>
        </div>

        <div className="absolute bottom-3.5 right-4 flex gap-1.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150" style={{ zIndex:10 }}>
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

      <div className="flex-1 flex flex-col px-5 pt-4 pb-5 gap-3">
        <div className="space-y-2.5">
          {own.dateOfBirth && (
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ background:`${color}18` }}>
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
              <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ background:`${color}18` }}>
                <Phone className="w-3.5 h-3.5" style={{ color }} />
              </div>
              <p className="text-[13px] font-semibold text-slate-700 truncate">{own.phone}</p>
            </div>
          )}
          {own.email && (
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ background:`${color}18` }}>
                <Mail className="w-3.5 h-3.5" style={{ color }} />
              </div>
              <p className="text-[13px] font-semibold text-slate-700 truncate">{own.email}</p>
            </div>
          )}
        </div>

        {own.notes && (
          <p className="text-[12px] text-slate-400 italic leading-relaxed line-clamp-2">{own.notes}</p>
        )}

        <div className="flex-1" />

        <div className="border-t border-slate-100 pt-3 mt-1">
          <Link to={`/owners/${own.id}`} className="flex items-center justify-between group/cta">
            <span className="text-[13px] font-bold text-slate-800">View Full Profile</span>
            <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 group-hover/cta:scale-110 transition-transform"
              style={{ background:color }}>
              <ArrowRight className="w-3.5 h-3.5 text-white" />
            </div>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ── Mobile swipeable row ──────────────────────────────────────────────────────
function OwnerListRow({ own, bday, onEdit, onDelete }) {
  const color   = avatarColor(own.name);
  const ownerId = own.id ?? own._id;

  return (
    <MotionSwipeableRow
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -28 }}
      transition={{ duration: 0.22 }}
      onSwipeRight={onEdit}
      onSwipeLeft={onDelete}
      leftIcon={<Pencil style={{ color: '#2563eb', width: 20, height: 20 }} />}
      leftLabel="Edit"
      leftBg="#eff6ff"
      leftColor="#2563eb"
      rightIcon={<Trash2 style={{ color: '#dc2626', width: 20, height: 20 }} />}
      rightLabel="Delete"
      rightBg="#fef2f2"
      rightColor="#dc2626"
    >
      <Link
        to={`/owners/${ownerId}`}
        className="flex items-center gap-3.5 px-4 py-4 bg-white hover:bg-slate-50/60 active:bg-slate-50 transition-colors"
      >
        <div className="relative shrink-0">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-[13px] font-black select-none"
            style={{ background: color }}>
            {initials(own.name)}
          </div>
          {bday && (
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: '#f59e0b', boxShadow: '0 1px 6px rgba(245,158,11,0.5)' }}>
              <Cake className="w-2.5 h-2.5 text-white" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-slate-900 truncate leading-tight">{own.name}</p>
          <p className="text-[12px] text-slate-400 mt-0.5 truncate">
            {own.phone || own.email || (own.dateOfBirth ? fmtDate(own.dateOfBirth) : 'No contact info')}
          </p>
        </div>

        {bday && (
          <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-full"
            style={{ background: '#fef3c7', color: '#92400e' }}>
            {bday.daysUntilBirthday === 0 ? '🎂 Today' : `${bday.daysUntilBirthday}d`}
          </span>
        )}

        <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
      </Link>
    </MotionSwipeableRow>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function OwnersPage() {
  const propertyId = useSelector(selectCurrentPropertyId);

  const [page,            setPage]           = useState(1);
  const [search,          setSearch]         = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [drawer,          setDrawer]         = useState(null);
  const [delConfirm,      setDelConfirm]     = useState(null);
  const [form,            setForm]           = useState(BLANK);
  const [ownerErrors,     setOwnerErrors]    = useState({});
  const [isSaving,        setIsSaving]       = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Stats query (total count + birthday notifications from ALL owners)
  const { data: ownerStats = {} } = useGetQuery(
    { path: '/owners/stats', params: { propertyId } },
    { skip: !propertyId },
  );

  // Paginated list
  const { data: rawData, isLoading, isFetching } = useGetQuery(
    { path: '/owners', params: { propertyId, page, limit: PAGE_SIZE, ...(debouncedSearch && { search: debouncedSearch }) } },
    { skip: !propertyId },
  );
  const owners     = rawData?.items ?? (Array.isArray(rawData) ? rawData : []);
  const totalPages = rawData?.pages ?? 1;
  const totalCount = ownerStats.total ?? 0;
  const upcomingBirthdays = ownerStats.upcomingBirthdays ?? [];

  const [addOwnerMut]                       = usePostMutation();
  const [updateOwnerMut]                    = usePutMutation();
  const [deleteOwnerMut, { isLoading: isDeleting }] = useDeleteMutation();

  // ── Form helpers ────────────────────────────────────────────────────────────
  const setF = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (ownerErrors[k]) setOwnerErrors((e) => ({ ...e, [k]: undefined }));
  };

  const blurOwnerField = (k) => {
    const errs = validateOwnerForm(form);
    if (errs[k]) setOwnerErrors((e) => ({ ...e, [k]: errs[k] }));
  };

  const openAdd  = ()    => { setForm(BLANK); setOwnerErrors({}); setDrawer('add'); };
  const openEdit = (own) => { setForm({ ...BLANK, ...own }); setOwnerErrors({}); setDrawer(own); };

  // ── Save handler ────────────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e?.preventDefault();
    const errs = validateOwnerForm(form);
    if (Object.keys(errs).length) { setOwnerErrors(errs); return; }
    setIsSaving(true);
    try {
      if (drawer === 'add') {
        await addOwnerMut({ path: '/owners', body: { ...form, propertyId } }).unwrap();
        toast.success(`${form.name} added`);
      } else {
        await updateOwnerMut({ path: `/owners/${drawer.id}`, body: form }).unwrap();
        toast.success('Owner updated');
      }
      setDrawer(null);
      setOwnerErrors({});
    } catch (err) {
      if (err.data?.errors) {
        setOwnerErrors(err.data.errors);
      } else {
        toast.error(err.data?.error || 'Failed to save');
      }
    } finally { setIsSaving(false); }
  };

  // ── Delete handler ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    try {
      await deleteOwnerMut({ path: `/owners/${delConfirm.id}` }).unwrap();
      toast.success(`${delConfirm.name} removed`);
      setDelConfirm(null);
    } catch { toast.error('Failed to delete'); }
  };

  if (isLoading) return <PageLoader />;

  const bdayFor = (own) => upcomingBirthdays.find((b) => b.id === (own.id ?? own._id));

  return (
    <>
      <div className="space-y-8">

        {/* ── Page header ── */}
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
          className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background:'linear-gradient(135deg,#0b1d3a,#1e3a6e)', boxShadow:'0 4px 14px rgba(11,29,58,0.35)' }}>
              <Home className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-[22px] font-black text-slate-900 leading-tight">Owners</h1>
              <p className="text-[12px] text-slate-400">Shah House · {totalCount} {totalCount === 1 ? 'owner' : 'owners'}</p>
            </div>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-5 h-10 rounded-2xl text-[13px] font-bold text-white hover:opacity-90 active:scale-[0.97] transition-all"
            style={{ background:'linear-gradient(135deg,#0b1d3a,#1e3a6e)', boxShadow:'0 4px 14px rgba(11,29,58,0.3)' }}>
            <UserPlus className="w-4 h-4" /> Add Owner
          </button>
        </motion.div>

        {/* ── Birthday banner ── */}
        <AnimatePresence>
          {upcomingBirthdays.length > 0 && (
            <motion.div key="bday" initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
              <div className="flex items-start gap-4 px-5 py-4 rounded-3xl"
                style={{ background:'linear-gradient(135deg,#fffbeb,#fef9ec)', border:'1px solid #fde68a', boxShadow:'0 2px 16px rgba(245,158,11,0.12)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background:'#f59e0b', boxShadow:'0 4px 12px rgba(245,158,11,0.4)' }}>
                  <Cake className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <p className="text-[11px] font-black text-amber-900 uppercase tracking-wider">🎂 Birthday Reminder</p>
                  {upcomingBirthdays.map((o) => (
                    <div key={o.id} className="flex items-center gap-2.5 flex-wrap">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[9px] font-black shrink-0"
                        style={{ background: avatarColor(o.name) }}>
                        {initials(o.name)}
                      </div>
                      <span className="text-[14px] font-bold text-amber-950">{o.name}</span>
                      <span className="text-[12px] text-amber-600">
                        {o.daysUntilBirthday === 0 ? '— Today! 🎉' : o.daysUntilBirthday === 1 ? '— Tomorrow' : `— in ${o.daysUntilBirthday} days`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Search ── */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="w-full h-10 pl-10 pr-4 rounded-2xl border border-slate-200 bg-white text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 transition-all" />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* ── List / Grid ── */}
        <div className={cn('transition-opacity duration-200', isFetching ? 'opacity-50 pointer-events-none' : 'opacity-100')}>
          {owners.length > 0 ? (
            <>
              {/* Mobile: swipeable list (hidden on sm+) */}
              <div className="sm:hidden">
                <p className="text-[11px] text-slate-400 font-semibold mb-2 flex items-center gap-2">
                  <span>← Swipe to edit or delete →</span>
                </p>
                <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white divide-y divide-slate-50"
                  style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
                  <AnimatePresence>
                    {owners.map((own) => (
                      <OwnerListRow
                        key={own.id ?? own._id}
                        own={own}
                        bday={bdayFor(own)}
                        onEdit={() => openEdit(own)}
                        onDelete={() => setDelConfirm(own)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* Desktop: card grid (hidden below sm) */}
              <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 gap-5">
                <AnimatePresence>
                  {owners.map((own) => (
                    <OwnerCard
                      key={own.id ?? own._id}
                      own={own}
                      bday={bdayFor(own)}
                      onEdit={() => openEdit(own)}
                      onDelete={() => setDelConfirm(own)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
              className="rounded-3xl border-2 border-dashed border-slate-200 py-24 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                {search
                  ? <Search className="w-8 h-8 text-slate-300" strokeWidth={1.5} />
                  : <Home className="w-8 h-8 text-slate-300" strokeWidth={1.5} />}
              </div>
              <div className="text-center">
                <p className="text-[15px] font-bold text-slate-400">{search ? 'No owners match your search' : 'No owners yet'}</p>
                <p className="text-[13px] text-slate-300 mt-1">{search ? 'Try a different name' : 'Add the owners of Shah House'}</p>
              </div>
              {!search && (
                <button onClick={openAdd}
                  className="flex items-center gap-2 px-5 h-10 rounded-2xl text-[13px] font-bold text-white"
                  style={{ background:'linear-gradient(135deg,#0b1d3a,#1e3a6e)' }}>
                  <UserPlus className="w-4 h-4" /> Add First Owner
                </button>
              )}
            </motion.div>
          )}

          <PaginationBar page={page} pages={totalPages} onPage={setPage} />
        </div>
      </div>

      {/* ── Side Drawer ── */}
      <AnimatePresence>
        {drawer && (
          <>
            <motion.div key="bg" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => !isSaving && setDrawer(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
            <motion.div key="panel"
              initial={{ x:'100%' }} animate={{ x:0 }} exit={{ x:'100%' }}
              transition={{ type:'spring', damping:28, stiffness:280 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 flex flex-col"
              style={{ boxShadow:'-8px 0 40px rgba(0,0,0,0.2)' }}>

              {/* ─ Rich gradient header with live preview ─ */}
              <div className="relative overflow-hidden shrink-0"
                style={{ background:'linear-gradient(150deg,#060e1e,#0a172e,#0c2145)' }}>
                <div style={{ position:'absolute', top:-50, right:-50, width:200, height:200, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.04)', pointerEvents:'none' }} />
                <div style={{ position:'absolute', top:-25, right:-25, width:120, height:120, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.07)', pointerEvents:'none' }} />
                <div style={{ position:'absolute', bottom:-20, left:-20, width:100, height:100, borderRadius:'50%', background:'rgba(30,58,110,0.4)', pointerEvents:'none' }} />

                <div className="relative px-6 pt-5 pb-6" style={{ zIndex:5 }}>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color:'rgba(255,255,255,0.35)' }}>
                        {drawer === 'add' ? 'New Owner Profile' : 'Edit Owner Profile'}
                      </p>
                      <h2 className="text-[19px] font-black text-white mt-0.5 leading-tight">
                        {drawer === 'add' ? 'Add Owner' : 'Edit Owner'}
                      </h2>
                    </div>
                    <button onClick={() => setDrawer(null)} disabled={isSaving}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white/50 hover:text-white border border-white/10 hover:bg-white/10 transition-all disabled:opacity-40">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Live preview card */}
                  <div className="flex items-center gap-4 p-4 rounded-2xl"
                    style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)' }}>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-[18px] font-black shrink-0"
                      style={{
                        background: form.name ? avatarColor(form.name) : 'rgba(255,255,255,0.1)',
                        border: '2px solid rgba(255,255,255,0.15)',
                        boxShadow: form.name ? `0 4px 16px ${avatarColor(form.name)}50` : 'none',
                      }}>
                      {form.name ? initials(form.name) : <Home className="w-5 h-5 opacity-30" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[16px] font-black text-white leading-tight truncate">
                        {form.name || <span style={{ opacity:0.3 }}>New Owner</span>}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color:'rgba(255,255,255,0.4)' }}>
                        Shah House · Owner
                        {form.dateOfBirth && !ownerErrors.dateOfBirth ? ` · ${calcAge(form.dateOfBirth)} yrs old` : ''}
                      </p>
                      {(form.phone || form.email) && (
                        <p className="text-[10px] mt-1 truncate" style={{ color:'rgba(255,255,255,0.28)' }}>
                          {form.phone || form.email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ─ Scrollable form ─ */}
              <form onSubmit={handleSave} className="flex-1 overflow-y-auto" style={{ scrollbarWidth:'thin' }}>
                <div className="px-6 py-5 space-y-6">

                  {/* ── Section 1: Personal Identity ── */}
                  <div>
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background:'linear-gradient(135deg,#0b1d3a,#1e3a6e)' }}>
                        <Home className="w-3 h-3 text-white" />
                      </div>
                      <p className="text-[11px] font-black text-slate-700 uppercase tracking-[0.12em]">Personal Identity</p>
                    </div>

                    <div className="space-y-4">
                      {/* Full Name */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input value={form.name}
                          onChange={(e) => setF('name', e.target.value)}
                          onBlur={() => blurOwnerField('name')}
                          type="text"
                          placeholder="e.g. Mirfan Shah"
                          className={cn(INP, ownerErrors.name ? INP_ERR : '')}
                        />
                        {ownerErrors.name && (
                          <p className="flex items-center gap-1 text-[11px] text-red-500 mt-1.5 ml-1">
                            <AlertCircle className="w-3 h-3 shrink-0" />{ownerErrors.name}
                          </p>
                        )}
                      </div>

                      {/* Date of Birth */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5">
                          Date of Birth <span className="text-red-500">*</span>
                        </label>
                        <DatePicker
                          value={form.dateOfBirth}
                          onChange={(v) => { setF('dateOfBirth', v); blurOwnerField('dateOfBirth'); }}
                          className={cn(INP, ownerErrors.dateOfBirth ? INP_ERR : '')}
                          hasError={!!ownerErrors.dateOfBirth}
                          maxYear={new Date().getFullYear()}
                        />
                        {ownerErrors.dateOfBirth
                          ? (
                            <p className="flex items-center gap-1 text-[11px] text-red-500 mt-1.5 ml-1">
                              <AlertCircle className="w-3 h-3 shrink-0" />{ownerErrors.dateOfBirth}
                            </p>
                          ) : form.dateOfBirth && (
                            <p className="text-[11px] text-slate-400 mt-1.5 ml-1 flex items-center gap-1">
                              <span className="w-3.5 h-3.5 inline-flex items-center justify-center rounded-full bg-slate-100 text-[8px]">✓</span>
                              {calcAge(form.dateOfBirth)} years old
                            </p>
                          )
                        }
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Contact</span>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>

                  {/* ── Section 2: Contact Information ── */}
                  <div>
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background:'linear-gradient(135deg,#0891b2,#0e7490)' }}>
                        <Phone className="w-3 h-3 text-white" />
                      </div>
                      <p className="text-[11px] font-black text-slate-700 uppercase tracking-[0.12em]">Contact Information</p>
                      <span className="text-[10px] text-slate-300 font-medium">optional</span>
                    </div>

                    <div className="space-y-4">
                      {/* Phone */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5">Phone Number</label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                          <input value={form.phone}
                            onChange={(e) => setF('phone', e.target.value)}
                            onBlur={() => blurOwnerField('phone')}
                            type="text"
                            placeholder="+971 50 000 0000"
                            className={cn(INP, 'pl-10', ownerErrors.phone ? INP_ERR : '')}
                          />
                        </div>
                        {ownerErrors.phone && (
                          <p className="flex items-center gap-1 text-[11px] text-red-500 mt-1.5 ml-1">
                            <AlertCircle className="w-3 h-3 shrink-0" />{ownerErrors.phone}
                          </p>
                        )}
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 mb-1.5">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                          <input value={form.email}
                            onChange={(e) => setF('email', e.target.value)}
                            onBlur={() => blurOwnerField('email')}
                            type="text"
                            placeholder="email@example.com"
                            className={cn(INP, 'pl-10', ownerErrors.email ? INP_ERR : '')}
                          />
                        </div>
                        {ownerErrors.email && (
                          <p className="flex items-center gap-1 text-[11px] text-red-500 mt-1.5 ml-1">
                            <AlertCircle className="w-3 h-3 shrink-0" />{ownerErrors.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Notes</span>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>

                  {/* ── Section 3: Notes ── */}
                  <div>
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background:'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                        <FileText className="w-3 h-3 text-white" />
                      </div>
                      <p className="text-[11px] font-black text-slate-700 uppercase tracking-[0.12em]">Notes</p>
                      <span className="text-[10px] text-slate-300 font-medium">optional</span>
                    </div>
                    <textarea value={form.notes ?? ''}
                      onChange={(e) => setF('notes', e.target.value)}
                      rows={3}
                      placeholder="Ownership details, preferences, personal notes…"
                      className={`${INP} h-auto py-3 resize-none leading-relaxed`}
                    />
                  </div>

                  <p className="text-[10px] text-slate-300 text-center pb-2">
                    Fields marked <span className="text-red-400 font-bold">*</span> are required
                  </p>
                </div>
              </form>

              {/* ─ Footer ─ */}
              <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0 bg-slate-50/60">
                <button type="button" onClick={() => setDrawer(null)} disabled={isSaving}
                  className="flex-1 h-11 rounded-2xl border-2 border-slate-200 text-[14px] font-bold text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={isSaving}
                  className="flex-2 h-11 rounded-2xl text-[14px] font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
                  style={{ background:'linear-gradient(135deg,#0b1d3a,#1e3a6e)', boxShadow:'0 4px 16px rgba(11,29,58,0.35)' }}>
                  {isSaving
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                    : <><BadgeCheck className="w-4 h-4" /> {drawer === 'add' ? 'Add Owner' : 'Save Changes'}</>}
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
            <motion.div key="del-bg" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => !isDeleting && setDelConfirm(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
            <motion.div key="del-box"
              initial={{ opacity:0, scale:0.88, y:20 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.9 }}
              transition={{ type:'spring', damping:26, stiffness:320 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
              <div className="bg-white rounded-3xl p-7 w-full max-w-xs pointer-events-auto text-center"
                style={{ boxShadow:'0 24px 64px rgba(0,0,0,0.22)' }}>
                <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-7 h-7 text-red-500" />
                </div>
                <h3 className="text-[17px] font-black text-slate-900 mb-2">Remove Owner?</h3>
                <p className="text-[13px] text-slate-500 leading-relaxed mb-6">
                  <strong className="text-slate-700">{delConfirm.name}</strong> will be permanently removed from Shah House.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setDelConfirm(null)} disabled={isDeleting}
                    className="flex-1 h-11 rounded-2xl border-2 border-slate-200 text-[14px] font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50">
                    Cancel
                  </button>
                  <button onClick={handleDelete} disabled={isDeleting}
                    className="flex-1 h-11 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-[14px] font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                    {isDeleting
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Removing…</>
                      : <><Trash2 className="w-4 h-4" /> Remove</>}
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
