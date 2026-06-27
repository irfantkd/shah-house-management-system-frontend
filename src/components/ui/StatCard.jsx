import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';

const colorMap = {
  blue:    { icon: 'bg-accent-50 text-accent-600',   border: 'border-accent-100',  value: 'text-navy-900' },
  orange:  { icon: 'bg-warning-50 text-warning-600', border: 'border-warning-100', value: 'text-navy-900' },
  red:     { icon: 'bg-danger-50 text-danger-600',   border: 'border-danger-100',  value: 'text-navy-900' },
  green:   { icon: 'bg-success-50 text-success-600', border: 'border-success-100', value: 'text-navy-900' },
  navy:    { icon: 'bg-navy-900 text-white',          border: 'border-navy-100',    value: 'text-navy-900' },
};

export default function StatCard({ title, value, icon: Icon, trend, color = 'blue', href, index = 0 }) {
  const c = colorMap[color] ?? colorMap.blue;

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        'bg-white rounded-2xl border p-5 flex flex-col gap-4 group',
        'hover:shadow-lg transition-all duration-200',
        c.border,
      )}
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-start justify-between">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', c.icon)}>
          <Icon className="w-5 h-5" strokeWidth={1.8} />
        </div>
        {trend && <TrendBadge trend={trend} />}
      </div>
      <div>
        <p className={cn('text-3xl font-bold tracking-tight leading-none', c.value)}>{value}</p>
        <p className="text-[12px] text-slate-400 mt-1.5 font-medium">{title}</p>
      </div>
    </motion.div>
  );

  if (href) {
    return <Link to={href} className="block">{content}</Link>;
  }
  return content;
}

function TrendBadge({ trend }) {
  if (trend.direction === 'up') return (
    <span className="flex items-center gap-1 text-[11px] font-semibold text-success-600 bg-success-50 px-2 py-0.5 rounded-full">
      <TrendingUp className="w-3 h-3" />+{trend.value}
    </span>
  );
  if (trend.direction === 'down') return (
    <span className="flex items-center gap-1 text-[11px] font-semibold text-danger-600 bg-danger-50 px-2 py-0.5 rounded-full">
      <TrendingDown className="w-3 h-3" />-{trend.value}
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
      <Minus className="w-3 h-3" />{trend.value}
    </span>
  );
}
