import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  RiAddLine,
  RiSearchLine,
  RiLayoutGridLine,
  RiListCheck2,
  RiEditLine,
  RiDeleteBinLine,
  RiArrowRightLine,
  RiHome4Line,
  RiBox3Line,
  RiMapPin2Line,
  RiStackLine,
  RiRulerLine,
  RiBuilding2Line,
  RiCheckLine,
  RiCloseLine,
} from "react-icons/ri";
import {
  selectAreas,
  selectFloors,
  addArea,
  updateArea,
  deleteArea,
  addFloor,
  removeFloor,
} from "../../store/slices/areasSlice";
import { selectAssets } from "../../store/slices/assetsSlice";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import {
  Field,
  Input,
  Select,
  Textarea,
  FormGrid,
  FormActions,
} from "../../components/ui/FormField";
import Button from "../../components/ui/Button";
import { cn } from "../../utils/cn";

const AREA_TYPES = [
  "Bedroom",
  "Bathroom",
  "Kitchen",
  "Living Room",
  "Dining Room",
  "Office",
  "Storage",
  "Garage",
  "Garden",
  "Pool Area",
  "Utility",
  "Balcony",
  "Roof",
  "Other",
];

const TYPE_META = {
  Bedroom: {
    emoji: "🛏️",
    grad: "linear-gradient(135deg,#1e3a8a,#312e81)",
    light: "#eff6ff",
    text: "#1d4ed8",
  },
  Bathroom: {
    emoji: "🚿",
    grad: "linear-gradient(135deg,#0e7490,#1d4ed8)",
    light: "#ecfeff",
    text: "#0891b2",
  },
  Kitchen: {
    emoji: "🍳",
    grad: "linear-gradient(135deg,#c2410c,#d97706)",
    light: "#fff7ed",
    text: "#c2410c",
  },
  "Living Room": {
    emoji: "🛋️",
    grad: "linear-gradient(135deg,#1d4ed8,#0b1d3a)",
    light: "#eff6ff",
    text: "#2563eb",
  },
  "Dining Room": {
    emoji: "🍽️",
    grad: "linear-gradient(135deg,#7c3aed,#4f46e5)",
    light: "#f5f3ff",
    text: "#7c3aed",
  },
  Garden: {
    emoji: "🌿",
    grad: "linear-gradient(135deg,#15803d,#16a34a)",
    light: "#f0fdf4",
    text: "#16a34a",
  },
  "Pool Area": {
    emoji: "🏊",
    grad: "linear-gradient(135deg,#0284c7,#06b6d4)",
    light: "#e0f2fe",
    text: "#0284c7",
  },
  Garage: {
    emoji: "🚗",
    grad: "linear-gradient(135deg,#475569,#334155)",
    light: "#f8fafc",
    text: "#475569",
  },
  Office: {
    emoji: "💼",
    grad: "linear-gradient(135deg,#6d28d9,#7c3aed)",
    light: "#f5f3ff",
    text: "#6d28d9",
  },
  Storage: {
    emoji: "📦",
    grad: "linear-gradient(135deg,#64748b,#475569)",
    light: "#f8fafc",
    text: "#64748b",
  },
  Utility: {
    emoji: "🔧",
    grad: "linear-gradient(135deg,#b45309,#d97706)",
    light: "#fffbeb",
    text: "#b45309",
  },
  Balcony: {
    emoji: "🏠",
    grad: "linear-gradient(135deg,#0f766e,#0d9488)",
    light: "#f0fdfa",
    text: "#0f766e",
  },
  Roof: {
    emoji: "☀️",
    grad: "linear-gradient(135deg,#d97706,#f59e0b)",
    light: "#fffbeb",
    text: "#d97706",
  },
  Other: {
    emoji: "📍",
    grad: "linear-gradient(135deg,#0b1d3a,#1e3a6e)",
    light: "#f0f5ff",
    text: "#0b1d3a",
  },
};
const typeMeta = (t) => TYPE_META[t] ?? TYPE_META.Other;

