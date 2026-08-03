import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  RiAddLine, RiEditLine, RiDeleteBinLine, RiFileTextLine,
  RiAlertLine, RiArrowRightLine, RiCalendarLine, RiTimeLine,
  RiRefreshLine, RiCheckLine, RiWalletLine, RiBuilding2Line,
  RiListCheck2, RiMoneyDollarCircleLine, RiHistoryLine,
  RiCloseLine, RiAddCircleLine,
} from 'react-icons/ri';
import { useGetQuery, usePostMutation, usePutMutation, useDeleteMutation } from '../../api/apiSlice';
import { selectCurrentPropertyId } from '../../store/slices/propertiesSlice';
import { CATEGORY_CFG } from '../../data/mockCompanies';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Field, Input, Select, Textarea, FormGrid, FormSection, FormActions } from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import { cn } from '../../utils/cn';

const COST_PERIODS = ['monthly', 'quarterly', 'bi-annual', 'annual', 'one-time'];
const STATUS_OPTS  = ['active', 'expiring', 'expired'];

const CAT_HEX = {
  'Climate / AC':      '#2563eb',
  'Pool & Water':      '#0891b2',
  'Garden':            '#16a34a',
  'Cleaning':          '#9333ea',
  'Security / CCTV':   '#1e3a6e',
  'Electrical':        '#d97706',
  'Plumbing':          '#1d4ed8',
  'Pest Control':      '#ea580c',
  'Painting':          '#e11d48',
  'Power / Generator': '#ca8a04',
};
const catColor = (cat) => CAT_HEX[cat] ?? '#0b1d3a';

const STATUS_CFG = {
  active:   { hex:'#16a34a', bg:'rgba(22,163,74,0.14)',  color:'#86efac', border:'1px solid rgba(22,163,74,0.25)',  label:'Active'   },
  expiring: { hex:'#d97706', bg:'rgba(217,119,6,0.14)',  color:'#fbbf24', border:'1px solid rgba(217,119,6,0.25)',  label:'Expiring' },
  expired:  { hex:'#dc2626', bg:'rgba(220,38,38,0.18)',  color:'#fca5a5', border:'1px solid rgba(220,38,38,0.30)',  label:'Expired'  },
};

const inits = (str) => {
  if (!str) return '??';
  const parts = str.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0]+parts[1][0]).toUpperCase() : str.substring(0,2).toUpperCase();
};

function daysUntil(dateStr) {
  return Math.ceil((new Date(dateStr+'T00:00:00') - new Date()) / 86400000);
}

function nextPaymentDate(lastPaidDate, costPeriod) {
  if (!lastPaidDate || costPeriod === 'one-time') return null;
  const d = new Date(lastPaidDate + 'T00:00:00');
  switch (costPeriod) {
    case 'monthly':   d.setMonth(d.getMonth() + 1);       break;
    case 'quarterly': d.setMonth(d.getMonth() + 3);       break;
    case 'bi-annual': d.setMonth(d.getMonth() + 6);       break;
    case 'annual':
    case 'yearly':    d.setFullYear(d.getFullYear() + 1); break;
    default:          d.setMonth(d.getMonth() + 1);       break;
  }
  return d.toISOString().split('T')[0];
}

const REOPEN_DAYS = 10;

