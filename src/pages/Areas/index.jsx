import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useForm, useWatch } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  RiAddLine, RiSearchLine, RiLayoutGridLine, RiListCheck2,
  RiEditLine, RiDeleteBinLine, RiArrowRightLine, RiArrowLeftLine,
  RiHome4Line, RiBox3Line, RiMapPin2Line, RiStackLine,
  RiBuilding2Line, RiCheckLine, RiArrowDownSLine,
} from "react-icons/ri";
import {
  BedDouble, ShowerHead, UtensilsCrossed, Sofa, Utensils,
  TreeDeciduous, Waves, Car, Briefcase, Package, Wrench,
  Wind, Sun, MapPin, Edit2, Trash2, AlertTriangle, Layers,
} from 'lucide-react';
import {
  useGetQuery, usePostMutation, usePutMutation, useDeleteMutation,
} from "../../api/apiSlice";
import { selectCurrentPropertyId, selectCurrentProperty } from "../../store/slices/propertiesSlice";
import Modal         from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import PageLoader    from "../../components/ui/PageLoader";
import { MotionSwipeableRow } from "../../components/ui/SwipeableRow";
import { Field, Input, Select, Textarea, FormGrid, FormActions } from "../../components/ui/FormField";
import Button from "../../components/ui/Button";
import { cn } from "../../utils/cn";

const AREA_TYPES = [
  "Bedroom","Bathroom","Kitchen","Living Room","Dining Room",
  "Office","Storage","Garage","Garden","Pool Area",
  "Utility","Balcony","Roof","Other",
];

const TYPE_META = {
  Bedroom:       { Icon: BedDouble,       grad: "linear-gradient(135deg,#1e3a8a,#312e81)", light: "#eff6ff", text: "#1d4ed8" },
  Bathroom:      { Icon: ShowerHead,      grad: "linear-gradient(135deg,#0e7490,#1d4ed8)", light: "#ecfeff", text: "#0891b2" },
  Kitchen:       { Icon: UtensilsCrossed, grad: "linear-gradient(135deg,#c2410c,#d97706)", light: "#fff7ed", text: "#c2410c" },
  "Living Room": { Icon: Sofa,            grad: "linear-gradient(135deg,#1d4ed8,#0b1d3a)", light: "#eff6ff", text: "#2563eb" },
  "Dining Room": { Icon: Utensils,        grad: "linear-gradient(135deg,#7c3aed,#4f46e5)", light: "#f5f3ff", text: "#7c3aed" },
  Garden:        { Icon: TreeDeciduous,   grad: "linear-gradient(135deg,#15803d,#16a34a)", light: "#f0fdf4", text: "#16a34a" },
  "Pool Area":   { Icon: Waves,           grad: "linear-gradient(135deg,#0284c7,#06b6d4)", light: "#e0f2fe", text: "#0284c7" },
  Garage:        { Icon: Car,             grad: "linear-gradient(135deg,#475569,#334155)", light: "#f8fafc", text: "#475569" },
  Office:        { Icon: Briefcase,       grad: "linear-gradient(135deg,#6d28d9,#7c3aed)", light: "#f5f3ff", text: "#6d28d9" },
  Storage:       { Icon: Package,         grad: "linear-gradient(135deg,#64748b,#475569)", light: "#f8fafc", text: "#64748b" },
  Utility:       { Icon: Wrench,          grad: "linear-gradient(135deg,#b45309,#d97706)", light: "#fffbeb", text: "#b45309" },
  Balcony:       { Icon: Wind,            grad: "linear-gradient(135deg,#0f766e,#0d9488)", light: "#f0fdfa", text: "#0f766e" },
  Roof:          { Icon: Sun,             grad: "linear-gradient(135deg,#d97706,#f59e0b)", light: "#fffbeb", text: "#d97706" },
  Other:         { Icon: MapPin,          grad: "linear-gradient(135deg,#0b1d3a,#1e3a6e)", light: "#f0f5ff", text: "#0b1d3a" },
};
const typeMeta = (t) => TYPE_META[t] ?? TYPE_META.Other;

