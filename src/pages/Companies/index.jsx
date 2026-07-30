import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, useWatch } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  RiAddLine, RiSearchLine, RiLayoutGridLine, RiListCheck2,
  RiEditLine, RiDeleteBinLine, RiPhoneLine, RiArrowRightLine,
  RiBuilding2Line, RiStarFill, RiStarLine, RiUserLine,
  RiCloseLine, RiCheckLine, RiLoader4Line, RiRefreshLine,
} from 'react-icons/ri';
import {
  useGetQuery, usePostMutation, usePutMutation, useDeleteMutation,
} from '../../api/apiSlice';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Field, Input, Select, Textarea, FormGrid, FormSection, FormActions } from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import PageLoader from '../../components/ui/PageLoader';
import { MotionSwipeableRow } from '../../components/ui/SwipeableRow';
import { cn } from '../../utils/cn';

const PAGE_SIZE = 12;

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

const initials = (name) => {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
};

function StarRow({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) =>
        n <= Math.round(rating)
          ? <RiStarFill key={n} className="w-3 h-3 text-amber-400" />
          : <RiStarLine  key={n} className="w-3 h-3 text-slate-200" />,
      )}
      <span className="text-[11px] text-slate-400 ml-1">
        {rating > 0 ? rating.toFixed(1) : '—'}
      </span>
    </div>
  );
}

