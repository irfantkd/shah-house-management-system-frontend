import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Wallet, Car, Home, Banknote, Plus, ArrowDownLeft, ArrowUpRight,
  Receipt, FileText, Users, Search, X, CreditCard, Trash2, Edit2,
  TrendingDown, TrendingUp, Fuel, Wrench, CheckCircle2,
} from 'lucide-react';
import { useGetQuery, usePostMutation, useDeleteMutation, usePutMutation } from '../../api/apiSlice';
import DatePicker from '../../components/ui/DatePicker';
import { selectCurrentPropertyId, selectCurrentProperty } from '../../store/slices/propertiesSlice';
import { EXPENSE_CATEGORIES } from '../../data/mockExpenses';
import Modal      from '../../components/ui/Modal';
import Button     from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

// ─── Shared helpers ─────────────────────────────────────────────────────────

const fmt     = (n) => Number(n).toLocaleString('en-AE', { maximumFractionDigits: 0 });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const WALLET_CFG = {
  vehicle: { label: 'Vehicle Wallet', short: 'Vehicle', icon: Car,      color: '#0b1d3a', bg: '#eff4ff', border: '#c7d7f5', grad: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' },
  home:    { label: 'Home Wallet',    short: 'Home',    icon: Home,     color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', grad: 'linear-gradient(135deg,#14532d,#16a34a)' },
  salary:  { label: 'Salary Wallet',  short: 'Salary',  icon: Banknote,  color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', grad: 'linear-gradient(135deg,#4c1d95,#7c3aed)' },
};

const TABS = [
  { id: 'money',     label: 'All Money',      icon: Wallet   },
  { id: 'expenses',  label: 'House Expenses', icon: Receipt  },
  { id: 'contracts', label: 'Contracts',      icon: FileText },
  { id: 'salaries',  label: 'Salaries',       icon: Users    },
];

const PERIODS = [
  { k: 'week',   l: 'This Week'  },
  { k: 'month',  l: 'This Month' },
  { k: '3month', l: '3 Months'   },
  { k: 'year',   l: 'This Year'  },
  { k: 'all',    l: 'All Time'   },
];

const EXP_CATS = Object.keys(EXPENSE_CATEGORIES);

const INPUT  = 'w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] text-slate-700 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors';
const LABEL  = 'block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5';

const BLANK_DEP = { wallet: 'vehicle', amount: '', note: '', date: new Date().toISOString().split('T')[0] };
const BLANK_EXP = { category: 'Cleaning', description: '', amount: '', vendor: '', date: new Date().toISOString().split('T')[0], wallet: 'home', notes: '' };

// ─── Period filter ────────────────────────────────────────────────────────────

function applyPeriod(items, period, key = 'date') {
  if (period === 'all') return items;
  const cut = new Date();
  if (period === 'week')   cut.setDate(cut.getDate() - 7);
  if (period === 'month')  { cut.setDate(1); cut.setHours(0,0,0,0); }
  if (period === '3month') cut.setMonth(cut.getMonth() - 3);
  if (period === 'year')   { cut.setMonth(0); cut.setDate(1); cut.setHours(0,0,0,0); }
  return items.filter((i) => new Date(i[key]) >= cut);
}

function groupByMonth(items, key = 'date') {
  const map = {};
  items.forEach((item) => {
    const d     = new Date(item[key]);
    const gKey  = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const label = d.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
    if (!map[gKey]) map[gKey] = { key: gKey, label, items: [] };
    map[gKey].items.push(item);
  });
  return Object.values(map).sort((a, b) => b.key.localeCompare(a.key));
}

// ─── Period pill bar ─────────────────────────────────────────────────────────

function PeriodBar({ value, onChange }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {PERIODS.map((p) => (
        <button key={p.k} onClick={() => onChange(p.k)}
          className={cn('px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all',
            value === p.k
              ? 'text-white'
              : 'bg-slate-50 text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-700')}
          style={value === p.k ? { background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' } : {}}>
          {p.l}
        </button>
      ))}
    </div>
  );
}

// ─── Stat chip row ─────────────────────────────────────────────────────────

function StatRow({ stats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="bg-white rounded-2xl border border-slate-100 px-4 py-3.5" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{s.label}</p>
          <p className="text-[18px] font-black leading-none tabular-nums" style={{ color: s.color ?? '#0b1d3a' }}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Month group header ───────────────────────────────────────────────────────

function MonthHeader({ label, inTotal, outTotal }) {
  return (
    <div className="flex items-center justify-between mb-2 px-0.5">
      <p className="text-[13px] font-bold text-slate-700">{label}</p>
      <div className="flex items-center gap-3 text-[11px] font-bold">
        {inTotal  > 0 && <span className="text-emerald-600">+AED {fmt(inTotal)}</span>}
        {outTotal > 0 && <span className="text-red-500">−AED {fmt(outTotal)}</span>}
      </div>
    </div>
  );
}

// ─── Card shell ────────────────────────────────────────────────────────────

function ListCard({ children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50 overflow-hidden" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
      {children}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// TAB 1 — All Money (merged wallet feed)
// ──────────────────────────────────────────────────────────────────────────────

function AllMoneyTab({ transactions }) {
  const [period,   setPeriod]   = useState('month');
  const [walletF,  setWalletF]  = useState('all');
  const [typeF,    setTypeF]    = useState('all');
  const [search,   setSearch]   = useState('');

  const allTxns = useMemo(() =>
    [...transactions].sort((a, b) => {
      const diff = new Date(b.date) - new Date(a.date);
      return diff !== 0 ? diff : String(b.id ?? '').localeCompare(String(a.id ?? ''));
    }),
  [transactions]);

  const filtered = useMemo(() => {
    let list = applyPeriod(allTxns, period);
    if (walletF !== 'all') list = list.filter((t) => t.walletType === walletF);
    if (typeF === 'in')    list = list.filter((t) => t.type === 'credit');
    if (typeF === 'out')   list = list.filter((t) => t.type === 'debit');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => (t.description ?? '').toLowerCase().includes(q) || (t.category ?? '').toLowerCase().includes(q));
    }
    return list;
  }, [allTxns, period, walletF, typeF, search]);

  const isIn     = (t) => t.type === 'credit';
  const totalIn  = filtered.filter(isIn).reduce((s, t) => s + t.amount, 0);
  const totalOut = filtered.filter((t) => !isIn(t)).reduce((s, t) => s + t.amount, 0);

  const groups = useMemo(() => groupByMonth(filtered), [filtered]);

  return (
    <div className="space-y-4">
      <StatRow stats={[
        { label: 'Money In',     value: `AED ${fmt(totalIn)}`,           color: '#16a34a' },
        { label: 'Money Out',    value: `AED ${fmt(totalOut)}`,          color: '#dc2626' },
        { label: 'Net',          value: `AED ${fmt(totalIn - totalOut)}`, color: totalIn >= totalOut ? '#16a34a' : '#dc2626' },
        { label: 'Transactions', value: filtered.length,                 color: '#0b1d3a' },
      ]} />

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        <PeriodBar value={period} onChange={setPeriod} />
        <div className="flex flex-wrap gap-2 items-center">
          {/* Wallet filter */}
          <div className="flex bg-slate-50 border border-slate-100 rounded-xl p-1 gap-0.5">
            {['all','vehicle','home','salary'].map((k) => (
              <button key={k} onClick={() => setWalletF(k)}
                className={cn('px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-all',
                  walletF === k ? 'text-white' : 'text-slate-500 hover:text-slate-700')}
                style={walletF === k ? { background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' } : {}}>
                {k === 'all' ? 'All Wallets' : WALLET_CFG[k].short}
              </button>
            ))}
          </div>
          {/* Type filter */}
          <div className="flex bg-slate-50 border border-slate-100 rounded-xl p-1 gap-0.5">
            {[['all','All'],['in','In ↓'],['out','Out ↑']].map(([k,l]) => (
              <button key={k} onClick={() => setTypeF(k)}
                className={cn('px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all',
                  typeF === k ? 'text-white' : 'text-slate-500 hover:text-slate-700')}
                style={typeF === k ? { background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' } : {}}>
                {l}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transactions…"
              className="w-full h-[34px] pl-8 pr-7 rounded-xl border border-slate-200 text-[12px] text-slate-700 placeholder:text-slate-300 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Transaction list */}
      {groups.length === 0
        ? <EmptyState icon={Wallet} title="No transactions found" description="Adjust your filters, or use the Deposit button to add funds." />
        : (
          <div className="space-y-4">
            {groups.map((group) => {
              const gIn  = group.items.filter(isIn).reduce((s, t) => s + t.amount, 0);
              const gOut = group.items.filter((t) => !isIn(t)).reduce((s, t) => s + t.amount, 0);
              return (
                <div key={group.key}>
                  <MonthHeader label={group.label} inTotal={gIn} outTotal={gOut} />
                  <ListCard>
                    {group.items.map((txn) => {
                      const wCfg  = WALLET_CFG[txn.walletType] ?? WALLET_CFG.vehicle;
                      const txnIn = isIn(txn);
                      const WIcon = wCfg.icon;
                      return (
                        <div key={txn.id ?? txn._id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/60 transition-colors">
                          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', txnIn ? 'bg-emerald-50' : 'bg-red-50')}>
                            {txnIn
                              ? <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                              : <ArrowUpRight  className="w-4 h-4 text-red-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-slate-800 truncate leading-tight">
                              {txnIn ? (txn.note || txn.description || 'Deposit') : (txn.description || 'Expense')}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                style={{ background: wCfg.bg, color: wCfg.color }}>
                                <WIcon className="w-2.5 h-2.5" />
                                {wCfg.short}
                              </span>
                              {txn.category && txn.category !== 'Deposit' && (
                                <span className="text-[10px] text-slate-400">{txn.category}</span>
                              )}
                              <span className="text-slate-200">·</span>
                              <span className="text-[10px] text-slate-400">{fmtDate(txn.date)}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={cn('text-[15px] font-black tabular-nums', txnIn ? 'text-emerald-600' : 'text-red-500')}>
                              {txnIn ? '+' : '−'}AED {fmt(txn.amount)}
                            </p>
                            {txn.balanceAfter !== undefined && (
                              <p className="text-[10px] text-slate-400 mt-0.5">Bal AED {fmt(txn.balanceAfter)}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </ListCard>
                </div>
              );
            })}
          </div>
        )
      }
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// TAB 2 — House Expenses
// ──────────────────────────────────────────────────────────────────────────────

function HouseExpensesTab({ expenses, walletData, propertyId, refetchWallet, openAddModal, onCloseAddModal }) {
  const EMPTY_W   = { balance: 0 };
  const vWallet   = { ...EMPTY_W, ...walletData?.vehicle };
  const hWallet   = { ...EMPTY_W, ...walletData?.home    };

  const [addMut]    = usePostMutation();
  const [putMut]    = usePutMutation();
  const [deleteMut] = useDeleteMutation();

  const [period,  setPeriod]  = useState('month');
  const [catF,    setCatF]    = useState('all');
  const [search,  setSearch]  = useState('');
  const [deductMut] = usePostMutation();

  // Add expense modal — can be triggered externally via openAddModal prop
  const [showAdd,  setShowAdd]  = useState(false);
  useEffect(() => { if (openAddModal) setShowAdd(true); }, [openAddModal]);
  const [addForm,  setAddForm]  = useState(BLANK_EXP);
  const setA = (k, v) => setAddForm((f) => ({ ...f, [k]: v }));

  // Edit modal
  const [editId,   setEditId]   = useState(null);
  const [editForm, setEditForm] = useState(BLANK_EXP);
  const setE = (k, v) => setEditForm((f) => ({ ...f, [k]: v }));

  // Delete confirm
  const [delId, setDelId] = useState(null);

  const sorted = useMemo(() =>
    [...(expenses ?? [])].sort((a, b) => new Date(b.date) - new Date(a.date))
  , [expenses]);

  const filtered = useMemo(() => {
    let list = applyPeriod(sorted, period);
    if (catF !== 'all')   list = list.filter((e) => e.category === catF);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) => (e.description ?? '').toLowerCase().includes(q) || (e.vendor ?? '').toLowerCase().includes(q));
    }
    return list;
  }, [sorted, period, catF, search]);

  const totalSpent   = filtered.reduce((s, e) => s + (e.amount ?? 0), 0);
  const groups       = useMemo(() => groupByMonth(filtered), [filtered]);

  const openEdit = (exp) => {
    setEditId(exp.id ?? exp._id);
    setEditForm({ category: exp.category, description: exp.description, amount: String(exp.amount), vendor: exp.vendor ?? '', date: exp.date, wallet: 'home', notes: exp.notes ?? '' });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const amt = Number(addForm.amount);
    if (!addForm.description || !amt) return toast.error('Fill all required fields');
    try {
      await Promise.all([
        addMut({ path: '/expenses', body: { propertyId, date: addForm.date, category: addForm.category, description: addForm.description, vendor: addForm.vendor, amount: amt, notes: addForm.notes } }).unwrap(),
        deductMut({ path: '/wallet/deduct', body: { propertyId, walletType: addForm.wallet, amount: amt, description: addForm.description, date: addForm.date, category: addForm.category } }).unwrap(),
      ]);
      await refetchWallet();
      toast.success(`AED ${fmt(amt)} expense logged`);
      setShowAdd(false); onCloseAddModal?.(); setAddForm(BLANK_EXP);
    } catch (err) { toast.error(err?.data?.error || 'Failed to log expense'); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    const amt = Number(editForm.amount);
    if (!editForm.description || !amt) return toast.error('Fill all required fields');
    try {
      await putMut({ path: `/expenses/${editId}`, body: { date: editForm.date, category: editForm.category, description: editForm.description, vendor: editForm.vendor, amount: amt, notes: editForm.notes } }).unwrap();
      toast.success('Expense updated');
      setEditId(null);
    } catch (err) { toast.error(err?.data?.error || 'Failed to update expense'); }
  };

  const handleDelete = async () => {
    if (!delId) return;
    try {
      await deleteMut({ path: `/expenses/${delId}` }).unwrap();
      toast.success('Expense removed');
      setDelId(null);
    } catch (err) { toast.error(err?.data?.error || 'Failed to delete'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <StatRow stats={[
          { label: 'Total Spent', value: `AED ${fmt(totalSpent)}`,   color: '#dc2626' },
          { label: 'Records',     value: filtered.length,            color: '#0b1d3a' },
        ]} />
        <button onClick={() => setShowAdd(true)}
          className="shrink-0 ml-4 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white text-[12px] font-bold hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' }}>
          <Plus className="w-4 h-4" /> Add Expense
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        <PeriodBar value={period} onChange={setPeriod} />
        <div className="flex flex-wrap gap-2 items-center">
          <select value={catF} onChange={(e) => setCatF(e.target.value)}
            className="h-[34px] pl-3 pr-7 rounded-xl border border-slate-200 text-[12px] text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 cursor-pointer appearance-none">
            <option value="all">All Categories</option>
            {EXP_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search expenses…"
              className="w-full h-[34px] pl-8 pr-7 rounded-xl border border-slate-200 text-[12px] text-slate-700 placeholder:text-slate-300 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors" />
            {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><X className="w-3.5 h-3.5" /></button>}
          </div>
        </div>
      </div>

      {/* List */}
      {groups.length === 0
        ? <EmptyState icon={Receipt} title="No expenses found" description="Add an expense or adjust your filters." />
        : (
          <div className="space-y-4">
            {groups.map((group) => {
              const gTotal = group.items.reduce((s, e) => s + e.amount, 0);
              return (
                <div key={group.key}>
                  <div className="flex items-center justify-between mb-2 px-0.5">
                    <p className="text-[13px] font-bold text-slate-700">{group.label}</p>
                    <span className="text-[11px] font-bold text-red-500">−AED {fmt(gTotal)}</span>
                  </div>
                  <ListCard>
                    {group.items.map((exp) => {
                      const catCfg = EXPENSE_CATEGORIES[exp.category] ?? { color: '#64748b', bg: '#f8fafc' };
                      return (
                        <div key={exp.id ?? exp._id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/60 transition-colors group">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: catCfg.bg }}>
                            <Receipt className="w-4 h-4" style={{ color: catCfg.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-slate-800 truncate leading-tight">{exp.description}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: catCfg.bg, color: catCfg.color }}>{exp.category}</span>
                              {exp.vendor && <span className="text-[10px] text-slate-400">@ {exp.vendor}</span>}
                              <span className="text-slate-200">·</span>
                              <span className="text-[10px] text-slate-400">{fmtDate(exp.date)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <p className="text-[15px] font-black text-red-500 tabular-nums">−AED {fmt(exp.amount)}</p>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                              <button onClick={() => openEdit(exp)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors">
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button onClick={() => setDelId(exp.id ?? exp._id)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </ListCard>
                </div>
              );
            })}
          </div>
        )
      }

      {/* Add Expense Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Log House Expense" subtitle="Records the expense and deducts from wallet" size="md">
        <form onSubmit={handleAdd} className="space-y-4">
          {/* Wallet selector */}
          <div>
            <label className={LABEL}>Deduct from Wallet</label>
            <div className="grid grid-cols-2 gap-2">
              {['home', 'vehicle'].map((k) => {
                const cfg  = WALLET_CFG[k];
                const w    = k === 'home' ? hWallet : vWallet;
                const Icon = cfg.icon;
                const sel  = addForm.wallet === k;
                return (
                  <button key={k} type="button" onClick={() => setA('wallet', k)}
                    className="flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all"
                    style={{ borderColor: sel ? cfg.color : '#e2e8f0', background: sel ? cfg.bg : '#f8fafc' }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: sel ? cfg.color : '#e2e8f0' }}>
                      <Icon className="w-4 h-4" style={{ color: sel ? '#fff' : '#64748b' }} />
                    </div>
                    <div>
                      <p className="text-[12px] font-bold" style={{ color: sel ? cfg.color : '#475569' }}>{cfg.label}</p>
                      <p className="text-[11px]" style={{ color: sel ? cfg.color : '#94a3b8' }}>AED {fmt(w.balance ?? 0)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Category *</label>
              <select value={addForm.category} onChange={(e) => setA('category', e.target.value)}
                className={INPUT + ' cursor-pointer appearance-none'}>
                {EXP_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Date *</label>
              <DatePicker value={addForm.date} onChange={(v) => setA('date', v)} className={INPUT} />
            </div>
          </div>
          <div>
            <label className={LABEL}>Description *</label>
            <input value={addForm.description} onChange={(e) => setA('description', e.target.value)} required placeholder="e.g. Monthly pool cleaning" className={INPUT} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Amount (AED) *</label>
              <input type="number" min="1" step="0.01" value={addForm.amount} onChange={(e) => setA('amount', e.target.value)} required placeholder="0" className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Vendor / Supplier</label>
              <input value={addForm.vendor} onChange={(e) => setA('vendor', e.target.value)} placeholder="e.g. AquaBlue Pool Co." className={INPUT} />
            </div>
          </div>
          {Number(addForm.amount) > 0 && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
              <TrendingDown className="w-4 h-4 text-red-500 shrink-0" />
              <div className="flex-1">
                <p className="text-[11px] text-red-500">From {WALLET_CFG[addForm.wallet].label}</p>
                <p className="text-[18px] font-black text-red-600">−AED {fmt(Number(addForm.amount))}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400">New balance</p>
                <p className="text-[13px] font-bold text-red-600">
                  AED {fmt(((addForm.wallet === 'home' ? hWallet : vWallet).balance ?? 0) - Number(addForm.amount || 0))}
                </p>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2.5 pt-1 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => { setShowAdd(false); onCloseAddModal?.(); }}>Cancel</Button>
            <Button type="submit" icon={Plus}>Log Expense</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editId} onClose={() => setEditId(null)} title="Edit Expense" size="md">
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Category *</label>
              <select value={editForm.category} onChange={(e) => setE('category', e.target.value)} className={INPUT + ' cursor-pointer appearance-none'}>
                {EXP_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Date *</label>
              <DatePicker value={editForm.date} onChange={(v) => setE('date', v)} className={INPUT} />
            </div>
          </div>
          <div>
            <label className={LABEL}>Description *</label>
            <input value={editForm.description} onChange={(e) => setE('description', e.target.value)} required className={INPUT} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Amount (AED) *</label>
              <input type="number" min="1" step="0.01" value={editForm.amount} onChange={(e) => setE('amount', e.target.value)} required className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Vendor</label>
              <input value={editForm.vendor} onChange={(e) => setE('vendor', e.target.value)} className={INPUT} />
            </div>
          </div>
          <div className="flex justify-end gap-2.5 pt-1 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setEditId(null)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!delId} onClose={() => setDelId(null)} title="Delete Expense?" size="xs">
        <p className="text-[13px] text-slate-600 mb-5">This will permanently remove the expense record. This does not reverse the wallet deduction.</p>
        <div className="flex justify-end gap-2.5">
          <Button variant="outline" type="button" onClick={() => setDelId(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} icon={Trash2}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// TAB 3 — Contracts
// ──────────────────────────────────────────────────────────────────────────────

function ContractsTab({ contracts }) {
  const [period, setPeriod] = useState('all');
  const [search, setSearch] = useState('');

  const allPayments = useMemo(() => {
    return contracts.flatMap((c) =>
      (c.paymentHistory ?? []).map((p, i) => ({
        ...p,
        _rowId:           `${c._id ?? c.id}-${i}`,
        contractTitle:    c.title ?? c.name ?? 'Contract',
        contractCategory: c.category ?? '',
        contractId:       c._id ?? c.id,
      }))
    ).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [contracts]);

  const filtered = useMemo(() => {
    let list = applyPeriod(allPayments, period);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.contractTitle.toLowerCase().includes(q) || (p.note ?? '').toLowerCase().includes(q));
    }
    return list;
  }, [allPayments, period, search]);

  const totalPaid = filtered.reduce((s, p) => s + (p.amount ?? 0), 0);
  const groups    = useMemo(() => groupByMonth(filtered), [filtered]);

  return (
    <div className="space-y-4">
      <StatRow stats={[
        { label: 'Total Paid', value: `AED ${fmt(totalPaid)}`, color: '#dc2626' },
        { label: 'Payments',   value: filtered.length,         color: '#0b1d3a' },
        { label: 'Contracts',  value: contracts.length,        color: '#7c3aed' },
      ]} />

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        <PeriodBar value={period} onChange={setPeriod} />
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contracts…"
            className="w-full h-[34px] pl-8 pr-7 rounded-xl border border-slate-200 text-[12px] text-slate-700 placeholder:text-slate-300 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors" />
          {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><X className="w-3.5 h-3.5" /></button>}
        </div>
      </div>

      {groups.length === 0
        ? <EmptyState icon={FileText} title="No contract payments found" description="Record a contract payment from the Contracts page." />
        : (
          <div className="space-y-4">
            {groups.map((group) => {
              const gTotal = group.items.reduce((s, p) => s + (p.amount ?? 0), 0);
              return (
                <div key={group.key}>
                  <div className="flex items-center justify-between mb-2 px-0.5">
                    <p className="text-[13px] font-bold text-slate-700">{group.label}</p>
                    <span className="text-[11px] font-bold text-red-500">−AED {fmt(gTotal)}</span>
                  </div>
                  <ListCard>
                    {group.items.map((p) => (
                      <div key={p._rowId} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/60 transition-colors">
                        <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-violet-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-slate-800 truncate leading-tight">{p.contractTitle}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {p.contractCategory && (
                              <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600">{p.contractCategory}</span>
                            )}
                            {p.walletType && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                style={{ background: WALLET_CFG[p.walletType]?.bg ?? '#f8fafc', color: WALLET_CFG[p.walletType]?.color ?? '#475569' }}>
                                {WALLET_CFG[p.walletType]?.short ?? p.walletType}
                              </span>
                            )}
                            {p.note && <span className="text-[10px] text-slate-400 truncate max-w-[140px]">{p.note}</span>}
                            <span className="text-slate-200">·</span>
                            <span className="text-[10px] text-slate-400">{fmtDate(p.date)}</span>
                          </div>
                        </div>
                        <p className="text-[15px] font-black text-red-500 tabular-nums shrink-0">−AED {fmt(p.amount)}</p>
                      </div>
                    ))}
                  </ListCard>
                </div>
              );
            })}
          </div>
        )
      }

      {/* Per-contract summary */}
      {contracts.length > 0 && (
        <div>
          <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-3">Per-Contract Summary</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {contracts.map((c) => {
              const paid = (c.paymentHistory ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);
              return (
                <Link key={c._id ?? c.id} to={`/contracts/${c._id ?? c.id}`}
                  className="bg-white rounded-2xl border border-slate-100 p-4 hover:border-slate-200 hover:shadow-sm transition-all group"
                  style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-[13px] font-bold text-slate-800 truncate group-hover:text-blue-700 transition-colors">{c.title ?? c.name}</p>
                    {c.status && (
                      <span className={cn('shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold',
                        c.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                        {c.status}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-slate-400">{(c.paymentHistory ?? []).length} payments</span>
                    <span className="font-bold text-slate-700">AED {fmt(paid)} paid</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// TAB 4 — Salaries
// ──────────────────────────────────────────────────────────────────────────────

function SalariesTab({ employees }) {
  const [period, setPeriod] = useState('month');
  const [search, setSearch] = useState('');

  const allPayments = useMemo(() => {
    return employees.flatMap((emp) =>
      (emp.salaryHistory ?? []).map((s, i) => ({
        ...s,
        _rowId:       `${emp._id ?? emp.id}-${i}`,
        employeeName: emp.name ?? 'Employee',
        employeeRole: emp.role ?? emp.position ?? '',
        paidOnKey:    s.paidOn ?? s.date ?? '',
      }))
    ).sort((a, b) => new Date(b.paidOnKey) - new Date(a.paidOnKey));
  }, [employees]);

  const filtered = useMemo(() => {
    let list = applyPeriod(allPayments, period, 'paidOnKey');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.employeeName.toLowerCase().includes(q) || (s.employeeRole ?? '').toLowerCase().includes(q));
    }
    return list;
  }, [allPayments, period, search]);

  const totalPaid  = filtered.reduce((s, p) => s + (p.amount ?? 0), 0);
  const groups     = useMemo(() => groupByMonth(filtered, 'paidOnKey'), [filtered]);

  return (
    <div className="space-y-4">
      <StatRow stats={[
        { label: 'Total Paid',  value: `AED ${fmt(totalPaid)}`, color: '#7c3aed' },
        { label: 'Payments',    value: filtered.length,         color: '#0b1d3a' },
        { label: 'Employees',   value: employees.length,        color: '#0b1d3a' },
      ]} />

      <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        <PeriodBar value={period} onChange={setPeriod} />
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employees…"
            className="w-full h-[34px] pl-8 pr-7 rounded-xl border border-slate-200 text-[12px] text-slate-700 placeholder:text-slate-300 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors" />
          {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><X className="w-3.5 h-3.5" /></button>}
        </div>
      </div>

      {groups.length === 0
        ? <EmptyState icon={Users} title="No salary payments found" description="Pay an employee from the Employees page to see records here." />
        : (
          <div className="space-y-4">
            {groups.map((group) => {
              const gTotal = group.items.reduce((s, p) => s + (p.amount ?? 0), 0);
              return (
                <div key={group.key}>
                  <div className="flex items-center justify-between mb-2 px-0.5">
                    <p className="text-[13px] font-bold text-slate-700">{group.label}</p>
                    <span className="text-[11px] font-bold text-violet-600">−AED {fmt(gTotal)}</span>
                  </div>
                  <ListCard>
                    {group.items.map((s) => {
                      const isBonus    = s.type === 'bonus';
                      const isDeduction = s.type === 'deduction';
                      return (
                        <div key={s._rowId} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/60 transition-colors">
                          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', isBonus ? 'bg-emerald-50' : isDeduction ? 'bg-red-50' : 'bg-violet-50')}>
                            <Users className={cn('w-4 h-4', isBonus ? 'text-emerald-600' : isDeduction ? 'text-red-500' : 'text-violet-600')} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-slate-800 truncate leading-tight">{s.employeeName}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              {s.employeeRole && <span className="text-[10px] text-slate-400">{s.employeeRole}</span>}
                              <span className={cn('inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize',
                                isBonus ? 'bg-emerald-50 text-emerald-700' : isDeduction ? 'bg-red-50 text-red-600' : 'bg-violet-50 text-violet-700')}>
                                {s.type ?? 'salary'}
                              </span>
                              {s.month && <span className="text-[10px] text-slate-400">{s.month}</span>}
                              {s.wallet && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                  style={{ background: WALLET_CFG[s.wallet]?.bg ?? '#f8fafc', color: WALLET_CFG[s.wallet]?.color ?? '#475569' }}>
                                  {WALLET_CFG[s.wallet]?.short ?? s.wallet}
                                </span>
                              )}
                              <span className="text-slate-200">·</span>
                              <span className="text-[10px] text-slate-400">{fmtDate(s.paidOnKey)}</span>
                            </div>
                          </div>
                          <p className={cn('text-[15px] font-black tabular-nums shrink-0', isBonus ? 'text-emerald-600' : 'text-violet-700')}>
                            {isBonus ? '+' : '−'}AED {fmt(s.amount)}
                          </p>
                        </div>
                      );
                    })}
                  </ListCard>
                </div>
              );
            })}
          </div>
        )
      }

      {/* Per-employee summary */}
      {employees.length > 0 && (
        <div>
          <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-3">Per-Employee Summary</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {employees.map((emp) => {
              const totalEmpPaid = (emp.salaryHistory ?? []).reduce((s, p) => s + (p.amount ?? 0), 0);
              return (
                <Link key={emp._id ?? emp.id} to={`/employees/${emp._id ?? emp.id}`}
                  className="bg-white rounded-2xl border border-slate-100 p-4 hover:border-slate-200 hover:shadow-sm transition-all group"
                  style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-slate-800 truncate group-hover:text-violet-700 transition-colors">{emp.name}</p>
                      {(emp.role ?? emp.position) && <p className="text-[11px] text-slate-400">{emp.role ?? emp.position}</p>}
                    </div>
                    {emp.salary && <p className="text-[12px] font-bold text-slate-500 shrink-0">AED {fmt(emp.salary)}/mo</p>}
                  </div>
                  <div className="flex items-center justify-between text-[12px] border-t border-slate-50 pt-2 mt-1">
                    <span className="text-slate-400">{(emp.salaryHistory ?? []).length} payments</span>
                    <span className="font-bold text-violet-700">AED {fmt(totalEmpPaid)} total</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ──────────────────────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const propertyId = useSelector(selectCurrentPropertyId);
  const property   = useSelector(selectCurrentProperty);

  const { data: walletData, refetch: refetchWallet } = useGetQuery(
    { path: '/wallet', params: { propertyId } },
    { skip: !propertyId },
  );
  const { data: txnResult, refetch: refetchTxns } = useGetQuery(
    { path: '/wallet/transactions', params: { propertyId, limit: 500 } },
    { skip: !propertyId },
  );
  const transactions = txnResult?.items ?? [];
  const { data: expResult } = useGetQuery({ path: '/expenses', params: { propertyId, limit: 500 } }, { skip: !propertyId });
  const expenses = expResult?.items ?? [];
  const { data: contracts = [] } = useGetQuery({ path: '/contracts', params: { propertyId } }, { skip: !propertyId });
  const { data: employees = [] } = useGetQuery({ path: '/employees', params: { propertyId } }, { skip: !propertyId });

  const [depositMut] = usePostMutation();
  const [deductMut]  = usePostMutation();

  const EMPTY_W = { balance: 0, totalDeposited: 0 };
  const vWallet = { ...EMPTY_W, ...walletData?.vehicle };
  const hWallet = { ...EMPTY_W, ...walletData?.home    };
  const sWallet = { ...EMPTY_W, ...walletData?.salary  };

  const [tab,     setTab]     = useState('money');
  const [showDep, setShowDep] = useState(false);
  const [showExp, setShowExp] = useState(false);
  const [depForm, setDepForm] = useState(BLANK_DEP);
  const setD = (k, v) => setDepForm((f) => ({ ...f, [k]: v }));

  // This-month stats from wallet
  const now = new Date();
  const isThisMonth = (d) => {
    const dt = new Date(d);
    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
  };
  const monthIn  = transactions.filter((t) => t.type === 'credit' && isThisMonth(t.date)).reduce((s, t) => s + t.amount, 0);
  const monthOut = transactions.filter((t) => t.type === 'debit'  && isThisMonth(t.date)).reduce((s, t) => s + t.amount, 0);

  const handleDeposit = async (e) => {
    e.preventDefault();
    const amt = Number(depForm.amount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    try {
      await depositMut({ path: '/wallet/deposit', body: { propertyId, walletType: depForm.wallet, amount: amt, description: depForm.note || 'Deposit', date: depForm.date } }).unwrap();
      await refetchWallet();
      toast.success(`+AED ${fmt(amt)} added to ${WALLET_CFG[depForm.wallet].label}`);
      setShowDep(false); setDepForm(BLANK_DEP);
    } catch (err) { toast.error(err?.data?.error || 'Deposit failed'); }
  };

  return (
    <div className="space-y-5 pb-8">

      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0b1d3a 0%, #152d5e 100%)', boxShadow: '0 4px 24px rgba(11,29,58,0.25)' }}>
        <div className="px-6 pt-6 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-[22px] font-black text-white tracking-tight">Transactions</h1>
              </div>
              {property && (
                <p className="text-[11px] font-semibold text-white/35 mt-0.5 pl-10">
                  {property.name} · All financial flows in one place
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setShowDep(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-[12px] font-bold hover:bg-emerald-400 transition-colors">
                <ArrowDownLeft className="w-3.5 h-3.5" /> Deposit
              </button>
              <button onClick={() => { setShowExp(true); setTab('expenses'); }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white text-[12px] font-bold hover:bg-white/15 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Log Expense
              </button>
            </div>
          </div>

          {/* Wallet balance chips */}
          <div className="grid grid-cols-3 gap-2.5 mt-5">
            {Object.entries(WALLET_CFG).map(([key, cfg]) => {
              const w   = key === 'vehicle' ? vWallet : key === 'home' ? hWallet : sWallet;
              const bal = w.balance ?? 0;
              const neg = bal < 0;
              const Icon = cfg.icon;
              return (
                <Link key={key} to={`/wallet/${key}`}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: neg ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.12)' }}>
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest truncate">{cfg.short}</p>
                    <p className={cn('text-[13px] font-black leading-tight tabular-nums truncate', neg ? 'text-red-300' : 'text-white')}>
                      {neg ? `−AED ${fmt(Math.abs(bal))}` : `AED ${fmt(bal)}`}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* This-month strip */}
        <div className="border-t border-white/8 bg-black/10 px-6 py-3 grid grid-cols-3 gap-4">
          {[
            { label: 'In this month',  value: `+AED ${fmt(monthIn)}`,         color: '#4ade80' },
            { label: 'Out this month', value: `−AED ${fmt(monthOut)}`,        color: '#f87171' },
            { label: 'Net this month', value: `AED ${fmt(monthIn - monthOut)}`, color: monthIn >= monthOut ? '#4ade80' : '#f87171' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-0.5">{s.label}</p>
              <p className="text-[14px] font-black tabular-nums" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab Bar ───────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-white border border-slate-100 rounded-2xl p-1.5 overflow-x-auto" style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        {TABS.map((t) => {
          const Icon   = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all whitespace-nowrap flex-1 justify-center',
                active ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50')}
              style={active ? { background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' } : {}}>
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ───────────────────────────────────────────────── */}
      {tab === 'money'     && <AllMoneyTab     transactions={transactions} />}
      {tab === 'expenses'  && (
        <HouseExpensesTab
          expenses={expenses}
          walletData={walletData}
          propertyId={propertyId}
          refetchWallet={refetchWallet}
          openAddModal={showExp}
          onCloseAddModal={() => setShowExp(false)}
        />
      )}
      {tab === 'contracts' && <ContractsTab  contracts={contracts} />}
      {tab === 'salaries'  && <SalariesTab   employees={employees} />}

      {/* ── Deposit Modal ─────────────────────────────────────────────── */}
      <Modal open={showDep} onClose={() => setShowDep(false)} title="Deposit Funds" subtitle="Add money to a wallet" size="sm">
        <form onSubmit={handleDeposit} className="space-y-4">
          <div>
            <label className={LABEL}>Wallet</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(WALLET_CFG).map(([k, cfg]) => {
                const Icon = cfg.icon;
                const sel  = depForm.wallet === k;
                const w    = k === 'vehicle' ? vWallet : k === 'home' ? hWallet : sWallet;
                return (
                  <button key={k} type="button" onClick={() => setD('wallet', k)}
                    className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all"
                    style={{ borderColor: sel ? cfg.color : '#e2e8f0', background: sel ? cfg.bg : '#f8fafc' }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: sel ? cfg.color : '#e2e8f0' }}>
                      <Icon className="w-4 h-4" style={{ color: sel ? '#fff' : '#64748b' }} />
                    </div>
                    <p className="text-[11px] font-bold" style={{ color: sel ? cfg.color : '#475569' }}>{cfg.short}</p>
                    <p className="text-[10px] tabular-nums" style={{ color: sel ? cfg.color : '#94a3b8' }}>AED {fmt(w.balance)}</p>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className={LABEL}>Amount (AED) *</label>
            <input value={depForm.amount} onChange={(e) => setD('amount', e.target.value)} type="number" min="1" step="0.01" required placeholder="e.g. 10,000" className={INPUT} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Date</label>
              <DatePicker value={depForm.date} onChange={(v) => setD('date', v)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Note / Source</label>
              <input value={depForm.note} onChange={(e) => setD('note', e.target.value)} placeholder="From Mr. Shah" className={INPUT} />
            </div>
          </div>
          {Number(depForm.amount) > 0 && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="flex-1">
                <p className="text-[11px] text-emerald-600">To {WALLET_CFG[depForm.wallet].label}</p>
                <p className="text-[20px] font-black text-emerald-700 tabular-nums">+AED {fmt(Number(depForm.amount))}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-slate-400">New balance</p>
                <p className="text-[13px] font-black text-emerald-700 tabular-nums">
                  AED {fmt(((depForm.wallet === 'vehicle' ? vWallet : depForm.wallet === 'home' ? hWallet : sWallet).balance ?? 0) + Number(depForm.amount || 0))}
                </p>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2.5 pt-1 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setShowDep(false)}>Cancel</Button>
            <Button type="submit" icon={ArrowDownLeft}>Deposit</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
