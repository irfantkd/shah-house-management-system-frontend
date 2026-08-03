import { useEffect, useMemo, useState } from "react";
import { MotionSwipeableRow } from "../../components/ui/SwipeableRow";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  RiAddLine,
  RiCalendar2Line,
  RiListCheck2,
  RiLayoutGridLine,
  RiEditLine,
  RiDeleteBinLine,
  RiCheckLine,
  RiAlertLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiWalletLine,
  RiBuilding2Line,
  RiPlayLine,
  RiArrowRightSLine,
  RiArrowLeftSLine,
  RiCheckboxCircleLine,
  RiPauseCircleLine,
  RiCloseCircleLine,
  RiRefreshLine,
  RiAddCircleLine,
  RiFileTextLine,
} from "react-icons/ri";
import {
  Settings2,
  Wrench,
  ClipboardList,
  Sparkles,
  Zap,
  Droplets,
  TreeDeciduous,
  Shield,
  PaintBucket,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  useGetQuery,
  usePostMutation,
  usePutMutation,
  useDeleteMutation,
  usePatchMutation,
} from "../../api/apiSlice";
import { selectCurrentPropertyId } from "../../store/slices/propertiesSlice";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import {
  Field,
  Input,
  Select,
  Textarea,
  FormGrid,
  FormSection,
  FormActions,
} from "../../components/ui/FormField";
import Button from "../../components/ui/Button";
import { cn } from "../../utils/cn";

// ── Category config ──────────────────────────────────────────────────────────
const CAT_CFG = {
  Maintenance: { hex: "#16a34a", Icon: Settings2,      emoji: "🔧" },
  Repair:      { hex: "#dc2626", Icon: Wrench,         emoji: "🛠️" },
  Electrical:  { hex: "#d97706", Icon: Zap,            emoji: "⚡" },
  Plumbing:    { hex: "#0891b2", Icon: Droplets,       emoji: "💧" },
  Painting:    { hex: "#be185d", Icon: PaintBucket,    emoji: "🎨" },
  Cleaning:    { hex: "#0f766e", Icon: Sparkles,       emoji: "✨" },
  Landscaping: { hex: "#16a34a", Icon: TreeDeciduous,  emoji: "🌿" },
  Security:    { hex: "#1e40af", Icon: Shield,         emoji: "🔒" },
};
const CUSTOM_PALETTE = [
  "#7c3aed",
  "#0891b2",
  "#d97706",
  "#be185d",
  "#0f766e",
  "#1e40af",
];
const CUSTOM_EMOJIS = ["⚙️", "🏗️", "📋", "🔑", "🌊", "🪟", "🚪", "📦"];
function getCatCfg(cat, allCats = []) {
  if (CAT_CFG[cat]) return CAT_CFG[cat];
  const idx = allCats.indexOf(cat);
  return {
    hex:   CUSTOM_PALETTE[idx % CUSTOM_PALETTE.length] ?? "#7c3aed",
    Icon:  ClipboardList,
    emoji: CUSTOM_EMOJIS[idx % CUSTOM_EMOJIS.length] ?? "📋",
  };
}

// ── Priority config ──────────────────────────────────────────────────────────
const PRIORITY_CFG = {
  critical: { label: "Critical", hex: "#dc2626" },
  high: { label: "High", hex: "#ea580c" },
  medium: { label: "Medium", hex: "#2563eb" },
  low: { label: "Low", hex: "#64748b" },
};

// ── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG = {
  scheduled: {
    label: "Scheduled",
    hex: "#2563eb",
    bg: "rgba(37,99,235,0.12)",
    color: "#93c5fd",
    border: "1px solid rgba(37,99,235,0.22)",
  },
  "in-progress": {
    label: "In Progress",
    hex: "#d97706",
    bg: "rgba(234,88,12,0.13)",
    color: "#fdba74",
    border: "1px solid rgba(234,88,12,0.24)",
  },
  "on-hold": {
    label: "On Hold",
    hex: "#9333ea",
    bg: "rgba(147,51,234,0.12)",
    color: "#d8b4fe",
    border: "1px solid rgba(147,51,234,0.22)",
  },
  overdue: {
    label: "Overdue",
    hex: "#dc2626",
    bg: "rgba(220,38,38,0.14)",
    color: "#fca5a5",
    border: "1px solid rgba(220,38,38,0.26)",
  },
  completed: {
    label: "Completed",
    hex: "#16a34a",
    bg: "rgba(22,163,74,0.12)",
    color: "#86efac",
    border: "1px solid rgba(22,163,74,0.22)",
  },
  cancelled: {
    label: "Cancelled",
    hex: "#64748b",
    bg: "rgba(100,116,139,0.10)",
    color: "#94a3b8",
    border: "1px solid rgba(100,116,139,0.20)",
  },
};

const NEXT_STATUSES = {
  scheduled: ["in-progress", "on-hold", "cancelled"],
  "in-progress": ["on-hold", "scheduled"],
  "on-hold": ["in-progress", "cancelled"],
  overdue: ["in-progress", "on-hold", "cancelled"],
  completed: ["scheduled"],
  cancelled: ["scheduled"],
};


const PAGE_SIZE = 10;

