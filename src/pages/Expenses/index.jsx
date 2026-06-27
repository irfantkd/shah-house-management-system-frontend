import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  RiAddLine, RiSearchLine, RiEditLine, RiDeleteBinLine,
  RiMoneyDollarCircleLine, RiLineChartLine, RiCalendarLine, RiFilterLine,
} from 'react-icons/ri';
import { selectExpenses, addExpense, updateExpense, deleteExpense } from '../../store/slices/expensesSlice';
import { selectCompanies } from '../../store/slices/companiesSlice';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Field, Input, Select, Textarea, FormGrid, FormActions } from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import { cn } from '../../utils/cn';

const EXPENSE_CATS = ['Cleaning','Garden','Pool & Water','Climate / AC','Security / CCTV','Plumbing','Pest Control','Power','Repairs','Other'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(s) { return s ? new Date(s+'T00:00:00').toLocaleDateString('en-AE',{day:'numeric',month:'short',year:'numeric'}) : '—'; }
function fmtAED(n) { return `AED ${(n ?? 0).toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:0})}`; }

const CAT_COLORS = {
  Cleaning:          'bg-purple-50 text-purple-700',
  Garden:            'bg-green-50 text-green-700',
  'Pool & Water':    'bg-cyan-50 text-cyan-700',
  'Climate / AC':    'bg-blue-50 text-blue-700',
  'Security / CCTV': 'bg-slate-100 text-slate-700',
  Plumbing:          'bg-sky-50 text-sky-700',
  'Pest Control':    'bg-orange-50 text-orange-700',
  Power:             'bg-yellow-50 text-yellow-700',
  Repairs:           'bg-red-50 text-red-700',
  Other:             'bg-slate-100 text-slate-600',
};

const now = new Date();
const YEARS = [now.getFullYear(), now.getFullYear()-1, now.getFullYear()-2];

export default function ExpensesPage() {
  const dispatch    = useDispatch();
  const expenses    = useSelector(selectExpenses);
  const companies   = useSelector(selectCompanies);
  const [search,    setSearch]    = useState('');
  const [catFilt,   setCatFilt]   = useState('All');
  const [yearFilt,  setYearFilt]  = useState(String(now.getFullYear()));
  const [modal,     setModal]     = useState(null);
  const [delTarget, setDelTarget] = useState(null);

  const filtered = expenses.filter((e) => {
    const q  = search.toLowerCase();
    const ms = (e.description ?? '').toLowerCase().includes(q) || (e.company ?? '').toLowerCase().includes(q);
    const mc = catFilt === 'All' || e.category === catFilt;
    const my = yearFilt === 'All' || (e.date ?? '').startsWith(yearFilt);
    return ms && mc && my;
  });

  const totalFiltered = filtered.reduce((s, e) => s + (e.amount ?? 0), 0);
  const totalYear     = expenses.filter((e) => (e.date ?? '').startsWith(yearFilt !== 'All' ? yearFilt : '')).reduce((s, e) => s + (e.amount ?? 0), 0);
  const thisMonth     = expenses.filter((e) => e.date?.startsWith(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`)).reduce((s, e) => s + (e.amount ?? 0), 0);
  const topCat        = EXPENSE_CATS.map((cat) => ({ cat, total: expenses.filter((e) => e.category === cat).reduce((s, e) => s + (e.amount ?? 0), 0) })).sort((a, b) => b.total - a.total)[0];

  const monthlyData = MONTHS.map((m, i) => ({
    month: m,
    total: expenses.filter((e) => e.date?.startsWith(`${yearFilt !== 'All' ? yearFilt : now.getFullYear()}-${String(i+1).padStart(2,'0')}`)).reduce((s, e) => s + (e.amount ?? 0), 0),
  }));
  const maxMonthly = Math.max(...monthlyData.map((m) => m.total), 1);

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Expenses</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">Track all villa expenditures and analyse spending patterns</p>
        </div>
        <Button variant="primary" icon={RiAddLine} onClick={() => setModal('add')}>Add Expense</Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:'This Month',      value: fmtAED(thisMonth),      icon: RiCalendarLine,         color:'from-navy-600 to-navy-800'       },
          { label:`Total ${yearFilt}`,value: fmtAED(totalYear),     icon: RiMoneyDollarCircleLine, color:'from-accent-500 to-accent-700'   },
          { label:'Filtered Total',  value: fmtAED(totalFiltered),  icon: RiFilterLine,            color:'from-success-500 to-success-700' },
          { label:'Top Category',    value: topCat?.cat ?? '—',     icon: RiLineChartLine,         color:'from-warning-500 to-orange-500'  },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className={cn('rounded-2xl p-5 text-white bg-linear-to-br', s.color)}>
            <s.icon className="w-5 h-5 text-white/70 mb-3" />
            <p className="text-xl font-bold leading-none">{s.value}</p>
            <p className="text-[12px] text-white/70 mt-2">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Monthly bar chart */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5" style={{ boxShadow: '0 1px 8px rgb(0 0 0/0.06)' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[14px] font-bold text-navy-900">Monthly Spend — {yearFilt !== 'All' ? yearFilt : 'All Years'}</p>
          <select value={yearFilt} onChange={(e) => setYearFilt(e.target.value)}
            className="text-[12px] border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-accent-400 text-slate-600">
            <option value="All">All Years</option>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex items-end gap-1 h-28">
          {monthlyData.map((m) => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-1 group">
              <div className="relative w-full rounded-t-md transition-all" style={{ height: `${(m.total / maxMonthly) * 100}%`, minHeight: m.total > 0 ? '4px' : '0', background: 'linear-gradient(180deg, #3b82f6 0%, #1e40af 100%)' }}>
                {m.total > 0 && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-navy-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    {fmtAED(m.total)}
                  </div>
                )}
              </div>
              <span className="text-[9px] text-slate-400 font-semibold">{m.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title or vendor…"
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-[13px] placeholder-slate-400 outline-none focus:ring-2 focus:ring-accent-400 transition-all" />
        </div>
        <select value={catFilt} onChange={(e) => setCatFilt(e.target.value)}
          className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-[13px] outline-none focus:ring-2 focus:ring-accent-400 text-slate-600">
          <option value="All">All Categories</option>
          {EXPENSE_CATS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: '0 1px 8px rgb(0 0 0/0.06)' }}>
        <div className="px-5 py-3.5 border-b border-slate-100 grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 text-[11px] font-bold text-slate-400 uppercase tracking-wide">
          <span>Description</span>
          <span className="hidden sm:block">Category</span>
          <span className="hidden md:block">Vendor</span>
          <span className="hidden sm:block text-right">Date</span>
          <span className="text-right">Amount</span>
        </div>
        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <RiMoneyDollarCircleLine className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-semibold">No expenses match your filters</p>
            <button onClick={() => setModal('add')} className="mt-3 text-accent-600 text-[13px] font-semibold hover:underline">+ Add first expense</button>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filtered.map((exp, i) => (
              <motion.div key={exp.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ delay: i * 0.03 }}>
                <ExpenseRow exp={exp} last={i === filtered.length-1} onEdit={() => setModal(exp)} onDelete={() => setDelTarget(exp)} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        {filtered.length > 0 && (
          <div className="px-5 py-3.5 bg-navy-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[13px] font-bold text-navy-700">{filtered.length} entries</span>
            <span className="text-[14px] font-bold text-navy-900">{fmtAED(totalFiltered)}</span>
          </div>
        )}
      </div>

      <ExpenseModal open={modal !== null} expense={modal !== 'add' ? modal : null} companies={companies}
        onClose={() => setModal(null)}
        onSave={(data) => {
          if (modal !== 'add') { dispatch(updateExpense({ ...modal, ...data })); toast.success('Expense updated!'); }
          else { dispatch(addExpense({ ...data, date: data.date || new Date().toISOString().split('T')[0] })); toast.success('Expense added!'); }
          setModal(null);
        }}
      />
      <ConfirmDialog open={!!delTarget} onClose={() => setDelTarget(null)}
        onConfirm={() => { dispatch(deleteExpense(delTarget.id)); toast.success('Expense deleted'); setDelTarget(null); }}
        title="Delete Expense" message={`Delete "${delTarget?.description}"?`}
      />
    </motion.div>
  );
}

function ExpenseRow({ exp, last, onEdit, onDelete }) {
  const cls = CAT_COLORS[exp.category] ?? CAT_COLORS.Other;
  return (
    <div className={cn('grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-3.5 hover:bg-slate-50 transition-colors group', !last && 'border-b border-slate-50')}>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-slate-800 truncate">{exp.description}</p>
        {exp.notes && <p className="text-[11px] text-slate-400 truncate">{exp.notes}</p>}
      </div>
      <span className={cn('hidden sm:block text-[11px] font-semibold px-2.5 py-1 rounded-lg shrink-0', cls)}>{exp.category}</span>
      <span className="hidden md:block text-[12px] text-slate-500 shrink-0 max-w-[120px] truncate">{exp.company ?? '—'}</span>
      <span className="hidden sm:block text-[12px] text-slate-400 shrink-0">{fmtDate(exp.date)}</span>
      <div className="flex items-center gap-2 shrink-0 justify-end">
        <span className="text-[14px] font-bold text-navy-800">{fmtAED(exp.amount)}</span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit}   className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-accent-600 hover:bg-accent-50 transition-all"><RiEditLine className="w-3.5 h-3.5" /></button>
          <button onClick={onDelete} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-danger-500 hover:bg-danger-50 transition-all"><RiDeleteBinLine className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </div>
  );
}

function ExpenseModal({ open, onClose, expense, companies, onSave }) {
  const { register, handleSubmit, reset } = useForm();
  useEffect(() => {
    if (!open) return;
    reset(expense
      ? { description: expense.description, category: expense.category, amount: expense.amount, date: expense.date, company: expense.company ?? '', notes: expense.notes ?? '' }
      : { date: new Date().toISOString().split('T')[0] });
  }, [open, expense]);

  const onSubmit = (d) => {
    onSave({ ...d, amount: parseFloat(d.amount) || 0 });
  };

  return (
    <Modal open={open} onClose={onClose} title={expense ? 'Edit Expense' : 'Add Expense'} subtitle="Record a villa expenditure">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Field label="Description" required>
          <Input {...register('description', { required: 'Required' })} placeholder="e.g. AC annual service" />
        </Field>
        <FormGrid>
          <Field label="Category" required>
            <Select {...register('category', { required: 'Required' })} placeholder="Select category"
              options={EXPENSE_CATS.map((c) => ({ value: c, label: c }))} />
          </Field>
          <Field label="Amount (AED)" required>
            <Input {...register('amount', { required: 'Required' })} type="number" min="0" step="0.01" placeholder="0.00" />
          </Field>
        </FormGrid>
        <FormGrid>
          <Field label="Date" required>
            <Input {...register('date', { required: 'Required' })} type="date" />
          </Field>
          <Field label="Company / Vendor">
            <Input {...register('company')} placeholder="e.g. Cool Air LLC" />
          </Field>
        </FormGrid>
        <Field label="Notes"><Textarea {...register('notes')} rows={2} placeholder="Invoice number, payment method, etc." /></Field>
        <FormActions onCancel={onClose} submitLabel={expense ? 'Update Expense' : 'Add Expense'} />
      </form>
    </Modal>
  );
}
