import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  RiAddLine, RiSearchLine, RiLayoutGridLine, RiListCheck2,
  RiEditLine, RiDeleteBinLine, RiEyeLine, RiDownloadLine,
  RiFolderOpenLine, RiUploadLine, RiHardDriveLine, RiCalendarLine,
} from 'react-icons/ri';
import { selectDocuments, addDocument, updateDocument, deleteDocument } from '../../store/slices/documentsSlice';
import { DOC_CATEGORIES, FILE_TYPE_CFG, CAT_CFG } from '../../data/mockDocuments';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Field, Input, Select, Textarea, FormGrid, FormActions } from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import { cn } from '../../utils/cn';

const FILE_TYPES = ['pdf','docx','xlsx','jpg','png','dwg'];
function fmtDate(s) { return s ? new Date(s+'T00:00:00').toLocaleDateString('en-AE',{day:'numeric',month:'short',year:'numeric'}) : '—'; }

export default function DocumentsPage() {
  const dispatch   = useDispatch();
  const documents  = useSelector(selectDocuments);
  const [search,   setSearch]    = useState('');
  const [category, setCategory]  = useState('All');
  const [view,     setView]      = useState('grid');
  const [dragOver, setDragOver]  = useState(false);
  const [modal,    setModal]     = useState(null);
  const [delTarget,setDelTarget] = useState(null);

  const filtered = documents.filter((d) => {
    const q = search.toLowerCase();
    return (d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q))
      && (category === 'All' || d.category === category);
  });

  const totalSizeMB = documents.reduce((s, d) => s + parseFloat(d.size) || 0, 0).toFixed(1);

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 tracking-tight">Documents</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">{documents.length} files · store contracts, invoices, manuals and more</p>
        </div>
        <Button variant="primary" icon={RiAddLine} onClick={() => setModal('add')}>Add Document</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:'Total Files',   value: documents.length,     icon: RiFolderOpenLine, color:'bg-navy-50 text-navy-700'       },
          { label:'Categories',    value: DOC_CATEGORIES.length-1, icon: RiCalendarLine, color:'bg-accent-50 text-accent-700'  },
          { label:'Storage Used',  value: `${totalSizeMB} MB`,  icon: RiHardDriveLine,  color:'bg-success-50 text-success-700' },
          { label:'Recent Upload', value: fmtDate(documents.slice().sort((a,b)=>b.date.localeCompare(a.date))[0]?.date), icon: RiUploadLine, color:'bg-warning-50 text-warning-700' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4" style={{ boxShadow: '0 1px 8px rgb(0 0 0/0.06)' }}>
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', s.color)}><s.icon className="w-5 h-5" /></div>
            <div><p className="text-[18px] font-bold text-navy-900 leading-none">{s.value}</p><p className="text-[12px] text-slate-400 mt-1">{s.label}</p></div>
          </motion.div>
        ))}
      </div>

      {/* Drag & drop zone */}
      <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); toast.success('File ready to add — fill in the details.'); setModal('add'); }}
        className={cn('border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer',
          dragOver ? 'border-accent-400 bg-accent-50' : 'border-slate-200 hover:border-accent-300 hover:bg-slate-50')}
        onClick={() => setModal('add')}>
        <RiUploadLine className={cn('w-7 h-7 mx-auto mb-2 transition-colors', dragOver ? 'text-accent-500' : 'text-slate-300')} />
        <p className="text-[13px] font-semibold text-slate-500">Drag & drop files here, or <span className="text-accent-600">click to add</span></p>
        <p className="text-[11px] text-slate-400 mt-1">PDF, DOCX, XLSX, JPG, PNG, DWG supported</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents…"
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

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {DOC_CATEGORIES.map((cat) => {
          const count = cat === 'All' ? documents.length : documents.filter((d) => d.category === cat).length;
          return (
            <button key={cat} onClick={() => setCategory(cat)}
              className={cn('flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[12px] font-semibold whitespace-nowrap border transition-all shrink-0',
                category === cat ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300')}>
              {cat}
              <span className={cn('text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center', category === cat ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500')}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <RiFolderOpenLine className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-semibold text-slate-400">{search ? `No results for "${search}"` : 'No documents in this category'}</p>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((doc, i) => (
              <motion.div key={doc.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ delay: i * 0.03 }}>
                <DocCard doc={doc} onEdit={() => setModal(doc)} onDelete={() => setDelTarget(doc)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {filtered.map((doc, i) => <DocRow key={doc.id} doc={doc} last={i === filtered.length-1} onEdit={() => setModal(doc)} onDelete={() => setDelTarget(doc)} />)}
        </div>
      )}

      <DocModal open={modal !== null} doc={modal !== 'add' ? modal : null}
        onClose={() => setModal(null)}
        onSave={(data) => {
          if (modal !== 'add') { dispatch(updateDocument({ ...modal, ...data })); toast.success('Document updated!'); }
          else { dispatch(addDocument(data)); toast.success('Document added!'); }
          setModal(null);
        }}
      />
      <ConfirmDialog open={!!delTarget} onClose={() => setDelTarget(null)}
        onConfirm={() => { dispatch(deleteDocument(delTarget.id)); toast.success('Document deleted'); setDelTarget(null); }}
        title="Delete Document" message={`Delete "${delTarget?.name}"?`}
      />
    </motion.div>
  );
}

function DocCard({ doc, onEdit, onDelete }) {
  const ft  = FILE_TYPE_CFG[doc.type] ?? FILE_TYPE_CFG.pdf;
  const cat = CAT_CFG[doc.category] ?? { bg: 'bg-slate-50', text: 'text-slate-600' };
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-md transition-all group" style={{ boxShadow: '0 1px 8px rgb(0 0 0/0.06)' }}>
      <div className={cn('h-1.5', cat.bg.replace('-50','-400'))} />
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-md uppercase', ft.bg, ft.text)}>{ft.label}</span>
          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-md', cat.bg, cat.text)}>{doc.category}</span>
        </div>
        <h3 className="text-[13px] font-bold text-slate-800 leading-tight mb-1 line-clamp-2">{doc.name}</h3>
        <p className="text-[11px] text-slate-400 line-clamp-1 mb-3">{doc.description}</p>
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-3">
          <span>{doc.size}</span><span>{fmtDate(doc.date)}</span>
        </div>
      </div>
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
        <button className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-accent-600 hover:bg-accent-50 transition-all" title="Preview"><RiEyeLine className="w-3.5 h-3.5" /></button>
        <button className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-success-600 hover:bg-success-50 transition-all" title="Download"><RiDownloadLine className="w-3.5 h-3.5" /></button>
        <button onClick={onEdit}   className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-accent-600 hover:bg-accent-50 transition-all" title="Edit"><RiEditLine className="w-3.5 h-3.5" /></button>
        <button onClick={onDelete} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-danger-500 hover:bg-danger-50 transition-all" title="Delete"><RiDeleteBinLine className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

function DocRow({ doc, last, onEdit, onDelete }) {
  const ft  = FILE_TYPE_CFG[doc.type] ?? FILE_TYPE_CFG.pdf;
  const cat = CAT_CFG[doc.category] ?? { bg: 'bg-slate-50', text: 'text-slate-600' };
  return (
    <div className={cn('flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group', !last && 'border-b border-slate-50')}>
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-bold uppercase shrink-0', ft.bg, ft.text)}>{ft.label}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-slate-800 truncate">{doc.name}</p>
        <p className="text-[11px] text-slate-400 truncate">{doc.description}</p>
      </div>
      <span className={cn('hidden sm:block text-[11px] font-semibold px-2.5 py-1 rounded-lg shrink-0', cat.bg, cat.text)}>{doc.category}</span>
      <span className="hidden md:block text-[12px] text-slate-400 shrink-0">{doc.size}</span>
      <span className="hidden lg:block text-[12px] text-slate-400 shrink-0">{fmtDate(doc.date)}</span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-accent-600 hover:bg-accent-50 transition-all"><RiEyeLine className="w-3.5 h-3.5" /></button>
        <button className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-success-600 hover:bg-success-50 transition-all"><RiDownloadLine className="w-3.5 h-3.5" /></button>
        <button onClick={onEdit}   className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-accent-600 hover:bg-accent-50 transition-all"><RiEditLine className="w-3.5 h-3.5" /></button>
        <button onClick={onDelete} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-danger-500 hover:bg-danger-50 transition-all"><RiDeleteBinLine className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

function DocModal({ open, onClose, doc, onSave }) {
  const { register, handleSubmit, reset } = useForm();
  useEffect(() => {
    if (!open) return;
    reset(doc ? { name: doc.name, category: doc.category, type: doc.type, size: doc.size, date: doc.date, description: doc.description } : { type: 'pdf', date: new Date().toISOString().split('T')[0] });
  }, [open, doc]);

  return (
    <Modal open={open} onClose={onClose} title={doc ? 'Edit Document' : 'Add Document'} subtitle="Record a document in the system">
      <form onSubmit={handleSubmit(onSave)} className="space-y-5">
        <Field label="Document Name" required>
          <Input {...register('name', { required: 'Required' })} placeholder="e.g. AC Maintenance Contract 2026" />
        </Field>
        <FormGrid>
          <Field label="Category" required>
            <Select {...register('category', { required: 'Required' })} placeholder="Select category"
              options={DOC_CATEGORIES.filter((c) => c !== 'All').map((c) => ({ value: c, label: c }))} />
          </Field>
          <Field label="File Type">
            <Select {...register('type')} options={FILE_TYPES.map((t) => ({ value: t, label: t.toUpperCase() }))} />
          </Field>
        </FormGrid>
        <FormGrid>
          <Field label="File Size" hint="e.g. 2.4 MB">
            <Input {...register('size')} placeholder="2.4 MB" />
          </Field>
          <Field label="Document Date">
            <Input {...register('date')} type="date" />
          </Field>
        </FormGrid>
        <Field label="Description">
          <Textarea {...register('description')} rows={2} placeholder="Brief description of this document…" />
        </Field>
        <FormActions onCancel={onClose} submitLabel={doc ? 'Update Document' : 'Add Document'} />
      </form>
    </Modal>
  );
}
