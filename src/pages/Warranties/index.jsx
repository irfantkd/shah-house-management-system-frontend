import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Shield, ShieldAlert, ShieldX,
  Phone, Package, ChevronRight, ChevronLeft, AlertTriangle, Search,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { useGetQuery } from '../../api/apiSlice';
import { selectCurrentPropertyId } from '../../store/slices/propertiesSlice';
import Badge from '../../components/ui/Badge';
import { StatCardSkeleton } from '../../components/ui/LoadingSkeleton';
import EmptyState from '../../components/ui/EmptyState';
import Card from '../../components/ui/Card';
import { cn } from '../../utils/cn';

const CAT_COLOR = {
  HVAC:       { bg: 'bg-accent-100',   icon: 'text-accent-600'  },
  Plumbing:   { bg: 'bg-cyan-100',     icon: 'text-cyan-600'    },
  Electrical: { bg: 'bg-warning-100',  icon: 'text-warning-600' },
  Appliances: { bg: 'bg-success-100',  icon: 'text-success-700' },
  Furniture:  { bg: 'bg-amber-100',    icon: 'text-amber-600'   },
  Security:   { bg: 'bg-navy-100',     icon: 'text-navy-700'    },
  Garden:     { bg: 'bg-emerald-100',  icon: 'text-emerald-700' },
  Pool:       { bg: 'bg-sky-100',      icon: 'text-sky-600'     },
  Structural: { bg: 'bg-slate-100',    icon: 'text-slate-600'   },
  Other:      { bg: 'bg-purple-100',   icon: 'text-purple-600'  },
};
const DEFAULT_CC = { bg: 'bg-slate-100', icon: 'text-slate-500' };

const LIMIT = 12;

const STATUS_FILTERS = [
  { key: 'all',      label: 'All'      },
  { key: 'active',   label: 'Active'   },
  { key: 'expiring', label: 'Expiring' },
  { key: 'expired',  label: 'Expired'  },
];

function getDays(expiryDate) {
  return Math.ceil((new Date(expiryDate + 'T00:00:00') - Date.now()) / 86400000);
}

function getStatus(days) {
  if (days < 0)  return { label: 'Expired',       variant: 'danger',  icon: ShieldX,     key: 'expired'  };
  if (days < 90) return { label: 'Expiring Soon', variant: 'warning', icon: ShieldAlert, key: 'expiring' };
  return              { label: 'Active',           variant: 'success', icon: ShieldCheck, key: 'active'   };
}

