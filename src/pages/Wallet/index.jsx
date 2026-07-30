import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import {
  Wallet, Car, Home, Banknote, Plus, ArrowDownLeft, ArrowUpRight,
  AlertTriangle, ChevronRight, Pencil, Trash2, FileText, Loader2,
} from 'lucide-react';
import { useGetQuery, usePostMutation, usePatchMutation, useDeleteMutation, useDownloadChallanMutation } from '../../api/apiSlice';
import { selectCurrentPropertyId, selectCurrentProperty } from '../../store/slices/propertiesSlice';
import Modal  from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import SwipeableRow from '../../components/ui/SwipeableRow';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

const LOW_BALANCE_THRESHOLD = 5000;

const fade = (d = 0) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.32, delay: d, ease: [0.4, 0, 0.2, 1] } });
const BLANK = { wallet: 'vehicle', amount: '', note: '', date: new Date().toISOString().split('T')[0] };

const WALLETS = {
  vehicle: { label: 'Vehicle Wallet', desc: 'Fuel, maintenance, repairs & fleet costs',  icon: Car,     color: '#0b1d3a', bg: '#f0f5ff', border: '#c7d7f5', gradient: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' },
  home:    { label: 'Home Wallet',    desc: 'Property services, grocery & household',    icon: Home,    color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', gradient: 'linear-gradient(135deg,#14532d,#16a34a)' },
  salary:  { label: 'Salary Wallet',  desc: 'Employee salary payments only',             icon: Banknote, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', gradient: 'linear-gradient(135deg,#4c1d95,#7c3aed)' },
};

const PERIODS = [
  { k: 'week',  l: 'This Week'  },
  { k: 'month', l: 'This Month' },
  { k: 'all',   l: 'All Time'   },
];

function fmt(n)    { return Number(n).toLocaleString('en-AE', { maximumFractionDigits: 0 }); }
function fmtDate(d){ return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }

function applyPeriod(txns, period) {
  if (period === 'all') return txns;
  const cutoff = new Date();
  if (period === 'week')  cutoff.setDate(cutoff.getDate() - 7);
  if (period === 'month') { cutoff.setDate(1); cutoff.setHours(0, 0, 0, 0); }
  return txns.filter((t) => new Date(t.date) >= cutoff);
}

function periodLabel(period) {
  const now = new Date();
  if (period === 'week')  return 'Last 7 Days';
  if (period === 'month') return now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  return 'All Time';
}

export default function WalletPage() {
  const propertyId = useSelector(selectCurrentPropertyId);
  const property   = useSelector(selectCurrentProperty);

  const { data: walletData, refetch: refetchWallets } = useGetQuery({ path: '/wallet', params: { propertyId } }, { skip: !propertyId });
  const { data: rawTxns = [], refetch: refetchTxns  } = useGetQuery({ path: '/wallet/transactions', params: { propertyId } }, { skip: !propertyId });

  const EMPTY_W = { balance: 0, totalDeposited: 0 };
  const vWallet = { ...EMPTY_W, ...walletData?.vehicle };
  const hWallet = { ...EMPTY_W, ...walletData?.home    };
  const sWallet = { ...EMPTY_W, ...walletData?.salary  };

  const [depositMut, { isLoading: isDepositing }] = usePostMutation();
  const [patchMut]     = usePatchMutation();
  const [deleteMut,  { isLoading: isDeleting }]  = useDeleteMutation();
  const [downloadMut, { isLoading: downloading }] = useDownloadChallanMutation();

  const [showDeposit,  setShowDeposit]  = useState(false);
  const [showReport,   setShowReport]   = useState(false);
  const [form,         setForm]         = useState(BLANK);
  const [filter,       setFilter]       = useState('all');
  const [txnPeriod,    setTxnPeriod]    = useState('month');
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Report filter state
  const REPORT_BLANK = { walletType: 'all', period: 'month', startDate: '', endDate: '' };
  const [reportForm, setReportForm] = useState(REPORT_BLANK);
  const setRF = (k, v) => setReportForm((f) => ({ ...f, [k]: v }));

  const handleDownloadReport = async () => {
    try {
      const params = { propertyId, walletType: reportForm.walletType, period: reportForm.period };
      if (reportForm.period === 'custom') {
        if (!reportForm.startDate || !reportForm.endDate) return toast.error('Please select both start and end dates');
        params.startDate = reportForm.startDate;
        params.endDate   = reportForm.endDate;
      }
      const wLabel = reportForm.walletType === 'all' ? 'All-Wallets' : reportForm.walletType.charAt(0).toUpperCase() + reportForm.walletType.slice(1);
      await downloadMut({ path: '/reports/wallet', params, filename: `Shah-Wallet-${wLabel}-${reportForm.period}.pdf` }).unwrap();
      toast.success('Report downloaded');
      setShowReport(false);
    } catch { toast.error('Failed to generate report'); }
  };

  // edit-deposit state
  const EDIT_BLANK = { amount: '', date: '', note: '' };
  const [editTx,   setEditTx]   = useState(null);
  const [editForm, setEditForm] = useState(EDIT_BLANK);
  const setEF = (k, v) => setEditForm((f) => ({ ...f, [k]: v }));

  // delete-deposit state
  const [deleteTx, setDeleteTx] = useState(null);

  const openEdit = (txn) => {
    setEditTx(txn);
    setEditForm({ amount: String(txn.amount), date: txn.date, note: txn.note || txn.description || '' });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    const amt = Number(editForm.amount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    try {
      await patchMut({ path: `/wallet/transaction/${editTx._id || editTx.id}`, body: { amount: amt, note: editForm.note, description: editForm.note, date: editForm.date } }).unwrap();
      await Promise.all([refetchWallets(), refetchTxns()]);
      toast.success('Deposit updated successfully');
      setEditTx(null);
      setEditForm(EDIT_BLANK);
    } catch (err) { toast.error(err.data?.error || 'Failed to update deposit'); }
  };

  const handleDeleteDeposit = async () => {
    if (!deleteTx) return;
    try {
      await deleteMut({ path: `/wallet/transaction/${deleteTx._id || deleteTx.id}` }).unwrap();
      await Promise.all([refetchWallets(), refetchTxns()]);
      toast.success('Deposit deleted');
      setDeleteTx(null);
    } catch (err) { toast.error(err.data?.error || 'Failed to delete deposit'); }
  };

  const walletsMap = { vehicle: vWallet, home: hWallet, salary: sWallet };

  const allTransactions = useMemo(() =>
    [...rawTxns].sort((a, b) => {
      const diff = new Date(b.date) - new Date(a.date);
      return diff !== 0 ? diff : String(b.id).localeCompare(String(a.id));
    }),
  [rawTxns]);

  const periodFiltered = useMemo(() => applyPeriod(allTransactions, txnPeriod), [allTransactions, txnPeriod]);

  const visible = useMemo(() => {
    if (filter === 'all')      return periodFiltered;
    if (filter === 'deposits') return periodFiltered.filter((t) => t.type === 'credit');
    if (filter === 'expenses') return periodFiltered.filter((t) => t.type === 'debit');
    return periodFiltered.filter((t) => t.walletType === filter);
  }, [periodFiltered, filter]);

  const handleDeposit = async (e) => {
    e.preventDefault();
    const amt = Number(form.amount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    try {
      await depositMut({ path: '/wallet/deposit', body: { propertyId, walletType: form.wallet, amount: amt, description: form.note, note: form.note, date: form.date } }).unwrap();
      await Promise.all([refetchWallets(), refetchTxns()]);
      toast.success(`AED ${fmt(amt)} deposited to ${WALLETS[form.wallet].label}`);
      setShowDeposit(false);
      setForm(BLANK);
    } catch (err) { toast.error(err.data?.error || 'Failed to deposit'); }
  };

  const openDeposit = (wallet = 'vehicle') => { setForm({ ...BLANK, wallet }); setShowDeposit(true); };

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <motion.div {...fade(0)} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' }}>
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Wallet</h1>
              {property && (
                <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                  <span>{property.emoji}</span>
                  <span>{property.name}</span>
                  <span className="text-slate-300">·</span>
                  <span>{property.type}</span>
                </p>
              )}
            </div>
          </div>
          <p className="text-slate-500 text-[13px]">Manage expense budgets — deposit and track spending by category</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowReport(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all">
            <FileText className="w-4 h-4 text-accent-600" /> Generate Report
          </button>
          <Button icon={Plus} onClick={() => openDeposit('vehicle')}>Deposit Funds</Button>
        </div>
      </motion.div>

      {/* ── Wallet Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Object.entries(WALLETS).map(([key, w], i) => {
          const wallet  = walletsMap[key];
          const balance = wallet.balance ?? 0;
          const total   = wallet.totalDeposited ?? 0;
          const spent   = total - balance;
          const pct     = total > 0 ? Math.max(0, Math.min(100, (balance / total) * 100)) : 0;
          const low     = balance < LOW_BALANCE_THRESHOLD;
          const empty   = balance <= 0;
          const Icon    = w.icon;
          return (
            <motion.div key={key} {...fade(0.06 + i * 0.06)}>
              <div className="rounded-2xl overflow-hidden" style={{ background: w.gradient, boxShadow: `0 8px 32px ${w.color}30` }}>

                {/* Clickable balance area → detail page */}
                <Link to={`/wallet/${key}`} className="block p-6 pb-4 hover:bg-white/5 transition-colors group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/10">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                      {(empty || low) && (
                        <span className={cn('flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-xl',
                          empty ? 'bg-red-500 text-white' : 'bg-amber-400 text-amber-900')}>
                          <AlertTriangle className="w-3 h-3" />
                          {empty ? 'Empty' : 'Low'}
                        </span>
                      )}
                      <span className="flex items-center gap-0.5 text-white/50 group-hover:text-white/80 transition-colors text-[11px] font-semibold">
                        View <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                  <p className="text-white/60 text-[11px] font-bold uppercase tracking-wider mb-1">{w.label}</p>
                  <p className="text-white font-bold text-3xl leading-tight">AED {fmt(balance)}</p>
                  <p className="text-white/40 text-[12px] mt-1">{w.desc}</p>
                </Link>

                {/* Progress bar */}
                <div className="px-6 pb-2">
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-white/60 transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-white/40 text-[10px]">{Math.round(pct)}% remaining</span>
                    <span className="text-white/40 text-[10px]">of AED {fmt(total)}</span>
                  </div>
                </div>

                {/* Stats strip */}
                <div className="flex border-t border-white/10 mt-3">
                  <div className="flex-1 px-5 py-3.5 text-center border-r border-white/10">
                    <p className="text-white/40 text-[10px] uppercase tracking-wider">Deposited</p>
                    <p className="text-white font-bold text-[15px] mt-0.5">AED {fmt(total)}</p>
                  </div>
                  <div className="flex-1 px-5 py-3.5 text-center border-r border-white/10">
                    <p className="text-white/40 text-[10px] uppercase tracking-wider">Spent</p>
                    <p className="text-white font-bold text-[15px] mt-0.5">AED {fmt(Math.max(0, spent))}</p>
                  </div>
                  <button onClick={() => openDeposit(key)}
                    className="flex-1 px-5 py-3.5 flex items-center justify-center gap-1.5 hover:bg-white/10 transition-colors">
                    <Plus className="w-3.5 h-3.5 text-white" />
                    <span className="text-white text-[12px] font-bold">Deposit</span>
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Low balance alerts ── */}
      {(vWallet.balance < LOW_BALANCE_THRESHOLD || hWallet.balance < LOW_BALANCE_THRESHOLD || sWallet.balance < LOW_BALANCE_THRESHOLD) && (
        <motion.div {...fade(0.14)}>
          <div className="space-y-2">
            {vWallet.balance <= 0 && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-200">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-red-700">Vehicle Wallet is empty</p>
                  <p className="text-[11px] text-red-500">Fuel and maintenance cannot be logged until you deposit funds.</p>
                </div>
                <button onClick={() => openDeposit('vehicle')}
                  className="shrink-0 text-[12px] font-bold text-red-700 bg-red-100 px-3 py-1.5 rounded-xl hover:bg-red-200 transition-colors">
                  Deposit Now
                </button>
              </div>
            )}
            {vWallet.balance > 0 && vWallet.balance < LOW_BALANCE_THRESHOLD && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-amber-700">Vehicle Wallet running low — AED {fmt(vWallet.balance)} left</p>
                  <p className="text-[11px] text-amber-600">Consider topping up before the next vehicle expense.</p>
                </div>
                <button onClick={() => openDeposit('vehicle')}
                  className="shrink-0 text-[12px] font-bold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-xl hover:bg-amber-200 transition-colors">
                  Top Up
                </button>
              </div>
            )}
            {hWallet.balance <= 0 && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-200">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-red-700">Home Wallet is empty</p>
                  <p className="text-[11px] text-red-500">Property and household expenses cannot be logged until you deposit funds.</p>
                </div>
                <button onClick={() => openDeposit('home')}
                  className="shrink-0 text-[12px] font-bold text-red-700 bg-red-100 px-3 py-1.5 rounded-xl hover:bg-red-200 transition-colors">
                  Deposit Now
                </button>
              </div>
            )}
            {hWallet.balance > 0 && hWallet.balance < LOW_BALANCE_THRESHOLD && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-amber-700">Home Wallet running low — AED {fmt(hWallet.balance)} left</p>
                  <p className="text-[11px] text-amber-600">Consider topping up before the next home expense.</p>
                </div>
                <button onClick={() => openDeposit('home')}
                  className="shrink-0 text-[12px] font-bold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-xl hover:bg-amber-200 transition-colors">
                  Top Up
                </button>
              </div>
            )}
            {sWallet.balance <= 0 && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-200">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-red-700">Salary Wallet is empty</p>
                  <p className="text-[11px] text-red-500">Employee salaries cannot be paid until you deposit funds.</p>
                </div>
                <button onClick={() => openDeposit('salary')}
                  className="shrink-0 text-[12px] font-bold text-red-700 bg-red-100 px-3 py-1.5 rounded-xl hover:bg-red-200 transition-colors">
                  Deposit Now
                </button>
              </div>
            )}
            {sWallet.balance > 0 && sWallet.balance < LOW_BALANCE_THRESHOLD && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-amber-700">Salary Wallet running low — AED {fmt(sWallet.balance)} left</p>
                  <p className="text-[11px] text-amber-600">Consider topping up before next salary payment.</p>
                </div>
                <button onClick={() => openDeposit('salary')}
                  className="shrink-0 text-[12px] font-bold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-xl hover:bg-amber-200 transition-colors">
                  Top Up
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Transaction History ── */}
      <motion.div {...fade(0.18)}>
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.05)' }}>

          {/* Header row 1: title + download buttons */}
          <div className="p-5 pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-[14px] font-bold text-slate-800">Transaction History</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {visible.length} records · {periodLabel(txnPeriod)}
              </p>
            </div>
            <button onClick={() => setShowReport(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all">
              <FileText className="w-3.5 h-3.5 text-accent-600" /> Report
            </button>
          </div>

          {/* Header row 2: period + type filters */}
          <div className="px-5 pt-3 pb-3 flex flex-col sm:flex-row gap-2 border-b border-slate-50">
            {/* Period filter */}
            <div className="flex gap-1 bg-slate-50 border border-slate-100 rounded-xl p-1">
              {PERIODS.map(({ k, l }) => (
                <button key={k} onClick={() => setTxnPeriod(k)}
                  className={cn('px-3 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap',
                    txnPeriod === k ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                  {l}
                </button>
              ))}
            </div>
            {/* Type filter */}
            <div className="flex gap-1 bg-slate-50 border border-slate-100 rounded-xl p-1">
              {[
                { k: 'all',      l: 'All'      },
                { k: 'vehicle',  l: 'Vehicle'  },
                { k: 'home',     l: 'Home'     },
                { k: 'salary',   l: 'Salary'   },
                { k: 'deposits', l: 'Deposits' },
                { k: 'expenses', l: 'Expenses' },
              ].map(({ k, l }) => (
                <button key={k} onClick={() => setFilter(k)}
                  className={cn('px-3 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap',
                    filter === k ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="py-14 text-center">
              <Wallet className="w-10 h-10 text-slate-200 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-slate-400 text-[13px]">No transactions for {periodLabel(txnPeriod)}</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-50">
                {visible.map((txn) => {
                  const wCfg   = WALLETS[txn.walletType] ?? WALLETS.vehicle;
                  const isDepo = txn.type === 'credit';
                  const WIcon  = wCfg.icon;
                  const txnKey = txn._id ?? txn.id;

                  const rowInner = (
                    <div className="group flex items-center gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                        isDepo ? 'bg-emerald-50' : 'bg-red-50')}>
                        {isDepo
                          ? <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                          : <ArrowUpRight  className="w-5 h-5 text-red-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-800 leading-tight truncate">
                          {isDepo ? (txn.note || 'Deposit') : (txn.description || 'Expense deducted')}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: wCfg.bg, color: wCfg.color }}>
                            <WIcon className="w-2.5 h-2.5" />{wCfg.label}
                          </span>
                          <span className="text-[11px] text-slate-300">·</span>
                          <span className="text-[11px] text-slate-400">{fmtDate(txn.date)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isDepo && (
                          <button onClick={() => openEdit(txn)} title="Edit deposit"
                            className="hidden sm:flex w-7 h-7 rounded-lg items-center justify-center text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-all shrink-0">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isDepo && (
                          <button onClick={() => setDeleteTx(txn)} title="Delete deposit"
                            className="hidden sm:flex w-7 h-7 rounded-lg items-center justify-center text-slate-300 hover:text-red-600 hover:bg-red-50 transition-all shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <div className="text-right shrink-0">
                          <p className={cn('text-[15px] font-bold tabular-nums', isDepo ? 'text-emerald-600' : 'text-red-500')}>
                            {isDepo ? '+' : '−'}AED {fmt(txn.amount)}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Bal: AED {fmt(txn.balanceAfter ?? 0)}</p>
                        </div>
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
              <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
                <p className="text-[11px] text-slate-400">{visible.length} transactions</p>
                <div className="flex items-center gap-4">
                  <span className="text-[12px] text-emerald-600 font-bold">
                    +AED {fmt(visible.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0))}
                  </span>
                  <span className="text-[12px] text-red-500 font-bold">
                    −AED {fmt(visible.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0))}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* ── Report Modal ── */}
      <Modal open={showReport} onClose={() => { setShowReport(false); setReportForm(REPORT_BLANK); }}
        title="Download Wallet Report" subtitle="Choose a wallet and period, then download a PDF statement" size="sm">
        <div className="space-y-4">

          {/* Wallet */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Wallet</label>
            <select value={reportForm.walletType} onChange={(e) => setRF('walletType', e.target.value)} className={INP}>
              <option value="all">All Wallets</option>
              <option value="vehicle">Vehicle Wallet</option>
              <option value="home">Home Wallet</option>
              <option value="salary">Salary Wallet</option>
            </select>
          </div>

          {/* Period */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Period</label>
            <select value={reportForm.period} onChange={(e) => setRF('period', e.target.value)} className={INP}>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="all">All Time</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Custom date range — only shown when custom is selected */}
          {reportForm.period === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Start Date</label>
                <input type="date" value={reportForm.startDate}
                  onChange={(e) => setRF('startDate', e.target.value)} className={INP} />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">End Date</label>
                <input type="date" value={reportForm.endDate}
                  onChange={(e) => setRF('endDate', e.target.value)}
                  max={new Date().toISOString().split('T')[0]} className={INP} />
              </div>
            </div>
          )}

          {/* What will be generated */}
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' }}>
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-[12px] font-bold text-slate-800">PDF Wallet Statement</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {reportForm.walletType === 'all' ? 'All Wallets' : reportForm.walletType.charAt(0).toUpperCase() + reportForm.walletType.slice(1) + ' Wallet'}
                {' · '}
                {reportForm.period === 'week' ? 'This Week' : reportForm.period === 'month' ? 'This Month' : reportForm.period === 'lastMonth' ? 'Last Month' : reportForm.period === 'custom' ? 'Custom Range' : 'All Time'}
                {' · Includes Cash In, Cash Out & Net Total'}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-1 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => { setShowReport(false); setReportForm(REPORT_BLANK); }}>
              Cancel
            </Button>
            <button onClick={handleDownloadReport} disabled={downloading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white transition-opacity disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' }}>
              {downloading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                : <><FileText className="w-4 h-4" /> Download PDF</>}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Edit Deposit Modal ── */}
      <Modal open={!!editTx} onClose={() => { setEditTx(null); setEditForm(EDIT_BLANK); }}
        title="Edit Deposit" subtitle="Correct the amount, date or note of this deposit" size="sm">
        {editTx && (
          <form onSubmit={handleEdit} className="space-y-4">
            {/* Wallet badge (read-only) */}
            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50">
              {(() => { const wCfg = WALLETS[editTx.walletType] ?? WALLETS.vehicle; const WIcon = wCfg.icon; return (
                <>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: wCfg.color }}>
                    <WIcon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-[12px] font-bold" style={{ color: wCfg.color }}>{wCfg.label}</p>
                    <p className="text-[10px] text-slate-400">Wallet cannot be changed after deposit</p>
                  </div>
                </>
              ); })()}
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
                <div className="flex-1">
                  <p className="text-[11px] font-medium text-blue-700">Balance adjustment</p>
                  <p className="text-[13px] font-bold text-blue-800">
                    {Number(editForm.amount) > editTx.amount ? '+' : ''}AED {fmt(Number(editForm.amount) - editTx.amount)} vs original AED {fmt(editTx.amount)}
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-1 border-t border-slate-100">
              <Button variant="outline" type="button" onClick={() => { setEditTx(null); setEditForm(EDIT_BLANK); }}>Cancel</Button>
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
                  AED {fmt(deleteTx.amount)} will be removed from {WALLETS[deleteTx.walletType]?.label}
                </p>
                <p className="text-[11px] text-red-500 mt-0.5">
                  The wallet balance will decrease by AED {fmt(deleteTx.amount)}
                </p>
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
              <button onClick={handleDeleteDeposit} disabled={isDeleting}
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
        title="Deposit Funds" subtitle="Receive money from boss and allocate to a wallet" size="sm">
        <form onSubmit={handleDeposit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Select Wallet</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(WALLETS).map(([k, w]) => {
                const Icon   = w.icon;
                const wallet = walletsMap[k];
                return (
                  <button key={k} type="button" onClick={() => setF('wallet', k)}
                    className={cn('flex flex-col items-center gap-1.5 py-3.5 px-3 rounded-xl border-2 transition-all text-center',
                      form.wallet === k ? '' : 'border-slate-100 bg-slate-50 hover:border-slate-200')}
                    style={form.wallet === k ? { borderColor: w.color, background: w.bg } : {}}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: form.wallet === k ? w.color : '#e2e8f0' }}>
                      <Icon className="w-4 h-4" style={{ color: form.wallet === k ? '#fff' : '#64748b' }} />
                    </div>
                    <p className="text-[12px] font-bold" style={{ color: form.wallet === k ? w.color : '#475569' }}>{w.label}</p>
                    <p className="text-[10px]" style={{ color: form.wallet === k ? w.color + 'aa' : '#94a3b8' }}>
                      AED {fmt(wallet.balance ?? 0)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Amount (AED) *</label>
            <input value={form.amount} onChange={(e) => setF('amount', e.target.value)}
              type="number" min="1" step="0.01" required placeholder="e.g. 5000" className={INP} />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Date</label>
            <input value={form.date} onChange={(e) => setF('date', e.target.value)} type="date" className={INP} />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Note / Source</label>
            <input value={form.note} onChange={(e) => setF('note', e.target.value)}
              placeholder="e.g. Monthly vehicle budget from Mr. Shah" className={INP} />
          </div>

          {form.amount && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl border"
              style={{ background: WALLETS[form.wallet].bg, borderColor: WALLETS[form.wallet].border }}>
              <ArrowDownLeft className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="text-[11px] font-medium" style={{ color: WALLETS[form.wallet].color }}>
                  Depositing to {WALLETS[form.wallet].label}
                </p>
                <p className="text-[18px] font-bold text-emerald-700">
                  +AED {Number(form.amount).toLocaleString('en-AE', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-[10px] text-slate-400">New balance</p>
                <p className="text-[13px] font-bold" style={{ color: WALLETS[form.wallet].color }}>
                  AED {fmt((walletsMap[form.wallet].balance ?? 0) + Number(form.amount || 0))}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-1 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setShowDeposit(false)} disabled={isDepositing}>Cancel</Button>
            <button type="submit" disabled={isDepositing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' }}>
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

const INP = 'w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] text-slate-700 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500';
