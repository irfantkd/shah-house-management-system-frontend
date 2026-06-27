import { useEffect, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Package, Info, Shield, History, CalendarClock,
  FolderOpen, CheckCircle2, Clock, Wrench, AlertTriangle,
  MapPin, CalendarDays, DollarSign, Building2, Hash, User,
  Phone, Mail, FileText, Download, Eye, Trash2, Upload,
  ChevronRight, TrendingUp,
} from 'lucide-react';
import { getAssetById } from '../../data/mockAssets';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { cn } from '../../utils/cn';

const STATUS_CFG = {
  operational:   { label: 'Operational',  variant: 'success', icon: CheckCircle2, bar: 'bg-success-500' },
  'service-due': { label: 'Service Due',  variant: 'warning', icon: Clock,        bar: 'bg-warning-500' },
  'under-repair':{ label: 'Under Repair', variant: 'danger',  icon: Wrench,       bar: 'bg-danger-500'  },
  inactive:      { label: 'Inactive',     variant: 'default', icon: AlertTriangle, bar: 'bg-slate-300'  },
};

const TABS = [
  { id: 'details',  label: 'Details',         icon: Info          },
  { id: 'warranty', label: 'Warranty',         icon: Shield        },
  { id: 'history',  label: 'Service History',  icon: History       },
  { id: 'schedule', label: 'Schedule',         icon: CalendarClock },
  { id: 'docs',     label: 'Documents',        icon: FolderOpen    },
];

const TYPE_COLORS = { pdf: 'bg-danger-50 text-danger-600', jpg: 'bg-accent-50 text-accent-600', png: 'bg-success-50 text-success-600' };
const STATUS_SVC  = {
  completed: { label: 'Completed', variant: 'success' },
  pending:   { label: 'Pending',   variant: 'warning' },
  cancelled: { label: 'Cancelled', variant: 'default' },
};

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
        <Icon className="w-3.5 h-3.5 text-slate-500" />
      </div>
      <div>
        <p className="text-[11px] text-slate-400 font-medium">{label}</p>
        <p className="text-[13px] font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

