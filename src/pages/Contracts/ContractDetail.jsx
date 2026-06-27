import { useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, FileText, Building2, Calendar, DollarSign, RefreshCw,
  CheckCircle2, AlertTriangle, XCircle, Bell, CheckCheck,
  Download, Eye, Trash2, Phone, Mail, MessageCircle, Clock,
} from 'lucide-react';
import { getContractById } from '../../data/mockContracts';
import { getCompanyById, CATEGORY_CFG } from '../../data/mockCompanies';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { cn } from '../../utils/cn';

const STATUS_CFG = {
  active:   { label: 'Active',   variant: 'success', icon: CheckCircle2, gradient: 'from-success-800 to-success-900' },
  expiring: { label: 'Expiring', variant: 'warning', icon: AlertTriangle, gradient: 'from-warning-700 to-orange-800'  },
  expired:  { label: 'Expired',  variant: 'danger',  icon: XCircle,       gradient: 'from-danger-800 to-red-900'      },
};

function getDays(str) {
  return Math.ceil((new Date(str) - new Date()) / (1000 * 60 * 60 * 24));
}
function fmtDate(str) {
  return new Date(str).toLocaleDateString('en-AE', { day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtShort(str) {
  return new Date(str).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ContractDetail() {
  const { id } = useParams();
  const contract = getContractById(id);
  if (!contract) return <Navigate to="/contracts" replace />;

  const [activeTab, setActiveTab] = useState(0);
  const company = getCompanyById(contract.companyId);
  const st   = STATUS_CFG[contract.status] ?? STATUS_CFG.active;
  const cfg  = CATEGORY_CFG[contract.category] ?? { avatar: 'bg-navy-600' };
  const days = getDays(contract.endDate);

  const tabs = [
    { label: 'Overview' },
    { label: 'Services Included', count: contract.includedServices.length },
    { label: 'Documents',         count: contract.documents.length },
    { label: 'Company Info' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
      className="space-y-6"
    >
      {/* ── Back ── */}
      <Link to="/contracts" className="inline-flex items-center gap-2 text-[13px] text-slate-500 hover:text-navy-700 transition-colors font-medium">
        <ArrowLeft className="w-4 h-4" />
        Back to Contracts
      </Link>

      {/* ── Hero ── */}
      <div
        className="relative rounded-3xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0b1d3a 0%, #1a3360 60%, #0f2855 100%)' }}
      >
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)', backgroundSize: '12px 12px' }} />

        {/* Status accent bar */}
        <div className={cn('absolute top-0 left-0 right-0 h-1 rounded-t-3xl', {
          'bg-success-400': contract.status === 'active',
          'bg-warning-400': contract.status === 'expiring',
          'bg-danger-400':  contract.status === 'expired',
        })} />

        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-7 h-7 text-white/80" strokeWidth={1.5} />
            </div>

            {/* Info */}
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

            {/* Actions */}
            <div className="flex gap-2 flex-shrink-0">
              <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-[13px] font-medium px-3.5 py-2 rounded-xl transition-all border border-white/10">
                <Bell className="w-4 h-4" /> Reminder
              </button>
              {contract.status === 'expired' || contract.status === 'expiring' ? (
                <button className="flex items-center gap-2 bg-warning-500 hover:bg-warning-600 text-white text-[13px] font-medium px-3.5 py-2 rounded-xl transition-all">
                  <RefreshCw className="w-4 h-4" /> Renew
                </button>
              ) : null}
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 border-t border-white/10">
            <div>
              <p className="text-white font-bold text-xl">AED {contract.cost.toLocaleString()}</p>
              <p className="text-white/50 text-[12px] mt-0.5">per {contract.costPeriod === 'yearly' ? 'year' : contract.costPeriod}</p>
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
        </div>
      </div>

      {/* ── Expiry alert ── */}
      {contract.status === 'expiring' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-3 p-4 bg-warning-50 border border-warning-200 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-warning-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-semibold text-warning-800">Contract expiring soon</p>
            <p className="text-[12px] text-warning-700 mt-0.5">This contract expires on {fmtDate(contract.endDate)} ({days} days). Contact {contract.companyName} to arrange renewal.</p>
          </div>
        </motion.div>
      )}
      {contract.status === 'expired' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-3 p-4 bg-danger-50 border border-danger-200 rounded-2xl">
          <XCircle className="w-5 h-5 text-danger-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-semibold text-danger-800">Contract has expired</p>
            <p className="text-[12px] text-danger-700 mt-0.5">This contract expired on {fmtDate(contract.endDate)}. Renew to restore service coverage.</p>
          </div>
          <button className="ml-auto flex items-center gap-1.5 bg-danger-600 hover:bg-danger-700 text-white text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-all flex-shrink-0">
            <RefreshCw className="w-3.5 h-3.5" /> Renew Now
          </button>
        </motion.div>
      )}

      {/* ── Tabs ── */}
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
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="p-6"
          >
            {activeTab === 0 && <OverviewTab contract={contract} />}
            {activeTab === 1 && <ServicesTab services={contract.includedServices} />}
            {activeTab === 2 && <DocumentsTab docs={contract.documents} />}
            {activeTab === 3 && <CompanyTab company={company} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function Row({ label, value, icon: Icon }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0">
      {Icon && (
        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0 mt-0.5">
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
          <Row icon={Calendar}    label="Start Date"        value={fmtDate(c.startDate)} />
          <Row icon={Calendar}    label="Expiry Date"       value={fmtDate(c.endDate)} />
          <Row icon={DollarSign}  label="Contract Value"    value={`AED ${c.cost.toLocaleString()} / ${c.costPeriod}`} />
          <Row icon={Bell}        label="Renewal Reminder"  value={`${c.renewalReminder} days before expiry`} />
          <Row icon={RefreshCw}   label="Auto-Renew"        value={c.autoRenew ? 'Yes — automatically renews' : 'No — manual renewal required'} />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-[13px] font-bold text-slate-800 mb-3 uppercase tracking-wider">Description</h3>
          <p className="text-[13px] text-slate-600 leading-relaxed bg-slate-50 rounded-2xl p-4">{c.description}</p>
        </div>
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
  return (
    <div>
      <p className="text-[13px] text-slate-500 mb-4">The following services are covered under this contract:</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {services.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-start gap-3 p-3.5 rounded-xl bg-success-50 border border-success-100"
          >
            <CheckCheck className="w-4 h-4 text-success-500 flex-shrink-0 mt-0.5" />
            <span className="text-[13px] text-success-800 font-medium">{s}</span>
          </motion.div>
        ))}
      </div>
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
      {docs.map((doc) => {
        const fc = FC[doc.type] ?? 'bg-slate-50 text-slate-500';
        return (
          <div key={doc.id} className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all group">
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold uppercase', fc)}>
              {doc.type}
            </div>
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
      <button className="mt-2 w-full py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-[13px] text-slate-400 font-medium hover:border-accent-300 hover:text-accent-500 transition-all">
        + Upload Document
      </button>
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
          <Row icon={Building2}  label="Company"        value={company.name} />
          <Row icon={FileText}   label="Speciality"     value={company.category} />
          <Row icon={Clock}      label="Years Active"   value={`${company.yearsActive} years`} />
        </div>
      </div>
      <div className="flex-1">
        <h3 className="text-[13px] font-bold text-slate-800 mb-3 uppercase tracking-wider">Contact</h3>
        <div className="space-y-2">
          <a href={`tel:${company.contact.mobile}`}
            className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-accent-200 hover:bg-accent-50 transition-all group">
            <Phone className="w-4 h-4 text-slate-400 group-hover:text-accent-600" />
            <div>
              <p className="text-[13px] font-semibold text-slate-800">{company.contact.mobile}</p>
              <p className="text-[11px] text-slate-400">{company.contact.person}</p>
            </div>
          </a>
          <a href={`mailto:${company.contact.email}`}
            className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-accent-200 hover:bg-accent-50 transition-all group">
            <Mail className="w-4 h-4 text-slate-400 group-hover:text-accent-600" />
            <p className="text-[13px] font-medium text-slate-700">{company.contact.email}</p>
          </a>
          <a href={`https://wa.me/${company.contact.whatsapp.replace(/\s+/g, '').replace('+', '')}`}
            className="flex items-center gap-3 p-3.5 rounded-xl bg-success-50 border border-success-100 hover:bg-success-100 transition-all">
            <MessageCircle className="w-4 h-4 text-success-600" />
            <p className="text-[13px] font-medium text-success-800">WhatsApp {company.contact.person.split(' ')[0]}</p>
          </a>
        </div>
        <Link to={`/companies/${company.id}`} className="mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-[13px] text-slate-500 font-medium hover:text-navy-700 hover:border-navy-200 hover:bg-navy-50 transition-all">
          View Company Profile →
        </Link>
      </div>
    </div>
  );
}
