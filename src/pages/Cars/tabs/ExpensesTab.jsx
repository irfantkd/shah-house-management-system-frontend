import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Plus, Wrench, Trash2, Wallet, Edit2, ChevronRight } from 'lucide-react';
import { useGetQuery, usePostMutation, usePutMutation, useDeleteMutation } from '../../../api/apiSlice';
import { selectCurrentPropertyId } from '../../../store/slices/propertiesSlice';
import { CAR_EXPENSE_TYPES } from '../../../data/mockCars';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import EmptyState from '../../../components/ui/EmptyState';
import { cn } from '../../../utils/cn';
import toast from 'react-hot-toast';

const LOW_THRESHOLD = 5000;

const fmt     = (n) => Number(n).toLocaleString('en-AE', { maximumFractionDigits: 0 });
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const TYPE_OPTS = Object.entries(CAR_EXPENSE_TYPES).map(([k, v]) => ({ value: k, label: v.label }));
const BLANK = { type: 'service', description: '', amount: '', vendor: '', date: new Date().toISOString().split('T')[0], mileage: '', notes: '' };

export default function ExpensesTab({ carId }) {
  const propertyId = useSelector(selectCurrentPropertyId);

  const { data: expenses = [], refetch } = useGetQuery({ path: `/cars/${carId}/expenses` }, { skip: !carId });
  const { data: walletData, refetch: refetchWallet } = useGetQuery({ path: '/wallet', params: { propertyId } }, { skip: !propertyId });
  const vehicleBalance = walletData?.vehicle?.balance ?? 0;

  const [addExpenseMut]    = usePostMutation();
  const [updateExpenseMut] = usePutMutation();
  const [deductWalletMut]  = usePostMutation();
  const [deleteExpenseMut] = useDeleteMutation();

  const [typeFilter, setTypeFilter] = useState('all');
  const [showAdd,    setShowAdd]    = useState(false);
  const [editingExp, setEditingExp] = useState(null);
  const [form,       setForm]       = useState(BLANK);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const total  = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const sorted = [...expenses]
    .filter((e) => typeFilter === 'all' || e.type === typeFilter)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const byType = Object.entries(
    expenses.reduce((acc, e) => { acc[e.type] = (acc[e.type] ?? 0) + (e.amount || 0); return acc; }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const openAdd = () => { setEditingExp(null); setForm(BLANK); setShowAdd(true); };
  const openEdit = (exp) => {
    setEditingExp(exp);
    setForm({
      type:        exp.type        ?? 'service',
      description: exp.description ?? '',
      amount:      exp.amount      ?? '',
      vendor:      exp.vendor      ?? '',
      date:        exp.date        ? exp.date.split('T')[0] : new Date().toISOString().split('T')[0],
      mileage:     exp.mileage     ?? '',
      notes:       exp.notes       ?? '',
    });
    setShowAdd(true);
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!form.description || !form.amount || !form.date) return toast.error('Fill required fields');
    const amt     = Number(form.amount);
    const expType = CAR_EXPENSE_TYPES[form.type]?.label ?? form.type;
    try {
      if (editingExp) {
        await updateExpenseMut({
          path: `/cars/${carId}/expenses/${editingExp.id ?? editingExp._id}`,
          body: { ...form, amount: amt, mileage: form.mileage ? Number(form.mileage) : undefined },
        }).unwrap();
        toast.success('Expense updated');
      } else {
        await Promise.all([
          addExpenseMut({
            path: `/cars/${carId}/expenses`,
            body: { ...form, amount: amt, mileage: form.mileage ? Number(form.mileage) : undefined },
          }).unwrap(),
          deductWalletMut({
            path: '/wallet/deduct',
            body: { propertyId, walletType: 'vehicle', amount: amt, description: form.description, date: form.date, category: expType, carId },
          }).unwrap(),
        ]);
        await refetchWallet();
        toast.success('Expense added & deducted from Vehicle Wallet');
      }
      await refetch();
      setShowAdd(false);
      setEditingExp(null);
      setForm(BLANK);
    } catch (err) { toast.error(err.data?.error || 'Failed to save expense'); }
  };

  const handleDelete = async (exp) => {
    try {
      await deleteExpenseMut({ path: `/cars/${carId}/expenses/${exp.id ?? exp._id}` }).unwrap();
      await refetch();
      toast.success('Expense removed');
    } catch { toast.error('Failed to remove expense'); }
  };

  return (
    <div className="space-y-5">

      {/* Vehicle Wallet Banner */}
      <VehicleWalletBanner balance={vehicleBalance} transactions={walletData?.vehicle?.transactions} />

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
        <Button icon={Plus} size="sm" onClick={openAdd}>Add Expense</Button>
      </div>

      {/* Expense list */}
      {sorted.length === 0 ? (
        <EmptyState icon={Wrench} title="No expenses" description="Log your first expense for this vehicle."
          action={openAdd} actionLabel="Add Expense" />
      ) : (
        <div className="space-y-2">
          {sorted.map((exp) => {
            const cfg = CAR_EXPENSE_TYPES[exp.type] ?? CAR_EXPENSE_TYPES.other;
            return (
              <div key={exp.id ?? exp._id}
                className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4 hover:shadow-sm transition-all"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
                  <Wrench className="w-4 h-4" style={{ color: cfg.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800 truncate">{exp.description}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                    {exp.vendor  && <span className="text-[11px] text-slate-400">{exp.vendor}</span>}
                    {exp.mileage && <><span className="text-slate-200 text-xs">·</span><span className="text-[11px] text-slate-400">{Number(exp.mileage).toLocaleString()} km</span></>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[14px] font-bold text-slate-900">AED {Number(exp.amount).toLocaleString()}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{fmtDate(exp.date)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(exp)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-all">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(exp)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Expense Modal */}
      <Modal
        open={showAdd}
        onClose={() => { setShowAdd(false); setEditingExp(null); setForm(BLANK); }}
        title={editingExp ? 'Edit Expense' : 'Log Expense'}
        subtitle={editingExp ? 'Update expense details' : 'Record a vehicle expense — deducted from Vehicle Wallet'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editingExp && <VehicleWalletPanel balance={vehicleBalance} deduction={Number(form.amount) || 0} />}
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
            <Button variant="outline" type="button"
              onClick={() => { setShowAdd(false); setEditingExp(null); setForm(BLANK); }}>Cancel</Button>
            <Button type="submit" icon={editingExp ? Edit2 : Plus}>
              {editingExp ? 'Save Changes' : 'Add Expense'}
            </Button>
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

function VehicleWalletBanner({ balance, transactions }) {
  const isNeg = balance < 0;
  const isLow = !isNeg && balance < LOW_THRESHOLD;
  const txns  = (transactions ?? []).slice(0, 5);

  const txDate = (d) => {
    const s = String(d ?? '').substring(0, 10);
    const dt = new Date(s + 'T00:00:00');
    return isNaN(dt) ? s : dt.toLocaleDateString('en-AE', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0b1d3a 0%, #152d5e 100%)', boxShadow: '0 4px 20px rgba(11,29,58,0.22)' }}>
      {/* Balance row */}
      <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2.5 flex-wrap">
            <Wallet className="w-3.5 h-3.5 text-white/40 shrink-0" />
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Vehicle Wallet</span>
            {isNeg && (
              <span className="text-[10px] font-bold text-red-300 bg-red-500/20 border border-red-400/20 px-2 py-0.5 rounded-full">Overdraft</span>
            )}
            {isLow && (
              <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 border border-amber-400/20 px-2 py-0.5 rounded-full">Low Balance</span>
            )}
          </div>
          <p className={cn('text-[34px] font-black leading-none tracking-tight', isNeg ? 'text-red-300' : 'text-white')}>
            {isNeg ? `− AED ${fmt(Math.abs(balance))}` : `AED ${fmt(balance)}`}
          </p>
          <p className="text-[11px] text-white/35 mt-1.5">Current Balance</p>
        </div>
        <Link to="/wallet"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold text-white/70 hover:text-white transition-colors shrink-0 mt-1"
          style={{ background: 'rgba(255,255,255,0.08)' }}>
          <ChevronRight className="w-3.5 h-3.5" />
          Wallet
        </Link>
      </div>

      {/* Recent transactions */}
      <div className="border-t border-white/8">
        {txns.length === 0 ? (
          <p className="px-5 py-4 text-[11px] text-white/30 text-center">No transactions yet — log an expense to get started</p>
        ) : (
          <div className="divide-y divide-white/5">
            {txns.map((t, i) => {
              const credit = t.type === 'credit' || t.type === 'deposit';
              return (
                <div key={t.id ?? i} className="flex items-center gap-3 px-5 py-2.5">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: credit ? '#4ade80' : '#f87171' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-white/55 truncate font-medium">{t.description || t.category || 'Transaction'}</p>
                    <p className="text-[10px] text-white/25">{txDate(t.date)}</p>
                  </div>
                  <p className="text-[12px] font-bold shrink-0" style={{ color: credit ? '#4ade80' : '#f87171' }}>
                    {credit ? '+' : '−'} AED {fmt(t.amount)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function VehicleWalletPanel({ balance, deduction }) {
  const isNeg = balance < 0;
  const isLow = !isNeg && balance < LOW_THRESHOLD;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0b1d3a 0%, #152d5e 100%)', boxShadow: '0 4px 20px rgba(11,29,58,0.25)' }}>
      <div className="px-5 py-4">
        {/* Label row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-3.5 h-3.5 text-white/40" />
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Vehicle Wallet</span>
          </div>
          {isNeg ? (
            <span className="text-[10px] font-bold text-red-300 bg-red-500/20 border border-red-400/20 px-2.5 py-0.5 rounded-full">
              Overdraft
            </span>
          ) : isLow ? (
            <Link to="/wallet"
              className="text-[10px] font-bold text-amber-300 bg-amber-500/20 border border-amber-400/20 px-2.5 py-0.5 rounded-full hover:bg-amber-500/30 transition-colors">
              Low · Top Up
            </Link>
          ) : null}
        </div>

        {/* Balance */}
        <p className={cn('text-[32px] font-black leading-none tracking-tight', isNeg ? 'text-red-300' : 'text-white')}>
          {isNeg ? `− AED ${fmt(Math.abs(balance))}` : `AED ${fmt(balance)}`}
        </p>
        <p className="text-[11px] text-white/35 mt-1.5 font-medium">Current Balance</p>
      </div>

      {/* Deduction row — only shown when amount is entered */}
      {deduction > 0 && (
        <div className="px-5 py-3 border-t border-white/8 bg-black/12 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-white/45">This expense</span>
          <span className="text-[13px] font-bold text-red-300">− AED {fmt(deduction)}</span>
        </div>
      )}
    </div>
  );
}

const INPUT = 'w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] text-slate-700 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500';
