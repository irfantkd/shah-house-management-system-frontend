import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  RiAddLine, RiEditLine, RiDeleteBinLine, RiPhoneLine,
  RiMessage2Line, RiShieldLine, RiHeartLine, RiFlashlightLine, RiToolsLine,
} from 'react-icons/ri';
import { selectEmergency, addContact, updateContact, deleteContact } from '../../store/slices/emergencySlice';
import { EMERGENCY_CATEGORIES } from '../../data/mockEmergency';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Field, Input, Select, Textarea, FormGrid, FormActions } from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import { cn } from '../../utils/cn';

const CAT_ICONS = { emergency: RiShieldLine, medical: RiHeartLine, utilities: RiFlashlightLine, services: RiToolsLine };
const CAT_COLORS = {
  emergency: { section: 'bg-danger-100', icon: 'text-danger-600', header: 'text-danger-700' },
  medical:   { section: 'bg-blue-100',   icon: 'text-blue-600',   header: 'text-blue-700'   },
  utilities: { section: 'bg-warning-100',icon: 'text-warning-600',header: 'text-warning-700'},
  services:  { section: 'bg-navy-100',   icon: 'text-navy-600',   header: 'text-navy-700'   },
};

const AVATAR_OPTS = ['bg-danger-600','bg-orange-600','bg-blue-600','bg-blue-500','bg-teal-600','bg-warning-600','bg-purple-600','bg-orange-500','bg-accent-600','bg-navy-700','bg-navy-800','bg-success-700','bg-cyan-600'];

