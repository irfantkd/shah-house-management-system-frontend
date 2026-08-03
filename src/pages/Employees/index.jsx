import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserPlus, Wallet, Cake, Phone, CalendarDays, BadgeCheck,
  ChevronDown, ChevronUp, Pencil, Banknote, Clock, CheckCircle2,
  AlertCircle, Trash2, ArrowDownLeft, ArrowRight, X, FileText, AlertTriangle,
  Loader2, Search, ChevronLeft, ChevronRight, Printer, Building2,
} from 'lucide-react';
import { useGetQuery, usePostMutation, usePutMutation, useDeleteMutation, useDownloadChallanMutation } from '../../api/apiSlice';
import { MotionSwipeableRow } from '../../components/ui/SwipeableRow';
import { selectCurrentPropertyId } from '../../store/slices/propertiesSlice';
import PageLoader from '../../components/ui/PageLoader';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';

const PAGE_SIZE          = 10;
const LOW_BAL_THRESHOLD  = 5000;
const CUR_MON            = new Date().toISOString().slice(0, 7);

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
const fmtAmt      = (n)  => Number(n).toLocaleString('en-AE', { maximumFractionDigits: 0 });
const fmtDate     = (d)  => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtDateLong = (d)  => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtMonth    = (m)  => new Date(m + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
const calcAge     = (dob) => {
  const t = new Date(), d = new Date(dob);
  let a = t.getFullYear() - d.getFullYear();
  if (t < new Date(t.getFullYear(), d.getMonth(), d.getDate())) a--;
  return a;
};

const ROLES   = ['Driver','Housemaid','Cook','Gardener','Security Guard','Nanny','Cleaner','Butler','Handyman','Other'];
const INP = 'w-full h-11 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 transition-all';
const SEL = `${INP} cursor-pointer`;
const EMP_BLANK  = { name:'', role:'Driver', phone:'', nationality:'', dateOfBirth:'', joinDate:new Date().toISOString().split('T')[0], monthlySalary:'', status:'active', notes:'' };
const PAY_BLANK  = { month:CUR_MON, amount:'', notes:'' };
const PHONE_RE   = /^[+\d][\d\s\-().]{5,19}$/;
const TODAY_STR  = new Date().toISOString().split('T')[0];

function validateEmpForm(f) {
  const e = {};
  if (!f.name.trim())              e.name          = 'Full name is required';
  else if (f.name.trim().length < 2) e.name        = 'Name must be at least 2 characters';

  if (!f.dateOfBirth)              e.dateOfBirth   = 'Date of birth is required';
  else if (f.dateOfBirth >= TODAY_STR) e.dateOfBirth = 'Date of birth must be in the past';
  else if (calcAge(f.dateOfBirth) < 16) e.dateOfBirth = 'Employee must be at least 16 years old';

  if (!f.joinDate)                 e.joinDate      = 'Join date is required';

  if (!f.monthlySalary && f.monthlySalary !== 0)
                                   e.monthlySalary = 'Monthly salary is required';
  else if (Number(f.monthlySalary) < 0)
                                   e.monthlySalary = 'Salary cannot be negative';

  if (f.phone && f.phone.trim() && !PHONE_RE.test(f.phone.trim()))
                                   e.phone         = 'Enter a valid phone number';
  return e;
}

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
        active ? 'bg-navy-900 text-white border-navy-900'
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

// ── PayrollReport Modal ───────────────────────────────────────────────────────
function PayrollReportModal({ open, onClose, propertyId }) {
  const { data: rawData } = useGetQuery(
    { path: '/employees', params: { propertyId, status: 'active' } },
    { skip: !open || !propertyId },
  );
  const employees = Array.isArray(rawData) ? rawData : (rawData?.items ?? []);
  const monthLabel = fmtMonth(CUR_MON);
  const total = employees.reduce((s, e) => s + Number(e.monthlySalary || 0), 0);
  const paid  = employees.filter((e) => (e.salaryHistory ?? []).some((p) => p.type === 'salary' && p.month === CUR_MON));
  const unpaid = employees.filter((e) => !(e.salaryHistory ?? []).some((p) => p.type === 'salary' && p.month === CUR_MON));

  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div key="rpt-bg" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
      <motion.div key="rpt-box"
        initial={{ opacity:0, scale:0.95, y:20 }} animate={{ opacity:1, scale:1, y:0 }}
        exit={{ opacity:0, scale:0.95 }}
        transition={{ type:'spring', damping:28, stiffness:280 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col pointer-events-auto overflow-hidden"
          style={{ boxShadow:'0 24px 64px rgba(0,0,0,0.22)' }}>

          {/* Header */}
          <div className="px-6 py-5 flex items-center justify-between shrink-0"
            style={{ background:'linear-gradient(150deg, #0a172e, #0c1f3f)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[16px] font-black text-white">Payroll Summary</p>
                <p className="text-[11px] mt-0.5" style={{ color:'rgba(255,255,255,0.4)' }}>{monthLabel} · Shah House</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 h-8 rounded-xl bg-white/10 text-white/80 hover:bg-white/20 text-[12px] font-semibold transition-all">
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
              <button onClick={onClose}
                className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-slate-100 shrink-0">
            {[
              { label:'Total Active Staff', value:employees.length, color:'#0b1d3a' },
              { label:'Paid This Month',    value:paid.length,      color:'#16a34a' },
              { label:'Total Payroll',      value:`AED ${fmtAmt(total)}`, color:'#7c3aed' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-[20px] font-black" style={{ color:s.color }}>{s.value}</p>
                <p className="text-[11px] text-slate-400 font-semibold">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {employees.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <p className="text-[14px]">No active employees found</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Employee','Role','Salary (AED)','Status','Paid On'].map((h) => (
                      <th key={h} className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => {
                    const salRecord = (emp.salaryHistory ?? []).find((p) => p.type === 'salary' && p.month === CUR_MON);
                    const isPaid = !!salRecord;
                    return (
                      <tr key={emp.id ?? emp._id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-[11px] font-black shrink-0"
                              style={{ background: avatarGrad(emp.name) }}>
                              {initials(emp.name)}
                            </div>
                            <span className="text-[13px] font-bold text-slate-800">{emp.name}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-3 text-[12px] text-slate-500">{emp.role}</td>
                        <td className="py-3 pr-3 text-[13px] font-bold text-slate-800 tabular-nums">
                          {fmtAmt(emp.monthlySalary)}
                        </td>
                        <td className="py-3 pr-3">
                          <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-black',
                            isPaid
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-600 border border-red-200')}>
                            {isPaid ? '✓ Paid' : '⚠ Unpaid'}
                          </span>
                        </td>
                        <td className="py-3 text-[12px] text-slate-500">
                          {salRecord ? fmtDate(salRecord.paidOn) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200">
                    <td colSpan={2} className="pt-3 text-[12px] font-black text-slate-500 uppercase tracking-wider">Total</td>
                    <td className="pt-3 text-[15px] font-black text-slate-900 tabular-nums">AED {fmtAmt(total)}</td>
                    <td colSpan={2} className="pt-3 text-[12px] text-slate-400">{paid.length} paid · {unpaid.length} pending</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Unpaid alert */}
          {unpaid.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-100 shrink-0">
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-50 border border-red-200">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-[12px] text-red-700 font-semibold">
                  <strong>{unpaid.length} employee{unpaid.length > 1 ? 's' : ''}</strong> {unpaid.length > 1 ? 'have' : 'has'} not received salary for {monthLabel}:
                  {' '}{unpaid.map((e) => e.name).join(', ')}
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Employee Card ─────────────────────────────────────────────────────────────
function EmployeeCard({ emp, bdayInfo, onEdit, onDelete, onPay, isHistOpen, onToggleHist }) {
  const color         = avatarColor(emp.name);
  const grad          = avatarGrad(emp.name);
  const isActive      = emp.status === 'active';
  const paidThisMonth = (emp.salaryHistory ?? []).some((p) => p.type === 'salary' && p.month === CUR_MON);
  const outAdv        = (emp.salaryHistory ?? []).filter((p) => p.type === 'advance' && !p.recovered).reduce((s, p) => s + p.amount, 0);

  return (
    <motion.div layout initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, scale:0.96 }} transition={{ duration:0.3 }}
      className="group rounded-3xl overflow-hidden bg-white flex flex-col"
      style={{ boxShadow:'0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.1)' }}>

      <div className="relative px-5 pt-4 pb-4 overflow-hidden"
        style={{ background:'linear-gradient(150deg, #0a172e 0%, #0c1f3f 55%, #0e2550 100%)' }}>

        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:color, opacity:0.9 }} />
        <div style={{ position:'absolute', top:-36, right:-36, width:130, height:130, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.06)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:-18, right:-18, width:80,  height:80,  borderRadius:'50%', border:'1px solid rgba(255,255,255,0.09)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', right:12, bottom:-8, fontSize:80, fontWeight:900, lineHeight:1, color:'rgba(255,255,255,0.05)', letterSpacing:'-3px', userSelect:'none', pointerEvents:'none' }}>
          {initials(emp.name)}
        </div>

        {bdayInfo && (
          <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
            style={{ background:'#f59e0b', boxShadow:'0 2px 8px rgba(245,158,11,0.5)', zIndex:10 }}>
            <Cake className="w-3 h-3" />
            {bdayInfo.daysUntilBirthday === 0 ? 'Today!' : `${bdayInfo.daysUntilBirthday}d`}
          </div>
        )}

        <div className="relative flex items-center gap-4 mt-1" style={{ zIndex:5 }}>
          <div className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center text-white text-[20px] font-black select-none"
            style={{ background:grad, border:'2.5px solid rgba(255,255,255,0.22)', boxShadow:`0 4px 20px ${color}70` }}>
            {initials(emp.name)}
          </div>
          <div className="min-w-0 flex-1 pr-2">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[18px] font-black text-white leading-tight truncate">{emp.name}</p>
              <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase"
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

        <div className="absolute bottom-3.5 right-4 flex gap-1.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150" style={{ zIndex:10 }}>
          <button onClick={onEdit} className="w-7 h-7 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/15 border border-white/10 transition-all">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="w-7 h-7 rounded-xl flex items-center justify-center text-white/60 hover:text-red-300 hover:bg-red-500/25 border border-white/10 transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col px-5 pt-4 pb-4 gap-3">
        <div className="flex items-center justify-between p-3.5 rounded-2xl" style={{ background:'#f8fafc', border:'1px solid #f1f5f9' }}>
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
          ) : <span className="text-[12px] text-slate-400 font-semibold">Inactive</span>}
        </div>

        <div className="space-y-2">
          {emp.dateOfBirth && (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ background:`${color}18` }}>
                <Cake className="w-3.5 h-3.5" style={{ color }} />
              </div>
              <p className="text-[13px] text-slate-600 font-medium">{fmtDateLong(emp.dateOfBirth)} · {calcAge(emp.dateOfBirth)} yrs</p>
            </div>
          )}
          {emp.phone && (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ background:`${color}18` }}>
                <Phone className="w-3.5 h-3.5" style={{ color }} />
              </div>
              <p className="text-[13px] text-slate-600 font-medium truncate">{emp.phone}</p>
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ background:`${color}18` }}>
              <CalendarDays className="w-3.5 h-3.5" style={{ color }} />
            </div>
            <p className="text-[13px] text-slate-600 font-medium">Joined {fmtDate(emp.joinDate)}</p>
          </div>
        </div>

        {outAdv > 0 && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)' }}>
            <ArrowDownLeft className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <p className="text-[12px] font-bold text-amber-700">Advance: AED {fmtAmt(outAdv)} outstanding</p>
          </div>
        )}

        <div className="flex-1" />

        <div className="border-t border-slate-100 pt-3 flex items-center gap-2">
          {isActive && (
            <button onClick={onPay}
              className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-2xl text-[12px] font-bold text-white hover:opacity-90 active:scale-[0.97] transition-all"
              style={{ background: grad }}>
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

        <AnimatePresence>
          {isHistOpen && (
            <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }} className="overflow-hidden">
              <div className="border-t border-slate-100 pt-3">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">Payment History</p>
                {(emp.salaryHistory ?? []).length === 0 ? (
                  <p className="text-[12px] text-slate-400 italic py-2 text-center">No payments recorded yet</p>
                ) : (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto" style={{ scrollbarWidth:'thin' }}>
                    {emp.salaryHistory.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 py-2 px-3 rounded-xl bg-slate-50">
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-bold text-slate-700">{p.type === 'salary' ? fmtMonth(p.month) : `Advance — ${fmtDate(p.paidOn)}`}</p>
                          <p className="text-[10px] text-slate-400">{p.wallet === 'salary' ? 'Salary Wallet' : p.wallet === 'vehicle' ? 'Vehicle Wallet' : 'Home Wallet'} · {fmtDate(p.paidOn)}</p>
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

// ── Employee List Row (mobile swipe) ─────────────────────────────────────────
function EmployeeListRow({ emp, bdayInfo, onEdit, onDelete, onPay }) {
  const navigate      = useNavigate();
  const color         = avatarColor(emp.name);
  const grad          = avatarGrad(emp.name);
  const isActive      = emp.status === 'active';
  const paidThisMonth = (emp.salaryHistory ?? []).some((p) => p.type === 'salary' && p.month === CUR_MON);
  const outAdv        = (emp.salaryHistory ?? []).filter((p) => p.type === 'advance' && !p.recovered).reduce((s, p) => s + p.amount, 0);
  const empId         = emp.id ?? emp._id;

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
      <div
        className="flex items-center gap-3.5 px-4 py-4 bg-white hover:bg-slate-50/60 active:bg-slate-50 transition-colors cursor-pointer"
        onClick={() => navigate(`/employees/${empId}`)}>

        {/* Avatar with optional birthday dot */}
        <div className="relative shrink-0">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-[13px] font-black"
            style={{ background: grad }}>
            {initials(emp.name)}
          </div>
          {bdayInfo && (
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: '#f59e0b' }}>
              <Cake className="w-2.5 h-2.5 text-white" />
            </div>
          )}
        </div>

        {/* Name + role + salary */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-bold text-slate-900 truncate">{emp.name}</p>
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0"
              style={isActive
                ? { background: 'rgba(22,163,74,0.12)', color: '#16a34a' }
                : { background: '#f1f5f9', color: '#94a3b8' }}>
              {isActive ? '● Active' : '○ Inactive'}
            </span>
          </div>
          <p className="text-[12px] text-slate-400 mt-0.5 truncate">
            {emp.role} · AED {fmtAmt(emp.monthlySalary)}/mo
          </p>
          {outAdv > 0 && (
            <p className="text-[10px] text-amber-600 font-bold mt-0.5">Adv: AED {fmtAmt(outAdv)}</p>
          )}
        </div>

        {/* Pay button or paid badge */}
        <div className="flex items-center gap-2 shrink-0">
          {isActive && (
            paidThisMonth
              ? <span className="text-[10px] font-black px-2 py-1 rounded-lg text-emerald-700 bg-emerald-50 border border-emerald-200">✓ Paid</span>
              : <button
                  onClick={(e) => { e.stopPropagation(); onPay(); }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-white hover:opacity-90 active:scale-95 transition-all"
                  style={{ background: grad }}>
                  <Banknote className="w-3.5 h-3.5" /> Pay
                </button>
          )}
          <ArrowRight className="w-4 h-4 text-slate-300" />
        </div>
      </div>
    </MotionSwipeableRow>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function EmployeesPage() {
  const propertyId = useSelector(selectCurrentPropertyId);

  const [page,           setPage]          = useState(1);
  const [search,         setSearch]        = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [empDrawer,      setEmpDrawer]     = useState(null);
  const [payModal,       setPayModal]      = useState(null);
  const [delConfirm,     setDelConfirm]    = useState(null);
  const [historyId,      setHistoryId]     = useState(null);
  const [empForm,        setEmpForm]       = useState(EMP_BLANK);
  const [empErrors,      setEmpErrors]     = useState({});
  const [payForm,        setPayForm]       = useState(PAY_BLANK);
  const [reportDropdown, setReportDropdown] = useState(false);
  const [payrollReport,  setPayrollReport] = useState(false);
  const [isSavingEmp,    setIsSavingEmp]   = useState(false);
  const [isPayingSalary, setIsPayingSalary] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Stats query (KPIs + birthdays — always full, no pagination)
  const { data: empStats = {} } = useGetQuery(
    { path: '/employees/stats', params: { propertyId } },
    { skip: !propertyId },
  );

  // Paginated list query
  const { data: rawData, isLoading, isFetching } = useGetQuery(
    { path: '/employees', params: { propertyId, page, limit: PAGE_SIZE, ...(debouncedSearch && { search: debouncedSearch }) } },
    { skip: !propertyId },
  );
  const employees  = rawData?.items ?? (Array.isArray(rawData) ? rawData : []);
  const totalPages = rawData?.pages ?? 1;

  const { data: walletData, refetch: refetchWallet } = useGetQuery({ path: '/wallet', params: { propertyId } }, { skip: !propertyId });
  const salaryWallet = { balance: walletData?.salary?.balance ?? 0 };

  const [addEmployeeMut]    = usePostMutation();
  const [updateEmployeeMut] = usePutMutation();
  const [deleteEmployeeMut] = useDeleteMutation();
  const [paymentMut]        = usePostMutation();
  const [downloadMut, { isLoading: isDownloading }] = useDownloadChallanMutation();

  // Stats from backend
  const stats = {
    total:         empStats.total         ?? 0,
    active:        empStats.active        ?? 0,
    monthlyPayroll: empStats.monthlyPayroll ?? 0,
    paidThisMonth: empStats.paidThisMonth ?? 0,
    unpaidThisMonth: empStats.unpaidThisMonth ?? 0,
  };
  const upcomingBirthdays = empStats.upcomingBirthdays ?? [];

  const setEF = (k, v) => {
    setEmpForm((f) => ({ ...f, [k]: v }));
    if (empErrors[k]) setEmpErrors((e) => ({ ...e, [k]: '' }));
  };
  const setPF = (k, v) => setPayForm((f) => ({ ...f, [k]: v }));

  const blurEmpField = (k) => {
    const e = validateEmpForm(empForm);
    if (e[k]) setEmpErrors((prev) => ({ ...prev, [k]: e[k] }));
  };

  const openAdd  = ()    => { setEmpForm(EMP_BLANK); setEmpErrors({}); setEmpDrawer('add'); };
  const openEdit = (emp) => { setEmpForm({ ...emp, monthlySalary: String(emp.monthlySalary) }); setEmpErrors({}); setEmpDrawer(emp); };
  const openPay  = (emp) => { setPayForm({ ...PAY_BLANK, amount: String(emp.monthlySalary) }); setPayModal(emp); };

  const handleDownloadReport = async (period) => {
    setReportDropdown(false);
    try {
      await downloadMut({ path: '/reports/salary', params: { propertyId, period } }).unwrap();
    } catch (err) {
      toast.error(err?.data?.error || 'Failed to download report');
    }
  };

  const handleSaveEmp = async (e) => {
    e.preventDefault();
    const errs = validateEmpForm(empForm);
    if (Object.keys(errs).length) {
      setEmpErrors(errs);
      toast.error('Please fix the highlighted fields');
      return;
    }
    setIsSavingEmp(true);
    try {
      if (empDrawer === 'add') {
        await addEmployeeMut({ path: '/employees', body: { ...empForm, propertyId, monthlySalary: Number(empForm.monthlySalary) } }).unwrap();
        toast.success(`${empForm.name} added`);
      } else {
        await updateEmployeeMut({ path: `/employees/${empDrawer.id}`, body: { ...empForm, monthlySalary: Number(empForm.monthlySalary) } }).unwrap();
        toast.success('Employee updated');
      }
      setEmpDrawer(null);
    } catch (err) {
      const serverErrs = err?.data?.errors;
      if (serverErrs) {
        setEmpErrors(serverErrs);
        toast.error(err.data?.error || 'Validation failed');
      } else {
        toast.error(err?.data?.error || 'Failed to save employee');
      }
    }
    finally { setIsSavingEmp(false); }
  };

  const handleDelete = async () => {
    try {
      await deleteEmployeeMut({ path: `/employees/${delConfirm.id}` }).unwrap();
      toast.success(`${delConfirm.name} removed`);
      setDelConfirm(null);
    } catch (err) { toast.error(err.data?.error || 'Failed to remove employee'); }
  };

  const handlePaySalary = async (e) => {
    e.preventDefault();
    if (!payForm.amount) return toast.error('Enter amount');
    const amt    = Number(payForm.amount);
    const paidOn = new Date().toISOString().split('T')[0];
    setIsPayingSalary(true);
    try {
      await paymentMut({
        path: `/employees/${payModal.id}/pay-salary`,
        body: { propertyId, month: payForm.month, amount: amt, paidOn, notes: payForm.notes },
      }).unwrap();
      await refetchWallet();
      toast.success(`AED ${fmtAmt(amt)} paid to ${payModal.name}`);
      setPayModal(null);
    } catch (err) { toast.error(err?.data?.error || 'Failed to record payment'); }
    finally { setIsPayingSalary(false); }
  };

  if (isLoading) return <PageLoader />;

  return (
    <>
      <div className="space-y-8">

        {/* ── Page header ── */}
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
          className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background:'linear-gradient(135deg,#0b1d3a,#1e3a6e)', boxShadow:'0 4px 14px rgba(11,29,58,0.35)' }}>
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-[22px] font-black text-slate-900 leading-tight">Employees</h1>
              <p className="text-[12px] text-slate-400">Shah House · {stats.active} active · {stats.total} total</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Payroll summary button */}
            <button onClick={() => setPayrollReport(true)}
              className="flex items-center gap-2 px-4 h-10 rounded-2xl text-[13px] font-bold text-slate-700 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all">
              <Building2 className="w-4 h-4" /> Payroll Summary
            </button>
            {/* Salary report download */}
            <div className="relative">
              <button onClick={() => setReportDropdown((d) => !d)} disabled={isDownloading}
                className="flex items-center gap-2 px-4 h-10 rounded-2xl text-[13px] font-bold text-slate-700 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all disabled:opacity-60">
                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Salary Report
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${reportDropdown ? 'rotate-180' : ''}`} />
              </button>
              {reportDropdown && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setReportDropdown(false)} />
                  <div className="absolute right-0 top-full mt-1.5 z-30 w-44 bg-white rounded-2xl border border-slate-200 shadow-xl py-1.5 overflow-hidden">
                    {[{ value:'month', label:'This Month' }, { value:'lastMonth', label:'Last Month' }, { value:'all', label:'All Time' }].map(({ value, label }) => (
                      <button key={value} onClick={() => handleDownloadReport(value)}
                        className="w-full text-left px-4 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors">
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button onClick={openAdd}
              className="flex items-center gap-2 px-5 h-10 rounded-2xl text-[13px] font-bold text-white hover:opacity-90 active:scale-[0.97] transition-all"
              style={{ background:'linear-gradient(135deg,#0b1d3a,#1e3a6e)', boxShadow:'0 4px 14px rgba(11,29,58,0.3)' }}>
              <UserPlus className="w-4 h-4" /> Add Employee
            </button>
          </div>
        </motion.div>

        {/* ── Birthday banner (from backend stats) ── */}
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
                  {upcomingBirthdays.map((emp) => (
                    <div key={emp.id} className="flex items-center gap-2.5 flex-wrap">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[9px] font-black shrink-0"
                        style={{ background: avatarGrad(emp.name) }}>
                        {initials(emp.name)}
                      </div>
                      <span className="text-[14px] font-bold text-amber-950">{emp.name}</span>
                      <span className="text-[12px] text-amber-600">
                        {emp.daysUntilBirthday === 0 ? '— Today! 🎉' : emp.daysUntilBirthday === 1 ? '— Tomorrow' : `— in ${emp.daysUntilBirthday} days`}
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
            { label:'Total Staff',       value: stats.total,              sub:`${stats.active} active`,            icon:Users,        color:'#0b1d3a', bg:'#f0f5ff' },
            { label:'Monthly Payroll',   value:`AED ${fmtAmt(stats.monthlyPayroll)}`, sub:'Active staff total',   icon:Banknote,     color:'#16a34a', bg:'#f0fdf4' },
            { label:'Paid This Month',   value: stats.paidThisMonth,      sub:`of ${stats.active} active`,         icon:CheckCircle2, color:'#0891b2', bg:'#ecfeff' },
            { label:'Unpaid This Month', value: stats.unpaidThisMonth,    sub: stats.unpaidThisMonth ? 'Action needed' : 'All settled',
              icon:AlertCircle, color: stats.unpaidThisMonth ? '#dc2626' : '#16a34a', bg: stats.unpaidThisMonth ? '#fef2f2' : '#f0fdf4' },
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

        {/* ── Search ── */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="w-full h-10 pl-10 pr-4 rounded-2xl border border-slate-200 bg-white text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 transition-all" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* ── Employee List (mobile) + Cards (desktop) ── */}
        <div className={cn('transition-opacity duration-200', isFetching ? 'opacity-50' : 'opacity-100')}>
          {employees.length > 0 ? (
            <>
              {/* Mobile swipe list — hidden at md+ */}
              <div className="md:hidden rounded-2xl border border-slate-100 overflow-hidden bg-white divide-y divide-slate-50">
                <p className="text-[10px] text-slate-400 text-center py-2 bg-slate-50/60 border-b border-slate-100">
                  ← Swipe right to edit · Swipe left to delete →
                </p>
                <AnimatePresence mode="popLayout">
                  {employees.map((emp) => (
                    <EmployeeListRow
                      key={emp.id ?? emp._id}
                      emp={emp}
                      bdayInfo={upcomingBirthdays.find((b) => b.id === (emp.id ?? emp._id))}
                      onEdit={() => openEdit(emp)}
                      onDelete={() => setDelConfirm(emp)}
                      onPay={() => openPay(emp)}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {/* Desktop card grid — hidden below md */}
              <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-3 gap-5">
                <AnimatePresence>
                  {employees.map((emp) => (
                    <EmployeeCard
                      key={emp.id}
                      emp={emp}
                      bdayInfo={upcomingBirthdays.find((b) => b.id === (emp.id ?? emp._id))}
                      onEdit={() => openEdit(emp)}
                      onDelete={() => setDelConfirm(emp)}
                      onPay={() => openPay(emp)}
                      isHistOpen={historyId === (emp.id ?? emp._id)}
                      onToggleHist={() => setHistoryId(historyId === (emp.id ?? emp._id) ? null : (emp.id ?? emp._id))}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 py-24 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Users className="w-8 h-8 text-slate-300" strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <p className="text-[15px] font-bold text-slate-400">{search ? 'No employees match your search' : 'No employees yet'}</p>
                <p className="text-[13px] text-slate-300 mt-1">{search ? 'Try a different name' : 'Add your household staff'}</p>
              </div>
              {!search && (
                <button onClick={openAdd}
                  className="flex items-center gap-2 px-5 h-10 rounded-2xl text-[13px] font-bold text-white"
                  style={{ background:'linear-gradient(135deg,#0b1d3a,#1e3a6e)' }}>
                  <UserPlus className="w-4 h-4" /> Add First Employee
                </button>
              )}
            </div>
          )}

          <PaginationBar page={page} pages={totalPages} onPage={setPage} />
        </div>
      </div>

      {/* ── Payroll Report Modal ── */}
      <PayrollReportModal open={payrollReport} onClose={() => setPayrollReport(false)} propertyId={propertyId} />

      {/* ── ADD / EDIT SIDE DRAWER ── */}
      <AnimatePresence>
        {empDrawer && (
          <>
            <motion.div key="emp-bg" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => { if (!isSavingEmp) { setEmpDrawer(null); setEmpErrors({}); } }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
            <motion.div key="emp-panel"
              initial={{ x:'100%' }} animate={{ x:0 }} exit={{ x:'100%' }}
              transition={{ type:'spring', damping:28, stiffness:280 }}
              className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 flex flex-col shadow-2xl">

              <div className="px-6 py-5 shrink-0 flex items-center justify-between"
                style={{ background:'linear-gradient(150deg, #0a172e, #0c1f3f)' }}>
                <div>
                  <p className="text-[16px] font-black text-white">{empDrawer === 'add' ? 'Add Employee' : 'Edit Employee'}</p>
                  <p className="text-[11px] mt-0.5" style={{ color:'rgba(255,255,255,0.35)' }}>Shah House Staff</p>
                </div>
                <button onClick={() => { setEmpDrawer(null); setEmpErrors({}); }} disabled={isSavingEmp}
                  className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all disabled:opacity-40">
                  <X className="w-4 h-4" />
                </button>
              </div>

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

                {/* Required fields notice */}
                <p className="text-[11px] text-slate-400">Fields marked <span className="text-red-500 font-bold">*</span> are required.</p>

                {/* Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={empForm.name}
                    onChange={(e) => setEF('name', e.target.value)}
                    onBlur={() => blurEmpField('name')}
                    placeholder="e.g. Ahmad Khan"
                    className={cn(INP, empErrors.name ? 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-400/10' : '')}
                  />
                  {empErrors.name && <p className="text-[11px] text-red-500 mt-1 ml-1 font-medium">{empErrors.name}</p>}
                </div>

                {/* Role + Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <select value={empForm.role} onChange={(e) => setEF('role', e.target.value)} className={SEL}>
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    {empErrors.role && <p className="text-[11px] text-red-500 mt-1 ml-1 font-medium">{empErrors.role}</p>}
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
                    <input
                      value={empForm.nationality}
                      onChange={(e) => setEF('nationality', e.target.value)}
                      placeholder="e.g. Pakistani"
                      className={INP}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Phone</label>
                    <input
                      value={empForm.phone}
                      onChange={(e) => setEF('phone', e.target.value)}
                      onBlur={() => blurEmpField('phone')}
                      placeholder="+971 50 000 0000"
                      className={cn(INP, empErrors.phone ? 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-400/10' : '')}
                    />
                    {empErrors.phone && <p className="text-[11px] text-red-500 mt-1 ml-1 font-medium">{empErrors.phone}</p>}
                  </div>
                </div>

                {/* Date of Birth + Join Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Date of Birth <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={empForm.dateOfBirth}
                      onChange={(e) => setEF('dateOfBirth', e.target.value)}
                      onBlur={() => blurEmpField('dateOfBirth')}
                      type="date"
                      max={TODAY_STR}
                      className={cn(INP, empErrors.dateOfBirth ? 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-400/10' : '')}
                    />
                    {empErrors.dateOfBirth
                      ? <p className="text-[11px] text-red-500 mt-1 ml-1 font-medium">{empErrors.dateOfBirth}</p>
                      : empForm.dateOfBirth && <p className="text-[11px] text-slate-400 mt-1 ml-1">{calcAge(empForm.dateOfBirth)} years old</p>
                    }
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Join Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={empForm.joinDate}
                      onChange={(e) => setEF('joinDate', e.target.value)}
                      onBlur={() => blurEmpField('joinDate')}
                      type="date"
                      className={cn(INP, empErrors.joinDate ? 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-400/10' : '')}
                    />
                    {empErrors.joinDate && <p className="text-[11px] text-red-500 mt-1 ml-1 font-medium">{empErrors.joinDate}</p>}
                  </div>
                </div>

                {/* Monthly Salary */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Monthly Salary (AED) <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={empForm.monthlySalary}
                    onChange={(e) => setEF('monthlySalary', e.target.value)}
                    onBlur={() => blurEmpField('monthlySalary')}
                    type="number"
                    min="0"
                    step="50"
                    placeholder="e.g. 2500"
                    className={cn(INP, empErrors.monthlySalary ? 'border-red-400 bg-red-50 focus:border-red-400 focus:ring-red-400/10' : '')}
                  />
                  {empErrors.monthlySalary && <p className="text-[11px] text-red-500 mt-1 ml-1 font-medium">{empErrors.monthlySalary}</p>}
                  {!empErrors.monthlySalary && empForm.monthlySalary && (
                    <p className="text-[11px] text-slate-400 mt-1 ml-1">AED {fmtAmt(Number(empForm.monthlySalary))} / month</p>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Notes</label>
                  <textarea
                    value={empForm.notes}
                    onChange={(e) => setEF('notes', e.target.value)}
                    rows={3}
                    placeholder="Any additional notes…"
                    className={`${INP} h-auto py-3 resize-none`}
                  />
                </div>
              </form>

              <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0">
                <button type="button" onClick={() => { setEmpDrawer(null); setEmpErrors({}); }} disabled={isSavingEmp}
                  className="flex-1 h-11 rounded-2xl border-2 border-slate-200 text-[14px] font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={handleSaveEmp} disabled={isSavingEmp}
                  className="flex-1 h-11 rounded-2xl text-[14px] font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-60"
                  style={{ background:'linear-gradient(135deg,#0b1d3a,#1e3a6e)', boxShadow:'0 4px 14px rgba(11,29,58,0.3)' }}>
                  {isSavingEmp ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
                  {isSavingEmp ? 'Saving…' : empDrawer === 'add' ? 'Add Employee' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── PAY SALARY MODAL ── */}
      <AnimatePresence>
        {payModal && (
          <>
            <motion.div key="pay-bg" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => !isPayingSalary && setPayModal(null)}
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
                    <p className="text-[11px] mt-0.5" style={{ color:'rgba(255,255,255,0.35)' }}>{payModal.name} · {payModal.role}</p>
                  </div>
                  <button onClick={() => setPayModal(null)} disabled={isPayingSalary}
                    className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all disabled:opacity-40">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handlePaySalary} className="p-6 space-y-4">
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

                  {(payModal.salaryHistory ?? []).some((p) => p.month === payForm.month && p.type === 'salary') && (
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
                        <span className={`text-[14px] font-black ${after < 0 ? 'text-red-600' : after < LOW_BAL_THRESHOLD ? 'text-amber-600' : 'text-emerald-600'}`}>
                          AED {fmtAmt(Math.max(0, after))}
                        </span>
                      </div>
                    );
                  })()}

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Notes</label>
                    <input value={payForm.notes} onChange={(e) => setPF('notes', e.target.value)}
                      placeholder="e.g. July salary, includes bonus…" className={INP} />
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setPayModal(null)} disabled={isPayingSalary}
                      className="flex-1 h-11 rounded-2xl border-2 border-slate-200 text-[14px] font-bold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50">
                      Cancel
                    </button>
                    <button type="submit" disabled={isPayingSalary}
                      className="flex-1 h-11 rounded-2xl text-[14px] font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-60"
                      style={{ background:'linear-gradient(135deg,#0b1d3a,#1e3a6e)', boxShadow:'0 4px 14px rgba(11,29,58,0.3)' }}>
                      {isPayingSalary ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                      {isPayingSalary ? 'Processing…' : `Pay AED ${fmtAmt(Number(payForm.amount) || 0)}`}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── DELETE CONFIRM ── */}
      <AnimatePresence>
        {delConfirm && (() => {
          const hasHistory = (delConfirm.salaryHistory ?? []).length > 0;
          return (
            <>
              <motion.div key="del-bg" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                onClick={() => setDelConfirm(null)}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
              <motion.div key="del-box"
                initial={{ opacity:0, scale:0.88, y:20 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.9 }}
                transition={{ type:'spring', damping:26, stiffness:320 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
                <div className="bg-white rounded-3xl p-7 w-full max-w-xs pointer-events-auto text-center"
                  style={{ boxShadow:'0 24px 64px rgba(0,0,0,0.22)' }}>

                  {hasHistory ? (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-7 h-7 text-amber-500" />
                      </div>
                      <h3 className="text-[17px] font-black text-slate-900 mb-2">Cannot Delete</h3>
                      <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left mb-5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[13px] font-bold text-amber-900">Payment history exists</p>
                          <p className="text-[12px] text-amber-700 mt-0.5">
                            <strong>{delConfirm.name}</strong> has {delConfirm.salaryHistory.length} payment record{delConfirm.salaryHistory.length > 1 ? 's' : ''}.
                            Go to their profile and delete all payment history first.
                          </p>
                        </div>
                      </div>
                      <button onClick={() => setDelConfirm(null)}
                        className="w-full h-11 rounded-2xl border-2 border-slate-200 text-[14px] font-bold text-slate-600 hover:bg-slate-50 transition-all">
                        Got It
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                        <Trash2 className="w-7 h-7 text-red-500" />
                      </div>
                      <h3 className="text-[17px] font-black text-slate-900 mb-2">Remove Employee?</h3>
                      <p className="text-[13px] text-slate-500 leading-relaxed mb-6">
                        <strong className="text-slate-700">{delConfirm.name}</strong> will be permanently removed. This cannot be undone.
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
                    </>
                  )}
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>
    </>
  );
}
