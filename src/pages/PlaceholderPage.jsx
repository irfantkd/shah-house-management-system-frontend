import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Home, MapPin, Package, Building2, FileText, CalendarClock,
  Wrench, History, ShieldCheck, CreditCard, FolderOpen, Calendar,
  Bell, PhoneCall, Settings, Construction, ArrowLeft,
} from 'lucide-react';
import Button from '../components/ui/Button';

const ICON_MAP = {
  Home, MapPin, Package, Building2, FileText, CalendarClock,
  Wrench, History, ShieldCheck, CreditCard, FolderOpen, Calendar,
  Bell, PhoneCall, Settings,
};

export default function PlaceholderPage({ title = 'Coming Soon', icon = 'Construction', description }) {
  const Icon = ICON_MAP[icon] ?? Construction;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="min-h-[60vh] flex flex-col items-center justify-center py-20 px-6 text-center"
    >
      {/* Icon */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-accent-50 to-navy-50 border border-accent-100 flex items-center justify-center shadow-sm">
          <Icon className="w-9 h-9 text-navy-900" strokeWidth={1.5} />
        </div>
        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-warning-50 border border-warning-100 flex items-center justify-center">
          <Construction className="w-3.5 h-3.5 text-warning-600" />
        </div>
      </div>

      {/* Text */}
      <h1 className="text-2xl font-bold text-navy-900 tracking-tight mb-2">{title}</h1>
      <p className="text-[14px] text-slate-400 max-w-sm leading-relaxed mb-2">
        {description ?? 'This page is currently in development and will be available soon.'}
      </p>
      <div className="inline-flex items-center gap-1.5 text-[12px] text-warning-600 bg-warning-50 px-3 py-1.5 rounded-full font-medium mb-8 border border-warning-100">
        <Construction className="w-3 h-3" /> Under development
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Link to="/">
          <Button variant="outline" size="md" icon={ArrowLeft}>
            Back to Dashboard
          </Button>
        </Link>
        <Button variant="primary" size="md">
          Notify me when ready
        </Button>
      </div>
    </motion.div>
  );
}
