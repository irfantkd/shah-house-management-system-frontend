import { useEffect, useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, FileText, Building2, Calendar, DollarSign, RefreshCw,
  CheckCircle2, AlertTriangle, XCircle, Bell, CheckCheck,
  Download, Eye, Trash2, Phone, Mail, MessageCircle, Clock, Wrench, Settings2,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import {
  RiWalletLine, RiHistoryLine, RiMoneyDollarCircleLine, RiRefreshLine,
  RiAddCircleLine, RiCloseLine,
} from 'react-icons/ri';
import { useGetQuery, usePostMutation } from '../../api/apiSlice';
import { selectCurrentPropertyId } from '../../store/slices/propertiesSlice';
import toast from 'react-hot-toast';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { cn } from '../../utils/cn';

const STATUS_CFG = {
  active:   { label: 'Active',   variant: 'success', icon: CheckCircle2, gradient: 'from-success-800 to-success-900' },
  expiring: { label: 'Expiring', variant: 'warning', icon: AlertTriangle, gradient: 'from-warning-700 to-orange-800'  },
  expired:  { label: 'Expired',  variant: 'danger',  icon: XCircle,       gradient: 'from-danger-800 to-red-900'      },
};

function getDays(str) {
  return Math.ceil((new Date(str + 'T00:00:00') - new Date()) / (1000 * 60 * 60 * 24));
}
function fmtDate(str) {
  if (!str) return '—';
  return new Date(str + 'T00:00:00').toLocaleDateString('en-AE', { day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtShort(str) {
  if (!str) return '—';
  return new Date(str + 'T00:00:00').toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' });
}
const fmt = (n) => (n ?? 0).toLocaleString('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
function daysUntil(dateStr) {
  return Math.ceil((new Date(dateStr + 'T00:00:00') - new Date()) / 86400000);
}

// Compute the next payment due date from the last paid date + period
function nextPaymentDate(lastPaidDate, costPeriod) {
  if (!lastPaidDate || costPeriod === 'one-time') return null;
  const d = new Date(lastPaidDate + 'T00:00:00');
  switch (costPeriod) {
    case 'monthly':    d.setMonth(d.getMonth() + 1);       break;
    case 'quarterly':  d.setMonth(d.getMonth() + 3);       break;
    case 'bi-annual':  d.setMonth(d.getMonth() + 6);       break;
    case 'annual':
    case 'yearly':     d.setFullYear(d.getFullYear() + 1); break;
    default:           d.setMonth(d.getMonth() + 1);       break;
  }
  return d.toISOString().split('T')[0];
}

// REOPEN_DAYS: how many days before the next payment due date the Pay button re-enables
const REOPEN_DAYS = 10;

/*
  Payment states:
    'unpaid'       – never paid (no lastPaidDate)
    'paid'         – paid and next due is still > REOPEN_DAYS away
    'due-soon'     – next due within REOPEN_DAYS, payment window open
    'overdue'      – next due date already passed
    'paid-onetime' – one-time contract, already paid
*/
function calcPayStatus(contract) {
  if (!contract.lastPaidDate) return { state: 'unpaid', nextDue: null, daysUntilDue: null };
  if (contract.costPeriod === 'one-time') return { state: 'paid-onetime', nextDue: null, daysUntilDue: null };

  const nextDue = nextPaymentDate(contract.lastPaidDate, contract.costPeriod);
  if (!nextDue) return { state: 'paid-onetime', nextDue: null, daysUntilDue: null };

  const d = daysUntil(nextDue);
  if (d < 0)            return { state: 'overdue',   nextDue, daysUntilDue: d };
  if (d <= REOPEN_DAYS) return { state: 'due-soon',  nextDue, daysUntilDue: d };
  return                       { state: 'paid',       nextDue, daysUntilDue: d };
}

export default function ContractDetail() {
  const { id } = useParams();
  const propertyId = useSelector(selectCurrentPropertyId);

  const { data: contract, isLoading, refetch: refetchContract } = useGetQuery({ path: `/contracts/${id}` });
  const { data: allTasks = [] } = useGetQuery({ path: '/tasks', params: { propertyId } }, { skip: !propertyId });
  const { data: allCompanies = [] } = useGetQuery({ path: '/companies' });
  const { data: walletData, refetch: refetchWallet } = useGetQuery({ path: '/wallet', params: { propertyId } }, { skip: !propertyId });

  const [payMut]   = usePostMutation();
  const [renewMut] = usePostMutation();

  const [activeTab,   setActiveTab]   = useState(0);
  const [showPay,     setShowPay]     = useState(false);
  const [showRenew,   setShowRenew]   = useState(false);

  if (isLoading) return null;
  if (!contract) return <Navigate to="/contracts" replace />;

  const company       = allCompanies.find((c) => c.id === contract.companyId);
  const contractTasks = allTasks.filter((t) => t.contractId === id);

  const homeBalance    = walletData?.home?.balance    ?? 0;
  const vehicleBalance = walletData?.vehicle?.balance ?? 0;

  const st        = STATUS_CFG[contract.status] ?? STATUS_CFG.active;
  const days      = getDays(contract.endDate);
  const payStatus = calcPayStatus(contract);

  const tabs = [
    { label: 'Overview' },
    { label: 'Services Included',  count: (contract.includedServices ?? []).length },
    { label: 'Payment History',    count: (contract.paymentHistory   ?? []).length },
    { label: 'Renewal History',    count: (contract.renewalHistory   ?? []).length },
    { label: 'Tasks',              count: contractTasks.length },
    { label: 'Documents',          count: (contract.documents ?? []).length },
    { label: 'Company Info' },
  ];

  const handlePay = async ({ contract: c, walletType, amount, note }) => {
    try {
      await payMut({ path: `/contracts/${c.id}/pay`, body: {
        propertyId, walletType, amount: parseFloat(amount) || c.cost, note,
      }}).unwrap();
      await refetchWallet();
      await refetchContract();
      toast.success(`AED ${fmt(parseFloat(amount) || c.cost)} paid from ${walletType === 'home' ? 'Home' : 'Vehicle'} Wallet`);
      setShowPay(false);
    } catch (err) { toast.error(err.data?.error || 'Payment failed'); }
  };

  const handleRenew = async ({ contract: c, newEndDate, newCost, note }) => {
    try {
      await renewMut({ path: `/contracts/${c.id}/renew`, body: { newEndDate, newCost: newCost ? parseFloat(newCost) : undefined, note } }).unwrap();
      await refetchContract();
      toast.success('Contract renewed successfully');
      setShowRenew(false);
    } catch (err) { toast.error(err.data?.error || 'Renewal failed'); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
      className="space-y-6"
    >
      {/* Back */}
      <Link to="/contracts" className="inline-flex items-center gap-2 text-[13px] text-slate-500 hover:text-navy-700 transition-colors font-medium">
        <ArrowLeft className="w-4 h-4" />
        Back to Contracts
      </Link>

      {/* Hero */}
      <div
        className="relative rounded-3xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0b1d3a 0%, #1a3360 60%, #0f2855 100%)' }}
      >
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)', backgroundSize: '12px 12px' }} />

        <div className={cn('absolute top-0 left-0 right-0 h-1 rounded-t-3xl', {
          'bg-success-400': contract.status === 'active',
          'bg-warning-400': contract.status === 'expiring',
          'bg-danger-400':  contract.status === 'expired',
        })} />

        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
              <FileText className="w-7 h-7 text-white/80" strokeWidth={1.5} />
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="bg-white/10 text-white/70 text-[11px] font-semibold px-2.5 py-1 rounded-lg">{contract.category}</span>
                <Badge variant={st.variant} size="sm" dot>{st.label}</Badge>
                {contract.autoRenew && (
                  <span className="flex items-center gap-1 bg-success-500/20 text-success-300 text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                    <RefreshCw className="w-3 h-3" /> Auto-Renew
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">{contract.title}</h1>
              <Link to={`/companies/${contract.companyId}`} className="flex items-center gap-2 mt-1 text-white/60 hover:text-white/80 transition-colors group">
                <Building2 className="w-3.5 h-3.5" />
                <span className="text-[13px] font-medium group-hover:underline">{contract.companyName}</span>
              </Link>
            </div>

            <div className="flex gap-2 shrink-0">
              <PayButton payStatus={payStatus} contract={contract} onOpen={() => setShowPay(true)} />
              <button onClick={() => setShowRenew(true)}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-[13px] font-medium px-3.5 py-2 rounded-xl transition-all border border-white/10">
                <RefreshCw className="w-4 h-4" /> Renew
              </button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 border-t border-white/10">
            <div>
              <p className="text-white font-bold text-xl">AED {contract.cost.toLocaleString()}</p>
              <p className="text-white/50 text-[12px] mt-0.5">
                / {({ monthly:'month', quarterly:'quarter', 'bi-annual':'6 months', annual:'year', yearly:'year', 'one-time':'one-time' }[contract.costPeriod] ?? contract.costPeriod)}
              </p>
            </div>
            <div>
              <p className="text-white font-bold text-xl">{fmtShort(contract.startDate)}</p>
              <p className="text-white/50 text-[12px] mt-0.5">Start date</p>
            </div>
            <div>
              <p className="text-white font-bold text-xl">{fmtShort(contract.endDate)}</p>
              <p className="text-white/50 text-[12px] mt-0.5">Expiry date</p>
            </div>
            <div>
              <p className={cn('font-bold text-xl', days < 0 ? 'text-danger-300' : days < 30 ? 'text-warning-300' : 'text-white')}>
                {days > 0 ? `${days} days` : days === 0 ? 'Today' : `${Math.abs(days)}d ago`}
              </p>
              <p className="text-white/50 text-[12px] mt-0.5">{days > 0 ? 'Days remaining' : 'Expired'}</p>
            </div>
          </div>

          {/* Payment status bar */}
          <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-2">
            {/* Totals */}
            {(contract.totalPaid ?? 0) > 0 && (
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex-1">
                <RiWalletLine className="w-4 h-4 text-emerald-400 shrink-0" />
                <p className="text-[12px] text-white/70">
                  Total paid: <strong className="text-white">AED {fmt(contract.totalPaid)}</strong>
                  {contract.lastPaidDate && <> · Last payment: <strong className="text-white">{fmtShort(contract.lastPaidDate)}</strong></>}
                </p>
              </div>
            )}
            {/* Next payment pill */}
            {payStatus.state === 'paid' && (
              <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 rounded-xl px-3.5 py-2.5 text-[12px] font-semibold shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                Next payment in <span className="text-emerald-100 font-black ml-1">{payStatus.daysUntilDue}d</span>
                <span className="text-emerald-300/70 ml-1">· {fmtShort(payStatus.nextDue)}</span>
              </div>
            )}
            {payStatus.state === 'due-soon' && (
              <div className="flex items-center gap-2 bg-amber-500/25 border border-amber-400/40 text-amber-200 rounded-xl px-3.5 py-2.5 text-[12px] font-semibold shrink-0 animate-pulse">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                Payment due in <span className="text-amber-100 font-black mx-1">{payStatus.daysUntilDue} days</span> · {fmtShort(payStatus.nextDue)}
              </div>
            )}
            {payStatus.state === 'overdue' && (
              <div className="flex items-center gap-2 bg-red-500/25 border border-red-400/40 text-red-200 rounded-xl px-3.5 py-2.5 text-[12px] font-semibold shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Payment overdue by <span className="text-red-100 font-black mx-1">{Math.abs(payStatus.daysUntilDue)} days</span>
              </div>
            )}
            {payStatus.state === 'paid-onetime' && (
              <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 rounded-xl px-3.5 py-2.5 text-[12px] font-semibold shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> One-time payment complete
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {contract.status === 'expiring' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-3 p-4 bg-warning-50 border border-warning-200 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-warning-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-semibold text-warning-800">Contract expiring soon</p>
            <p className="text-[12px] text-warning-700 mt-0.5">This contract expires on {fmtDate(contract.endDate)} ({days} days). Contact {contract.companyName} to arrange renewal.</p>
          </div>
          <button onClick={() => setShowRenew(true)} className="ml-auto flex items-center gap-1.5 bg-warning-600 hover:bg-warning-700 text-white text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-all shrink-0">
            <RefreshCw className="w-3.5 h-3.5" /> Renew Now
          </button>
        </motion.div>
      )}
      {contract.status === 'expired' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-3 p-4 bg-danger-50 border border-danger-200 rounded-2xl">
          <XCircle className="w-5 h-5 text-danger-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-semibold text-danger-800">Contract has expired</p>
            <p className="text-[12px] text-danger-700 mt-0.5">This contract expired on {fmtDate(contract.endDate)}. Renew to restore service coverage.</p>
          </div>
          <button onClick={() => setShowRenew(true)} className="ml-auto flex items-center gap-1.5 bg-danger-600 hover:bg-danger-700 text-white text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-all shrink-0">
            <RefreshCw className="w-3.5 h-3.5" /> Renew Now
          </button>
        </motion.div>
      )}

      {/* Payment due-soon alert */}
      {payStatus.state === 'due-soon' && contract.status !== 'expired' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-semibold text-amber-800">Payment due in {payStatus.daysUntilDue} {payStatus.daysUntilDue === 1 ? 'day' : 'days'}</p>
            <p className="text-[12px] text-amber-700 mt-0.5">
              {payStatus.daysUntilDue === 0
                ? 'Payment is due today'
                : `Payment of AED ${fmt(contract.cost)} is due on ${fmtDate(payStatus.nextDue)}`}
            </p>
          </div>
          <button onClick={() => setShowPay(true)} className="ml-auto flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-all shrink-0">
            <DollarSign className="w-3.5 h-3.5" /> Pay Now
          </button>
        </motion.div>
      )}

      {/* Payment overdue alert */}
      {payStatus.state === 'overdue' && contract.status !== 'expired' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-3 p-4 bg-danger-50 border border-danger-200 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-danger-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-semibold text-danger-800">Payment overdue by {Math.abs(payStatus.daysUntilDue)} days</p>
            <p className="text-[12px] text-danger-700 mt-0.5">
              Payment of AED {fmt(contract.cost)} was due on {fmtDate(payStatus.nextDue)}.
            </p>
          </div>
          <button onClick={() => setShowPay(true)} className="ml-auto flex items-center gap-1.5 bg-danger-600 hover:bg-danger-700 text-white text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-all shrink-0">
            <DollarSign className="w-3.5 h-3.5" /> Pay Now
          </button>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center border-b border-slate-100 overflow-x-auto">
          {tabs.map((tab, i) => (
            <button key={tab.label} onClick={() => setActiveTab(i)}
              className={cn('relative flex items-center gap-2 px-5 py-4 text-[13px] font-semibold whitespace-nowrap transition-colors shrink-0',
                activeTab === i ? 'text-navy-800' : 'text-slate-400 hover:text-slate-600')}>
              {tab.label}
              {tab.count !== undefined && (
                <span className={cn('text-[11px] font-bold px-1.5 py-0.5 rounded-md', activeTab === i ? 'bg-navy-100 text-navy-700' : 'bg-slate-100 text-slate-500')}>
                  {tab.count}
                </span>
              )}
              {activeTab === i && (
                <motion.div layoutId="contract-tab-line" className="absolute bottom-0 left-0 right-0 h-0.5 bg-navy-800 rounded-full" />
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="p-6">
            {activeTab === 0 && <OverviewTab contract={contract} />}
            {activeTab === 1 && <ServicesTab services={contract.includedServices ?? []} />}
            {activeTab === 2 && <PaymentHistoryTab payments={contract.paymentHistory ?? []} totalPaid={contract.totalPaid ?? 0} payStatus={payStatus} onPay={() => setShowPay(true)} />}
            {activeTab === 3 && <RenewalHistoryTab renewals={contract.renewalHistory ?? []} onRenew={() => setShowRenew(true)} />}
            {activeTab === 4 && <TasksTab tasks={contractTasks} />}
            {activeTab === 5 && <DocumentsTab docs={contract.documents ?? []} />}
            {activeTab === 6 && <CompanyTab company={company} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Modals */}
      <PayModal open={showPay} contract={contract}
        homeBalance={homeBalance} vehicleBalance={vehicleBalance}
        onClose={() => setShowPay(false)} onPay={handlePay} />
      <RenewModal open={showRenew} contract={contract}
        onClose={() => setShowRenew(false)} onRenew={handleRenew} />
    </motion.div>
  );
}

// ─── PAY BUTTON ──────────────────────────────────────────────────────────────
function PayButton({ payStatus, contract, onOpen }) {
  const { state, daysUntilDue } = payStatus;

  if (state === 'paid' || state === 'paid-onetime') {
    return (
      <button disabled title={state === 'paid' ? `Next payment due ${fmtShort(payStatus.nextDue)}` : 'One-time payment complete'}
        className="flex items-center gap-2 text-white text-[13px] font-medium px-3.5 py-2 rounded-xl cursor-not-allowed opacity-75"
        style={{ background: 'rgba(22,163,74,0.55)', border: '1.5px solid rgba(22,163,74,0.4)' }}>
        <CheckCircle2 className="w-4 h-4" /> Paid
      </button>
    );
  }

  if (state === 'due-soon') {
    return (
      <button onClick={onOpen}
        className="flex items-center gap-2 text-white text-[13px] font-medium px-3.5 py-2 rounded-xl transition-all"
        style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', boxShadow: '0 0 0 2px rgba(217,119,6,0.35)' }}>
        <DollarSign className="w-4 h-4" />
        Pay · {daysUntilDue === 0 ? 'Today' : `${daysUntilDue}d`}
      </button>
    );
  }

  if (state === 'overdue') {
    return (
      <button onClick={onOpen}
        className="flex items-center gap-2 text-white text-[13px] font-medium px-3.5 py-2 rounded-xl transition-all"
        style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', boxShadow: '0 0 0 2px rgba(220,38,38,0.35)' }}>
        <DollarSign className="w-4 h-4" /> Pay · Overdue
      </button>
    );
  }

  // 'unpaid' — no payment ever, or expired contract
  return (
    <button onClick={onOpen}
      className="flex items-center gap-2 bg-success-500 hover:bg-success-600 text-white text-[13px] font-medium px-3.5 py-2 rounded-xl transition-all">
      <DollarSign className="w-4 h-4" /> Pay
    </button>
  );
}

// ─── PAY MODAL ───────────────────────────────────────────────────────────────
function PayModal({ open, contract: c, homeBalance, vehicleBalance, onClose, onPay }) {
  const [walletType, setWalletType] = useState('home');
  const [amount,     setAmount]     = useState('');
  const [note,       setNote]       = useState('');
  const [loading,    setLoading]    = useState(false);

  useEffect(() => {
    if (!open || !c) return;
    setWalletType('home');
    setAmount(c.cost ? String(c.cost) : '');
    setNote('');
    setLoading(false);
  }, [open, c]);

  if (!open || !c) return null;

  const currentBal = walletType === 'home' ? homeBalance : vehicleBalance;
  const amt        = parseFloat(amount) || 0;
  const remaining  = currentBal - amt;

  const wallets = [
    { k: 'home',    label: 'Home Wallet',    bal: homeBalance    },
    { k: 'vehicle', label: 'Vehicle Wallet', bal: vehicleBalance },
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
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Deduct from Wallet</p>
          <div className="grid grid-cols-2 gap-2">
            {wallets.map(({ k, label, bal }) => {
              const active = walletType === k;
              return (
                <button key={k} type="button" onClick={() => setWalletType(k)}
                  className="rounded-xl border-2 p-3 text-left transition-all"
                  style={{ borderColor: active ? '#16a34a' : '#e2e8f0', background: active ? 'rgba(22,163,74,0.06)' : '#fff' }}>
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

        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Amount (AED)</label>
          <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[14px] font-bold text-navy-900 outline-none focus:ring-2 focus:ring-accent-400"
            placeholder={`Contract value: AED ${fmt(c.cost)}`} />
          <p className="text-[11px] text-slate-400 mt-1">Defaults to full contract amount if left blank</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Current Balance', val: `AED ${fmt(currentBal)}`,   red: currentBal < 0 },
            { label: 'This Payment',    val: `AED ${fmt(amt)}`,           red: false          },
            { label: 'After Payment',   val: remaining < 0 ? `− AED ${fmt(Math.abs(remaining))}` : `AED ${fmt(remaining)}`, red: remaining < 0 },
          ].map(({ label, val, red }) => (
            <div key={label} className="text-center bg-slate-50 rounded-xl p-3">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
              <p className={cn('text-[12px] font-black', red ? 'text-red-600' : 'text-navy-900')}>{val}</p>
            </div>
          ))}
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Note (optional)</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] outline-none focus:ring-2 focus:ring-accent-400"
            placeholder="e.g. Q1 payment, invoice #1234" />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 h-10 rounded-xl text-white text-[13px] font-bold transition-all disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
            {loading ? 'Processing…' : `Pay AED ${fmt(amt || c.cost)}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── RENEW MODAL ─────────────────────────────────────────────────────────────
function RenewModal({ open, contract: c, onClose, onRenew }) {
  const [newEndDate, setNewEndDate] = useState('');
  const [newCost,    setNewCost]    = useState('');
  const [note,       setNote]       = useState('');
  const [loading,    setLoading]    = useState(false);

  useEffect(() => {
    if (!open || !c) return;
    const base = c.endDate && daysUntil(c.endDate) > 0 ? c.endDate : new Date().toISOString().split('T')[0];
    const d = new Date(base + 'T00:00:00');
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
        <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Current End Date</p>
            <p className="text-[13px] font-bold text-navy-900">{fmtShort(c.endDate)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Renewal Count</p>
            <p className="text-[13px] font-bold text-navy-900">{c.renewalHistory?.length ?? 0}</p>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">New End Date</label>
          <input type="date" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] font-medium outline-none focus:ring-2 focus:ring-accent-400" />
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Updated Contract Value (AED)</label>
          <input type="number" min="0" step="0.01" value={newCost} onChange={(e) => setNewCost(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[14px] font-bold text-navy-900 outline-none focus:ring-2 focus:ring-accent-400"
            placeholder={`Keep current: AED ${fmt(c.cost)}`} />
          <p className="text-[11px] text-slate-400 mt-1">Leave blank to keep current value</p>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Note (optional)</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] outline-none focus:ring-2 focus:ring-accent-400"
            placeholder="e.g. Terms renegotiated, new scope added…" />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 h-10 rounded-xl text-white text-[13px] font-bold transition-all disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
            {loading ? 'Renewing…' : 'Renew Contract'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── TAB COMPONENTS ──────────────────────────────────────────────────────────

const TASK_STATUS = {
  scheduled:     { label: 'Scheduled',   bg: 'rgba(37,99,235,0.10)',  color: '#2563eb' },
  'in-progress': { label: 'In Progress', bg: 'rgba(217,119,6,0.12)',  color: '#d97706' },
  'on-hold':     { label: 'On Hold',     bg: 'rgba(147,51,234,0.10)', color: '#9333ea' },
  overdue:       { label: 'Overdue',     bg: 'rgba(220,38,38,0.12)',  color: '#dc2626' },
  completed:     { label: 'Completed',   bg: 'rgba(22,163,74,0.10)',  color: '#16a34a' },
  cancelled:     { label: 'Cancelled',   bg: 'rgba(100,116,139,0.08)', color: '#64748b' },
};

function Row({ label, value, icon: Icon }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0">
      {Icon && (
        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 mt-0.5">
          <Icon className="w-3.5 h-3.5 text-slate-400" />
        </div>
      )}
      <div className="flex-1">
        <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-[13px] text-slate-700 font-medium mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function OverviewTab({ contract: c }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h3 className="text-[13px] font-bold text-slate-800 mb-3 uppercase tracking-wider">Contract Details</h3>
        <div className="bg-slate-50 rounded-2xl px-4 py-1">
          <Row icon={Calendar}   label="Start Date"       value={fmtDate(c.startDate)} />
          <Row icon={Calendar}   label="Expiry Date"      value={fmtDate(c.endDate)} />
          <Row icon={DollarSign} label="Contract Value"   value={`AED ${c.cost.toLocaleString()} / ${c.costPeriod}`} />
          <Row icon={Bell}       label="Renewal Reminder" value={`${c.renewalReminder} days before expiry`} />
          <Row icon={RefreshCw}  label="Auto-Renew"       value={c.autoRenew ? 'Yes — automatically renews' : 'No — manual renewal required'} />
        </div>
      </div>
      <div className="space-y-4">
        {c.description && (
          <div>
            <h3 className="text-[13px] font-bold text-slate-800 mb-3 uppercase tracking-wider">Description</h3>
            <p className="text-[13px] text-slate-600 leading-relaxed bg-slate-50 rounded-2xl p-4">{c.description}</p>
          </div>
        )}
        {c.notes && (
          <div>
            <h3 className="text-[13px] font-bold text-slate-800 mb-3 uppercase tracking-wider">Notes</h3>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
              <p className="text-[13px] text-amber-800 leading-relaxed">{c.notes}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ServicesTab({ services }) {
  if (services.length === 0) {
    return (
      <div className="text-center py-10">
        <CheckCheck className="w-10 h-10 text-slate-200 mx-auto mb-2" />
        <p className="text-[13px] text-slate-400">No services listed for this contract.</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-[13px] text-slate-500 mb-4">The following services are covered under this contract:</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {services.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
            className="flex items-start gap-3 p-3.5 rounded-xl bg-success-50 border border-success-100">
            <CheckCheck className="w-4 h-4 text-success-500 shrink-0 mt-0.5" />
            <span className="text-[13px] text-success-800 font-medium">{s}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function PaymentHistoryTab({ payments, totalPaid, payStatus, onPay }) {
  const isPaidState = payStatus.state === 'paid' || payStatus.state === 'paid-onetime';

  if (payments.length === 0) {
    return (
      <div className="text-center py-10">
        <RiMoneyDollarCircleLine className="w-10 h-10 text-slate-200 mx-auto mb-2" />
        <p className="text-[14px] font-semibold text-slate-400 mb-1">No payments recorded yet</p>
        <p className="text-[12px] text-slate-400 mb-4">Use the Pay button to record a payment against this contract.</p>
        <button onClick={onPay}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-[13px] font-semibold"
          style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
          <DollarSign className="w-4 h-4" /> Record First Payment
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
          <p className="text-[18px] font-black text-emerald-700">AED {fmt(totalPaid)}</p>
          <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wide mt-1">Total Paid</p>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
          <p className="text-[18px] font-black text-navy-900">{payments.length}</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-1">Payments</p>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
          {payStatus.nextDue ? (
            <>
              <p className="text-[13px] font-black text-navy-900">{fmtShort(payStatus.nextDue)}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide mt-1"
                style={{ color: payStatus.state === 'overdue' ? '#dc2626' : payStatus.state === 'due-soon' ? '#d97706' : '#64748b' }}>
                {payStatus.state === 'overdue' ? 'Overdue' : payStatus.state === 'due-soon' ? 'Due Soon' : 'Next Due'}
              </p>
            </>
          ) : (
            <>
              <p className="text-[14px] font-black text-navy-900">{fmtShort(payments[0]?.date)}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-1">Last Payment</p>
            </>
          )}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {payments.map((p, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(22,163,74,0.12)' }}>
              <RiWalletLine className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-slate-800">
                AED {fmt(p.amount)}
                <span className="ml-2 text-[11px] font-normal text-slate-400">
                  from {p.walletType === 'home' ? 'Home Wallet' : 'Vehicle Wallet'}
                </span>
              </p>
              {p.note && <p className="text-[11px] text-slate-500 mt-0.5">{p.note}</p>}
            </div>
            <p className="text-[11px] text-slate-400 font-medium shrink-0">{fmtShort(p.date)}</p>
          </motion.div>
        ))}
      </div>

      {isPaidState ? (
        <div className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-[13px] text-emerald-600 font-semibold">
          <CheckCircle2 className="w-4 h-4" />
          {payStatus.state === 'paid-onetime'
            ? 'One-time payment — no further payments needed'
            : `Paid · Next payment in ${payStatus.daysUntilDue} days (${fmtShort(payStatus.nextDue)})`
          }
        </div>
      ) : (
        <button onClick={onPay}
          className={cn(
            'flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-dashed text-[13px] font-semibold transition-all',
            payStatus.state === 'overdue'
              ? 'border-danger-300 text-danger-600 hover:border-danger-400 hover:bg-danger-50'
              : payStatus.state === 'due-soon'
                ? 'border-amber-300 text-amber-600 hover:border-amber-400 hover:bg-amber-50'
                : 'border-emerald-200 text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50',
          )}>
          <DollarSign className="w-4 h-4" />
          {payStatus.state === 'overdue' ? 'Record Overdue Payment' : 'Record New Payment'}
        </button>
      )}
    </div>
  );
}

function RenewalHistoryTab({ renewals, onRenew }) {
  if (renewals.length === 0) {
    return (
      <div className="text-center py-10">
        <RiHistoryLine className="w-10 h-10 text-slate-200 mx-auto mb-2" />
        <p className="text-[14px] font-semibold text-slate-400 mb-1">No renewals yet</p>
        <p className="text-[12px] text-slate-400 mb-4">When you renew this contract, the history will appear here.</p>
        <button onClick={onRenew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-[13px] font-semibold"
          style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
          <RefreshCw className="w-4 h-4" /> Renew Contract
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {renewals.map((r, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
          className="p-4 rounded-xl border border-slate-100 bg-slate-50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">
              Renewal #{renewals.length - i}
            </span>
            <p className="text-[11px] text-slate-400 font-medium">Renewed on {fmtShort(r.renewedOn)}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-1">Previous End Date</p>
              <p className="text-[12px] font-semibold text-slate-700">{fmtShort(r.previousEndDate)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-1">New End Date</p>
              <p className="text-[12px] font-semibold text-navy-900">{fmtShort(r.newEndDate)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-1">Contract Value</p>
              <p className="text-[12px] font-semibold text-navy-900">AED {fmt(r.newCost)}</p>
            </div>
          </div>
          {r.note && (
            <p className="mt-2 text-[12px] text-slate-500 bg-white rounded-lg px-3 py-2 border border-slate-100">{r.note}</p>
          )}
        </motion.div>
      ))}
      <button onClick={onRenew}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-dashed border-blue-200 text-[13px] text-blue-600 font-semibold hover:border-blue-400 hover:bg-blue-50 transition-all">
        <RefreshCw className="w-4 h-4" /> Renew Again
      </button>
    </div>
  );
}

function TasksTab({ tasks }) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <Wrench className="w-10 h-10 text-slate-200 mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-[14px] font-semibold text-slate-400 mb-1">No tasks linked to this contract</p>
        <p className="text-[12px] text-slate-400 mb-4">Create a maintenance task and link it to this contract to track work.</p>
        <Link to="/maintenance"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-navy-50 text-navy-700 text-[13px] font-semibold hover:bg-navy-100 transition-colors">
          Go to Maintenance →
        </Link>
      </div>
    );
  }

  const counts       = tasks.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {});
  const sorted       = [...tasks].sort((a, b) => (a.scheduledDate ?? '').localeCompare(b.scheduledDate ?? ''));
  const totalActual  = tasks.filter((t) => t.status === 'completed').reduce((s, t) => s + (t.actualCost ?? t.estimatedCost ?? 0), 0);
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {Object.entries(counts).map(([status, count]) => {
          const cfg = TASK_STATUS[status] ?? TASK_STATUS.scheduled;
          return (
            <span key={status} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold"
              style={{ background: cfg.bg, color: cfg.color }}>
              {count} {cfg.label}
            </span>
          );
        })}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total Tasks', value: tasks.length },
          { label: 'Completed',   value: completedCount },
          { label: 'Total Spent', value: `AED ${totalActual.toLocaleString()}` },
        ].map((s) => (
          <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
            <p className="text-[17px] font-bold text-slate-800">{s.value}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {sorted.map((t) => {
          const cfg    = TASK_STATUS[t.status] ?? TASK_STATUS.scheduled;
          const isOver = t.status === 'overdue';
          return (
            <div key={t.id}
              className={cn('flex items-center gap-3 p-3.5 rounded-xl border transition-all',
                isOver ? 'bg-danger-50/40 border-danger-100' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50')}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
                {t.category === 'Repair'
                  ? <Wrench className="w-4 h-4 text-white" strokeWidth={1.5} />
                  : <Settings2 className="w-4 h-4 text-white" strokeWidth={1.5} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-slate-800">{t.title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {[t.areaName, t.assetName].filter(Boolean).join(' › ')}
                  {t.scheduledDate ? ` · ${fmtShort(t.scheduledDate)}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                {(t.actualCost || t.estimatedCost) ? (
                  <span className="text-[12px] font-semibold text-slate-500 hidden sm:block">AED {(t.actualCost ?? t.estimatedCost ?? 0).toLocaleString()}</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <Link to="/maintenance"
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-[13px] text-slate-400 font-medium hover:border-navy-300 hover:text-navy-600 transition-all">
        View all in Maintenance →
      </Link>
    </div>
  );
}

function DocumentsTab({ docs }) {
  const FC = { pdf: 'bg-danger-50 text-danger-600', xlsx: 'bg-success-50 text-success-600', docx: 'bg-accent-50 text-accent-600' };
  if (docs.length === 0) {
    return (
      <div className="text-center py-10">
        <FileText className="w-10 h-10 text-slate-200 mx-auto mb-2" />
        <p className="text-[13px] text-slate-400">No documents uploaded.</p>
        <button className="mt-3 text-[13px] text-accent-600 font-semibold hover:underline">+ Upload document</button>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {docs.map((doc, i) => {
        const fc = FC[doc.type] ?? 'bg-slate-50 text-slate-500';
        return (
          <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all group">
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold uppercase', fc)}>{doc.type}</div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-slate-800 truncate">{doc.name}</p>
              <p className="text-[11px] text-slate-400">{doc.size} · {fmtShort(doc.uploaded)}</p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-accent-600 hover:bg-accent-50 transition-all"><Eye className="w-3.5 h-3.5" /></button>
              <button className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-success-600 hover:bg-success-50 transition-all"><Download className="w-3.5 h-3.5" /></button>
              <button className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-danger-500 hover:bg-danger-50 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        );
      })}
      <button className="mt-2 w-full py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-[13px] text-slate-400 font-medium hover:border-accent-300 hover:text-accent-500 transition-all">+ Upload Document</button>
    </div>
  );
}

function CompanyTab({ company }) {
  if (!company) return <p className="text-[13px] text-slate-400">Company info not available.</p>;
  return (
    <div className="flex flex-col sm:flex-row gap-6">
      <div className="flex-1">
        <h3 className="text-[13px] font-bold text-slate-800 mb-3 uppercase tracking-wider">Company Details</h3>
        <div className="bg-slate-50 rounded-2xl px-4 py-1">
          <Row icon={Building2} label="Company"      value={company.name} />
          <Row icon={FileText}  label="Speciality"   value={company.category} />
          <Row icon={Clock}     label="Years Active" value={`${company.yearsActive} years`} />
        </div>
      </div>
      <div className="flex-1">
        <h3 className="text-[13px] font-bold text-slate-800 mb-3 uppercase tracking-wider">Contact</h3>
        <div className="space-y-2">
          {company.contact?.mobile && (
            <a href={`tel:${company.contact.mobile}`}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-accent-200 hover:bg-accent-50 transition-all group">
              <Phone className="w-4 h-4 text-slate-400 group-hover:text-accent-600" />
              <div>
                <p className="text-[13px] font-semibold text-slate-800">{company.contact.mobile}</p>
                <p className="text-[11px] text-slate-400">{company.contact.person}</p>
              </div>
            </a>
          )}
          {company.contact?.email && (
            <a href={`mailto:${company.contact.email}`}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-accent-200 hover:bg-accent-50 transition-all group">
              <Mail className="w-4 h-4 text-slate-400 group-hover:text-accent-600" />
              <p className="text-[13px] font-medium text-slate-700">{company.contact.email}</p>
            </a>
          )}
          {company.contact?.whatsapp && (
            <a href={`https://wa.me/${company.contact.whatsapp.replace(/\s+/g, '').replace('+', '')}`}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-success-50 border border-success-100 hover:bg-success-100 transition-all">
              <MessageCircle className="w-4 h-4 text-success-600" />
              <p className="text-[13px] font-medium text-success-800">WhatsApp {(company.contact.person ?? '').split(' ')[0]}</p>
            </a>
          )}
        </div>
        <Link to={`/companies/${company.id}`} className="mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-[13px] text-slate-500 font-medium hover:text-navy-700 hover:border-navy-200 hover:bg-navy-50 transition-all">
          View Company Profile →
        </Link>
      </div>
    </div>
  );
}
