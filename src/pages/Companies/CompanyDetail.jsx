import { useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Phone, Mail, MessageCircle, MapPin, Star, FileText,
  Clock, DollarSign, ChevronRight, Download, Eye, Trash2,
  CheckCircle2, Calendar, User, Building2, AlertCircle,
} from 'lucide-react';
import { getCompanyById, CATEGORY_CFG } from '../../data/mockCompanies';
import { getContractsByCompany } from '../../data/mockContracts';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { cn } from '../../utils/cn';

const TABS = ['Overview', 'Contracts', 'Service History', 'Documents'];

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
  const company = getCompanyById(id);

  if (!company) return <Navigate to="/companies" replace />;

  const [activeTab, setActiveTab] = useState(0);
  const contracts = getContractsByCompany(id);
  const cfg = CATEGORY_CFG[company.category] ?? { avatar: 'bg-navy-600' };

  const tabs = [
    { label: 'Overview',        count: null },
    { label: 'Contracts',       count: contracts.length },
    { label: 'Service History', count: company.serviceHistory.length },
    { label: 'Documents',       count: company.documents.length },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
      className="space-y-6"
    >
      {/* ── Back ── */}
      <Link to="/companies" className="inline-flex items-center gap-2 text-[13px] text-slate-500 hover:text-navy-700 transition-colors font-medium">
        <ArrowLeft className="w-4 h-4" />
        Back to Companies
      </Link>

      {/* ── Hero ── */}
      <div
        className="relative rounded-3xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0b1d3a 0%, #1a3360 60%, #0f2855 100%)' }}
      >
        {/* Texture */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)', backgroundSize: '12px 12px' }} />

        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Avatar */}
            <div className={cn('w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold text-white flex-shrink-0', cfg.avatar)}>
              {company.name.charAt(0)}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="bg-white/10 text-white/80 text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                  {company.category}
                </span>
                <Badge variant="success" size="sm" dot>Active</Badge>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">{company.name}</h1>
              <p className="text-white/60 text-[13px] mt-0.5">{company.tagline}</p>
              <div className="mt-2">
                <StarRating rating={company.rating} />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <a href={`tel:${company.contact.mobile}`}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-[13px] font-medium px-3.5 py-2 rounded-xl transition-all border border-white/10">
                <Phone className="w-4 h-4" /> Call
              </a>
              <a href={`mailto:${company.contact.email}`}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-[13px] font-medium px-3.5 py-2 rounded-xl transition-all border border-white/10">
                <Mail className="w-4 h-4" /> Email
              </a>
              <a href={`https://wa.me/${company.contact.whatsapp.replace(/\s+/g, '').replace('+', '')}`}
                className="flex items-center gap-2 bg-success-500 hover:bg-success-600 text-white text-[13px] font-medium px-3.5 py-2 rounded-xl transition-all">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </a>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-6 grid grid-cols-3 gap-4 pt-5 border-t border-white/10">
            {[
              { label: 'Active Contracts', value: company.activeContracts },
              { label: 'Total Spent',      value: `AED ${company.totalSpent.toLocaleString()}` },
              { label: 'Years Active',     value: `${company.yearsActive} yrs` },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-white font-bold text-xl">{s.value}</p>
                <p className="text-white/50 text-[12px] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
        {/* Tab bar */}
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

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="p-6"
          >
            {activeTab === 0 && <OverviewTab company={company} />}
            {activeTab === 1 && <ContractsTab contracts={contracts} />}
            {activeTab === 2 && <ServiceHistoryTab history={company.serviceHistory} />}
            {activeTab === 3 && <DocumentsTab docs={company.documents} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function InfoRow({ icon: Icon, label, value, className }) {
  return (
    <div className={cn('flex items-start gap-3 py-3 border-b border-slate-50 last:border-0', className)}>
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

function OverviewTab({ company }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Contact details */}
      <div>
        <h3 className="text-[13px] font-bold text-slate-800 mb-3 uppercase tracking-wider">Contact Details</h3>
        <div className="bg-slate-50 rounded-2xl px-4 py-1">
          <InfoRow icon={User}     label="Contact Person" value={company.contact.person} />
          <InfoRow icon={Phone}    label="Office Phone"   value={company.contact.phone} />
          <InfoRow icon={Phone}    label="Mobile"         value={company.contact.mobile} />
          <InfoRow icon={Mail}     label="Email"          value={company.contact.email} />
          <InfoRow icon={MapPin}   label="Address"        value={company.address} />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-4">
        <div>
          <h3 className="text-[13px] font-bold text-slate-800 mb-3 uppercase tracking-wider">Notes</h3>
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
            <p className="text-[13px] text-amber-800 leading-relaxed">{company.notes}</p>
          </div>
        </div>

        <div>
          <h3 className="text-[13px] font-bold text-slate-800 mb-3 uppercase tracking-wider">Last Service</h3>
          <div className="bg-slate-50 rounded-2xl px-4 py-1">
            <InfoRow icon={Calendar} label="Date" value={new Date(company.lastService).toLocaleDateString('en-AE', { day: 'numeric', month: 'long', year: 'numeric' })} />
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
        const st  = CONTRACT_STATUS[c.status] ?? CONTRACT_STATUS.active;
        const days = Math.ceil((new Date(c.endDate) - new Date()) / (1000 * 60 * 60 * 24));
        return (
          <Link key={c.id} to={`/contracts/${c.id}`}
            className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-accent-200 hover:bg-accent-50/30 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4.5 h-4.5 text-navy-600" strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-slate-800">{c.title}</p>
              <p className="text-[12px] text-slate-400 mt-0.5">
                AED {c.cost.toLocaleString()}/{c.costPeriod === 'yearly' ? 'yr' : 'mo'} ·{' '}
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

function ServiceHistoryTab({ history }) {
  if (history.length === 0) {
    return (
      <div className="text-center py-10">
        <Clock className="w-10 h-10 text-slate-200 mx-auto mb-2" />
        <p className="text-[13px] text-slate-400">No service history recorded.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {history.map((h) => (
        <div key={h.id} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-success-50 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 text-success-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-slate-800">{h.type}</p>
            <p className="text-[12px] text-slate-400">Asset: {h.asset}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[13px] font-semibold text-navy-700">AED {h.cost}</p>
            <p className="text-[11px] text-slate-400">{new Date(h.date).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          </div>
        </div>
      ))}
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
      {docs.map((doc) => {
        const fc = FILE_COLORS[doc.type] ?? 'bg-slate-50 text-slate-500';
        return (
          <div key={doc.id} className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all group">
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold uppercase', fc)}>
              {doc.type}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-slate-800 truncate">{doc.name}</p>
              <p className="text-[11px] text-slate-400">{doc.size} · {new Date(doc.uploaded).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-accent-600 hover:bg-accent-50 transition-all"><Eye className="w-3.5 h-3.5" /></button>
              <button className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-success-600 hover:bg-success-50 transition-all"><Download className="w-3.5 h-3.5" /></button>
              <button className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-danger-500 hover:bg-danger-50 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
