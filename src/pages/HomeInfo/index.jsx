import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import {
  LayoutGrid, User, MapPin, Shield,
  BedDouble, Bath, Car, Ruler,
} from 'lucide-react';
import { useGetQuery } from '../../api/apiSlice';
import { selectCurrentPropertyId } from '../../store/slices/propertiesSlice';
import Badge from '../../components/ui/Badge';
import { cn } from '../../utils/cn';
import OverviewTab  from './tabs/OverviewTab';
import OwnerTab     from './tabs/OwnerTab';
import AddressTab   from './tabs/AddressTab';
import InsuranceTab from './tabs/InsuranceTab';

const TABS = [
  { id: 'overview',  label: 'Overview',  icon: LayoutGrid },
  { id: 'owner',     label: 'Owner',     icon: User       },
  { id: 'address',   label: 'Address',   icon: MapPin     },
  { id: 'insurance', label: 'Insurance', icon: Shield     },
];

const HERO_STATS = [
  { icon: BedDouble, label: 'Bedrooms',  key: 'bedrooms'  },
  { icon: Bath,      label: 'Bathrooms', key: 'bathrooms' },
  { icon: Ruler,     label: 'Sq. m',     key: 'size'      },
  { icon: Car,       label: 'Parking',   key: 'parking'   },
];

export default function HomeInfo() {
  const propertyId = useSelector(selectCurrentPropertyId);
  const { data: home = {}, isLoading } = useGetQuery({ path: '/home-info', params: { propertyId } }, { skip: !propertyId });
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
      className="space-y-5"
    >
      {/* ── Hero ── */}
      <div className="relative rounded-3xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#060f1e] via-[#0b1d3a] to-[#0d2449]" />
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #C9A227 0%, transparent 70%)' }} />
        <div className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full opacity-5" style={{ background: 'white' }} />
        <div className="absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        {/* Gold top line */}
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, transparent, #C9A227 40%, #C9A227 60%, transparent)' }} />

        <div className="relative z-10 p-7 sm:p-9">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              {home.type && (
                <Badge variant="primary" size="sm" className="bg-white/10! text-white/70! border-white/20!">
                  {home.type}
                </Badge>
              )}
              {home.status && (
                <Badge variant="success" size="sm" dot className="bg-emerald-500/15! text-emerald-300! border-emerald-500/20!">
                  {home.status}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-1.5">
              {isLoading ? <span className="opacity-40">Loading…</span> : (home.name || 'Shah Villa')}
            </h1>
            <p className="text-white/45 text-[13px] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              {[home.address?.villa, home.address?.district, home.address?.city, 'UAE'].filter(Boolean).join(', ') || 'Dubai, UAE'}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {HERO_STATS.map((s) => (
              <div key={s.key} className="rounded-2xl px-4 py-3.5 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.065)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(201,162,39,0.15)', border: '1px solid rgba(201,162,39,0.25)' }}>
                  <s.icon className="w-4 h-4 text-[#C9A227]" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-[19px] font-black text-white leading-none">{home[s.key] ?? '—'}</p>
                  <p className="text-white/38 text-[10.5px] mt-0.5 font-medium">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-1.5 flex items-center gap-1 overflow-x-auto" style={{ boxShadow: 'var(--shadow-card)' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-all flex-shrink-0',
              activeTab === tab.id
                ? 'text-navy-900 bg-navy-50 shadow-sm'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50',
            )}
          >
            <tab.icon className={cn('w-4 h-4', activeTab === tab.id ? 'text-navy-700' : 'text-slate-400')} strokeWidth={1.8} />
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="hi-tab" className="absolute bottom-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full" style={{ background: '#C9A227' }} transition={{ duration: 0.2 }} />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === 'overview'  && <OverviewTab  />}
          {activeTab === 'owner'     && <OwnerTab     />}
          {activeTab === 'address'   && <AddressTab   />}
          {activeTab === 'insurance' && <InsuranceTab />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
