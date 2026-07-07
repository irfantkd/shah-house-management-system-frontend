import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  RiAddLine, RiSearchLine, RiLayoutGridLine, RiListCheck2,
  RiEditLine, RiDeleteBinLine, RiPhoneLine, RiArrowRightLine,
  RiBuilding2Line, RiStarFill, RiStarLine, RiUserLine,
} from 'react-icons/ri';
import { selectCompanies, addCompany, updateCompany, deleteCompany } from '../../store/slices/companiesSlice';
import { CATEGORY_CFG } from '../../data/mockCompanies';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Field, Input, Select, Textarea, FormGrid, FormSection, FormActions } from '../../components/ui/FormField';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { cn } from '../../utils/cn';

const CATS = Object.keys(CATEGORY_CFG);

// Hex accent colour per category — used for accent bar + avatar glow
const CAT_HEX = {
  'Climate / AC':      '#2563eb',
  'Pool & Water':      '#0891b2',
  'Garden':            '#16a34a',
  'Cleaning':          '#9333ea',
  'Security / CCTV':   '#1e3a6e',
  'Electrical':        '#d97706',
  'Plumbing':          '#1d4ed8',
  'Pest Control':      '#ea580c',
  'Painting':          '#e11d48',
  'Power / Generator': '#ca8a04',
};
const catColor = (cat) => CAT_HEX[cat] ?? '#0b1d3a';

// First two initials from company name
const initials = (name) => {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
};

function StarRow({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map((n) => n <= Math.round(rating)
        ? <RiStarFill key={n} className="w-3 h-3 text-amber-400" />
        : <RiStarLine  key={n} className="w-3 h-3 text-slate-200" />
      )}
      <span className="text-[11px] text-slate-400 ml-1">{rating > 0 ? rating.toFixed(1) : '—'}</span>
    </div>
  );
}

