import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Car, Home, Plus, ArrowDownLeft, ArrowUpRight,
  Download, AlertTriangle, Wallet, TrendingUp, TrendingDown,
} from 'lucide-react';
import { downloadSingleWalletPDF } from '../../utils/pdfReport';
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

const WALLET_CFG = {
  vehicle: { label: 'Vehicle Wallet', desc: 'Fuel, maintenance, repairs & fleet costs', icon: Car,  color: '#0b1d3a', bg: '#f0f5ff', border: '#c7d7f5', gradient: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' },
  home:    { label: 'Home Wallet',    desc: 'Property services, grocery & household',   icon: Home, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', gradient: 'linear-gradient(135deg,#14532d,#16a34a)' },
};

const PDF_COLORS = { vehicle: [11, 29, 58], home: [20, 83, 45] };

const PERIODS = [
  { k: 'week',   l: 'This Week'    },
  { k: 'month',  l: 'This Month'   },
  { k: 'lastm',  l: 'Last Month'   },
  { k: 'last3',  l: 'Last 3 Months'},
  { k: 'all',    l: 'All Time'     },
];

const fmt = (n) => Number(n).toLocaleString('en-AE', { maximumFractionDigits: 0 });
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

function applyPeriod(txns, period) {
  if (period === 'all') return txns;
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

function periodLabel(period) {
  const now = new Date();
  if (period === 'week')  return `Last 7 Days`;
  if (period === 'month') return now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  if (period === 'lastm') return new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  if (period === 'last3') return 'Last 3 Months';
  return 'All Time';
}


const INP = 'w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] text-slate-700 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500';
const BLANK = { amount: '', note: '', date: new Date().toISOString().split('T')[0] };

export default function WalletDetail() {
  const { walletType } = useParams();
  const navigate       = useNavigate();
  const dispatch       = useDispatch();
  const vWallet        = useSelector(selectVehicleWallet);
  const hWallet        = useSelector(selectHomeWallet);

  const property = useSelector(selectCurrentProperty);
  const type   = walletType === 'home' ? 'home' : 'vehicle';
  const cfg    = WALLET_CFG[type];
  const wallet = type === 'vehicle' ? vWallet : hWallet;
  const Icon   = cfg.icon;

  const [period,      setPeriod]      = useState('month');
  const [showDeposit, setShowDeposit] = useState(false);
  const [form,        setForm]        = useState(BLANK);
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const allTxns = useMemo(() => [...(wallet.transactions ?? [])].sort((a, b) => {
    const d = new Date(b.date) - new Date(a.date);
    return d !== 0 ? d : b.id.localeCompare(a.id);
  }), [wallet.transactions]);

  const filtered = useMemo(() => applyPeriod(allTxns, period), [allTxns, period]);

  const periodDeposited = filtered.filter((t) => t.type === 'deposit').reduce((s, t) => s + t.amount, 0);
  const periodSpent     = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const periodNet       = periodDeposited - periodSpent;

  // Monthly breakdown for chart (all-time, max 6 months)
  const byMonth = useMemo(() => {
    const map = {};
    allTxns.forEach((t) => {
      const key = t.date.slice(0, 7);
      if (!map[key]) map[key] = { key, deposited: 0, spent: 0 };
      if (t.type === 'deposit') map[key].deposited += t.amount;
      else                      map[key].spent      += t.amount;
    });
    return Object.values(map).sort((a, b) => b.key.localeCompare(a.key)).slice(0, 6).reverse();
  }, [allTxns]);

  const maxMonthVal = Math.max(...byMonth.flatMap((m) => [m.deposited, m.spent]), 1);

  const balance = wallet.balance ?? 0;
  const total   = wallet.totalDeposited ?? 0;
  const spent   = total - balance;
  const pct     = total > 0 ? Math.max(0, Math.min(100, (balance / total) * 100)) : 0;
  const low     = balance < LOW_BALANCE_THRESHOLD;
  const empty   = balance <= 0;

  const handleDeposit = (e) => {
    e.preventDefault();
    const amt = Number(form.amount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    dispatch(depositToWallet({ wallet: type, amount: amt, note: form.note, date: form.date }));
    toast.success(`AED ${fmt(amt)} deposited to ${cfg.label}`);
    setShowDeposit(false);
    setForm(BLANK);
  };

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
          <button
            onClick={() => downloadSingleWalletPDF({ walletLabel: cfg.label, walletColor: PDF_COLORS[type], wallet, transactions: filtered, byMonth, periodLabel: periodLabel(period), propertyName: property?.name, propertyType: property?.type })}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-[12px] font-bold text-slate-600 hover:border-slate-300 hover:shadow-sm transition-all">
            <Download className="w-3.5 h-3.5" /> Download PDF
          </button>
          <Button icon={Plus} onClick={() => setShowDeposit(true)}>Deposit Funds</Button>
        </div>
      </motion.div>

      {/* ── Hero wallet card ── */}
      <motion.div {...fade(0.05)}>
        <div className="rounded-2xl overflow-hidden" style={{ background: cfg.gradient, boxShadow: `0 10px 40px ${cfg.color}35` }}>
          <div className="p-7 pb-5">
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-white/50 text-[11px] font-bold uppercase tracking-[0.15em] mb-1">Available Balance</p>
                <p className="text-white font-bold text-4xl leading-none">AED {fmt(balance)}</p>
                <p className="text-white/40 text-[12px] mt-2">{cfg.desc}</p>
              </div>
              {(empty || low) && (
                <span className={cn('flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-xl',
                  empty ? 'bg-red-500 text-white' : 'bg-amber-400 text-amber-900')}>
                  <AlertTriangle className="w-3.5 h-3.5" />{empty ? 'Empty — Deposit Now' : `Low Balance`}
                </span>
              )}
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
              <div className="h-full rounded-full bg-white/60 transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-white/30 text-[11px]">{Math.round(pct)}% of AED {fmt(total)} remaining</p>
          </div>
          <div className="grid grid-cols-3 border-t border-white/10">
            {[
              { l: 'Total Deposited', v: fmt(total)             },
              { l: 'Total Spent',     v: fmt(Math.max(0, spent)) },
              { l: 'Transactions',    v: allTxns.length          },
            ].map((s, i) => (
              <div key={i} className={cn('px-6 py-4 text-center', i < 2 && 'border-r border-white/10')}>
                <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider">{s.l}</p>
                <p className="text-white font-bold text-[18px] mt-1">{typeof s.v === 'number' ? s.v : `AED ${s.v}`}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Period selector ── */}
      <motion.div {...fade(0.1)} className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {PERIODS.map(({ k, l }) => (
            <button key={k} onClick={() => setPeriod(k)}
              className={cn('px-3.5 py-1.5 rounded-lg text-[12px] font-bold transition-all whitespace-nowrap',
                period === k ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700')}
              style={period === k ? { background: cfg.color } : {}}>
              {l}
            </button>
          ))}
        </div>
        <p className="text-[12px] text-slate-400">{filtered.length} transactions · {periodLabel(period)}</p>
      </motion.div>

      {/* ── Period stats ── */}
      <motion.div {...fade(0.13)}>
        <div className="grid grid-cols-3 gap-4">
          {[
            { l: 'Received',     v: periodDeposited, c: '#16a34a', bg: '#f0fdf4', b: '#bbf7d0', icon: ArrowDownLeft },
            { l: 'Spent',        v: periodSpent,     c: '#dc2626', bg: '#fef2f2', b: '#fecaca', icon: ArrowUpRight  },
            { l: 'Net Balance',  v: periodNet,        c: periodNet >= 0 ? '#2563eb' : '#dc2626', bg: periodNet >= 0 ? '#eff6ff' : '#fef2f2', b: periodNet >= 0 ? '#bfdbfe' : '#fecaca', icon: periodNet >= 0 ? TrendingUp : TrendingDown },
          ].map((s) => (
            <div key={s.l} className="bg-white rounded-2xl border p-5" style={{ borderColor: s.b, boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: s.bg }}>
                <s.icon className="w-4 h-4" style={{ color: s.c }} />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: s.c + '99' }}>{s.l}</p>
              <p className="text-[22px] font-bold leading-tight mt-1" style={{ color: s.c }}>
                {s.v < 0 ? '−' : ''}AED {fmt(Math.abs(s.v))}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">{periodLabel(period)}</p>
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
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-400" /><span className="text-[11px] text-slate-500">Deposits</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-400" /><span className="text-[11px] text-slate-500">Expenses</span></div>
              </div>
            </div>
            <div className="space-y-3.5">
              {byMonth.map((m) => {
                const label   = new Date(m.key + '-01').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
                const dPct    = (m.deposited / maxMonthVal) * 100;
                const sPct    = (m.spent    / maxMonthVal) * 100;
                return (
                  <div key={m.key} className="flex items-center gap-4">
                    <span className="text-[11px] font-semibold text-slate-500 w-16 shrink-0">{label}</span>
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="h-2 bg-slate-100 rounded-full flex-1 overflow-hidden">
                          <div className="h-full bg-emerald-400 rounded-full transition-all duration-700" style={{ width: `${dPct}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-400 w-20 text-right tabular-nums">AED {fmt(m.deposited)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 bg-slate-100 rounded-full flex-1 overflow-hidden">
                          <div className="h-full bg-red-400 rounded-full transition-all duration-700" style={{ width: `${sPct}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-400 w-20 text-right tabular-nums">AED {fmt(m.spent)}</span>
                      </div>
                    </div>
                    <span className={cn('text-[11px] font-bold w-16 text-right shrink-0 tabular-nums',
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
          <div className="p-5 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-50">
            <div>
              <p className="text-[14px] font-bold text-slate-800">Transactions</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{filtered.length} records · {periodLabel(period)}</p>
            </div>
            <button
              onClick={() => downloadSingleWalletPDF({ walletLabel: cfg.label, walletColor: PDF_COLORS[type], wallet, transactions: filtered, byMonth, periodLabel: periodLabel(period), propertyName: property?.name, propertyType: property?.type })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition-colors">
              <Download className="w-3.5 h-3.5" /> Download PDF
            </button>
          </div>

          {filtered.length === 0 ? (
            <div className="py-14 text-center">
              <Wallet className="w-10 h-10 text-slate-200 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-slate-400 text-[13px]">No transactions for {periodLabel(period)}</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-50">
                {filtered.map((txn) => {
                  const isDepo = txn.type === 'deposit';
                  return (
                    <div key={txn.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                        isDepo ? 'bg-emerald-50' : 'bg-red-50')}>
                        {isDepo
                          ? <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                          : <ArrowUpRight  className="w-5 h-5 text-red-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-800 truncate">
                          {isDepo ? (txn.note || 'Deposit received') : (txn.description || 'Expense deducted')}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full',
                            isDepo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600')}>
                            {isDepo ? 'Deposit' : 'Expense'}
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
                <p className="text-[12px] text-slate-400">{filtered.length} transactions · {periodLabel(period)}</p>
                <div className="flex items-center gap-4">
                  <span className="text-[12px] text-emerald-600 font-bold">+AED {fmt(periodDeposited)}</span>
                  <span className="text-[12px] text-red-500 font-bold">−AED {fmt(periodSpent)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* ── Deposit Modal ── */}
      <Modal open={showDeposit} onClose={() => setShowDeposit(false)}
        title={`Deposit to ${cfg.label}`} subtitle="Receive funds and add to this wallet" size="sm">
        <form onSubmit={handleDeposit} className="space-y-4">
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
              placeholder="e.g. Monthly budget from Mr. Shah" className={INP} />
          </div>
          {form.amount && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl border" style={{ background: cfg.bg, borderColor: cfg.border }}>
              <ArrowDownLeft className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="flex-1">
                <p className="text-[11px]" style={{ color: cfg.color }}>New balance after deposit</p>
                <p className="text-[18px] font-bold text-emerald-700">
                  AED {fmt(balance + (Number(form.amount) || 0))}
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