function calcPayStatus(contract) {
  if (!contract.lastPaidDate) return { state: 'unpaid', nextDue: null, daysUntilDue: null };
  if (contract.costPeriod === 'one-time') return { state: 'paid-onetime', nextDue: null, daysUntilDue: null };
  const nextDue = nextPaymentDate(contract.lastPaidDate, contract.costPeriod);
  if (!nextDue) return { state: 'paid-onetime', nextDue: null, daysUntilDue: null };
  const d = daysUntil(nextDue);
  if (d < 0)            return { state: 'overdue',  nextDue, daysUntilDue: d };
  if (d <= REOPEN_DAYS) return { state: 'due-soon', nextDue, daysUntilDue: d };
  return                       { state: 'paid',      nextDue, daysUntilDue: d };
}

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str+'T00:00:00').toLocaleDateString('en-AE',{day:'numeric',month:'short',year:'numeric'});
}
const fmt = (n) => (n ?? 0).toLocaleString('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export default function ContractsPage() {
  const propertyId = useSelector(selectCurrentPropertyId);

  const [filter,      setFilter]      = useState('all');
  const [page,        setPage]        = useState(1);
  const [modal,       setModal]       = useState(null);
  const [delTarget,   setDelTarget]   = useState(null);
  const [payTarget,   setPayTarget]   = useState(null);
  const [renewTarget, setRenewTarget] = useState(null);

  useEffect(() => { setPage(1); }, [filter]);

  const { data: contractData, isFetching: isContractFetching } = useGetQuery(
    {
      path: '/contracts',
      params: {
        propertyId,
        page,
        limit: 10,
        ...(filter !== 'all' && { status: filter }),
      },
    },
    { skip: !propertyId },
  );
  const { data: contractStats = {} } = useGetQuery(
    { path: '/contracts/stats', params: { propertyId } },
    { skip: !propertyId },
  );
  const { data: companies  = [] } = useGetQuery({ path: '/companies' });
  const { data: allTasks   = [] } = useGetQuery({ path: '/tasks',  params: { propertyId } }, { skip: !propertyId });
  const { data: walletData, refetch: refetchWallet } = useGetQuery({ path: '/wallet', params: { propertyId } }, { skip: !propertyId });

  const homeWallet    = { balance: walletData?.home?.balance    ?? 0 };
  const vehicleWallet = { balance: walletData?.vehicle?.balance ?? 0 };

  const [addContractMut]    = usePostMutation();
  const [updateContractMut] = usePutMutation();
  const [deleteContractMut] = useDeleteMutation();
  const [payMut]            = usePostMutation();
  const [renewMut]          = usePostMutation();

  const contracts     = contractData?.items ?? (Array.isArray(contractData) ? contractData : []);
  const totalPages    = contractData?.pages ?? 1;
  const totalContracts = contractData?.total ?? contracts.length;

  const stats = {
    total:        contractStats.total        ?? totalContracts,
    active:       contractStats.active       ?? 0,
    expiring:     contractStats.expiring     ?? 0,
    expired:      contractStats.expired      ?? 0,
    totalMonthly: contractStats.totalMonthly ?? 0,
  };
  const expiringCount = stats.expiring;

  const handlePay = async ({ contract, walletType, amount, note }) => {
    try {
      await payMut({ path: `/contracts/${contract.id}/pay`, body: {
        propertyId, walletType, amount: parseFloat(amount) || contract.cost, note,
      }}).unwrap();
      await refetchWallet();
      toast.success(`AED ${fmt(parseFloat(amount) || contract.cost)} paid from ${walletType === 'home' ? 'Home' : 'Vehicle'} Wallet`);
      setPayTarget(null);
    } catch (err) { toast.error(err.data?.error || 'Payment failed'); }
  };

  const handleRenew = async ({ contract, newEndDate, newCost, note }) => {
    try {
      await renewMut({ path: `/contracts/${contract.id}/renew`, body: { newEndDate, newCost: newCost ? parseFloat(newCost) : undefined, note } }).unwrap();
      toast.success('Contract renewed successfully');
      setRenewTarget(null);
    } catch (err) { toast.error(err.data?.error || 'Renewal failed'); }
  };

  return (
    <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.3 }} className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Contracts</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">{stats.total} service contracts · track renewals and payments</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
            <RiWalletLine className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-[12px] font-bold text-emerald-700">AED {fmt(homeWallet.balance)}</span>
            <span className="text-[10px] text-emerald-500 hidden sm:inline">Home</span>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-accent-50 border border-accent-200">
            <RiWalletLine className="w-3.5 h-3.5 text-accent-600 shrink-0" />
            <span className="text-[12px] font-bold text-accent-700">AED {fmt(vehicleWallet.balance)}</span>
            <span className="text-[10px] text-accent-500 hidden sm:inline">Vehicle</span>
          </div>
          <Button variant="primary" icon={RiAddLine} onClick={() => setModal('add')}>New Contract</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:'Total',         value:stats.total,    grad:'from-navy-600 to-navy-800',       Icon:RiFileTextLine           },
          { label:'Active',        value:stats.active,   grad:'from-success-500 to-success-700', Icon:RiCheckLine              },
          { label:'Expiring Soon', value:stats.expiring, grad:'from-warning-500 to-orange-600',  Icon:RiTimeLine               },
          { label:'Monthly Est.',  value:`AED ${Math.round(stats.totalMonthly).toLocaleString()}`, grad:'from-accent-500 to-accent-700', Icon:RiWalletLine },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.07 }}
            className={cn('rounded-2xl p-5 text-white flex items-center gap-4 bg-linear-to-br', s.grad)}>
            <s.Icon className="w-8 h-8 opacity-75 shrink-0" />
            <div>
              <p className="text-2xl font-bold leading-none">{s.value}</p>
              <p className="text-[12px] text-white/70 mt-1">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Expiring alert */}
      {expiringCount > 0 && (
        <div className="flex items-center gap-3 bg-warning-50 border border-warning-200 rounded-2xl px-5 py-4">
          <RiAlertLine className="w-5 h-5 text-warning-600 shrink-0" />
          <p className="text-[13px] font-semibold text-warning-800 flex-1">
            {expiringCount} contract{expiringCount > 1 ? 's' : ''} expiring soon — review and renew before service lapses.
          </p>
          <button onClick={() => setFilter('expiring')} className="text-[12px] font-bold text-warning-700 hover:underline">View →</button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[['all','All'], ['active','Active'], ['expiring','Expiring'], ['expired','Expired']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold whitespace-nowrap border transition-all',
              filter === v ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300')}>
            {l}
            <span className={cn('text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center',
              filter === v ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500')}>
              {v === 'all' ? stats.total : (stats[v] ?? 0)}
            </span>
          </button>
        ))}
      </div>

      {/* Cards */}
      {contracts.length === 0 && !isContractFetching ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <RiFileTextLine className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-400">No contracts found</p>
          <button onClick={() => setModal('add')} className="mt-3 text-accent-600 text-[13px] font-semibold hover:underline">+ Add first contract</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" style={{ opacity: isContractFetching ? 0.6 : 1, transition: 'opacity 0.2s' }}>
          <AnimatePresence mode="popLayout">
            {contracts.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, scale:0.96 }} transition={{ delay:i*0.04 }}>
                <ContractCard contract={c} companies={companies} allTasks={allTasks}
                  onEdit={() => setModal(c)} onDelete={() => setDelTarget(c)}
                  onPay={() => setPayTarget(c)} onRenew={() => setRenewTarget(c)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <PaginationBar page={page} pages={totalPages} total={totalContracts} isFetching={isContractFetching} onPage={setPage} />
      )}

      <ContractModal open={modal !== null} contract={modal !== 'add' ? modal : null} companies={companies}
        onClose={() => setModal(null)}
        onSave={async (data) => {
          try {
            if (modal !== 'add') {
              await updateContractMut({ path: `/contracts/${modal.id}`, body: data }).unwrap();
              toast.success('Contract updated');
            } else {
              await addContractMut({ path: '/contracts', body: { ...data, propertyId } }).unwrap();
              toast.success('Contract added');
            }
            setModal(null);
          } catch (err) { toast.error(err.data?.error || 'Failed to save'); }
        }}
      />

      <ConfirmDialog open={!!delTarget} onClose={() => setDelTarget(null)}
        onConfirm={async () => {
          try {
            await deleteContractMut({ path: `/contracts/${delTarget.id}` }).unwrap();
            toast.success('Contract deleted');
            setDelTarget(null);
          } catch (err) { toast.error(err.data?.error || 'Failed to delete'); }
        }}
        title="Delete Contract" message={`Delete "${delTarget?.title}"? This cannot be undone.`}
      />

      <PayModal open={!!payTarget} contract={payTarget}
        homeBalance={homeWallet.balance} vehicleBalance={vehicleWallet.balance}
        onClose={() => setPayTarget(null)} onPay={handlePay} />

      <RenewModal open={!!renewTarget} contract={renewTarget}
        onClose={() => setRenewTarget(null)} onRenew={handleRenew} />
    </motion.div>
  );
}

