import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Navigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Pencil, Banknote, Wallet, Phone, CalendarDays, Cake,
  BadgeCheck, Trash2, Car, Home, AlertCircle, CheckCircle2, Clock,
  Globe, FileText, TrendingUp, ArrowDownLeft, RotateCcw, Users, X, AlertTriangle,
  Save, Loader2,
} from 'lucide-react';
import { useGetQuery, usePostMutation, usePutMutation, useDeleteMutation, usePatchMutation } from '../../api/apiSlice';
import { selectCurrentPropertyId } from '../../store/slices/propertiesSlice';
import { MotionSwipeableRow } from '../../components/ui/SwipeableRow';
import toast from 'react-hot-toast';

const LOW_BALANCE_THRESHOLD = 5000;
const HIST_PAGE_SIZE = 5;

// ── Helpers ───────────────────────────────────────────────────────────────────
const PALETTES = [
  ['#2563eb','#1d4ed8'], ['#16a34a','#15803d'], ['#7c3aed','#6d28d9'],
  ['#dc2626','#b91c1c'], ['#d97706','#b45309'], ['#0891b2','#0e7490'],
  ['#db2777','#be185d'], ['#65a30d','#4d7c0f'],
];
const avatarColor = (name = '') => {
  const s = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return PALETTES[s % PALETTES.length][0];
};
const avatarGrad = (name = '') => {
  const s = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const [a, b] = PALETTES[s % PALETTES.length];
  return `linear-gradient(135deg,${a},${b})`;
};
const initials    = (n = '') => n.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
const fmtAmt      = (n) => Number(n).toLocaleString('en-AE', { maximumFractionDigits: 0 });
const fmtDate     = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtDateLong = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtMonth    = (m) => new Date(m + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
const calcAge     = (dob) => {
  const t = new Date(), d = new Date(dob);
  let a = t.getFullYear() - d.getFullYear();
  if (t < new Date(t.getFullYear(), d.getMonth(), d.getDate())) a--;
  return a;
};
const tenure = (joinDate) => {
  const n = new Date(), j = new Date(joinDate);
  let yr = n.getFullYear() - j.getFullYear();
  let mo = n.getMonth() - j.getMonth();
  if (mo < 0) { yr--; mo += 12; }
  if (yr === 0) return `${mo} month${mo !== 1 ? 's' : ''}`;
  if (mo === 0) return `${yr} year${yr !== 1 ? 's' : ''}`;
  return `${yr} yr${yr !== 1 ? 's' : ''} ${mo} mo`;
};
const daysUntilBirthday = (dob) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dob);
  const yr = today.getFullYear();
  let next = new Date(yr, d.getMonth(), d.getDate());
  if (next < today) next = new Date(yr + 1, d.getMonth(), d.getDate());
  return Math.round((next - today) / 86_400_000);
};

const ROLES   = ['Driver', 'Housemaid', 'Cook', 'Gardener', 'Security Guard', 'Nanny', 'Cleaner', 'Butler', 'Handyman', 'Other'];
const CUR_MON = new Date().toISOString().slice(0, 7);
const INP     = 'w-full h-11 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 transition-all';
const SEL     = `${INP} cursor-pointer`;

function InfoRow({ icon: Icon, label, value, valueColor, color }) {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-slate-100 last:border-0">
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: `${color}15` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-[14px] font-semibold mt-0.5" style={{ color: valueColor ?? '#1e293b' }}>{value}</p>
      </div>
    </div>
  );
}