export default function AssetDetail() {
  const { id } = useParams();
  const [tab, setTab]         = useState('details');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, [id]);

  const asset = getAssetById(id);
  if (!asset) return <Navigate to="/assets" replace />;

  const sc = STATUS_CFG[asset.status] ?? STATUS_CFG.operational;
  const StatusIcon = sc.icon;
  const warrantyOk = new Date(asset.warranty.expiryDate) > new Date();
  const daysToService = Math.ceil((new Date(asset.maintenance.nextService) - new Date()) / (1000 * 60 * 60 * 24));
  const totalSpend = asset.serviceHistory.reduce((s, i) => s + i.cost, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
      className="space-y-5"
    >
      {/* Back */}
      <Link to="/assets" className="inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-700 font-medium transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Assets
      </Link>

      {/* ── Hero ── */}
      <div className="bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 rounded-3xl overflow-hidden relative">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-600/10 rounded-full -translate-y-1/2 translate-x-1/2" />

        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
                <Package className="w-7 h-7 text-white" strokeWidth={1.6} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge variant={sc.variant} size="sm" dot className="!bg-white/10 !border-0 capitalize">{sc.label}</Badge>
                  <Badge variant="default" size="sm" className="!bg-white/10 !text-white/70 !border-0 capitalize">{asset.category}</Badge>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{asset.name}</h1>
                <p className="text-white/50 text-[13px] mt-0.5">{asset.brand} · {asset.model}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3 h-3 text-white/40" />
                  <span className="text-white/40 text-[12px]">{asset.areaName}</span>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" icon={CalendarDays}
              className="!bg-white/10 !border-white/20 !text-white hover:!bg-white/20 flex-shrink-0">
              Book Service
            </Button>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Purchased',       value: new Date(asset.purchaseDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) },
              { label: 'Services logged', value: asset.serviceHistory.length },
              { label: 'Total spend',     value: `AED ${totalSpend.toLocaleString()}` },
              { label: 'Next service',    value: daysToService < 0 ? 'Overdue' : `${daysToService}d` },
            ].map((s) => (
              <div key={s.label} className="bg-white/[0.07] border border-white/10 rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-white/40 font-medium uppercase tracking-wide">{s.label}</p>
                <p className={cn('text-[16px] font-bold text-white mt-0.5 leading-tight', daysToService < 0 && s.label === 'Next service' && '!text-danger-400')}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-1.5 flex items-center gap-1 overflow-x-auto" style={{ boxShadow: 'var(--shadow-card)' }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-semibold whitespace-nowrap transition-all duration-150 flex-shrink-0',
              tab === t.id ? 'text-navy-900 bg-navy-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            )}
          >
            <t.icon className={cn('w-4 h-4', tab === t.id ? 'text-navy-700' : 'text-slate-400')} strokeWidth={1.8} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>

          {/* DETAILS */}
          {tab === 'details' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card>
                <CardHeader title="Asset information" />
                <Row icon={Package}      label="Asset name"      value={asset.name}           />
                <Row icon={Building2}    label="Brand"           value={asset.brand}          />
                <Row icon={Info}         label="Model"           value={asset.model}          />
                <Row icon={Hash}         label="Serial number"   value={asset.serialNumber}   />
                <Row icon={MapPin}       label="Location"        value={asset.areaName}       />
              </Card>
              <Card>
                <CardHeader title="Purchase & install" />
                <Row icon={CalendarDays} label="Purchase date"   value={new Date(asset.purchaseDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />
                <Row icon={DollarSign}   label="Purchase price"  value={`AED ${asset.purchasePrice.toLocaleString()}`} />
                <Row icon={CalendarDays} label="Install date"    value={new Date(asset.installDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />
                <Row icon={User}         label="Installer"       value={asset.installer}      />
                <Row icon={Info}         label="Condition"       value={asset.condition}      />
              </Card>
              {asset.notes && (
                <Card className="lg:col-span-2">
                  <CardHeader title="Notes" />
                  <p className="text-[14px] text-slate-600 leading-relaxed">{asset.notes}</p>
                </Card>
              )}
            </div>
          )}

          {/* WARRANTY */}
          {tab === 'warranty' && (
            <div className="space-y-5">
              <div className={cn('rounded-2xl p-6 relative overflow-hidden', warrantyOk ? 'bg-gradient-to-br from-navy-900 to-navy-800' : 'bg-gradient-to-br from-slate-700 to-slate-800')}>
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="flex items-start gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <Badge size="sm" className={cn('!border-0 mb-2', warrantyOk ? '!bg-success-500/20 !text-success-300' : '!bg-slate-500/20 !text-slate-300')}>
                      {warrantyOk ? 'Active Warranty' : 'Warranty Expired'}
                    </Badge>
                    <p className="text-white font-bold text-xl">{asset.warranty.type}</p>
                    <p className="text-white/50 text-[13px] mt-0.5">{asset.warranty.provider}</p>
                  </div>
                </div>
                <div className="mt-5 pt-5 border-t border-white/10 grid grid-cols-2 gap-4 relative z-10">
                  <div>
                    <p className="text-white/40 text-[11px]">Policy Number</p>
                    <p className="text-white font-semibold text-[13px] mt-0.5">{asset.warranty.policyNumber}</p>
                  </div>
                  <div>
                    <p className="text-white/40 text-[11px]">Coverage</p>
                    <p className="text-white font-semibold text-[13px] mt-0.5">{asset.warranty.coverage}</p>
                  </div>
                </div>
              </div>
              <Card>
                <CardHeader title="Warranty details" />
                <Row icon={CalendarDays} label="Start date"   value={new Date(asset.warranty.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />
                <Row icon={CalendarDays} label="Expiry date"  value={new Date(asset.warranty.expiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />
                <Row icon={Building2}    label="Provider"     value={asset.warranty.provider}  />
                <Row icon={Phone}        label="Contact"      value={asset.warranty.phone}     />
              </Card>
            </div>
          )}

          {/* SERVICE HISTORY */}
          {tab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[13px] text-slate-500 font-medium">{asset.serviceHistory.length} service records · Total: AED {totalSpend.toLocaleString()}</p>
                <Button variant="outline" size="sm" icon={Upload}>Add Record</Button>
              </div>
              {asset.serviceHistory.map((svc, i) => {
                const ssc = STATUS_SVC[svc.status] ?? STATUS_SVC.completed;
                return (
                  <motion.div key={svc.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                    <Card>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                            svc.status === 'completed' ? 'bg-success-50' : svc.status === 'pending' ? 'bg-warning-50' : 'bg-slate-100'
                          )}>
                            {svc.status === 'completed' ? <CheckCircle2 className="w-4.5 h-4.5 text-success-600" /> :
                             svc.status === 'pending'   ? <Clock className="w-4.5 h-4.5 text-warning-600" /> :
                             <Wrench className="w-4.5 h-4.5 text-slate-400" />}
                          </div>
                          <div>
                            <p className="text-[14px] font-bold text-slate-800">{svc.type}</p>
                            <p className="text-[12px] text-slate-400">
                              {new Date(svc.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant={ssc.variant} size="sm">{ssc.label}</Badge>
                          {svc.cost > 0 && <span className="text-[13px] font-bold text-slate-700">AED {svc.cost}</span>}
                        </div>
                      </div>
                      <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[11px] text-slate-400 font-medium">Company</p>
                          <p className="text-[12px] font-semibold text-slate-700 mt-0.5">{svc.company}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-slate-400 font-medium">Technician</p>
                          <p className="text-[12px] font-semibold text-slate-700 mt-0.5">{svc.technician}</p>
                        </div>
                        {svc.notes && (
                          <div className="col-span-2">
                            <p className="text-[11px] text-slate-400 font-medium">Notes</p>
                            <p className="text-[12px] text-slate-600 mt-0.5 leading-relaxed">{svc.notes}</p>
                          </div>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* SCHEDULE */}
          {tab === 'schedule' && (
            <div className="space-y-5">
              <Card>
                <CardHeader title="Maintenance schedule" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Frequency',     value: asset.maintenance.frequency,                                                                     icon: CalendarClock  },
                    { label: 'Last service',  value: new Date(asset.maintenance.lastService).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), icon: CheckCircle2 },
                    { label: 'Next service',  value: new Date(asset.maintenance.nextService).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), icon: daysToService < 0 ? AlertTriangle : Clock },
                  ].map((s) => (
                    <div key={s.label} className={cn('rounded-xl p-4 border', daysToService < 0 && s.label === 'Next service' ? 'bg-danger-50 border-danger-100' : 'bg-slate-50 border-slate-100')}>
                      <div className="flex items-center gap-2 mb-2">
                        <s.icon className={cn('w-4 h-4', daysToService < 0 && s.label === 'Next service' ? 'text-danger-500' : 'text-slate-400')} strokeWidth={1.8} />
                        <span className={cn('text-[11px] font-medium', daysToService < 0 && s.label === 'Next service' ? 'text-danger-500' : 'text-slate-400')}>{s.label}</span>
                      </div>
                      <p className={cn('text-[15px] font-bold leading-tight', daysToService < 0 && s.label === 'Next service' ? 'text-danger-700' : 'text-navy-900')}>{s.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <Row icon={Building2} label="Service company" value={asset.maintenance.company} />
                </div>
              </Card>
              <div className="flex gap-3">
                <Button variant="primary" size="md" icon={CalendarClock} className="flex-1">Schedule Service Now</Button>
                <Button variant="outline" size="md" icon={CalendarDays}>View in Calendar</Button>
              </div>
            </div>
          )}

          {/* DOCUMENTS */}
          {tab === 'docs' && (
            <Card padding={false}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <p className="text-[15px] font-bold text-slate-800">Documents</p>
                  <p className="text-[12px] text-slate-400">{asset.documents.length} files</p>
                </div>
                <Button variant="primary" size="sm" icon={Upload}>Upload</Button>
              </div>
              {asset.documents.map((doc, i) => (
                <div key={doc.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 group">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-[11px]', TYPE_COLORS[doc.type] ?? 'bg-slate-100 text-slate-500')}>
                    {doc.type.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-800 truncate">{doc.name}</p>
                    <p className="text-[11px] text-slate-400">{doc.size} · {new Date(doc.uploaded).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                    <button className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"><Download className="w-3.5 h-3.5" /></button>
                    <button className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-danger-50 hover:text-danger-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </Card>
          )}

        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
