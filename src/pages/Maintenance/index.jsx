import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  RiAddLine, RiCalendar2Line, RiListCheck2, RiLayoutGridLine,
  RiEditLine, RiDeleteBinLine, RiCheckLine, RiAlertLine,
  RiArrowLeftLine, RiArrowRightLine, RiWalletLine, RiBuilding2Line,
  RiPlayLine, RiArrowRightSLine, RiCheckboxCircleLine,
  RiPauseCircleLine, RiCloseCircleLine, RiRefreshLine, RiAddCircleLine,
} from 'react-icons/ri';
import {
  selectTasks, selectCategories,
  addTask, updateTask, deleteTask,
  setTaskStatus, autoMarkOverdue, addCategory,
} from '../../store/slices/tasksSlice';
import { selectHomeWallet, deductFromWallet } from '../../store/slices/walletSlice';
import { selectCompanies } from '../../store/slices/companiesSlice';
import { selectAreas } from '../../store/slices/areasSlice';
import { selectAssets } from '../../store/slices/assetsSlice';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Field, Input, Select, Textarea, FormGrid, FormSection, FormActions } from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import { cn } from '../../utils/cn';

// ── Category config ──────────────────────────────────────────────────────────
const CAT_CFG = {
  Maintenance: { hex: '#16a34a', emoji: '⚙️' },
  Repair:      { hex: '#dc2626', emoji: '🔧' },
};
const CUSTOM_PALETTE = ['#7c3aed','#0891b2','#d97706','#be185d','#0f766e','#1e40af'];
function getCatCfg(cat, allCats = []) {
  if (CAT_CFG[cat]) return CAT_CFG[cat];
  const idx = allCats.indexOf(cat);
  return { hex: CUSTOM_PALETTE[idx % CUSTOM_PALETTE.length] ?? '#7c3aed', emoji: '📋' };
}

// ── Priority config ──────────────────────────────────────────────────────────
const PRIORITY_CFG = {
  critical: { label: 'Critical', hex: '#dc2626' },
  high:     { label: 'High',     hex: '#ea580c' },
  medium:   { label: 'Medium',   hex: '#2563eb' },
  low:      { label: 'Low',      hex: '#64748b' },
};

// ── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG = {
  scheduled:     { label: 'Scheduled',   hex: '#2563eb', bg: 'rgba(37,99,235,0.12)',   color: '#93c5fd', border: '1px solid rgba(37,99,235,0.22)'  },
  'in-progress': { label: 'In Progress', hex: '#d97706', bg: 'rgba(234,88,12,0.13)',   color: '#fdba74', border: '1px solid rgba(234,88,12,0.24)'   },
  'on-hold':     { label: 'On Hold',     hex: '#9333ea', bg: 'rgba(147,51,234,0.12)',  color: '#d8b4fe', border: '1px solid rgba(147,51,234,0.22)'  },
  overdue:       { label: 'Overdue',     hex: '#dc2626', bg: 'rgba(220,38,38,0.14)',   color: '#fca5a5', border: '1px solid rgba(220,38,38,0.26)'   },
  completed:     { label: 'Completed',   hex: '#16a34a', bg: 'rgba(22,163,74,0.12)',   color: '#86efac', border: '1px solid rgba(22,163,74,0.22)'   },
  cancelled:     { label: 'Cancelled',   hex: '#64748b', bg: 'rgba(100,116,139,0.10)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.20)' },
};

const NEXT_STATUSES = {
  scheduled:     ['in-progress', 'on-hold', 'cancelled'],
  'in-progress': ['on-hold', 'scheduled'],
  'on-hold':     ['in-progress', 'cancelled'],
  overdue:       ['in-progress', 'on-hold', 'cancelled'],
  completed:     ['scheduled'],
  cancelled:     ['scheduled'],
};