// ─── Pagination helpers ───────────────────────────────────────────────────────
function getPagNums(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, "…", pages];
  if (page >= pages - 3) return [1, "…", pages-4, pages-3, pages-2, pages-1, pages];
  return [1, "…", page-1, page, page+1, "…", pages];
}
function PagBtn({ onClick, disabled, active, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "min-w-8 h-8 px-2 rounded-lg text-[12px] font-semibold transition-all border",
        active
          ? "bg-navy-900 text-white border-navy-900"
          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed",
      )}
    >
      {children}
    </button>
  );
}
function PaginationBar({ page, pages, onPage }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1.5 py-4">
      <PagBtn onClick={() => onPage(page - 1)} disabled={page <= 1}>
        <RiArrowLeftSLine className="w-4 h-4" />
      </PagBtn>
      {getPagNums(page, pages).map((n, i) =>
        n === "…"
          ? <span key={`e${i}`} className="text-slate-400 text-[12px] px-1">…</span>
          : <PagBtn key={n} onClick={() => onPage(n)} active={n === page}>{n}</PagBtn>
      )}
      <PagBtn onClick={() => onPage(page + 1)} disabled={page >= pages}>
        <RiArrowRightSLine className="w-4 h-4" />
      </PagBtn>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const RECURRENCES = [
  "one-time",
  "weekly",
  "bi-weekly",
  "monthly",
  "quarterly",
  "bi-annual",
  "annual",
];
const STATUS_OPTS = [
  "scheduled",
  "in-progress",
  "on-hold",
  "overdue",
  "completed",
  "cancelled",
];
const PRIORITIES = ["critical", "high", "medium", "low"];

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function buildGrid(y, m) {
  const first = new Date(y, m, 1),
    last = new Date(y, m + 1, 0);
  const off = (first.getDay() + 6) % 7,
    cells = [];
  for (let i = off; i > 0; i--)
    cells.push({ date: new Date(y, m, 1 - i), current: false });
  for (let d = 1; d <= last.getDate(); d++)
    cells.push({ date: new Date(y, m, d), current: true });
  let p = 1;
  while (cells.length < 42)
    cells.push({ date: new Date(y, m + 1, p++), current: false });
  return cells;
}
function fmtDate(s) {
  if (!s) return "—";
  return new Date(s + "T00:00:00").toLocaleDateString("en-AE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr + "T00:00:00") - new Date()) / 86400000);
}

// ─────────────────────────────────────────────────────────────────────────────
// MobileTaskRow — compact swipeable row for mobile list view
// ─────────────────────────────────────────────────────────────────────────────
function MobileTaskRow({ task, allCats, onClick }) {
  const catCfg  = getCatCfg(task.category, allCats);
  const CatIcon = catCfg.Icon;
  const prioHex = PRIORITY_CFG[task.priority]?.hex ?? "#64748b";
  const sBadge  = STATUS_CFG[task.status]          ?? STATUS_CFG.scheduled;
  const daysLeft = daysUntil(task.scheduledDate);

  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5 bg-white hover:bg-slate-50/60 active:bg-slate-50 transition-colors cursor-pointer"
      style={{ borderLeft: `3px solid ${prioHex}` }}
      onClick={onClick}
    >
      <div
        className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center"
        style={{ background: `${catCfg.hex}15`, color: catCfg.hex }}
      >
        <CatIcon className="w-4 h-4" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-slate-900 truncate">{task.title}</p>
        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
          {task.category}
          {task.areaName ? ` · ${task.areaName}` : ""}
          {task.companyName ? ` · ${task.companyName}` : ""}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
          style={{ background: sBadge.bg, color: sBadge.color, border: sBadge.border }}
        >
          {sBadge.label}
        </span>
        {daysLeft !== null && (
          <span className={cn(
            "text-[10px] font-semibold",
            daysLeft < 0 ? "text-red-500" : daysLeft <= 7 ? "text-amber-500" : "text-slate-400",
          )}>
            {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? "Today" : `${daysLeft}d`}
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function MaintenancePage() {
  const propertyId = useSelector(selectCurrentPropertyId);

  // All tasks for category tab counts (no filters)
  const { data: allItems = [] } = useGetQuery(
    { path: "/tasks", params: { propertyId } },
    { skip: !propertyId },
  );
  const { data: rawCats = [] } = useGetQuery(
    { path: "/task-categories", params: { propertyId } },
    { skip: !propertyId },
  );
  const categories = rawCats.map((c) => c.name ?? c);
  const { data: companies = [] } = useGetQuery({ path: "/companies" });
  const { data: areas = [] } = useGetQuery(
    { path: "/areas", params: { propertyId } },
    { skip: !propertyId },
  );
  const { data: assets = [] } = useGetQuery(
    { path: "/assets", params: { propertyId } },
    { skip: !propertyId },
  );
  const { data: contracts = [] } = useGetQuery(
    { path: "/contracts", params: { propertyId } },
    { skip: !propertyId },
  );
  const { data: walletData, refetch: refetchWallet } = useGetQuery(
    { path: "/wallet", params: { propertyId } },
    { skip: !propertyId },
  );
  const homeWallet = { balance: walletData?.home?.balance ?? 0 };
  const vehicleWallet = { balance: walletData?.vehicle?.balance ?? 0 };
  const { data: floorsRaw = [] } = useGetQuery(
    { path: "/floors", params: { propertyId } },
    { skip: !propertyId },
  );
  const floors = floorsRaw;

  const [addTaskMut] = usePostMutation();
  const [updateTaskMut] = usePutMutation();
  const [deleteTaskMut] = useDeleteMutation();
  const [patchTaskMut] = usePatchMutation();
  const [addExpenseMut] = usePostMutation();
  const [deductWalletMut] = usePostMutation();
  const [addCategoryMut] = usePostMutation();

  const [catTab, setCatTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [view, setView] = useState("grid");
  const [modal, setModal] = useState(null);
  const [detailTask, setDetailTask] = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [completeTarget, setCompleteTarget] = useState(null);
  const [expenseTarget, setExpenseTarget] = useState(null);
  const [viewDate, setViewDate] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth()),
  );
  const [newCatInput, setNewCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  // Category-filtered tasks — calendar view (backend filters by category)
  const { data: catItems = [] } = useGetQuery(
    {
      path: "/tasks",
      params: {
        propertyId,
        ...(catTab !== "all" && { category: catTab }),
      },
    },
    { skip: !propertyId },
  );

  // Stats from backend — replaces client-side useMemo calculation
  const { data: taskStatsRaw = {} } = useGetQuery(
    {
      path: "/tasks/stats",
      params: {
        propertyId,
        ...(catTab !== "all" && { category: catTab }),
      },
    },
    { skip: !propertyId },
  );
  const stats = {
    total:      taskStatsRaw.total                       ?? 0,
    scheduled:  taskStatsRaw.byStatus?.scheduled         ?? 0,
    inProgress: taskStatsRaw.byStatus?.inProgress        ?? 0,
    onHold:     taskStatsRaw.byStatus?.onHold            ?? 0,
    overdue:    taskStatsRaw.byStatus?.overdue           ?? 0,
    completed:  taskStatsRaw.byStatus?.completed         ?? 0,
    cancelled:  taskStatsRaw.byStatus?.cancelled         ?? 0,
  };

  useEffect(() => { setPage(1); }, [catTab, statusFilter]);

  // Fully filtered tasks for grid / list — paginated
  const { data: filteredRaw, isFetching: isFilteredFetching } = useGetQuery(
    {
      path: "/tasks",
      params: {
        propertyId,
        page,
        limit: PAGE_SIZE,
        ...(catTab !== "all" && { category: catTab }),
        ...(statusFilter !== "all" && { status: statusFilter }),
      },
    },
    { skip: !propertyId },
  );
  const filtered    = filteredRaw?.items ?? (Array.isArray(filteredRaw) ? filteredRaw : []);
  const totalPages  = filteredRaw?.pages ?? 1;

  const year = viewDate.getFullYear(),
    month = viewDate.getMonth();
  const cells = useMemo(() => buildGrid(year, month), [year, month]);
  const byDate = useMemo(() => {
    const map = {};
    catItems.forEach((t) => {
      const key =
        t.status === "completed"
          ? (t.completedDate ?? t.scheduledDate)
          : t.scheduledDate;
      if (key) {
        if (!map[key]) map[key] = [];
        map[key].push(t);
      }
    });
    return map;
  }, [catItems]);

  const handleStatusChange = async (task, newStatus) => {
    if (newStatus === "completed") {
      setCompleteTarget(task);
      return;
    }
    try {
      await patchTaskMut({
        path: `/tasks/${task.id}`,
        body: { status: newStatus },
      }).unwrap();
      toast.success(`Status → ${STATUS_CFG[newStatus]?.label ?? newStatus}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleConfirmComplete = async ({
    task,
    completedDate,
    completionNotes,
  }) => {
    try {
      await patchTaskMut({
        path: `/tasks/${task.id}`,
        body: { status: "completed", completedDate, completionNotes },
      }).unwrap();
      toast.success("Task marked as completed!");
      setCompleteTarget(null);
    } catch {
      toast.error("Failed to complete task");
    }
  };

  const handleAddExpense = async ({ task, expense }) => {
    try {
      await addExpenseMut({
        path: `/tasks/${task.id}/expenses`,
        body: { ...expense, propertyId },
      }).unwrap();
      if (expense.amount > 0) {
        const walletType = expense.walletType ?? "home";
        await deductWalletMut({
          path: "/wallet/deduct",
          body: {
            propertyId,
            walletType,
            amount: expense.amount,
            description: `${task.title} — ${expense.description || expense.category}`,
            category: task.category,
            date: expense.date,
          },
        }).unwrap();
        await refetchWallet();
      }
      toast.success(
        `Expense AED ${expense.amount.toLocaleString()} added to task`,
      );
      setExpenseTarget(null);
    } catch {
      toast.error("Failed to add expense");
    }
  };

  const handleAddCat = async () => {
    const name = newCatName.trim();
    if (!name) return;
    try {
      await addCategoryMut({
        path: "/task-categories",
        body: { name, propertyId },
      }).unwrap();
      toast.success(`Category "${name}" added`);
      setNewCatName("");
      setNewCatInput(false);
      setCatTab(name);
    } catch {
      toast.error("Failed to add category");
    }
  };

  const catLabel =
    catTab === "all"
      ? "All Tasks"
      : catTab === "Maintenance"
        ? "Maintenance"
        : catTab === "Repair"
          ? "Repairs"
          : catTab;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">
            Maintenance & Repairs
          </h1>
          <p className="text-[13px] text-slate-400 mt-0.5">
            Plan, track and complete all property tasks in one place
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
            <RiWalletLine className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-[12px] font-bold text-emerald-700">
              AED {homeWallet.balance.toLocaleString()}
            </span>
            <span className="text-[10px] text-emerald-500 hidden sm:inline">
              Home Wallet
            </span>
          </div>
          <Button
            variant="primary"
            icon={RiAddLine}
            onClick={() => setModal("add")}
          >
            Add Task
          </Button>
        </div>
      </div>

      {/* ── Category tabs ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* All */}
        <button
          onClick={() => {
            setCatTab("all");
            setStatusFilter("all");
          }}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold border transition-all",
            catTab === "all"
              ? "bg-navy-900 text-white border-navy-900"
              : "bg-white text-slate-500 border-slate-200 hover:border-slate-300",
          )}
        >
          All Tasks
          <span
            className={cn(
              "text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center",
              catTab === "all"
                ? "bg-white/20 text-white"
                : "bg-slate-100 text-slate-500",
            )}
          >
            {allItems.length}
          </span>
        </button>

        {/* Built-in + custom category tabs */}
        {categories.map((cat) => {
          const cfg = getCatCfg(cat, categories);
          const count = allItems.filter((t) => t.category === cat).length;
          const active = catTab === cat;
          return (
            <button
              key={cat}
              onClick={() => {
                setCatTab(cat);
                setStatusFilter("all");
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold border transition-all"
              style={
                active
                  ? { background: cfg.hex, color: "#fff", borderColor: cfg.hex }
                  : {
                      background: "#fff",
                      color: "#64748b",
                      borderColor: "#e2e8f0",
                    }
              }
            >
              <cfg.Icon className="w-4 h-4" strokeWidth={1.5} />
              {cat}
              <span
                className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
                style={
                  active
                    ? { background: "rgba(255,255,255,0.25)", color: "#fff" }
                    : { background: "#f1f5f9", color: "#64748b" }
                }
              >
                {count}
              </span>
            </button>
          );
        })}

        {/* Add custom category */}
        {!newCatInput ? (
          <button
            onClick={() => setNewCatInput(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold text-slate-400 border border-dashed border-slate-200 hover:border-slate-300 hover:text-slate-600 transition-all bg-white"
          >
            <RiAddCircleLine className="w-3.5 h-3.5" />+ Category
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddCat();
                if (e.key === "Escape") {
                  setNewCatInput(false);
                  setNewCatName("");
                }
              }}
              placeholder="Category name…"
              className="h-9 w-36 px-3 rounded-xl border border-slate-300 text-[13px] focus:outline-none focus:border-navy-400"
            />
            <button
              onClick={handleAddCat}
              className="h-9 px-3 rounded-xl bg-navy-900 text-white text-[12px] font-bold hover:bg-navy-800 transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => {
                setNewCatInput(false);
                setNewCatName("");
              }}
              className="h-9 px-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 text-[12px] transition-colors"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            label: "Scheduled",
            value: stats.scheduled,
            hex: "#2563eb",
            filter: "scheduled",
          },
          {
            label: "In Progress",
            value: stats.inProgress,
            hex: "#d97706",
            filter: "in-progress",
          },
          {
            label: "On Hold",
            value: stats.onHold,
            hex: "#9333ea",
            filter: "on-hold",
          },
          {
            label: "Overdue",
            value: stats.overdue,
            hex: "#dc2626",
            filter: "overdue",
          },
          {
            label: "Completed",
            value: stats.completed,
            hex: "#16a34a",
            filter: "completed",
          },
          { label: "Total", value: stats.total, hex: "#0b1d3a", filter: "all" },
        ].map((s, i) => (
          <motion.button
            key={s.filter}
            onClick={() => setStatusFilter(s.filter)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={cn(
              "rounded-2xl p-4 text-left border transition-all hover:-translate-y-0.5",
              statusFilter === s.filter
                ? "border-transparent text-white"
                : "bg-white border-slate-100 text-slate-700 hover:border-slate-200",
            )}
            style={statusFilter === s.filter ? { background: s.hex } : {}}
          >
            <p className="text-2xl font-black leading-none">{s.value}</p>
            <p
              className={cn(
                "text-[11px] font-semibold mt-1",
                statusFilter === s.filter ? "text-white/70" : "text-slate-400",
              )}
            >
              {s.label}
            </p>
          </motion.button>
        ))}
      </div>

      {/* ── Overdue alert ── */}
      {stats.overdue > 0 && statusFilter !== "overdue" && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-3.5">
          <RiAlertLine className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-[13px] font-semibold text-red-800 flex-1">
            {stats.overdue} {catLabel.toLowerCase()} task
            {stats.overdue > 1 ? "s are" : " is"} overdue.
          </p>
          <button
            onClick={() => setStatusFilter("overdue")}
            className="text-[12px] font-bold text-red-600 hover:underline whitespace-nowrap"
          >
            View overdue →
          </button>
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto pb-0.5 w-full sm:w-auto">
          {[
            ["all", "All", stats.total],
            ["scheduled", "Scheduled", stats.scheduled],
            ["in-progress", "In Progress", stats.inProgress],
            ["on-hold", "On Hold", stats.onHold],
            ["overdue", "Overdue", stats.overdue],
            ["completed", "Completed", stats.completed],
          ].map(([v, l, count]) => (
            <button
              key={v}
              onClick={() => setStatusFilter(v)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap border transition-all",
                statusFilter === v
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300",
              )}
            >
              {l}
              <span
                className={cn(
                  "text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1",
                  statusFilter === v
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-500",
                )}
              >
                {count}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shrink-0">
          {[
            ["grid", RiLayoutGridLine],
            ["list", RiListCheck2],
            ["calendar", RiCalendar2Line],
          ].map(([v, Icon]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                view === v
                  ? "bg-navy-900 text-white"
                  : "text-slate-400 hover:text-slate-600",
              )}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* ── CALENDAR ── */}
      {view === "calendar" && (
        <div
          className="bg-white rounded-2xl border border-slate-100 p-5"
          style={{ boxShadow: "0 1px 8px rgb(0 0 0/0.06)" }}
        >
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => setViewDate(new Date(year, month - 1))}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-navy-50 hover:text-navy-700 transition-all"
            >
              <RiArrowLeftLine className="w-4 h-4" />
            </button>
            <h2 className="text-[15px] font-bold text-navy-900">
              {viewDate.toLocaleDateString("en-AE", {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <button
              onClick={() => setViewDate(new Date(year, month + 1))}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-navy-50 hover:text-navy-700 transition-all"
            >
              <RiArrowRightLine className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-7 mb-2 min-w-[280px]">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div
                  key={d}
                  className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest py-1"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 min-w-[280px]">
              {cells.map((cell, i) => {
                const ds = toDateStr(cell.date),
                  evs = byDate[ds] ?? [];
                const isToday = ds === toDateStr(new Date());
                return (
                  <div
                    key={i}
                    onClick={() => {
                      if (!cell.current) return;
                      if (evs.length === 0) {
                        setModal({ _prefillDate: ds });
                      }
                    }}
                    className={cn(
                      "min-h-[72px] rounded-xl p-1.5 transition-colors",
                      !cell.current && "opacity-20",
                      isToday && "bg-navy-900",
                      cell.current && !isToday && "hover:bg-slate-50 cursor-pointer",
                      cell.current && evs.length === 0 && "hover:border hover:border-dashed hover:border-navy-300",
                    )}
                  >
                    <span
                      className={cn(
                        "block text-center text-[12px] font-semibold mb-1",
                        isToday ? "text-white" : "text-slate-700",
                      )}
                    >
                      {cell.date.getDate()}
                    </span>
                    {evs.slice(0, 3).map((ev) => {
                      const catC = getCatCfg(ev.category, categories);
                      const sCfg = STATUS_CFG[ev.status] ?? STATUS_CFG.scheduled;
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setDetailTask(ev); }}
                          className="w-full flex items-center gap-1 text-[9px] font-semibold px-1 py-0.5 rounded-md mb-0.5 truncate text-left hover:opacity-80 transition-opacity"
                          style={{ background: sCfg.bg ?? `${catC.hex}18`, color: sCfg.color ?? catC.hex }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: catC.hex }}
                          />
                          <span className="truncate">{ev.title}</span>
                        </button>
                      );
                    })}
                    {evs.length > 3 && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setDetailTask(evs[3]); }}
                        className="text-[9px] text-slate-400 pl-1 hover:text-slate-600 transition-colors"
                      >
                        +{evs.length - 3} more
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {/* end overflow-x-auto */}
        </div>
      )}

      {/* ── GRID / LIST CONTENT WRAPPER ── */}
      <div className={cn("transition-opacity duration-200", isFilteredFetching ? "opacity-50" : "opacity-100")}>

      {/* ── MOBILE SWIPE LIST — md:hidden ── */}
      {view !== "calendar" && (
        <div className="md:hidden rounded-2xl border border-slate-100 overflow-hidden bg-white divide-y divide-slate-50">
          {filtered.length === 0 ? (
            <div className="p-10 text-center">
              <ClipboardList className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-[13px] font-semibold text-slate-400">
                No {catTab === "all" ? "" : catTab.toLowerCase()} tasks
                {statusFilter !== "all" ? ` · ${STATUS_CFG[statusFilter]?.label ?? statusFilter}` : ""}
              </p>
              <button onClick={() => setModal("add")} className="mt-2 text-accent-600 text-[12px] font-semibold hover:underline">
                + Add task
              </button>
            </div>
          ) : (
            <>
              <p className="text-[10px] text-slate-400 text-center py-1.5 bg-slate-50/80">
                Swipe right to edit · Swipe left to delete (pending only)
              </p>
              <AnimatePresence mode="popLayout">
                {filtered.map((task) => {
                  const isPending = task.status !== "completed" && task.status !== "cancelled";
                  if (isPending) {
                    return (
                      <MotionSwipeableRow
                        key={task.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, x: -20 }}
                        onSwipeRight={() => setModal(task)}
                        onSwipeLeft={() => setDelTarget(task)}
                        leftIcon={<Pencil style={{ color: "#2563eb", width: 20, height: 20 }} />}
                        leftLabel="Edit" leftBg="#eff6ff" leftColor="#2563eb"
                        rightIcon={<Trash2 style={{ color: "#dc2626", width: 20, height: 20 }} />}
                        rightLabel="Delete" rightBg="#fef2f2" rightColor="#dc2626"
                      >
                        <MobileTaskRow task={task} allCats={categories} onClick={() => setDetailTask(task)} />
                      </MotionSwipeableRow>
                    );
                  }
                  return (
                    <motion.div key={task.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <MobileTaskRow task={task} allCats={categories} onClick={() => setDetailTask(task)} />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </>
          )}
        </div>
      )}

      {/* ── DESKTOP EMPTY STATE — hidden md:block ── */}
      {view !== "calendar" && filtered.length === 0 && (
        <div className="hidden md:block bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-slate-100">
            {catTab === "Maintenance" ? (
              <Settings2 className="w-7 h-7 text-slate-400" />
            ) : catTab === "Repair" ? (
              <Wrench className="w-7 h-7 text-slate-400" />
            ) : (
              <ClipboardList className="w-7 h-7 text-slate-400" />
            )}
          </div>
          <p className="font-semibold text-slate-400 mb-1">
            No {catLabel.toLowerCase()} tasks
            {statusFilter !== "all"
              ? ` with status "${STATUS_CFG[statusFilter]?.label ?? statusFilter}"`
              : ""}
          </p>
          <button
            onClick={() => setModal("add")}
            className="mt-3 text-accent-600 text-[13px] font-semibold hover:underline"
          >
            + Add task
          </button>
        </div>
      )}

      {/* ── DESKTOP GRID VIEW — hidden md:grid ── */}
      {view === "grid" && filtered.length > 0 && (
        <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ delay: i * 0.04 }}
              >
                <TaskCard
                  task={task}
                  allCats={categories}
                  companies={companies}
                  contracts={contracts}
                  onView={() => setDetailTask(task)}
                  onEdit={() => setModal(task)}
                  onDelete={() => setDelTarget(task)}
                  onStatusChange={(s) => handleStatusChange(task, s)}
                  onComplete={() => setCompleteTarget(task)}
                  onAddExpense={() => setExpenseTarget(task)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── DESKTOP LIST VIEW — hidden md:block ── */}
      {view === "list" && filtered.length > 0 && (
        <div
          className="hidden md:block bg-white rounded-2xl border border-slate-100 overflow-hidden"
          style={{ boxShadow: "0 1px 8px rgb(0 0 0/0.06)" }}
        >
          {filtered.map((task, i) => (
            <TaskRow
              key={task.id}
              task={task}
              allCats={categories}
              last={i === filtered.length - 1}
              contracts={contracts}
              onView={() => setDetailTask(task)}
              onEdit={() => setModal(task)}
              onDelete={() => setDelTarget(task)}
              onStatusChange={(s) => handleStatusChange(task, s)}
              onComplete={() => setCompleteTarget(task)}
              onAddExpense={() => setExpenseTarget(task)}
            />
          ))}
        </div>
      )}

      <PaginationBar page={page} pages={totalPages} onPage={setPage} />

      </div>{/* end opacity wrapper */}

      {/* ── MODALS ── */}
      <TaskFormModal
        open={modal !== null}
        item={modal !== "add" && !modal?._prefillDate ? modal : null}
        prefillDate={modal?._prefillDate ?? null}
        categories={categories}
        companies={companies}
        areas={areas}
        assets={assets}
        floors={floors}
        contracts={contracts}
        propertyId={propertyId}
        onClose={() => setModal(null)}
        onSave={async (data) => {
          try {
            const isEdit = modal !== "add" && !modal?._prefillDate;
            if (isEdit) {
              await updateTaskMut({
                path: `/tasks/${modal.id}`,
                body: { ...modal, ...data },
              }).unwrap();
              toast.success("Task updated!");
            } else {
              await addTaskMut({
                path: "/tasks",
                body: { ...data, propertyId },
              }).unwrap();
              toast.success("Task added!");
            }
            setModal(null);
          } catch {
            toast.error("Failed to save task");
          }
        }}
      />
      <CompleteModal
        open={!!completeTarget}
        task={completeTarget}
        onClose={() => setCompleteTarget(null)}
        onConfirm={handleConfirmComplete}
      />
      <TaskExpenseModal
        open={!!expenseTarget}
        task={expenseTarget}
        homeWallet={homeWallet}
        vehicleWallet={vehicleWallet}
        onClose={() => setExpenseTarget(null)}
        onSave={(expense) => handleAddExpense({ task: expenseTarget, expense })}
      />
      <TaskDetailModal
        task={detailTask}
        open={!!detailTask}
        allCats={categories}
        companies={companies}
        contracts={contracts}
        onClose={() => setDetailTask(null)}
        onEdit={() => { setModal(detailTask); setDetailTask(null); }}
        onStatusChange={(s) => { handleStatusChange(detailTask, s); setDetailTask(null); }}
        onComplete={() => { setCompleteTarget(detailTask); setDetailTask(null); }}
        onAddExpense={() => { setExpenseTarget(detailTask); setDetailTask(null); }}
        onDelete={() => { setDelTarget(detailTask); setDetailTask(null); }}
      />
      <ConfirmDialog
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={async () => {
          try {
            await deleteTaskMut({ path: `/tasks/${delTarget.id}` }).unwrap();
            toast.success("Task deleted");
            setDelTarget(null);
          } catch {
            toast.error("Failed to delete task");
          }
        }}
        title="Delete Task"
        message={`Delete "${delTarget?.title}"? This cannot be undone.`}
      />
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TaskCard — dark navy header, priority accent bar, category avatar
// ─────────────────────────────────────────────────────────────────────────────
function TaskCard({
  task,
  allCats,
  companies,
  contracts,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  onComplete,
  onAddExpense,
}) {
  const catCfg = getCatCfg(task.category, allCats);
  const CatIcon = catCfg.Icon;
  const prioHex = PRIORITY_CFG[task.priority]?.hex ?? "#64748b";
  const sBadge = STATUS_CFG[task.status] ?? STATUS_CFG.scheduled;
  const nextSts = NEXT_STATUSES[task.status] ?? [];
  const company = companies?.find((c) => c.id === task.companyId);
  const contract = contracts?.find((c) => c.id === task.contractId);
  const daysLeft = daysUntil(task.scheduledDate);

  return (
    <div
      className="group rounded-3xl overflow-hidden bg-white flex flex-col"
      style={{
        boxShadow: "0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(11,29,58,0.10)",
      }}
    >
      {/* ── HEADER (click to view detail) ── */}
      <div
        onClick={onView}
        className="relative px-5 pt-4 pb-5 overflow-hidden cursor-pointer"
        style={{
          background:
            "linear-gradient(150deg, #0a172e 0%, #0c1f3f 55%, #0e2550 100%)",
        }}
      >
        {/* Priority accent bar (top, 3px) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: prioHex,
            zIndex: 2,
          }}
        />
        {/* Decorative rings */}
        <div
          style={{
            position: "absolute",
            top: -36,
            right: -36,
            width: 130,
            height: 130,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.05)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -18,
            right: -18,
            width: 80,
            height: 80,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.08)",
            pointerEvents: "none",
          }}
        />
        {/* Ghost watermark */}
        <div
          style={{
            position: "absolute",
            right: 6,
            bottom: -6,
            width: 72,
            height: 72,
            opacity: 0.07,
            userSelect: "none",
            pointerEvents: "none",
            color: catCfg.hex,
          }}
        >
          <CatIcon style={{ width: "100%", height: "100%" }} strokeWidth={1} />
        </div>

        {/* Status badge */}
        <div
          className="absolute top-5 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
          style={{
            background: sBadge.bg,
            color: sBadge.color,
            border: sBadge.border,
            zIndex: 10,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: STATUS_CFG[task.status]?.hex ?? "#64748b" }}
          />
          {sBadge.label}
        </div>

        {/* Avatar + title */}
        <div
          className="relative flex items-center gap-3.5 mt-1"
          style={{ zIndex: 5 }}
        >
          {/* Category avatar */}
          <div
            className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center"
            style={{
              background: `${catCfg.hex}25`,
              border: "2px solid rgba(255,255,255,0.12)",
              boxShadow: `0 4px 20px ${catCfg.hex}35`,
              color: catCfg.hex,
            }}
          >
            <CatIcon className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1 pr-16">
            <p className="text-[14px] font-black text-white leading-snug line-clamp-2">
              {task.title}
            </p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {/* Category label */}
              <span
                className="text-[10px] font-semibold flex items-center gap-1"
                style={{ color: catCfg.hex }}
              >
                <CatIcon className="w-3 h-3" strokeWidth={2} />
                {task.category}
              </span>
              {/* Priority badge */}
              <span
                className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                style={{
                  background: `${prioHex}30`,
                  color: prioHex,
                  border: `1px solid ${prioHex}40`,
                }}
              >
                {PRIORITY_CFG[task.priority]?.label ?? task.priority}
              </span>
            </div>
          </div>
        </div>

        {/* Edit / Delete (hover) */}
        <div
          className="absolute bottom-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          style={{ zIndex: 10 }}
        >
          <button
            onClick={onEdit}
            className="w-7 h-7 rounded-xl flex items-center justify-center border transition-all"
            style={{
              color: "rgba(255,255,255,0.55)",
              borderColor: "rgba(255,255,255,0.12)",
              background: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.12)";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "rgba(255,255,255,0.55)";
            }}
          >
            <RiEditLine className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="w-7 h-7 rounded-xl flex items-center justify-center border transition-all"
            style={{
              color: "rgba(255,255,255,0.55)",
              borderColor: "rgba(255,255,255,0.12)",
              background: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239,68,68,0.25)";
              e.currentTarget.style.color = "#fca5a5";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "rgba(255,255,255,0.55)";
            }}
          >
            <RiDeleteBinLine className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="flex-1 flex flex-col px-5 pt-4 pb-4 gap-2.5">
        {/* Floor › Area › Asset */}
        {(task.floor || task.areaName || task.assetName) && (
          <p className="text-[12px] text-slate-500 flex items-center gap-1 truncate">
            {task.floor && <span className="text-slate-400">{task.floor}</span>}
            {task.floor && task.areaName && (
              <RiArrowRightSLine className="w-3 h-3 text-slate-300 shrink-0" />
            )}
            {task.areaName && <span>{task.areaName}</span>}
            {task.areaName && task.assetName && (
              <RiArrowRightSLine className="w-3 h-3 text-slate-300 shrink-0" />
            )}
            {task.assetName && (
              <span className="font-medium text-slate-600 truncate">
                {task.assetName}
              </span>
            )}
          </p>
        )}

        {/* Company */}
        {(company || task.companyName) && (
          <div className="flex items-center gap-2 text-[12px] text-slate-600">
            <RiBuilding2Line className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            {company ? (
              <Link
                to={`/companies/${company.id}`}
                className="font-medium truncate hover:text-navy-700 transition-colors"
              >
                {company.name}
              </Link>
            ) : (
              <span className="font-medium truncate">{task.companyName}</span>
            )}
          </div>
        )}

        {/* Contract */}
        {contract && (
          <div className="flex items-center gap-2 text-[12px] text-slate-600">
            <RiFileTextLine className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <Link
              to={`/contracts/${contract.id}`}
              className="font-medium truncate hover:text-navy-700 transition-colors"
            >
              {contract.title}
            </Link>
          </div>
        )}

        {/* Date + days chip */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-[12px]">
            <RiCalendar2Line className="w-3.5 h-3.5 text-slate-300" />
            <span
              className={cn(
                "font-semibold",
                task.status === "overdue" ? "text-red-600" : "text-slate-600",
              )}
            >
              {task.status === "completed"
                ? fmtDate(task.completedDate)
                : fmtDate(task.scheduledDate)}
            </span>
          </div>
          {task.status === "scheduled" &&
            daysLeft !== null &&
            daysLeft <= 7 &&
            daysLeft >= 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                {daysLeft === 0 ? "Today" : `${daysLeft}d away`}
              </span>
            )}
          {task.status === "overdue" && daysLeft !== null && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
              {Math.abs(daysLeft)}d overdue
            </span>
          )}
          {task.recurrence && task.recurrence !== "one-time" && (
            <span className="text-[10px] text-slate-400">
              {task.recurrence}
            </span>
          )}
        </div>

        {/* Completion row */}
        {task.status === "completed" && (
          <div className="flex items-center gap-1.5 text-[12px] text-green-600 font-semibold">
            <RiCheckboxCircleLine className="w-4 h-4 shrink-0" />
            Completed {fmtDate(task.completedDate)}
          </div>
        )}

        {/* Expenses summary */}
        {(task.expenses ?? []).length > 0 &&
          (() => {
            const total = (task.expenses ?? []).reduce(
              (s, e) => s + (e.amount ?? 0),
              0,
            );
            return (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-100 self-start">
                <RiWalletLine className="w-3 h-3 text-amber-600 shrink-0" />
                <span className="text-[11px] font-bold text-amber-700">
                  AED {total.toLocaleString()} spent ·{" "}
                  {(task.expenses ?? []).length} expense
                  {(task.expenses ?? []).length !== 1 ? "s" : ""}
                </span>
              </div>
            );
          })()}

        <div className="flex-1" />

        {/* ── ACTION STRIP ── */}
        <div className="border-t border-slate-100 pt-3 flex items-center gap-1.5 flex-wrap">
          {/* Quick status transitions */}
          {nextSts
            .filter((s) => s !== "completed")
            .map((s) => {
              const sc = STATUS_CFG[s];
              return (
                <button
                  key={s}
                  onClick={() => onStatusChange(s)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all"
                  style={{
                    background: sc.bg,
                    color: sc.color,
                    border: sc.border,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "0.8";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                >
                  {s === "in-progress" && <RiPlayLine className="w-3 h-3" />}
                  {s === "on-hold" && <RiPauseCircleLine className="w-3 h-3" />}
                  {s === "scheduled" && <RiCalendar2Line className="w-3 h-3" />}
                  {s === "cancelled" && (
                    <RiCloseCircleLine className="w-3 h-3" />
                  )}
                  {sc.label}
                </button>
              );
            })}

          {/* Add Expense button — always visible */}
          <button
            onClick={onAddExpense}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all"
            style={{ background: "rgba(217,119,6,0.09)", color: "#b45309" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(217,119,6,0.18)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(217,119,6,0.09)";
            }}
          >
            <RiAddCircleLine className="w-3 h-3" />
            Expense
          </button>

          {/* Complete button */}
          {task.status !== "completed" && task.status !== "cancelled" && (
            <button
              onClick={onComplete}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all"
              style={{ background: "rgba(22,163,74,0.10)", color: "#16a34a" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(22,163,74,0.18)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(22,163,74,0.10)";
              }}
            >
              <RiCheckLine className="w-3.5 h-3.5" />
              Complete
            </button>
          )}

          {/* Reschedule / Reopen */}
          {task.status === "completed" && (
            <button
              onClick={() => onStatusChange("scheduled")}
              className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-slate-400 border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <RiRefreshLine className="w-3 h-3" />
              Reschedule
            </button>
          )}
          {task.status === "cancelled" && (
            <button
              onClick={() => onStatusChange("scheduled")}
              className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-slate-400 border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <RiRefreshLine className="w-3 h-3" />
              Reopen
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
function TaskRow({
  task,
  allCats,
  last,
  contracts,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  onComplete,
  onAddExpense,
}) {
  const catCfg = getCatCfg(task.category, allCats);
  const CatIcon = catCfg.Icon;
  const prioHex = PRIORITY_CFG[task.priority]?.hex ?? "#64748b";
  const sBadge = STATUS_CFG[task.status] ?? STATUS_CFG.scheduled;
  const contract = contracts?.find((c) => c.id === task.contractId);

  return (
    <div
      className={cn(
        "flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors group relative",
        !last && "border-b border-slate-50",
        task.status === "overdue" && "bg-red-50/30",
      )}
    >
      {/* Priority bar (left edge) */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
        style={{ background: prioHex }}
      />

      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ml-2"
        style={{ background: `${catCfg.hex}15`, color: catCfg.hex }}
      >
        <CatIcon className="w-4.5 h-4.5" strokeWidth={1.5} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onView}
            className="text-[13px] font-semibold text-slate-800 truncate hover:text-navy-700 transition-colors text-left"
          >
            {task.title}
          </button>
          <span
            className="hidden sm:inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0"
            style={{ background: `${catCfg.hex}18`, color: catCfg.hex }}
          >
            <CatIcon className="w-2.5 h-2.5" strokeWidth={2} /> {task.category}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 truncate mt-0.5">
          {[task.floor, task.areaName, task.assetName]
            .filter(Boolean)
            .join(" › ") || "—"}{" "}
          · {task.companyName || "Unassigned"}
          {contract ? (
            <Link
              to={`/contracts/${contract.id}`}
              className="text-slate-500 hover:text-navy-700"
            >
              {" "}
              · {contract.title}
            </Link>
          ) : null}
        </p>
      </div>

      <div className="hidden md:flex flex-col items-end gap-1 shrink-0">
        <span
          className="px-2 py-0.5 rounded-full text-[11px] font-bold"
          style={{
            background: sBadge.bg,
            color: sBadge.color,
            border: sBadge.border,
          }}
        >
          {sBadge.label}
        </span>
        <span className="text-[10px] text-slate-400">
          {fmtDate(task.scheduledDate)}
        </span>
      </div>

      {/* Expense summary */}
      {(task.expenses ?? []).length > 0 &&
        (() => {
          const total = (task.expenses ?? []).reduce(
            (s, e) => s + (e.amount ?? 0),
            0,
          );
          return (
            <span className="hidden lg:flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg shrink-0">
              <RiWalletLine className="w-3 h-3" /> AED {total.toLocaleString()}
            </span>
          );
        })()}

      {/* Actions: text buttons reveal on hover (desktop only); icon buttons always visible on mobile */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onAddExpense}
          className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-amber-600 hover:bg-amber-50 transition-all opacity-0 group-hover:opacity-100"
        >
          <RiAddCircleLine className="w-3.5 h-3.5" />
          Expense
        </button>
        {task.status !== "completed" && task.status !== "cancelled" && (
          <button
            onClick={onComplete}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-green-600 hover:bg-green-50 transition-all opacity-0 group-hover:opacity-100"
          >
            <RiCheckLine className="w-3.5 h-3.5" />
            Done
          </button>
        )}
        <button
          onClick={onEdit}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all sm:opacity-0 sm:group-hover:opacity-100"
        >
          <RiEditLine className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all sm:opacity-0 sm:group-hover:opacity-100"
        >
          <RiDeleteBinLine className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CompleteModal
// ─────────────────────────────────────────────────────────────────────────────
function CompleteModal({ open, task, onClose, onConfirm }) {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  useEffect(() => {
    if (!open || !task) return;
    reset({
      completedDate: new Date().toISOString().split("T")[0],
      completionNotes: "",
    });
  }, [open, task]);

  const onSubmit = async (d) => {
    await onConfirm({
      task,
      completedDate: d.completedDate,
      completionNotes: d.completionNotes || "",
    });
  };

  if (!task) return null;

  const catCfg = getCatCfg(task.category);
  const CatIcon = catCfg.Icon;
  const daysLate = task.scheduledDate
    ? Math.abs(daysUntil(task.scheduledDate) ?? 0)
    : 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Complete Task"
      subtitle="Confirm when the work was done"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Task summary */}
        <div className="rounded-2xl overflow-hidden">
          <div
            className="px-4 py-3 flex items-center gap-3"
            style={{ background: "linear-gradient(135deg, #0a172e, #0e2550)" }}
          >
            <div
              className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
              style={{
                background: `${catCfg.hex}28`,
                border: "2px solid rgba(255,255,255,0.12)",
                color: catCfg.hex,
              }}
            >
              <CatIcon className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-white truncate">
                {task.title}
              </p>
              <p
                className="text-[11px] mt-0.5"
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                {task.companyName || task.areaName || task.category}
                {task.status === "overdue" && daysLate > 0 && (
                  <span className="ml-2 text-red-300">
                    · {daysLate}d overdue
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        <Field label="Completion Date" required>
          <Input
            {...register("completedDate", { required: true })}
            type="date"
          />
        </Field>

        <Field
          label="Completion Notes"
          hint="What was done, parts used, observations, follow-up needed"
        >
          <Textarea
            {...register("completionNotes")}
            rows={3}
            placeholder="e.g. Replaced filters, topped up refrigerant, next service in 6 months…"
          />
        </Field>

        {/* Tip: add expense separately */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-100">
          <RiWalletLine className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[12px] text-amber-700">
            <strong>Was there a cost?</strong> After marking complete, use the{" "}
            <strong>Expense</strong> button on the task card to record any parts
            or labour costs — only added costs are deducted from your Home
            Wallet.
          </p>
        </div>

        <div className="flex gap-3 pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 h-10 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 h-10 rounded-xl text-[13px] font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #16a34a, #15803d)" }}
          >
            {isSubmitting ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <RiCheckboxCircleLine className="w-4 h-4" />
            )}
            {isSubmitting ? "Saving…" : "Mark Complete"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TaskDetailModal — read-only detail view with quick actions
// ─────────────────────────────────────────────────────────────────────────────
function TaskDetailModal({
  open, task, allCats, companies, contracts,
  onClose, onEdit, onStatusChange, onComplete, onAddExpense, onDelete,
}) {
  if (!task) return null;
  const catCfg = getCatCfg(task.category, allCats);
  const CatIcon = catCfg.Icon;
  const prioHex = PRIORITY_CFG[task.priority]?.hex ?? "#64748b";
  const prioCfg = PRIORITY_CFG[task.priority] ?? { label: task.priority };
  const sBadge  = STATUS_CFG[task.status] ?? STATUS_CFG.scheduled;
  const nextSts = NEXT_STATUSES[task.status] ?? [];
  const company  = companies?.find((c) => c.id === task.companyId);
  const contract = contracts?.find((c) => c.id === task.contractId);
  const totalCost = (task.expenses ?? []).reduce((s, e) => s + (e.amount || 0), 0);
  const location = [task.floor, task.areaName, task.assetName].filter(Boolean);

  return (
    <Modal open={open} onClose={onClose} size="lg" title="" subtitle="">
      {/* ── HEADER ── */}
      <div
        className="relative -mx-6 -mt-6 px-6 pt-5 pb-6 mb-5 overflow-hidden rounded-t-2xl"
        style={{ background: "linear-gradient(150deg, #0a172e 0%, #0c1f3f 55%, #0e2550 100%)" }}
      >
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: prioHex }} />
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center"
            style={{ background: `${catCfg.hex}25`, border: "2px solid rgba(255,255,255,0.12)", color: catCfg.hex }}
          >
            <CatIcon className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[17px] font-black text-white leading-snug">{task.title}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span
                className="text-[10px] font-black px-2.5 py-1 rounded-full"
                style={{ background: sBadge.bg, color: sBadge.color, border: sBadge.border }}
              >
                {sBadge.label}
              </span>
              <span
                className="text-[10px] font-black px-2 py-1 rounded-full"
                style={{ background: `${prioHex}25`, color: prioHex }}
              >
                {prioCfg.label}
              </span>
              <span
                className="text-[10px] font-semibold flex items-center gap-1"
                style={{ color: catCfg.hex }}
              >
                <CatIcon className="w-3 h-3" strokeWidth={2} />
                {task.category}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Location breadcrumb */}
        {location.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <RiBuilding2Line className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {location.map((l, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <RiArrowRightSLine className="w-3.5 h-3.5 text-slate-300" />}
                <span className="text-[12px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">{l}</span>
              </span>
            ))}
          </div>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Scheduled", value: fmtDate(task.scheduledDate) },
            { label: "Recurrence", value: task.recurrence ? task.recurrence.charAt(0).toUpperCase() + task.recurrence.slice(1) : "—" },
            { label: "Company", value: company?.name || task.companyName || "—" },
            ...(task.completedDate ? [{ label: "Completed", value: fmtDate(task.completedDate) }] : []),
            ...(contract ? [{ label: "Contract", value: contract.title || "—" }] : []),
            ...(totalCost > 0 ? [{ label: "Total Cost", value: `AED ${totalCost.toLocaleString("en-AE")}` }] : []),
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
              <p className="text-[13px] font-semibold text-slate-800 truncate">{value}</p>
            </div>
          ))}
        </div>

        {/* Notes */}
        {task.notes && (
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Notes</p>
            <p className="text-[13px] text-slate-700 whitespace-pre-wrap">{task.notes}</p>
          </div>
        )}

        {/* Completion notes */}
        {task.completionNotes && (
          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Completion Notes</p>
            <p className="text-[13px] text-emerald-800 whitespace-pre-wrap">{task.completionNotes}</p>
          </div>
        )}

        {/* Expenses */}
        {(task.expenses ?? []).length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Expenses</p>
            <div className="rounded-xl border border-slate-100 overflow-hidden">
              {task.expenses.map((e, i) => (
                <div
                  key={e.id ?? i}
                  className={cn("flex items-center justify-between px-3 py-2.5 text-[12px]", i > 0 && "border-t border-slate-100")}
                >
                  <span className="text-slate-700 truncate flex-1">{e.description || e.category}</span>
                  <span className="font-bold text-slate-800 ml-3">AED {(e.amount || 0).toLocaleString("en-AE")}</span>
                </div>
              ))}
              <div className="flex justify-between px-3 py-2 bg-slate-50 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total</span>
                <span className="text-[13px] font-black text-slate-800">AED {totalCost.toLocaleString("en-AE")}</span>
              </div>
            </div>
          </div>
        )}

        {/* Quick status change */}
        {nextSts.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Change Status</p>
            <div className="flex flex-wrap gap-2">
              {nextSts.map((s) => {
                const sc = STATUS_CFG[s] ?? STATUS_CFG.scheduled;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onStatusChange(s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all hover:opacity-80"
                    style={{ background: sc.bg, color: sc.color, border: sc.border }}
                  >
                    {sc.label}
                  </button>
                );
              })}
              {task.status !== "completed" && (
                <button
                  type="button"
                  onClick={onComplete}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all"
                >
                  <RiCheckboxCircleLine className="w-3.5 h-3.5" />
                  Mark Complete
                </button>
              )}
            </div>
          </div>
        )}

        {/* Action bar */}
        <div className="flex gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onEdit}
            className="flex-1 h-9 rounded-xl border border-slate-200 text-[12px] font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-all"
          >
            <RiEditLine className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            type="button"
            onClick={onAddExpense}
            className="flex-1 h-9 rounded-xl border border-slate-200 text-[12px] font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-all"
          >
            <RiWalletLine className="w-3.5 h-3.5" />
            Add Expense
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="h-9 w-9 rounded-xl border border-red-100 text-red-400 hover:bg-red-50 flex items-center justify-center transition-all"
          >
            <RiDeleteBinLine className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TaskFormModal — Add / Edit
// ─────────────────────────────────────────────────────────────────────────────
const SEL_CLS =
  "w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] text-slate-800 focus:outline-none focus:border-navy-400 bg-white";

function TaskFormModal({
  open,
  onClose,
  item,
  prefillDate,
  categories,
  companies,
  areas,
  assets,
  floors,
  contracts,
  propertyId,
  onSave,
}) {
  const { register, handleSubmit, reset, watch, setValue, formState: { isSubmitting } } = useForm();
  const [addFloorMut] = usePostMutation();
  const [addAreaMut] = usePostMutation();
  const [addAssetMut] = usePostMutation();
  const [addCatMut] = usePostMutation();

  // Mode: 'schedule' = future task, 'log' = already completed
  const [mode, setMode] = useState("schedule");

  // Location state
  const [selFloor, setSelFloor] = useState("");
  const [selAreaId, setSelAreaId] = useState("");
  const [selAssetId, setSelAssetId] = useState("");

  // Inline floor create
  const [showAddFloor, setShowAddFloor] = useState(false);
  const [newFloorName, setNewFloorName] = useState("");
  const [addingFloor, setAddingFloor] = useState(false);

  // Inline area create
  const [showAddArea, setShowAddArea] = useState(false);
  const [newAreaName, setNewAreaName] = useState("");
  const [addingArea, setAddingArea] = useState(false);

  // Inline asset create
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [newAssetName, setNewAssetName] = useState("");
  const [addingAsset, setAddingAsset] = useState(false);

  // Inline category create
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);

  // Floors are objects {id, name, level, ...}; derive name list for matching
  const floorNames = floors.map((f) => f.name ?? f);

  // Filter areas by selected floor; assets by selected area
  const floorAreas = areas.filter(
    (a) => !selFloor || a.floorName === selFloor || a.floor === selFloor,
  );
  const areaAssets = assets.filter(
    (a) => !selAreaId || a.areaId === selAreaId,
  );

  useEffect(() => {
    if (!open) return;

    setMode(item?.status === "completed" ? "log" : "schedule");
    setShowAddFloor(false); setNewFloorName("");
    setShowAddArea(false);  setNewAreaName("");
    setShowAddAsset(false); setNewAssetName("");
    setShowAddCat(false);   setNewCatName("");

    if (item) {
      const area = areas.find((a) => a.id === item.areaId);
      const floorVal = item.floor || area?.floorName || area?.floor || "";
      setSelFloor(floorVal);

      if (item.areaId && areas.find((a) => a.id === item.areaId)) {
        setSelAreaId(item.areaId);
      } else {
        setSelAreaId("");
      }

      if (item.assetId && assets.find((a) => a.id === item.assetId)) {
        setSelAssetId(item.assetId);
      } else {
        setSelAssetId("");
      }
    } else {
      setSelFloor("");
      setSelAreaId("");
      setSelAssetId("");
    }

    reset(
      item
        ? {
            title: item.title,
            category: item.category ?? categories[0] ?? "Maintenance",
            priority: item.priority ?? "medium",
            companyId: item.companyId ?? "",
            scheduledDate: item.scheduledDate ?? "",
            completedDate:
              item.completedDate ?? new Date().toISOString().split("T")[0],
            recurrence: item.recurrence ?? "one-time",
            notes: item.notes ?? "",
            completionNotes: item.completionNotes ?? "",
          }
        : {
            recurrence: "one-time",
            priority: "medium",
            category: categories[0] ?? "Maintenance",
            companyId: "",
            scheduledDate: prefillDate ?? "",
            completedDate: new Date().toISOString().split("T")[0],
          },
    );
  }, [open, item]);

  const selCategory = watch("category");

  const handleCreateFloor = async () => {
    const name = newFloorName.trim();
    if (!name || addingFloor) return;
    setAddingFloor(true);
    try {
      await addFloorMut({ path: "/floors", body: { propertyId, name, level: 0 } }).unwrap();
      setSelFloor(name);
      setShowAddFloor(false);
      setNewFloorName("");
      setSelAreaId("");
    } catch (e) {
      toast.error(e?.data?.error ?? "Failed to create floor");
    } finally {
      setAddingFloor(false);
    }
  };

  const handleCreateArea = async () => {
    const name = newAreaName.trim();
    if (!name || addingArea) return;
    setAddingArea(true);
    try {
      const floorObj = floors.find((f) => (f.name ?? f) === selFloor);
      const created = await addAreaMut({
        path: "/areas",
        body: { propertyId, name, floorId: floorObj?.id ?? null, floorName: selFloor || "" },
      }).unwrap();
      setSelAreaId(created.id ?? created._id ?? "");
      setShowAddArea(false);
      setNewAreaName("");
    } catch (e) {
      toast.error(e?.data?.error ?? "Failed to create area");
    } finally {
      setAddingArea(false);
    }
  };

  const handleCreateAsset = async () => {
    const name = newAssetName.trim();
    if (!name || addingAsset) return;
    setAddingAsset(true);
    try {
      const created = await addAssetMut({
        path: "/assets",
        body: { propertyId, name, areaId: selAreaId || null },
      }).unwrap();
      setSelAssetId(created.id ?? created._id ?? "");
      setShowAddAsset(false);
      setNewAssetName("");
    } catch (e) {
      toast.error(e?.data?.error ?? "Failed to create asset");
    } finally {
      setAddingAsset(false);
    }
  };

  const handleCreateCat = async () => {
    const name = newCatName.trim();
    if (!name || addingCat) return;
    setAddingCat(true);
    try {
      await addCatMut({ path: "/task-categories", body: { name, propertyId } }).unwrap();
      setValue("category", name);
      setShowAddCat(false);
      setNewCatName("");
    } catch (e) {
      toast.error(e?.data?.error ?? "Failed to create category");
    } finally {
      setAddingCat(false);
    }
  };

  const onSubmit = async (d) => {
    const comp = companies.find((c) => c.id === d.companyId);
    const area = areas.find((a) => a.id === selAreaId);
    const areaId = area?.id ?? null;
    const areaName = area?.name ?? "";
    const asset = assets.find((a) => a.id === selAssetId);
    const assetId = asset?.id ?? null;
    const assetName = asset?.name ?? "";
    const isLog = mode === "log";

    await onSave({
      ...d,
      type: d.category,
      contractId: item?.contractId ?? null,
      companyName: comp?.name || item?.companyName || "",
      floor: selFloor,
      areaId,
      areaName,
      assetId,
      assetName,
      status: isLog ? "completed" : (item?.status ?? "scheduled"),
      scheduledDate: isLog ? d.completedDate || "" : d.scheduledDate,
      completedDate: isLog ? d.completedDate : (item?.completedDate ?? null),
      completionNotes: isLog
        ? d.completionNotes || ""
        : (item?.completionNotes ?? ""),
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={item ? "Edit Task" : "Add Task"}
      subtitle={
        item
          ? `Editing: ${item.title}`
          : "Schedule future work or log completed tasks"
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* ── MODE TOGGLE ── */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setMode("schedule")}
            className={cn(
              "flex-1 py-2 px-3 rounded-lg text-[12px] font-bold transition-all flex items-center justify-center gap-1.5",
              mode === "schedule"
                ? "bg-white shadow-sm text-navy-800"
                : "text-slate-400 hover:text-slate-600",
            )}
          >
            <RiCalendar2Line className="w-3.5 h-3.5" />
            Schedule Task
          </button>
          <button
            type="button"
            onClick={() => setMode("log")}
            className={cn(
              "flex-1 py-2 px-3 rounded-lg text-[12px] font-bold transition-all flex items-center justify-center gap-1.5",
              mode === "log"
                ? "bg-white shadow-sm text-emerald-700"
                : "text-slate-400 hover:text-slate-600",
            )}
          >
            <RiCheckboxCircleLine className="w-3.5 h-3.5" />
            Log Completed
          </button>
        </div>

        {/* ── WHAT ── */}
        <div className="space-y-4">
          <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">
            What
          </p>

          <Field label="Task / Service Description" required>
            <Input
              {...register("title", { required: "Required" })}
              placeholder="e.g. AC full service, Fix kitchen tap, Annual pool inspection…"
            />
          </Field>

          {/* Category chip-picker (merged with service type) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[12px] font-semibold text-slate-700">
                Category <span className="text-red-500">*</span>
              </label>
              {!showAddCat && (
                <button
                  type="button"
                  onClick={() => setShowAddCat(true)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-navy-600 hover:text-navy-800 transition-colors"
                >
                  <RiAddCircleLine className="w-3.5 h-3.5" />
                  New category
                </button>
              )}
            </div>
            <input type="hidden" {...register("category", { required: true })} />
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => {
                const cfg = getCatCfg(c, categories);
                const CIcon = cfg.Icon;
                const active = selCategory === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setValue("category", c)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold border transition-all"
                    style={
                      active
                        ? { background: cfg.hex, color: "#fff", borderColor: cfg.hex }
                        : { background: `${cfg.hex}10`, color: cfg.hex, borderColor: `${cfg.hex}30` }
                    }
                  >
                    <CIcon className="w-3.5 h-3.5" strokeWidth={1.75} />
                    {c}
                  </button>
                );
              })}
            </div>
            {showAddCat && (
              <div className="flex items-center gap-2 mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  autoFocus
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreateCat(); } if (e.key === "Escape") { setShowAddCat(false); setNewCatName(""); } }}
                  placeholder="New category name…"
                  className="flex-1 h-8 px-3 rounded-lg border border-slate-200 text-[12px] focus:outline-none focus:border-navy-400 bg-white"
                />
                <button
                  type="button"
                  onClick={handleCreateCat}
                  disabled={addingCat || !newCatName.trim()}
                  className="h-8 px-3 rounded-lg bg-navy-900 text-white text-[11px] font-bold disabled:opacity-50 hover:bg-navy-800 transition-colors"
                >
                  {addingCat ? "…" : "Add"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddCat(false); setNewCatName(""); }}
                  className="h-8 px-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 text-[11px] transition-colors"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          <Field label="Priority">
            <select {...register("priority")} className={SEL_CLS}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_CFG[p].label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* ── LOCATION ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">
              Location
            </p>
            <span className="text-[10px] text-slate-400">— optional</span>
          </div>

          {/* Floor / Level */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">
              Floor / Level
            </label>
            <div className="flex gap-2">
              <select
                value={selFloor}
                onChange={(e) => {
                  setSelFloor(e.target.value);
                  setSelAreaId("");
                  setSelAssetId("");
                  setShowAddArea(false);
                }}
                className={cn(SEL_CLS, "flex-1")}
              >
                <option value="">— Not specified —</option>
                {floors.map((f) => (
                  <option key={f.id ?? f} value={f.name ?? f}>
                    {f.name ?? f}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => { setShowAddFloor((v) => !v); setNewFloorName(""); }}
                title="Add new floor"
                className="h-10 w-10 shrink-0 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-navy-700 hover:border-navy-300 transition-colors"
              >
                <RiAddLine className="w-4 h-4" />
              </button>
            </div>
            {showAddFloor && (
              <div className="flex items-center gap-2 mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  autoFocus
                  value={newFloorName}
                  onChange={(e) => setNewFloorName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreateFloor(); } if (e.key === "Escape") setShowAddFloor(false); }}
                  placeholder="Floor name, e.g. Ground Floor, Roof Level…"
                  className="flex-1 h-8 px-3 rounded-lg border border-slate-200 text-[12px] focus:outline-none focus:border-navy-400 bg-white"
                />
                <button
                  type="button"
                  onClick={handleCreateFloor}
                  disabled={addingFloor || !newFloorName.trim()}
                  className="h-8 px-3 rounded-lg bg-navy-900 text-white text-[11px] font-bold disabled:opacity-50 hover:bg-navy-800 transition-colors"
                >
                  {addingFloor ? "…" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddFloor(false)}
                  className="h-8 px-2 rounded-lg border border-slate-200 text-slate-400 text-[11px] hover:text-slate-600 transition-colors"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Room / Area */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">
              Room / Area
            </label>
            <div className="flex gap-2">
              <select
                value={selAreaId}
                onChange={(e) => {
                  setSelAreaId(e.target.value);
                  setSelAssetId("");
                  setShowAddArea(false);
                }}
                className={cn(SEL_CLS, "flex-1")}
              >
                <option value="">— Not specified —</option>
                {floorAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => { setShowAddArea((v) => !v); setNewAreaName(""); }}
                title="Add new area"
                className="h-10 w-10 shrink-0 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-navy-700 hover:border-navy-300 transition-colors"
              >
                <RiAddLine className="w-4 h-4" />
              </button>
            </div>
            {showAddArea && (
              <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                {/* Floor context — required before creating an area */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Floor <span className="text-red-400">*</span>
                  </label>
                  {selFloor ? (
                    <div className="flex items-center gap-2 h-8 px-3 rounded-lg bg-navy-50 border border-navy-200">
                      <RiBuilding2Line className="w-3.5 h-3.5 text-navy-500 shrink-0" />
                      <span className="text-[12px] font-semibold text-navy-700">{selFloor}</span>
                    </div>
                  ) : (
                    <select
                      value={selFloor}
                      onChange={(e) => {
                        setSelFloor(e.target.value);
                        setSelAreaId("");
                        setSelAssetId("");
                      }}
                      className="w-full h-8 px-3 rounded-lg border border-slate-200 text-[12px] text-slate-800 focus:outline-none focus:border-navy-400 bg-white"
                    >
                      <option value="">— Select floor first —</option>
                      {floors.map((f) => (
                        <option key={f.id ?? f} value={f.name ?? f}>
                          {f.name ?? f}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {/* Room name */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Room / Area Name <span className="text-red-400">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus={!!selFloor}
                      value={newAreaName}
                      onChange={(e) => setNewAreaName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); handleCreateArea(); }
                        if (e.key === "Escape") setShowAddArea(false);
                      }}
                      placeholder="e.g. Master Bedroom, Kitchen, Terrace…"
                      className="flex-1 h-8 px-3 rounded-lg border border-slate-200 text-[12px] focus:outline-none focus:border-navy-400 bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleCreateArea}
                      disabled={addingArea || !newAreaName.trim() || !selFloor}
                      className="h-8 px-3 rounded-lg bg-navy-900 text-white text-[11px] font-bold disabled:opacity-40 hover:bg-navy-800 transition-colors"
                    >
                      {addingArea ? "…" : "Create"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddArea(false)}
                      className="h-8 px-2 rounded-lg border border-slate-200 text-slate-400 text-[11px] hover:text-slate-600 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Asset / Equipment */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">
              Asset / Equipment
            </label>
            <div className="flex gap-2">
              <select
                value={selAssetId}
                onChange={(e) => {
                  setSelAssetId(e.target.value);
                  setShowAddAsset(false);
                }}
                className={cn(SEL_CLS, "flex-1")}
              >
                <option value="">— No specific asset —</option>
                {areaAssets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => { setShowAddAsset((v) => !v); setNewAssetName(""); }}
                title="Add new asset"
                className="h-10 w-10 shrink-0 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-navy-700 hover:border-navy-300 transition-colors"
              >
                <RiAddLine className="w-4 h-4" />
              </button>
            </div>
            {showAddAsset && (
              <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                {/* Area context — shows where the asset will be assigned */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Assigned to Area
                  </label>
                  {selAreaId ? (
                    <div className="flex items-center gap-2 h-8 px-3 rounded-lg bg-emerald-50 border border-emerald-200">
                      <RiCheckboxCircleLine className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="text-[12px] font-semibold text-emerald-700">
                        {areas.find((a) => a.id === selAreaId)?.name ?? "Selected area"}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 h-8 px-3 rounded-lg bg-amber-50 border border-amber-200">
                      <RiAlertLine className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="text-[12px] text-amber-700">
                        No area selected — asset will be unassigned to area
                      </span>
                    </div>
                  )}
                </div>
                {/* Asset name */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Asset Name <span className="text-red-400">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={newAssetName}
                      onChange={(e) => setNewAssetName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); handleCreateAsset(); }
                        if (e.key === "Escape") setShowAddAsset(false);
                      }}
                      placeholder="e.g. Split AC unit, Water pump, Smart TV…"
                      className="flex-1 h-8 px-3 rounded-lg border border-slate-200 text-[12px] focus:outline-none focus:border-navy-400 bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleCreateAsset}
                      disabled={addingAsset || !newAssetName.trim()}
                      className="h-8 px-3 rounded-lg bg-navy-900 text-white text-[11px] font-bold disabled:opacity-40 hover:bg-navy-800 transition-colors"
                    >
                      {addingAsset ? "…" : "Create"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddAsset(false)}
                      className="h-8 px-2 rounded-lg border border-slate-200 text-slate-400 text-[11px] hover:text-slate-600 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── WHEN ── */}
        <div className="space-y-3">
          <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">
            {mode === "schedule" ? "When" : "Completion"}
          </p>
          {mode === "schedule" ? (
            <FormGrid>
              <Field label="Scheduled Date" required>
                <Input
                  {...register("scheduledDate", { required: "Required" })}
                  type="date"
                />
              </Field>
              <Field label="Recurrence">
                <Select
                  {...register("recurrence")}
                  options={RECURRENCES.map((r) => ({
                    value: r,
                    label: r.charAt(0).toUpperCase() + r.slice(1),
                  }))}
                />
              </Field>
            </FormGrid>
          ) : (
            <FormGrid>
              <Field label="Completion Date" required>
                <Input
                  {...register("completedDate", { required: "Required" })}
                  type="date"
                />
              </Field>
              <Field label="What was done">
                <Textarea
                  {...register("completionNotes")}
                  rows={2}
                  placeholder="Parts used, what was fixed, follow-up needed…"
                />
              </Field>
            </FormGrid>
          )}
        </div>

        {/* ── WHO ── */}
        <Field label="Service Company (optional)">
          <Select
            {...register("companyId")}
            placeholder="— Select company —"
            options={companies.map((c) => ({ value: c.id, label: c.name }))}
          />
        </Field>

        <Field label="Notes">
          <Textarea
            {...register("notes")}
            rows={2}
            placeholder="Access instructions, parts needed, observations…"
          />
        </Field>

        <FormActions
          onCancel={onClose}
          loading={isSubmitting}
          submitLabel={
            item ? "Update Task" : mode === "log" ? "Log Task" : "Add Task"
          }
        />
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TaskExpenseModal — add an expense/cost to a specific task
// ─────────────────────────────────────────────────────────────────────────────
const EXPENSE_CATS = [
  "Labour",
  "Parts / Materials",
  "Replacement Item",
  "Inspection Fee",
  "Other",
];

function TaskExpenseModal({
  open,
  task,
  homeWallet,
  vehicleWallet,
  onClose,
  onSave,
}) {
  const { register, handleSubmit, reset, watch, formState: { isSubmitting } } = useForm();
  const [walletType, setWalletType] = useState("home");

  useEffect(() => {
    if (!open || !task) return;
    setWalletType("home");
    reset({
      description: "",
      category: "Labour",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    });
  }, [open, task]);

  const amount = parseFloat(watch("amount")) || 0;
  const balance =
    walletType === "vehicle"
      ? (vehicleWallet?.balance ?? 0)
      : (homeWallet?.balance ?? 0);
  const after = balance - amount;

  const onSubmit = async (d) => {
    await onSave({
      description: d.description || d.category,
      category: d.category,
      amount: parseFloat(d.amount) || 0,
      date: d.date,
      notes: d.notes || "",
      walletType,
    });
  };

  if (!task) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Expense"
      subtitle={`Cost for: ${task.title}`}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Task context */}
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
          {(() => {
            const TI = getCatCfg(task.category).Icon;
            return (
              <TI
                className="w-5 h-5 text-slate-400 shrink-0"
                strokeWidth={1.5}
              />
            );
          })()}
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-slate-800 truncate">
              {task.title}
            </p>
            <p className="text-[11px] text-slate-400">
              {task.category} · {task.areaName || task.companyName || "—"}
            </p>
          </div>
        </div>

        {/* Wallet selector */}
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Deduct from Wallet
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                k: "home",
                label: "Home Wallet",
                bal: homeWallet?.balance ?? 0,
                color: "#16a34a",
                bg: "#f0fdf4",
                border: "#bbf7d0",
              },
              {
                k: "vehicle",
                label: "Vehicle Wallet",
                bal: vehicleWallet?.balance ?? 0,
                color: "#0b1d3a",
                bg: "#eef2fb",
                border: "#c7d2f0",
              },
            ].map(({ k, label, bal, color, bg, border }) => (
              <button
                key={k}
                type="button"
                onClick={() => setWalletType(k)}
                className="flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl border-2 text-left transition-all"
                style={
                  walletType === k
                    ? { background: bg, borderColor: color }
                    : { background: "#f8fafc", borderColor: "#e2e8f0" }
                }
              >
                <span
                  className="text-[11px] font-bold"
                  style={{ color: walletType === k ? color : "#64748b" }}
                >
                  {label}
                </span>
                <span
                  className="text-[13px] font-black"
                  style={{ color: walletType === k ? color : "#1e293b" }}
                >
                  AED{" "}
                  {bal.toLocaleString("en-AE", { maximumFractionDigits: 0 })}
                </span>
              </button>
            ))}
          </div>
        </div>

        <Field label="What was this expense for?" required>
          <Input
            {...register("description", { required: "Required" })}
            placeholder="e.g. AC compressor replacement, Labour charge, Pipe fittings…"
          />
        </Field>

        <FormGrid>
          <Field label="Expense Category">
            <select
              {...register("category")}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 text-[13px] text-slate-800 focus:outline-none focus:border-navy-400 bg-white"
            >
              {EXPENSE_CATS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <Input {...register("date")} type="date" />
          </Field>
        </FormGrid>

        <Field label="Amount (AED)" required>
          <Input
            {...register("amount", { required: "Required", min: 0.01 })}
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
          />
        </Field>

        {amount > 0 && (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex justify-between px-4 py-2 text-[12px] bg-slate-50">
              <span className="text-slate-500">
                {walletType === "vehicle" ? "Vehicle" : "Home"} Wallet balance
              </span>
              <span className="font-bold text-slate-700">
                AED {balance.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between px-4 py-2 text-[12px]">
              <span className="text-red-600">This expense</span>
              <span className="font-bold text-red-600">
                − AED {amount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between px-4 py-2 text-[12px] border-t border-slate-100">
              <span className="font-bold text-slate-700">Balance after</span>
              <span
                className={cn(
                  "font-black text-[13px]",
                  after < 0 ? "text-red-600" : "text-emerald-700",
                )}
              >
                {after < 0
                  ? `− AED ${Math.abs(after).toLocaleString()}`
                  : `AED ${after.toLocaleString()}`}
              </span>
            </div>
          </div>
        )}

        <Field label="Notes (optional)">
          <Textarea
            {...register("notes")}
            rows={2}
            placeholder="Invoice number, supplier, warranty info…"
          />
        </Field>

        <div className="flex gap-3 pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 h-10 rounded-xl border border-slate-200 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 h-10 rounded-xl text-[13px] font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #b45309, #92400e)" }}
          >
            {isSubmitting ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <RiWalletLine className="w-4 h-4" />
            )}
            {isSubmitting
              ? "Saving…"
              : amount > 0
                ? `Add Expense — AED ${amount.toLocaleString()}`
                : "Add Expense"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
