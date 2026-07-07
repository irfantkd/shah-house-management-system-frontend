import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import {
  Home, Car, Fuel, ShoppingCart, ChevronLeft, ChevronRight,
  Plus, Receipt, ArrowUpRight, Wrench, Wallet, AlertTriangle,
} from 'lucide-react';
import { selectExpenses, addExpense } from '../../store/slices/expensesSlice';
import { selectCarExpenses, selectFuelLogs, selectCars } from '../../store/slices/carsSlice';
import { selectVehicleWallet, selectHomeWallet, deductFromWallet, LOW_BALANCE_THRESHOLD } from '../../store/slices/walletSlice';
import { EXPENSE_CATEGORIES } from '../../data/mockExpenses';
import { CAR_EXPENSE_TYPES } from '../../data/mockCars';
import Modal  from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

const fade = (d = 0) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.32, delay: d, ease: [0.4, 0, 0.2, 1] } });

const SEG = {
  property:  { label: 'Property & Services', color: '#2563eb', bg: '#eff6ff', icon: Home,         border: '#bfdbfe' },
  vehicle:   { label: 'Fleet — Vehicle',      color: '#0b1d3a', bg: '#f0f5ff', icon: Wrench,       border: '#c7d7f5' },
  fuel:      { label: 'Fleet — Fuel',         color: '#d97706', bg: '#fffbeb', icon: Fuel,         border: '#fde68a' },
  household: { label: 'Household & Daily',    color: '#16a34a', bg: '#f0fdf4', icon: ShoppingCart, border: '#bbf7d0' },
};

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const catCfg      = (cat) => EXPENSE_CATEGORIES[cat] ?? { color: '#64748b', bg: '#f1f5f9', segment: 'property' };

const CUSTOM_KEY     = '__custom__';
const CUSTOM_CFG     = { color: '#64748b', bg: '#f1f5f9' };
const PROP_CAT_OPTS  = [...Object.entries(EXPENSE_CATEGORIES).filter(([,v]) => v.segment === 'property').map(([k]) => k),  CUSTOM_KEY];
const HOUSE_CAT_OPTS = [...Object.entries(EXPENSE_CATEGORIES).filter(([,v]) => v.segment === 'household').map(([k]) => k), CUSTOM_KEY];
const BLANK = { category: 'Cleaning', customCategory: '', description: '', amount: '', vendor: '', date: new Date().toISOString().split('T')[0], wallet: 'home' };

