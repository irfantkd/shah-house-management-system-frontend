import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import {
  Wallet, Car, Home, Banknote, Plus, ArrowDownLeft, ArrowUpRight,
  AlertTriangle, ChevronRight, Loader2, FileDown, BarChart3,
} from 'lucide-react';
import { useGetQuery, usePostMutation, API_BASE_URL } from '../../api/apiSlice';
import DatePicker from '../../components/ui/DatePicker';
import { selectCurrentPropertyId, selectCurrentProperty } from '../../store/slices/propertiesSlice';
import Modal  from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

const LOW_BALANCE_THRESHOLD = 5000;
const fade = (d = 0) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.32, delay: d, ease: [0.4, 0, 0.2, 1] } });
const BLANK = { wallet: 'vehicle', amount: '', note: '', date: new Date().toISOString().split('T')[0] };

const WALLETS = {
  vehicle: { label: 'Vehicle Wallet',  desc: 'Fuel, maintenance, repairs & fleet costs', icon: Car,      color: '#0b1d3a', bg: '#f0f5ff', border: '#c7d7f5', gradient: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)', detailLink: '/wallet/vehicle' },
  home:    { label: 'Home Wallet',     desc: 'Property services, grocery & household',   icon: Home,     color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', gradient: 'linear-gradient(135deg,#14532d,#16a34a)', detailLink: '/wallet/home'    },
  salary:  { label: 'Salary Wallet',   desc: 'Employee salary payments · auto-tracked',  icon: Banknote, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', gradient: 'linear-gradient(135deg,#4c1d95,#7c3aed)', detailLink: '/wallet/salary'   },
};

const REPORT_PERIODS = [
  { k: 'week',      l: 'This Week'    },
  { k: 'month',     l: 'This Month'   },
  { k: 'lastMonth', l: 'Last Month'   },
  { k: 'last3',     l: 'Last 3 Mo.'  },
  { k: 'all',       l: 'All Time'     },
  { k: 'custom',    l: 'Custom Range' },
];

const REPORT_WALLETS = [
  { k: 'all',     l: 'All Wallets'   },
  { k: 'vehicle', l: 'Vehicle'       },
  { k: 'home',    l: 'Home'          },
  { k: 'salary',  l: 'Salary'        },
];

const TXN_PAGE_SIZE = 8;

function fmt(n) { return Number(n).toLocaleString('en-AE', { maximumFractionDigits: 0 }); }
function fmtDate(d) { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }

const INP = 'w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] text-slate-700 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500';

export default function WalletPage() {
  const propertyId  = useSelector(selectCurrentPropertyId);
  const property    = useSelector(selectCurrentProperty);
  const authToken   = useSelector((s) => s.auth?.token);

  const { data: walletData, refetch: refetchWallets } = useGetQuery(
    { path: '/wallet', params: { propertyId } },
    { skip: !propertyId },
  );

  // Recent transactions — all wallets, limit 200 for client-side paging
  const { data: recentResult } = useGetQuery(
    { path: '/wallet/transactions', params: { propertyId, limit: 200 } },
    { skip: !propertyId },
  );
  const allTxns = useMemo(() => {
    const items = recentResult?.items ?? [];
    return [...items].sort((a, b) => new Date(b.date) - new Date(a.date) || String(b.id).localeCompare(String(a.id)));
  }, [recentResult]);

  const EMPTY_W = { balance: 0 };
  const vWallet = { ...EMPTY_W, ...walletData?.vehicle };
  const hWallet = { ...EMPTY_W, ...walletData?.home    };
  const sWallet = { ...EMPTY_W, ...walletData?.salary  };
  const walletsMap = { vehicle: vWallet, home: hWallet, salary: sWallet };

  // ── Deposit ─────────────────────────────────────────────────────────────────
  const [depositMut, { isLoading: isDepositing }] = usePostMutation();
  const [showDeposit, setShowDeposit] = useState(false);
  const [form, setForm] = useState(BLANK);
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openDeposit = (wallet = 'vehicle') => { setForm({ ...BLANK, wallet }); setShowDeposit(true); };

  const handleDeposit = async (e) => {
    e.preventDefault();
    const amt = Number(form.amount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    try {
      await depositMut({
        path: '/wallet/deposit',
        body: { propertyId, walletType: form.wallet, amount: amt, description: form.note, note: form.note, date: form.date },
      }).unwrap();
      await refetchWallets();
      toast.success(`AED ${fmt(amt)} deposited to ${WALLETS[form.wallet].label}`);
      setShowDeposit(false);
      setForm(BLANK);
    } catch (err) { toast.error(err.data?.error || 'Failed to deposit'); }
  };

  // ── Reports ─────────────────────────────────────────────────────────────────
  const [showReports,   setShowReports]   = useState(false);
  const [reportWallet,  setReportWallet]  = useState('all');
  const [reportPeriod,  setReportPeriod]  = useState('month');
  const [reportStart,   setReportStart]   = useState('');
  const [reportEnd,     setReportEnd]     = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  const handleReport = async () => {
    if (!propertyId) return;
    setReportLoading(true);
    try {
      const params = new URLSearchParams({ propertyId, walletType: reportWallet, period: reportPeriod });
      if (reportPeriod === 'custom' && reportStart && reportEnd) {
        params.append('startDate', reportStart);
        params.append('endDate', reportEnd);
      }
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      const res = await fetch(`${API_BASE_URL}/reports/wallet?${params}`, { credentials: 'include', headers });
      if (!res.ok) throw new Error('Report generation failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `Shah-Wallet-${reportWallet}-${reportPeriod}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setShowReports(false);
    } catch { toast.error('Failed to generate report'); }
    finally { setReportLoading(false); }
  };

  // ── Transaction pagination ───────────────────────────────────────────────────
  const [txnPage, setTxnPage] = useState(1);
  const txnPages = Math.max(1, Math.ceil(allTxns.length / TXN_PAGE_SIZE));
  const pageTxns = allTxns.slice((txnPage - 1) * TXN_PAGE_SIZE, txnPage * TXN_PAGE_SIZE);

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
          <Button icon={FileDown} variant="outline" onClick={() => setShowReports(true)}>Reports</Button>
          <Button icon={Plus} onClick={() => openDeposit('vehicle')}>Deposit Funds</Button>
        </div>
      </motion.div>

      {/* ── Wallet Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Object.entries(WALLETS).map(([key, w], i) => {
          const wallet  = walletsMap[key];
          const balance = wallet.balance ?? 0;
          const low     = balance < LOW_BALANCE_THRESHOLD;
          const empty   = balance <= 0;
          const Icon    = w.icon;
          const isSalary = key === 'salary';

          return (
            <motion.div key={key} {...fade(0.06 + i * 0.06)}>
              <div className="rounded-2xl overflow-hidden" style={{ background: w.gradient, boxShadow: `0 8px 32px ${w.color}30` }}>

                <Link to={w.detailLink} className="block p-6 pb-5 hover:bg-white/5 transition-colors group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/10">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                      {!isSalary && (empty || low) && (
                        <span className={cn('flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-xl',
                          empty ? 'bg-red-500 text-white' : 'bg-amber-400 text-amber-900')}>
                          <AlertTriangle className="w-3 h-3" />
                          {empty ? 'Empty' : 'Low'}
                        </span>
                      )}
                      <span className="flex items-center gap-0.5 text-white/50 group-hover:text-white/80 transition-colors text-[11px] font-semibold whitespace-nowrap">
                        {isSalary ? 'Manage' : 'View'} <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                  <p className="text-white/60 text-[11px] font-bold uppercase tracking-wider mb-1">{w.label}</p>
                  <p className="text-white font-bold text-3xl leading-tight">AED {fmt(balance)}</p>
                  <p className="text-white/40 text-[12px] mt-1.5">{w.desc}</p>
                </Link>

                <div className="border-t border-white/10">
                  {isSalary ? (
                    <div className="flex">
                      <Link to="/wallet/salary"
                        className="flex-1 px-5 py-3.5 flex items-center justify-center gap-1.5 hover:bg-white/10 transition-colors border-r border-white/10">
                        <ChevronRight className="w-3.5 h-3.5 text-white" />
                        <span className="text-white text-[12px] font-bold">Transactions</span>
                      </Link>
                      <Link to="/employees"
                        className="flex-1 px-5 py-3.5 flex items-center justify-center gap-1.5 hover:bg-white/10 transition-colors">
                        <Banknote className="w-3.5 h-3.5 text-white" />
                        <span className="text-white text-[12px] font-bold">Pay Salary</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="flex">
                      <Link to={w.detailLink}
                        className="flex-1 px-5 py-3.5 flex items-center justify-center gap-1.5 hover:bg-white/10 transition-colors border-r border-white/10">
                        <ChevronRight className="w-3.5 h-3.5 text-white" />
                        <span className="text-white text-[12px] font-bold">Details</span>
                      </Link>
                      <button onClick={() => openDeposit(key)}
                        className="flex-1 px-5 py-3.5 flex items-center justify-center gap-1.5 hover:bg-white/10 transition-colors">
                        <Plus className="w-3.5 h-3.5 text-white" />
                        <span className="text-white text-[12px] font-bold">Deposit</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Low balance alerts ── */}
      {(vWallet.balance < LOW_BALANCE_THRESHOLD || hWallet.balance < LOW_BALANCE_THRESHOLD) && (
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
          </div>
        </motion.div>
      )}

      {/* ── Salary info strip ── */}
      <motion.div {...fade(0.18)}>
        <div className="flex items-center gap-4 px-5 py-4 rounded-2xl"
          style={{ background: '#f5f3ff', border: '1px solid #ddd6fe' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg,#4c1d95,#7c3aed)' }}>
            <Banknote className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-purple-800">Salary Wallet — AED {fmt(sWallet.balance)}</p>
            <p className="text-[11px] text-purple-500 mt-0.5">Balance is updated automatically when employee salaries are paid. Manage from the Employees module.</p>
          </div>
          <Link to="/employees"
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 transition-colors">
            Employees <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </motion.div>

      {/* ── Recent Transactions ── */}
      {allTxns.length > 0 && (
        <motion.div {...fade(0.22)}>
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.05)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
              <div>
                <p className="text-[14px] font-bold text-slate-800">Recent Transactions</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{allTxns.length} total across all wallets</p>
              </div>
              <button onClick={() => setShowReports(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                <FileDown className="w-3.5 h-3.5" /> Export
              </button>
            </div>

            {/* Transaction rows */}
            <div className="divide-y divide-slate-50">
              {pageTxns.map((txn) => {
                const isCredit = txn.type === 'credit';
                const wCfg     = WALLETS[txn.walletType] ?? WALLETS.vehicle;
                const WIcon    = wCfg.icon;
                return (
                  <div key={txn._id ?? txn.id} className="flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                      isCredit ? 'bg-emerald-50' : 'bg-red-50')}>
                      {isCredit
                        ? <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                        : <ArrowUpRight  className="w-4 h-4 text-red-500"     />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-slate-800 truncate">
                        {isCredit ? (txn.note || 'Deposit received') : (txn.description || 'Expense deducted')}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: wCfg.bg, color: wCfg.color }}>
                          <WIcon className="w-2.5 h-2.5" />
                          {wCfg.label.replace(' Wallet', '')}
                        </span>
                        {txn.category && (
                          <>
                            <span className="text-[10px] text-slate-300">·</span>
                            <span className="text-[10px] text-slate-400 capitalize">{txn.category}</span>
                          </>
                        )}
                        <span className="text-[10px] text-slate-300">·</span>
                        <span className="text-[11px] text-slate-400">{fmtDate(txn.date)}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn('text-[14px] font-bold tabular-nums', isCredit ? 'text-emerald-600' : 'text-red-500')}>
                        {isCredit ? '+' : '−'}AED {fmt(txn.amount)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {txnPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 bg-slate-50/60 border-t border-slate-100">
                <p className="text-[11px] text-slate-400 tabular-nums">
                  {allTxns.length} transactions · Page {txnPage} of {txnPages}
                </p>
                <div className="flex items-center gap-1">
                  <button disabled={txnPage === 1} onClick={() => setTxnPage(1)}
                    className="w-7 h-7 rounded-lg text-[12px] font-bold text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all">«</button>
                  <button disabled={txnPage === 1} onClick={() => setTxnPage((p) => p - 1)}
                    className="w-7 h-7 rounded-lg text-[12px] font-bold text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all">‹</button>
                  {Array.from({ length: Math.min(txnPages, 5) }, (_, i) => {
                    const n = txnPage <= 3 ? i + 1 : txnPage >= txnPages - 2 ? txnPages - 4 + i : txnPage - 2 + i;
                    if (n < 1 || n > txnPages) return null;
                    return (
                      <button key={n} onClick={() => setTxnPage(n)}
                        className={cn('w-7 h-7 rounded-lg text-[12px] font-bold transition-all',
                          n === txnPage ? 'text-white' : 'text-slate-500 hover:bg-slate-200')}
                        style={n === txnPage ? { background: '#0b1d3a' } : {}}>
                        {n}
                      </button>
                    );
                  })}
                  <button disabled={txnPage === txnPages} onClick={() => setTxnPage((p) => p + 1)}
                    className="w-7 h-7 rounded-lg text-[12px] font-bold text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all">›</button>
                  <button disabled={txnPage === txnPages} onClick={() => setTxnPage(txnPages)}
                    className="w-7 h-7 rounded-lg text-[12px] font-bold text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all">»</button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Reports Modal ── */}
      <Modal open={showReports} onClose={() => { if (!reportLoading) setShowReports(false); }}
        title="Generate Wallet Report" subtitle="Select wallet and period — downloads as PDF" size="sm">
        <div className="space-y-4">

          {/* Wallet selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Select Wallet</label>
            <div className="grid grid-cols-2 gap-2">
              {REPORT_WALLETS.map(({ k, l }) => {
                const wCfg = k === 'all' ? null : WALLETS[k];
                const active = reportWallet === k;
                return (
                  <button key={k} type="button" onClick={() => setReportWallet(k)}
                    className={cn('py-2.5 px-3 rounded-xl border-2 text-[12px] font-bold transition-all',
                      active ? 'text-white border-transparent' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200')}
                    style={active ? { background: wCfg?.gradient ?? 'linear-gradient(135deg,#0b1d3a,#1e3a6e)', borderColor: 'transparent' } : {}}>
                    {l}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Period selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Select Period</label>
            <div className="grid grid-cols-3 gap-2">
              {REPORT_PERIODS.map(({ k, l }) => (
                <button key={k} type="button" onClick={() => setReportPeriod(k)}
                  className={cn('py-2 px-2 rounded-xl border-2 text-[11px] font-bold transition-all',
                    reportPeriod === k ? 'text-white border-transparent' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200')}
                  style={reportPeriod === k ? { background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)', borderColor: 'transparent' } : {}}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Custom date range */}
          {reportPeriod === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Start Date</label>
                <DatePicker value={reportStart} onChange={setReportStart} className={INP} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">End Date</label>
                <DatePicker value={reportEnd} onChange={setReportEnd} className={INP} />
              </div>
            </div>
          )}

          {/* Generate button */}
          <div className="pt-1 border-t border-slate-100">
            <button onClick={handleReport}
              disabled={reportLoading || (reportPeriod === 'custom' && (!reportStart || !reportEnd))}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' }}>
              {reportLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" />Generating PDF…</>
                : <><BarChart3 className="w-4 h-4" />Generate & Download PDF</>}
            </button>
            <p className="text-[10px] text-slate-400 text-center mt-2">
              Professional PDF · balance cards, full transaction table &amp; totals
            </p>
          </div>
        </div>
      </Modal>

      {/* ── Deposit Modal ── */}
      <Modal open={showDeposit} onClose={() => { if (!isDepositing) setShowDeposit(false); }}
        title="Deposit Funds" subtitle="Receive money and allocate to a wallet" size="sm">
        <form onSubmit={handleDeposit} className="space-y-4">

          <div>
            <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Select Wallet</label>
            <div className="grid grid-cols-2 gap-2">
              {(['vehicle', 'home']).map((k) => {
                const w = WALLETS[k];
                const Icon = w.icon;
                const bal = walletsMap[k].balance ?? 0;
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
                      AED {fmt(bal)}
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
            <DatePicker value={form.date} onChange={(v) => setF('date', v)} className={INP} />
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
