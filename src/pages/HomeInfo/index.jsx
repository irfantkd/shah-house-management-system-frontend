import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid, User, MapPin, Image, FolderOpen, Shield,
  BedDouble, Bath, Car, Ruler, Pencil, CheckCircle2,
} from 'lucide-react';
import { homeInfo } from '../../data/mockHomeInfo';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { CardSkeleton } from '../../components/ui/LoadingSkeleton';
import OverviewTab   from './tabs/OverviewTab';
import OwnerTab      from './tabs/OwnerTab';
import AddressTab    from './tabs/AddressTab';
import ImagesTab     from './tabs/ImagesTab';
import DocumentsTab  from './tabs/DocumentsTab';
import InsuranceTab  from './tabs/InsuranceTab';
import { cn } from '../../utils/cn';

const TABS = [
  { id: 'overview',   label: 'Overview',   icon: LayoutGrid  },
  { id: 'owner',      label: 'Owner',      icon: User        },
  { id: 'address',    label: 'Address',    icon: MapPin      },
  { id: 'images',     label: 'Images',     icon: Image       },
  { id: 'documents',  label: 'Documents',  icon: FolderOpen  },
  { id: 'insurance',  label: 'Insurance',  icon: Shield      },
];

const HERO_STATS = [
  { icon: BedDouble, label: 'Beds',     value: (h) => h.bedrooms  },
  { icon: Bath,      label: 'Baths',    value: (h) => h.bathrooms },
  { icon: Ruler,     label: 'Sq.m',     value: (h) => h.size      },
  { icon: Car,       label: 'Parking',  value: (h) => h.parking   },
];

export default function HomeInfo() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading,   setLoading]   = useState(true);
  const [editMode,  setEditMode]  = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
      className="space-y-5"
    >

      {/* ── Hero header ── */}
      <div className="relative rounded-3xl overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800" />
        {/* Decorative circles */}
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-accent-600/10 rounded-full" />
        <div className="absolute -bottom-8 -left-8  w-48 h-48 bg-white/[0.02] rounded-full" />
        {/* Grid texture */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="primary" size="sm" className="!bg-accent-600/20 !text-accent-300 !border-0">
                  {homeInfo.type}
                </Badge>
                <Badge variant="success" size="sm" dot className="!bg-success-600/20 !text-success-300 !border-0">
                  {homeInfo.status}
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{homeInfo.name}</h1>
              <p className="text-white/50 text-[13px] mt-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {homeInfo.address.villa}, {homeInfo.address.district}, {homeInfo.address.city}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={editMode ? CheckCircle2 : Pencil}
                onClick={() => setEditMode((v) => !v)}
                className="!bg-white/10 !border-white/20 !text-white hover:!bg-white/20"
              >
                {editMode ? 'Save changes' : 'Edit property'}
              </Button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {HERO_STATS.map((stat) => (
              <div key={stat.label} className="bg-white/[0.07] border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <stat.icon className="w-4 h-4 text-white/70" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-xl font-bold text-white leading-none">{stat.value(homeInfo)}</p>
                  <p className="text-white/40 text-[11px] mt-0.5">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab navigation ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-1.5 flex items-center gap-1 overflow-x-auto" style={{ boxShadow: 'var(--shadow-card)' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-all duration-150 flex-shrink-0',
              activeTab === tab.id
                ? 'text-navy-900 bg-navy-50'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50',
            )}
          >
            <tab.icon className={cn('w-4 h-4', activeTab === tab.id ? 'text-navy-700' : 'text-slate-400')} strokeWidth={1.8} />
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-accent-600 rounded-full"
                transition={{ duration: 0.2 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {loading ? (
        <div className="space-y-5">
          <CardSkeleton rows={3} />
          <CardSkeleton rows={4} />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview'  && <OverviewTab  home={homeInfo}                   onEdit={() => setEditMode(true)} />}
            {activeTab === 'owner'     && <OwnerTab     owner={homeInfo.owner}             onEdit={() => setEditMode(true)} />}
            {activeTab === 'address'   && <AddressTab   address={homeInfo.address}         onEdit={() => setEditMode(true)} />}
            {activeTab === 'images'    && <ImagesTab    images={homeInfo.images}                                            />}
            {activeTab === 'documents' && <DocumentsTab documents={homeInfo.documents}                                     />}
            {activeTab === 'insurance' && <InsuranceTab insurance={homeInfo.insurance}     onEdit={() => setEditMode(true)} />}
          </motion.div>
        </AnimatePresence>
      )}

    </motion.div>
  );
}
