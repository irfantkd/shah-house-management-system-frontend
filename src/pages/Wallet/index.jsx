import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, Car, Home, Banknote, Building2, Crown, Plus, ArrowDownLeft, ArrowUpRight,
  AlertTriangle, ChevronRight, Loader2, FileDown, BarChart3, Share2, CheckCircle2,
  RefreshCw, Search, X, CalendarDays, SlidersHorizontal,
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
  vehicle:  { label: 'Vehicle Wallet',  desc: 'Fuel, maintenance, repairs & fleet costs',          icon: Car,       color: '#0b1d3a', bg: '#f0f5ff', border: '#c7d7f5', gradient: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)', detailLink: '/wallet/vehicle'  },
  home:     { label: 'Home Wallet',     desc: 'Property services, grocery & household',            icon: Home,      color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', gradient: 'linear-gradient(135deg,#14532d,#16a34a)', detailLink: '/wallet/home'     },
  property: { label: 'Property Wallet', desc: 'Property maintenance, infrastructure & capital',   icon: Building2, color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', gradient: 'linear-gradient(135deg,#164e63,#0891b2)', detailLink: '/wallet/property' },
  salary:   { label: 'Salary Wallet',   desc: 'Employee salary payments · auto-tracked',          icon: Banknote,  color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', gradient: 'linear-gradient(135deg,#4c1d95,#7c3aed)', detailLink: '/wallet/salary'   },
  amaraa:   { label: 'Amaraa Wallet',   desc: 'Track office expenses wallet',     icon: Crown,     color: '#831843', bg: '#fdf2f8', border: '#fbcfe8', gradient: 'linear-gradient(135deg,#831843,#db2777)', detailLink: '/wallet/amaraa'   },
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
  { k: 'all',      l: 'All Wallets' },
  { k: 'vehicle',  l: 'Vehicle'     },
  { k: 'home',     l: 'Home'        },
  { k: 'property', l: 'Property'    },
  { k: 'salary',   l: 'Salary'      },
  { k: 'amaraa',   l: 'Amaraa'      },
];

const TXN_PAGE_SIZE = 10;

const TXN_PERIODS = [
  { k: 'all',    label: 'All Time'   },
  { k: 'month',  label: 'This Month' },
  { k: 'lastm',  label: 'Last Month' },
  { k: '3month', label: '3 Months'   },
  { k: 'year',   label: 'This Year'  },
  { k: 'custom', label: 'Custom'     },
];
const TXN_PERIOD_LABEL = {
  all: 'All Time', month: 'This Month', lastm: 'Last Month',
  '3month': 'Last 3 Months', year: 'This Year', custom: 'Custom Range',
};

function fmt(n) { return Number(n).toLocaleString('en-AE', { maximumFractionDigits: 0 }); }
function fmtDate(d) { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }

const INP = 'w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] text-slate-700 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500';

function WalletSkeleton() {
  const p = 'rounded-2xl bg-slate-100 animate-pulse';
  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className={`${p} h-7 w-24`} />
          <div className={`${p} h-4 w-64`} />
        </div>
        <div className="flex gap-2">
          <div className={`${p} h-10 w-28`} />
          <div className={`${p} h-10 w-36`} />
        </div>
      </div>
      {/* wallet cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...Array(4)].map((_, i) => <div key={i} className={`${p} h-52`} />)}
      </div>
      {/* salary strip */}
      <div className={`${p} h-16`} />
      {/* transaction list */}
      <div className={`${p} h-72`} />
    </div>
  );
}

export default function WalletPage() {
  const propertyId  = useSelector(selectCurrentPropertyId);
  const property    = useSelector(selectCurrentProperty);
  const authToken   = useSelector((s) => s.auth?.token);

  const {
    data: walletData,
    isLoading: walletLoading,
    isError:   walletError,
    error:     walletErr,
    refetch:   refetchWallets,
  } = useGetQuery(
    { path: '/wallet', params: { propertyId } },
    { skip: !propertyId },
  );

  // ── Transaction list state ─────────────────────────────────────────────────
  const [txnPage,        setTxnPage]        = useState(1);
  const [txnWalletFlt,   setTxnWalletFlt]   = useState('all');
  const [txnType,        setTxnType]        = useState('all');    // all | credit | debit
  const [txnPeriod,      setTxnPeriod]      = useState('all');
  const [txnCustomFrom,  setTxnCustomFrom]  = useState('');
  const [txnCustomTo,    setTxnCustomTo]    = useState('');
  const [txnSearchInput, setTxnSearchInput] = useState('');
  const [txnSearch,      setTxnSearch]      = useState('');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setTxnSearch(txnSearchInput); setTxnPage(1); }, 400);
    return () => clearTimeout(t);
  }, [txnSearchInput]);

  // Reset page on any filter change
  useEffect(() => { setTxnPage(1); }, [txnWalletFlt, txnType, txnPeriod, txnCustomFrom, txnCustomTo, txnSearch]);

  const txnParams = useMemo(() => ({
    propertyId,
    limit: TXN_PAGE_SIZE,
    page:  txnPage,
    ...(txnWalletFlt !== 'all'    && { walletType: txnWalletFlt }),
    ...(txnType      !== 'all'    && { txnType }),
    ...(txnPeriod !== 'all' && txnPeriod !== 'custom' && { period: txnPeriod }),
    ...(txnPeriod === 'custom' && txnCustomFrom && { startDate: txnCustomFrom }),
    ...(txnPeriod === 'custom' && txnCustomTo   && { endDate:   txnCustomTo   }),
    ...(txnSearch && { search: txnSearch }),
  }), [propertyId, txnPage, txnWalletFlt, txnType, txnPeriod, txnCustomFrom, txnCustomTo, txnSearch]);

  const { data: recentResult, isLoading: txnLoading, isFetching: txnFetching } = useGetQuery(
    { path: '/wallet/transactions', params: txnParams },
    { skip: !propertyId },
  );
  const allTxns  = recentResult?.items  ?? [];
  const txnTotal = recentResult?.total  ?? 0;
  const txnPages = recentResult?.pages  ?? 1;

  const EMPTY_W = { balance: 0 };
  const vWallet = { ...EMPTY_W, ...walletData?.vehicle  };
  const hWallet = { ...EMPTY_W, ...walletData?.home     };
  const pWallet = { ...EMPTY_W, ...walletData?.property };
  const sWallet = { ...EMPTY_W, ...walletData?.salary   };
  const aWallet = { ...EMPTY_W, ...walletData?.amaraa   };
  const walletsMap = { vehicle: vWallet, home: hWallet, property: pWallet, salary: sWallet, amaraa: aWallet };

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
  const [showReports,  setShowReports]  = useState(false);
  const [reportWallet, setReportWallet] = useState('all');
  const [reportPeriod, setReportPeriod] = useState('month');
  const [reportStart,  setReportStart]  = useState('');
  const [reportEnd,    setReportEnd]    = useState('');
  const [reportStep,   setReportStep]   = useState('idle'); // idle | generating | ready | sharing | done
  const [reportBlob,   setReportBlob]   = useState(null);
  const [reportSizeKB, setReportSizeKB] = useState(0);

  const canShare = typeof navigator !== 'undefined' && !!navigator.share;
  const fmtSize  = (kb) => kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;

  const walletReportFilename = () =>
    `Shah-${reportWallet === 'all' ? 'All-Wallets' : reportWallet}-${reportPeriod}-Statement.pdf`;

  const fetchWalletBlob = async () => {
    const params = new URLSearchParams({ propertyId, walletType: reportWallet, period: reportPeriod });
    if (reportPeriod === 'custom' && reportStart && reportEnd) {
      params.append('startDate', reportStart);
      params.append('endDate', reportEnd);
    }
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
    const res = await fetch(`${API_BASE_URL}/reports/wallet?${params}`, { credentials: 'include', headers });
    if (!res.ok) throw new Error('Report generation failed');
    return res.blob();
  };

  const handleReport = async () => {
    if (!propertyId) return;
    setReportStep('generating');
    try {
      const blob = await fetchWalletBlob();
      setReportBlob(blob);
      setReportSizeKB(Math.round(blob.size / 1024));
      setReportStep('ready');
    } catch {
      toast.error('Failed to generate report');
      setReportStep('idle');
    }
  };

  const handleDownloadReport = () => {
    if (!reportBlob) return;
    const url = URL.createObjectURL(reportBlob);
    const a   = document.createElement('a');
    a.href = url; a.download = walletReportFilename();
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setReportStep('done');
    setTimeout(() => { setShowReports(false); setReportStep('idle'); setReportBlob(null); }, 1200);
  };

  const handleShareReport = async () => {
    if (!reportBlob) return;
    setReportStep('sharing');
    try {
      const file = new File([reportBlob], walletReportFilename(), { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Shah House — Wallet Statement', text: 'Wallet PDF report from Shah House Management' });
        setReportStep('done');
        setTimeout(() => { setShowReports(false); setReportStep('idle'); setReportBlob(null); }, 1200);
      } else {
        handleDownloadReport();
        toast('Sharing not supported — downloaded instead');
      }
    } catch (e) {
      setReportStep(e?.name === 'AbortError' ? 'ready' : 'idle');
      if (e?.name !== 'AbortError') toast.error('Failed to share');
    }
  };

  const reportLoading = reportStep === 'generating' || reportStep === 'sharing';
  const resetReport   = () => { setReportStep('idle'); setReportBlob(null); };

  const handleTxnWallet = (w) => { setTxnWalletFlt(w); setTxnPage(1); };

  // ── Loading / error gates ─────────────────────────────────────────────────────
  if (walletLoading || !propertyId) return <WalletSkeleton />;
  if (walletError) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: '#fef2f2' }}>
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Failed to load wallets</h2>
        <p className="text-sm text-slate-500 max-w-xs">{walletErr?.data?.message ?? walletErr?.message ?? 'An error occurred'}</p>
      </div>
      <button onClick={refetchWallets}
        className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
        style={{ background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' }}>
        <RefreshCw className="w-4 h-4" /> Retry
      </button>
    </div>
  );

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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {Object.entries(WALLETS).map(([key, w], i) => {
          const wallet   = walletsMap[key];
          const balance  = wallet.balance ?? 0;
          const low      = balance < LOW_BALANCE_THRESHOLD;
          const empty    = balance <= 0;
          const Icon     = w.icon;
          const isSalary = key === 'salary';

          return (
            <motion.div key={key} {...fade(0.06 + i * 0.06)} className="flex flex-col">
              <div className="rounded-2xl overflow-hidden flex flex-col flex-1"
                style={{ background: w.gradient, boxShadow: `0 6px 24px ${w.color}28` }}>

                <Link to={w.detailLink} className="block p-4 sm:p-5 pb-3 sm:pb-4 hover:bg-white/5 transition-colors group flex-1">
                  {/* Icon + badge row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center bg-white/10 shrink-0">
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {!isSalary && (empty || low) && (
                        <span className={cn(
                          'flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-1 rounded-lg',
                          empty ? 'bg-red-500 text-white' : 'bg-amber-400 text-amber-900',
                        )}>
                          <AlertTriangle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          <span className="hidden sm:inline">{empty ? 'Empty' : 'Low'}</span>
                          <span className="sm:hidden">{empty ? '!' : '!'}</span>
                        </span>
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white/70 transition-colors" />
                    </div>
                  </div>

                  {/* Label */}
                  <p className="text-white/55 text-[9px] sm:text-[10px] font-black uppercase tracking-wider mb-1 leading-none">
                    {w.label.replace(' Wallet', '')}
                  </p>

                  {/* Balance */}
                  <p className="text-white font-black text-lg sm:text-2xl leading-tight tabular-nums">
                    AED <span className="text-xl sm:text-3xl">{fmt(balance)}</span>
                  </p>

                  {/* Description — hidden on small mobile */}
                  <p className="hidden sm:block text-white/35 text-[11px] mt-1.5 leading-tight line-clamp-2">{w.desc}</p>
                </Link>

                {/* Footer actions */}
                <div className="border-t border-white/10">
                  {isSalary ? (
                    <div className="flex">
                      <Link to="/wallet/salary"
                        className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-center gap-1 sm:gap-1.5 hover:bg-white/10 transition-colors border-r border-white/10">
                        <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                        <span className="text-white text-[10px] sm:text-[11px] font-bold">History</span>
                      </Link>
                      <Link to="/employees"
                        className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-center gap-1 sm:gap-1.5 hover:bg-white/10 transition-colors">
                        <Banknote className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                        <span className="text-white text-[10px] sm:text-[11px] font-bold">Pay</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="flex">
                      <Link to={w.detailLink}
                        className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-center gap-1 sm:gap-1.5 hover:bg-white/10 transition-colors border-r border-white/10">
                        <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                        <span className="text-white text-[10px] sm:text-[11px] font-bold">Details</span>
                      </Link>
                      <button onClick={() => openDeposit(key)}
                        className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-center gap-1 sm:gap-1.5 hover:bg-white/10 transition-colors">
                        <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                        <span className="text-white text-[10px] sm:text-[11px] font-bold">Deposit</span>
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
      {(vWallet.balance < LOW_BALANCE_THRESHOLD || hWallet.balance < LOW_BALANCE_THRESHOLD || pWallet.balance < LOW_BALANCE_THRESHOLD || aWallet.balance < LOW_BALANCE_THRESHOLD) && (
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
            {pWallet.balance <= 0 && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-200">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-red-700">Property Wallet is empty</p>
                  <p className="text-[11px] text-red-500">Property maintenance and infrastructure expenses cannot be logged until you deposit funds.</p>
                </div>
                <button onClick={() => openDeposit('property')}
                  className="shrink-0 text-[12px] font-bold text-red-700 bg-red-100 px-3 py-1.5 rounded-xl hover:bg-red-200 transition-colors">
                  Deposit Now
                </button>
              </div>
            )}
            {pWallet.balance > 0 && pWallet.balance < LOW_BALANCE_THRESHOLD && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-cyan-50 border border-cyan-200">
                <AlertTriangle className="w-5 h-5 text-cyan-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-cyan-700">Property Wallet running low — AED {fmt(pWallet.balance)} left</p>
                  <p className="text-[11px] text-cyan-600">Consider topping up before the next property expense.</p>
                </div>
                <button onClick={() => openDeposit('property')}
                  className="shrink-0 text-[12px] font-bold text-cyan-700 bg-cyan-100 px-3 py-1.5 rounded-xl hover:bg-cyan-200 transition-colors">
                  Top Up
                </button>
              </div>
            )}
            {aWallet.balance <= 0 && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-200">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-red-700">Amaraa Wallet is empty</p>
                  <p className="text-[11px] text-red-500">Deposit funds to the personal wallet to continue tracking.</p>
                </div>
                <button onClick={() => openDeposit('amaraa')}
                  className="shrink-0 text-[12px] font-bold text-red-700 bg-red-100 px-3 py-1.5 rounded-xl hover:bg-red-200 transition-colors">
                  Deposit Now
                </button>
              </div>
            )}
            {aWallet.balance > 0 && aWallet.balance < LOW_BALANCE_THRESHOLD && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-pink-50 border border-pink-200">
                <AlertTriangle className="w-5 h-5 text-pink-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-pink-700">Amaraa Wallet running low — AED {fmt(aWallet.balance)} left</p>
                  <p className="text-[11px] text-pink-600">Consider topping up the personal wallet.</p>
                </div>
                <button onClick={() => openDeposit('amaraa')}
                  className="shrink-0 text-[12px] font-bold text-pink-700 bg-pink-100 px-3 py-1.5 rounded-xl hover:bg-pink-200 transition-colors">
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

      {/* ── Transactions ── */}
      <motion.div {...fade(0.22)}>
        {/* isFetching progress bar */}
        {txnFetching && !txnLoading && (
          <div className="fixed top-0 left-0 right-0 z-9999 h-0.5 overflow-hidden">
            <div className="h-full bg-blue-500" style={{ animation: 'walletProgress 1.4s ease-in-out infinite' }} />
            <style>{`@keyframes walletProgress{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: '0 1px 16px rgba(0,0,0,0.06)' }}>

          {/* ── Panel header ── */}
          <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-4 border-b border-slate-100 space-y-4">

            {/* Title row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' }}>
                  <Wallet className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-slate-800 leading-none">All Transactions</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                    {txnFetching
                      ? <span className="inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Loading…</span>
                      : `${txnTotal} record${txnTotal !== 1 ? 's' : ''} · ${TXN_PERIOD_LABEL[txnPeriod]}`}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowReports(true)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors whitespace-nowrap">
                <FileDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export PDF</span>
                <span className="sm:hidden">PDF</span>
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                value={txnSearchInput}
                onChange={(e) => setTxnSearchInput(e.target.value)}
                placeholder="Search by description, category, note…"
                className="w-full h-10 pl-9 pr-9 rounded-xl border border-slate-200 bg-white text-[13px] placeholder-slate-400 outline-none transition-all focus:border-blue-400"
              />
              {txnSearchInput && (
                <button onClick={() => { setTxnSearchInput(''); setTxnSearch(''); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Period pills + custom date range */}
            {(() => {
              const today = new Date().toISOString().split('T')[0];
              const hasRange = txnCustomFrom || txnCustomTo;
              const dayCount = txnCustomFrom && txnCustomTo
                ? Math.max(0, Math.round((new Date(txnCustomTo) - new Date(txnCustomFrom)) / 86400000) + 1)
                : null;
              return (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none', paddingBottom: '2px' }}>
                    {TXN_PERIODS.map(({ k, label }) => {
                      const active   = txnPeriod === k;
                      const isCustom = k === 'custom';
                      return (
                        <button key={k}
                          onClick={() => { setTxnPeriod(k); if (k !== 'custom') { setTxnCustomFrom(''); setTxnCustomTo(''); } }}
                          className={cn(
                            'shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-bold transition-all border whitespace-nowrap',
                            active
                              ? 'text-white border-transparent shadow-md'
                              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700',
                          )}
                          style={active ? { background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' } : {}}>
                          {isCustom && <CalendarDays className="w-3.5 h-3.5 shrink-0" />}
                          {label}
                          {isCustom && hasRange && active && (
                            <span className="ml-0.5 w-2 h-2 rounded-full bg-blue-300 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom date range card */}
                  <AnimatePresence>
                    {txnPeriod === 'custom' && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scaleY: 0.96 }}
                        animate={{ opacity: 1, y: 0, scaleY: 1 }}
                        exit={{ opacity: 0, y: -6, scaleY: 0.96 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                        style={{ transformOrigin: 'top' }}>
                        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                                style={{ background: 'linear-gradient(135deg,#eff6ff,#ecfeff)' }}>
                                <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-[12px] font-bold text-slate-800 leading-none">Custom Date Range</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">Filter by specific period</p>
                              </div>
                            </div>
                            {hasRange && (
                              <button onClick={() => { setTxnCustomFrom(''); setTxnCustomTo(''); }}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                                <X className="w-3.5 h-3.5" /> Clear
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Start Date</label>
                              <div className="relative">
                                <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none z-10"
                                  style={{ color: txnCustomFrom ? '#2563eb' : '#94a3b8' }} />
                                <input type="date" value={txnCustomFrom}
                                  max={txnCustomTo || today}
                                  onChange={(e) => setTxnCustomFrom(e.target.value)}
                                  className="w-full h-10 pl-8 pr-2 rounded-xl border text-[12px] outline-none transition-all"
                                  style={{
                                    borderColor: txnCustomFrom ? '#93c5fd' : '#e2e8f0',
                                    background:  txnCustomFrom ? '#eff6ff' : '#fff',
                                    color:       txnCustomFrom ? '#1d4ed8' : '#374151',
                                    fontWeight:  txnCustomFrom ? '600' : '400',
                                  }} />
                              </div>
                            </div>
                            <div>
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">End Date</label>
                              <div className="relative">
                                <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none z-10"
                                  style={{ color: txnCustomTo ? '#2563eb' : '#94a3b8' }} />
                                <input type="date" value={txnCustomTo}
                                  min={txnCustomFrom || undefined}
                                  max={today}
                                  onChange={(e) => setTxnCustomTo(e.target.value)}
                                  className="w-full h-10 pl-8 pr-2 rounded-xl border text-[12px] outline-none transition-all"
                                  style={{
                                    borderColor: txnCustomTo ? '#93c5fd' : '#e2e8f0',
                                    background:  txnCustomTo ? '#eff6ff' : '#fff',
                                    color:       txnCustomTo ? '#1d4ed8' : '#374151',
                                    fontWeight:  txnCustomTo ? '600' : '400',
                                  }} />
                              </div>
                            </div>
                          </div>

                          {hasRange ? (
                            <div className="mt-2.5 flex items-center justify-between gap-2 px-3 py-2 rounded-xl"
                              style={{ background: 'linear-gradient(135deg,#eff6ff,#ecfeff)', border: '1px solid #bfdbfe' }}>
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                <span className="text-[11px] font-semibold text-slate-700 truncate">
                                  {txnCustomFrom ? fmtDate(txnCustomFrom) : 'Any start'} → {txnCustomTo ? fmtDate(txnCustomTo) : 'Today'}
                                </span>
                              </div>
                              {dayCount !== null && (
                                <span className="shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-black text-blue-700"
                                  style={{ background: '#dbeafe' }}>
                                  {dayCount}d
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="mt-2 text-[10px] text-slate-400 text-center">Select start and end date to filter</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })()}

            {/* Type filter + Wallet filter */}
            <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center">
              {/* Type (All / Deposits / Expenses) */}
              <div className="flex gap-1 p-1 bg-slate-100 rounded-xl shrink-0">
                {[
                  { k: 'all',    l: 'All'      },
                  { k: 'credit', l: 'Deposits'  },
                  { k: 'debit',  l: 'Expenses'  },
                ].map(({ k, l }) => (
                  <button key={k} onClick={() => setTxnType(k)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap',
                      txnType === k ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700',
                    )}>
                    {l}
                  </button>
                ))}
              </div>

              {/* Wallet filter tabs */}
              <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {[
                  { k: 'all',      l: 'All Wallets', wCfg: null },
                  { k: 'vehicle',  l: 'Vehicle',  wCfg: WALLETS.vehicle  },
                  { k: 'home',     l: 'Home',     wCfg: WALLETS.home     },
                  { k: 'property', l: 'Property', wCfg: WALLETS.property },
                  { k: 'salary',   l: 'Salary',   wCfg: WALLETS.salary   },
                  { k: 'amaraa',   l: 'Amaraa',   wCfg: WALLETS.amaraa   },
                ].map(({ k, l, wCfg }) => {
                  const isAct = txnWalletFlt === k;
                  return (
                    <button key={k} type="button" onClick={() => handleTxnWallet(k)}
                      className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap"
                      style={isAct
                        ? { background: wCfg?.gradient ?? 'linear-gradient(135deg,#0b1d3a,#1e3a6e)', color: '#fff' }
                        : { background: '#f1f5f9', color: '#64748b' }}>
                      {wCfg && <wCfg.icon className="w-3 h-3" />}
                      {l}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active filter chips summary */}
            {(txnSearch || txnType !== 'all' || txnWalletFlt !== 'all' || txnPeriod !== 'all') && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Active:</span>
                {txnSearch && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700">
                    "{txnSearch}"
                    <button onClick={() => { setTxnSearchInput(''); setTxnSearch(''); }} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {txnPeriod !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700">
                    {txnPeriod === 'custom' && (txnCustomFrom || txnCustomTo)
                      ? `${txnCustomFrom || '—'} → ${txnCustomTo || 'Today'}`
                      : TXN_PERIOD_LABEL[txnPeriod]}
                    <button onClick={() => { setTxnPeriod('all'); setTxnCustomFrom(''); setTxnCustomTo(''); }} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {txnType !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700">
                    {txnType === 'credit' ? 'Deposits only' : 'Expenses only'}
                    <button onClick={() => setTxnType('all')} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {txnWalletFlt !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold"
                    style={{ background: WALLETS[txnWalletFlt]?.bg, color: WALLETS[txnWalletFlt]?.color }}>
                    {WALLETS[txnWalletFlt]?.label}
                    <button onClick={() => handleTxnWallet('all')} className="hover:opacity-60"><X className="w-3 h-3" /></button>
                  </span>
                )}
                <button onClick={() => {
                  setTxnSearch(''); setTxnSearchInput(''); setTxnPeriod('all');
                  setTxnCustomFrom(''); setTxnCustomTo(''); setTxnType('all'); handleTxnWallet('all');
                }} className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors ml-auto">
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* ── Transaction rows ── */}
          <div className={cn('transition-opacity duration-150', txnFetching && !txnLoading && 'opacity-40 pointer-events-none')}>
            {txnLoading ? (
              <div className="divide-y divide-slate-50">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 sm:px-5 py-3.5 animate-pulse">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-slate-100 rounded-full w-3/5" />
                      <div className="h-2.5 bg-slate-100 rounded-full w-2/5" />
                    </div>
                    <div className="h-3.5 w-20 bg-slate-100 rounded-full shrink-0" />
                  </div>
                ))}
              </div>
            ) : allTxns.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-7 h-7 text-slate-300" strokeWidth={1.5} />
                </div>
                <p className="text-[14px] font-semibold text-slate-400">
                  {txnSearch || txnType !== 'all' || txnWalletFlt !== 'all' || txnPeriod !== 'all'
                    ? 'No matching transactions'
                    : 'No transactions yet'}
                </p>
                <p className="text-[12px] text-slate-300 mt-1">
                  {txnSearch || txnType !== 'all' || txnWalletFlt !== 'all' || txnPeriod !== 'all'
                    ? 'Try adjusting your filters or search term.'
                    : 'Deposit funds or log an expense to get started.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {allTxns.map((txn, i) => {
                  const isCredit = txn.type === 'credit';
                  const wCfg     = WALLETS[txn.walletType] ?? WALLETS.vehicle;
                  const WIcon    = wCfg.icon;
                  return (
                    <motion.div key={txn._id ?? txn.id}
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-3.5 hover:bg-slate-50/70 transition-colors group">

                      {/* Icon */}
                      <div className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105',
                        isCredit ? 'bg-emerald-50' : 'bg-red-50',
                      )}>
                        {isCredit
                          ? <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                          : <ArrowUpRight  className="w-4 h-4 text-red-500"     />}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-800 leading-snug break-words">
                          {isCredit ? (txn.note || txn.description || 'Deposit received') : (txn.description || 'Expense deducted')}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-lg"
                            style={{ background: wCfg.bg, color: wCfg.color }}>
                            <WIcon className="w-2.5 h-2.5 shrink-0" />
                            {wCfg.label.replace(' Wallet', '')}
                          </span>
                          {txn.category && txn.category !== 'Deposit' && (
                            <>
                              <span className="text-[9px] text-slate-300">·</span>
                              <span className="text-[10px] text-slate-400 capitalize">{txn.category}</span>
                            </>
                          )}
                          <span className="text-[9px] text-slate-300">·</span>
                          <span className="text-[10px] text-slate-400 shrink-0">{fmtDate(txn.date)}</span>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="text-right shrink-0">
                        <p className={cn(
                          'text-[13px] sm:text-[14px] font-bold tabular-nums',
                          isCredit ? 'text-emerald-600' : 'text-red-500',
                        )}>
                          {isCredit ? '+' : '−'}AED {fmt(txn.amount)}
                        </p>
                        {txn.balanceAfter != null && (
                          <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 tabular-nums">
                            Bal: {fmt(txn.balanceAfter)}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Pagination footer ── */}
          {(txnPages > 1 || allTxns.length > 0) && (
            <div className="px-4 sm:px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <p className="text-[11px] text-slate-500 tabular-nums">
                {txnTotal > 0
                  ? `Showing ${(txnPage - 1) * TXN_PAGE_SIZE + 1}–${Math.min(txnPage * TXN_PAGE_SIZE, txnTotal)} of ${txnTotal}`
                  : '0 results'}
              </p>
              {txnPages > 1 && (
                <div className="flex items-center gap-1 self-end sm:self-auto">
                  <PagBtn disabled={txnPage === 1 || txnFetching} onClick={() => setTxnPage(1)}>«</PagBtn>
                  <PagBtn disabled={txnPage === 1 || txnFetching} onClick={() => setTxnPage((p) => p - 1)}>‹</PagBtn>
                  {getPagNums(txnPage, txnPages).map((n, idx) => n === '…' ? (
                    <span key={`e-${idx}`} className="w-7 text-center text-[11px] text-slate-400">…</span>
                  ) : (
                    <button key={n} onClick={() => setTxnPage(n)} disabled={txnFetching}
                      className={cn(
                        'w-7 h-7 rounded-lg text-[12px] font-bold transition-all',
                        n === txnPage ? 'text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200 disabled:opacity-40',
                      )}
                      style={n === txnPage ? { background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' } : {}}>
                      {n}
                    </button>
                  ))}
                  <PagBtn disabled={txnPage === txnPages || txnFetching} onClick={() => setTxnPage((p) => p + 1)}>›</PagBtn>
                  <PagBtn disabled={txnPage === txnPages || txnFetching} onClick={() => setTxnPage(txnPages)}>»</PagBtn>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Reports Modal ── */}
      <Modal open={showReports} onClose={() => { if (!reportLoading) { setShowReports(false); resetReport(); } }}
        title="Generate Wallet Report" subtitle="A4 PDF · header & footer on every page · 20+ rows per page" size="sm">
        <div className="space-y-4">

          {/* Settings — only shown when idle or ready (hide while generating/sharing/done) */}
          {(reportStep === 'idle' || reportStep === 'ready') && (
            <>
              {/* Wallet selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Select Wallet</label>
                <div className="grid grid-cols-2 gap-2">
                  {REPORT_WALLETS.map(({ k, l }) => {
                    const wCfg = k === 'all' ? null : WALLETS[k];
                    const active = reportWallet === k;
                    return (
                      <button key={k} type="button" onClick={() => { setReportWallet(k); resetReport(); }}
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
                    <button key={k} type="button" onClick={() => { setReportPeriod(k); resetReport(); }}
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
                    <DatePicker value={reportStart} onChange={(v) => { setReportStart(v); resetReport(); }} className={INP} />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">End Date</label>
                    <DatePicker value={reportEnd} onChange={(v) => { setReportEnd(v); resetReport(); }} className={INP} />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Action area — step machine */}
          <div className="pt-1 border-t border-slate-100">

            {/* IDLE */}
            {reportStep === 'idle' && (
              <button onClick={handleReport}
                disabled={reportPeriod === 'custom' && (!reportStart || !reportEnd)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' }}>
                <BarChart3 className="w-4 h-4" />Build Report PDF
              </button>
            )}

            {/* GENERATING */}
            {reportStep === 'generating' && (
              <div className="flex flex-col items-center gap-2 py-5">
                <Loader2 className="w-7 h-7 animate-spin text-navy-900" />
                <p className="text-[13px] font-bold text-slate-700">Building your PDF…</p>
                <p className="text-[11px] text-slate-400">Compiling transactions, formatting A4 pages</p>
              </div>
            )}

            {/* READY — file info + action buttons */}
            {reportStep === 'ready' && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="w-9 h-9 rounded-xl bg-navy-900 flex items-center justify-center shrink-0">
                    <FileDown className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-navy-900 truncate">{walletReportFilename()}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">A4 PDF · {fmtSize(reportSizeKB)} · Ready</p>
                  </div>
                </div>
                <div className={cn('grid gap-2', canShare ? 'grid-cols-2' : 'grid-cols-1')}>
                  <button onClick={handleDownloadReport}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-bold border-2 border-navy-900 text-navy-900 bg-blue-50 transition-all">
                    <FileDown className="w-3.5 h-3.5" />Save to Device
                  </button>
                  {canShare && (
                    <button onClick={handleShareReport}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-bold text-white transition-all"
                      style={{ background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' }}>
                      <Share2 className="w-3.5 h-3.5" />Share via App
                    </button>
                  )}
                </div>
                <button onClick={resetReport} className="w-full text-[11px] text-slate-400 hover:text-slate-600 py-1 transition-colors">
                  ← Change settings
                </button>
              </div>
            )}

            {/* SHARING */}
            {reportStep === 'sharing' && (
              <div className="flex flex-col items-center gap-2 py-5">
                <Loader2 className="w-7 h-7 animate-spin text-navy-900" />
                <p className="text-[13px] font-bold text-slate-700">Opening share sheet…</p>
                <p className="text-[11px] text-slate-400">Choose WhatsApp or any app to send the PDF</p>
              </div>
            )}

            {/* DONE */}
            {reportStep === 'done' && (
              <div className="flex flex-col items-center gap-2 py-5">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                <p className="text-[13px] font-bold text-slate-700">Done!</p>
              </div>
            )}
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
              {(['vehicle', 'home', 'property', 'amaraa']).map((k) => {
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

function PagBtn({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-7 h-7 rounded-lg text-[12px] font-bold text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
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