export default function CompaniesPage() {
  const dispatch    = useDispatch();
  const companies   = useSelector(selectCompanies);
  const [search,    setSearch]    = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [view,      setView]      = useState('grid');
  const [modal,     setModal]     = useState(null);
  const [delTarget, setDelTarget] = useState(null);

  const filtered = companies.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = c.name.toLowerCase().includes(q) || (c.contact?.person ?? '').toLowerCase().includes(q);
    const matchCat    = catFilter === 'All' || c.category === catFilter;
    return matchSearch && matchCat;
  });

  const stats = {
    total:      companies.length,
    active:     companies.filter((c) => (c.activeContracts ?? 0) > 0).length,
    totalSpent: companies.reduce((s, c) => s + (c.totalSpent ?? 0), 0),
    avgRating:  (() => { const rated = companies.filter((c) => c.rating > 0); return rated.length ? rated.reduce((s,c)=>s+c.rating,0)/rated.length : 0; })(),
  };

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Service Companies</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">{companies.length} companies · manage your service providers</p>
        </div>
        <Button variant="primary" icon={RiAddLine} onClick={() => setModal('add')}>Add Company</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Companies',   value: stats.total,                                          color: 'from-navy-600 to-navy-800'       },
          { label: 'Active Contracts',  value: stats.active,                                         color: 'from-accent-500 to-accent-700'   },
          { label: 'Total Spent',       value: `AED ${stats.totalSpent.toLocaleString()}`,           color: 'from-success-500 to-success-700' },
          { label: 'Avg Rating',        value: stats.avgRating > 0 ? stats.avgRating.toFixed(1)+' ★':'—', color: 'from-amber-500 to-orange-500' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className={cn('rounded-2xl p-5 text-white bg-gradient-to-br', s.color)}>
            <p className="text-2xl font-bold leading-none">{s.value}</p>
            <p className="text-[12px] text-white/70 mt-2">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search companies or contacts…"
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-[13px] placeholder-slate-400 outline-none focus:ring-2 focus:ring-accent-400 transition-all" />
        </div>
        <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1">
          {[['grid', RiLayoutGridLine], ['list', RiListCheck2]].map(([v, Icon]) => (
            <button key={v} onClick={() => setView(v)}
              className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-all', view === v ? 'bg-navy-900 text-white' : 'text-slate-400 hover:text-slate-600')}>
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {['All', ...CATS].map((cat) => (
          <button key={cat} onClick={() => setCatFilter(cat)}
            className={cn('px-3.5 py-2 rounded-xl text-[12px] font-semibold whitespace-nowrap border transition-all flex-shrink-0',
              catFilter === cat ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300')}>
            {cat}
          </button>
        ))}
      </div>

      {/* Grid / List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <RiBuilding2Line className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-400">No companies found</p>
          <button onClick={() => setModal('add')} className="mt-3 text-accent-600 text-[13px] font-semibold hover:underline">+ Add first company</button>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ delay: i * 0.04 }}>
                <CompanyCard company={c} onEdit={() => setModal(c)} onDelete={() => setDelTarget(c)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {filtered.map((c, i) => (
            <CompanyRow key={c.id} company={c} last={i === filtered.length - 1} onEdit={() => setModal(c)} onDelete={() => setDelTarget(c)} />
          ))}
        </div>
      )}

      <CompanyModal open={modal !== null} company={modal !== 'add' ? modal : null} onClose={() => setModal(null)}
        onSave={(data) => {
          if (modal !== 'add') { dispatch(updateCompany({ ...modal, ...data })); toast.success('Company updated!'); }
          else { dispatch(addCompany(data)); toast.success('Company added!'); }
          setModal(null);
        }}
      />
      <ConfirmDialog open={!!delTarget} onClose={() => setDelTarget(null)}
        onConfirm={() => { dispatch(deleteCompany(delTarget.id)); toast.success('Company deleted'); setDelTarget(null); }}
        title="Delete Company" message={`Delete "${delTarget?.name}"? This cannot be undone.`}
      />
    </motion.div>
  );
}

function CompanyCard({ company: c, onEdit, onDelete }) {
  const color = catColor(c.category);
  const inits = initials(c.name);
  const rating = c.rating ?? 0;

  return (
    <div className="group rounded-3xl overflow-hidden bg-white flex flex-col"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(11,29,58,0.10)' }}>

      {/* ── HEADER ── */}
      <div className="relative px-5 pt-4 pb-4 overflow-hidden"
        style={{ background: 'linear-gradient(150deg, #0a172e 0%, #0c1f3f 55%, #0e2550 100%)' }}>

        {/* category accent bar */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:color, zIndex:2 }} />

        {/* white sheen */}
        <div style={{
          position:'absolute', top:-60, right:-60, width:200, height:200,
          borderRadius:'50%', background:'rgba(255,255,255,0.03)', pointerEvents:'none',
        }} />

        {/* decorative rings */}
        <div style={{ position:'absolute', top:-36, right:-36, width:130, height:130, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.06)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:-18, right:-18, width:80,  height:80,  borderRadius:'50%', border:'1px solid rgba(255,255,255,0.09)', pointerEvents:'none' }} />

        {/* ghost watermark */}
        <div style={{
          position:'absolute', right:8, bottom:-6,
          fontSize:72, fontWeight:900, lineHeight:1,
          color:'rgba(255,255,255,0.04)', letterSpacing:'-3px',
          userSelect:'none', pointerEvents:'none', zIndex:1,
        }}>{inits}</div>

        {/* rating badge – top right */}
        {rating > 0 && (
          <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
            style={{ background:'rgba(251,191,36,0.14)', color:'#fbbf24', border:'1px solid rgba(251,191,36,0.25)', zIndex:10 }}>
            <RiStarFill className="w-3 h-3" />
            {rating.toFixed(1)}
          </div>
        )}

        {/* avatar + name row – fully inside header */}
        <div className="relative flex items-center gap-3.5 mt-1" style={{ zIndex:5 }}>
          <div className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center text-[17px] font-black text-white select-none"
            style={{
              background:`${color}28`,
              border:`2.5px solid rgba(255,255,255,0.13)`,
              boxShadow:`0 4px 20px ${color}40`,
            }}>
            {inits}
          </div>
          <div className="min-w-0 flex-1 pr-10">
            <p className="text-[16px] font-black text-white leading-tight truncate">{c.name}</p>
            <p className="text-[11px] font-semibold mt-0.5" style={{ color:'rgba(255,255,255,0.42)' }}>
              {c.category}
            </p>
          </div>
        </div>

        {/* edit / delete – reveal on hover */}
        <div className="absolute bottom-3.5 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ zIndex:10 }}>
          <button onClick={(e) => { e.preventDefault(); onEdit(); }}
            className="w-7 h-7 rounded-xl flex items-center justify-center border transition-all"
            style={{ color:'rgba(255,255,255,0.6)', borderColor:'rgba(255,255,255,0.12)', background:'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.background='rgba(255,255,255,0.12)'; e.currentTarget.style.color='#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(255,255,255,0.6)'; }}>
            <RiEditLine className="w-3.5 h-3.5" />
          </button>
          <button onClick={(e) => { e.preventDefault(); onDelete(); }}
            className="w-7 h-7 rounded-xl flex items-center justify-center border transition-all"
            style={{ color:'rgba(255,255,255,0.6)', borderColor:'rgba(255,255,255,0.12)', background:'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.background='rgba(239,68,68,0.22)'; e.currentTarget.style.color='#fca5a5'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(255,255,255,0.6)'; }}>
            <RiDeleteBinLine className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="flex-1 flex flex-col px-5 pt-4 pb-4 gap-3">
        {c.tagline && (
          <p className="text-[12px] text-slate-400 line-clamp-1">{c.tagline}</p>
        )}

        <div className="space-y-2">
          {c.contact?.person && (
            <div className="flex items-center gap-2 text-[12px] text-slate-600">
              <RiUserLine className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span className="font-medium truncate">{c.contact.person}</span>
            </div>
          )}
          {c.contact?.phone && (
            <div className="flex items-center gap-2 text-[12px] text-slate-500">
              <RiPhoneLine className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span className="truncate">{c.contact.phone}</span>
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* footer */}
        <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Contracts · Spent</p>
            <p className="text-[13px] font-bold" style={{ color:'#0b1d3a' }}>
              {c.activeContracts ?? 0} · AED {(c.totalSpent ?? 0).toLocaleString()}
            </p>
          </div>
          <Link to={`/companies/${c.id}`}
            className="flex items-center gap-1 text-[12px] font-bold text-slate-400 hover:text-navy-800 transition-colors">
            View <RiArrowRightLine className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function CompanyRow({ company: c, onEdit, onDelete, last }) {
  const color = catColor(c.category);
  const inits = initials(c.name);
  return (
    <div className={cn('flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group', !last && 'border-b border-slate-50')}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-[13px] flex-shrink-0 select-none"
        style={{ background:`${color}cc` }}>{inits}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-slate-800 truncate">{c.name}</p>
        <p className="text-[11px] text-slate-400">{c.category}</p>
      </div>
      <div className="hidden sm:block"><StarRow rating={c.rating ?? 0} /></div>
      <span className="hidden md:block text-[12px] text-slate-500">{c.contact?.phone ?? '—'}</span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit}   className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-accent-600 hover:bg-accent-50 transition-all"><RiEditLine className="w-3.5 h-3.5" /></button>
        <button onClick={onDelete} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-danger-500 hover:bg-danger-50 transition-all"><RiDeleteBinLine className="w-3.5 h-3.5" /></button>
        <Link to={`/companies/${c.id}`} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-navy-700 hover:bg-navy-50 transition-all"><RiArrowRightLine className="w-3.5 h-3.5" /></Link>
      </div>
    </div>
  );
}

function CompanyModal({ open, onClose, company, onSave }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  useEffect(() => {
    if (!open) return;
    reset(company ? {
      name: company.name, category: company.category, tagline: company.tagline ?? '',
      person: company.contact?.person ?? '', phone: company.contact?.phone ?? '',
      mobile: company.contact?.mobile ?? '', email: company.contact?.email ?? '',
      whatsapp: company.contact?.whatsapp ?? '', address: company.address ?? '', notes: company.notes ?? '',
    } : {});
  }, [open, company]);

  const onSubmit = (d) => onSave({
    name: d.name, category: d.category, tagline: d.tagline ?? '',
    contact: { person: d.person ?? '', phone: d.phone ?? '', mobile: d.mobile ?? '', email: d.email ?? '', whatsapp: d.whatsapp ?? '' },
    address: d.address ?? '', notes: d.notes ?? '',
  });

  return (
    <Modal open={open} onClose={onClose} title={company ? 'Edit Company' : 'Add New Company'}
      subtitle={company ? `Editing: ${company.name}` : 'Add a service provider to your system'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <FormGrid>
          <Field label="Company Name" required error={errors.name?.message}>
            <Input {...register('name', { required: 'Required' })} placeholder="e.g. Cool Air LLC" />
          </Field>
          <Field label="Category" required error={errors.category?.message}>
            <Select {...register('category', { required: 'Required' })} placeholder="Select category"
              options={CATS.map((c) => ({ value: c, label: c }))} />
          </Field>
        </FormGrid>
        <Field label="Tagline / Short Description">
          <Input {...register('tagline')} placeholder="e.g. Premium AC maintenance specialists" />
        </Field>
        <FormSection title="Contact Details">
          <FormGrid>
            <Field label="Contact Person"><Input {...register('person')} placeholder="Full name" /></Field>
            <Field label="Office Phone"><Input {...register('phone')} placeholder="+971 4 XXX XXXX" /></Field>
            <Field label="Mobile"><Input {...register('mobile')} placeholder="+971 5X XXX XXXX" /></Field>
            <Field label="Email"><Input {...register('email')} type="email" placeholder="name@company.com" /></Field>
            <Field label="WhatsApp"><Input {...register('whatsapp')} placeholder="+971 5X XXX XXXX" /></Field>
          </FormGrid>
        </FormSection>
        <Field label="Address">
          <Input {...register('address')} placeholder="Street, area, Dubai" />
        </Field>
        <Field label="Notes">
          <Textarea {...register('notes')} placeholder="Any additional notes about this company…" />
        </Field>
        <FormActions onCancel={onClose} submitLabel={company ? 'Update Company' : 'Add Company'} />
      </form>
    </Modal>
  );
}
