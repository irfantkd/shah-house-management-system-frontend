import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { AnimatePresence } from 'framer-motion';
import { Fuel, Plus, Trash2, Droplets, TrendingUp, Hash, Wallet, Edit2, ChevronRight } from 'lucide-react';
import PageLoader from '../../../components/ui/PageLoader';
import { useGetQuery, usePostMutation, usePutMutation, useDeleteMutation } from '../../../api/apiSlice';
import { selectCurrentPropertyId } from '../../../store/slices/propertiesSlice';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import EmptyState from '../../../components/ui/EmptyState';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { MotionSwipeableRow } from '../../../components/ui/SwipeableRow';
import { cn } from '../../../utils/cn';
import toast from 'react-hot-toast';

const LOW_THRESHOLD = 5000;

const fmt     = (n) => Number(n).toLocaleString('en-AE', { maximumFractionDigits: 0 });
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const BLANK = {
  date:       new Date().toISOString().split('T')[0],
  liters:     '',
  totalPrice: '',
  mileage:    '',
};

export default function FuelTab({ carId }) {
  const propertyId = useSelector(selectCurrentPropertyId);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const { data: fuelResult, isLoading, isFetching, isError, refetch } = useGetQuery(
    { path: `/cars/${carId}/fuel-logs`, params: { page, limit: PAGE_SIZE } },
    { skip: !carId },
  );
  const logs       = fuelResult?.items ?? [];
  const totalPages = fuelResult?.pages ?? 1;
  const totalCount = fuelResult?.total ?? 0;
  const { data: walletData, refetch: refetchWallet } = useGetQuery(
    { path: '/wallet', params: { propertyId } },
    { skip: !propertyId },
  );
  const { data: carStats } = useGetQuery({ path: `/cars/${carId}/stats` }, { skip: !carId });
  const vehicleBalance = walletData?.vehicle?.balance ?? 0;

  const [addFuelMut]                           = usePostMutation();
  const [updateFuelMut]                        = usePutMutation();
  const [deductWalletMut]                      = usePostMutation();
  const [deleteFuelMut, { isLoading: isDel }]  = useDeleteMutation();

  const [showAdd,      setShowAdd]      = useState(false);
  const [editingLog,   setEditingLog]   = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [form,         setForm]         = useState(BLANK);

  const sorted   = [...logs].sort((a, b) => new Date(b.date) - new Date(a.date));
  const totalL   = carStats?.allTime?.liters    ?? 0;
  const totalAED = carStats?.allTime?.fuel      ?? 0;
  const avgFill  = carStats?.allTime?.avgFill   ?? 0;
  const fillCount = carStats?.allTime?.fillCount ?? 0;

  const byMonth = sorted.reduce((acc, f) => {
    const key = new Date(f.date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    if (!acc[key]) acc[key] = { logs: [], totalL: 0, totalAED: 0 };
    acc[key].logs.push(f);
    acc[key].totalL   += f.liters || 0;
    acc[key].totalAED += f.totalPrice || 0;
    return acc;
  }, {});

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openAdd = () => { setEditingLog(null); setForm(BLANK); setShowAdd(true); };
  const openEdit = (log) => {
    setEditingLog(log);
    setForm({
      date:       log.date       ? log.date.split('T')[0] : new Date().toISOString().split('T')[0],
      liters:     log.liters     ?? '',
      totalPrice: log.totalPrice ?? '',
      mileage:    log.mileage    ?? '',
    });
    setShowAdd(true);
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!form.totalPrice) return toast.error('Enter total price');
    const totalPrice = Number(form.totalPrice);
    const liters     = form.liters  ? Number(form.liters)  : undefined;
    const mileage    = form.mileage ? Number(form.mileage) : undefined;
    try {
      if (editingLog) {
        await updateFuelMut({
          path: `/cars/${carId}/fuel-logs/${editingLog.id ?? editingLog._id}`,
          body: { date: form.date, totalPrice, liters, mileage },
        }).unwrap();
        toast.success('Fuel log updated — wallet balance adjusted');
      } else {
        const carData = await addFuelMut({
          path: `/cars/${carId}/fuel-logs`,
          body: { date: form.date, totalPrice, liters, mileage },
        }).unwrap();
        const sourceId = carData.data?.fuelLogs?.[0]?.id ?? carData.data?.fuelLogs?.[0]?._id ?? '';
        await deductWalletMut({
          path: '/wallet/deduct',
          body: { propertyId, walletType: 'vehicle', amount: totalPrice, description: `Fuel${liters ? ` — ${liters}L` : ''}`, date: form.date, category: 'Fuel', carId, sourceId },
        }).unwrap();
        await refetchWallet();
        toast.success('Fuel logged & deducted from Vehicle Wallet');
      }
      await refetch();
      setShowAdd(false);
      setEditingLog(null);
      setForm(BLANK);
      setPage(1);
    } catch (err) { toast.error(err.data?.error || 'Failed to save fuel log'); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteFuelMut({ path: `/cars/${carId}/fuel-logs/${deleteConfirm.id ?? deleteConfirm._id}` }).unwrap();
      await Promise.all([refetch(), refetchWallet()]);
      toast.success('Fuel log removed — wallet refunded');
      setDeleteConfirm(null);
    } catch { toast.error('Failed to remove fuel log'); setDeleteConfirm(null); }
  };

  if (isLoading) return <PageLoader icon={Fuel} text="Loading fuel logs…" className="py-16" />;

  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600 font-semibold mb-1">Failed to load fuel logs</p>
        <button onClick={refetch} className="text-[12px] text-accent-600 hover:underline">Try again</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Vehicle Wallet Banner */}
      <VehicleWalletBanner balance={vehicleBalance} transactions={walletData?.vehicle?.transactions} />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Liters',  value: totalL > 0 ? `${totalL.toFixed(1)} L` : '—',  icon: Droplets,   color: '#0891b2', bg: '#ecfeff' },
          { label: 'Total Spent',   value: `AED ${fmt(totalAED)}`,                          icon: Fuel,       color: '#d97706', bg: '#fffbeb' },
          { label: 'Avg per Fill',  value: `AED ${avgFill.toFixed(0)}`,                    icon: TrendingUp, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Fill-ups',      value: totalCount,                                      icon: Hash,       color: '#0b1d3a', bg: '#f0f5ff' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-4" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5" style={{ background: s.bg }}>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <p className="text-[17px] font-bold text-slate-900 leading-tight">{s.value}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Add button */}
      <div className="flex justify-end">
        <Button icon={Plus} size="sm" onClick={openAdd}>Log Fuel Fill</Button>
      </div>

      {/* Fuel logs grouped by month */}
      {sorted.length === 0 ? (
        <EmptyState icon={Fuel} title="No fuel logs yet"
          description="Log your first fuel fill-up to track monthly cost."
          action={openAdd} actionLabel="Log Fuel Fill" />
      ) : (
        <div className="space-y-6">
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide px-1 sm:hidden">
            ← Swipe row to edit or delete →
          </p>
          {Object.entries(byMonth).map(([month, data]) => (
            <div key={month}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-bold text-slate-800">{month}</p>
                <div className="flex items-center gap-4">
                  {data.totalL > 0 && (
                    <span className="flex items-center gap-1.5 text-[12px] text-slate-500">
                      <Droplets className="w-3.5 h-3.5 text-cyan-500" />{data.totalL.toFixed(1)} L
                    </span>
                  )}
                  <span className="text-[12px] font-bold text-slate-800">AED {fmt(data.totalAED)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {data.logs.map((log, i) => (
                    <MotionSwipeableRow
                      key={log.id ?? log._id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ delay: i * 0.02 }}
                      className="rounded-2xl overflow-hidden"
                      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                      onSwipeRight={() => openEdit(log)}
                      onSwipeLeft={() => setDeleteConfirm(log)}
                      leftIcon={<Edit2 style={{ color: '#2563eb', width: 18, height: 18 }} />}
                      leftLabel="Edit" leftBg="#eff6ff" leftColor="#2563eb"
                      rightIcon={<Trash2 style={{ color: '#dc2626', width: 18, height: 18 }} />}
                      rightLabel="Delete" rightBg="#fef2f2" rightColor="#dc2626"
                    >
                      <div className="bg-white p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                          <Fuel className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-slate-700">{fmtDate(log.date)}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[11px] text-slate-400">
                            {log.liters  ? <span>{log.liters} L filled</span> : null}
                            {log.mileage ? <span>{Number(log.mileage).toLocaleString()} km</span> : null}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[15px] font-bold text-amber-700">AED {Number(log.totalPrice).toFixed(0)}</p>
                        </div>
                        <div className="hidden sm:flex items-center gap-1 shrink-0">
                          <button onClick={() => openEdit(log)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-all">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteConfirm(log)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </MotionSwipeableRow>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))}
          {totalPages > 1 && (
            <PaginationBar page={page} pages={totalPages} total={totalCount} isFetching={isFetching} onPage={setPage} />
          )}
        </div>
      )}

      {/* Add / Edit Fuel Modal */}
      <Modal
        open={showAdd}
        onClose={() => { setShowAdd(false); setEditingLog(null); setForm(BLANK); }}
        title={editingLog ? 'Edit Fuel Log' : 'Log Fuel Fill-up'}
        subtitle={editingLog ? 'Update fill-up details — wallet balance will be adjusted' : 'Total price deducted from Vehicle Wallet'}>
        <form onSubmit={handleSubmit} className="space-y-4">

          {!editingLog && <VehicleWalletPanel balance={vehicleBalance} deduction={Number(form.totalPrice) || 0} />}

          <div>
            <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Date *</label>
            <input value={form.date} onChange={(e) => setField('date', e.target.value)} type="date" required className={INPUT} />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Total Price (AED) *</label>
            <input value={form.totalPrice} onChange={(e) => setField('totalPrice', e.target.value)}
              type="number" min="0" step="0.01" required placeholder="e.g. 220" className={INPUT} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Liters Filled <span className="font-normal text-slate-400">(optional)</span></label>
              <input value={form.liters} onChange={(e) => setField('liters', e.target.value)}
                type="number" min="0" step="0.01" placeholder="e.g. 65" className={INPUT} />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 mb-1.5">Odometer (km) <span className="font-normal text-slate-400">(optional)</span></label>
              <input value={form.mileage} onChange={(e) => setField('mileage', e.target.value)}
                type="number" min="0" placeholder="e.g. 45200" className={INPUT} />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-1">
            <Button variant="outline" type="button"
              onClick={() => { setShowAdd(false); setEditingLog(null); setForm(BLANK); }}>Cancel</Button>
            <Button type="submit" icon={editingLog ? Edit2 : Plus}>
              {editingLog ? 'Save Changes' : 'Log Fill-up'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        loading={isDel}
        title="Remove Fuel Log"
        message={deleteConfirm ? `Remove fuel log from ${fmtDate(deleteConfirm.date)} (AED ${Number(deleteConfirm.totalPrice).toFixed(0)})? The amount will be refunded to the Vehicle Wallet.` : ''}
        confirmLabel="Remove & Refund"
      />
    </div>
  );
}

const INPUT = 'w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] text-slate-700 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500';

function PaginationBar({ page, pages, total, isFetching, onPage }) {
  if (pages <= 1) return null;
  const nums = getPagNums(page, pages);
  return (
    <div className="flex items-center justify-between px-1 pt-2">
      <p className="text-[11px] text-slate-400 tabular-nums">{total} total · Page {page}/{pages}</p>
      <div className="flex items-center gap-1">
        <PagBtn disabled={page === 1 || isFetching} onClick={() => onPage(1)}>«</PagBtn>
        <PagBtn disabled={page === 1 || isFetching} onClick={() => onPage(page - 1)}>‹</PagBtn>
        {nums.map((n, idx) => n === '…' ? (
          <span key={`ellipsis-${idx}`} className="w-7 text-center text-[11px] text-slate-400">…</span>
        ) : (
          <button key={n} onClick={() => onPage(n)} disabled={isFetching}
            className={`w-7 h-7 rounded-lg text-[12px] font-bold transition-all ${n === page ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 disabled:opacity-40'}`}>
            {n}
          </button>
        ))}
        <PagBtn disabled={page === pages || isFetching} onClick={() => onPage(page + 1)}>›</PagBtn>
        <PagBtn disabled={page === pages || isFetching} onClick={() => onPage(pages)}>»</PagBtn>
      </div>
    </div>
  );
}
function PagBtn({ onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-7 h-7 rounded-lg text-[12px] font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
      {children}
    </button>
  );
}
function getPagNums(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const nums = new Set([1, pages, page]);
  if (page > 1) nums.add(page - 1);
  if (page < pages) nums.add(page + 1);
  const sorted = [...nums].sort((a, b) => a - b);
  const result = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) result.push('…');
    result.push(n);
  });
  return result;
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
      <div className="border-t border-white/8">
        {txns.length === 0 ? (
          <p className="px-5 py-4 text-[11px] text-white/30 text-center">No transactions yet — log a fuel fill-up to get started</p>
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
        <p className={cn('text-[32px] font-black leading-none tracking-tight', isNeg ? 'text-red-300' : 'text-white')}>
          {isNeg ? `− AED ${fmt(Math.abs(balance))}` : `AED ${fmt(balance)}`}
        </p>
        <p className="text-[11px] text-white/35 mt-1.5 font-medium">Current Balance</p>
      </div>
      {deduction > 0 && (
        <div className="px-5 py-3 border-t border-white/8 bg-black/12 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-white/45">This fill-up</span>
          <span className="text-[13px] font-bold text-red-300">− AED {fmt(deduction)}</span>
        </div>
      )}
    </div>
  );
}
