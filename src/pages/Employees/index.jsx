import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserPlus, Wallet, Cake, Phone, CalendarDays, BadgeCheck,
  ChevronDown, ChevronUp, Pencil, Banknote, Clock, CheckCircle2,
  AlertCircle, Car, Home, Trash2, ArrowDownLeft, ArrowRight, X,
} from 'lucide-react';
import {
  selectEmployees, selectUpcomingBirthdays,
  addEmployee, updateEmployee, deleteEmployee, recordSalaryPayment,
} from '../../store/slices/employeesSlice';
import { selectVehicleWallet, selectHomeWallet, deductFromWallet, LOW_BALANCE_THRESHOLD } from '../../store/slices/walletSlice';
import toast from 'react-hot-toast';

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
const initials  = (n = '') => n.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
const fmtAmt    = (n) => Number(n).toLocaleString('en-AE', { maximumFractionDigits: 0 });
const fmtDate   = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtDateLong = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtMonth  = (m) => new Date(m + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
const calcAge   = (dob) => {
  const t = new Date(), d = new Date(dob);
  let a = t.getFullYear() - d.getFullYear();
  if (t < new Date(t.getFullYear(), d.getMonth(), d.getDate())) a--;
  return a;
};

const ROLES   = ['Driver', 'Housemaid', 'Cook', 'Gardener', 'Security Guard', 'Nanny', 'Cleaner', 'Butler', 'Handyman', 'Other'];
const CUR_MON = new Date().toISOString().slice(0, 7);

const EMP_BLANK = {
  name: '', role: 'Driver', phone: '', nationality: '',
  dateOfBirth: '', joinDate: new Date().toISOString().split('T')[0],
  monthlySalary: '', status: 'active', notes: '',
};
const PAY_BLANK = { month: CUR_MON, amount: '', wallet: 'home', notes: '' };
const INP = 'w-full h-11 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 transition-all';
const SEL = `${INP} cursor-pointer`;

// ── Employee Card ─────────────────────────────────────────────────────────────
function EmployeeCard({ emp, bday, onEdit, onDelete, onPay, isHistOpen, onToggleHist }) {
  const color         = avatarColor(emp.name);
  const grad          = avatarGrad(emp.name);
  const isActive      = emp.status === 'active';
  const paidThisMonth = emp.salaryHistory.some((p) => p.type === 'salary' && p.month === CUR_MON);
  const outAdv        = emp.salaryHistory.filter((p) => p.type === 'advance' && !p.recovered).reduce((s, p) => s + p.amount, 0);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3 }}
      className="group rounded-3xl overflow-hidden bg-white flex flex-col"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.1)' }}>

      {/* ══════════ HEADER ══════════
          Avatar + name live INSIDE the header so
          overflow-hidden never clips anything.
      ═════════════════════════════ */}
      <div
        className="relative px-5 pt-4 pb-4 overflow-hidden"
        style={{ background: 'linear-gradient(150deg, #0a172e 0%, #0c1f3f 55%, #0e2550 100%)' }}>

        {/* Accent colour strip */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:color, opacity:0.9 }} />

        {/* Decorative rings */}
        <div style={{ position:'absolute', top:-36, right:-36, width:130, height:130, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.06)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:-18, right:-18, width:80,  height:80,  borderRadius:'50%', border:'1px solid rgba(255,255,255,0.09)', pointerEvents:'none' }} />

        {/* Ghost watermark */}
        <div style={{
          position:'absolute', right:12, bottom:-8,
          fontSize:80, fontWeight:900, lineHeight:1,
          color:'rgba(255,255,255,0.05)',
          letterSpacing:'-3px',
          userSelect:'none', pointerEvents:'none',
        }}>
          {initials(emp.name)}
        </div>

        {/* Birthday badge */}
        {bday && (
          <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
            style={{ background:'#f59e0b', boxShadow:'0 2px 8px rgba(245,158,11,0.5)', zIndex:10 }}>
            <Cake className="w-3 h-3" />
            {bday.daysUntilBirthday === 0 ? '🎉 Today!' : `${bday.daysUntilBirthday} days`}
          </div>
        )}

        {/* Avatar + name row — fully inside header */}
        <div className="relative flex items-center gap-4 mt-1" style={{ zIndex:5 }}>
          <div
            className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center text-white text-[20px] font-black select-none"
            style={{
              background: grad,
              border: '2.5px solid rgba(255,255,255,0.22)',
              boxShadow: `0 4px 20px ${color}70`,
            }}>
            {initials(emp.name)}
          </div>

          <div className="min-w-0 flex-1 pr-2">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[18px] font-black text-white leading-tight truncate">{emp.name}</p>
              <span
                className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase"
                style={isActive
                  ? { background:'rgba(22,163,74,0.25)', color:'#86efac', border:'1px solid rgba(22,163,74,0.3)' }
                  : { background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.4)', border:'1px solid rgba(255,255,255,0.12)' }}>
                {isActive ? '● Active' : '○ Inactive'}
              </span>
            </div>
            <p className="text-[11px] font-semibold mt-0.5" style={{ color:'rgba(255,255,255,0.38)' }}>
              {emp.role}{emp.nationality ? ` · ${emp.nationality}` : ''}
            </p>
          </div>
        </div>

        {/* Edit / delete — hover reveal */}
        <div className="absolute bottom-3.5 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ zIndex:10 }}>
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

      {/* ══════════ BODY ══════════ */}
      <div className="flex-1 flex flex-col px-5 pt-4 pb-4 gap-3">

        {/* Salary row */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl"
          style={{ background:'#f8fafc', border:'1px solid #f1f5f9' }}>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Monthly Salary</p>
            <p className="text-[18px] font-black text-slate-900 leading-tight">AED {fmtAmt(emp.monthlySalary)}</p>
          </div>
          {isActive ? (
            paidThisMonth
              ? <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold text-emerald-700"
                  style={{ background:'rgba(22,163,74,0.1)', border:'1px solid rgba(22,163,74,0.2)' }}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                </div>
              : <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold text-red-600"
                  style={{ background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.18)' }}>
                  <AlertCircle className="w-3.5 h-3.5" /> Unpaid
                </div>
          ) : (
            <span className="text-[12px] text-slate-400 font-semibold">Inactive</span>
          )}
        </div>

        {/* Contact / join info */}
        <div className="space-y-2">
          {emp.dateOfBirth && (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                style={{ background:`${color}18` }}>
                <Cake className="w-3.5 h-3.5" style={{ color }} />
              </div>
              <p className="text-[13px] text-slate-600 font-medium">{fmtDateLong(emp.dateOfBirth)} · {calcAge(emp.dateOfBirth)} yrs</p>
            </div>
          )}
          {emp.phone && (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                style={{ background:`${color}18` }}>
                <Phone className="w-3.5 h-3.5" style={{ color }} />
              </div>
              <p className="text-[13px] text-slate-600 font-medium truncate">{emp.phone}</p>
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
              style={{ background:`${color}18` }}>
              <CalendarDays className="w-3.5 h-3.5" style={{ color }} />
            </div>
            <p className="text-[13px] text-slate-600 font-medium">Joined {fmtDate(emp.joinDate)}</p>
          </div>
        </div>

        {/* Outstanding advance warning */}
        {outAdv > 0 && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)' }}>
            <ArrowDownLeft className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <p className="text-[12px] font-bold text-amber-700">Advance: AED {fmtAmt(outAdv)} outstanding</p>
          </div>
        )}

        <div className="flex-1" />

        {/* Action buttons */}
        <div className="border-t border-slate-100 pt-3 flex items-center gap-2">
          {isActive && (
            <button onClick={onPay}
              className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-2xl text-[12px] font-bold text-white hover:opacity-90 active:scale-[0.97] transition-all"
              style={{ background: `linear-gradient(135deg,${color},${PALETTES[PALETTES.findIndex(([a]) => a === color) > -1 ? PALETTES.findIndex(([a]) => a === color) : 0]?.[1] ?? color})`, background: avatarGrad(emp.name) }}>
              <Banknote className="w-3.5 h-3.5" /> Pay Salary
            </button>
          )}
          <Link to={`/employees/${emp.id}`}
            className="flex items-center justify-center gap-1 h-9 px-3 rounded-2xl text-[12px] font-bold border-2 border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-800 transition-all">
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button onClick={onToggleHist}
            className="flex items-center gap-1 h-9 px-3 rounded-2xl text-[12px] font-bold border-2 border-slate-200 text-slate-600 hover:border-slate-300 transition-all">
            <Clock className="w-3.5 h-3.5" />
            {isHistOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Expandable history */}
        <AnimatePresence>
          {isHistOpen && (
            <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
              className="overflow-hidden">
              <div className="border-t border-slate-100 pt-3">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">Payment History</p>
                {emp.salaryHistory.length === 0 ? (
                  <p className="text-[12px] text-slate-400 italic py-2 text-center">No payments recorded yet</p>
                ) : (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto" style={{ scrollbarWidth:'thin' }}>
                    {emp.salaryHistory.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 py-2 px-3 rounded-xl bg-slate-50">
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-bold text-slate-700">{p.type === 'salary' ? fmtMonth(p.month) : `Advance — ${fmtDate(p.paidOn)}`}</p>
                          <p className="text-[10px] text-slate-400">{p.wallet === 'vehicle' ? 'Vehicle' : 'Home'} Wallet · {fmtDate(p.paidOn)}</p>
                        </div>
                        <p className="text-[13px] font-bold text-slate-800 tabular-nums shrink-0">AED {fmtAmt(p.amount)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function EmployeesPage() {
  const dispatch      = useDispatch();
  const employees     = useSelector(selectEmployees);
  const birthdays     = useSelector(selectUpcomingBirthdays);
  const vehicleWallet = useSelector(selectVehicleWallet);
  const homeWallet    = useSelector(selectHomeWallet);

  const [empDrawer,  setEmpDrawer]  = useState(null);   // null | 'add' | emp-obj
  const [payModal,   setPayModal]   = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);
  const [historyId,  setHistoryId]  = useState(null);
  const [empForm,    setEmpForm]    = useState(EMP_BLANK);
  const [payForm,    setPayForm]    = useState(PAY_BLANK);

  const setEF = (k, v) => setEmpForm((f) => ({ ...f, [k]: v }));
  const setPF = (k, v) => setPayForm((f) => ({ ...f, [k]: v }));

  const active         = employees.filter((e) => e.status === 'active');
  const monthlyPayroll = active.reduce((s, e) => s + Number(e.monthlySalary), 0);
  const unpaidList     = active.filter((e) => !e.salaryHistory.some((p) => p.type === 'salary' && p.month === CUR_MON));

  const openAdd  = ()    => { setEmpForm(EMP_BLANK); setEmpDrawer('add'); };
  const openEdit = (emp) => { setEmpForm({ ...emp, monthlySalary: String(emp.monthlySalary) }); setEmpDrawer(emp); };
  const openPay  = (emp) => { setPayForm({ ...PAY_BLANK, amount: String(emp.monthlySalary) }); setPayModal(emp); };

  const handleSaveEmp = (e) => {
    e.preventDefault();
    if (!empForm.name.trim() || !empForm.dateOfBirth || !empForm.monthlySalary)
      return toast.error('Fill all required fields');
    if (empDrawer === 'add') {
      dispatch(addEmployee({ ...empForm, monthlySalary: Number(empForm.monthlySalary) }));
      toast.success(`${empForm.name} added`);
    } else {
      dispatch(updateEmployee({ ...empForm, id: empDrawer.id, monthlySalary: Number(empForm.monthlySalary) }));
      toast.success('Employee updated');
    }
    setEmpDrawer(null);
  };

  const handleDelete = () => {
    dispatch(deleteEmployee(delConfirm.id));
    toast.success(`${delConfirm.name} removed`);
    setDelConfirm(null);
  };

  const handlePaySalary = (e) => {
    e.preventDefault();
    if (!payForm.amount) return toast.error('Enter amount');
    const amt    = Number(payForm.amount);
    const selW   = payForm.wallet === 'vehicle' ? vehicleWallet : homeWallet;
    const wLabel = payForm.wallet === 'vehicle' ? 'Vehicle' : 'Home';
    const paidOn = new Date().toISOString().split('T')[0];
    dispatch(recordSalaryPayment({
      employeeId: payModal.id,
      payment: { month: payForm.month, amount: amt, wallet: payForm.wallet, paidOn, notes: payForm.notes },
    }));
    dispatch(deductFromWallet({
      wallet: payForm.wallet, amount: amt,
      description: `${payModal.name} — ${fmtMonth(payForm.month)} Salary`,
      date: paidOn, category: 'Salary',
    }));
    const after = selW.balance - amt;
    if (after < LOW_BALANCE_THRESHOLD)
      toast(`${wLabel} wallet low: AED ${fmtAmt(Math.max(0, after))}`, { icon: '⚠️' });
    else
      toast.success(`AED ${fmtAmt(amt)} paid to ${payModal.name}`);
    setPayModal(null);
  };

  return (
    <>
      <div className="space-y-8">

        {/* ── Page header ── */}
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
          className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background:'linear-gradient(135deg,#0b1d3a,#1e3a6e)', boxShadow:'0 4px 14px rgba(11,29,58,0.35)' }}>
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-[22px] font-black text-slate-900 leading-tight">Employees</h1>
              <p className="text-[12px] text-slate-400">Shah House · {active.length} active · {employees.length} total</p>
            </div>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-5 h-10 rounded-2xl text-[13px] font-bold text-white hover:opacity-90 active:scale-[0.97] transition-all"
            style={{ background:'linear-gradient(135deg,#0b1d3a,#1e3a6e)', boxShadow:'0 4px 14px rgba(11,29,58,0.3)' }}>
            <UserPlus className="w-4 h-4" /> Add Employee
          </button>
        </motion.div>

        {/* ── Birthday banner ── */}
        <AnimatePresence>
          {birthdays.length > 0 && (
            <motion.div key="bday" initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
              <div className="flex items-start gap-4 px-5 py-4 rounded-3xl"
                style={{ background:'linear-gradient(135deg,#fffbeb,#fef9ec)', border:'1px solid #fde68a', boxShadow:'0 2px 16px rgba(245,158,11,0.12)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background:'#f59e0b', boxShadow:'0 4px 12px rgba(245,158,11,0.4)' }}>
                  <Cake className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <p className="text-[11px] font-black text-amber-900 uppercase tracking-wider">Birthday Reminder</p>
                  {birthdays.map((emp) => (
                    <div key={emp.id} className="flex items-center gap-2.5 flex-wrap">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[9px] font-black shrink-0"
                        style={{ background: avatarGrad(emp.name) }}>
                        {initials(emp.name)}
                      </div>
                      <span className="text-[14px] font-bold text-amber-950">{emp.name}</span>
                      <span className="text-[12px] text-amber-600">
                        {emp.daysUntilBirthday === 0 ? '— 🎉 Today!' : emp.daysUntilBirthday === 1 ? '— Tomorrow' : `— in ${emp.daysUntilBirthday} days`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label:'Total Staff',       value: employees.length,              sub:`${active.length} active`,            icon:Users,        color:'#0b1d3a', bg:'#f0f5ff' },
            { label:'Monthly Payroll',   value:`AED ${fmtAmt(monthlyPayroll)}`, sub:'Active staff total',                icon:Banknote,     color:'#16a34a', bg:'#f0fdf4' },
            { label:'Paid This Month',   value: active.length - unpaidList.length, sub:`of ${active.length} active`,     icon:CheckCircle2, color:'#0891b2', bg:'#ecfeff' },
            { label:'Unpaid This Month', value: unpaidList.length,             sub: unpaidList.length ? 'Action needed' : 'All settled',
              icon:AlertCircle, color: unpaidList.length ? '#dc2626' : '#16a34a', bg: unpaidList.length ? '#fef2f2' : '#f0fdf4' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 flex flex-col gap-3"
              style={{ boxShadow:'0 1px 8px rgba(0,0,0,0.05)', border:'1px solid #f1f5f9' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background:s.bg }}>
                <s.icon className="w-4 h-4" style={{ color:s.color }} />
              </div>
              <div>
                <p className="text-[22px] font-black text-slate-900 leading-none">{s.value}</p>
                <p className="text-[11px] font-bold text-slate-400 mt-1">{s.label}</p>
                <p className="text-[10px] text-slate-300 mt-0.5">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Employee Cards ── */}
        {employees.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            <AnimatePresence>
              {employees.map((emp) => (
                <EmployeeCard
                  key={emp.id}
                  emp={emp}
                  bday={birthdays.find((b) => b.id === emp.id)}
                  onEdit={() => openEdit(emp)}
                  onDelete={() => setDelConfirm(emp)}
                  onPay={() => openPay(emp)}
                  isHistOpen={historyId === emp.id}
                  onToggleHist={() => setHistoryId(historyId === emp.id ? null : emp.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 py-24 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Users className="w-8 h-8 text-slate-300" strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p className="text-[15px] font-bold text-slate-400">No employees yet</p>
              <p className="text-[13px] text-slate-300 mt-1">Add your household staff</p>
            </div>
            <button onClick={openAdd}
              className="flex items-center gap-2 px-5 h-10 rounded-2xl text-[13px] font-bold text-white"
              style={{ background:'linear-gradient(135deg,#0b1d3a,#1e3a6e)' }}>
              <UserPlus className="w-4 h-4" /> Add First Employee
            </button>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          ADD / EDIT SIDE DRAWER
      ══════════════════════════════════════════════ */}
      <AnimatePresence>
        {empDrawer && (
          <>
            <motion.div key="emp-bg"
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => setEmpDrawer(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
            <motion.div key="emp-panel"
              initial={{ x:'100%' }} animate={{ x:0 }} exit={{ x:'100%' }}
              transition={{ type:'spring', damping:28, stiffness:280 }}
              className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 flex flex-col shadow-2xl">

              <div className="px-6 py-5 shrink-0 flex items-center justify-between"
                style={{ background:'linear-gradient(150deg, #0a172e, #0c1f3f)' }}>
                <div>
                  <p className="text-[16px] font-black text-white">
                    {empDrawer === 'add' ? 'Add Employee' : 'Edit Employee'}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color:'rgba(255,255,255,0.35)' }}>Shah House Staff</p>
                </div>
                <button onClick={() => setEmpDrawer(null)}
                  className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Live preview */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-4 shrink-0 bg-slate-50">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-[16px] font-black"
                  style={{ background: empForm.name ? avatarGrad(empForm.name) : '#cbd5e1' }}>
                  {empForm.name ? initials(empForm.name) : <Users className="w-5 h-5 text-white/60" />}
                </div>
                <div>
                  <p className="text-[15px] font-bold text-slate-800">{empForm.name || 'New Employee'}</p>
                  <p className="text-[12px] text-slate-400">{empForm.role}{empForm.monthlySalary ? ` · AED ${fmtAmt(empForm.monthlySalary)}` : ''}</p>
                </div>
              </div>

              <form onSubmit={handleSaveEmp} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Full Name *</label>
                  <input value={empForm.name} onChange={(e) => setEF('name', e.target.value)} required placeholder="e.g. Ahmad Khan" className={INP} />
                </div>

                {/* Role + Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Role *</label>
                    <select value={empForm.role} onChange={(e) => setEF('role', e.target.value)} className={SEL}>
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Status</label>
                    <select value={empForm.status} onChange={(e) => setEF('status', e.target.value)} className={SEL}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Nationality + Phone */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Nationality</label>
                    <input value={empForm.nationality} onChange={(e) => setEF('nationality', e.target.value)} placeholder="e.g. Pakistani" className={INP} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Phone</label>
                    <input value={empForm.phone} onChange={(e) => setEF('phone', e.target.value)} placeholder="+971 50 000 0000" className={INP} />
                  </div>
                </div>

                {/* DOB + Join Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Date of Birth *</label>
                    <input value={empForm.dateOfBirth} onChange={(e) => setEF('dateOfBirth', e.target.value)} type="date" required className={INP} />
                    {empForm.dateOfBirth && (
                      <p className="text-[11px] text-slate-400 mt-1 ml-1">{calcAge(empForm.dateOfBirth)} years old</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Join Date *</label>
                    <input value={empForm.joinDate} onChange={(e) => setEF('joinDate', e.target.value)} type="date" required className={INP} />
                  </div>
                </div>

                {/* Salary */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Monthly Salary (AED) *</label>
                  <input value={empForm.monthlySalary} onChange={(e) => setEF('monthlySalary', e.target.value)}
                    type="number" min="0" step="50" required placeholder="e.g. 2500" className={INP} />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Notes</label>
                  <textarea value={empForm.notes} onChange={(e) => setEF('notes', e.target.value)} rows={3}
                    placeholder="Any additional notes…" className={`${INP} h-auto py-3 resize-none`} />
                </div>
              </form>

              <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0">
                <button type="button" onClick={() => setEmpDrawer(null)}
                  className="flex-1 h-11 rounded-2xl border-2 border-slate-200 text-[14px] font-bold text-slate-600 hover:bg-slate-50 transition-all">
                  Cancel
                </button>
                <button onClick={handleSaveEmp}
                  className="flex-1 h-11 rounded-2xl text-[14px] font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                  style={{ background:'linear-gradient(135deg,#0b1d3a,#1e3a6e)', boxShadow:'0 4px 14px rgba(11,29,58,0.3)' }}>
                  <BadgeCheck className="w-4 h-4" />
                  {empDrawer === 'add' ? 'Add Employee' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════
          PAY SALARY MODAL
      ══════════════════════════════════════════════ */}
      <AnimatePresence>
        {payModal && (
          <>
            <motion.div key="pay-bg"
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => setPayModal(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
            <motion.div key="pay-box"
              initial={{ opacity:0, scale:0.92, y:20 }}
              animate={{ opacity:1, scale:1, y:0 }}
              exit={{ opacity:0, scale:0.9 }}
              transition={{ type:'spring', damping:26, stiffness:300 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
              <div className="bg-white rounded-3xl w-full max-w-sm pointer-events-auto overflow-hidden"
                style={{ boxShadow:'0 24px 64px rgba(0,0,0,0.22)' }}>

                {/* Modal header */}
                <div className="px-6 py-5 flex items-center justify-between"
                  style={{ background:'linear-gradient(150deg, #0a172e, #0c1f3f)' }}>
                  <div>
                    <p className="text-[16px] font-black text-white">Pay Salary</p>
                    <p className="text-[11px] mt-0.5" style={{ color:'rgba(255,255,255,0.35)' }}>{payModal.name} · {payModal.role}</p>
                  </div>
                  <button onClick={() => setPayModal(null)}
                    className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handlePaySalary} className="p-6 space-y-4">
                  {/* Employee preview */}
                  <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-[13px] font-black shrink-0"
                      style={{ background: avatarGrad(payModal.name) }}>
                      {initials(payModal.name)}
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-slate-800">{payModal.name}</p>
                      <p className="text-[11px] text-slate-400">{payModal.role} · Base AED {fmtAmt(payModal.monthlySalary)}/month</p>
                    </div>
                  </div>

                  {/* Already paid warning */}
                  {payModal.salaryHistory.some((p) => p.month === payForm.month && p.type === 'salary') && (
                    <div className="flex items-center gap-2 p-3 rounded-2xl bg-amber-50 border border-amber-200">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <p className="text-[12px] text-amber-700 font-medium">
                        Salary for <strong>{fmtMonth(payForm.month)}</strong> already recorded.
                      </p>
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

                  {/* Wallet selector */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Deduct from Wallet</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { k:'vehicle', label:'Vehicle Wallet', icon:Car,  bal:vehicleWallet.balance, color:'#0b1d3a', bg:'#eef2fb' },
                        { k:'home',    label:'Home Wallet',    icon:Home, bal:homeWallet.balance,    color:'#16a34a', bg:'#f0fdf4' },
                      ].map(({ k, label, icon:Icon, bal, color, bg }) => (
                        <button key={k} type="button" onClick={() => setPF('wallet', k)}
                          className="flex flex-col gap-1.5 p-3 rounded-2xl border-2 text-left transition-all"
                          style={payForm.wallet === k ? { borderColor:color, background:bg } : { borderColor:'#e2e8f0', background:'#f8fafc' }}>
                          <div className="flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5" style={{ color: payForm.wallet === k ? color : '#94a3b8' }} />
                            <span className="text-[11px] font-bold truncate" style={{ color: payForm.wallet === k ? color : '#64748b' }}>{label}</span>
                            {payForm.wallet === k && (
                              <span className="ml-auto shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-black" style={{ background:color }}>✓</span>
                            )}
                          </div>
                          <p className="text-[15px] font-bold" style={{ color: payForm.wallet === k ? color : '#94a3b8' }}>
                            AED {fmtAmt(bal)}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Balance after */}
                  {(() => {
                    const selW  = payForm.wallet === 'vehicle' ? vehicleWallet : homeWallet;
                    const after = selW.balance - (Number(payForm.amount) || 0);
                    return Number(payForm.amount) > 0 ? (
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <span className="text-[12px] text-slate-500">Balance after payment</span>
                        <span className={`text-[14px] font-black ${after < 0 ? 'text-red-600' : after < LOW_BALANCE_THRESHOLD ? 'text-amber-600' : 'text-emerald-600'}`}>
                          AED {fmtAmt(Math.max(0, after))}
                        </span>
                      </div>
                    ) : null;
                  })()}

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Notes</label>
                    <input value={payForm.notes} onChange={(e) => setPF('notes', e.target.value)}
                      placeholder="e.g. July salary, includes bonus…" className={INP} />
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setPayModal(null)}
                      className="flex-1 h-11 rounded-2xl border-2 border-slate-200 text-[14px] font-bold text-slate-600 hover:bg-slate-50 transition-all">
                      Cancel
                    </button>
                    <button type="submit"
                      className="flex-1 h-11 rounded-2xl text-[14px] font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                      style={{ background:'linear-gradient(135deg,#0b1d3a,#1e3a6e)', boxShadow:'0 4px 14px rgba(11,29,58,0.3)' }}>
                      <Banknote className="w-4 h-4" /> Pay AED {fmtAmt(Number(payForm.amount) || 0)}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════
          DELETE CONFIRM
      ══════════════════════════════════════════════ */}
      <AnimatePresence>
        {delConfirm && (
          <>
            <motion.div key="del-bg"
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => setDelConfirm(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
            <motion.div key="del-box"
              initial={{ opacity:0, scale:0.88, y:20 }}
              animate={{ opacity:1, scale:1, y:0 }}
              exit={{ opacity:0, scale:0.9 }}
              transition={{ type:'spring', damping:26, stiffness:320 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
              <div className="bg-white rounded-3xl p-7 w-full max-w-xs pointer-events-auto text-center"
                style={{ boxShadow:'0 24px 64px rgba(0,0,0,0.22)' }}>
                <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-7 h-7 text-red-500" />
                </div>
                <h3 className="text-[17px] font-black text-slate-900 mb-2">Remove Employee?</h3>
                <p className="text-[13px] text-slate-500 leading-relaxed mb-6">
                  <strong className="text-slate-700">{delConfirm.name}</strong> and all payment history will be permanently removed.
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
