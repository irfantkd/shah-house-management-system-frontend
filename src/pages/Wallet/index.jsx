import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import {
  Wallet, Car, Home, Plus, ArrowDownLeft, ArrowUpRight,
  AlertTriangle, Download, ChevronRight,
} from 'lucide-react';
import { downloadCombinedWalletPDF } from '../../utils/pdfReport';
import {
  selectVehicleWallet, selectHomeWallet,
  depositToWallet, LOW_BALANCE_THRESHOLD,
} from '../../store/slices/walletSlice';
import { selectCurrentProperty } from '../../store/slices/propertiesSlice';
import Modal  from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

const fade = (d = 0) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.32, delay: d, ease: [0.4, 0, 0.2, 1] } });
const BLANK = { wallet: 'vehicle', amount: '', note: '', date: new Date().toISOString().split('T')[0] };

const WALLETS = {
  vehicle: { label: 'Vehicle Wallet', desc: 'Fuel, maintenance, repairs & fleet costs', icon: Car,  color: '#0b1d3a', bg: '#f0f5ff', border: '#c7d7f5', gradient: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' },
  home:    { label: 'Home Wallet',    desc: 'Property services, grocery & household',   icon: Home, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', gradient: 'linear-gradient(135deg,#14532d,#16a34a)' },
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
  const dispatch  = useDispatch();
  const vWallet   = useSelector(selectVehicleWallet);
  const hWallet   = useSelector(selectHomeWallet);
  const property  = useSelector(selectCurrentProperty);

  const [showDeposit, setShowDeposit] = useState(false);
  const [form,        setForm]        = useState(BLANK);
  const [filter,      setFilter]      = useState('all');
  const [txnPeriod,   setTxnPeriod]   = useState('month');
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const walletsMap = { vehicle: vWallet, home: hWallet };

  const allTransactions = useMemo(() => {
    const vTxns = (vWallet.transactions ?? []).map((t) => ({ ...t, wallet: 'vehicle' }));
    const hTxns = (hWallet.transactions ?? []).map((t) => ({ ...t, wallet: 'home' }));
    return [...vTxns, ...hTxns].sort((a, b) => {
      const diff = new Date(b.date) - new Date(a.date);
      return diff !== 0 ? diff : b.id.localeCompare(a.id);
    });
  }, [vWallet.transactions, hWallet.transactions]);

  const periodFiltered = useMemo(() => applyPeriod(allTransactions, txnPeriod), [allTransactions, txnPeriod]);

  const visible = useMemo(() => {
    if (filter === 'all')      return periodFiltered;
    if (filter === 'deposits') return periodFiltered.filter((t) => t.type === 'deposit');
    if (filter === 'expenses') return periodFiltered.filter((t) => t.type === 'expense');
    return periodFiltered.filter((t) => t.wallet === filter);
  }, [periodFiltered, filter]);

  const handleDeposit = (e) => {
    e.preventDefault();
    const amt = Number(form.amount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    dispatch(depositToWallet({ wallet: form.wallet, amount: amt, note: form.note, date: form.date }));
    toast.success(`AED ${fmt(amt)} deposited to ${WALLETS[form.wallet].label}`);
    setShowDeposit(false);
    setForm(BLANK);
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
        <Button icon={Plus} onClick={() => openDeposit('vehicle')}>Deposit Funds</Button>
      </motion.div>

      {/* ── Wallet Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
            <button
              onClick={() => downloadCombinedWalletPDF({ vWallet, hWallet, transactions: visible, periodLabel: periodLabel(txnPeriod), propertyName: property?.name, propertyType: property?.type })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all">
              <Download className="w-3.5 h-3.5" /> Download PDF
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
                  const wCfg   = WALLETS[txn.wallet];
                  const isDepo = txn.type === 'deposit';
                  const WIcon  = wCfg.icon;
                  return (
                    <div key={txn.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors">
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
                      <div className="text-right shrink-0">
                        <p className={cn('text-[15px] font-bold tabular-nums', isDepo ? 'text-emerald-600' : 'text-red-500')}>
                          {isDepo ? '+' : '−'}AED {fmt(txn.amount)}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Bal: AED {fmt(txn.balanceAfter ?? 0)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
                <p className="text-[11px] text-slate-400">{visible.length} transactions</p>
                <div className="flex items-center gap-4">
                  <span className="text-[12px] text-emerald-600 font-bold">
                    +AED {fmt(visible.filter((t) => t.type === 'deposit').reduce((s, t) => s + t.amount, 0))}
                  </span>
                  <span className="text-[12px] text-red-500 font-bold">
                    −AED {fmt(visible.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0))}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* ── Deposit Modal ── */}
      <Modal open={showDeposit} onClose={() => setShowDeposit(false)}
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
            <Button variant="outline" type="button" onClick={() => setShowDeposit(false)}>Cancel</Button>
            <Button type="submit" icon={Plus}>Deposit</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

const INP = 'w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] text-slate-700 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500';