export default function CompaniesPage() {
  const [search,     setSearch]     = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [catFilt,    setCatFilt]    = useState('All');
  const [statusFilt, setStatusFilt] = useState('All');
  const [view,       setView]       = useState('grid');
  const [page,       setPage]       = useState(1);
  const [modal,      setModal]      = useState(null); // null | 'add' | company object
  const [delTarget,  setDelTarget]  = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounce search 400ms
  const debounceRef = useRef(null);
  const handleSearch = useCallback((val) => {
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQ(val);
      setPage(1);
    }, 400);
  }, []);

  // ── API Queries ──────────────────────────────────────────────────────────────
  const params = {
    page,
    limit: PAGE_SIZE,
    ...(debouncedQ           && { search: debouncedQ }),
    ...(catFilt    !== 'All' && { category: catFilt }),
    ...(statusFilt !== 'All' && { status: statusFilt }),
  };

  const {
    data: companiesData,
    isLoading: isLoadingList,
    isFetching,
    error: listError,
    refetch: refetchList,
  } = useGetQuery({ path: '/companies', params });

  const {
    data: statsData,
    isLoading: isLoadingStats,
    refetch: refetchStats,
  } = useGetQuery({ path: '/companies/stats' });

  const {
    data: categoriesRaw = [],
    refetch: refetchCats,
  } = useGetQuery({ path: '/company-categories' });

  const categories = categoriesRaw.map((c) => c.name);

  const companies = companiesData?.items ?? [];
  const totalPages = companiesData?.pages ?? 1;
  const totalCount = companiesData?.total ?? 0;

  const stats = {
    total:             statsData?.total             ?? 0,
    activeCompanies:   statsData?.activeCompanies   ?? 0,
    activeContractCount: statsData?.activeContractCount ?? 0,
    totalSpent:        statsData?.totalSpent        ?? 0,
    avgRating:         statsData?.avgRating         ?? 0,
  };

  // ── Mutations ────────────────────────────────────────────────────────────────
  const [addCompanyMut,    { isLoading: isAdding }]   = usePostMutation();
  const [updateCompanyMut, { isLoading: isUpdating }] = usePutMutation();
  const [deleteCompanyMut]                             = useDeleteMutation();
  const [addCatMut]                                   = usePostMutation();

  const handleAddCategory = async (name) => {
    await addCatMut({ path: '/company-categories', body: { name } }).unwrap();
    refetchCats();
  };

  // ── Save (create / update) ───────────────────────────────────────────────────
  const handleSave = async (data, isEdit) => {
    if (isAdding || isUpdating) return;
    try {
      if (isEdit) {
        await updateCompanyMut({ path: `/companies/${modal._id ?? modal.id}`, body: data }).unwrap();
        toast.success('Company updated!');
      } else {
        await addCompanyMut({ path: '/companies', body: data }).unwrap();
        toast.success('Company added!');
      }
      setModal(null);
      refetchStats();
    } catch (err) {
      toast.error(err.data?.error || err.data?.message || 'Failed to save company');
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDeleteRequest = (company) => {
    setDelTarget(company);
  };

  const handleDeleteConfirm = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteCompanyMut({ path: `/companies/${delTarget._id ?? delTarget.id}` }).unwrap();
      toast.success('Company deleted');
      setDelTarget(null);
      refetchStats();
    } catch (err) {
      const msg = err.data?.error || err.data?.message || 'Failed to delete';
      toast.error(msg);
      setDelTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────────
  const showLoader = isLoadingList || isLoadingStats;

  if (showLoader) {
    return <PageLoader icon={RiBuilding2Line} text="Loading companies…" />;
  }

  if (listError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <RiBuilding2Line className="w-12 h-12 text-slate-200" />
        <p className="text-slate-400 font-medium">Failed to load companies</p>
        <Button variant="secondary" icon={RiRefreshLine} onClick={refetchList}>Retry</Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Service Companies</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">
            {totalCount} {totalCount === 1 ? 'company' : 'companies'} · manage your service providers
          </p>
        </div>
        <Button variant="primary" icon={RiAddLine} onClick={() => setModal('add')}>
          Add Company
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Companies',   value: stats.total,                                                    color: 'from-navy-600 to-navy-800'       },
          { label: 'Active Contracts',  value: stats.activeContractCount,                                      color: 'from-accent-500 to-accent-700'   },
          { label: 'Total Spent',       value: `AED ${stats.totalSpent.toLocaleString()}`,                     color: 'from-success-500 to-success-700' },
          { label: 'Avg Rating',        value: stats.avgRating > 0 ? stats.avgRating.toFixed(1) + ' ★' : '—', color: 'from-amber-500 to-orange-500'    },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className={cn('rounded-2xl p-5 text-white bg-linear-to-br', s.color)}
          >
            <p className="text-2xl font-bold leading-none">{s.value}</p>
            <p className="text-[12px] text-white/70 mt-2">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search companies or contacts…"
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-[13px] placeholder-slate-400 outline-none focus:ring-2 focus:ring-accent-400 transition-all"
          />
        </div>
        <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 self-start sm:self-auto">
          {[['grid', RiLayoutGridLine], ['list', RiListCheck2]].map(([v, Icon]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                view === v ? 'bg-navy-900 text-white' : 'text-slate-400 hover:text-slate-600',
              )}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {['All', ...categories].map((cat) => (
          <button
            key={cat}
            onClick={() => { setCatFilt(cat); setPage(1); }}
            className={cn(
              'px-3.5 py-2 rounded-xl text-[12px] font-semibold whitespace-nowrap border transition-all shrink-0',
              catFilt === cat
                ? 'bg-navy-900 text-white border-navy-900'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300',
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Status pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mt-3">
        {['All', 'active', 'inactive', 'paused'].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilt(s); setPage(1); }}
            className={cn(
              'px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap border transition-all shrink-0 capitalize',
              statusFilt === s
                ? 'bg-accent-600 text-white border-accent-600'
                : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300',
            )}
          >
            {s === 'All' ? 'All Statuses' : s}
          </button>
        ))}
      </div>

      {/* Fetching indicator */}
      {isFetching && !showLoader && (
        <div className="flex items-center gap-2 text-[12px] text-slate-400">
          <RiLoader4Line className="w-3.5 h-3.5 animate-spin" />
          Updating…
        </div>
      )}

      {/* Grid / List / Empty */}
      {companies.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <RiBuilding2Line className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-400">No companies found</p>
          <button
            onClick={() => setModal('add')}
            className="mt-3 text-accent-600 text-[13px] font-semibold hover:underline"
          >
            + Add first company
          </button>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {companies.map((c, i) => (
              <MotionSwipeableRow
                key={c._id ?? c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-3xl overflow-hidden"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(11,29,58,0.10)' }}
                onSwipeRight={() => setModal(c)}
                onSwipeLeft={() => handleDeleteRequest(c)}
                leftIcon={<RiEditLine className="w-5 h-5 text-accent-600" />}
                leftLabel="Edit"
                leftBg="#eff6ff"
                leftColor="#2563eb"
                rightIcon={<RiDeleteBinLine className="w-5 h-5 text-red-500" />}
                rightLabel="Delete"
                rightBg="#fef2f2"
                rightColor="#dc2626"
              >
                <CompanyCard
                  company={c}
                  onEdit={() => setModal(c)}
                  onDelete={() => handleDeleteRequest(c)}
                />
              </MotionSwipeableRow>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <AnimatePresence mode="popLayout">
            {companies.map((c, i) => (
              <MotionSwipeableRow
                key={c._id ?? c.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.03 }}
                className={cn(!( i === companies.length - 1) && 'border-b border-slate-50')}
                onSwipeRight={() => setModal(c)}
                onSwipeLeft={() => handleDeleteRequest(c)}
                leftIcon={<RiEditLine className="w-5 h-5 text-accent-600" />}
                leftLabel="Edit"
                leftBg="#eff6ff"
                leftColor="#2563eb"
                rightIcon={<RiDeleteBinLine className="w-5 h-5 text-red-500" />}
                rightLabel="Delete"
                rightBg="#fef2f2"
                rightColor="#dc2626"
              >
                <CompanyRow
                  company={c}
                  onEdit={() => setModal(c)}
                  onDelete={() => handleDeleteRequest(c)}
                />
              </MotionSwipeableRow>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            ‹ Prev
          </button>
          <span className="text-[13px] text-slate-400">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Next ›
          </button>
        </div>
      )}

      {/* Company Modal */}
      <CompanyModal
        open={modal !== null}
        company={modal !== 'add' ? modal : null}
        categories={categories}
        onAddCategory={handleAddCategory}
        onClose={() => setModal(null)}
        isSubmitting={isAdding || isUpdating}
        onSave={(data) => handleSave(data, modal !== 'add')}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={handleDeleteConfirm}
        loading={isDeleting}
        title="Delete Company"
        message={`Delete "${delTarget?.name}"? This cannot be undone. Companies with active contracts cannot be deleted.`}
        confirmLabel="Delete"
      />
    </motion.div>
  );
}

// ─── COMPANY CARD ──────────────────────────────────────────────────────────────
function CompanyCard({ company: c, onEdit, onDelete }) {
  const color  = catColor(c.category);
  const inits  = initials(c.name);
  const rating = c.rating ?? 0;

  return (
    <div className="bg-white flex flex-col">
      {/* Dark header */}
      <div
        className="relative px-5 pt-4 pb-4 overflow-hidden"
        style={{ background: 'linear-gradient(150deg, #0a172e 0%, #0c1f3f 55%, #0e2550 100%)' }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, zIndex: 2 }} />
        <div style={{ position: 'absolute', top: -36, right: -36, width: 130, height: 130, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: -18, right: -18, width: 80,  height: 80,  borderRadius: '50%', border: '1px solid rgba(255,255,255,0.09)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 8, bottom: -6, fontSize: 72, fontWeight: 900, lineHeight: 1, color: 'rgba(255,255,255,0.04)', letterSpacing: '-3px', userSelect: 'none', pointerEvents: 'none', zIndex: 1 }}>{inits}</div>

        {rating > 0 && (
          <div
            className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
            style={{ background: 'rgba(251,191,36,0.14)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)', zIndex: 10 }}
          >
            <RiStarFill className="w-3 h-3" />
            {rating.toFixed(1)}
          </div>
        )}

        <div className="relative flex items-center gap-3.5 mt-1" style={{ zIndex: 5 }}>
          <div
            className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center text-[17px] font-black text-white select-none"
            style={{ background: `${color}28`, border: '2.5px solid rgba(255,255,255,0.13)', boxShadow: `0 4px 20px ${color}40` }}
          >
            {inits}
          </div>
          <div className="min-w-0 flex-1 pr-4">
            <p className="text-[16px] font-black text-white leading-tight truncate">{c.name}</p>
            <p className="text-[11px] font-semibold mt-0.5" style={{ color: 'rgba(255,255,255,0.42)' }}>{c.category}</p>
          </div>
        </div>

        {/* Action buttons — always visible on desktop, hidden on mobile (swipe instead) */}
        <div className="absolute bottom-3.5 right-4 hidden sm:flex gap-1.5" style={{ zIndex: 10 }}>
          <button
            onClick={(e) => { e.preventDefault(); onEdit(); }}
            className="w-7 h-7 rounded-xl flex items-center justify-center border transition-all"
            style={{ color: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.12)', background: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
          >
            <RiEditLine className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); onDelete(); }}
            className="w-7 h-7 rounded-xl flex items-center justify-center border transition-all"
            style={{ color: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.12)', background: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.22)'; e.currentTarget.style.color = '#fca5a5'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
          >
            <RiDeleteBinLine className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col px-5 pt-4 pb-4 gap-3">
        {c.tagline && <p className="text-[12px] text-slate-400 line-clamp-1">{c.tagline}</p>}
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
        <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Contracts · Spent</p>
            <p className="text-[13px] font-bold" style={{ color: '#0b1d3a' }}>
              {c.activeContracts ?? 0} · AED {(c.totalSpent ?? 0).toLocaleString()}
            </p>
          </div>
          <Link
            to={`/companies/${c._id ?? c.id}`}
            className="flex items-center gap-1 text-[12px] font-bold text-slate-400 hover:text-navy-800 transition-colors"
          >
            View <RiArrowRightLine className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── COMPANY ROW (list view) ───────────────────────────────────────────────────
function CompanyRow({ company: c, onEdit, onDelete }) {
  const color = catColor(c.category);
  const inits = initials(c.name);
  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors bg-white">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-[13px] shrink-0 select-none"
        style={{ background: `${color}cc` }}
      >
        {inits}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-slate-800 truncate">{c.name}</p>
        <p className="text-[11px] text-slate-400">{c.category}</p>
      </div>
      <div className="hidden sm:block">
        <StarRow rating={c.rating ?? 0} />
      </div>
      <span className="hidden md:block text-[12px] text-slate-500">{c.contact?.phone ?? '—'}</span>
      {/* Always visible on desktop, hidden on mobile */}
      <div className="hidden sm:flex items-center gap-1">
        <button
          onClick={onEdit}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-accent-600 hover:bg-accent-50 transition-all"
        >
          <RiEditLine className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
        >
          <RiDeleteBinLine className="w-3.5 h-3.5" />
        </button>
        <Link
          to={`/companies/${c._id ?? c.id}`}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-navy-700 hover:bg-navy-50 transition-all"
        >
          <RiArrowRightLine className="w-3.5 h-3.5" />
        </Link>
      </div>
      {/* Mobile: just the detail arrow */}
      <Link
        to={`/companies/${c._id ?? c.id}`}
        className="sm:hidden w-7 h-7 rounded-lg flex items-center justify-center text-slate-400"
      >
        <RiArrowRightLine className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

// ─── COMPANY MODAL ─────────────────────────────────────────────────────────────
const FORM_DEFAULTS = {
  name: '', category: '', tagline: '', rating: 0, yearsActive: 0, status: 'active',
  person: '', phone: '', mobile: '', email: '', whatsapp: '', address: '', notes: '',
};

function CompanyModal({ open, onClose, company, onSave, isSubmitting, categories, onAddCategory }) {
  const { register, handleSubmit, reset, control, setValue, formState: { errors } } = useForm({
    defaultValues: FORM_DEFAULTS,
  });

  const categoryVal = useWatch({ control, name: 'category' });

  useEffect(() => {
    if (!open) return;
    if (company) {
      reset({
        name:       company.name        ?? '',
        category:   company.category    ?? '',
        tagline:    company.tagline     ?? '',
        rating:     company.rating      ?? 0,
        yearsActive: company.yearsActive ?? 0,
        status:     company.status      ?? 'active',
        person:     company.contact?.person   ?? '',
        phone:      company.contact?.phone    ?? '',
        mobile:     company.contact?.mobile   ?? '',
        email:      company.contact?.email    ?? '',
        whatsapp:   company.contact?.whatsapp ?? '',
        address:    company.address     ?? '',
        notes:      company.notes       ?? '',
      });
    } else {
      reset({ ...FORM_DEFAULTS });
    }
  }, [open, company, reset]);

  const onSubmit = (d) => onSave({
    name:       d.name,
    category:   d.category,
    tagline:    d.tagline   ?? '',
    rating:     parseFloat(d.rating)  || 0,
    yearsActive: parseInt(d.yearsActive) || 0,
    status:     d.status    ?? 'active',
    contact: {
      person:   d.person   ?? '',
      phone:    d.phone    ?? '',
      mobile:   d.mobile   ?? '',
      email:    d.email    ?? '',
      whatsapp: d.whatsapp ?? '',
    },
    address: d.address ?? '',
    notes:   d.notes   ?? '',
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={company ? 'Edit Company' : 'Add New Company'}
      subtitle={company ? `Editing: ${company.name}` : 'Add a service provider to your system'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <FormGrid>
          <Field label="Company Name" required error={errors.name?.message}>
            <Input {...register('name', { required: 'Required' })} placeholder="e.g. Cool Air LLC" />
          </Field>
          <Field label="Category" required error={errors.category?.message}>
            <CategoryCombobox
              value={categoryVal ?? ''}
              onChange={(v) => setValue('category', v, { shouldValidate: true })}
              hasError={!!errors.category}
              categories={categories}
              onAddCategory={onAddCategory}
            />
            <input type="hidden" {...register('category', { required: 'Required' })} />
          </Field>
        </FormGrid>

        <Field label="Tagline / Short Description">
          <Input {...register('tagline')} placeholder="e.g. Premium AC maintenance specialists" />
        </Field>

        <FormGrid>
          <Field label="Rating (0–5)">
            <Input {...register('rating')} type="number" min="0" max="5" step="0.1" placeholder="e.g. 4.5" />
          </Field>
          <Field label="Years Active">
            <Input {...register('yearsActive')} type="number" min="0" placeholder="e.g. 8" />
          </Field>
          <Field label="Status">
            <Select {...register('status')} options={[
              { value: 'active',   label: 'Active'   },
              { value: 'inactive', label: 'Inactive' },
              { value: 'paused',   label: 'Paused'   },
            ]} />
          </Field>
        </FormGrid>

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

        <FormActions onCancel={onClose} submitLabel={company ? 'Update Company' : 'Add Company'} loading={isSubmitting} />
      </form>
    </Modal>
  );
}

// ─── CATEGORY COMBOBOX ─────────────────────────────────────────────────────────
function CategoryCombobox({ value, onChange, hasError, categories, onAddCategory }) {
  const [open,    setOpen]    = useState(false);
  const [input,   setInput]   = useState(value ?? '');
  const [addMode, setAddMode] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving,  setSaving]  = useState(false);
  const ref    = useRef(null);
  const addRef = useRef(null);

  useEffect(() => { setInput(value ?? ''); }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setAddMode(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (addMode && addRef.current) addRef.current.focus();
  }, [addMode]);

  const lowerCats = categories.map((c) => c.toLowerCase());
  const filtered  = categories.filter((c) => c.toLowerCase().includes(input.toLowerCase()));

  const select = (cat) => {
    onChange(cat);
    setInput(cat);
    setOpen(false);
    setAddMode(false);
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    onChange(e.target.value);
    setOpen(true);
    setAddMode(false);
  };

  const handleSaveNewCategory = async () => {
    const name = newName.trim();
    if (!name) return;
    if (lowerCats.includes(name.toLowerCase())) {
      const existing = categories.find((c) => c.toLowerCase() === name.toLowerCase());
      select(existing);
      return;
    }
    setSaving(true);
    try {
      await onAddCategory(name);
      toast.success(`Category "${name}" created`);
      select(name);
      setNewName('');
      setAddMode(false);
    } catch (err) {
      toast.error(err.data?.error || 'Failed to create category');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={input}
        onChange={handleInput}
        onFocus={() => setOpen(true)}
        placeholder="Select or type a category…"
        autoComplete="off"
        className={cn(
          'w-full h-10 px-3 pr-8 rounded-xl border text-[13px] outline-none focus:ring-2 focus:ring-accent-400 transition-all',
          hasError ? 'border-red-400 ring-1 ring-red-400' : 'border-slate-200',
        )}
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </span>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            {filtered.length > 0 ? filtered.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => select(cat)}
                className={cn(
                  'w-full text-left px-3.5 py-2.5 text-[13px] hover:bg-slate-50 transition-colors flex items-center justify-between',
                  value === cat ? 'bg-accent-50 text-accent-700 font-semibold' : 'text-slate-700',
                )}
              >
                {cat}
                {value === cat && <RiCheckLine className="w-3.5 h-3.5 text-accent-600 shrink-0" />}
              </button>
            )) : (
              <p className="px-3.5 py-3 text-[12px] text-slate-400 italic">No categories match "{input}"</p>
            )}
          </div>

          <div className="border-t border-slate-100">
            {!addMode ? (
              <button
                type="button"
                onClick={() => { setAddMode(true); setNewName(input || ''); }}
                className="w-full text-left px-3.5 py-2.5 text-[13px] font-semibold text-accent-600 hover:bg-accent-50 transition-colors flex items-center gap-2"
              >
                <div className="w-5 h-5 rounded-md bg-accent-100 flex items-center justify-center shrink-0">
                  <RiAddLine className="w-3 h-3 text-accent-600" />
                </div>
                Add new category
              </button>
            ) : (
              <div className="p-2.5 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-0.5">New category name</p>
                <div className="flex gap-2">
                  <input
                    ref={addRef}
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); handleSaveNewCategory(); }
                      if (e.key === 'Escape') { setAddMode(false); setNewName(''); }
                    }}
                    placeholder="e.g. Landscaping, IT Services…"
                    className="flex-1 h-9 px-2.5 rounded-lg border border-slate-200 text-[12px] outline-none focus:ring-2 focus:ring-accent-400 transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleSaveNewCategory}
                    disabled={!newName.trim() || saving}
                    className="h-9 px-3 rounded-lg bg-accent-600 hover:bg-accent-700 text-white text-[11px] font-bold disabled:opacity-50 transition-colors flex items-center gap-1.5"
                  >
                    {saving
                      ? <RiLoader4Line className="w-3.5 h-3.5 animate-spin" />
                      : <RiCheckLine className="w-3.5 h-3.5" />
                    }
                    {saving ? 'Saving' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAddMode(false); setNewName(''); }}
                    className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <RiCloseLine className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
