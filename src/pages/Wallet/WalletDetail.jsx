import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Car, Home, Banknote, Plus, ArrowDownLeft, ArrowUpRight,
  AlertTriangle, Wallet, TrendingUp, TrendingDown, Loader2, Pencil, Trash2, Users,
} from 'lucide-react';
import { useGetQuery, usePostMutation, usePatchMutation, useDeleteMutation } from '../../api/apiSlice';
import { selectCurrentPropertyId, selectCurrentProperty } from '../../store/slices/propertiesSlice';
import Modal   from '../../components/ui/Modal';
import Button  from '../../components/ui/Button';
import SwipeableRow from '../../components/ui/SwipeableRow';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

const LOW_BALANCE_THRESHOLD = 5000;

const fade = (d = 0) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.32, delay: d, ease: [0.4, 0, 0.2, 1] } });

const WALLET_CFG = {
  vehicle: { label: 'Vehicle Wallet', desc: 'Fuel, maintenance, repairs & fleet costs',  icon: Car,      color: '#0b1d3a', bg: '#f0f5ff', border: '#c7d7f5', gradient: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' },
  home:    { label: 'Home Wallet',    desc: 'Property services, grocery & household',    icon: Home,     color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', gradient: 'linear-gradient(135deg,#14532d,#16a34a)' },
  salary:  { label: 'Salary Wallet',  desc: 'Employee salary payments only',             icon: Banknote, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', gradient: 'linear-gradient(135deg,#4c1d95,#7c3aed)' },
};

const PERIODS = [
  { k: 'week',   l: 'This Week'     },
  { k: 'month',  l: 'This Month'    },
  { k: 'lastm',  l: 'Last Month'    },
  { k: 'last3',  l: 'Last 3 Months' },
  { k: 'all',    l: 'All Time'      },
  { k: 'custom', l: 'Custom'        },
];

const fmt     = (n) => Number(n).toLocaleString('en-AE', { maximumFractionDigits: 0 });
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

function applyPeriod(txns, period, customStart, customEnd) {
  if (period === 'all') return txns;
  if (period === 'custom') {
    if (!customStart || !customEnd) return txns;
    return txns.filter((t) => t.date >= customStart && t.date <= customEnd);
  }
  const now = new Date();
  if (period === 'lastm') {
    const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const e = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    return txns.filter((t) => { const d = new Date(t.date); return d >= s && d <= e; });
  }
  const cutoff = new Date(now);
  if (period === 'week')  cutoff.setDate(now.getDate() - 7);
  if (period === 'month') { cutoff.setDate(1); cutoff.setHours(0, 0, 0, 0); }
  if (period === 'last3') cutoff.setMonth(now.getMonth() - 3);
  return txns.filter((t) => new Date(t.date) >= cutoff);
}

function periodLabel(period, customStart, customEnd) {
  const now = new Date();
  if (period === 'week')   return 'Last 7 Days';
  if (period === 'month')  return now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  if (period === 'lastm')  return new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  if (period === 'last3')  return 'Last 3 Months';
  if (period === 'custom') return customStart && customEnd ? `${customStart} → ${customEnd}` : 'Custom Range';
  return 'All Time';
}

const INP      = 'w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] text-slate-700 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500';
const DEP_BLANK = { amount: '', note: '', date: new Date().toISOString().split('T')[0] };
const EDT_BLANK = { amount: '', note: '', date: '' };

function PaginationBar({ page, pages, total, isFetching, onPage, color = '#0b1d3a' }) {
  if (pages <= 1) return null;
  const nums = getPagNums(page, pages);
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/40">
      <p className="text-[11px] text-slate-400 tabular-nums">{total} total · Page {page}/{pages}</p>
      <div className="flex items-center gap-1">
        <PagBtn disabled={page === 1 || isFetching} onClick={() => onPage(1)}>«</PagBtn>
        <PagBtn disabled={page === 1 || isFetching} onClick={() => onPage(page - 1)}>‹</PagBtn>
        {nums.map((n, idx) => n === '…' ? (
          <span key={`ellipsis-${idx}`} className="w-7 text-center text-[11px] text-slate-400">…</span>
        ) : (
          <button key={n} onClick={() => onPage(n)} disabled={isFetching}
            className={`w-7 h-7 rounded-lg text-[12px] font-bold transition-all ${n === page ? 'text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 disabled:opacity-40'}`}
            style={n === page ? { background: color } : {}}>
            {n}
          </button>
        ))}
        <PagBtn disabled={page === pages || isFetching} onClick={() => onPage(page + 1)}>›</PagBtn>
        <PagBtn disabled={page === pages || isFetching} onClick={() => onPage(pages)}>»</PagBtn>
      </div>
    </div>
  );
}
function PagBtn({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-7 h-7 rounded-lg text-[12px] font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
      {children}
    </button>
  );
}
function getPagNums(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, pages, page]);
  if (page > 1) set.add(page - 1);
  if (page < pages) set.add(page + 1);
  const sorted = [...set].sort((a, b) => a - b);
  const result = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) result.push('…');
    result.push(n);
  });
  return result;
}

