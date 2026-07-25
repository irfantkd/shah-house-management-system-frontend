import { useState, useEffect } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Phone, Mail, MessageCircle, MapPin, Star, FileText,
  ChevronRight, Download, Eye, Calendar, User, Plus, Wrench,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { CATEGORY_CFG } from '../../data/mockCompanies';
import { useGetQuery, usePostMutation, useDeleteMutation } from '../../api/apiSlice';
import { selectCurrentPropertyId } from '../../store/slices/propertiesSlice';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

const SERVICE_TYPES = ['Maintenance', 'Repair', 'Inspection', 'Installation', 'Cleaning', 'Emergency', 'Consultation', 'Other'];
const SERVICE_STATUSES = ['completed', 'pending', 'cancelled'];

const STATUS_CFG_SVC = {
  completed:  { label: 'Completed',  variant: 'success' },
  pending:    { label: 'Pending',    variant: 'warning' },
  cancelled:  { label: 'Cancelled',  variant: 'default' },
};

const CONTRACT_STATUS = {
  active:   { label: 'Active',    variant: 'success' },
  expiring: { label: 'Expiring',  variant: 'warning' },
  expired:  { label: 'Expired',   variant: 'danger'  },
};

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={cn('w-3.5 h-3.5', s <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-navy-700 fill-navy-700/30')} />
      ))}
      <span className="text-white/80 text-[13px] ml-1">{rating}</span>
    </div>
  );
}

