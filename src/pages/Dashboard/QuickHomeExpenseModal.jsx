import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Plus, Home, Car, Building2, Wallet } from 'lucide-react';
import { RiReceiptLine, RiHome4Line, RiShoppingCart2Line } from 'react-icons/ri';
import { useGetQuery, usePostMutation } from '../../api/apiSlice';
import { selectCurrentPropertyId } from '../../store/slices/propertiesSlice';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import DatePicker from '../../components/ui/DatePicker';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

const INPUT = 'w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] text-slate-700 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400';
const LOW_THRESHOLD = 5000;
const fmt = (n) => Number(n).toLocaleString('en-AE', { maximumFractionDigits: 0 });

const SEGMENTS = [
  { k: 'property',  label: 'Property & Services', Icon: RiHome4Line,       color: '#2563eb', bg: '#eff6ff' },
  { k: 'household', label: 'Household & Daily',   Icon: RiShoppingCart2Line, color: '#16a34a', bg: '#f0fdf4' },
];

const BLANK = {
  description: '',
  amount:      '',
  date:        new Date().toISOString().split('T')[0],
  vendor:      '',
  notes:       '',
};

export default function QuickHomeExpenseModal({ open, onClose }) {
  const propertyId = useSelector(selectCurrentPropertyId);

  const [segment,  setSegment]  = useState('property');
  const [category, setCategory] = useState('');
  const [wallet,   setWallet]   = useState('home');
  const [form,     setForm]     = useState(BLANK);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const { data: cats = [] } = useGetQuery(
    { path: '/expense-categories', params: { propertyId, segment } },
    { skip: !propertyId || !open },
  );
  const { data: walletData, refetch: refetchWallet } = useGetQuery(
    { path: '/wallet', params: { propertyId } },
    { skip: !propertyId },
  );
  const homeBalance     = walletData?.home?.balance     ?? 0;
  const vehicleBalance  = walletData?.vehicle?.balance  ?? 0;
  const propertyBalance = walletData?.property?.balance ?? 0;
  const activeBalance   = wallet === 'vehicle' ? vehicleBalance : wallet === 'property' ? propertyBalance : homeBalance;

  const [addExpense]     = usePostMutation();
  const [deductWallet]   = usePostMutation();

  // Auto-select first category when segment or categories change
  useEffect(() => {
    if (cats.length > 0) setCategory(cats[0].name);
  }, [cats, segment]);

  const handleSegment = (s) => {
    setSegment(s);
    setCategory('');
  };

  const handleClose = () => {
    onClose();
    setSegment('property');
    setCategory('');
    setWallet('home');
    setForm(BLANK);
    setIsSubmitting(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!form.description.trim()) return toast.error('Enter a description');
    if (!form.amount || Number(form.amount) <= 0) return toast.error('Enter a valid amount');
    if (!category) return toast.error('Select a category');
    setIsSubmitting(true);
    try {
      const result = await addExpense({
        path: '/expenses',
        body: {
          propertyId,
          segment,
          category,
          description: form.description.trim(),
          amount:      Number(form.amount),
          date:        form.date,
          vendor:      form.vendor.trim() || undefined,
          notes:       form.notes.trim()  || undefined,
          walletType:  wallet,
        },
      }).unwrap();
      const sourceId = result.data?.id ?? '';
      await deductWallet({
        path: '/wallet/deduct',
        body: {
          propertyId,
          walletType:  wallet,
          amount:      Number(form.amount),
          description: form.description.trim(),
          date:        form.date,
          category,
          sourceId,
          sourceModel: 'Expense',
        },
      }).unwrap();
      await refetchWallet();
      toast.success('Expense logged');
      handleClose();
    } catch (err) {
      toast.error(err?.data?.error ?? 'Failed to save expense');
      setIsSubmitting(false);
    }
  };

  const after = activeBalance - (Number(form.amount) || 0);

  return (
    <Modal open={open} onClose={handleClose} title="Log Expense" subtitle="Record property or household spending" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Segment */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
          {SEGMENTS.map(({ k, label, Icon, color }) => (
            <button key={k} type="button" onClick={() => handleSegment(k)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[12px] font-bold transition-all',
                segment === k ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600',
              )}>
              <Icon className="w-3.5 h-3.5" style={{ color: segment === k ? color : undefined }} />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{k === 'property' ? 'Property' : 'Household'}</span>
            </button>
          ))}
        </div>

        {/* Wallet selector */}
        <div>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Deduct from Wallet</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { k: 'home',     label: 'Home Wallet',     icon: Home,      bal: homeBalance,     color: '#16a34a', bg: '#f0fdf4' },
              { k: 'property', label: 'Property Wallet', icon: Building2, bal: propertyBalance, color: '#0891b2', bg: '#ecfeff' },
              { k: 'vehicle',  label: 'Vehicle Wallet',  icon: Car,       bal: vehicleBalance,  color: '#0b1d3a', bg: '#eef2fb' },
            ].map(({ k, label, icon: Icon, bal, color, bg }) => (
              <button key={k} type="button" onClick={() => setWallet(k)}
                className="flex flex-col gap-1 p-3 rounded-xl border-2 text-left transition-all"
                style={wallet === k ? { borderColor: color, background: bg } : { borderColor: '#e2e8f0', background: '#f8fafc' }}>
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" style={{ color: wallet === k ? color : '#94a3b8' }} />
                  <span className="text-[11px] font-bold truncate" style={{ color: wallet === k ? color : '#64748b' }}>{label}</span>
                  {wallet === k && (
                    <span className="ml-auto shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-black"
                      style={{ background: color }}>✓</span>
                  )}
                </div>
                <p className="text-[15px] font-bold" style={{ color: wallet === k ? color : '#94a3b8' }}>
                  {bal < 0 ? `− AED ${fmt(Math.abs(bal))}` : `AED ${fmt(bal)}`}
                </p>
              </button>
            ))}
          </div>
          {(Number(form.amount) || 0) > 0 && (
            <div className={cn('mt-2 flex items-center justify-between px-4 py-2.5 rounded-xl border text-[12px]',
              after < 0 ? 'bg-red-50 border-red-200' : after < LOW_THRESHOLD ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100')}>
              <span className="text-slate-500">{wallet === 'vehicle' ? 'Vehicle' : wallet === 'property' ? 'Property' : 'Home'} wallet after</span>
              <span className={cn('font-black', after < 0 ? 'text-red-600' : after < LOW_THRESHOLD ? 'text-amber-600' : 'text-emerald-700')}>
                {after < 0 ? `− AED ${fmt(Math.abs(after))}` : `AED ${fmt(after)}`}
              </span>
            </div>
          )}
        </div>

        {/* Category */}
        <div>
          <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Category</label>
          {cats.length > 0 ? (
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={INPUT}>
              {cats.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          ) : (
            <input value={category} onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Maintenance, Groceries" className={INPUT} />
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Description <span className="text-red-500">*</span></label>
          <input value={form.description} onChange={(e) => set('description', e.target.value)}
            required placeholder={segment === 'household' ? 'e.g. Weekly grocery shop' : 'e.g. Monthly pool service'}
            className={INPUT} />
        </div>

        {/* Amount + Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Amount (AED) <span className="text-red-500">*</span></label>
            <input value={form.amount} onChange={(e) => set('amount', e.target.value)}
              type="number" min="0.01" step="0.01" required placeholder="0.00" className={INPUT} />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Date <span className="text-red-500">*</span></label>
            <DatePicker value={form.date} onChange={(v) => set('date', v)} required className={INPUT} />
          </div>
        </div>

        {/* Vendor (optional) */}
        <div>
          <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">
            Vendor <span className="text-[11px] font-normal text-slate-400">(optional)</span>
          </label>
          <input value={form.vendor} onChange={(e) => set('vendor', e.target.value)}
            placeholder="e.g. Lulu Hypermarket, Clean Masters LLC" className={INPUT} />
        </div>

        <div className="flex justify-end gap-2.5 pt-1 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" icon={RiReceiptLine} loading={isSubmitting}>Log Expense</Button>
        </div>
      </form>
    </Modal>
  );
}