function PaginationBar({ page, pages, total, isFetching, onPage }) {
  if (pages <= 1) return null;
  const nums = getPagNums(page, pages);
  return (
    <div className="flex items-center justify-between px-5 py-3 border border-slate-100 bg-slate-50/40 rounded-2xl">
      <p className="text-[11px] text-slate-400 tabular-nums">{total} total · Page {page}/{pages}</p>
      <div className="flex items-center gap-1">
        <PagBtn disabled={page === 1 || isFetching} onClick={() => onPage(1)}>«</PagBtn>
        <PagBtn disabled={page === 1 || isFetching} onClick={() => onPage(page - 1)}>‹</PagBtn>
        {nums.map((n, idx) => n === '…' ? (
          <span key={`e-${idx}`} className="w-7 text-center text-[11px] text-slate-400">…</span>
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
function PagBtn({ disabled, onClick, children }) {
  return (
    <button disabled={disabled} onClick={onClick}
      className="w-7 h-7 rounded-lg text-[13px] font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition-all">
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

function ContractCard({ contract: c, companies, allTasks, onEdit, onDelete, onPay, onRenew }) {
  const company    = companies?.find((co) => co.id === c.companyId);
  const color      = catColor(company?.category ?? c.category ?? '');
  const sCfg       = STATUS_CFG[c.status] ?? STATUS_CFG.active;
  const days       = c.endDate ? daysUntil(c.endDate) : null;
  const ci         = inits(c.title);
  const taskCount  = (allTasks ?? []).filter((t) => t.contractId === c.id).length;
  const overdueCount = (allTasks ?? []).filter((t) => t.contractId === c.id && t.status === 'overdue').length;
  const payStatus  = calcPayStatus(c);

  return (
    <div className="group rounded-3xl overflow-hidden bg-white flex flex-col"
      style={{ boxShadow:'0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(11,29,58,0.10)' }}>

      {/* HEADER */}
      <div className="relative px-5 pt-4 pb-4 overflow-hidden"
        style={{ background:'linear-gradient(150deg, #0a172e 0%, #0c1f3f 55%, #0e2550 100%)' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:sCfg.hex, zIndex:2 }} />
        <div style={{ position:'absolute', top:-36, right:-36, width:130, height:130, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.06)', pointerEvents:'none', zIndex:1 }} />
        <div style={{ position:'absolute', top:-18, right:-18, width:80,  height:80,  borderRadius:'50%', border:'1px solid rgba(255,255,255,0.09)', pointerEvents:'none', zIndex:1 }} />
        <div style={{ position:'absolute', right:8, bottom:-4, fontSize:70, fontWeight:900, lineHeight:1, color:'rgba(255,255,255,0.04)', letterSpacing:'-3px', userSelect:'none', pointerEvents:'none', zIndex:1 }}>{ci}</div>
        <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-[11px] font-bold"
          style={{ background:sCfg.bg, color:sCfg.color, border:sCfg.border, zIndex:10 }}>{sCfg.label}</div>
        <div className="relative flex items-center gap-3.5 mt-1" style={{ zIndex:5 }}>
          <div className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center text-[17px] font-black text-white select-none"
            style={{ background:`${color}28`, border:'2.5px solid rgba(255,255,255,0.13)', boxShadow:`0 4px 20px ${color}40` }}>
            {ci}
          </div>
          <div className="min-w-0 flex-1 pr-10">
            <p className="text-[15px] font-black text-white leading-snug line-clamp-2">{c.title}</p>
            <p className="text-[11px] font-semibold mt-0.5" style={{ color:'rgba(255,255,255,0.42)' }}>
              {c.companyName || '—'}{c.category ? ` · ${c.category}` : ''}
            </p>
          </div>
        </div>
        <div className="absolute bottom-3.5 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ zIndex:10 }}>
          <button onClick={onEdit}
            className="w-7 h-7 rounded-xl flex items-center justify-center border transition-all"
            style={{ color:'rgba(255,255,255,0.6)', borderColor:'rgba(255,255,255,0.12)', background:'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.background='rgba(255,255,255,0.12)'; e.currentTarget.style.color='#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(255,255,255,0.6)'; }}>
            <RiEditLine className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete}
            className="w-7 h-7 rounded-xl flex items-center justify-center border transition-all"
            style={{ color:'rgba(255,255,255,0.6)', borderColor:'rgba(255,255,255,0.12)', background:'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.background='rgba(239,68,68,0.22)'; e.currentTarget.style.color='#fca5a5'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(255,255,255,0.6)'; }}>
            <RiDeleteBinLine className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 flex flex-col px-5 pt-4 pb-4 gap-3">

        {/* date range */}
        <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
          <RiCalendarLine className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <span>{fmtDate(c.startDate)}</span>
          <span className="text-slate-300">→</span>
          <span className="font-medium">{fmtDate(c.endDate)}</span>
        </div>

        {/* company link */}
        {(company || c.companyName) && (
          <div className="flex items-center gap-2 text-[12px] text-slate-600">
            <RiBuilding2Line className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            {company
              ? <Link to={`/companies/${company.id}`} className="font-medium truncate hover:text-navy-700 transition-colors">{company.name}</Link>
              : <span className="font-medium truncate">{c.companyName}</span>
            }
          </div>
        )}

        {/* days remaining */}
        {days !== null && (
          <div className={cn('inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-xl text-[11px] font-bold',
            days < 0   ? 'bg-danger-50 text-danger-600' :
            days < 30  ? 'bg-warning-50 text-warning-600' :
            days < 90  ? 'bg-amber-50 text-amber-600' :
                         'bg-success-50 text-success-600')}>
            <RiTimeLine className="w-3 h-3" />
            {days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days} days left`}
          </div>
        )}

        {/* payment summary + status */}
        {(c.totalPaid ?? 0) > 0 && (
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <RiHistoryLine className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <span>Paid: <strong className="text-slate-700">AED {fmt(c.totalPaid)}</strong></span>
            {c.lastPaidDate && <span className="text-slate-400">· {fmtDate(c.lastPaidDate)}</span>}
          </div>
        )}

        {/* next-payment / due-soon / overdue pill */}
        {payStatus.state === 'paid' && (
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-xl self-start">
            <RiCheckLine className="w-3 h-3" />
            Paid · next in {payStatus.daysUntilDue}d
          </div>
        )}
        {payStatus.state === 'paid-onetime' && (
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-xl self-start">
            <RiCheckLine className="w-3 h-3" /> One-time paid
          </div>
        )}
        {payStatus.state === 'due-soon' && (
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl self-start">
            <RiTimeLine className="w-3 h-3" />
            Due in {payStatus.daysUntilDue === 0 ? 'today' : `${payStatus.daysUntilDue}d`} · {fmtDate(payStatus.nextDue)}
          </div>
        )}
        {payStatus.state === 'overdue' && (
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-xl self-start">
            <RiAlertLine className="w-3 h-3" />
            Payment {Math.abs(payStatus.daysUntilDue)}d overdue
          </div>
        )}

        {c.autoRenew && (
          <div className="flex items-center gap-1.5 text-[11px] text-accent-600 font-semibold">
            <RiRefreshLine className="w-3.5 h-3.5" /> Auto-renews
          </div>
        )}

        {taskCount > 0 && (
          <div className="flex items-center gap-1.5">
            <div className={cn('flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-xl',
              overdueCount > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500')}>
              <RiListCheck2 className="w-3 h-3" />
              {taskCount} task{taskCount !== 1 ? 's' : ''}
              {overdueCount > 0 && <span className="text-red-500 font-bold"> · {overdueCount} overdue</span>}
            </div>
          </div>
        )}

        <div className="flex-1" />

        {/* footer: cost + actions */}
        <div className="border-t border-slate-100 pt-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Contract Value</p>
            <p className="text-[13px] font-bold" style={{ color:'#0b1d3a' }}>
              AED {fmt(c.cost)} <span className="text-[11px] text-slate-400 font-normal">/ {c.costPeriod}</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Pay button — state-aware */}
            {(payStatus.state === 'paid' || payStatus.state === 'paid-onetime') ? (
              <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold cursor-default select-none"
                style={{ background:'rgba(22,163,74,0.08)', color:'rgba(22,163,74,0.55)' }}
                title={payStatus.state === 'paid' ? `Next payment due ${fmtDate(payStatus.nextDue)}` : 'One-time payment complete'}>
                <RiCheckLine className="w-3.5 h-3.5" /> Paid
              </span>
            ) : payStatus.state === 'due-soon' ? (
              <button onClick={onPay}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all"
                style={{ background:'rgba(217,119,6,0.12)', color:'#d97706' }}
                onMouseEnter={(e) => { e.currentTarget.style.background='rgba(217,119,6,0.22)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background='rgba(217,119,6,0.12)'; }}>
                <RiMoneyDollarCircleLine className="w-3.5 h-3.5" />
                Pay · {payStatus.daysUntilDue === 0 ? 'Today' : `${payStatus.daysUntilDue}d`}
              </button>
            ) : payStatus.state === 'overdue' ? (
              <button onClick={onPay}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all"
                style={{ background:'rgba(220,38,38,0.10)', color:'#dc2626' }}
                onMouseEnter={(e) => { e.currentTarget.style.background='rgba(220,38,38,0.18)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background='rgba(220,38,38,0.10)'; }}>
                <RiMoneyDollarCircleLine className="w-3.5 h-3.5" /> Pay!
              </button>
            ) : (
              /* unpaid — always show pay unless contract is expired with no pending payment */
              <button onClick={onPay}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all"
                style={{ background:'rgba(22,163,74,0.10)', color:'#16a34a' }}
                onMouseEnter={(e) => { e.currentTarget.style.background='rgba(22,163,74,0.18)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background='rgba(22,163,74,0.10)'; }}>
                <RiMoneyDollarCircleLine className="w-3.5 h-3.5" /> Pay
              </button>
            )}
            <button onClick={onRenew}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all"
              style={{ background:'rgba(37,99,235,0.08)', color:'#2563eb' }}
              onMouseEnter={(e) => { e.currentTarget.style.background='rgba(37,99,235,0.16)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background='rgba(37,99,235,0.08)'; }}>
              <RiRefreshLine className="w-3.5 h-3.5" />Renew
            </button>
            <Link to={`/contracts/${c.id}`}
              className="flex items-center gap-1 text-[12px] font-bold text-slate-400 hover:text-navy-800 transition-colors">
              View <RiArrowRightLine className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PAY MODAL ────────────────────────────────────────────────────────────────
function PayModal({ open, contract: c, homeBalance, vehicleBalance, onClose, onPay }) {
  const [walletType, setWalletType] = useState('home');
  const [amount, setAmount]         = useState('');
  const [note, setNote]             = useState('');
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    if (!open || !c) return;
    setWalletType('home');
    setAmount(c.cost ? String(c.cost) : '');
    setNote('');
    setLoading(false);
  }, [open, c]);

  if (!open || !c) return null;

  const currentBal  = walletType === 'home' ? homeBalance : vehicleBalance;
  const amt         = parseFloat(amount) || 0;
  const remaining   = currentBal - amt;

  const wallets = [
    { k:'home',    label:'Home Wallet',    bal:homeBalance    },
    { k:'vehicle', label:'Vehicle Wallet', bal:vehicleBalance },
  ];

  const handleSubmit = async () => {
    if (!amt) return toast.error('Enter a payment amount');
    setLoading(true);
    await onPay({ contract: c, walletType, amount: amt, note });
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={onClose} size="sm" title="Pay Contract" subtitle={c.title}>
      <div className="space-y-5">

        {/* Wallet selector */}
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Deduct from Wallet</p>
          <div className="grid grid-cols-2 gap-2">
            {wallets.map(({ k, label, bal }) => {
              const active = walletType === k;
              return (
                <button key={k} type="button" onClick={() => setWalletType(k)}
                  className="rounded-xl border-2 p-3 text-left transition-all"
                  style={{
                    borderColor: active ? '#16a34a' : '#e2e8f0',
                    background:  active ? 'rgba(22,163,74,0.06)' : '#fff',
                  }}>
                  <p className="text-[11px] font-bold text-slate-500 mb-1">{label}</p>
                  <p className={cn('text-[14px] font-black', bal < 0 ? 'text-red-600' : 'text-navy-900')}>
                    {bal < 0 ? `− AED ${fmt(Math.abs(bal))}` : `AED ${fmt(bal)}`}
                  </p>
                  {active && <p className="text-[10px] text-emerald-600 font-semibold mt-1">Selected</p>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
            Amount (AED)
          </label>
          <input
            type="number" min="0" step="0.01" value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[14px] font-bold text-navy-900 outline-none focus:ring-2 focus:ring-accent-400"
            placeholder={`Contract value: AED ${fmt(c.cost)}`}
          />
          <p className="text-[11px] text-slate-400 mt-1">Defaults to full contract amount if left blank</p>
        </div>

        {/* Balance preview */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label:'Current Balance', val:`AED ${fmt(currentBal)}`,    red: currentBal < 0 },
            { label:'This Payment',    val:`AED ${fmt(amt)}`,            red: false },
            { label:'After Payment',   val: remaining < 0 ? `− AED ${fmt(Math.abs(remaining))}` : `AED ${fmt(remaining)}`, red: remaining < 0 },
          ].map(({ label, val, red }) => (
            <div key={label} className="text-center bg-slate-50 rounded-xl p-3">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
              <p className={cn('text-[12px] font-black', red ? 'text-red-600' : 'text-navy-900')}>{val}</p>
            </div>
          ))}
        </div>

        {/* Note */}
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Note (optional)</label>
          <input
            type="text" value={note} onChange={(e) => setNote(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] outline-none focus:ring-2 focus:ring-accent-400"
            placeholder="e.g. Q1 payment, invoice #1234"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 h-10 rounded-xl text-white text-[13px] font-bold transition-all disabled:opacity-60"
            style={{ background:'linear-gradient(135deg, #16a34a, #15803d)' }}>
            {loading ? 'Processing…' : `Pay AED ${fmt(amt || c.cost)}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── RENEW MODAL ──────────────────────────────────────────────────────────────
function RenewModal({ open, contract: c, onClose, onRenew }) {
  const [newEndDate, setNewEndDate] = useState('');
  const [newCost, setNewCost]       = useState('');
  const [note, setNote]             = useState('');
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    if (!open || !c) return;
    // suggest 1 year from current end date (or from today if expired)
    const base  = c.endDate && daysUntil(c.endDate) > 0 ? c.endDate : new Date().toISOString().split('T')[0];
    const d     = new Date(base + 'T00:00:00');
    d.setFullYear(d.getFullYear() + 1);
    setNewEndDate(d.toISOString().split('T')[0]);
    setNewCost(c.cost ? String(c.cost) : '');
    setNote('');
    setLoading(false);
  }, [open, c]);

  if (!open || !c) return null;

  const handleSubmit = async () => {
    if (!newEndDate) return toast.error('New end date is required');
    setLoading(true);
    await onRenew({ contract: c, newEndDate, newCost: newCost || undefined, note });
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={onClose} size="sm" title="Renew Contract" subtitle={c.title}>
      <div className="space-y-5">

        {/* Current info */}
        <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Current End Date</p>
            <p className="text-[13px] font-bold text-navy-900">{fmtDate(c.endDate)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Renewal Count</p>
            <p className="text-[13px] font-bold text-navy-900">{c.renewalHistory?.length ?? 0}</p>
          </div>
        </div>

        {/* New end date */}
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">New End Date</label>
          <input type="date" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] font-medium outline-none focus:ring-2 focus:ring-accent-400" />
        </div>

        {/* New cost (optional) */}
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Updated Contract Value (AED)</label>
          <input type="number" min="0" step="0.01" value={newCost} onChange={(e) => setNewCost(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[14px] font-bold text-navy-900 outline-none focus:ring-2 focus:ring-accent-400"
            placeholder={`Keep current: AED ${fmt(c.cost)}`} />
          <p className="text-[11px] text-slate-400 mt-1">Leave blank to keep current value</p>
        </div>

        {/* Note */}
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Note (optional)</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] outline-none focus:ring-2 focus:ring-accent-400"
            placeholder="e.g. Terms renegotiated, new scope added…" />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 h-10 rounded-xl text-white text-[13px] font-bold transition-all disabled:opacity-60"
            style={{ background:'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
            {loading ? 'Renewing…' : 'Renew Contract'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── CONTRACT MODAL (ADD / EDIT) ──────────────────────────────────────────────
function ContractModal({ open, onClose, contract: c, companies, onSave }) {
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm();
  const [services, setServices] = useState([]);
  const [svcInput, setSvcInput] = useState('');

  useEffect(() => {
    if (!open) return;
    reset(c ? {
      title: c.title, companyId: c.companyId ?? '', category: c.category ?? '',
      description: c.description ?? '', startDate: c.startDate, endDate: c.endDate,
      cost: c.cost, costPeriod: c.costPeriod, renewalReminder: c.renewalReminder ?? 30,
      autoRenew: c.autoRenew ? 'true' : 'false', status: c.status, notes: c.notes ?? '',
    } : { costPeriod:'annual', renewalReminder:30, status:'active', autoRenew:'false' });
    setServices(c?.includedServices ?? []);
    setSvcInput('');
  }, [open, c]);

  const cost = watch('cost');

  const addService = () => {
    const v = svcInput.trim();
    if (v && !services.includes(v)) { setServices([...services, v]); setSvcInput(''); }
  };
  const removeService = (s) => setServices(services.filter((x) => x !== s));

  const onSubmit = (d) => {
    const comp = companies.find((co) => co.id === d.companyId);
    onSave({ ...d,
      cost: parseFloat(d.cost) || 0,
      renewalReminder: parseInt(d.renewalReminder) || 30,
      autoRenew: d.autoRenew === 'true',
      companyName: comp?.name ?? c?.companyName ?? '',
      category: comp?.category ?? d.category ?? '',
      includedServices: services,
    });
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title={c ? 'Edit Contract' : 'Add New Contract'} subtitle="Service contract details and renewal settings">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Field label="Contract Title" required error={errors.title?.message}>
          <Input {...register('title', { required:'Required' })} placeholder="e.g. Annual AC Maintenance Contract" />
        </Field>
        <FormGrid>
          <Field label="Service Company" required error={errors.companyId?.message}>
            <Select {...register('companyId', { required:'Required' })} placeholder="Select company"
              options={companies.map((co) => ({ value:co.id, label:co.name }))} />
          </Field>
          <Field label="Status">
            <Select {...register('status')} options={STATUS_OPTS.map((s) => ({ value:s, label:s.charAt(0).toUpperCase()+s.slice(1) }))} />
          </Field>
        </FormGrid>

        <FormSection title="Duration & Cost">
          <FormGrid>
            <Field label="Start Date" required error={errors.startDate?.message}>
              <Input {...register('startDate', { required:'Required' })} type="date" />
            </Field>
            <Field label="End Date" required error={errors.endDate?.message}>
              <Input {...register('endDate', { required:'Required' })} type="date" />
            </Field>
            <Field label="Contract Value (AED)" required error={errors.cost?.message}>
              <Input {...register('cost', { required:'Required' })} type="number" min="0" step="0.01" placeholder="0.00" />
            </Field>
            <Field label="Billing Period">
              <Select {...register('costPeriod')} options={COST_PERIODS.map((p) => ({ value:p, label:p.charAt(0).toUpperCase()+p.slice(1) }))} />
            </Field>
          </FormGrid>
          {parseFloat(cost) > 0 && (
            <div className="flex items-center gap-2 mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <RiWalletLine className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-[12px] text-emerald-700 font-medium">
                Use the "Pay" button on the contract card to deduct AED {parseFloat(cost).toLocaleString()} from a wallet.
              </p>
            </div>
          )}
        </FormSection>

        <FormGrid>
          <Field label="Renewal Reminder (days before)" hint="Days before expiry to notify you">
            <Input {...register('renewalReminder')} type="number" min="0" placeholder="30" />
          </Field>
          <Field label="Auto Renew">
            <Select {...register('autoRenew')} options={[{ value:'false', label:'No — Manual renewal' }, { value:'true', label:'Yes — Auto renew' }]} />
          </Field>
        </FormGrid>

        {/* Included Services */}
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Included Services</p>
          <div className="flex gap-2 mb-2">
            <input
              value={svcInput} onChange={(e) => setSvcInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addService(); } }}
              className="flex-1 h-9 px-3 rounded-xl border border-slate-200 text-[13px] outline-none focus:ring-2 focus:ring-accent-400"
              placeholder="e.g. Filter replacement, Duct cleaning…"
            />
            <button type="button" onClick={addService}
              className="h-9 px-3 rounded-xl bg-accent-600 text-white text-[12px] font-bold flex items-center gap-1 hover:bg-accent-700 transition-colors">
              <RiAddCircleLine className="w-3.5 h-3.5" /> Add
            </button>
          </div>
          {services.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {services.map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-50 border border-accent-200 text-[11px] font-semibold text-accent-700">
                  {s}
                  <button type="button" onClick={() => removeService(s)} className="text-accent-400 hover:text-accent-700">
                    <RiCloseLine className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <Field label="Description">
          <Textarea {...register('description')} rows={2} placeholder="What services does this contract cover?" />
        </Field>
        <Field label="Notes">
          <Textarea {...register('notes')} rows={2} placeholder="Internal notes, terms, conditions…" />
        </Field>
        <FormActions onCancel={onClose} submitLabel={c ? 'Update Contract' : 'Add Contract'} />
      </form>
    </Modal>
  );
}