// ── Type emoji lookup ────────────────────────────────────────────────────────
const TYPE_EMOJI_MAP = {
  inspection: '🔍', cleaning: '🧹', service: '⚙️', repair: '🔧', replacement: '🔄',
  testing: '⚡', 'deep clean': '✨', 'routine service': '⚙️', 'full service': '⚙️',
  'pest treatment': '🐛', 'pest control': '🐛', lubrication: '🔩', 'annual service': '📋',
  'filter cleaning': '💧', 'standard clean': '🧹', 'ac repair': '❄️', plumbing: '💧',
  mechanical: '🔩', appliance: '📺', pool: '🏊', electrical: '⚡', structural: '🏗️',
  'garden / irrigation': '🌿',
};
function typeEmoji(type) {
  if (!type) return '📋';
  const key = type.toLowerCase();
  if (TYPE_EMOJI_MAP[key]) return TYPE_EMOJI_MAP[key];
  if (key.includes('clean')) return '🧹';
  if (key.includes('inspect')) return '🔍';
  if (key.includes('pest') || key.includes('treat')) return '🐛';
  if (key.includes('ac') || key.includes('cool') || key.includes('hvac')) return '❄️';
  if (key.includes('plumb') || key.includes('tap') || key.includes('water')) return '💧';
  if (key.includes('electr')) return '⚡';
  if (key.includes('lubri')) return '🔩';
  if (key.includes('service') || key.includes('routine')) return '⚙️';
  if (key.includes('repair') || key.includes('fix')) return '🔧';
  if (key.includes('pool') || key.includes('swim')) return '🏊';
  if (key.includes('garden') || key.includes('irrig')) return '🌿';
  return '📋';
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const RECURRENCES = ['one-time','weekly','bi-weekly','monthly','quarterly','bi-annual','annual'];
const STATUS_OPTS  = ['scheduled','in-progress','on-hold','overdue','completed','cancelled'];
const PRIORITIES   = ['critical','high','medium','low'];

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function buildGrid(y, m) {
  const first = new Date(y,m,1), last = new Date(y,m+1,0);
  const off = (first.getDay()+6)%7, cells = [];
  for (let i=off; i>0; i--) cells.push({ date: new Date(y,m,1-i), current: false });
  for (let d=1; d<=last.getDate(); d++) cells.push({ date: new Date(y,m,d), current: true });
  let p=1; while (cells.length<42) cells.push({ date: new Date(y,m+1,p++), current: false });
  return cells;
}
function fmtDate(s) {
  if (!s) return '—';
  return new Date(s+'T00:00:00').toLocaleDateString('en-AE',{ day:'numeric', month:'short', year:'numeric' });
}
function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr+'T00:00:00') - new Date()) / 86400000);
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function MaintenancePage() {
  const dispatch   = useDispatch();
  const allItems   = useSelector(selectTasks);
  const categories = useSelector(selectCategories);
  const companies  = useSelector(selectCompanies);
  const areas      = useSelector(selectAreas);
  const assets     = useSelector(selectAssets);
  const homeWallet = useSelector(selectHomeWallet);

  const [catTab,          setCatTab]          = useState('all');
  const [statusFilter,    setStatusFilter]    = useState('all');
  const [view,            setView]            = useState('grid');
  const [modal,           setModal]           = useState(null);       // null | 'add' | item
  const [delTarget,       setDelTarget]       = useState(null);
  const [completeTarget,  setCompleteTarget]  = useState(null);
  const [viewDate,        setViewDate]        = useState(() => new Date(new Date().getFullYear(), new Date().getMonth()));
  const [newCatInput,     setNewCatInput]     = useState(false);
  const [newCatName,      setNewCatName]      = useState('');

  useEffect(() => { dispatch(autoMarkOverdue()); }, [dispatch]);

  // Items filtered by current category tab
  const catItems = useMemo(
    () => catTab === 'all' ? allItems : allItems.filter((t) => t.category === catTab),
    [allItems, catTab],
  );

  // Stats always reflect current category tab
  const stats = useMemo(() => ({
    total:      catItems.length,
    scheduled:  catItems.filter((t) => t.status === 'scheduled').length,
    inProgress: catItems.filter((t) => t.status === 'in-progress').length,
    onHold:     catItems.filter((t) => t.status === 'on-hold').length,
    overdue:    catItems.filter((t) => t.status === 'overdue').length,
    completed:  catItems.filter((t) => t.status === 'completed').length,
    cancelled:  catItems.filter((t) => t.status === 'cancelled').length,
  }), [catItems]);

  // Final filtered list (category + status)
  const filtered = useMemo(
    () => statusFilter === 'all' ? catItems : catItems.filter((t) => t.status === statusFilter),
    [catItems, statusFilter],
  );

  const year = viewDate.getFullYear(), month = viewDate.getMonth();
  const cells  = useMemo(() => buildGrid(year, month), [year, month]);
  const byDate = useMemo(() => {
    const map = {};
    catItems.forEach((t) => {
      const key = t.status === 'completed' ? (t.completedDate ?? t.scheduledDate) : t.scheduledDate;
      if (key) { if (!map[key]) map[key] = []; map[key].push(t); }
    });
    return map;
  }, [catItems]);

  const handleStatusChange = (task, newStatus) => {
    if (newStatus === 'completed') { setCompleteTarget(task); return; }
    dispatch(setTaskStatus({ id: task.id, status: newStatus }));
    toast.success(`Status → ${STATUS_CFG[newStatus]?.label ?? newStatus}`);
  };

  const handleConfirmComplete = ({ task, completedDate, actualCost, deductWallet, completionNotes }) => {
    const cost = actualCost > 0 ? actualCost : task.estimatedCost ?? 0;
    dispatch(setTaskStatus({ id: task.id, status: 'completed', completedDate, actualCost, completionNotes }));
    if (deductWallet && cost > 0) {
      dispatch(deductFromWallet({
        wallet: 'home', amount: cost,
        description: `${task.category}: ${task.title}`,
        category: task.category, date: completedDate,
      }));
      toast.success(`✓ Completed — AED ${cost.toLocaleString()} deducted from Home Wallet`);
    } else {
      toast.success('Task marked as completed!');
    }
    setCompleteTarget(null);
  };

  const handleAddCat = () => {
    const name = newCatName.trim();
    if (!name) return;
    dispatch(addCategory(name));
    toast.success(`Category "${name}" added`);
    setNewCatName(''); setNewCatInput(false);
    setCatTab(name);
  };

  const catLabel = catTab === 'all' ? 'All Tasks'
    : catTab === 'Maintenance' ? 'Maintenance'
    : catTab === 'Repair' ? 'Repairs'
    : catTab;

  return (
    <motion.div initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.3 }} className="space-y-6">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Maintenance & Repairs</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">Plan, track and complete all property tasks in one place</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
            <RiWalletLine className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-[12px] font-bold text-emerald-700">AED {homeWallet.balance.toLocaleString()}</span>
            <span className="text-[10px] text-emerald-500 hidden sm:inline">Home Wallet</span>
          </div>
          <Button variant="primary" icon={RiAddLine} onClick={() => setModal('add')}>Add Task</Button>
        </div>
      </div>

      {/* ── Category tabs ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* All */}
        <button onClick={() => { setCatTab('all'); setStatusFilter('all'); }}
          className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold border transition-all',
            catTab === 'all' ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300')}>
          All Tasks
          <span className={cn('text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center',
            catTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500')}>
            {allItems.length}
          </span>
        </button>

        {/* Built-in + custom category tabs */}
        {categories.map((cat) => {
          const cfg   = getCatCfg(cat, categories);
          const count = allItems.filter((t) => t.category === cat).length;
          const active= catTab === cat;
          return (
            <button key={cat} onClick={() => { setCatTab(cat); setStatusFilter('all'); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold border transition-all"
              style={active
                ? { background: cfg.hex, color: '#fff', borderColor: cfg.hex }
                : { background: '#fff', color: '#64748b', borderColor: '#e2e8f0' }}>
              <span>{cfg.emoji}</span>
              {cat}
              <span className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
                style={active
                  ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                  : { background: '#f1f5f9', color: '#64748b' }}>
                {count}
              </span>
            </button>
          );
        })}

        {/* Add custom category */}
        {!newCatInput ? (
          <button onClick={() => setNewCatInput(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold text-slate-400 border border-dashed border-slate-200 hover:border-slate-300 hover:text-slate-600 transition-all bg-white">
            <RiAddCircleLine className="w-3.5 h-3.5" />+ Category
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddCat(); if (e.key === 'Escape') { setNewCatInput(false); setNewCatName(''); }}}
              placeholder="Category name…"
              className="h-9 w-36 px-3 rounded-xl border border-slate-300 text-[13px] focus:outline-none focus:border-navy-400"
            />
            <button onClick={handleAddCat}
              className="h-9 px-3 rounded-xl bg-navy-900 text-white text-[12px] font-bold hover:bg-navy-800 transition-colors">
              Add
            </button>
            <button onClick={() => { setNewCatInput(false); setNewCatName(''); }}
              className="h-9 px-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 text-[12px] transition-colors">
              ✕
            </button>
          </div>
        )}
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label:'Scheduled',   value:stats.scheduled,  hex:'#2563eb', filter:'scheduled'    },
          { label:'In Progress', value:stats.inProgress, hex:'#d97706', filter:'in-progress'  },
          { label:'On Hold',     value:stats.onHold,     hex:'#9333ea', filter:'on-hold'      },
          { label:'Overdue',     value:stats.overdue,    hex:'#dc2626', filter:'overdue'      },
          { label:'Completed',   value:stats.completed,  hex:'#16a34a', filter:'completed'    },
          { label:'Total',       value:stats.total,      hex:'#0b1d3a', filter:'all'          },
        ].map((s, i) => (
          <motion.button key={s.filter} onClick={() => setStatusFilter(s.filter)}
            initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.06 }}
            className={cn('rounded-2xl p-4 text-left border transition-all hover:-translate-y-0.5',
              statusFilter === s.filter
                ? 'border-transparent text-white'
                : 'bg-white border-slate-100 text-slate-700 hover:border-slate-200')}
            style={statusFilter === s.filter ? { background: s.hex } : {}}>
            <p className="text-2xl font-black leading-none">{s.value}</p>
            <p className={cn('text-[11px] font-semibold mt-1',
              statusFilter === s.filter ? 'text-white/70' : 'text-slate-400')}>
              {s.label}
            </p>
          </motion.button>
        ))}
      </div>

      {/* ── Overdue alert ── */}
      {stats.overdue > 0 && statusFilter !== 'overdue' && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-3.5">
          <RiAlertLine className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-[13px] font-semibold text-red-800 flex-1">
            {stats.overdue} {catLabel.toLowerCase()} task{stats.overdue > 1 ? 's are' : ' is'} overdue.
          </p>
          <button onClick={() => setStatusFilter('overdue')} className="text-[12px] font-bold text-red-600 hover:underline whitespace-nowrap">
            View overdue →
          </button>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto pb-0.5 w-full sm:w-auto">
          {([
            ['all',          'All',         stats.total       ],
            ['scheduled',    'Scheduled',   stats.scheduled   ],
            ['in-progress',  'In Progress', stats.inProgress  ],
            ['on-hold',      'On Hold',     stats.onHold      ],
            ['overdue',      'Overdue',     stats.overdue     ],
            ['completed',    'Completed',   stats.completed   ],
          ]).map(([v, l, count]) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap border transition-all',
                statusFilter === v
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300')}>
              {l}
              <span className={cn('text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1',
                statusFilter === v ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500')}>
                {count}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shrink-0">
          {[['grid', RiLayoutGridLine], ['list', RiListCheck2], ['calendar', RiCalendar2Line]].map(([v, Icon]) => (
            <button key={v} onClick={() => setView(v)}
              className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                view === v ? 'bg-navy-900 text-white' : 'text-slate-400 hover:text-slate-600')}>
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* ── CALENDAR ── */}
      {view === 'calendar' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5" style={{ boxShadow:'0 1px 8px rgb(0 0 0/0.06)' }}>
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => setViewDate(new Date(year, month-1))} className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-navy-50 hover:text-navy-700 transition-all"><RiArrowLeftLine className="w-4 h-4" /></button>
            <h2 className="text-[15px] font-bold text-navy-900">{viewDate.toLocaleDateString('en-AE',{month:'long',year:'numeric'})}</h2>
            <button onClick={() => setViewDate(new Date(year, month+1))} className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-navy-50 hover:text-navy-700 transition-all"><RiArrowRightLine className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-7 mb-2">
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => (
              <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              const ds = toDateStr(cell.date), evs = byDate[ds] ?? [];
              const isToday = ds === toDateStr(new Date());
              return (
                <div key={i} className={cn('min-h-15 rounded-xl p-1.5 transition-colors',
                  !cell.current && 'opacity-20',
                  isToday && 'bg-navy-900',
                  cell.current && !isToday && 'hover:bg-slate-50')}>
                  <span className={cn('block text-center text-[12px] font-semibold mb-1', isToday ? 'text-white' : 'text-slate-700')}>{cell.date.getDate()}</span>
                  {evs.slice(0,2).map((ev) => {
                    const sCfg = STATUS_CFG[ev.status] ?? STATUS_CFG.scheduled;
                    return (
                      <div key={ev.id} className="text-[9px] font-semibold px-1 py-0.5 rounded-md mb-0.5 truncate"
                        style={{ background: sCfg.bg, color: sCfg.color }}>
                        {ev.title}
                      </div>
                    );
                  })}
                  {evs.length > 2 && <div className="text-[9px] text-slate-400 pl-1">+{evs.length-2}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── EMPTY STATE ── */}
      {view !== 'calendar' && filtered.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <div className="text-5xl mb-4">{catTab === 'Maintenance' ? '⚙️' : catTab === 'Repair' ? '🔧' : '📋'}</div>
          <p className="font-semibold text-slate-400 mb-1">No {catLabel.toLowerCase()} tasks{statusFilter !== 'all' ? ` with status "${STATUS_CFG[statusFilter]?.label ?? statusFilter}"` : ''}</p>
          <button onClick={() => setModal('add')} className="mt-3 text-accent-600 text-[13px] font-semibold hover:underline">+ Add task</button>
        </div>
      )}

      {/* ── GRID VIEW ── */}
      {view === 'grid' && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((task, i) => (
              <motion.div key={task.id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, scale:0.96 }} transition={{ delay:i*0.04 }}>
                <TaskCard task={task} allCats={categories} companies={companies}
                  onEdit={() => setModal(task)}
                  onDelete={() => setDelTarget(task)}
                  onStatusChange={(s) => handleStatusChange(task, s)}
                  onComplete={() => setCompleteTarget(task)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {view === 'list' && filtered.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow:'0 1px 8px rgb(0 0 0/0.06)' }}>
          {filtered.map((task, i) => (
            <TaskRow key={task.id} task={task} allCats={categories} last={i === filtered.length-1}
              onEdit={() => setModal(task)}
              onDelete={() => setDelTarget(task)}
              onStatusChange={(s) => handleStatusChange(task, s)}
              onComplete={() => setCompleteTarget(task)}
            />
          ))}
        </div>
      )}

      {/* ── MODALS ── */}
      <TaskFormModal
        open={modal !== null} item={modal !== 'add' ? modal : null}
        categories={categories} companies={companies} areas={areas} assets={assets}
        onClose={() => setModal(null)}
        onSave={(data) => {
          if (modal !== 'add') {
            dispatch(updateTask({ ...modal, ...data }));
            toast.success('Task updated!');
          } else {
            dispatch(addTask(data));
            toast.success('Task added!');
          }
          setModal(null);
        }}
      />
      <CompleteModal
        open={!!completeTarget} task={completeTarget} homeWallet={homeWallet}
        onClose={() => setCompleteTarget(null)}
        onConfirm={handleConfirmComplete}
      />
      <ConfirmDialog
        open={!!delTarget} onClose={() => setDelTarget(null)}
        onConfirm={() => { dispatch(deleteTask(delTarget.id)); toast.success('Task deleted'); setDelTarget(null); }}
        title="Delete Task" message={`Delete "${delTarget?.title}"? This cannot be undone.`}
      />
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TaskCard — dark navy header, priority accent bar, category avatar
// ─────────────────────────────────────────────────────────────────────────────
function TaskCard({ task, allCats, companies, onEdit, onDelete, onStatusChange, onComplete }) {
  const catCfg   = getCatCfg(task.category, allCats);
  const prioHex  = PRIORITY_CFG[task.priority]?.hex ?? '#64748b';
  const sBadge   = STATUS_CFG[task.status] ?? STATUS_CFG.scheduled;
  const nextSts  = NEXT_STATUSES[task.status] ?? [];
  const company  = companies?.find((c) => c.id === task.companyId);
  const emoji    = typeEmoji(task.type);
  const daysLeft = daysUntil(task.scheduledDate);

  return (
    <div className="group rounded-3xl overflow-hidden bg-white flex flex-col"
      style={{ boxShadow:'0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(11,29,58,0.10)' }}>

      {/* ── HEADER ── */}
      <div className="relative px-5 pt-4 pb-5 overflow-hidden"
        style={{ background:'linear-gradient(150deg, #0a172e 0%, #0c1f3f 55%, #0e2550 100%)' }}>

        {/* Priority accent bar (top, 3px) */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:prioHex, zIndex:2 }} />
        {/* Decorative rings */}
        <div style={{ position:'absolute', top:-36, right:-36, width:130, height:130, borderRadius:'50%', border:'1px solid rgba(255,255,255,0.05)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:-18, right:-18, width:80,  height:80,  borderRadius:'50%', border:'1px solid rgba(255,255,255,0.08)', pointerEvents:'none' }} />
        {/* Ghost watermark */}
        <div style={{ position:'absolute', right:8, bottom:-4, fontSize:68, lineHeight:1, opacity:0.06, userSelect:'none', pointerEvents:'none' }}>
          {catCfg.emoji}
        </div>

        {/* Status badge */}
        <div className="absolute top-5 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
          style={{ background:sBadge.bg, color:sBadge.color, border:sBadge.border, zIndex:10 }}>
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background:STATUS_CFG[task.status]?.hex ?? '#64748b' }} />
          {sBadge.label}
        </div>

        {/* Avatar + title */}
        <div className="relative flex items-center gap-3.5 mt-1" style={{ zIndex:5 }}>
          {/* Category + type avatar */}
          <div className="w-13 h-13 rounded-2xl shrink-0 flex flex-col items-center justify-center gap-0.5"
            style={{ background:`${catCfg.hex}22`, border:'2px solid rgba(255,255,255,0.12)', boxShadow:`0 4px 20px ${catCfg.hex}35` }}>
            <span className="text-[19px] leading-none select-none">{catCfg.emoji}</span>
            <span className="text-[8px] font-black text-white/30 leading-none">{task.category.toUpperCase().slice(0,4)}</span>
          </div>
          <div className="min-w-0 flex-1 pr-16">
            <p className="text-[14px] font-black text-white leading-snug line-clamp-2">{task.title}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {/* Type emoji + text */}
              <span className="text-[10px] font-semibold flex items-center gap-0.5" style={{ color:'rgba(255,255,255,0.38)' }}>
                {emoji} {task.type || task.category}
              </span>
              {/* Priority badge */}
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                style={{ background:`${prioHex}30`, color:prioHex, border:`1px solid ${prioHex}40` }}>
                {PRIORITY_CFG[task.priority]?.label ?? task.priority}
              </span>
            </div>
          </div>
        </div>

        {/* Edit / Delete (hover) */}
        <div className="absolute bottom-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ zIndex:10 }}>
          <button onClick={onEdit}
            className="w-7 h-7 rounded-xl flex items-center justify-center border transition-all"
            style={{ color:'rgba(255,255,255,0.55)', borderColor:'rgba(255,255,255,0.12)', background:'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.background='rgba(255,255,255,0.12)'; e.currentTarget.style.color='#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(255,255,255,0.55)'; }}>
            <RiEditLine className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete}
            className="w-7 h-7 rounded-xl flex items-center justify-center border transition-all"
            style={{ color:'rgba(255,255,255,0.55)', borderColor:'rgba(255,255,255,0.12)', background:'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.background='rgba(239,68,68,0.25)'; e.currentTarget.style.color='#fca5a5'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(255,255,255,0.55)'; }}>
            <RiDeleteBinLine className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="flex-1 flex flex-col px-5 pt-4 pb-4 gap-2.5">

        {/* Area › Asset */}
        {(task.areaName || task.assetName) && (
          <p className="text-[12px] text-slate-500 flex items-center gap-1 truncate">
            {task.areaName && <span>{task.areaName}</span>}
            {task.areaName && task.assetName && <RiArrowRightSLine className="w-3 h-3 text-slate-300 shrink-0" />}
            {task.assetName && <span className="font-medium text-slate-600 truncate">{task.assetName}</span>}
          </p>
        )}

        {/* Company */}
        {(company || task.companyName) && (
          <div className="flex items-center gap-2 text-[12px] text-slate-600">
            <RiBuilding2Line className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            {company
              ? <Link to={`/companies/${company.id}`} className="font-medium truncate hover:text-navy-700 transition-colors">{company.name}</Link>
              : <span className="font-medium truncate">{task.companyName}</span>
            }
          </div>
        )}

        {/* Date + days chip */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-[12px]">
            <RiCalendar2Line className="w-3.5 h-3.5 text-slate-300" />
            <span className={cn('font-semibold', task.status === 'overdue' ? 'text-red-600' : 'text-slate-600')}>
              {task.status === 'completed' ? fmtDate(task.completedDate) : fmtDate(task.scheduledDate)}
            </span>
          </div>
          {task.status === 'scheduled' && daysLeft !== null && daysLeft <= 7 && daysLeft >= 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
              {daysLeft === 0 ? 'Today' : `${daysLeft}d away`}
            </span>
          )}
          {task.status === 'overdue' && daysLeft !== null && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
              {Math.abs(daysLeft)}d overdue
            </span>
          )}
          {task.recurrence && task.recurrence !== 'one-time' && (
            <span className="text-[10px] text-slate-400">{task.recurrence}</span>
          )}
        </div>

        {/* Completion row */}
        {task.status === 'completed' && (
          <div className="flex items-center gap-1.5 text-[12px] text-green-600 font-semibold">
            <RiCheckboxCircleLine className="w-4 h-4 shrink-0" />
            Completed {fmtDate(task.completedDate)}
            {task.actualCost > 0 && <span className="text-green-500 font-normal ml-1">· AED {Number(task.actualCost).toLocaleString()}</span>}
          </div>
        )}

        {/* Cost hint */}
        {task.estimatedCost > 0 && task.status !== 'completed' && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <RiWalletLine className="w-3 h-3 text-emerald-400" />
            Est. AED {Number(task.estimatedCost).toLocaleString()} · Home Wallet on completion
          </div>
        )}

        <div className="flex-1" />

        {/* ── ACTION STRIP ── */}
        <div className={cn('border-t border-slate-100 pt-3 flex items-center gap-1.5 flex-wrap',
          task.status === 'completed' || task.status === 'cancelled' ? 'justify-end' : '')}>

          {/* Quick status transitions */}
          {nextSts.filter((s) => s !== 'completed').map((s) => {
            const sc = STATUS_CFG[s];
            return (
              <button key={s} onClick={() => onStatusChange(s)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all"
                style={{ background:sc.bg, color:sc.color, border:sc.border }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity='0.8'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity='1'; }}>
                {s === 'in-progress' && <RiPlayLine className="w-3 h-3" />}
                {s === 'on-hold'     && <RiPauseCircleLine className="w-3 h-3" />}
                {s === 'scheduled'   && <RiCalendar2Line className="w-3 h-3" />}
                {s === 'cancelled'   && <RiCloseCircleLine className="w-3 h-3" />}
                {sc.label}
              </button>
            );
          })}

          {/* Complete button */}
          {task.status !== 'completed' && task.status !== 'cancelled' && (
            <button onClick={onComplete}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all"
              style={{ background:'rgba(22,163,74,0.10)', color:'#16a34a' }}
              onMouseEnter={(e) => { e.currentTarget.style.background='rgba(22,163,74,0.18)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background='rgba(22,163,74,0.10)'; }}>
              <RiCheckLine className="w-3.5 h-3.5" />Complete
            </button>
          )}

          {/* Reschedule / Reopen */}
          {task.status === 'completed' && (
            <button onClick={() => onStatusChange('scheduled')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-slate-400 border border-slate-200 hover:bg-slate-50 transition-colors">
              <RiRefreshLine className="w-3 h-3" />Reschedule
            </button>
          )}
          {task.status === 'cancelled' && (
            <button onClick={() => onStatusChange('scheduled')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-slate-400 border border-slate-200 hover:bg-slate-50 transition-colors">
              <RiRefreshLine className="w-3 h-3" />Reopen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TaskRow — list view
// ─────────────────────────────────────────────────────────────────────────────
function TaskRow({ task, allCats, last, onEdit, onDelete, onStatusChange, onComplete }) {
  const catCfg  = getCatCfg(task.category, allCats);
  const prioHex = PRIORITY_CFG[task.priority]?.hex ?? '#64748b';
  const sBadge  = STATUS_CFG[task.status] ?? STATUS_CFG.scheduled;
  const emoji   = typeEmoji(task.type);

  return (
    <div className={cn('flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors group relative',
      !last && 'border-b border-slate-50',
      task.status === 'overdue' && 'bg-red-50/30')}>

      {/* Priority bar (left edge) */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
        style={{ background: prioHex }} />

      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[18px] select-none ml-2"
        style={{ background:`${catCfg.hex}15` }}>
        {emoji}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-semibold text-slate-800 truncate">{task.title}</p>
          <span className="hidden sm:inline-flex text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0"
            style={{ background:`${catCfg.hex}18`, color:catCfg.hex }}>
            {catCfg.emoji} {task.category}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 truncate mt-0.5">{task.assetName || task.areaName || '—'} · {task.companyName || 'Unassigned'}</p>
      </div>

      <div className="hidden md:flex flex-col items-end gap-1 shrink-0">
        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold"
          style={{ background:sBadge.bg, color:sBadge.color, border:sBadge.border }}>
          {sBadge.label}
        </span>
        <span className="text-[10px] text-slate-400">{fmtDate(task.scheduledDate)}</span>
      </div>

      {task.estimatedCost > 0 && (
        <span className="hidden lg:block text-[12px] font-semibold text-slate-500 shrink-0">
          AED {Number(task.estimatedCost).toLocaleString()}
        </span>
      )}

      {/* Actions (hover) */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {task.status !== 'completed' && task.status !== 'cancelled' && (
          <button onClick={onComplete}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-green-600 hover:bg-green-50 transition-all">
            <RiCheckLine className="w-3.5 h-3.5" />Done
          </button>
        )}
        <button onClick={onEdit}   className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"><RiEditLine className="w-3.5 h-3.5" /></button>
        <button onClick={onDelete} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"><RiDeleteBinLine className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CompleteModal
// ─────────────────────────────────────────────────────────────────────────────
function CompleteModal({ open, task, homeWallet, onClose, onConfirm }) {
  const { register, handleSubmit, reset, watch } = useForm();

  useEffect(() => {
    if (!open || !task) return;
    reset({
      completedDate: new Date().toISOString().split('T')[0],
      actualCost: task.estimatedCost ?? '',
      deductWallet: true,
      completionNotes: '',
    });
  }, [open, task]);

  const actualCost   = parseFloat(watch('actualCost')) || 0;
  const deductWallet = watch('deductWallet');
  const balanceAfter = (homeWallet?.balance ?? 0) - actualCost;

  const onSubmit = (d) => {
    onConfirm({
      task,
      completedDate:   d.completedDate,
      actualCost:      parseFloat(d.actualCost) || 0,
      deductWallet:    !!d.deductWallet,
      completionNotes: d.completionNotes || '',
    });
  };

  if (!task) return null;

  const catCfg = getCatCfg(task.category);
  const emoji  = typeEmoji(task.type);
  const daysLate = task.scheduledDate ? Math.abs(daysUntil(task.scheduledDate) ?? 0) : 0;

  return (
    <Modal open={open} onClose={onClose} title="Complete Task" subtitle="Confirm completion details and optional wallet deduction">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Task summary */}
        <div className="rounded-2xl overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-3"
            style={{ background:'linear-gradient(135deg, #0a172e, #0e2550)' }}>
            <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-xl"
              style={{ background:`${catCfg.hex}28`, border:'2px solid rgba(255,255,255,0.12)' }}>
              {emoji}
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-white truncate">{task.title}</p>
              <p className="text-[11px] mt-0.5" style={{ color:'rgba(255,255,255,0.45)' }}>
                {task.companyName || task.areaName || task.category}
                {task.status === 'overdue' && daysLate > 0 && (
                  <span className="ml-2 text-red-300">· {daysLate}d overdue</span>
                )}
              </p>
            </div>
          </div>
        </div>

        <FormGrid>
          <Field label="Completion Date" required>
            <Input {...register('completedDate', { required:true })} type="date" />
          </Field>
          <Field label="Actual Cost (AED)" hint="Leave blank to use estimated cost">
            <Input {...register('actualCost')} type="number" min="0" step="0.01" placeholder="0.00" />
          </Field>
        </FormGrid>

        {/* Wallet deduction panel */}
        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors">
            <input {...register('deductWallet')} type="checkbox" className="w-4 h-4 accent-emerald-600 shrink-0" />
            <div className="flex items-center gap-2 flex-1">
              <RiWalletLine className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-[13px] font-semibold text-slate-800">Deduct from Home Wallet</p>
            </div>
            <span className="text-[12px] font-bold text-emerald-600 shrink-0">
              AED {(homeWallet?.balance ?? 0).toLocaleString()}
            </span>
          </label>
          {deductWallet && actualCost > 0 && (
            <div className="px-4 py-3 bg-emerald-50 border-t border-emerald-100">
              <div className="flex justify-between text-[12px] mb-1">
                <span className="text-emerald-700">Current balance</span>
                <span className="font-bold text-emerald-700">AED {(homeWallet?.balance ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[12px] mb-2">
                <span className="text-emerald-600">Deduction</span>
                <span className="font-bold text-red-600">− AED {actualCost.toLocaleString()}</span>
              </div>
              <div className="h-px bg-emerald-200" />
              <div className="flex justify-between text-[12px] mt-2">
                <span className="font-bold text-emerald-800">Balance after</span>
                <span className={cn('font-black text-[14px]', balanceAfter < 0 ? 'text-red-600' : 'text-emerald-700')}>
                  AED {balanceAfter.toLocaleString()}
                </span>
              </div>
              {balanceAfter < 0 && (
                <p className="text-[11px] text-red-600 font-semibold mt-2 flex items-center gap-1">
                  <RiAlertLine className="w-3.5 h-3.5" />
                  Insufficient balance — wallet will be zeroed out.
                </p>
              )}
            </div>
          )}
        </div>

        <Field label="Completion Notes" hint="Observations, parts used, follow-up needed">
          <Textarea {...register('completionNotes')} rows={2}
            placeholder="e.g. Replaced filters, topped up refrigerant, next service in 6 months…" />
        </Field>

        <div className="flex gap-3 pt-1 border-t border-slate-100">
          <button type="button" onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-all">
            Cancel
          </button>
          <button type="submit"
            className="flex-1 h-10 rounded-xl text-[13px] font-bold text-white flex items-center justify-center gap-2 transition-all"
            style={{ background:'linear-gradient(135deg, #16a34a, #15803d)' }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity='0.9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity='1'; }}>
            <RiCheckboxCircleLine className="w-4 h-4" />
            {deductWallet && actualCost > 0 ? `Complete & Deduct AED ${actualCost.toLocaleString()}` : 'Mark Complete'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TaskFormModal — Add / Edit
// ─────────────────────────────────────────────────────────────────────────────
function TaskFormModal({ open, onClose, item, categories, companies, areas, assets, onSave }) {
  const { register, handleSubmit, reset, watch, setValue } = useForm();

  useEffect(() => {
    if (!open) return;
    reset(item ? {
      title: item.title, category: item.category ?? 'Maintenance',
      type: item.type ?? '', priority: item.priority ?? 'medium',
      areaId: item.areaId ?? '', assetId: item.assetId ?? '',
      companyId: item.companyId ?? '', scheduledDate: item.scheduledDate,
      status: item.status, estimatedCost: item.estimatedCost ?? '',
      recurrence: item.recurrence ?? 'one-time', notes: item.notes ?? '',
      companyName: item.companyName ?? '', areaName: item.areaName ?? '',
      assetName: item.assetName ?? '',
    } : {
      status: 'scheduled', recurrence: 'one-time',
      priority: 'medium', category: 'Maintenance',
      areaId: '', assetId: '',
    });
  }, [open, item]);

  const areaId     = watch('areaId');
  const cost       = watch('estimatedCost');
  const category   = watch('category');
  const areaAssets = assets.filter((a) => !areaId || a.areaId === areaId);
  useEffect(() => { setValue('assetId', ''); }, [areaId]);

  const catCfg = getCatCfg(category, categories);

  const onSubmit = (d) => {
    const comp  = companies.find((c) => c.id === d.companyId);
    const area  = areas.find((a) => a.id === d.areaId);
    const asset = assets.find((a) => a.id === d.assetId);
    onSave({
      ...d,
      estimatedCost: parseFloat(d.estimatedCost) || 0,
      companyName: comp?.name   ?? d.companyName  ?? item?.companyName  ?? '',
      areaName:    area?.name   ?? d.areaName     ?? item?.areaName     ?? '',
      assetName:   asset?.name  ?? d.assetName    ?? item?.assetName    ?? '',
    });
  };

  return (
    <Modal open={open} onClose={onClose} size="lg"
      title={item ? 'Edit Task' : 'Add New Task'}
      subtitle={item ? `Editing: ${item.title}` : 'Add a maintenance or repair task'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        <Field label="Task Title" required>
          <Input {...register('title', { required:'Required' })} placeholder="e.g. AC Full Service, Fix Kitchen Tap…" />
        </Field>

        {/* Category + Priority */}
        <FormGrid>
          <Field label="Category" required>
            <select {...register('category')}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] text-slate-800 focus:outline-none focus:border-navy-400 bg-white">
              {categories.map((c) => (
                <option key={c} value={c}>{getCatCfg(c, categories).emoji} {c}</option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select {...register('priority')}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] text-slate-800 focus:outline-none focus:border-navy-400 bg-white">
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{PRIORITY_CFG[p].label}</option>
              ))}
            </select>
          </Field>
        </FormGrid>

        <Field label="Type / Subtype" hint="e.g. Routine Service, AC Repair, Deep Clean">
          <Input {...register('type')} placeholder={category === 'Repair' ? 'e.g. AC Repair, Plumbing, Electrical…' : 'e.g. Routine Service, Deep Clean, Inspection…'} />
        </Field>

        <FormGrid>
          <Field label="Area / Room">
            <Select {...register('areaId')} placeholder="— Select area —"
              options={areas.map((a) => ({ value:a.id, label:`${a.emoji ?? ''} ${a.name}`.trim() }))} />
          </Field>
          <Field label="Asset / Equipment">
            <Select {...register('assetId')} placeholder={areaId ? '— Select asset —' : '— Pick area first —'}
              options={areaAssets.map((a) => ({ value:a.id, label:a.name }))} />
          </Field>
        </FormGrid>

        <FormGrid>
          <Field label="Service Company">
            <Select {...register('companyId')} placeholder="Select company"
              options={companies.map((c) => ({ value:c.id, label:c.name }))} />
          </Field>
          <Field label="Recurrence">
            <Select {...register('recurrence')} options={RECURRENCES.map((r) => ({ value:r, label:r.charAt(0).toUpperCase()+r.slice(1) }))} />
          </Field>
        </FormGrid>

        <FormGrid>
          <Field label="Scheduled Date" required>
            <Input {...register('scheduledDate', { required:'Required' })} type="date" />
          </Field>
          <Field label="Estimated Cost (AED)">
            <Input {...register('estimatedCost')} type="number" min="0" step="0.01" placeholder="0.00" />
          </Field>
        </FormGrid>

        {parseFloat(cost) > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <RiWalletLine className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-[12px] text-emerald-700 font-medium">
              AED {parseFloat(cost).toLocaleString()} will be deducted from Home Wallet on completion.
            </p>
          </div>
        )}

        <Field label="Notes">
          <Textarea {...register('notes')} rows={2} placeholder="Special instructions, parts needed, access notes…" />
        </Field>

        <FormActions onCancel={onClose} submitLabel={item ? 'Update Task' : 'Add Task'} />
      </form>
    </Modal>
  );
}