export default function CompanyDetail() {
  const { id } = useParams();
  const propertyId = useSelector(selectCurrentPropertyId);

  const { data: company, isLoading, refetch } = useGetQuery({ path: `/companies/${id}` });
  const { data: allContracts = [] } = useGetQuery({ path: '/contracts', params: { propertyId } }, { skip: !propertyId });

  const [addSvcMut]    = usePostMutation();
  const [deleteSvcMut] = useDeleteMutation();

  const [activeTab,  setActiveTab]  = useState(0);
  const [showAddSvc, setShowAddSvc] = useState(false);

  if (isLoading) return null;
  if (!company) return <Navigate to="/companies" replace />;

  const contracts      = allContracts.filter((c) => c.companyId === id);
  const serviceHistory = company.serviceHistory ?? [];
  const cfg = CATEGORY_CFG[company.category] ?? { avatar: 'bg-navy-600' };

  const activeContractsCount = contracts.filter((c) => c.status === 'active').length;
  const lastServiceDate = serviceHistory
    .filter((r) => r.date)
    .sort((a, b) => b.date.localeCompare(a.date))[0]?.date ?? company.lastService ?? null;

  const tabs = [
    { label: 'Overview',        count: null },
    { label: 'Contracts',       count: contracts.length },
    { label: 'Service History', count: serviceHistory.length },
    { label: 'Documents',       count: company.documents?.length ?? 0 },
  ];

  const handleAddService = async (data) => {
    try {
      await addSvcMut({ path: `/companies/${id}/service-history`, body: data }).unwrap();
      await refetch();
      toast.success('Service record added');
      setShowAddSvc(false);
    } catch (err) {
      toast.error(err.data?.error || 'Failed to add record');
    }
  };

  const handleDeleteService = async (recId) => {
    try {
      await deleteSvcMut({ path: `/companies/${id}/service-history/${recId}` }).unwrap();
      await refetch();
      toast.success('Record removed');
    } catch (err) {
      toast.error(err.data?.error || 'Failed to remove');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
      className="space-y-6"
    >
      {/* Back */}
      <Link to="/companies" className="inline-flex items-center gap-2 text-[13px] text-slate-500 hover:text-navy-700 transition-colors font-medium">
        <ArrowLeft className="w-4 h-4" />
        Back to Companies
      </Link>

      {/* Hero */}
      <div
        className="relative rounded-3xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0b1d3a 0%, #1a3360 60%, #0f2855 100%)' }}
      >
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)', backgroundSize: '12px 12px' }} />

        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className={cn('w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold text-white flex-shrink-0', cfg.avatar)}>
              {company.name.charAt(0)}
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="bg-white/10 text-white/80 text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                  {company.category}
                </span>
                <Badge variant={company.status === 'active' ? 'success' : 'default'} size="sm" dot>
                  {company.status ? company.status.charAt(0).toUpperCase() + company.status.slice(1) : 'Active'}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">{company.name}</h1>
              <p className="text-white/60 text-[13px] mt-0.5">{company.tagline}</p>
              {(company.rating ?? 0) > 0 && (
                <div className="mt-2">
                  <StarRating rating={company.rating} />
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {company.contact?.mobile && (
                <a href={`tel:${company.contact.mobile}`}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-[13px] font-medium px-3.5 py-2 rounded-xl transition-all border border-white/10">
                  <Phone className="w-4 h-4" /> Call
                </a>
              )}
              {company.contact?.email && (
                <a href={`mailto:${company.contact.email}`}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-[13px] font-medium px-3.5 py-2 rounded-xl transition-all border border-white/10">
                  <Mail className="w-4 h-4" /> Email
                </a>
              )}
              {company.contact?.whatsapp && (
                <a href={`https://wa.me/${company.contact.whatsapp.replace(/\s+/g, '').replace('+', '')}`}
                  className="flex items-center gap-2 bg-success-500 hover:bg-success-600 text-white text-[13px] font-medium px-3.5 py-2 rounded-xl transition-all">
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4 pt-5 border-t border-white/10">
            {[
              { label: 'Active Contracts', value: activeContractsCount },
              { label: 'Total Spent',      value: `AED ${(company.totalSpent ?? 0).toLocaleString()}` },
              { label: 'Years Active',     value: `${company.yearsActive ?? 0} yrs` },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-white font-bold text-base sm:text-xl leading-tight">{s.value}</p>
                <p className="text-white/50 text-[10px] sm:text-[12px] mt-0.5 leading-snug">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center border-b border-slate-100 overflow-x-auto">
          {tabs.map((tab, i) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(i)}
              className={cn(
                'relative flex items-center gap-2 px-5 py-4 text-[13px] font-semibold whitespace-nowrap transition-colors flex-shrink-0',
                activeTab === i ? 'text-navy-800' : 'text-slate-400 hover:text-slate-600',
              )}
            >
              {tab.label}
              {tab.count !== null && (
                <span className={cn('text-[11px] font-bold px-1.5 py-0.5 rounded-md', activeTab === i ? 'bg-navy-100 text-navy-700' : 'bg-slate-100 text-slate-500')}>
                  {tab.count}
                </span>
              )}
              {activeTab === i && (
                <motion.div layoutId="company-tab-line" className="absolute bottom-0 left-0 right-0 h-0.5 bg-navy-800 rounded-full" />
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="p-6"
          >
            {activeTab === 0 && <OverviewTab company={company} lastServiceDate={lastServiceDate} />}
            {activeTab === 1 && <ContractsTab contracts={contracts} />}
            {activeTab === 2 && (
              <ServiceHistoryTab
                records={serviceHistory}
                onAdd={() => setShowAddSvc(true)}
                onDelete={handleDeleteService}
              />
            )}
            {activeTab === 3 && <DocumentsTab docs={company.documents ?? []} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <AddServiceModal open={showAddSvc} onClose={() => setShowAddSvc(false)} onSave={handleAddService} />
    </motion.div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-slate-400" />
      </div>
      <div>
        <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-[13px] text-slate-700 font-medium mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function OverviewTab({ company, lastServiceDate }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h3 className="text-[13px] font-bold text-slate-800 mb-3 uppercase tracking-wider">Contact Details</h3>
        <div className="bg-slate-50 rounded-2xl px-4 py-1">
          <InfoRow icon={User}   label="Contact Person" value={company.contact?.person || '—'} />
          <InfoRow icon={Phone}  label="Office Phone"   value={company.contact?.phone  || '—'} />
          <InfoRow icon={Phone}  label="Mobile"         value={company.contact?.mobile || '—'} />
          <InfoRow icon={Mail}   label="Email"          value={company.contact?.email  || '—'} />
          <InfoRow icon={MapPin} label="Address"        value={company.address         || '—'} />
        </div>
      </div>

      <div className="space-y-4">
        {company.notes && (
          <div>
            <h3 className="text-[13px] font-bold text-slate-800 mb-3 uppercase tracking-wider">Notes</h3>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
              <p className="text-[13px] text-amber-800 leading-relaxed">{company.notes}</p>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-[13px] font-bold text-slate-800 mb-3 uppercase tracking-wider">Last Service</h3>
          <div className="bg-slate-50 rounded-2xl px-4 py-1">
            {lastServiceDate
              ? <InfoRow icon={Calendar} label="Date" value={new Date(lastServiceDate + 'T00:00:00').toLocaleDateString('en-AE', { day: 'numeric', month: 'long', year: 'numeric' })} />
              : <p className="text-[13px] text-slate-400 py-3 px-1">No service recorded yet.</p>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

function ContractsTab({ contracts }) {
  if (contracts.length === 0) {
    return (
      <div className="text-center py-10">
        <FileText className="w-10 h-10 text-slate-200 mx-auto mb-2" />
        <p className="text-[13px] text-slate-400">No contracts linked to this company.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {contracts.map((c) => {
        const st   = CONTRACT_STATUS[c.status] ?? CONTRACT_STATUS.active;
        const days = Math.ceil((new Date(c.endDate) - new Date()) / (1000 * 60 * 60 * 24));
        return (
          <Link key={c.id} to={`/contracts/${c.id}`}
            className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-accent-200 hover:bg-accent-50/30 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-navy-600" strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-slate-800">{c.title}</p>
              <p className="text-[12px] text-slate-400 mt-0.5">
                AED {c.cost.toLocaleString()}/{{ monthly:'mo', quarterly:'qtr', 'bi-annual':'6mo', annual:'yr', yearly:'yr', 'one-time':'once' }[c.costPeriod] ?? c.costPeriod} ·{' '}
                {new Date(c.startDate).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })} –{' '}
                {new Date(c.endDate).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <Badge variant={st.variant} size="sm" dot>{st.label}</Badge>
              {c.status !== 'expired' && (
                <span className={cn('text-[11px] font-medium', days < 30 ? 'text-warning-600' : 'text-slate-400')}>
                  {days > 0 ? `${days}d left` : `${Math.abs(days)}d ago`}
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-accent-500 transition-colors" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function ServiceHistoryTab({ records, onAdd, onDelete }) {
  const sorted   = [...records].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  const totalCost = records.reduce((s, r) => s + (r.cost ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          {records.length > 0 && (
            <p className="text-[12px] text-slate-500">
              {records.length} record{records.length !== 1 ? 's' : ''} · Total cost:{' '}
              <strong className="text-navy-700">AED {totalCost.toLocaleString()}</strong>
            </p>
          )}
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-[12px] font-semibold transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Add Record
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-10">
          <Wrench className="w-10 h-10 text-slate-200 mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-[13px] text-slate-400 mb-3">No service history recorded.</p>
          <button onClick={onAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-navy-50 text-navy-700 text-[13px] font-semibold hover:bg-navy-100 transition-colors">
            <Plus className="w-4 h-4" /> Log first service
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((r, idx) => {
            const recId = r._id ?? r.id ?? idx;
            const stCfg = STATUS_CFG_SVC[r.status] ?? STATUS_CFG_SVC.completed;
            return (
              <motion.div key={String(recId)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50 group">
                <div className="w-9 h-9 rounded-xl bg-success-50 flex items-center justify-center shrink-0">
                  <Wrench className="w-4 h-4 text-success-500" strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="text-[13px] font-semibold text-slate-800">{r.type || 'Service'}</p>
                    <Badge variant={stCfg.variant} size="sm" dot>{stCfg.label}</Badge>
                  </div>
                  {r.asset && <p className="text-[12px] text-slate-400">{r.asset}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    {(r.cost ?? 0) > 0 && (
                      <p className="text-[13px] font-semibold text-navy-700">AED {r.cost.toLocaleString()}</p>
                    )}
                    <p className="text-[11px] text-slate-400">
                      {r.date
                        ? new Date(r.date + 'T00:00:00').toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </p>
                  </div>
                  {(r._id || r.id) && (
                    <button
                      onClick={() => onDelete(r._id ?? r.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-danger-500 hover:bg-danger-50 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DocumentsTab({ docs }) {
  const FILE_COLORS = { pdf: 'bg-danger-50 text-danger-600', xlsx: 'bg-success-50 text-success-600', docx: 'bg-accent-50 text-accent-600' };
  if (docs.length === 0) {
    return (
      <div className="text-center py-10">
        <FileText className="w-10 h-10 text-slate-200 mx-auto mb-2" />
        <p className="text-[13px] text-slate-400">No documents uploaded.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {docs.map((doc, i) => {
        const fc = FILE_COLORS[doc.type] ?? 'bg-slate-50 text-slate-500';
        return (
          <div key={doc._id ?? i} className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all group">
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold uppercase', fc)}>
              {doc.type}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-slate-800 truncate">{doc.name}</p>
              <p className="text-[11px] text-slate-400">{doc.size} · {doc.uploaded ? new Date(doc.uploaded).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-accent-600 hover:bg-accent-50 transition-all"><Eye className="w-3.5 h-3.5" /></button>
              <button className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-success-600 hover:bg-success-50 transition-all"><Download className="w-3.5 h-3.5" /></button>
              <button className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-danger-500 hover:bg-danger-50 transition-all">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AddServiceModal({ open, onClose, onSave }) {
  const [form, setForm] = useState({ date: '', type: '', asset: '', cost: '', status: 'completed' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const today = new Date().toISOString().split('T')[0];
    setForm({ date: today, type: '', asset: '', cost: '', status: 'completed' });
    setLoading(false);
  }, [open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.type) return toast.error('Service type is required');
    if (!form.date) return toast.error('Date is required');
    setLoading(true);
    await onSave({
      date:   form.date,
      type:   form.type,
      asset:  form.asset,
      cost:   parseFloat(form.cost) || 0,
      status: form.status,
    });
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={onClose} size="sm" title="Add Service Record" subtitle="Log a completed or scheduled service visit">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Date *</label>
            <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] outline-none focus:ring-2 focus:ring-accent-400" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Type *</label>
            <select value={form.type} onChange={(e) => set('type', e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] outline-none focus:ring-2 focus:ring-accent-400 bg-white">
              <option value="">Select type…</option>
              {SERVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Asset / Area</label>
          <input type="text" value={form.asset} onChange={(e) => set('asset', e.target.value)}
            placeholder="e.g. AC Unit — Master Bedroom, Pool Pump"
            className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] outline-none focus:ring-2 focus:ring-accent-400" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Cost (AED)</label>
            <input type="number" min="0" step="0.01" value={form.cost} onChange={(e) => set('cost', e.target.value)}
              placeholder="0.00"
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] outline-none focus:ring-2 focus:ring-accent-400" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Status</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] outline-none focus:ring-2 focus:ring-accent-400 bg-white">
              {SERVICE_STATUSES.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 h-10 rounded-xl text-white text-[13px] font-bold transition-all disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #0b1d3a, #1a3360)' }}>
            {loading ? 'Saving…' : 'Add Record'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
