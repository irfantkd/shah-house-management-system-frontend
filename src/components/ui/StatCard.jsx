import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';

const colorMap = {
  blue:    { icon: 'bg-accent-50 text-accent-600',   left: '#e5a800', value: 'text-navy-900' },
  orange:  { icon: 'bg-warning-50 text-warning-600', left: '#d97706', value: 'text-navy-900' },
  red:     { icon: 'bg-danger-50 text-danger-600',   left: '#dc2626', value: 'text-navy-900' },
  green:   { icon: 'bg-success-50 text-success-600', left: '#16a34a', value: 'text-navy-900' },
  navy:    { icon: 'bg-navy-900 text-white',          left: '#0b1d3a', value: 'text-navy-900' },
};

export default function StatCard({ title, value, icon: Icon, trend, color = 'blue', href, index = 0 }) {
  const c = colorMap[color] ?? colorMap.blue;

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        'bg-white rounded-2xl border stat-card-accent p-4 sm:p-5 flex flex-col gap-3 sm:gap-4 group',
        'hover:shadow-(--shadow-card-hover) active:scale-[0.98] transition-all duration-200',
      )}
      style={{ boxShadow: 'var(--shadow-card)', borderColor: 'var(--c-card-border)', borderLeftColor: c.left }}
    >
      <div className="flex items-start justify-between">
        <div className={cn('w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0', c.icon)}>
          <Icon className="w-4.5 h-4.5 sm:w-5 sm:h-5" strokeWidth={1.8} />
        </div>
        {trend && <TrendBadge trend={trend} />}
      </div>
      <div>
        <p className={cn('text-2xl sm:text-3xl font-bold tracking-tight leading-none', c.value)}>{value}</p>
        <p className="text-[11px] sm:text-[12px] text-slate-400 mt-1.5 font-medium">{title}</p>
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