function fmtDate(str) {
  return new Date(str + 'T00:00:00').toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function WarrantiesPage() {
  const propertyId = useSelector(selectCurrentPropertyId);

  const [page,           setPage]           = useState(1);
  const [search,         setSearch]         = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter,   setStatusFilter]   = useState('all');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter]);

  const params = {
    propertyId,
    page,
    limit: LIMIT,
    ...(debouncedSearch          && { search: debouncedSearch }),
    ...(statusFilter !== 'all'   && { status: statusFilter    }),
  };

  const { data, isFetching, isLoading } = useGetQuery(
    { path: '/assets/warranties', params },
    { skip: !propertyId },
  );

  const items      = data?.items  ?? [];
  const stats      = data?.stats  ?? { total: 0, expired: 0, expiring: 0, active: 0 };
  const totalPages = data?.pages  ?? 1;
  const totalCount = data?.total  ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Warranty Management</h1>
        <p className="text-[13px] text-slate-400 mt-0.5">Track warranty status, expiry dates, and claim contacts for all assets</p>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Warranties', value: stats.total,    icon: Package,    color: 'bg-navy-50 text-navy-700'       },
            { label: 'Active',           value: stats.active,   icon: ShieldCheck, color: 'bg-success-50 text-success-700' },
            { label: 'Expiring < 90d',   value: stats.expiring, icon: ShieldAlert, color: 'bg-warning-50 text-warning-700' },
            { label: 'Expired',          value: stats.expired,  icon: ShieldX,     color: 'bg-danger-50 text-danger-700'   },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4"
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
              <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', s.color)}>
                <s.icon className="w-5 h-5" strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-2xl font-bold text-navy-900 leading-none">{s.value}</p>
                <p className="text-[12px] text-slate-400 mt-1">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Expiring alert */}
      {!isLoading && stats.expiring > 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
          className="flex items-start gap-3 p-4 bg-warning-50 border border-warning-200 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-warning-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-warning-800">
              {stats.expiring} warrant{stats.expiring > 1 ? 'ies are' : 'y is'} expiring within 90 days
            </p>
            <p className="text-[12px] text-warning-700 mt-0.5">Contact the warranty providers to check renewal options before they lapse.</p>
          </div>
          <button onClick={() => setStatusFilter('expiring')} className="text-[12px] font-semibold text-warning-700 hover:text-warning-900 shrink-0">View →</button>
        </motion.div>
      )}

      {/* Search + Status filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search assets…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-[13px] bg-white border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-300 focus:border-accent-400 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((f) => {
            const count = f.key === 'all' ? stats.total : (stats[f.key] ?? 0);
            return (
              <button key={f.key} onClick={() => setStatusFilter(f.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold whitespace-nowrap transition-all border shrink-0',
                  statusFilter === f.key
                    ? 'bg-navy-900 text-white border-navy-900 shadow-sm'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700',
                )}
              >
                {f.label}
                <span className={cn(
                  'text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center',
                  statusFilter === f.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500',
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-2xl" />)}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={Shield}
            title="No warranties found"
            description={search ? 'Try a different search term.' : 'No assets match this filter.'}
          />
        </Card>
      ) : (
        <div className={cn('grid grid-cols-1 lg:grid-cols-2 gap-4 transition-opacity duration-200', isFetching && 'opacity-50')}>
          <AnimatePresence mode="popLayout">
            {items.map((asset, i) => {
              const days   = getDays(asset.warranty.expiryDate);
              const status = getStatus(days);
              return <WarrantyCard key={asset.id ?? asset._id} asset={{ ...asset, days, status }} index={i} />;
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-[12px] text-slate-400">
            {totalCount} warrant{totalCount !== 1 ? 'ies' : 'y'} · Page {page}/{totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:border-navy-300 hover:text-navy-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:border-navy-300 hover:text-navy-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function WarrantyCard({ asset, index }) {
  const navigate = useNavigate();
  const assetId  = asset.id ?? asset._id;
  const w    = asset.warranty;
  const days = asset.days;
  const st   = asset.status;
  const cc   = CAT_COLOR[asset.category] ?? DEFAULT_CC;

  const startMs  = w.startDate ? new Date(w.startDate  + 'T00:00:00').getTime() : 0;
  const expiryMs =               new Date(w.expiryDate + 'T00:00:00').getTime();
  const nowMs    = Date.now();
  const total    = expiryMs - startMs;
  const progress = startMs && total > 0 ? Math.min(100, Math.max(0, ((nowMs - startMs) / total) * 100)) : 100;

  const borderColor = { active: 'border-l-success-400', expiring: 'border-l-warning-400', expired: 'border-l-danger-400' }[st.key] ?? 'border-l-slate-200';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      onClick={() => navigate(`/assets/${assetId}`)}
      className="cursor-pointer"
    >
      <div className={cn('bg-white rounded-2xl border border-slate-100 border-l-4 overflow-hidden hover:shadow-md transition-shadow', borderColor)} style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="p-5">
          {/* Top row */}
          <div className="flex items-start gap-3 mb-4">
            <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', cc.bg)}>
              <Package className={cn('w-5 h-5', cc.icon)} strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-[14px] font-bold text-slate-800">{asset.name}</h3>
                <Badge variant={st.variant} size="sm" dot>{st.label}</Badge>
              </div>
              <p className="text-[12px] text-slate-400 mt-0.5">
                {[asset.brand, asset.model].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 shrink-0">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 mb-4 text-[12px]">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Provider</p>
              <p className="font-semibold text-slate-700">{w.provider || '—'}</p>
              {w.policyNumber && <p className="text-slate-400 text-[11px] mt-0.5">{w.policyNumber}</p>}
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Coverage</p>
              <p className="font-semibold text-slate-700">{w.coverage || w.type || '—'}</p>
            </div>
            {w.startDate && (
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Start Date</p>
                <p className="font-semibold text-slate-700">{fmtDate(w.startDate)}</p>
              </div>
            )}
            <div className={cn('rounded-xl p-3', days < 0 ? 'bg-danger-50' : days < 90 ? 'bg-warning-50' : 'bg-slate-50')}>
              <p className={cn('text-[10px] font-bold uppercase tracking-wider mb-1', days < 0 ? 'text-danger-500' : days < 90 ? 'text-warning-600' : 'text-slate-400')}>
                Expiry Date
              </p>
              <p className={cn('font-semibold', days < 0 ? 'text-danger-700' : days < 90 ? 'text-warning-700' : 'text-slate-700')}>
                {fmtDate(w.expiryDate)}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-slate-400 font-medium">Warranty used</span>
              <span className={cn('text-[12px] font-bold', days < 0 ? 'text-danger-600' : days < 90 ? 'text-warning-600' : 'text-success-600')}>
                {days > 0 ? `${days} days left` : days === 0 ? 'Expires today' : `Expired ${Math.abs(days)}d ago`}
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
                className={cn('h-full rounded-full', days < 0 ? 'bg-danger-400' : days < 90 ? 'bg-warning-400' : 'bg-success-400')}
              />
            </div>
          </div>

          {/* Contact — stop propagation so card click doesn't fire when dialling */}
          {w.phone && (
            <a href={`tel:${w.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-accent-200 hover:bg-accent-50 transition-all group">
              <Phone className="w-3.5 h-3.5 text-slate-400 group-hover:text-accent-600" />
              <span className="text-[12px] text-slate-600 font-medium">{w.phone}</span>
              <span className="text-[11px] text-slate-400 ml-auto">Call {w.provider}</span>
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}