export default function ExpensesPage() {
  const dispatch    = useDispatch();
  const allExpenses = useSelector(selectExpenses);
  const carExpenses = useSelector(selectCarExpenses);
  const fuelLogs    = useSelector(selectFuelLogs);
  const cars        = useSelector(selectCars);
  const vehicleWallet = useSelector(selectVehicleWallet);
  const homeWallet    = useSelector(selectHomeWallet);

  const now = new Date();
  const [period,  setPeriod]  = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [filter,  setFilter]  = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [addSeg,  setAddSeg]  = useState('property');
  const [form,    setForm]    = useState(BLANK);

  const { year: selY, month: selM } = period;
  const inPeriod = (d) => { const dt = new Date(d); return dt.getFullYear() === selY && dt.getMonth() === selM; };
  const carName  = (id) => { const c = cars.find((x) => x.id === id); return c ? `${c.make} ${c.model}` : 'Vehicle'; };

  const prevMonth = () => setPeriod((p) => p.month === 0 ? { year: p.year - 1, month: 11 } : { ...p, month: p.month - 1 });
  const nextMonth = () => setPeriod((p) => p.month === 11 ? { year: p.year + 1, month: 0 }  : { ...p, month: p.month + 1 });
  const isCurrentMonth = selY === now.getFullYear() && selM === now.getMonth();

  // ── Build unified list ────────────────────────────────────────────
  const allItems = useMemo(() => {
    const propHouse = allExpenses
      .filter((e) => inPeriod(e.date))
      .map((e) => {
        const cfg = catCfg(e.category);
        return { id: e.id, date: e.date, amount: e.amount, segment: cfg.segment ?? 'property',
          category: e.category, description: e.description, source: e.vendor ?? e.company ?? '',
          color: cfg.color, bg: cfg.bg };
      });
    const vehicle = carExpenses
      .filter((e) => inPeriod(e.date))
      .map((e) => {
        const cfg = CAR_EXPENSE_TYPES[e.type] ?? { label: e.type, color: '#64748b', bg: '#f8fafc' };
        return { id: e.id, date: e.date, amount: e.amount, segment: 'vehicle',
          category: cfg.label, description: e.description, source: carName(e.carId),
          color: cfg.color, bg: cfg.bg };
      });
    const fuel = fuelLogs
      .filter((f) => inPeriod(f.date))
      .map((f) => ({
        id: f.id, date: f.date, amount: f.totalPrice, segment: 'fuel',
        category: 'Fuel', description: `${f.liters}L @ AED ${f.pricePerLiter}/L`,
        source: `${carName(f.carId)}${f.station ? ' · ' + f.station : ''}`,
        color: '#d97706', bg: '#fffbeb',
      }));
    return [...propHouse, ...vehicle, ...fuel].sort((a, b) => new Date(b.date) - new Date(a.date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allExpenses, carExpenses, fuelLogs, selY, selM]);

  const totals = useMemo(() => {
    const sum = (seg) => allItems.filter((i) => i.segment === seg).reduce((s, i) => s + i.amount, 0);
    const property = sum('property'), vehicle = sum('vehicle'), fuel = sum('fuel'), household = sum('household');
    return { property, vehicle, fuel, household, grand: property + vehicle + fuel + household };
  }, [allItems]);

  const catBreakdown = useMemo(() => {
    const map = {};
    allItems.forEach((i) => {
      if (!map[i.category]) map[i.category] = { category: i.category, amount: 0, color: i.color, bg: i.bg };
      map[i.category].amount += i.amount;
    });
    return Object.values(map)
      .sort((a, b) => b.amount - a.amount)
      .map((c) => ({ ...c, pct: totals.grand > 0 ? Math.round((c.amount / totals.grand) * 100) : 0 }));
  }, [allItems, totals.grand]);

  const barSegs = useMemo(() =>
    Object.entries(SEG)
      .map(([k, s]) => ({ ...s, key: k, amount: totals[k], pct: totals.grand > 0 ? (totals[k] / totals.grand) * 100 : 0 }))
      .filter((s) => s.amount > 0),
  [totals]);

  const visibleItems = filter === 'all' ? allItems : allItems.filter((i) => i.segment === filter);

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.description || !form.amount) return toast.error('Fill description and amount');
    if (form.category === CUSTOM_KEY && !form.customCategory.trim()) return toast.error('Enter a custom category name');
    const amt             = Number(form.amount);
    const selWallet       = form.wallet === 'vehicle' ? vehicleWallet : homeWallet;
    const effectiveCat    = form.category === CUSTOM_KEY ? form.customCategory.trim() : form.category;
    dispatch(addExpense({ ...form, category: effectiveCat, amount: amt }));
    dispatch(deductFromWallet({
      wallet:      form.wallet,
      amount:      amt,
      description: form.description,
      date:        form.date,
      category:    effectiveCat,
    }));
    const afterBal    = selWallet.balance - amt;
    const walletLabel = form.wallet === 'vehicle' ? 'Vehicle' : 'Home';
    if (afterBal < LOW_BALANCE_THRESHOLD)
      toast(`${walletLabel} wallet now AED ${Math.max(0, afterBal).toLocaleString('en-AE', { maximumFractionDigits: 0 })} — top up soon`, { icon: '⚠️' });
    else
      toast.success(`Expense logged & deducted from ${walletLabel} Wallet`);
    setShowAdd(false);
    setForm(BLANK);
  };
  const openAdd = (seg = 'property') => {
    setAddSeg(seg);
    setForm({ ...BLANK, category: seg === 'household' ? 'Groceries' : 'Cleaning', wallet: 'home' });
    setShowAdd(true);
  };

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <motion.div {...fade(0)} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #0b1d3a, #1e3a6e)' }}>
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Expenses & Spending</h1>
          </div>
          <p className="text-slate-500 text-[13px]">Property, fleet, household & daily — all in one view</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-xl px-1 py-1">
            <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
              <ChevronLeft className="w-4 h-4 text-slate-500" />
            </button>
            <span className="text-[13px] font-bold text-slate-800 min-w-[118px] text-center px-1">
              {MONTH_NAMES[selM]} {selY}
            </span>
            <button onClick={nextMonth} disabled={isCurrentMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-30">
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          <Button icon={Plus} onClick={() => openAdd('property')}>Log Expense</Button>
        </div>
      </motion.div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Grand total */}
        <motion.div {...fade(0.04)} className="col-span-2 lg:col-span-1">
          <div className="rounded-2xl p-5 h-full flex flex-col justify-between"
            style={{ background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)', boxShadow: '0 4px 20px rgba(11,29,58,0.3)' }}>
            <div>
              <Receipt className="w-6 h-6 text-blue-300 mb-2" />
              <p className="text-blue-200/60 text-[11px] font-bold uppercase tracking-wider">Total Spending</p>
            </div>
            <div>
              <p className="text-white font-bold text-2xl leading-tight mt-2">
                AED {totals.grand.toLocaleString('en-AE', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-blue-300/50 text-[11px] mt-1">{allItems.length} transactions · {MONTH_NAMES[selM]}</p>
            </div>
          </div>
        </motion.div>
        {/* Segment cards */}
        {Object.entries(SEG).map(([k, s], i) => (
          <motion.div key={k} {...fade(0.06 + i * 0.04)}>
            <button onClick={() => setFilter(filter === k ? 'all' : k)} className="w-full h-full text-left">
              <div className={cn('bg-white rounded-2xl p-4 border h-full flex flex-col justify-between transition-all duration-200 hover:shadow-md',
                filter === k ? 'ring-2' : '')}
                style={{ borderColor: filter === k ? s.color : s.border, boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
                  ...(filter === k ? { '--tw-ring-color': s.color } : {}) }}>
                <div className="flex items-start justify-between">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: s.bg }}>
                    <s.icon className="w-4 h-4" style={{ color: s.color }} />
                  </div>
                  {filter === k && <div className="w-2 h-2 rounded-full mt-1" style={{ background: s.color }} />}
                </div>
                <div className="mt-3">
                  <p className="text-[20px] font-bold text-slate-900 leading-none">
                    AED {totals[k].toLocaleString('en-AE', { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-400 mt-1 leading-tight">{s.label}</p>
                  <p className="text-[10px] text-slate-300 mt-0.5">
                    {totals.grand > 0 ? Math.round((totals[k] / totals.grand) * 100) : 0}% of total
                  </p>
                </div>
              </div>
            </button>
          </motion.div>
        ))}
      </div>

      {/* ── Breakdown ── */}
      {totals.grand > 0 && (
        <motion.div {...fade(0.16)}>
          <div className="bg-white rounded-2xl border border-slate-100 p-5" style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.05)' }}>
            <p className="text-[14px] font-bold text-slate-800 mb-4">Spending Breakdown — {MONTH_NAMES[selM]} {selY}</p>

            {/* Stacked bar */}
            <div className="flex rounded-full overflow-hidden h-3 mb-5">
              {barSegs.map((s, idx) => (
                <div key={s.key} style={{ width: `${s.pct}%`, background: s.color }}
                  title={`${s.label}: AED ${s.amount.toFixed(0)} (${Math.round(s.pct)}%)`}
                  className={cn('transition-all duration-500', idx === 0 && 'rounded-l-full', idx === barSegs.length - 1 && 'rounded-r-full')} />
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              {/* Segment bars */}
              <div className="space-y-3">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">By Segment</p>
                {barSegs.map((s) => (
                  <div key={s.key} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: s.bg }}>
                      <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-semibold text-slate-700 truncate">{s.label}</span>
                        <span className="text-[10px] text-slate-400 shrink-0 ml-2">{Math.round(s.pct)}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${s.pct}%`, background: s.color }} />
                      </div>
                    </div>
                    <span className="text-[13px] font-bold text-slate-800 shrink-0 w-20 text-right">
                      AED {s.amount.toLocaleString('en-AE', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                ))}
              </div>

              {/* Category list */}
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">By Category</p>
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                  {catBreakdown.map((c) => (
                    <div key={c.category} className="flex items-center gap-2.5 py-0.5">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                      <span className="text-[12px] text-slate-600 flex-1 truncate">{c.category}</span>
                      <span className="text-[10px] text-slate-400 w-8 text-right">{c.pct}%</span>
                      <span className="text-[12px] font-bold text-slate-700 w-18 text-right">
                        AED {c.amount.toLocaleString('en-AE', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Transaction List ── */}
      <motion.div {...fade(0.22)}>
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.05)' }}>
          {/* List header */}
          <div className="p-5 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-50">
            <div>
              <p className="text-[14px] font-bold text-slate-800">All Transactions</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{visibleItems.length} records · {MONTH_NAMES[selM]} {selY}</p>
            </div>
            <div className="flex gap-1 bg-slate-50 border border-slate-100 rounded-xl p-1">
              {[
                { k: 'all',       l: 'All'       },
                { k: 'property',  l: 'Property'  },
                { k: 'vehicle',   l: 'Vehicle'   },
                { k: 'fuel',      l: 'Fuel'      },
                { k: 'household', l: 'Household' },
              ].map(({ k, l }) => (
                <button key={k} onClick={() => setFilter(k)}
                  className={cn('px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap',
                    filter === k ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Quick add strip */}
          <div className="flex items-center gap-3 px-5 py-2.5 bg-slate-50/50 border-b border-slate-50">
            <span className="text-[11px] text-slate-400 font-medium">Log expense →</span>
            <button onClick={() => openAdd('property')}
              className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors">
              <Plus className="w-3 h-3" /> Property
            </button>
            <span className="text-slate-200">·</span>
            <button onClick={() => openAdd('household')}
              className="flex items-center gap-1 text-[11px] font-bold text-green-600 hover:text-green-800 transition-colors">
              <Plus className="w-3 h-3" /> Household
            </button>
            <span className="text-slate-200">·</span>
            <Link to="/cars" className="flex items-center gap-1 text-[11px] font-bold text-amber-600 hover:text-amber-800 transition-colors">
              <ArrowUpRight className="w-3 h-3" /> Fleet (log from Cars page)
            </Link>
          </div>

          {/* Rows */}
          {visibleItems.length === 0 ? (
            <div className="py-14 text-center">
              <Receipt className="w-10 h-10 text-slate-200 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-slate-400 text-[13px] font-medium">No {filter !== 'all' ? filter + ' ' : ''}expenses for {MONTH_NAMES[selM]} {selY}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50/70">
              {visibleItems.map((item) => {
                const segCfg = SEG[item.segment];
                const Icon   = segCfg?.icon ?? Receipt;
                return (
                  <div key={item.id}
                    className="flex items-center gap-3.5 px-5 py-3 hover:bg-slate-50/60 transition-colors">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: item.bg }}>
                      <Icon className="w-4 h-4" style={{ color: item.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-slate-800 leading-tight truncate">{item.description}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {item.source && <span className="text-[11px] text-slate-400">{item.source}</span>}
                        <span className="text-slate-200 text-[10px]">·</span>
                        <span className="text-[11px] text-slate-300">
                          {new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                    <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-xl text-[10px] font-bold shrink-0"
                      style={{ background: item.bg, color: item.color }}>
                      {item.category}
                    </span>
                    <p className="text-[14px] font-bold text-slate-900 shrink-0 ml-1 tabular-nums">
                      AED {item.amount.toLocaleString('en-AE', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {visibleItems.length > 0 && (
            <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
              <p className="text-[12px] text-slate-400">{visibleItems.length} records shown</p>
              <p className="text-[13px] font-bold text-slate-800">
                Total: AED {visibleItems.reduce((s, i) => s + i.amount, 0).toLocaleString('en-AE', { maximumFractionDigits: 0 })}
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Add Expense Modal ── */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)}
        title="Log Expense"
        subtitle="Property services, household & daily shopping"
        size="md">
        <form onSubmit={handleAdd} className="space-y-4">
          {/* Wallet selector */}
          <div>
            <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Deduct from Wallet</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { k: 'vehicle', label: 'Vehicle Wallet', icon: Car,  bal: vehicleWallet.balance, color: '#0b1d3a', bg: '#eef2fb' },
                { k: 'home',    label: 'Home Wallet',    icon: Home, bal: homeWallet.balance,    color: '#16a34a', bg: '#f0fdf4' },
              ].map(({ k, label, icon: Icon, bal, color, bg }) => (
                <button key={k} type="button" onClick={() => setF('wallet', k)}
                  className="flex flex-col gap-1.5 p-3 rounded-xl border-2 text-left transition-all"
                  style={form.wallet === k
                    ? { borderColor: color, background: bg }
                    : { borderColor: '#e2e8f0', background: '#f8fafc' }}>
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" style={{ color: form.wallet === k ? color : '#94a3b8' }} />
                    <span className="text-[11px] font-bold truncate" style={{ color: form.wallet === k ? color : '#64748b' }}>{label}</span>
                    {form.wallet === k && (
                      <span className="ml-auto shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-black"
                        style={{ background: color }}>✓</span>
                    )}
                  </div>
                  <p className="text-[15px] font-bold" style={{ color: form.wallet === k ? color : '#94a3b8' }}>
                    AED {bal.toLocaleString('en-AE', { maximumFractionDigits: 0 })}
                  </p>
                </button>
              ))}
            </div>
          </div>
          {/* Selected wallet balance + after preview */}
          {(() => {
            const selW  = form.wallet === 'vehicle' ? vehicleWallet : homeWallet;
            const wLbl  = form.wallet === 'vehicle' ? 'Vehicle Wallet' : 'Home Wallet';
            const bal   = selW.balance;
            const cost  = Number(form.amount) || 0;
            const after = bal - cost;
            const low   = bal < LOW_BALANCE_THRESHOLD;
            const empty = bal <= 0;
            return (
              <div className={cn('flex items-center gap-3 p-3 rounded-xl border',
                empty ? 'bg-red-50 border-red-200' : low ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100')}>
                <Wallet className={cn('w-4 h-4 shrink-0', empty ? 'text-red-500' : low ? 'text-amber-600' : 'text-slate-400')} />
                <div className="flex-1">
                  <p className="text-[11px] text-slate-400">{wLbl} — deducted on submit</p>
                  <p className={cn('text-[15px] font-bold', empty ? 'text-red-600' : low ? 'text-amber-700' : 'text-slate-800')}>
                    AED {bal.toLocaleString('en-AE', { maximumFractionDigits: 0 })}
                  </p>
                </div>
                {cost > 0 && (
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-slate-400">After</p>
                    <p className={cn('text-[13px] font-bold', after < 0 ? 'text-red-600' : after < LOW_BALANCE_THRESHOLD ? 'text-amber-600' : 'text-emerald-600')}>
                      AED {Math.max(0, after).toLocaleString('en-AE', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                )}
                {(empty || low) && (
                  <Link to="/wallet" className={cn('shrink-0 text-[11px] font-bold px-2.5 py-1.5 rounded-lg', empty ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>
                    {empty ? 'Deposit' : 'Top Up'}
                  </Link>
                )}
              </div>
            );
          })()}
          {/* Segment toggle */}
          <div className="flex gap-2">
            {[
              { k: 'property',  l: 'Property & Services', icon: Home,         c: '#2563eb' },
              { k: 'household', l: 'Household & Daily',   icon: ShoppingCart, c: '#16a34a' },
            ].map(({ k, l, icon: Icon, c }) => (
              <button key={k} type="button"
                onClick={() => { setAddSeg(k); setF('category', k === 'household' ? 'Groceries' : 'Cleaning'); }}
                className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-[12px] font-bold transition-all')}
                style={addSeg === k
                  ? { borderColor: c, background: c, color: '#fff' }
                  : { borderColor: '#e2e8f0', background: '#f8fafc', color: '#64748b' }}>
                <Icon className="w-3.5 h-3.5" />{l}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Category</label>
              <select value={form.category} onChange={(e) => { setF('category', e.target.value); setF('customCategory', ''); }} className={INP}>
                {(addSeg === 'household' ? HOUSE_CAT_OPTS : PROP_CAT_OPTS).map((c) => (
                  <option key={c} value={c}>{c === CUSTOM_KEY ? '✏️ Custom…' : c}</option>
                ))}
              </select>
            </div>
            {form.category === CUSTOM_KEY && (
              <div className="col-span-2">
                <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Custom Category Name *</label>
                <input
                  value={form.customCategory}
                  onChange={(e) => setF('customCategory', e.target.value)}
                  required
                  placeholder="e.g. Internet Bill, Water Bill, Satellite TV…"
                  className={INP}
                  autoFocus
                />
              </div>
            )}
            <div className="col-span-2">
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Description *</label>
              <input value={form.description} onChange={(e) => setF('description', e.target.value)} required
                placeholder={addSeg === 'household' ? 'e.g. Weekly grocery shop' : 'e.g. Monthly pool service'}
                className={INP} />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Amount (AED) *</label>
              <input value={form.amount} onChange={(e) => setF('amount', e.target.value)}
                type="number" min="0" step="0.01" required placeholder="0.00" className={INP} />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Date</label>
              <input value={form.date} onChange={(e) => setF('date', e.target.value)} type="date" className={INP} />
            </div>
            <div className="col-span-2">
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Vendor / Company</label>
              <input value={form.vendor} onChange={(e) => setF('vendor', e.target.value)}
                placeholder={addSeg === 'household' ? 'e.g. Lulu Hypermarket, Carrefour' : 'e.g. Clean Masters'}
                className={INP} />
            </div>
          </div>
          {/* Amount preview chip */}
          {form.amount && form.category && (() => {
            const isCustom  = form.category === CUSTOM_KEY;
            const cfg       = isCustom ? CUSTOM_CFG : (EXPENSE_CATEGORIES[form.category] ?? CUSTOM_CFG);
            const catLabel  = isCustom ? (form.customCategory.trim() || 'Custom') : form.category;
            return (
              <div className="flex items-center gap-2.5 p-3 rounded-xl" style={{ background: cfg.bg }}>
                <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                <span className="text-[12px] font-bold" style={{ color: cfg.color }}>{catLabel}</span>
                <span className="ml-auto text-[16px] font-bold" style={{ color: cfg.color }}>
                  AED {Number(form.amount).toLocaleString('en-AE', { maximumFractionDigits: 0 })}
                </span>
              </div>
            );
          })()}
          <div className="flex justify-end gap-2.5 pt-1 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" icon={Plus}>Log Expense</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

const INP = 'w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] text-slate-700 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500';