export default function AreasPage() {
  const dispatch = useDispatch();
  const areas = useSelector(selectAreas);
  const assets = useSelector(selectAssets);
  const floors = useSelector(selectFloors);

  const [search, setSearch] = useState("");
  const [view, setView] = useState("grid");
  const [floorFilter, setFloorFilter] = useState("all");
  const [modal, setModal] = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [manageFloors, setManageFloors] = useState(false);
  const [addFloorVal, setAddFloorVal] = useState("");
  const [addingFloor, setAddingFloor] = useState(false);
  const floorInputRef = useRef(null);

  const assetCount = assets.reduce((m, a) => {
    if (a.areaId) m[a.areaId] = (m[a.areaId] ?? 0) + 1;
    return m;
  }, {});

  const filtered = areas.filter((a) => {
    const q = search.toLowerCase();
    const ms =
      a.name.toLowerCase().includes(q) ||
      (a.type ?? "").toLowerCase().includes(q);
    const mf = floorFilter === "all" || a.floor === floorFilter;
    return ms && mf;
  });

  const showGrouped = floorFilter === "all" && !search;

  // Build grouped list in floor order
  const grouped = [
    ...floors
      .map((floor) => ({
        floor,
        items: filtered.filter((a) => a.floor === floor),
      }))
      .filter((g) => g.items.length > 0),
    ...(() => {
      const u = filtered.filter((a) => !a.floor || !floors.includes(a.floor));
      return u.length ? [{ floor: "Other", items: u }] : [];
    })(),
  ];

  const handleAddFloor = () => {
    const v = addFloorVal.trim();
    if (!v) return;
    if (floors.includes(v)) {
      toast.error("Floor already exists");
      return;
    }
    dispatch(addFloor(v));
    toast.success(`"${v}" added`);
    setAddFloorVal("");
    setAddingFloor(false);
  };

  const handleRemoveFloor = (f) => {
    if (areas.some((a) => a.floor === f)) {
      toast.error(`"${f}" is in use — reassign areas first`);
      return;
    }
    dispatch(removeFloor(f));
    toast.success(`Floor "${f}" removed`);
    if (floorFilter === f) setFloorFilter("all");
  };

  useEffect(() => {
    if (addingFloor) floorInputRef.current?.focus();
  }, [addingFloor]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: "#0b1d3a" }}
            >
              <RiMapPin2Line className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Shah House
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Areas & Rooms
          </h1>
          <p className="text-[13px] text-slate-400 mt-0.5">
            {areas.length} spaces · {assets.length} assets tracked
          </p>
        </div>
        <Button
          variant="primary"
          icon={RiAddLine}
          onClick={() => setModal("add")}
        >
          Add Area
        </Button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Total Areas",
            value: areas.length,
            color: "#0b1d3a",
            bg: "#f0f5ff",
          },
          {
            label: "Bedrooms",
            value: areas.filter((a) => a.type?.includes("Bedroom")).length,
            color: "#1d4ed8",
            bg: "#eff6ff",
          },
          {
            label: "Bathrooms",
            value: areas.filter((a) => a.type?.includes("Bathroom")).length,
            color: "#0891b2",
            bg: "#ecfeff",
          },
          {
            label: "Total Assets",
            value: assets.length,
            color: "#16a34a",
            bg: "#f0fdf4",
          },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-white rounded-2xl border border-slate-100 p-5"
            style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}
          >
            <p
              className="text-3xl font-bold leading-none mb-1.5"
              style={{ color: s.color }}
            >
              {s.value}
            </p>
            <p className="text-[12px] text-slate-400">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Floor management panel ── */}
      <div
        className="bg-white rounded-2xl border border-slate-100 p-4"
        style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <RiBuilding2Line className="w-4 h-4 text-slate-400" />
            <span className="text-[12px] font-bold text-slate-600 uppercase tracking-wider">
              Floors
            </span>
            <span className="text-[11px] text-slate-400">
              · {floors.length} defined
            </span>
          </div>
          <button
            onClick={() => setManageFloors((v) => !v)}
            className={cn(
              "text-[11px] font-bold px-3 py-1 rounded-lg transition-all border",
              manageFloors
                ? "bg-red-50 text-red-600 border-red-200"
                : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100",
            )}
          >
            {manageFloors ? "Done" : "Manage"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* All chip */}
          <button
            onClick={() => setFloorFilter("all")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold border transition-all"
            style={
              floorFilter === "all"
                ? {
                    background: "#0b1d3a",
                    color: "#fff",
                    borderColor: "#0b1d3a",
                  }
                : {
                    background: "#fff",
                    color: "#64748b",
                    borderColor: "#e2e8f0",
                  }
            }
          >
            <RiStackLine className="w-3.5 h-3.5" />
            All Floors
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={
                floorFilter === "all"
                  ? { background: "rgba(255,255,255,0.2)", color: "#fff" }
                  : { background: "#f1f5f9", color: "#64748b" }
              }
            >
              {areas.length}
            </span>
          </button>

          {floors.map((floor) => {
            const count = areas.filter((a) => a.floor === floor).length;
            const active = floorFilter === floor;
            return (
              <div key={floor} className="relative">
                <button
                  onClick={() => setFloorFilter(active ? "all" : floor)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold border transition-all"
                  style={{
                    paddingRight: manageFloors ? "26px" : undefined,
                    ...(active
                      ? {
                          background: "#1d4ed8",
                          color: "#fff",
                          borderColor: "#1d4ed8",
                        }
                      : {
                          background: "#fff",
                          color: "#475569",
                          borderColor: "#e2e8f0",
                        }),
                  }}
                >
                  <RiBuilding2Line className="w-3.5 h-3.5" />
                  {floor}
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={
                      active
                        ? { background: "rgba(255,255,255,0.2)", color: "#fff" }
                        : { background: "#f1f5f9", color: "#64748b" }
                    }
                  >
                    {count}
                  </span>
                </button>
                {manageFloors && (
                  <button
                    onClick={() => handleRemoveFloor(floor)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all"
                  >
                    <RiCloseLine className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Add floor inline */}
          <AnimatePresence>
            {addingFloor ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1"
              >
                <input
                  ref={floorInputRef}
                  value={addFloorVal}
                  onChange={(e) => setAddFloorVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddFloor();
                    if (e.key === "Escape") {
                      setAddingFloor(false);
                      setAddFloorVal("");
                    }
                  }}
                  placeholder="Floor name…"
                  className="h-[34px] px-3 rounded-xl border border-blue-300 text-[12px] font-medium text-slate-700 outline-none w-36"
                  style={{ boxShadow: "0 0 0 2px #bfdbfe" }}
                />
                <button
                  onClick={handleAddFloor}
                  className="w-[34px] h-[34px] rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-all shrink-0"
                >
                  <RiCheckLine className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setAddingFloor(false);
                    setAddFloorVal("");
                  }}
                  className="w-[34px] h-[34px] rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-all shrink-0"
                >
                  <RiCloseLine className="w-4 h-4" />
                </button>
              </motion.div>
            ) : (
              <button
                onClick={() => setAddingFloor(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold border border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
              >
                <RiAddLine className="w-3.5 h-3.5" />
                Add Floor
              </button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rooms & areas…"
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-[13px] placeholder-slate-400 outline-none transition-all"
            onFocus={(e) =>
              (e.currentTarget.style.boxShadow = "0 0 0 2px #93c5fd")
            }
            onBlur={(e) => (e.currentTarget.style.boxShadow = "")}
          />
        </div>
        <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 gap-0.5">
          {[
            ["grid", RiLayoutGridLine],
            ["list", RiListCheck2],
          ].map(([v, Icon]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                view === v
                  ? "text-white"
                  : "text-slate-400 hover:text-slate-600",
              )}
              style={view === v ? { background: "#0b1d3a" } : {}}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* ── Empty state ── */}
      {filtered.length === 0 && (
        <div
          className="bg-white rounded-2xl border border-slate-100 p-16 text-center"
          style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}
        >
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <RiHome4Line className="w-8 h-8 text-slate-300" />
          </div>
          <p className="font-bold text-slate-500 text-[15px]">No areas found</p>
          <p className="text-slate-400 text-[13px] mt-1 mb-4">
            {search
              ? "Try a different search."
              : "Add rooms and spaces to start tracking assets."}
          </p>
          {!search && (
            <button
              onClick={() => setModal("add")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-[13px] text-white"
              style={{ background: "#0b1d3a" }}
            >
              <RiAddLine className="w-4 h-4" />
              Add First Area
            </button>
          )}
        </div>
      )}

      {/* ── Grouped view (All Floors + no search) ── */}
      {filtered.length > 0 && showGrouped && (
        <div className="space-y-8">
          {grouped.map(({ floor, items }) => (
            <div key={floor}>
              <FloorSectionHeader floor={floor} count={items.length} />
              {view === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-3">
                  <AnimatePresence mode="popLayout">
                    {items.map((area, i) => (
                      <motion.div
                        key={area.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        <AreaCard
                          area={area}
                          assetCount={assetCount[area.id] ?? 0}
                          onEdit={() => setModal(area)}
                          onDelete={() => setDelTarget(area)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div
                  className="mt-3 bg-white rounded-2xl border border-slate-100 overflow-hidden"
                  style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}
                >
                  <ListHeader />
                  {items.map((area, i) => (
                    <AreaRow
                      key={area.id}
                      area={area}
                      assetCount={assetCount[area.id] ?? 0}
                      last={i === items.length - 1}
                      onEdit={() => setModal(area)}
                      onDelete={() => setDelTarget(area)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Flat view (filtered/searched) ── */}
      {filtered.length > 0 && !showGrouped && view === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((area, i) => (
              <motion.div
                key={area.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ delay: i * 0.04 }}
              >
                <AreaCard
                  area={area}
                  assetCount={assetCount[area.id] ?? 0}
                  onEdit={() => setModal(area)}
                  onDelete={() => setDelTarget(area)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {filtered.length > 0 && !showGrouped && view === "list" && (
        <div
          className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
          style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}
        >
          <ListHeader />
          {filtered.map((area, i) => (
            <AreaRow
              key={area.id}
              area={area}
              assetCount={assetCount[area.id] ?? 0}
              last={i === filtered.length - 1}
              onEdit={() => setModal(area)}
              onDelete={() => setDelTarget(area)}
            />
          ))}
        </div>
      )}

      <AreaModal
        open={modal !== null}
        area={modal !== "add" ? modal : null}
        floors={floors}
        onClose={() => setModal(null)}
        onSave={(data) => {
          if (modal !== "add") {
            dispatch(updateArea({ ...modal, ...data }));
            toast.success("Area updated!");
          } else {
            dispatch(addArea(data));
            toast.success("Area added!");
          }
          setModal(null);
        }}
      />
      <ConfirmDialog
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={() => {
          dispatch(deleteArea(delTarget.id));
          toast.success("Area deleted");
          setDelTarget(null);
        }}
        title="Delete Area"
        message={`Delete "${delTarget?.name}"? Assets linked to this area will not be removed.`}
      />
    </motion.div>
  );
}

function FloorSectionHeader({ floor, count }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
        style={{ background: "#f0f5ff" }}
      >
        <RiBuilding2Line className="w-4 h-4" style={{ color: "#0b1d3a" }} />
        <span className="text-[13px] font-bold" style={{ color: "#0b1d3a" }}>
          {floor}
        </span>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: "#0b1d3a", color: "#fff" }}
        >
          {count}
        </span>
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

function AreaCard({ area, assetCount, onEdit, onDelete }) {
  const meta = typeMeta(area.type);
  // pull the first hex from the gradient for accent chip colour
  const accentColor = (meta.grad.match(/#[a-f0-9]{6}/gi) ?? ['#0b1d3a'])[0];

  return (
    <Link to={`/areas/${area.id}`} className="block group">
      <div
        className="rounded-3xl overflow-hidden bg-white flex flex-col"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.1)" }}>

        {/* ══ HEADER — type gradient, emoji + name inside ══ */}
        <div
          className="relative px-5 pt-4 pb-4 overflow-hidden"
          style={{ background: meta.grad }}>

          {/* White sheen bar at very top */}
          <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:"rgba(255,255,255,0.25)" }} />

          {/* Decorative rings */}
          <div style={{ position:"absolute", top:-36, right:-36, width:130, height:130, borderRadius:"50%", border:"1px solid rgba(255,255,255,0.15)", pointerEvents:"none" }} />
          <div style={{ position:"absolute", top:-18, right:-18, width:80,  height:80,  borderRadius:"50%", border:"1px solid rgba(255,255,255,0.2)",  pointerEvents:"none" }} />

          {/* Ghost watermark */}
          <div style={{
            position:"absolute", right:10, bottom:-4,
            fontSize:72, fontWeight:900, lineHeight:1,
            color:"rgba(255,255,255,0.08)",
            letterSpacing:"-3px",
            userSelect:"none", pointerEvents:"none",
          }}>
            {meta.emoji}
          </div>

          {/* Asset count badge */}
          <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
            style={{ background:"rgba(0,0,0,0.28)", zIndex:10 }}>
            <RiBox3Line className="w-3 h-3" />
            {assetCount}
          </div>

          {/* Emoji + name row — fully inside header */}
          <div className="relative flex items-center gap-3.5 mt-1" style={{ zIndex:5 }}>
            <div
              className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center text-[28px] select-none"
              style={{ background:"rgba(0,0,0,0.22)", border:"2.5px solid rgba(255,255,255,0.25)" }}>
              {meta.emoji}
            </div>
            <div className="min-w-0 flex-1 pr-10">
              <p className="text-[17px] font-black text-white leading-tight truncate">{area.name}</p>
              <p className="text-[11px] font-semibold mt-0.5" style={{ color:"rgba(255,255,255,0.55)" }}>
                {area.type}{area.size ? ` · ${area.size}` : ""}
              </p>
            </div>
          </div>

          {/* Floor badge — bottom-left */}
          {area.floor && (
            <div className="absolute bottom-3.5 left-5 text-[10px] font-bold text-white/75 bg-black/25 px-2.5 py-0.5 rounded-full" style={{ zIndex:5 }}>
              {area.floor}
            </div>
          )}

          {/* Edit / delete — hover reveal */}
          <div className="absolute bottom-3.5 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ zIndex:10 }}>
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); }}
              className="w-7 h-7 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 border border-white/15 transition-all">
              <RiEditLine className="w-3.5 h-3.5" />
            </button>
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
              className="w-7 h-7 rounded-xl flex items-center justify-center text-white/60 hover:text-red-300 hover:bg-red-500/25 border border-white/15 transition-all">
              <RiDeleteBinLine className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ══ BODY ══ */}
        <div className="flex-1 flex flex-col px-5 pt-4 pb-4 gap-3">
          {area.description && (
            <p className="text-[12px] text-slate-400 line-clamp-2">{area.description}</p>
          )}

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
      </div>
    </Link>
  );
}

function AreaRow({ area, assetCount, last, onEdit, onDelete }) {
  const meta = typeMeta(area.type);
  return (
    <Link
      to={`/areas/${area.id}`}
      className={cn(
        "flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group",
        !last && "border-b border-slate-50",
      )}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 select-none"
        style={{ background: meta.grad }}
      >
        {meta.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-slate-800 truncate">
          {area.name}
        </p>
        <p className="text-[11px] text-slate-400">{area.floor ?? "—"}</p>
      </div>
      <span
        className="hidden sm:block text-[12px] font-semibold px-2.5 py-1 rounded-full shrink-0"
        style={{ background: meta.light, color: meta.text }}
      >
        {area.type ?? "—"}
      </span>
      <span className="hidden md:block text-[12px] text-slate-400 shrink-0">
        {area.floor ?? "—"}
      </span>
      <span className="text-[12px] text-slate-500 shrink-0 flex items-center gap-1">
        <RiBox3Line className="w-3.5 h-3.5 text-slate-400" />
        {assetCount}
      </span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit();
          }}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
        >
          <RiEditLine className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
        >
          <RiDeleteBinLine className="w-3.5 h-3.5" />
        </button>
      </div>
    </Link>
  );
}

function AreaModal({ open, onClose, area, floors, onSave }) {
  const { register, handleSubmit, reset } = useForm();
  useEffect(() => {
    if (!open) return;
    reset(
      area
        ? {
            name: area.name,
            type: area.type ?? "",
            floor: area.floor ?? "",
            size: area.size ?? "",
            description: area.description ?? "",
          }
        : {},
    );
  }, [open, area]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={area ? "Edit Area" : "Add New Area"}
      subtitle="Define a room or space in Shah House"
    >
      <form onSubmit={handleSubmit(onSave)} className="space-y-5">
        <Field label="Area Name" required>
          <Input
            {...register("name", { required: "Required" })}
            placeholder="e.g. Master Bedroom"
          />
        </Field>
        <FormGrid>
          <Field label="Area Type" required>
            <Select
              {...register("type", { required: "Required" })}
              placeholder="Select type"
              options={AREA_TYPES.map((t) => ({
                value: t,
                label: `${TYPE_META[t]?.emoji ?? "📍"} ${t}`,
              }))}
            />
          </Field>
          <Field label="Floor">
            <Select
              {...register("floor")}
              placeholder="Select floor"
              options={floors.map((f) => ({ value: f, label: f }))}
            />
          </Field>
        </FormGrid>
        <Field label="Size" hint="e.g. 45 sqm or 20 × 15 ft">
          <Input {...register("size")} placeholder="e.g. 45 sqm" />
        </Field>
        <Field label="Description / Notes">
          <Textarea
            {...register("description")}
            rows={2}
            placeholder="Special features, access notes…"
          />
        </Field>
        <FormActions
          onCancel={onClose}
          submitLabel={area ? "Update Area" : "Add Area"}
        />
      </form>
    </Modal>
  );
}
