import {
  BedDouble, Bath, Car, Waves, Leaf, Zap, Cpu, Sun,
  Layers, Ruler, CalendarDays, Pencil,
} from 'lucide-react';
import Card, { CardHeader } from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';

const FEATURE_ICONS = {
  pool:      { icon: Waves,  label: 'Swimming Pool',    color: 'text-accent-500',   bg: 'bg-accent-50'  },
  garden:    { icon: Leaf,   label: 'Garden',           color: 'text-success-600',  bg: 'bg-success-50' },
  generator: { icon: Zap,    label: 'Generator',        color: 'text-warning-600',  bg: 'bg-warning-50' },
  smart:     { icon: Cpu,    label: 'Smart Home',       color: 'text-accent-600',   bg: 'bg-accent-50'  },
  solar:     { icon: Sun,    label: 'Solar System',     color: 'text-warning-500',  bg: 'bg-warning-50' },
};

export default function OverviewTab({ home, onEdit }) {
  const specs = [
    { icon: BedDouble,    label: 'Bedrooms',      value: home.bedrooms                     },
    { icon: Bath,         label: 'Bathrooms',      value: home.bathrooms                    },
    { icon: Layers,       label: 'Floors',         value: home.floors                       },
    { icon: Car,          label: 'Parking',        value: `${home.parking} cars`            },
    { icon: Ruler,        label: 'Built-up Area',  value: `${home.size.toLocaleString()} m²` },
    { icon: Ruler,        label: 'Plot Area',      value: `${home.landSize.toLocaleString()} m²` },
    { icon: CalendarDays, label: 'Year Built',     value: home.yearBuilt                    },
    { icon: CalendarDays, label: 'Renovated',      value: home.renovated                    },
  ];

  const features = Object.entries(FEATURE_ICONS)
    .filter(([key]) => home[key])
    .map(([key, conf]) => ({ key, ...conf }));

  return (
    <div className="space-y-5">

      {/* Description */}
      <Card>
        <CardHeader
          title="About this property"
          action={
            <Button variant="ghost" size="sm" icon={Pencil} onClick={onEdit}>
              Edit
            </Button>
          }
        />
        <p className="text-[14px] text-slate-600 leading-relaxed">{home.description}</p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Badge variant="default">{home.type}</Badge>
          <Badge variant="success" dot>{home.status}</Badge>
        </div>
      </Card>

      {/* Specs grid */}
      <Card>
        <CardHeader title="Property specifications" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {specs.map((s) => (
            <div key={s.label} className="flex flex-col gap-2 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
              <div className="flex items-center gap-2">
                <s.icon className="w-4 h-4 text-slate-400" strokeWidth={1.8} />
                <span className="text-[11px] text-slate-400 font-medium">{s.label}</span>
              </div>
              <p className="text-[18px] font-bold text-navy-900 leading-none">{s.value}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Features / Amenities */}
      <Card>
        <CardHeader title="Amenities & features" />
        <div className="flex flex-wrap gap-3">
          {features.map((f) => (
            <div key={f.key} className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border ${f.bg} border-slate-100`}>
              <f.icon className={`w-4 h-4 ${f.color}`} strokeWidth={1.8} />
              <span className={`text-[13px] font-semibold ${f.color}`}>{f.label}</span>
            </div>
          ))}
          {features.length === 0 && (
            <p className="text-[13px] text-slate-400">No special amenities recorded.</p>
          )}
        </div>
      </Card>

    </div>
  );
}
