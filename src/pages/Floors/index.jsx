import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  RiAddLine, RiBuilding2Line, RiEditLine, RiDeleteBinLine,
  RiMapPin2Line, RiArrowUpLine, RiArrowDownLine, RiCheckLine,
  RiStackLine,
} from 'react-icons/ri';
import {
  useGetQuery, usePostMutation, usePutMutation, useDeleteMutation,
} from '../../api/apiSlice';
import { selectCurrentPropertyId } from '../../store/slices/propertiesSlice';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Field, Input, Textarea, FormGrid, FormActions } from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import { cn } from '../../utils/cn';

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
  if (n === 0)    return 'Ground Floor';
  if (n < 0)      return `Basement ${Math.abs(n)}`;
  if (n === 1)    return '1st Floor';
  if (n === 2)    return '2nd Floor';
  if (n === 3)    return '3rd Floor';
  return `${n}th Floor`;
}

export default function FloorsPage() {
  const propertyId = useSelector(selectCurrentPropertyId);

  const { data: property = {} } = useGetQuery({ path: `/properties/${propertyId}` }, { skip: !propertyId });
  const { data: floorsRaw = [], isLoading } = useGetQuery(
    { path: '/floors', params: { propertyId } },
    { skip: !propertyId },
  );

  const [addMut]    = usePostMutation();
  const [updateMut] = usePutMutation();
  const [deleteMut] = useDeleteMutation();

  const [modal,     setModal]     = useState(null); // null | 'add' | floor-object
  const [delTarget, setDelTarget] = useState(null);

  // Sort by level ascending (already sorted by backend, but defensive)
  const floors = [...floorsRaw].sort((a, b) => a.level - b.level);

  const totalAreas  = floors.reduce((s, f) => s + (f.areaCount ?? 0), 0);
  const maxLevel    = floors.length ? Math.max(...floors.map((f) => f.level)) : 0;
  const minLevel    = floors.length ? Math.min(...floors.map((f) => f.level)) : 0;
  const hasBasement = minLevel < 0;

  const handleSave = async (data) => {
    try {
      const body = {
        name:        data.name?.trim(),
        level:       parseInt(data.level ?? 0, 10),
        description: data.description?.trim() ?? '',
        color:       data.color ?? '#0b1d3a',
      };
      if (modal === 'add') {
        await addMut({ path: '/floors', body: { ...body, propertyId } }).unwrap();
        toast.success(`Floor "${body.name}" added`);
      } else {
        await updateMut({ path: `/floors/${modal.id}`, body }).unwrap();
        toast.success(`Floor "${body.name}" updated`);
      }
      setModal(null);
    } catch (err) {
      toast.error(err.data?.error || 'Failed to save floor');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMut({ path: `/floors/${delTarget.id}` }).unwrap();
      toast.success(`"${delTarget.name}" deleted — areas unassigned`);
      setDelTarget(null);
    } catch (err) {
      toast.error(err.data?.error || 'Failed to delete floor');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#0b1d3a' }}>
              <RiStackLine className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {property.name ?? 'Shah House'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Floors</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">
            {floors.length} floor{floors.length !== 1 ? 's' : ''} · {totalAreas} areas configured
          </p>
        </div>
        <Button variant="primary" icon={RiAddLine} onClick={() => setModal('add')}>Add Floor</Button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Floors',   value: floors.length,  color: '#0b1d3a', bg: '#f0f5ff', icon: RiStackLine     },
          { label: 'Total Areas',    value: totalAreas,     color: '#1d4ed8', bg: '#eff6ff', icon: RiMapPin2Line    },
          { label: 'Highest Level',  value: maxLevel,       color: '#0f766e', bg: '#f0fdfa', icon: RiArrowUpLine    },
          { label: 'Basement Levels',value: hasBasement ? Math.abs(minLevel) : 0, color: '#7c3aed', bg: '#f5f3ff', icon: RiArrowDownLine },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col gap-2"
            style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: s.bg }}>
              <s.icon className="w-4.5 h-4.5" style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[12px] text-slate-400 mt-0.5">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Building diagram ── */}
      {floors.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">Building Layout</p>
          <div className="flex flex-col gap-1.5">
            {[...floors].reverse().map((floor, i) => {
              const barPct = totalAreas > 0 ? Math.round((floor.areaCount / totalAreas) * 100) : 0;
              return (
                <div key={floor.id} className="flex items-center gap-3">
                  {/* Level chip */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-black text-white shrink-0"
                    style={{ background: floor.color ?? '#0b1d3a' }}>
                    {floor.level}
                  </div>
                  {/* Bar */}
                  <div className="flex-1 flex items-center gap-3 min-w-0">
                    <div className="flex-1 h-8 rounded-xl bg-slate-50 overflow-hidden relative">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(barPct, 6)}%` }}
                        transition={{ delay: i * 0.08 + 0.2, duration: 0.5, ease: 'easeOut' }}
                        className="absolute inset-y-0 left-0 rounded-xl flex items-center px-3"
                        style={{ background: `${floor.color ?? '#0b1d3a'}18`, border: `1px solid ${floor.color ?? '#0b1d3a'}28` }}>
                        <span className="text-[11px] font-bold truncate" style={{ color: floor.color ?? '#0b1d3a' }}>
                          {floor.name}
                        </span>
                      </motion.div>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400 shrink-0 w-14 text-right">
                      {floor.areaCount} area{floor.areaCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!isLoading && floors.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <RiStackLine className="w-8 h-8 text-slate-300" />
          </div>
          <p className="font-bold text-slate-500 text-[15px]">No floors defined</p>
          <p className="text-slate-400 text-[13px] mt-1 mb-4">
            Add floors to organise your areas and assets by building level.
          </p>
          <button onClick={() => setModal('add')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-[13px] text-white"
            style={{ background: '#0b1d3a' }}>
            <RiAddLine className="w-4 h-4" />Add First Floor
          </button>
        </div>
      )}

      {/* ── Floor cards ── */}
      {floors.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {floors.map((floor, i) => (
              <motion.div key={floor.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }} transition={{ delay: i * 0.05 }}>
                <FloorCard
                  floor={floor}
                  onEdit={() => setModal(floor)}
                  onDelete={() => setDelTarget(floor)}
                />
              </motion.div>
            ))}

            {/* Add card */}
            <motion.button key="add-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              onClick={() => setModal('add')}
              className="min-h-[180px] rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center transition-all">
                <RiAddLine className="w-6 h-6" />
              </div>
              <div className="text-center">
                <p className="text-[14px] font-bold">Add Floor</p>
                <p className="text-[12px] mt-0.5 opacity-70">Define a new level</p>
              </div>
            </motion.button>
          </AnimatePresence>
        </div>
      )}

      {/* ── Modals ── */}
      <FloorModal
        open={modal !== null}
        floor={modal !== 'add' ? modal : null}
        onClose={() => setModal(null)}
        onSave={handleSave}
        floors={floors}
      />

      <ConfirmDialog
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={handleDelete}
        title="Delete Floor"
        message={
          delTarget?.areaCount > 0
            ? `Delete "${delTarget?.name}"? The ${delTarget?.areaCount} area${delTarget?.areaCount !== 1 ? 's' : ''} on this floor will be unassigned from it automatically.`
            : `Delete "${delTarget?.name}"? This cannot be undone.`
        }
      />
    </motion.div>
  );
}

/* ── Floor Card ── */
function FloorCard({ floor, onEdit, onDelete }) {
  const accent = floor.color ?? '#0b1d3a';

  return (
    <div className="group rounded-3xl overflow-hidden bg-white flex flex-col"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.08)' }}>

      {/* Header */}
      <div className="relative px-5 pt-5 pb-5 overflow-hidden"
        style={{ background: `linear-gradient(150deg, ${accent}f0 0%, ${accent} 100%)` }}>

        {/* Top accent line */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.3)' }} />
        {/* Decorative ring */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.12)', pointerEvents: 'none' }} />
        {/* Ghost level number */}
        <div style={{ position: 'absolute', right: 16, bottom: -8, fontSize: 80, fontWeight: 900, lineHeight: 1, color: 'rgba(255,255,255,0.07)', userSelect: 'none', pointerEvents: 'none' }}>
          {floor.level}
        </div>

        {/* Level badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold mb-3"
          style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}>
          <RiBuilding2Line className="w-3 h-3" />
          {levelLabel(floor.level)}
        </div>

        <h3 className="text-[20px] font-black text-white leading-tight tracking-tight relative z-10">{floor.name}</h3>

        {floor.description && (
          <p className="text-[12px] mt-1 relative z-10" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {floor.description}
          </p>
        )}

        {/* Edit / delete */}
        <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ zIndex: 10 }}>
          <button onClick={onEdit}
            className="w-7 h-7 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 border border-white/15 transition-all">
            <RiEditLine className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete}
            className="w-7 h-7 rounded-xl flex items-center justify-center text-white/60 hover:text-red-300 hover:bg-red-500/25 border border-white/15 transition-all">
            <RiDeleteBinLine className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: accent }}>
            <RiMapPin2Line className="w-4 h-4" />
            {floor.areaCount} area{floor.areaCount !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Color swatch */}
          <div className="w-4 h-4 rounded-full border-2 border-white shadow-sm" style={{ background: accent }} />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
            L{floor.level >= 0 ? '+' : ''}{floor.level}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Add / Edit Modal ── */
function FloorModal({ open, floor, onClose, onSave, floors }) {
  const { register, handleSubmit, reset, watch, setValue } = useForm();
  const selectedColor = watch('color', floor?.color ?? '#0b1d3a');

  useEffect(() => {
    if (!open) return;
    if (floor) {
      reset({ name: floor.name, level: floor.level ?? 0, description: floor.description ?? '', color: floor.color ?? '#0b1d3a' });
    } else {
      // Suggest next level
      const nextLevel = floors.length > 0 ? Math.max(...floors.map((f) => f.level)) + 1 : 0;
      reset({ name: '', level: nextLevel, description: '', color: '#0b1d3a' });
    }
  }, [open, floor]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={floor ? 'Edit Floor' : 'Add New Floor'}
      subtitle={floor ? `Updating "${floor.name}"` : 'Define a level in Shah House'}
    >
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
          <Textarea {...register('description')} rows={2} placeholder="e.g. Main living area, bedrooms, pool deck…" />
        </Field>

        <Field label="Accent Color">
          <div className="flex flex-wrap gap-2 mt-1">
            {FLOOR_COLORS.map((c) => (
              <button key={c.value} type="button" onClick={() => setValue('color', c.value)}
                className="relative w-9 h-9 rounded-xl border-2 transition-all"
                style={{
                  background: c.value,
                  borderColor: selectedColor === c.value ? '#fff' : c.value,
                  boxShadow: selectedColor === c.value ? `0 0 0 2px ${c.value}` : 'none',
                }}
                title={c.label}>
                {selectedColor === c.value && (
                  <RiCheckLine className="w-4 h-4 text-white absolute inset-0 m-auto" />
                )}
              </button>
            ))}
          </div>
          {/* Preview */}
          <div className="mt-3 flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: `${selectedColor}12`, border: `1px solid ${selectedColor}30` }}>
            <div className="w-7 h-7 rounded-lg" style={{ background: selectedColor }} />
            <div>
              <p className="text-[12px] font-bold" style={{ color: selectedColor }}>
                {watch('name') || 'Floor Name'}
              </p>
              <p className="text-[10px] text-slate-400">
                {levelLabel(parseInt(watch('level') ?? 0, 10))}
              </p>
            </div>
          </div>
          {/* Hidden input so react-hook-form tracks it */}
          <input type="hidden" {...register('color')} />
        </Field>

        <FormActions onCancel={onClose} submitLabel={floor ? 'Update Floor' : 'Add Floor'} />
      </form>
    </Modal>
  );
}
