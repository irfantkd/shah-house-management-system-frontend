import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { Plus, Wrench, Trash2, Wallet, AlertTriangle } from 'lucide-react';
import { selectExpensesByCarId, addCarExpense, deleteCarExpense } from '../../../store/slices/carsSlice';
import { selectVehicleWallet, deductFromWallet, LOW_BALANCE_THRESHOLD } from '../../../store/slices/walletSlice';
import { CAR_EXPENSE_TYPES } from '../../../data/mockCars';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import EmptyState from '../../../components/ui/EmptyState';
import { cn } from '../../../utils/cn';
import toast from 'react-hot-toast';

const fmt = (n) => Number(n).toLocaleString('en-AE', { maximumFractionDigits: 0 });

const TYPE_OPTS = Object.entries(CAR_EXPENSE_TYPES).map(([k, v]) => ({ value: k, label: v.label }));
const BLANK = { type: 'service', description: '', amount: '', vendor: '', date: new Date().toISOString().split('T')[0], mileage: '', notes: '' };
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function ExpensesTab({ carId }) {
  const dispatch       = useDispatch();
  const expenses       = useSelector(selectExpensesByCarId(carId));
  const vehicleWallet  = useSelector(selectVehicleWallet);
  const [typeFilter, setTypeFilter] = useState('all');
  const [showAdd,    setShowAdd]    = useState(false);
  const [form,       setForm]       = useState(BLANK);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const total  = expenses.reduce((s, e) => s + e.amount, 0);
  const sorted = [...expenses].filter((e) => typeFilter === 'all' || e.type === typeFilter)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const byType = Object.entries(
    expenses.reduce((acc, e) => { acc[e.type] = (acc[e.type] ?? 0) + e.amount; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]);

  const handleSubmit = (ev) => {
    ev.preventDefault();
    if (!form.description || !form.amount || !form.date) return toast.error('Fill required fields');
    const amt = Number(form.amount);
    dispatch(addCarExpense({ ...form, carId, amount: amt, mileage: form.mileage ? Number(form.mileage) : undefined }));
    dispatch(deductFromWallet({ wallet: 'vehicle', amount: amt, description: form.description, date: form.date }));
    if (vehicleWallet.balance - amt < LOW_BALANCE_THRESHOLD)
      toast(`Vehicle wallet balance now AED ${fmt(Math.max(0, vehicleWallet.balance - amt))} — consider topping up`, { icon: '⚠️' });
    else toast.success('Expense added & deducted from Vehicle Wallet');
    setShowAdd(false);
    setForm(BLANK);
  };

  const handleDelete = (id) => { dispatch(deleteCarExpense(id)); toast.success('Expense removed'); };

  return (
    <div className="space-y-5">

      {/* Summary row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">Total Expenses</p>
          <p className="text-3xl font-bold text-slate-900 leading-none">AED {total.toLocaleString()}</p>
          <p className="text-[12px] text-slate-500 mt-1.5">{expenses.length} transaction{expenses.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 sm:col-span-2" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-3">By Category</p>
          {byType.length === 0 ? (
            <p className="text-[13px] text-slate-400">No expenses yet</p>
          ) : (
            <div className="space-y-2">
              {byType.slice(0, 5).map(([type, amount]) => {
                const cfg = CAR_EXPENSE_TYPES[type] ?? CAR_EXPENSE_TYPES.other;
                const pct = total ? Math.round((amount / total) * 100) : 0;
                return (
                  <div key={type} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.color }} />
                    <span className="text-[12px] text-slate-600 w-28 shrink-0">{cfg.label}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: cfg.color }} />
                    </div>
                    <span className="text-[12px] font-bold text-slate-700 w-24 text-right shrink-0">AED {amount.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Filter row + add button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <FilterBtn active={typeFilter === 'all'} onClick={() => setTypeFilter('all')}>All</FilterBtn>
          {TYPE_OPTS.map((t) => (
            <FilterBtn key={t.value} active={typeFilter === t.value} onClick={() => setTypeFilter(t.value)}>{t.label}</FilterBtn>
          ))}
        </div>
        <Button icon={Plus} size="sm" onClick={() => setShowAdd(true)}>Add Expense</Button>
      </div>

      {/* Expense list */}
      {sorted.length === 0 ? (
        <EmptyState icon={Wrench} title="No expenses" description="Log your first expense for this vehicle."
          action={() => setShowAdd(true)} actionLabel="Add Expense" />
      ) : (
        <div className="space-y-2">
          {sorted.map((exp) => {
            const cfg = CAR_EXPENSE_TYPES[exp.type] ?? CAR_EXPENSE_TYPES.other;
            return (
              <div key={exp.id}
                className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4 hover:shadow-sm transition-all"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
                  <Wrench className="w-4 h-4" style={{ color: cfg.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800 truncate">{exp.description}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                    {exp.vendor && <span className="text-[11px] text-slate-400">{exp.vendor}</span>}
                    {exp.mileage && <><span className="text-slate-200 text-xs">·</span><span className="text-[11px] text-slate-400">{exp.mileage.toLocaleString()} km</span></>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[14px] font-bold text-slate-900">AED {exp.amount.toLocaleString()}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{fmtDate(exp.date)}</p>
                </div>
                <button onClick={() => handleDelete(exp.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Expense Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Log Expense" subtitle="Record a vehicle expense — deducted from Vehicle Wallet">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Wallet balance strip */}
          <WalletStrip balance={vehicleWallet.balance} formAmount={form.amount} />
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Expense Type *</label>
              <select value={form.type} onChange={(e) => set('type', e.target.value)} className={INPUT}>
                {TYPE_OPTS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Description *</label>
              <input value={form.description} onChange={(e) => set('description', e.target.value)} required
                placeholder="e.g. Full Annual Service" className={INPUT} />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Amount (AED) *</label>
              <input value={form.amount} onChange={(e) => set('amount', e.target.value)} type="number" min="0" required
                placeholder="0.00" className={INPUT} />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Date *</label>
              <input value={form.date} onChange={(e) => set('date', e.target.value)} type="date" required className={INPUT} />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Vendor / Garage</label>
              <input value={form.vendor} onChange={(e) => set('vendor', e.target.value)}
                placeholder="e.g. Al Futtaim Toyota" className={INPUT} />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Odometer (km)</label>
              <input value={form.mileage} onChange={(e) => set('mileage', e.target.value)} type="number" min="0"
                placeholder="e.g. 45000" className={INPUT} />
            </div>
            <div className="col-span-2">
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Notes</label>
              <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2}
                placeholder="Additional details…" className={`${INPUT} h-auto py-2.5 resize-none`} />
            </div>
          </div>
          <div className="flex justify-end gap-2.5 pt-1">
            <Button variant="outline" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" icon={Plus}>Add Expense</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function FilterBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${active ? 'bg-navy-900 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-700'}`}>
      {children}
    </button>
  );
}

function WalletStrip({ balance, formAmount }) {
  const after   = balance - (Number(formAmount) || 0);
  const low     = balance < LOW_BALANCE_THRESHOLD;
  const empty   = balance <= 0;
  const over    = after < 0;
  return (
    <div className={cn('flex items-center gap-3 p-3 rounded-xl border',
      empty ? 'bg-red-50 border-red-200' : low ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100')}>
      <Wallet className={cn('w-4 h-4 shrink-0', empty ? 'text-red-500' : low ? 'text-amber-600' : 'text-slate-400')} />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-slate-500">Vehicle Wallet Balance</p>
        <p className={cn('text-[15px] font-bold leading-tight', empty ? 'text-red-600' : low ? 'text-amber-700' : 'text-slate-800')}>
          AED {fmt(balance)}
        </p>
      </div>
      {formAmount && (
        <div className="text-right shrink-0">
          <p className="text-[10px] text-slate-400">After expense</p>
          <p className={cn('text-[13px] font-bold', over ? 'text-red-600' : after < LOW_BALANCE_THRESHOLD ? 'text-amber-600' : 'text-emerald-600')}>
            AED {fmt(Math.max(0, after))}
          </p>
        </div>
      )}
      {(empty || low) && (
        <Link to="/wallet" className={cn('shrink-0 text-[11px] font-bold px-2.5 py-1.5 rounded-lg',
          empty ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>
          {empty ? 'Deposit' : 'Top Up'}
        </Link>
      )}
    </div>
  );
}

const INPUT = 'w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] text-slate-700 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500';