const FLOOR_COLORS = [
  { label: 'Navy',    value: '#0b1d3a' },
  { label: 'Royal',  value: '#1d4ed8' },
  { label: 'Teal',   value: '#0f766e' },
  { label: 'Purple', value: '#7c3aed' },
  { label: 'Green',  value: '#15803d' },
  { label: 'Amber',  value: '#b45309' },
  { label: 'Rose',   value: '#be185d' },
  { label: 'Slate',  value: '#475569' },
];

function levelLabel(n) {
  if (n === 0) return 'Ground Floor';
  if (n < 0)   return `Basement ${Math.abs(n)}`;
  if (n === 1) return '1st Floor';
  if (n === 2) return '2nd Floor';
  if (n === 3) return '3rd Floor';
  return `${n}th Floor`;
}

const fade = (d = 0) => ({
  initial:    { opacity: 0, y: 12 },
  animate:    { opacity: 1, y: 0  },
  exit:       { opacity: 0, scale: 0.96 },
  transition: { duration: 0.28, delay: d, ease: [0.4, 0, 0.2, 1] },
});

const PAGE_SIZE = 12;

export default function AreasPage() {
  const propertyId = useSelector(selectCurrentPropertyId);
  const property   = useSelector(selectCurrentProperty);

  const [addAreaMut,    { isLoading: isAdding }]   = usePostMutation();
  const [updateAreaMut, { isLoading: isUpdating }] = usePutMutation();
  const [deleteAreaMut, { isLoading: isDeleting }] = useDeleteMutation();
  const [addFloorMut,   { isLoading: isFloorAdding }] = usePostMutation();

  const [searchInput,  setSearchInput]  = useState("");
  const [search,       setSearch]       = useState("");
  const [view,         setView]         = useState("grid");
  const [floorFilter,  setFloorFilter]  = useState("all");
  const [modal,        setModal]        = useState(null);
  const [delTarget,    setDelTarget]    = useState(null);
  const [page,         setPage]         = useState(1);
  const [floorModal,   setFloorModal]   = useState(false);
  const [pendingFloor, setPendingFloor] = useState(null);

  const areaParams = {
    propertyId,
    ...(floorFilter !== "all" && { floorId: floorFilter }),
    ...(search && { search }),
  };

  const { data: areas = [], isLoading, isError, refetch } = useGetQuery(
    { path: '/areas', params: areaParams },
    { skip: !propertyId },
  );
  const { data: areaStats  = {} } = useGetQuery({ path: '/areas/stats', params: { propertyId } }, { skip: !propertyId });
  const { data: floors     = [] } = useGetQuery({ path: '/floors',      params: { propertyId } }, { skip: !propertyId });

  // Debounce search — resets page when search term actually changes
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const showGrouped = floorFilter === "all" && !search;
  const totalPages  = Math.ceil(areas.length / PAGE_SIZE);
  const pagedItems  = showGrouped ? areas : areas.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const grouped = [
    ...floors
      .map((floor) => ({ floor: floor.name, floorObj: floor, items: areas.filter((a) => a.floorId === floor.id) }))
      .filter((g) => g.items.length > 0),
    ...(() => {
      const u = areas.filter((a) => !a.floorId);
      return u.length ? [{ floor: "Unassigned", floorObj: null, items: u }] : [];
    })(),
  ];

  const statCards = [
    { label: "Total Areas",  value: areaStats.total       ?? 0, color: "#0b1d3a", bg: "#f0f5ff" },
    { label: "Bedrooms",     value: areaStats.bedrooms    ?? 0, color: "#1d4ed8", bg: "#eff6ff" },
    { label: "Bathrooms",    value: areaStats.bathrooms   ?? 0, color: "#0891b2", bg: "#ecfeff" },
    { label: "Total Assets", value: areaStats.totalAssets ?? 0, color: "#16a34a", bg: "#f0fdf4" },
  ];

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleFloorSave = async (data) => {
    try {
      const body = {
        name:        data.name?.trim(),
        level:       parseInt(data.level ?? 0, 10),
        description: data.description?.trim() ?? '',
        color:       data.color ?? '#0b1d3a',
      };
      const newFloor = await addFloorMut({ path: '/floors', body: { ...body, propertyId } }).unwrap();
      toast.success(`Floor "${body.name}" added`);
      setFloorModal(false);
      setPendingFloor({ id: newFloor.id, name: newFloor.name });
    } catch (err) { toast.error(err.data?.error || 'Failed to save floor'); }
  };

  const handleAreaSave = async (data) => {
    try {
      if (modal !== "add") {
        await updateAreaMut({ path: `/areas/${modal.id}`, body: data }).unwrap();
        toast.success("Area updated!");
      } else {
        await addAreaMut({ path: '/areas', body: { ...data, propertyId } }).unwrap();
        toast.success("Area added!");
      }
      setModal(null);
    } catch (err) { toast.error(err.data?.error || 'Failed to save'); }
  };

  const handleDeleteRequest = (area) => {
    if ((area.assetCount ?? 0) > 0) {
      toast(`Remove all ${area.assetCount} asset${area.assetCount !== 1 ? 's' : ''} from "${area.name}" before deleting`, { icon: '⚠️' });
      return;
    }
    setDelTarget(area);
  };

  const handleAreaDelete = async () => {
    try {
      await deleteAreaMut({ path: `/areas/${delTarget.id}` }).unwrap();
      toast.success("Area deleted");
      setDelTarget(null);
    } catch (err) { toast.error(err.data?.error || 'Failed to delete'); setDelTarget(null); }
  };

  // ── Global loader ────────────────────────────────────────────────────────────
  if (isLoading && areas.length === 0) {
    return <PageLoader icon={Layers} text="Loading areas…" />;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[56vh] gap-4">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>
        <div className="text-center">
          <p className="text-[15px] font-bold text-slate-800">Failed to load areas</p>
          <p className="text-[12px] text-slate-400 mt-1 mb-3">Check your connection and try again</p>
          <button onClick={refetch} className="px-5 py-2 rounded-xl text-white text-[13px] font-bold" style={{ background: '#0b1d3a' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "#0b1d3a" }}>
              <RiMapPin2Line className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{property?.name ?? 'Property'}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Areas & Rooms</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">
            {areaStats.total ?? areas.length} spaces · {areaStats.totalAssets ?? 0} assets tracked
          </p>
        </div>
        <Button variant="primary" icon={RiAddLine} onClick={() => setModal("add")}>Add Area</Button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="bg-white rounded-2xl border border-slate-100 p-5" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
            <p className="text-3xl font-bold leading-none mb-1.5" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[12px] text-slate-400">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Floor filter bar ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <RiBuilding2Line className="w-4 h-4 text-slate-400" />
            <span className="text-[12px] font-bold text-slate-600 uppercase tracking-wider">Filter by Floor</span>
            <span className="text-[11px] text-slate-400">· {floors.length} defined</span>
          </div>
          <button onClick={() => setFloorModal(true)}
            className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all">
            <RiAddLine className="w-3.5 h-3.5" />Add Floor
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setFloorFilter("all"); setPage(1); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold border transition-all"
            style={floorFilter === "all"
              ? { background: "#0b1d3a", color: "#fff", borderColor: "#0b1d3a" }
              : { background: "#fff", color: "#64748b", borderColor: "#e2e8f0" }}>
            <RiStackLine className="w-3.5 h-3.5" />All Floors
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={floorFilter === "all" ? { background: "rgba(255,255,255,0.2)", color: "#fff" } : { background: "#f1f5f9", color: "#64748b" }}>
              {areas.length}
            </span>
          </button>
          {floors.map((floor) => {
            const active = floorFilter === floor.id;
            const accent = floor.color ?? "#1d4ed8";
            return (
              <button key={floor.id} onClick={() => { setFloorFilter(active ? "all" : floor.id); setPage(1); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold border transition-all"
                style={active ? { background: accent, color: "#fff", borderColor: accent } : { background: "#fff", color: "#475569", borderColor: "#e2e8f0" }}>
                <RiBuilding2Line className="w-3.5 h-3.5" />
                {floor.name}
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={active ? { background: "rgba(255,255,255,0.2)", color: "#fff" } : { background: "#f1f5f9", color: "#64748b" }}>
                  {floor.areaCount ?? 0}
                </span>
              </button>
            );
          })}
          {floors.length === 0 && (
            <button onClick={() => setFloorModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold border border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
              <RiAddLine className="w-3.5 h-3.5" />Add First Floor
            </button>
          )}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search rooms & areas…"
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-[13px] placeholder-slate-400 outline-none transition-all"
            onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 2px #93c5fd")}
            onBlur={(e)  => (e.currentTarget.style.boxShadow = "")} />
        </div>
        <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 gap-0.5">
          {[["grid", RiLayoutGridLine], ["list", RiListCheck2]].map(([v, Icon]) => (
            <button key={v} onClick={() => setView(v)}
              className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                view === v ? "text-white" : "text-slate-400 hover:text-slate-600")}
              style={view === v ? { background: "#0b1d3a" } : {}}>
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* ── Empty state ── */}
      {areas.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <RiHome4Line className="w-8 h-8 text-slate-300" />
          </div>
          <p className="font-bold text-slate-500 text-[15px]">No areas found</p>
          <p className="text-slate-400 text-[13px] mt-1 mb-4">
            {search ? "Try a different search." : "Add rooms and spaces to start tracking assets."}
          </p>
          {!search && (
            <button onClick={() => setModal("add")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-[13px] text-white"
              style={{ background: "#0b1d3a" }}>
              <RiAddLine className="w-4 h-4" />Add First Area
            </button>
          )}
        </div>
      )}

      {/* ── Swipe hint (mobile only) ── */}
      {areas.length > 0 && (
        <p className="sm:hidden text-[10px] text-slate-400 font-semibold uppercase tracking-widest text-center -mb-2">
          ← Swipe card to edit or delete →
        </p>
      )}

      {/* ── Grouped view (All Floors + no search) ── */}
      {areas.length > 0 && showGrouped && (
        <div className="space-y-8">
          {grouped.map(({ floor, floorObj, items }) => (
            <div key={floor}>
              <FloorSectionHeader floor={floor} count={items.length} color={floorObj?.color} />
              {view === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-3">
                  <AnimatePresence mode="popLayout">
                    {items.map((area, i) => (
                      <MotionSwipeableRow
                        key={area.id}
                        {...fade(i * 0.04)}
                        className="rounded-3xl overflow-hidden"
                        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.10)" }}
                        onSwipeRight={() => setModal(area)}
                        onSwipeLeft={() => handleDeleteRequest(area)}
                        leftIcon={<Edit2  style={{ color: '#2563eb', width: 20, height: 20 }} />}
                        leftLabel="Edit"    leftBg="#eff6ff"  leftColor="#2563eb"
                        rightIcon={<Trash2 style={{ color: '#dc2626', width: 20, height: 20 }} />}
                        rightLabel="Delete" rightBg="#fef2f2" rightColor="#dc2626"
                      >
                        <AreaCard area={area} canDelete={(area.assetCount ?? 0) === 0} onEdit={() => setModal(area)} onDelete={() => handleDeleteRequest(area)} />
                      </MotionSwipeableRow>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="mt-3 bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
                  <ListHeader />
                  {items.map((area, i) => (
                    <MotionSwipeableRow
                      key={area.id}
                      onSwipeRight={() => setModal(area)}
                      onSwipeLeft={() => setDelTarget(area)}
                      leftIcon={<Edit2  style={{ color: '#2563eb', width: 18, height: 18 }} />}
                      leftLabel="Edit"    leftBg="#eff6ff"  leftColor="#2563eb"
                      rightIcon={<Trash2 style={{ color: '#dc2626', width: 18, height: 18 }} />}
                      rightLabel="Delete" rightBg="#fef2f2" rightColor="#dc2626"
                    >
                      <AreaRow area={area} last={i === items.length - 1}
                        canDelete={(area.assetCount ?? 0) === 0}
                        onEdit={() => setModal(area)} onDelete={() => handleDeleteRequest(area)} />
                    </MotionSwipeableRow>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Flat view (filtered/searched) ── */}
      {areas.length > 0 && !showGrouped && view === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {pagedItems.map((area, i) => (
              <MotionSwipeableRow
                key={area.id}
                {...fade(i * 0.04)}
                className="rounded-3xl overflow-hidden"
                style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.10)" }}
                onSwipeRight={() => setModal(area)}
                onSwipeLeft={() => setDelTarget(area)}
                leftIcon={<Edit2  style={{ color: '#2563eb', width: 20, height: 20 }} />}
                leftLabel="Edit"    leftBg="#eff6ff"  leftColor="#2563eb"
                rightIcon={<Trash2 style={{ color: '#dc2626', width: 20, height: 20 }} />}
                rightLabel="Delete" rightBg="#fef2f2" rightColor="#dc2626"
              >
                <AreaCard area={area} onEdit={() => setModal(area)} onDelete={() => handleDeleteRequest(area)} />
              </MotionSwipeableRow>
            ))}
          </AnimatePresence>
        </div>
      )}

      {areas.length > 0 && !showGrouped && view === "list" && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
          <ListHeader />
          {pagedItems.map((area, i) => (
            <MotionSwipeableRow
              key={area.id}
              onSwipeRight={() => setModal(area)}
              onSwipeLeft={() => setDelTarget(area)}
              leftIcon={<Edit2  style={{ color: '#2563eb', width: 18, height: 18 }} />}
              leftLabel="Edit"    leftBg="#eff6ff"  leftColor="#2563eb"
              rightIcon={<Trash2 style={{ color: '#dc2626', width: 18, height: 18 }} />}
              rightLabel="Delete" rightBg="#fef2f2" rightColor="#dc2626"
            >
              <AreaRow area={area} last={i === pagedItems.length - 1}
                canDelete={(area.assetCount ?? 0) === 0}
                onEdit={() => setModal(area)} onDelete={() => handleDeleteRequest(area)} />
            </MotionSwipeableRow>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {!showGrouped && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className={cn("w-9 h-9 rounded-xl border flex items-center justify-center transition-all text-slate-500",
              page === 1 ? "opacity-40 cursor-not-allowed border-slate-200" : "hover:bg-slate-50 border-slate-200")}>
            <RiArrowLeftLine className="w-4 h-4" />
          </button>
          <span className="text-[13px] font-semibold text-slate-600">Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className={cn("w-9 h-9 rounded-xl border flex items-center justify-center transition-all text-slate-500",
              page === totalPages ? "opacity-40 cursor-not-allowed border-slate-200" : "hover:bg-slate-50 border-slate-200")}>
            <RiArrowRightLine className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Modals ── */}
      <AreaModal
        open={modal !== null}
        area={modal !== "add" ? modal : null}
        floors={floors}
        propertyName={property?.name}
        onClose={() => setModal(null)}
        onAddFloor={() => setFloorModal(true)}
        pendingFloor={pendingFloor}
        onClearPending={() => setPendingFloor(null)}
        onSave={handleAreaSave}
        isSubmitting={isAdding || isUpdating}
      />

      <ConfirmDialog
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={handleAreaDelete}
        loading={isDeleting}
        title="Delete Area"
        message={`Delete "${delTarget?.name}"? Assets linked to this area will be unassigned automatically.`}
        confirmLabel="Delete Area"
      />

      <FloorModal
        open={floorModal}
        onClose={() => setFloorModal(false)}
        onSave={handleFloorSave}
        floors={floors}
        propertyName={property?.name}
        isSubmitting={isFloorAdding}
      />
    </motion.div>
  );
}

/* ── Area Card — inner content only, MotionSwipeableRow provides the shell ── */
function AreaCard({ area, onEdit, onDelete, canDelete = true }) {
  const meta        = typeMeta(area.type);
  const accentColor = (meta.grad.match(/#[a-f0-9]{6}/gi) ?? ['#0b1d3a'])[0];
  const assetCount  = area.assetCount ?? 0;

  return (
    <div className="bg-white flex flex-col">

      {/* Main body — link to detail */}
      <Link to={`/areas/${area.id}`} className="block group flex-1">

        {/* Header */}
        <div className="relative px-5 pt-4 pb-4 overflow-hidden" style={{ background: meta.grad }}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:"rgba(255,255,255,0.25)" }} />
          <div style={{ position:"absolute", top:-36, right:-36, width:130, height:130, borderRadius:"50%", border:"1px solid rgba(255,255,255,0.15)", pointerEvents:"none" }} />
          <div style={{ position:"absolute", top:-18, right:-18, width:80, height:80, borderRadius:"50%", border:"1px solid rgba(255,255,255,0.2)", pointerEvents:"none" }} />
          <meta.Icon style={{ position:"absolute", right:8, bottom:-8, width:80, height:80, color:"rgba(255,255,255,0.07)", userSelect:"none", pointerEvents:"none" }} />

          <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
            style={{ background:"rgba(0,0,0,0.28)", zIndex:10 }}>
            <RiBox3Line className="w-3 h-3" />{assetCount}
          </div>

          <div className="relative flex items-center gap-3.5 mt-1" style={{ zIndex:5 }}>
            <div className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center"
              style={{ background:"rgba(0,0,0,0.22)", border:"2.5px solid rgba(255,255,255,0.25)" }}>
              <meta.Icon className="w-7 h-7 text-white" strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-black text-white leading-tight truncate">{area.name}</p>
              <p className="text-[11px] font-semibold mt-0.5" style={{ color:"rgba(255,255,255,0.55)" }}>
                {area.type}{area.size ? ` · ${area.size}` : ""}
              </p>
            </div>
          </div>

          {area.floorName && (
            <div className="absolute bottom-3.5 left-5 text-[10px] font-bold text-white/75 bg-black/25 px-2.5 py-0.5 rounded-full" style={{ zIndex:5 }}>
              {area.floorName}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col px-5 pt-4 pb-4 gap-3">
          {area.description && <p className="text-[12px] text-slate-400 line-clamp-2">{area.description}</p>}
          <div className="flex-1" />
          <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: accentColor }}>
              <RiBox3Line className="w-4 h-4" />
              {assetCount} asset{assetCount !== 1 ? "s" : ""}
            </div>
            <span className="flex items-center gap-1 text-[12px] font-bold text-slate-400 group-hover:text-slate-700 transition-colors">
              View <RiArrowRightLine className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </Link>

      {/* Action bar — desktop only; mobile uses swipe */}
      <div className="hidden sm:flex border-t border-slate-100 px-4 py-2 items-center justify-end gap-1">
        <button onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-blue-600 hover:bg-blue-50 transition-all">
          <RiEditLine className="w-3.5 h-3.5" />Edit
        </button>
        <button onClick={onDelete}
          title={!canDelete ? "Remove all assets from this area first" : undefined}
          className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all",
            canDelete ? "text-red-500 hover:bg-red-50" : "text-slate-300 cursor-not-allowed")}>
          <RiDeleteBinLine className="w-3.5 h-3.5" />Delete
        </button>
      </div>
    </div>
  );
}

/* ── Area List Row — inner content only ── */
function AreaRow({ area, last, onEdit, onDelete, canDelete = true }) {
  const meta       = typeMeta(area.type);
  const assetCount = area.assetCount ?? 0;
  return (
    <div className={cn("bg-white flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors", !last && "border-b border-slate-50")}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: meta.grad }}>
        <meta.Icon className="w-5 h-5 text-white" strokeWidth={1.5} />
      </div>
      <Link to={`/areas/${area.id}`} className="flex-1 min-w-0 block">
        <p className="text-[14px] font-semibold text-slate-800 truncate">{area.name}</p>
        <p className="text-[11px] text-slate-400">{area.floorName ?? "—"}</p>
      </Link>
      <span className="hidden sm:block text-[12px] font-semibold px-2.5 py-1 rounded-full shrink-0"
        style={{ background: meta.light, color: meta.text }}>
        {area.type ?? "—"}
      </span>
      <span className="hidden md:block text-[12px] text-slate-400 shrink-0">{area.floorName ?? "—"}</span>
      <span className="text-[12px] text-slate-500 shrink-0 flex items-center gap-1">
        <RiBox3Line className="w-3.5 h-3.5 text-slate-400" />{assetCount}
      </span>
      {/* Desktop action buttons */}
      <div className="hidden sm:flex items-center gap-1 shrink-0">
        <button onClick={onEdit}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
          <RiEditLine className="w-3.5 h-3.5" />
        </button>
        <button onClick={onDelete}
          title={!canDelete ? "Remove all assets from this area first" : undefined}
          className={cn("w-7 h-7 rounded-lg flex items-center justify-center transition-all",
            canDelete ? "text-slate-400 hover:text-red-500 hover:bg-red-50" : "text-slate-200 cursor-not-allowed")}>
          <RiDeleteBinLine className="w-3.5 h-3.5" />
        </button>
        <Link to={`/areas/${area.id}`}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
          <RiArrowRightLine className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

/* ── Supporting UI ── */
function FloorSectionHeader({ floor, count, color }) {
  const accent = color ?? "#0b1d3a";
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: `${accent}14` }}>
        <RiBuilding2Line className="w-4 h-4" style={{ color: accent }} />
        <span className="text-[13px] font-bold" style={{ color: accent }}>{floor}</span>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: accent, color: "#fff" }}>{count}</span>
      </div>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

function ListHeader() {
  return (
    <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 grid grid-cols-12 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
      <span className="col-span-1" />
      <span className="col-span-4">Area Name</span>
      <span className="col-span-2 hidden sm:block">Type</span>
      <span className="col-span-2 hidden md:block">Floor</span>
      <span className="col-span-1">Assets</span>
      <span className="col-span-2" />
    </div>
  );
}

/* ── Floor Select (custom dropdown) ── */
function FloorSelectField({ value, onChange, floors, onAddFloor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedFloor = floors.find((f) => f.id === value);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] hover:border-slate-300 transition-colors"
        style={{ minHeight: '42px' }}>
        {selectedFloor ? (
          <span className="flex items-center gap-2 text-slate-700 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: selectedFloor.color ?? '#0b1d3a' }} />
            <span className="truncate">{selectedFloor.name}</span>
          </span>
        ) : (
          <span className="text-slate-400">Select floor</span>
        )}
        <RiArrowDownSLine className={cn('w-4 h-4 text-slate-400 shrink-0 transition-transform duration-150', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden py-1 max-h-52 overflow-y-auto">
          <button type="button" onClick={() => { onChange('', ''); setOpen(false); }}
            className={cn('w-full flex items-center gap-2 px-3 py-2 text-[13px] text-left transition-colors',
              !value ? 'bg-slate-50 text-slate-600 font-semibold' : 'text-slate-400 hover:bg-slate-50')}>
            No floor
          </button>
          {floors.map((f) => (
            <button key={f.id} type="button" onClick={() => { onChange(f.id, f.name); setOpen(false); }}
              className={cn('w-full flex items-center gap-2 px-3 py-2 text-[13px] text-left transition-colors',
                value === f.id ? 'bg-slate-50 font-semibold' : 'text-slate-700 hover:bg-slate-50')}>
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: f.color ?? '#0b1d3a' }} />
              <span style={value === f.id ? { color: f.color ?? '#0b1d3a' } : {}}>{f.name}</span>
            </button>
          ))}
          <div className="border-t border-slate-100 mt-1 pt-1">
            <button type="button" onClick={() => { setOpen(false); onAddFloor(); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-semibold text-blue-600 hover:bg-blue-50 transition-colors text-left">
              <RiAddLine className="w-3.5 h-3.5" />Add New Floor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Area Modal ── */
function AreaModal({ open, onClose, area, floors, propertyName, onSave, onAddFloor, pendingFloor, onClearPending, isSubmitting }) {
  const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm();
  const selectedType    = useWatch({ control, name: 'type' });
  const selectedFloorId = useWatch({ control, name: 'floorId', defaultValue: '' });

  useEffect(() => {
    if (!open) return;
    if (area) {
      const isCustom = area.type && !AREA_TYPES.includes(area.type);
      reset({
        name:        area.name,
        type:        isCustom ? 'Other' : (area.type ?? ''),
        customType:  isCustom ? area.type : '',
        floorId:     area.floorId ?? '',
        floorName:   area.floorName ?? '',
        description: area.description ?? '',
      });
    } else {
      reset({ name: '', type: '', customType: '', floorId: '', floorName: '', description: '', size: '' });
    }
  }, [open, area, reset]);

  useEffect(() => {
    if (pendingFloor && open) {
      setValue('floorId',   pendingFloor.id);
      setValue('floorName', pendingFloor.name);
      onClearPending?.();
    }
  }, [pendingFloor, open, setValue, onClearPending]);

  const handleSave = ({ customType, ...data }) => {
    const finalType = data.type === 'Other' ? (customType?.trim() || 'Other') : data.type;
    onSave({ ...data, type: finalType });
  };

  return (
    <Modal open={open} onClose={onClose} title={area ? "Edit Area" : "Add New Area"}
      subtitle={`Define a room or space in ${propertyName ?? 'your property'}`}>
      <form onSubmit={handleSubmit(handleSave)} className="space-y-5">
        <Field label="Area Name" required error={errors.name?.message}>
          <Input {...register("name", { required: "Name is required" })} placeholder="e.g. Master Bedroom" />
        </Field>
        <FormGrid>
          <Field label="Area Type" required error={errors.type?.message}>
            <Select {...register("type", { required: "Type is required" })} placeholder="Select type"
              options={AREA_TYPES.map((t) => ({ value: t, label: t }))} />
          </Field>
          <Field label="Floor">
            <FloorSelectField
              value={selectedFloorId}
              onChange={(id, name) => { setValue('floorId', id); setValue('floorName', name); }}
              floors={floors}
              onAddFloor={onAddFloor}
            />
          </Field>
        </FormGrid>
        {selectedType === 'Other' && (
          <Field label="Custom Type Name" required error={errors.customType?.message}>
            <Input {...register("customType", { required: 'Required when type is Other' })}
              placeholder="e.g. Gym, Cinema Room, Laundry…" />
          </Field>
        )}
        <Field label="Description / Notes">
          <Textarea {...register("description")} rows={2} placeholder="Special features, access notes…" />
        </Field>
        <FormActions onCancel={onClose} submitLabel={area ? "Update Area" : "Add Area"} loading={isSubmitting} />
      </form>
    </Modal>
  );
}

/* ── Floor Add Modal ── */
function FloorModal({ open, onClose, onSave, floors, propertyName, isSubmitting }) {
  const { register, handleSubmit, reset, setValue, control } = useForm();
  const selectedColor = useWatch({ control, name: 'color', defaultValue: '#0b1d3a' });
  const watchedName   = useWatch({ control, name: 'name',  defaultValue: '' });
  const watchedLevel  = useWatch({ control, name: 'level', defaultValue: 0 });

  useEffect(() => {
    if (!open) return;
    const nextLevel = floors.length > 0 ? Math.max(...floors.map((f) => f.level)) + 1 : 0;
    reset({ name: '', level: nextLevel, description: '', color: '#0b1d3a' });
  }, [open, floors, reset]);

  return (
    <Modal open={open} onClose={onClose} title="Add New Floor" subtitle={`Define a level in ${propertyName ?? 'your property'}`}>
      <form onSubmit={handleSubmit(onSave)} className="space-y-5">
        <FormGrid>
          <Field label="Floor Name" required>
            <Input {...register('name', { required: 'Required' })} placeholder="e.g. Ground Floor, Rooftop" />
          </Field>
          <Field label="Level Number" hint="0 = ground, negative = basement">
            <Input {...register('level')} type="number" placeholder="0" />
          </Field>
        </FormGrid>
        <Field label="Description / Notes">
          <Textarea {...register('description')} rows={2} placeholder="e.g. Main living area…" />
        </Field>
        <Field label="Accent Color">
          <div className="flex flex-wrap gap-2 mt-1">
            {FLOOR_COLORS.map((c) => (
              <button key={c.value} type="button" onClick={() => setValue('color', c.value)}
                className="relative w-9 h-9 rounded-xl border-2 transition-all"
                style={{ background: c.value, borderColor: selectedColor === c.value ? '#fff' : c.value, boxShadow: selectedColor === c.value ? `0 0 0 2px ${c.value}` : 'none' }}
                title={c.label}>
                {selectedColor === c.value && <RiCheckLine className="w-4 h-4 text-white absolute inset-0 m-auto" />}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: `${selectedColor}12`, border: `1px solid ${selectedColor}30` }}>
            <div className="w-7 h-7 rounded-lg" style={{ background: selectedColor }} />
            <div>
              <p className="text-[12px] font-bold" style={{ color: selectedColor }}>{watchedName || 'Floor Name'}</p>
              <p className="text-[10px] text-slate-400">{levelLabel(parseInt(watchedLevel ?? 0, 10))}</p>
            </div>
          </div>
          <input type="hidden" {...register('color')} />
        </Field>
        <FormActions onCancel={onClose} submitLabel="Add Floor" loading={isSubmitting} />
      </form>
    </Modal>
  );
}