export default function EmergencyPage() {
  const dispatch   = useDispatch();
  const contacts   = useSelector(selectEmergency);
  const [modal,    setModal]     = useState(null);
  const [delTarget,setDelTarget] = useState(null);

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-danger-100 flex items-center justify-center">
            <RiShieldLine className="w-5 h-5 text-danger-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Emergency Contacts</h1>
            <p className="text-[13px] text-slate-400 mt-0.5">Quick access to emergency and essential service numbers</p>
          </div>
        </div>
        <Button variant="primary" icon={RiAddLine} onClick={() => setModal('add')}>Add Contact</Button>
      </div>

      {/* Emergency banner */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #991b1b 0%, #b91c1c 100%)' }}>
        <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-white font-bold text-[16px]">Life-Threatening Emergency?</p>
            <p className="text-red-200 text-[13px] mt-0.5">Police 999 Â· Ambulance 998 Â· Civil Defense 997</p>
          </div>
          <div className="flex gap-2">
            <a href="tel:999" className="flex items-center gap-2 bg-white text-danger-700 font-bold text-[14px] px-4 py-2.5 rounded-xl hover:bg-red-50 transition-all">
              <RiPhoneLine className="w-4 h-4" /> 999
            </a>
            <a href="tel:998" className="flex items-center gap-2 bg-white/10 border border-white/20 text-white font-bold text-[14px] px-4 py-2.5 rounded-xl hover:bg-white/20 transition-all">
              <RiPhoneLine className="w-4 h-4" /> 998
            </a>
          </div>
        </div>
      </div>

      {/* Categories */}
      {EMERGENCY_CATEGORIES.map((cat, ci) => {
        const catContacts = contacts.filter((c) => c.category === cat.id);
        const CatIcon = CAT_ICONS[cat.id] ?? RiShieldLine;
        const colors  = CAT_COLORS[cat.id] ?? CAT_COLORS.services;
        return (
          <motion.div key={cat.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ci * 0.08 }}>
            <div className="flex items-center gap-3 mb-4">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', colors.section)}>
                <CatIcon className={cn('w-4 h-4', colors.icon)} />
              </div>
              <h2 className={cn('text-[15px] font-bold', colors.header)}>{cat.label}</h2>
              <div className="flex-1 h-px bg-slate-100" />
              <button onClick={() => setModal({ category: cat.id })} className="text-[11px] font-bold text-accent-600 hover:underline flex items-center gap-1">
                <RiAddLine className="w-3.5 h-3.5" />Add
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {catContacts.map((contact, i) => (
                <ContactCard key={contact.id} contact={contact} index={i}
                  onEdit={() => setModal(contact)} onDelete={() => setDelTarget(contact)} />
              ))}
              {catContacts.length === 0 && (
                <div className="col-span-full bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center">
                  <button onClick={() => setModal({ category: cat.id })} className="text-[13px] font-semibold text-slate-400 hover:text-accent-600 transition-colors">
                    + Add {cat.label.toLowerCase()} contact
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}

      <ContactModal open={modal !== null} contact={modal !== 'add' && typeof modal === 'object' && modal?.id ? modal : null}
        defaultCategory={typeof modal === 'object' && modal?.category ? modal.category : undefined}
        onClose={() => setModal(null)}
        onSave={(data) => {
          if (modal?.id) { dispatch(updateContact({ ...modal, ...data })); toast.success('Contact updated!'); }
          else { dispatch(addContact(data)); toast.success('Contact added!'); }
          setModal(null);
        }}
      />
      <ConfirmDialog open={!!delTarget} onClose={() => setDelTarget(null)}
        onConfirm={() => { dispatch(deleteContact(delTarget.id)); toast.success('Contact deleted'); setDelTarget(null); }}
        title="Delete Contact" message={`Delete "${delTarget?.name}"?`}
      />
    </motion.div>
  );
}

function ContactCard({ contact: c, index, onEdit, onDelete }) {
  const isShort = c.phone.replace(/\s/g, '').length <= 5;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.06, duration: 0.25 }}>
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-md transition-all group" style={{ boxShadow: '0 1px 8px rgb(0 0 0/0.06)' }}>
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-[15px] shrink-0', c.avatar ?? 'bg-navy-700')}>
              {c.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[14px] font-bold text-slate-800 truncate">{c.name}</h3>
              <p className="text-[11px] text-slate-400">{c.role}</p>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button onClick={onEdit}   className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-accent-600 hover:bg-accent-50 transition-all"><RiEditLine className="w-3 h-3" /></button>
              <button onClick={onDelete} className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-danger-500 hover:bg-danger-50 transition-all"><RiDeleteBinLine className="w-3 h-3" /></button>
            </div>
          </div>
          <div className={cn('text-center py-2.5 rounded-xl mb-3', isShort ? 'bg-navy-900' : 'bg-slate-50')}>
            <p className={cn('font-bold tracking-wider', isShort ? 'text-2xl text-white' : 'text-[17px] text-navy-800')}>{c.phone}</p>
          </div>
          {c.notes && <p className="text-[11px] text-slate-400 text-center mb-3 leading-relaxed">{c.notes}</p>}
          <div className="flex gap-2">
            <a href={`tel:${c.phone.replace(/\s/g,'')}`}
              className="flex-1 flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 text-white text-[13px] font-semibold py-2.5 rounded-xl transition-all">
              <RiPhoneLine className="w-3.5 h-3.5" />Call
            </a>
            {!isShort && (
              <a href={`https://wa.me/${c.phone.replace(/[\s+]/g,'')}`}
                className="flex items-center justify-center gap-1.5 bg-success-500 hover:bg-success-600 text-white text-[13px] font-semibold px-3.5 py-2.5 rounded-xl transition-all">
                <RiMessage2Line className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ContactModal({ open, onClose, contact, defaultCategory, onSave }) {
  const { register, handleSubmit, reset } = useForm();
  useEffect(() => {
    if (!open) return;
    reset(contact ? { name: contact.name, role: contact.role, phone: contact.phone, category: contact.category, notes: contact.notes ?? '' }
      : { category: defaultCategory ?? 'services' });
  }, [open, contact, defaultCategory]);

  return (
    <Modal open={open} onClose={onClose} title={contact ? 'Edit Contact' : 'Add Emergency Contact'}>
      <form onSubmit={handleSubmit(onSave)} className="space-y-5">
        <FormGrid>
          <Field label="Name" required>
            <Input {...register('name', { required: 'Required' })} placeholder="e.g. Dubai Police" />
          </Field>
          <Field label="Role / Department" required>
            <Input {...register('role', { required: 'Required' })} placeholder="e.g. Emergency / Crime" />
          </Field>
        </FormGrid>
        <FormGrid>
          <Field label="Phone Number" required>
            <Input {...register('phone', { required: 'Required' })} placeholder="e.g. 999 or +971 4 XXX XXXX" />
          </Field>
          <Field label="Category" required>
            <Select {...register('category', { required: 'Required' })}
              options={EMERGENCY_CATEGORIES.map((c) => ({ value: c.id, label: c.label }))} />
          </Field>
        </FormGrid>
        <Field label="Notes">
          <Textarea {...register('notes')} rows={2} placeholder="24/7 available, best contact method, addressâ€¦" />
        </Field>
        <FormActions onCancel={onClose} submitLabel={contact ? 'Update Contact' : 'Add Contact'} />
      </form>
    </Modal>
  );
}