export default function EmployeeDetail() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const propertyId = useSelector(selectCurrentPropertyId);

  const { data: emp, isLoading } = useGetQuery({ path: `/employees/${id}` });
  const { data: walletData, refetch: refetchWallet } = useGetQuery(
    { path: '/wallet', params: { propertyId } },
    { skip: !propertyId },
  );
  const vehicleWallet = { balance: walletData?.vehicle?.balance ?? 0 };
  const homeWallet    = { balance: walletData?.home?.balance    ?? 0 };
  const salaryWallet  = { balance: walletData?.salary?.balance  ?? 0 };

  const [updateEmployeeMut]  = usePutMutation();
  const [deleteEmployeeMut]  = useDeleteMutation();
  const [paymentMut]         = usePostMutation();
  const [advanceMut]         = usePostMutation();
  const [recoverMut]         = usePatchMutation();
  const [updateHistMut]      = usePutMutation();
  const [deleteHistMut, { isLoading: isDeletingHist }] = useDeleteMutation();

  // ── All hooks MUST come before any early returns ──────────────────────────
  const [editOpen,      setEditOpen]      = useState(false);
  const [payOpen,       setPayOpen]       = useState(false);
  const [advOpen,       setAdvOpen]       = useState(false);
  const [delOpen,       setDelOpen]       = useState(false);
  const [histFilter,    setHistFilter]    = useState('all');
  const [histPage,      setHistPage]      = useState(1);
  const [editHistEntry, setEditHistEntry] = useState(null);
  const [editHistForm,  setEditHistForm]  = useState({ amount: '', notes: '', month: '' });
  const [delHistEntry,  setDelHistEntry]  = useState(null);
  const [isSavingHist,  setIsSavingHist]  = useState(false);
  const [isPayingSal,   setIsPayingSal]   = useState(false);
  const [isGivingAdv,   setIsGivingAdv]   = useState(false);

  const [editForm, setEditForm] = useState({});
  const [payForm,  setPayForm]  = useState({ month: CUR_MON, amount: '', wallet: 'salary', notes: '' });
  const [advForm,  setAdvForm]  = useState({ amount: '', wallet: 'home', notes: '', month: CUR_MON });

  useEffect(() => { setHistPage(1); }, [histFilter]);

  const outstandingAdv = useMemo(() =>
    (emp?.salaryHistory ?? []).filter((p) => p.type === 'advance' && !p.recovered).reduce((s, p) => s + p.amount, 0),
    [emp?.salaryHistory]);

  const totalPaidYear = useMemo(() => {
    const yr = new Date().getFullYear();
    return (emp?.salaryHistory ?? []).filter((p) => p.type === 'salary' && new Date(p.paidOn).getFullYear() === yr)
      .reduce((s, p) => s + p.amount, 0);
  }, [emp?.salaryHistory]);

  // ── Early returns AFTER all hooks ─────────────────────────────────────────
  if (isLoading) return null;
  if (!emp) return <Navigate to="/employees" replace />;

  const setEF = (k, v) => setEditForm((f) => ({ ...f, [k]: v }));
  const setPF = (k, v) => setPayForm((f)  => ({ ...f, [k]: v }));
  const setAF = (k, v) => setAdvForm((f)  => ({ ...f, [k]: v }));

  const paidThisMonth   = emp.salaryHistory.some((p) => p.type === 'salary' && p.month === CUR_MON);
  const bdayDays        = emp.dateOfBirth ? daysUntilBirthday(emp.dateOfBirth) : null;
  const filteredHist    = emp.salaryHistory.filter((p) => histFilter === 'all' ? true : p.type === histFilter);
  const totalHistPages  = Math.ceil(filteredHist.length / HIST_PAGE_SIZE) || 1;
  const pagedHist       = filteredHist.slice((histPage - 1) * HIST_PAGE_SIZE, histPage * HIST_PAGE_SIZE);
  const advForPayMonth  = emp.salaryHistory.filter((p) => p.type === 'advance' && !p.recovered && p.month === payForm.month).reduce((s, p) => s + p.amount, 0);
  const hasHistory      = emp.salaryHistory.length > 0;

  const color = avatarColor(emp.name);
  const grad  = avatarGrad(emp.name);

  const openEdit = () => { setEditForm({ ...emp, monthlySalary: String(emp.monthlySalary) }); setEditOpen(true); };
  const openPay  = () => { setPayForm({ month: CUR_MON, amount: String(emp.monthlySalary), wallet: 'salary', notes: '' }); setPayOpen(true); };
  const openAdv  = () => { setAdvForm({ amount: '', wallet: 'home', notes: '', month: CUR_MON }); setAdvOpen(true); };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.name?.trim() || !editForm.dateOfBirth || !editForm.monthlySalary)
      return toast.error('Fill required fields');
    try {
      await updateEmployeeMut({ path: `/employees/${emp.id}`, body: { ...editForm, monthlySalary: Number(editForm.monthlySalary) } }).unwrap();
      toast.success('Employee updated');
      setEditOpen(false);
    } catch (err) { toast.error(err.data?.error || 'Failed to update employee'); }
  };

  const handleDelete = async () => {
    try {
      await deleteEmployeeMut({ path: `/employees/${emp.id}` }).unwrap();
      toast.success(`${emp.name} removed`);
      navigate('/employees');
    } catch (err) { toast.error(err.data?.error || 'Failed to remove employee'); }
  };

  const handlePaySalary = async (e) => {
    e.preventDefault();
    if (!payForm.amount) return toast.error('Enter amount');
    const amt    = Number(payForm.amount);
    const paidOn = new Date().toISOString().split('T')[0];
    setIsPayingSal(true);
    try {
      await paymentMut({
        path: `/employees/${emp.id}/pay-salary`,
        body: { propertyId, month: payForm.month, amount: amt, paidOn, notes: payForm.notes },
      }).unwrap();
      await refetchWallet();
      toast.success(`AED ${fmtAmt(amt)} salary paid`);
      setPayOpen(false);
    } catch (err) { toast.error(err.data?.error || 'Failed to record payment'); }
    finally { setIsPayingSal(false); }
  };

  const handleAdvance = async (e) => {
    e.preventDefault();
    if (!advForm.amount) return toast.error('Enter advance amount');
    if (!advForm.month)  return toast.error('Select which month this advance is for');
    const amt    = Number(advForm.amount);
    const paidOn = new Date().toISOString().split('T')[0];
    setIsGivingAdv(true);
    try {
      await advanceMut({
        path: `/employees/${emp.id}/pay-advance`,
        body: { propertyId, wallet: advForm.wallet, amount: amt, paidOn, notes: advForm.notes, month: advForm.month },
      }).unwrap();
      await refetchWallet();
      toast.success(`AED ${fmtAmt(amt)} advance given to ${emp.name}`);
      setAdvOpen(false);
    } catch (err) { toast.error(err.data?.error || 'Failed to record advance'); }
    finally { setIsGivingAdv(false); }
  };

  const handleRecover = async (paymentId) => {
    try {
      await recoverMut({ path: `/employees/${emp.id}/advances/${paymentId}`, body: { recovered: true } }).unwrap();
      toast.success('Advance marked as recovered');
    } catch (err) { toast.error(err.data?.error || 'Failed to recover advance'); }
  };

  const handleEditHist = async (e) => {
    e.preventDefault();
    if (!editHistEntry || !editHistForm.amount) return;
    setIsSavingHist(true);
    try {
      const body = { amount: Number(editHistForm.amount), notes: editHistForm.notes };
      if (editHistForm.month) body.month = editHistForm.month;
      await updateHistMut({ path: `/employees/${emp.id}/history/${editHistEntry.id ?? editHistEntry._id}`, body }).unwrap();
      toast.success('Payment record updated');
      setEditHistEntry(null);
    } catch (err) { toast.error(err.data?.error || 'Failed to update record'); }
    finally { setIsSavingHist(false); }
  };

  const handleDeleteHist = async () => {
    if (!delHistEntry) return;
    try {
      await deleteHistMut({ path: `/employees/${emp.id}/history/${delHistEntry.id ?? delHistEntry._id}` }).unwrap();
      toast.success('Payment record removed');
      setDelHistEntry(null);
      if (pagedHist.length === 1 && histPage > 1) setHistPage((p) => p - 1);
    } catch (err) { toast.error(err.data?.error || 'Failed to delete record'); }
  };

  // Wallet picker shared by advance modal
  const WalletPicker = ({ value, onChange }) => (
    <div className="grid grid-cols-2 gap-2">
      {[
        { k:'vehicle', label:'Vehicle Wallet', icon:Car,  bal:vehicleWallet.balance, bg:'#eef2fb', ac:'#0b1d3a' },
        { k:'home',    label:'Home Wallet',    icon:Home, bal:homeWallet.balance,    bg:'#f0fdf4', ac:'#16a34a' },
      ].map(({ k, label, icon:Icon, bal, bg, ac }) => (
        <button key={k} type="button" onClick={() => onChange(k)}
          className="flex flex-col gap-1.5 p-3 rounded-2xl border-2 text-left transition-all"
          style={value === k ? { borderColor: ac, background: bg } : { borderColor: '#e2e8f0', background: '#f8fafc' }}>
          <div className="flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5" style={{ color: value === k ? ac : '#94a3b8' }} />
            <span className="text-[11px] font-bold truncate" style={{ color: value === k ? ac : '#64748b' }}>{label}</span>
            {value === k && <span className="ml-auto shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-black" style={{ background: ac }}>✓</span>}
          </div>
          <p className="text-[14px] font-bold" style={{ color: value === k ? ac : '#94a3b8' }}>AED {fmtAmt(bal)}</p>
        </button>
      ))}
    </div>
  );

  return (
    <>
      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35 }}
        className="space-y-6">

        {/* ── Hero card ── */}
        <div className="rounded-3xl overflow-hidden"
          style={{ boxShadow:'0 4px 16px rgba(0,0,0,0.07), 0 20px 60px rgba(0,0,0,0.13)' }}>

          <div className="relative overflow-hidden px-6 pt-4 pb-6"
            style={{ background:'linear-gradient(150deg, #060e1e 0%, #091833 55%, #0d2147 100%)' }}>

            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:color, opacity:0.9 }} />
            <div style={{ position:'absolute', top:-44, right:-44, width:180, height:180, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.05)', pointerEvents:'none' }} />
            <div style={{ position:'absolute', top:-22, right:-22, width:110, height:110, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.08)', pointerEvents:'none' }} />
            <div style={{ position:'absolute', right:14, bottom:-8, fontSize:120, fontWeight:900, lineHeight:1, color:'rgba(255,255,255,0.04)', letterSpacing:'-5px', userSelect:'none', pointerEvents:'none' }}>
              {initials(emp.name)}
            </div>

            {/* Nav row */}
            <div className="relative flex items-center justify-between mb-5" style={{ zIndex:5 }}>
              <Link to="/employees"
                className="flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/18 border border-white/10 transition-all"
                style={{ color:'rgba(255,255,255,0.65)' }}>
                <ChevronLeft className="w-4 h-4" /> Employees
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

            {/* Avatar + name */}
            <div className="relative flex flex-col items-center text-center gap-3" style={{ zIndex:5 }}>
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-white text-[28px] font-black select-none"
                style={{ background: grad, border: '3px solid rgba(255,255,255,0.2)', boxShadow: `0 8px 28px ${color}70` }}>
                {initials(emp.name)}
              </div>
              <div>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <p className="text-[24px] font-black text-white leading-tight">{emp.name}</p>
                  <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase"
                    style={emp.status === 'active'
                      ? { background:'rgba(22,163,74,0.25)', color:'#86efac', border:'1px solid rgba(22,163,74,0.3)' }
                      : { background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.4)', border:'1px solid rgba(255,255,255,0.12)' }}>
                    {emp.status === 'active' ? '● Active' : '○ Inactive'}
                  </span>
                </div>
                <p className="text-[13px] font-semibold mt-1" style={{ color:'rgba(255,255,255,0.4)' }}>
                  {emp.role}{emp.nationality ? ` · ${emp.nationality}` : ''}
                </p>
              </div>
              {bdayDays !== null && bdayDays <= 7 && (
                <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-bold text-white"
                  style={{ background:'#f59e0b', boxShadow:'0 2px 10px rgba(245,158,11,0.5)' }}>
                  <Cake className="w-3.5 h-3.5" />
                  {bdayDays === 0 ? 'Birthday Today!' : `Birthday in ${bdayDays} days`}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="bg-white px-6 py-5">
            {emp.status === 'active' && (
              <div className="flex gap-3">
                <button onClick={openPay}
                  className="flex-1 flex items-center justify-center gap-2 h-11 rounded-2xl text-[14px] font-bold text-white hover:opacity-90 transition-all"
                  style={{ background: grad, boxShadow:`0 4px 14px ${color}45` }}>
                  <Banknote className="w-4 h-4" /> Pay Salary
                </button>
                <button onClick={openAdv}
                  className="flex items-center gap-2 h-11 px-4 rounded-2xl text-[14px] font-bold text-amber-800 border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 transition-all">
                  <ArrowDownLeft className="w-4 h-4" /> Advance
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label:'Monthly Salary', value:`AED ${fmtAmt(emp.monthlySalary)}`,
              sub: paidThisMonth ? 'Paid this month ✓' : 'Unpaid this month',
              icon:Banknote, color:'#0b1d3a', bg:'#f0f5ff',
              subColor: paidThisMonth ? '#16a34a' : '#dc2626',
            },
            {
              label:'Outstanding Advance', value: outstandingAdv > 0 ? `AED ${fmtAmt(outstandingAdv)}` : 'None',
              sub: outstandingAdv > 0 ? 'To be recovered' : 'No pending advances',
              icon:ArrowDownLeft, color: outstandingAdv > 0 ? '#d97706' : '#16a34a', bg: outstandingAdv > 0 ? '#fffbeb' : '#f0fdf4',
            },
            {
              label:`Total Paid (${new Date().getFullYear()})`, value:`AED ${fmtAmt(totalPaidYear)}`,
              sub:`${emp.salaryHistory.filter((p) => p.type === 'salary' && new Date(p.paidOn).getFullYear() === new Date().getFullYear()).length} payments this year`,
              icon:TrendingUp, color:'#0891b2', bg:'#ecfeff',
            },
            {
              label:'With Shah House', value: tenure(emp.joinDate),
              sub:`Since ${fmtDate(emp.joinDate)}`,
              icon:Users, color:'#7c3aed', bg:'#f5f3ff',
            },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 flex flex-col gap-3"
              style={{ boxShadow:'0 1px 8px rgba(0,0,0,0.05)', border:'1px solid #f1f5f9' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background:s.bg }}>
                <s.icon className="w-4 h-4" style={{ color:s.color }} />
              </div>
              <div>
                <p className="text-[20px] font-black text-slate-900 leading-none">{s.value}</p>
                <p className="text-[11px] font-bold text-slate-400 mt-1">{s.label}</p>
                <p className="text-[10px] mt-0.5 font-medium" style={{ color: s.subColor ?? '#94a3b8' }}>{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Details + History ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Personal details */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl p-6 space-y-1"
              style={{ boxShadow:'0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08)' }}>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Personal Information</p>
              {emp.dateOfBirth && (
                <InfoRow icon={Cake} label="Date of Birth" color={color}
                  value={`${fmtDateLong(emp.dateOfBirth)} · ${calcAge(emp.dateOfBirth)} yrs`} />
              )}
              {emp.nationality && <InfoRow icon={Globe} label="Nationality" color={color} value={emp.nationality} />}
              {emp.phone       && <InfoRow icon={Phone} label="Phone" color={color} value={emp.phone} />}
              <InfoRow icon={CalendarDays} label="Join Date" color={color}
                value={`${fmtDate(emp.joinDate)} (${tenure(emp.joinDate)})`} />
              <InfoRow icon={BadgeCheck} label="Status" color={color}
                value={emp.status === 'active' ? 'Active employee' : 'Inactive'}
                valueColor={emp.status === 'active' ? '#16a34a' : '#94a3b8'} />
              {emp.notes && (
                <div className="flex items-start gap-4 py-4">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background:`${color}15` }}>
                    <FileText className="w-5 h-5" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Notes</p>
                    <p className="text-[14px] text-slate-600 mt-0.5 leading-relaxed">{emp.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment history */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-3xl overflow-hidden"
              style={{ boxShadow:'0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08)' }}>

              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-[15px] font-black text-slate-800">Payment History</p>
                  <p className="text-[11px] text-slate-400">{emp.salaryHistory.length} records · swipe to edit or delete</p>
                </div>
                <div className="flex gap-1 bg-slate-50 border border-slate-100 rounded-xl p-1">
                  {[{ k:'all', l:'All' }, { k:'salary', l:'Salary' }, { k:'advance', l:'Advance' }].map(({ k, l }) => (
                    <button key={k} onClick={() => setHistFilter(k)}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap"
                      style={histFilter === k ? { background:'#0b1d3a', color:'#fff' } : { color:'#64748b' }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Swipe hint (mobile) */}
              <div className="sm:hidden px-6 py-2 bg-slate-50/60 border-b border-slate-100">
                <p className="text-[10px] text-slate-400 text-center">← Swipe right to edit · Swipe left to delete →</p>
              </div>

              {/* History list */}
              {filteredHist.length === 0 ? (
                <div className="py-14 text-center">
                  <Clock className="w-10 h-10 text-slate-200 mx-auto mb-3" strokeWidth={1.5} />
                  <p className="text-slate-400 text-[13px]">No {histFilter !== 'all' ? histFilter : ''} payments recorded</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  <AnimatePresence mode="popLayout">
                    {pagedHist.map((p) => {
                      const isSal  = p.type === 'salary';
                      const isAdv  = p.type === 'advance';
                      const recov  = isAdv && p.recovered;
                      const entryId = p.id ?? p._id;
                      return (
                        <MotionSwipeableRow
                          key={entryId}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -28 }}
                          transition={{ duration: 0.22 }}
                          onSwipeRight={() => {
                            setEditHistEntry(p);
                            setEditHistForm({ amount: String(p.amount), notes: p.notes || '', month: p.month || '' });
                          }}
                          onSwipeLeft={() => setDelHistEntry(p)}
                          leftIcon={<Pencil style={{ color: '#2563eb', width: 20, height: 20 }} />}
                          leftLabel="Edit"
                          leftBg="#eff6ff"
                          leftColor="#2563eb"
                          rightIcon={<Trash2 style={{ color: '#dc2626', width: 20, height: 20 }} />}
                          rightLabel="Delete"
                          rightBg="#fef2f2"
                          rightColor="#dc2626"
                        >
                          <div className="flex items-center gap-3 px-6 py-4 bg-white hover:bg-slate-50/60 transition-colors">
                            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${isSal ? 'bg-blue-50' : recov ? 'bg-slate-100' : 'bg-amber-50'}`}>
                              {isSal
                                ? <Banknote className="w-4 h-4 text-blue-600" />
                                : <ArrowDownLeft className={`w-4 h-4 ${recov ? 'text-slate-400' : 'text-amber-600'}`} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[11px] font-black uppercase px-2 py-0.5 rounded-lg ${isSal ? 'bg-blue-50 text-blue-700' : recov ? 'bg-slate-100 text-slate-400 line-through' : 'bg-amber-50 text-amber-700'}`}>
                                  {isSal ? 'Salary' : 'Advance'}
                                </span>
                                {isAdv && !recov && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">Pending</span>}
                                {recov && <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">Recovered</span>}
                              </div>
                              <p className="text-[12px] text-slate-600 mt-0.5">
                                {isSal ? fmtMonth(p.month) : `Advance — ${p.month ? fmtMonth(p.month) : fmtDate(p.paidOn)}`}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Paid {fmtDate(p.paidOn)} · {p.wallet === 'salary' ? 'Salary' : p.wallet === 'vehicle' ? 'Vehicle' : 'Home'} Wallet
                                {p.notes && ` · ${p.notes}`}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className={`text-[14px] font-bold tabular-nums ${isSal ? 'text-slate-900' : recov ? 'text-slate-400' : 'text-amber-700'}`}>
                                {isSal ? '' : '-'}AED {fmtAmt(p.amount)}
                              </p>
                              {isAdv && !recov && (
                                <button onClick={() => handleRecover(entryId)}
                                  className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-emerald-600 transition-colors mt-1 ml-auto">
                                  <RotateCcw className="w-3 h-3" /> Recover
                                </button>
                              )}
                            </div>
                          </div>
                        </MotionSwipeableRow>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}

              {/* Pagination */}
              {totalHistPages > 1 && (
                <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/40">
                  <p className="text-[11px] text-slate-400 font-medium">
                    {filteredHist.length} records · Page {histPage}/{totalHistPages}
                  </p>
                  <div className="flex items-center gap-1">
                    <button disabled={histPage <= 1} onClick={() => setHistPage((p) => p - 1)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button disabled={histPage >= totalHistPages} onClick={() => setHistPage((p) => p + 1)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Footer total */}
              {filteredHist.length > 0 && (
                <div className="px-6 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
                  <p className="text-[12px] text-slate-400">{filteredHist.length} record{filteredHist.length !== 1 ? 's' : ''}</p>
                  <p className="text-[13px] font-black text-slate-800">
                    Total: AED {fmtAmt(filteredHist.reduce((s, p) => s + p.amount, 0))}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ══════════ EDIT DRAWER ══════════ */}
      <AnimatePresence>
        {editOpen && (
          <>
            <motion.div key="edit-bg" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => setEditOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
            <motion.div key="edit-panel"
              initial={{ x:'100%' }} animate={{ x:0 }} exit={{ x:'100%' }}
              transition={{ type:'spring', damping:28, stiffness:280 }}
              className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 flex flex-col shadow-2xl">

              <div className="px-6 py-5 shrink-0 flex items-center justify-between"
                style={{ background:'linear-gradient(150deg, #060e1e, #091833)' }}>
                <div>
                  <p className="text-[16px] font-black text-white">Edit Employee</p>
                  <p className="text-[11px] mt-0.5" style={{ color:'rgba(255,255,255,0.35)' }}>Shah House Staff</p>
                </div>
                <button onClick={() => setEditOpen(false)}
                  className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-4 shrink-0 bg-slate-50">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-[16px] font-black"
                  style={{ background: editForm.name ? avatarGrad(editForm.name) : '#cbd5e1' }}>
                  {editForm.name ? initials(editForm.name) : <Users className="w-5 h-5 text-white/60" />}
                </div>
                <div>
                  <p className="text-[15px] font-bold text-slate-800">{editForm.name || 'Employee'}</p>
                  <p className="text-[12px] text-slate-400">{editForm.role ?? ''}{editForm.monthlySalary ? ` · AED ${fmtAmt(editForm.monthlySalary)}` : ''}</p>
                </div>
              </div>

              <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Full Name *</label>
                  <input value={editForm.name ?? ''} onChange={(e) => setEF('name', e.target.value)} required placeholder="Full name" className={INP} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Role *</label>
                    <select value={editForm.role ?? 'Driver'} onChange={(e) => setEF('role', e.target.value)} className={SEL}>
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Status</label>
                    <select value={editForm.status ?? 'active'} onChange={(e) => setEF('status', e.target.value)} className={SEL}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Nationality</label>
                    <input value={editForm.nationality ?? ''} onChange={(e) => setEF('nationality', e.target.value)} placeholder="e.g. Pakistani" className={INP} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Phone</label>
                    <input value={editForm.phone ?? ''} onChange={(e) => setEF('phone', e.target.value)} placeholder="+971 50 000 0000" className={INP} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Date of Birth *</label>
                    <input value={editForm.dateOfBirth ?? ''} onChange={(e) => setEF('dateOfBirth', e.target.value)} type="date" required className={INP} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Join Date</label>
                    <input value={editForm.joinDate ?? ''} onChange={(e) => setEF('joinDate', e.target.value)} type="date" className={INP} />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Monthly Salary (AED) *</label>
                  <input value={editForm.monthlySalary ?? ''} onChange={(e) => setEF('monthlySalary', e.target.value)} type="number" min="0" required placeholder="0" className={INP} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Notes</label>
                  <textarea value={editForm.notes ?? ''} onChange={(e) => setEF('notes', e.target.value)} rows={3} className={`${INP} h-auto py-3 resize-none`} />
                </div>
              </form>

              <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0">
                <button type="button" onClick={() => setEditOpen(false)}
                  className="flex-1 h-11 rounded-2xl border-2 border-slate-200 text-[14px] font-bold text-slate-600 hover:bg-slate-50 transition-all">
                  Cancel
                </button>
                <button onClick={handleSaveEdit}
                  className="flex-1 h-11 rounded-2xl text-[14px] font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                  style={{ background:'linear-gradient(135deg,#060e1e,#0d2147)' }}>
                  <BadgeCheck className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══════════ PAY SALARY MODAL ══════════ */}
      <AnimatePresence>
        {payOpen && (
          <>
            <motion.div key="pay-bg" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => !isPayingSal && setPayOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
            <motion.div key="pay-box"
              initial={{ opacity:0, scale:0.92, y:20 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.9 }}
              transition={{ type:'spring', damping:26, stiffness:300 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
              <div className="bg-white rounded-3xl w-full max-w-sm pointer-events-auto overflow-hidden"
                style={{ boxShadow:'0 24px 64px rgba(0,0,0,0.22)' }}>
                <div className="px-6 py-5 flex items-center justify-between"
                  style={{ background:'linear-gradient(150deg, #0a172e, #0c1f3f)' }}>
                  <div>
                    <p className="text-[16px] font-black text-white">Pay Salary</p>
                    <p className="text-[11px] mt-0.5" style={{ color:'rgba(255,255,255,0.35)' }}>{emp.name} · {emp.role}</p>
                  </div>
                  <button onClick={() => setPayOpen(false)} disabled={isPayingSal}
                    className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all disabled:opacity-40">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handlePaySalary} className="p-6 space-y-4">
                  {emp.salaryHistory.some((p) => p.type === 'salary' && p.month === payForm.month) && (
                    <div className="flex items-center gap-2 p-3 rounded-2xl bg-amber-50 border border-amber-200">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <p className="text-[12px] text-amber-700 font-medium">Salary for <strong>{fmtMonth(payForm.month)}</strong> already recorded.</p>
                    </div>
                  )}
                  {advForPayMonth > 0 && (
                    <div className="flex items-center gap-2 p-3 rounded-2xl bg-orange-50 border border-orange-200">
                      <ArrowDownLeft className="w-4 h-4 text-orange-600 shrink-0" />
                      <p className="text-[12px] text-orange-800 font-medium">
                        Advance of <strong>AED {fmtAmt(advForPayMonth)}</strong> already given for {fmtMonth(payForm.month)}.
                      </p>
                    </div>
                  )}
                  {outstandingAdv > 0 && advForPayMonth === 0 && (
                    <div className="flex items-center gap-2 p-3 rounded-2xl bg-amber-50 border border-amber-100">
                      <ArrowDownLeft className="w-4 h-4 text-amber-600 shrink-0" />
                      <p className="text-[12px] text-amber-800 font-medium">Outstanding advance: <strong>AED {fmtAmt(outstandingAdv)}</strong></p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Month *</label>
                      <input value={payForm.month} onChange={(e) => setPF('month', e.target.value)} type="month" required className={INP} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Amount (AED) *</label>
                      <input value={payForm.amount} onChange={(e) => setPF('amount', e.target.value)} type="number" min="0" required placeholder="0" className={INP} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Deducted From</label>
                    <div className="flex items-center gap-3 p-3.5 rounded-2xl border-2"
                      style={{ borderColor:'#7c3aed', background:'#f5f3ff' }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background:'linear-gradient(135deg,#6d28d9,#7c3aed)' }}>
                        <Wallet className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[13px] font-bold text-purple-700">Salary Wallet</p>
                        <p className="text-[10px] text-purple-400">Dedicated employee salary fund</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[16px] font-black text-purple-700">AED {fmtAmt(salaryWallet.balance)}</p>
                        <p className="text-[10px] text-purple-400">Available</p>
                      </div>
                    </div>
                  </div>
                  {Number(payForm.amount) > 0 && (() => {
                    const after = salaryWallet.balance - Number(payForm.amount);
                    return (
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <span className="text-[12px] text-slate-500">Balance after payment</span>
                        <span className={`text-[14px] font-black ${after < 0 ? 'text-red-600' : after < LOW_BALANCE_THRESHOLD ? 'text-amber-600' : 'text-emerald-600'}`}>
                          AED {fmtAmt(Math.max(0, after))}
                        </span>
                      </div>
                    );
                  })()}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Notes</label>
                    <input value={payForm.notes} onChange={(e) => setPF('notes', e.target.value)} placeholder="e.g. July salary…" className={INP} />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setPayOpen(false)} disabled={isPayingSal}
                      className="flex-1 h-11 rounded-2xl border-2 border-slate-200 text-[14px] font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50">
                      Cancel
                    </button>
                    <button type="submit" disabled={isPayingSal}
                      className="flex-1 h-11 rounded-2xl text-[14px] font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-60"
                      style={{ background:'linear-gradient(135deg,#0b1d3a,#1e3a6e)' }}>
                      {isPayingSal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                      {isPayingSal ? 'Processing…' : `Pay AED ${fmtAmt(Number(payForm.amount) || 0)}`}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══════════ ADVANCE MODAL ══════════ */}
      <AnimatePresence>
        {advOpen && (
          <>
            <motion.div key="adv-bg" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => !isGivingAdv && setAdvOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
            <motion.div key="adv-box"
              initial={{ opacity:0, scale:0.92, y:20 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.9 }}
              transition={{ type:'spring', damping:26, stiffness:300 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
              <div className="bg-white rounded-3xl w-full max-w-sm pointer-events-auto overflow-hidden"
                style={{ boxShadow:'0 24px 64px rgba(0,0,0,0.22)' }}>
                <div className="px-6 py-5 flex items-center justify-between"
                  style={{ background:'linear-gradient(135deg,#d97706,#92400e)' }}>
                  <div>
                    <p className="text-[16px] font-black text-white">Salary Advance</p>
                    <p className="text-[11px] mt-0.5" style={{ color:'rgba(255,255,255,0.5)' }}>{emp.name} · {emp.role}</p>
                  </div>
                  <button onClick={() => setAdvOpen(false)} disabled={isGivingAdv}
                    className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/25 transition-all disabled:opacity-40">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleAdvance} className="p-6 space-y-4">
                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-100">
                    <ArrowDownLeft className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[12px] text-amber-800 leading-relaxed">Deducted from wallet immediately. Select the month this advance is for.</p>
                  </div>
                  {outstandingAdv > 0 && (
                    <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                      <p className="text-[12px] text-slate-700">Current outstanding: <strong className="text-amber-700">AED {fmtAmt(outstandingAdv)}</strong></p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Advance For Month *</label>
                      <input value={advForm.month} onChange={(e) => setAF('month', e.target.value)} type="month" required className={INP} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Amount (AED) *</label>
                      <input value={advForm.amount} onChange={(e) => setAF('amount', e.target.value)} type="number" min="0" required placeholder="0" className={INP} autoFocus />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Deduct from Wallet</label>
                    <WalletPicker value={advForm.wallet} onChange={(k) => setAF('wallet', k)} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Reason / Notes</label>
                    <input value={advForm.notes} onChange={(e) => setAF('notes', e.target.value)} placeholder="e.g. Medical emergency, Eid bonus…" className={INP} />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setAdvOpen(false)} disabled={isGivingAdv}
                      className="flex-1 h-11 rounded-2xl border-2 border-slate-200 text-[14px] font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50">
                      Cancel
                    </button>
                    <button type="submit" disabled={isGivingAdv}
                      className="flex-1 h-11 rounded-2xl text-[14px] font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-60"
                      style={{ background:'linear-gradient(135deg,#d97706,#92400e)' }}>
                      {isGivingAdv ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownLeft className="w-4 h-4" />}
                      {isGivingAdv ? 'Processing…' : `Give AED ${fmtAmt(Number(advForm.amount) || 0)}`}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══════════ EDIT HISTORY MODAL ══════════ */}
      <AnimatePresence>
        {editHistEntry && (
          <>
            <motion.div key="eh-bg" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => !isSavingHist && setEditHistEntry(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
            <motion.div key="eh-box"
              initial={{ opacity:0, scale:0.92, y:20 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.9 }}
              transition={{ type:'spring', damping:26, stiffness:300 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
              <div className="bg-white rounded-3xl w-full max-w-sm pointer-events-auto overflow-hidden"
                style={{ boxShadow:'0 24px 64px rgba(0,0,0,0.22)' }}>
                <div className="px-6 py-5 flex items-center justify-between"
                  style={{ background:'linear-gradient(135deg,#1d4ed8,#2563eb)' }}>
                  <div>
                    <p className="text-[16px] font-black text-white">Edit Payment Record</p>
                    <p className="text-[11px] mt-0.5 capitalize" style={{ color:'rgba(255,255,255,0.5)' }}>
                      {editHistEntry.type} · {editHistEntry.month ? fmtMonth(editHistEntry.month) : fmtDate(editHistEntry.paidOn)}
                    </p>
                  </div>
                  <button onClick={() => setEditHistEntry(null)} disabled={isSavingHist}
                    className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/25 transition-all disabled:opacity-40">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleEditHist} className="p-6 space-y-4">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500">
                    Note: editing a record does not reverse the wallet transaction.
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                        {editHistEntry.type === 'salary' ? 'Salary Month' : 'Advance For Month'}
                      </label>
                      <input value={editHistForm.month} onChange={(e) => setEditHistForm((f) => ({ ...f, month: e.target.value }))}
                        type="month" className={INP} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Amount (AED) *</label>
                      <input value={editHistForm.amount} onChange={(e) => setEditHistForm((f) => ({ ...f, amount: e.target.value }))}
                        type="number" min="1" required placeholder="0" className={INP} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Notes</label>
                    <input value={editHistForm.notes} onChange={(e) => setEditHistForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="Add notes…" className={INP} />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setEditHistEntry(null)} disabled={isSavingHist}
                      className="flex-1 h-11 rounded-2xl border-2 border-slate-200 text-[14px] font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50">
                      Cancel
                    </button>
                    <button type="submit" disabled={isSavingHist}
                      className="flex-1 h-11 rounded-2xl text-[14px] font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-60"
                      style={{ background:'linear-gradient(135deg,#1d4ed8,#2563eb)' }}>
                      {isSavingHist ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {isSavingHist ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══════════ DELETE HISTORY CONFIRM ══════════ */}
      <AnimatePresence>
        {delHistEntry && (
          <>
            <motion.div key="dh-bg" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => !isDeletingHist && setDelHistEntry(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
            <motion.div key="dh-box"
              initial={{ opacity:0, scale:0.88, y:20 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.9 }}
              transition={{ type:'spring', damping:26, stiffness:320 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
              <div className="bg-white rounded-3xl p-7 w-full max-w-xs pointer-events-auto text-center"
                style={{ boxShadow:'0 24px 64px rgba(0,0,0,0.22)' }}>
                <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-7 h-7 text-red-500" />
                </div>
                <h3 className="text-[17px] font-black text-slate-900 mb-2">Delete Record?</h3>
                <p className="text-[13px] text-slate-500 leading-relaxed mb-2">
                  <span className="capitalize font-semibold text-slate-700">{delHistEntry.type}</span> of{' '}
                  <strong>AED {fmtAmt(delHistEntry.amount)}</strong> for{' '}
                  {delHistEntry.month ? fmtMonth(delHistEntry.month) : fmtDate(delHistEntry.paidOn)}.
                </p>
                <p className="text-[11px] text-slate-400 mb-6">Wallet balance will not be reversed.</p>
                <div className="flex gap-3">
                  <button onClick={() => setDelHistEntry(null)} disabled={isDeletingHist}
                    className="flex-1 h-11 rounded-2xl border-2 border-slate-200 text-[14px] font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50">
                    Cancel
                  </button>
                  <button onClick={handleDeleteHist} disabled={isDeletingHist}
                    className="flex-1 h-11 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-[14px] font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                    {isDeletingHist ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {isDeletingHist ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══════════ DELETE EMPLOYEE CONFIRM ══════════ */}
      <AnimatePresence>
        {delOpen && (
          <>
            <motion.div key="del-bg" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => setDelOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
            <motion.div key="del-modal"
              initial={{ opacity:0, scale:0.88, y:20 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.9 }}
              transition={{ type:'spring', damping:26, stiffness:320 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
              <div className="bg-white rounded-3xl p-7 w-full max-w-xs pointer-events-auto text-center"
                style={{ boxShadow:'0 24px 64px rgba(0,0,0,0.22)' }}>
                <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-7 h-7 text-red-500" />
                </div>
                <h3 className="text-[17px] font-black text-slate-900 mb-3">Remove Employee?</h3>

                {hasHistory ? (
                  <>
                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left mb-4">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[13px] font-bold text-amber-900">Cannot delete yet</p>
                        <p className="text-[12px] text-amber-700 mt-0.5 leading-relaxed">
                          <strong>{emp.name}</strong> has <strong>{emp.salaryHistory.length} payment record{emp.salaryHistory.length !== 1 ? 's' : ''}</strong>.
                          Delete all history entries first, then remove the employee.
                        </p>
                      </div>
                    </div>
                    <button onClick={() => setDelOpen(false)}
                      className="w-full h-11 rounded-2xl border-2 border-slate-200 text-[14px] font-bold text-slate-600 hover:bg-slate-50 transition-all">
                      Got It
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-[13px] text-slate-500 leading-relaxed mb-6">
                      <strong className="text-slate-700">{emp.name}</strong> will be permanently removed.
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
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