export default function WalletDetail() {
  const { walletType } = useParams();
  const navigate       = useNavigate();
  const propertyId     = useSelector(selectCurrentPropertyId);
  const property       = useSelector(selectCurrentProperty);

  const type       = ['home', 'salary'].includes(walletType) ? walletType : 'vehicle';
  const isSalary   = type === 'salary';
  const cfg        = WALLET_CFG[type];
  const Icon       = cfg.icon;

  const { data: walletData, refetch: refetchWallet } = useGetQuery({ path: '/wallet', params: { propertyId } }, { skip: !propertyId });
  const { data: summaryResult, refetch: refetchTxns } = useGetQuery(
    { path: '/wallet/transactions', params: { propertyId, walletType: type, limit: 500 } },
    { skip: !propertyId },
  );
  const rawTxns = summaryResult?.items ?? [];
  const wallet = walletData?.[type] ?? { balance: 0 };

  const [listPage, setListPage] = useState(1);
  const LIST_LIMIT = 10;

  const [depositMut, { isLoading: isDepositing }] = usePostMutation();
  const [patchMut]                                 = usePatchMutation();
  const [deleteMut,  { isLoading: isDeleting }]   = useDeleteMutation();

  // ── Period filter state ──────────────────────────────────────────────────────
  const [period,      setPeriod]      = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd,   setCustomEnd]   = useState('');

  const listRange = useMemo(() => {
    const now   = new Date();
    const today = now.toISOString().split('T')[0];
    if (period === 'week') {
      const s = new Date(now); s.setDate(now.getDate() - 7);
      return { startDate: s.toISOString().split('T')[0], endDate: today };
    }
    if (period === 'month') {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: s.toISOString().split('T')[0], endDate: today };
    }
    if (period === 'lastm') {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: s.toISOString().split('T')[0], endDate: e.toISOString().split('T')[0] };
    }
    if (period === 'last3') {
      const s = new Date(now); s.setMonth(now.getMonth() - 3);
      return { startDate: s.toISOString().split('T')[0], endDate: today };
    }
    if (period === 'custom' && customStart && customEnd) {
      return { startDate: customStart, endDate: customEnd };
    }
    return {};
  }, [period, customStart, customEnd]);

  const { data: listResult, isFetching: listFetching } = useGetQuery(
    { path: '/wallet/transactions', params: { propertyId, walletType: type, page: listPage, limit: LIST_LIMIT, ...listRange } },
    { skip: !propertyId },
  );
  const listTxns  = listResult?.items  ?? [];
  const listTotal = listResult?.total  ?? 0;
  const listPages = listResult?.pages  ?? 1;

  useEffect(() => { setListPage(1); }, [period, customStart, customEnd]);

  // ── Deposit form ─────────────────────────────────────────────────────────────
  const [showDeposit, setShowDeposit] = useState(false);
  const [depForm,     setDepForm]     = useState(DEP_BLANK);
  const setDF = (k, v) => setDepForm((f) => ({ ...f, [k]: v }));

  // ── Edit deposit state ───────────────────────────────────────────────────────
  const [editTx,   setEditTx]   = useState(null);
  const [editForm, setEditForm] = useState(EDT_BLANK);
  const setEF = (k, v) => setEditForm((f) => ({ ...f, [k]: v }));

  const openEdit = (txn) => {
    setEditTx(txn);
    setEditForm({ amount: String(txn.amount), date: txn.date, note: txn.note || txn.description || '' });
  };

  // ── Delete deposit state ─────────────────────────────────────────────────────
  const [deleteTx, setDeleteTx] = useState(null);

  // ── Sorted & filtered transactions ──────────────────────────────────────────
  const allTxns = useMemo(() => [...rawTxns].sort((a, b) => {
    const d = new Date(b.date) - new Date(a.date);
    return d !== 0 ? d : String(b.id).localeCompare(String(a.id));
  }), [rawTxns]);

  const filtered = useMemo(
    () => applyPeriod(allTxns, period, customStart, customEnd),
    [allTxns, period, customStart, customEnd],
  );

  const isCredit = (t) => t.type === 'credit';
  const isDebit  = (t) => t.type === 'debit';
  const periodDeposited = filtered.filter(isCredit).reduce((s, t) => s + t.amount, 0);
  const periodSpent     = filtered.filter(isDebit).reduce((s, t) => s + t.amount, 0);
  const periodNet       = periodDeposited - periodSpent;

  // ── Monthly chart (all-time, max 6 months) ──────────────────────────────────
  const byMonth = useMemo(() => {
    const map = {};
    allTxns.forEach((t) => {
      const key = t.date.slice(0, 7);
      if (!map[key]) map[key] = { key, deposited: 0, spent: 0 };
      if (isCredit(t)) map[key].deposited += t.amount;
      else             map[key].spent      += t.amount;
    });
    return Object.values(map).sort((a, b) => b.key.localeCompare(a.key)).slice(0, 6).reverse();
  }, [allTxns]);

  const maxMonthVal = Math.max(...byMonth.flatMap((m) => [m.deposited, m.spent]), 1);

  const balance = wallet.balance ?? 0;
  const low     = balance < LOW_BALANCE_THRESHOLD;
  const empty   = balance <= 0;

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleDeposit = async (e) => {
    e.preventDefault();
    const amt = Number(depForm.amount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    try {
      await depositMut({ path: '/wallet/deposit', body: { propertyId, walletType: type, amount: amt, description: depForm.note, note: depForm.note, date: depForm.date } }).unwrap();
      await Promise.all([refetchWallet(), refetchTxns()]);
      toast.success(`AED ${fmt(amt)} deposited to ${cfg.label}`);
      setShowDeposit(false);
      setDepForm(DEP_BLANK);
    } catch (err) { toast.error(err.data?.error || 'Failed to deposit'); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    const amt = Number(editForm.amount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    try {
      await patchMut({ path: `/wallet/transaction/${editTx._id || editTx.id}`, body: { amount: amt, note: editForm.note, description: editForm.note, date: editForm.date } }).unwrap();
      await Promise.all([refetchWallet(), refetchTxns()]);
      toast.success('Deposit updated');
      setEditTx(null);
      setEditForm(EDT_BLANK);
    } catch (err) { toast.error(err.data?.error || 'Failed to update'); }
  };

  const handleDelete = async () => {
    if (!deleteTx) return;
    try {
      await deleteMut({ path: `/wallet/transaction/${deleteTx._id || deleteTx.id}` }).unwrap();
      await Promise.all([refetchWallet(), refetchTxns()]);
      toast.success('Deposit deleted');
      setDeleteTx(null);
    } catch (err) { toast.error(err.data?.error || 'Failed to delete'); }
  };

  const pLabel = periodLabel(period, customStart, customEnd);

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <motion.div {...fade(0)} className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <button onClick={() => navigate('/wallet')}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-400 hover:text-slate-600 transition-colors mb-3">
            <ArrowLeft className="w-3.5 h-3.5" /> All Wallets
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: cfg.gradient }}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{cfg.label}</h1>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <p className="text-slate-400 text-[13px]">{cfg.desc}</p>
                {property && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                    {property.emoji} {property.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isSalary
            ? <Button icon={Users} onClick={() => navigate('/employees')}>Manage Employees</Button>
            : <Button icon={Plus} onClick={() => setShowDeposit(true)}>Deposit Funds</Button>}
        </div>
      </motion.div>

      {/* ── Hero wallet card ── */}
      <motion.div {...fade(0.05)}>
        <div className="rounded-2xl overflow-hidden" style={{ background: cfg.gradient, boxShadow: `0 10px 40px ${cfg.color}35` }}>
          <div className="p-6 pb-4">
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-white/50 text-[11px] font-bold uppercase tracking-[0.15em] mb-1">Available Balance</p>
                <p className="text-white font-bold text-4xl leading-none">AED {fmt(balance)}</p>
                <p className="text-white/40 text-[12px] mt-2">{cfg.desc}</p>
              </div>
              {(empty || low) && (
                <span className={cn('flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-xl shrink-0',
                  empty ? 'bg-red-500 text-white' : 'bg-amber-400 text-amber-900')}>
                  <AlertTriangle className="w-3.5 h-3.5" />{empty ? 'Empty' : 'Low'}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Salary info banner ── */}
      {isSalary && (
        <motion.div {...fade(0.08)}>
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-violet-50 border border-violet-200">
            <Banknote className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-bold text-violet-800">Auto-managed wallet</p>
              <p className="text-[12px] text-violet-600 mt-0.5">
                This balance is updated automatically when salaries are paid via the Employees module.
                Manual deposits are not allowed.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Period selector — horizontally scrollable on mobile ── */}
      <motion.div {...fade(0.1)}>
        {/* Scrollable tab strip */}
        <div className="overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-max sm:w-auto">
            {PERIODS.map(({ k, l }) => (
              <button key={k} onClick={() => setPeriod(k)}
                className={cn('px-3 sm:px-3.5 py-1.5 rounded-lg text-[12px] font-bold transition-all whitespace-nowrap',
                  period === k ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700')}
                style={period === k ? { background: cfg.color } : {}}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Custom date inputs — only shown when custom is selected */}
        {period === 'custom' && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Start Date</label>
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className={INP} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">End Date</label>
              <input type="date" value={customEnd} max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setCustomEnd(e.target.value)} className={INP} />
            </div>
          </div>
        )}

        <p className="text-[12px] text-slate-400 mt-2">{listTotal} transactions · {pLabel}</p>
      </motion.div>

      {/* ── Period stats ── */}
      <motion.div {...fade(0.13)}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            ...(isSalary ? [] : [{ l: 'Received', v: periodDeposited, c: '#16a34a', bg: '#f0fdf4', b: '#bbf7d0', icon: ArrowDownLeft }]),
            { l: isSalary ? 'Total Paid' : 'Spent', v: periodSpent, c: '#dc2626', bg: '#fef2f2', b: '#fecaca', icon: ArrowUpRight },
            ...(isSalary ? [] : [{ l: 'Net Balance', v: periodNet, c: periodNet >= 0 ? '#2563eb' : '#dc2626', bg: periodNet >= 0 ? '#eff6ff' : '#fef2f2', b: periodNet >= 0 ? '#bfdbfe' : '#fecaca', icon: periodNet >= 0 ? TrendingUp : TrendingDown }]),
          ].map((s) => (
            <div key={s.l} className="bg-white rounded-2xl border p-5" style={{ borderColor: s.b, boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: s.bg }}>
                <s.icon className="w-4 h-4" style={{ color: s.c }} />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: s.c + '99' }}>{s.l}</p>
              <p className="text-[22px] font-bold leading-tight mt-1" style={{ color: s.c }}>
                {s.v < 0 ? '−' : ''}AED {fmt(Math.abs(s.v))}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">{pLabel}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Monthly breakdown chart ── */}
      {byMonth.length > 0 && (
        <motion.div {...fade(0.16)}>
          <div className="bg-white rounded-2xl border border-slate-100 p-5" style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.05)' }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[14px] font-bold text-slate-800">Monthly Overview</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Last {byMonth.length} months — deposits vs expenses</p>
              </div>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-400" /><span className="text-[11px] text-slate-500">In</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-400" /><span className="text-[11px] text-slate-500">Out</span></div>
              </div>
            </div>
            <div className="space-y-3.5">
              {byMonth.map((m) => {
                const label = new Date(m.key + '-01').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
                const dPct  = (m.deposited / maxMonthVal) * 100;
                const sPct  = (m.spent     / maxMonthVal) * 100;
                return (
                  <div key={m.key} className="flex items-center gap-2 sm:gap-4">
                    <span className="text-[11px] font-semibold text-slate-500 w-14 sm:w-16 shrink-0">{label}</span>
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="h-2 bg-slate-100 rounded-full flex-1 overflow-hidden min-w-0">
                          <div className="h-full bg-emerald-400 rounded-full transition-all duration-700" style={{ width: `${dPct}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-400 w-16 sm:w-20 text-right tabular-nums shrink-0">{fmt(m.deposited)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 bg-slate-100 rounded-full flex-1 overflow-hidden min-w-0">
                          <div className="h-full bg-red-400 rounded-full transition-all duration-700" style={{ width: `${sPct}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-400 w-16 sm:w-20 text-right tabular-nums shrink-0">{fmt(m.spent)}</span>
                      </div>
                    </div>
                    <span className={cn('text-[11px] font-bold w-14 sm:w-16 text-right shrink-0 tabular-nums',
                      m.deposited >= m.spent ? 'text-emerald-600' : 'text-red-500')}>
                      {m.deposited >= m.spent ? '+' : '−'}{fmt(Math.abs(m.deposited - m.spent))}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Transaction list ── */}
      <motion.div {...fade(0.2)}>
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.05)' }}>
          <div className="p-5 pb-3 border-b border-slate-50">
            <p className="text-[14px] font-bold text-slate-800">Transactions</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{listTotal} records · {pLabel}</p>
          </div>

          {listTxns.length === 0 ? (
            <div className="py-14 text-center">
              <Wallet className="w-10 h-10 text-slate-200 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-slate-400 text-[13px]">No transactions for {pLabel}</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-50">
                {listTxns.map((txn) => {
                  const isDepo = isCredit(txn);
                  const txnKey = txn._id ?? txn.id;

                  const rowInner = (
                    <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-4 hover:bg-slate-50/60 transition-colors">
                      <div className={cn('w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0',
                        isDepo ? 'bg-emerald-50' : 'bg-red-50')}>
                        {isDepo
                          ? <ArrowDownLeft className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                          : <ArrowUpRight  className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-800 truncate">
                          {isDepo ? (txn.note || 'Deposit received') : (txn.description || 'Expense deducted')}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full',
                            isDepo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600')}>
                            {isDepo ? 'Deposit' : 'Expense'}
                          </span>
                          <span className="text-[11px] text-slate-300">·</span>
                          <span className="text-[11px] text-slate-400">{fmtDate(txn.date)}</span>
                        </div>
                      </div>
                      {isDepo && (
                        <div className="hidden sm:flex items-center gap-1 shrink-0">
                          <button onClick={() => openEdit(txn)} title="Edit deposit"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-all">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteTx(txn)} title="Delete deposit"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-600 hover:bg-red-50 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      <div className="text-right shrink-0">
                        <p className={cn('text-[14px] sm:text-[15px] font-bold tabular-nums', isDepo ? 'text-emerald-600' : 'text-red-500')}>
                          {isDepo ? '+' : '−'}AED {fmt(txn.amount)}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Bal: AED {fmt(txn.balanceAfter ?? 0)}</p>
                      </div>
                    </div>
                  );

                  if (isDepo) {
                    return (
                      <SwipeableRow key={txnKey}
                        onSwipeRight={() => openEdit(txn)}
                        onSwipeLeft={() => setDeleteTx(txn)}
                        leftIcon={<Pencil style={{ color: '#2563eb', width: 20, height: 20 }} />}
                        leftLabel="Edit" leftBg="#eff6ff" leftColor="#2563eb"
                        rightIcon={<Trash2 style={{ color: '#dc2626', width: 20, height: 20 }} />}
                        rightLabel="Delete" rightBg="#fef2f2" rightColor="#dc2626"
                      >{rowInner}</SwipeableRow>
                    );
                  }
                  return <div key={txnKey}>{rowInner}</div>;
                })}
              </div>
              {listPages > 1 && (
                <PaginationBar page={listPage} pages={listPages} total={listTotal} isFetching={listFetching} onPage={setListPage} color={cfg.color} />
              )}
              <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
                <p className="text-[11px] text-slate-400">{listTotal} total · {pLabel}</p>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-emerald-600 font-bold">+AED {fmt(periodDeposited)}</span>
                  <span className="text-[12px] text-red-500 font-bold">−AED {fmt(periodSpent)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* ── Edit Deposit Modal ── */}
      <Modal open={!!editTx} onClose={() => { setEditTx(null); setEditForm(EDT_BLANK); }}
        title="Edit Deposit" subtitle="Correct the amount, date or note" size="sm">
        {editTx && (
          <form onSubmit={handleEdit} className="space-y-4">
            {/* Wallet badge */}
            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: cfg.gradient }}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[12px] font-bold" style={{ color: cfg.color }}>{cfg.label}</p>
                <p className="text-[10px] text-slate-400">Wallet cannot be changed after deposit</p>
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Amount (AED) *</label>
              <input value={editForm.amount} onChange={(e) => setEF('amount', e.target.value)}
                type="number" min="1" step="0.01" required className={INP} />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Date</label>
              <input value={editForm.date} onChange={(e) => setEF('date', e.target.value)} type="date" className={INP} />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Note / Source</label>
              <input value={editForm.note} onChange={(e) => setEF('note', e.target.value)}
                placeholder="e.g. Monthly vehicle budget" className={INP} />
            </div>
            {editForm.amount && Number(editForm.amount) !== editTx.amount && (
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-blue-50 border border-blue-100">
                <Pencil className="w-4 h-4 text-blue-500 shrink-0" />
                <div>
                  <p className="text-[11px] font-medium text-blue-700">Balance adjustment</p>
                  <p className="text-[13px] font-bold text-blue-800">
                    {Number(editForm.amount) > editTx.amount ? '+' : ''}AED {fmt(Number(editForm.amount) - editTx.amount)} vs original AED {fmt(editTx.amount)}
                  </p>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2.5 pt-1 border-t border-slate-100">
              <Button variant="outline" type="button" onClick={() => { setEditTx(null); setEditForm(EDT_BLANK); }}>Cancel</Button>
              <Button type="submit" icon={Pencil}>Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal open={!!deleteTx} onClose={() => { if (!isDeleting) setDeleteTx(null); }}
        title="Delete Deposit" subtitle="This will reverse the wallet balance — cannot be undone" size="sm">
        {deleteTx && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <div>
                <p className="text-[13px] font-bold text-red-700">
                  AED {fmt(deleteTx.amount)} will be removed from {cfg.label}
                </p>
                <p className="text-[11px] text-red-500 mt-0.5">The wallet balance will decrease by AED {fmt(deleteTx.amount)}</p>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Date</p>
                <p className="text-[13px] font-semibold text-slate-700 mt-0.5">{fmtDate(deleteTx.date)}</p>
              </div>
              {(deleteTx.note || deleteTx.description) && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Note</p>
                  <p className="text-[13px] font-semibold text-slate-700 mt-0.5">{deleteTx.note || deleteTx.description}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2.5 pt-1 border-t border-slate-100">
              <Button variant="outline" type="button" onClick={() => setDeleteTx(null)} disabled={isDeleting}>Cancel</Button>
              <button onClick={handleDelete} disabled={isDeleting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white transition-opacity disabled:opacity-60 disabled:cursor-not-allowed bg-red-600 hover:bg-red-700">
                {isDeleting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting…</>
                  : <><Trash2 className="w-4 h-4" /> Delete Deposit</>}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Deposit Modal ── */}
      <Modal open={showDeposit} onClose={() => { if (!isDepositing) setShowDeposit(false); }}
        title={`Deposit to ${cfg.label}`} subtitle="Receive funds and add to this wallet" size="sm">
        <form onSubmit={handleDeposit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Amount (AED) *</label>
            <input value={depForm.amount} onChange={(e) => setDF('amount', e.target.value)}
              type="number" min="1" step="0.01" required placeholder="e.g. 5000" className={INP} />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Date</label>
            <input value={depForm.date} onChange={(e) => setDF('date', e.target.value)} type="date" className={INP} />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Note / Source</label>
            <input value={depForm.note} onChange={(e) => setDF('note', e.target.value)}
              placeholder="e.g. Monthly budget from Mr. Shah" className={INP} />
          </div>
          {depForm.amount && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl border" style={{ background: cfg.bg, borderColor: cfg.border }}>
              <ArrowDownLeft className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="flex-1">
                <p className="text-[11px]" style={{ color: cfg.color }}>New balance after deposit</p>
                <p className="text-[18px] font-bold text-emerald-700">
                  AED {fmt(balance + (Number(depForm.amount) || 0))}
                </p>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2.5 pt-1 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setShowDeposit(false)} disabled={isDepositing}>Cancel</Button>
            <button type="submit" disabled={isDepositing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: cfg.gradient }}>
              {isDepositing
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Depositing…</>
                : <><Plus className="w-4 h-4" /> Deposit</>}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
