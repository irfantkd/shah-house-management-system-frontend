import { useRef, useState } from 'react';
import { FileText, Image, ExternalLink, Calendar, Upload, Trash2, Loader2, Plus, X, FileCheck, File } from 'lucide-react';
import EmptyState from '../../../components/ui/EmptyState';
import { cn } from '../../../utils/cn';
import { useGetQuery } from '../../../api/apiSlice';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL;

const CAT = {
  registration: { bg: '#dbeafe', color: '#1d4ed8', label: 'Registration' },
  insurance:    { bg: '#dcfce7', color: '#15803d', label: 'Insurance'    },
  purchase:     { bg: '#fef9c3', color: '#a16207', label: 'Purchase'     },
  service:      { bg: '#f3e8ff', color: '#7e22ce', label: 'Service'      },
  photo:        { bg: '#cffafe', color: '#0e7490', label: 'Photo'        },
  other:        { bg: '#f1f5f9', color: '#475569', label: 'Other'        },
};
const FILTERS = ['all', 'registration', 'insurance', 'purchase', 'service', 'photo', 'other'];

const IMAGE_EXTS = ['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF'];
const isImg = (ft) => ft && IMAGE_EXTS.includes(ft.toUpperCase());
const isPdf = (ft) => ft && ft.toUpperCase() === 'PDF';

const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function FileIcon({ fileType, url, className }) {
  if (isImg(fileType) && url) {
    return (
      <img src={url} alt="preview"
        className={cn('object-cover rounded-xl', className)}
        style={{ width: '100%', height: '100%' }} />
    );
  }
  if (isPdf(fileType)) {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-0.5', className)}>
        <FileCheck className="w-6 h-6 text-red-500" />
        <span className="text-[9px] font-black text-red-500 tracking-wider">PDF</span>
      </div>
    );
  }
  const ext = fileType?.toUpperCase() ?? '';
  if (['DOC', 'DOCX'].includes(ext)) return (
    <div className={cn('flex flex-col items-center justify-center gap-0.5', className)}>
      <FileText className="w-6 h-6 text-blue-500" />
      <span className="text-[9px] font-black text-blue-500 tracking-wider">DOC</span>
    </div>
  );
  if (['XLS', 'XLSX'].includes(ext)) return (
    <div className={cn('flex flex-col items-center justify-center gap-0.5', className)}>
      <File className="w-6 h-6 text-green-600" />
      <span className="text-[9px] font-black text-green-600 tracking-wider">XLS</span>
    </div>
  );
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <FileText className="w-6 h-6 text-slate-400" />
    </div>
  );
}

export default function DocumentsTab({ car }) {
  const token = useSelector((s) => s.auth?.token);
  const { data: freshCar, refetch } = useGetQuery({ path: `/cars/${car.id}` });
  const activeCar = freshCar ?? car;
  const docs = activeCar.documents ?? [];

  const [filter,     setFilter]     = useState('all');
  const [uploading,  setUploading]  = useState(false);
  const [deleting,   setDeleting]   = useState(null);
  const [showForm,   setShowForm]   = useState(false);
  const [docName,    setDocName]    = useState('');
  const [docCat,     setDocCat]     = useState('other');
  const [pickedFile, setPickedFile] = useState(null);
  const [preview,    setPreview]    = useState(null);
  const fileRef = useRef(null);

  const filtered = docs.filter((d) => filter === 'all' || d.category === filter);

  const handleFilePick = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPickedFile(file);
    if (!docName) setDocName(file.name.replace(/\.[^.]+$/, ''));
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target.result);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
    setShowForm(true);
    e.target.value = '';
  };

  const cancelForm = () => {
    setShowForm(false); setPickedFile(null);
    setDocName(''); setDocCat('other'); setPreview(null);
  };

  const handleUpload = async () => {
    if (!pickedFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', pickedFile);
      fd.append('name', docName || pickedFile.name);
      fd.append('category', docCat);
      const res = await fetch(`${API_URL}/cars/${car.id}/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Upload failed');
      toast.success('Document uploaded');
      cancelForm();
      refetch();
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.name}"?`)) return;
    setDeleting(doc.id);
    try {
      const res = await fetch(`${API_URL}/cars/${car.id}/documents/${doc.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Delete failed');
      toast.success('Document deleted');
      refetch();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Category filters — horizontal scroll on mobile */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-xl text-[12px] font-semibold capitalize transition-all',
                filter === f
                  ? 'bg-navy-900 text-white shadow-sm'
                  : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300',
              )}>
              {f === 'all' ? `All (${docs.length})` : (CAT[f]?.label ?? f)}
            </button>
          ))}
        </div>

        <button onClick={() => fileRef.current?.click()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white shrink-0 sm:ml-auto transition-all hover:opacity-90 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #0b1d3a, #1e3a6e)' }}>
          <Upload className="w-3.5 h-3.5" />
          Upload Document
        </button>
        <input ref={fileRef} type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
          className="hidden" onChange={handleFilePick} />
      </div>

      {/* ── Upload form ── */}
      {showForm && pickedFile && (
        <div className="rounded-2xl border border-blue-200 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)' }}>
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <p className="text-[12px] font-bold text-blue-700 uppercase tracking-wider">New Document</p>
            <button onClick={cancelForm} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-100 text-blue-400">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-4 pb-4 space-y-3">
            {/* Preview for images */}
            {preview && (
              <div className="w-full h-40 rounded-xl overflow-hidden border border-blue-200">
                <img src={preview} alt="preview" className="w-full h-full object-cover" />
              </div>
            )}

            {/* File info pill */}
            <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-200">
              <FileText className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-[12px] text-slate-600 truncate flex-1">{pickedFile.name}</span>
              <span className="text-[11px] text-slate-400 shrink-0">{fmtSize(pickedFile.size)}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Document Name</label>
                <input value={docName} onChange={(e) => setDocName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white transition-all"
                  placeholder="e.g. Vehicle Registration" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
                <select value={docCat} onChange={(e) => setDocCat(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white transition-all">
                  {Object.entries(CAT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={cancelForm}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 transition-all">
                Cancel
              </button>
              <button onClick={handleUpload} disabled={uploading || !docName.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all disabled:opacity-60 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #0b1d3a, #1e3a6e)' }}>
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                {uploading ? 'Uploading…' : 'Save Document'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Image grid (photos only) ── */}
      {(() => {
        const photos = filtered.filter((d) => isImg(d.fileType));
        if (photos.length === 0 || (filter !== 'all' && filter !== 'photo')) return null;
        return (
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Photos</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {photos.map((doc) => {
                const isDel = deleting === doc.id;
                return (
                  <div key={doc.id} className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-square">
                    <img src={doc.url} alt={doc.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/45 transition-all flex items-end p-2 gap-1.5">
                      <div className="opacity-0 group-hover:opacity-100 transition-all flex gap-1.5 w-full">
                        <a href={doc.url} target="_blank" rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-white/90 text-[11px] font-bold text-slate-700 hover:bg-white transition-all">
                          <ExternalLink className="w-3 h-3" /> Open
                        </a>
                        <button onClick={() => handleDelete(doc)} disabled={isDel}
                          className="w-8 flex items-center justify-center rounded-lg bg-red-500/90 hover:bg-red-500 text-white transition-all disabled:opacity-50">
                          {isDel ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                    {/* Name tag at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-all"
                      style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
                      <p className="text-[10px] font-semibold text-white truncate">{doc.name}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── File documents list ── */}
      {(() => {
        const files = filtered.filter((d) => !isImg(d.fileType));
        if (files.length === 0) return null;
        return (
          <div>
            {filtered.some((d) => isImg(d.fileType)) && filter === 'all' && (
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4">Files</p>
            )}
            <div className="space-y-2">
              {files.map((doc) => {
                const cat = CAT[doc.category] ?? CAT.other;
                const isDel = deleting === doc.id;
                return (
                  <div key={doc.id}
                    className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 p-3 sm:p-4 hover:shadow-sm transition-all"
                    style={{ boxShadow: 'var(--shadow-card)' }}>

                    {/* File type thumbnail */}
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl shrink-0 overflow-hidden flex items-center justify-center"
                      style={{ background: isPdf(doc.fileType) ? '#fff1f2' : cat.bg }}>
                      <FileIcon fileType={doc.fileType} url={doc.url} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] sm:text-[14px] font-semibold text-slate-800 truncate">{doc.name}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: cat.bg, color: cat.color }}>
                          {cat.label}
                        </span>
                        {doc.fileType && (
                          <span className="text-[11px] text-slate-400">
                            {doc.fileType}{doc.size ? ` · ${fmtSize(doc.size)}` : ''}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-300 hidden sm:inline">·</span>
                        <span className="text-[11px] text-slate-400 hidden sm:flex items-center gap-1">
                          <Calendar className="w-3 h-3" />{fmtDate(doc.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a href={doc.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[12px] font-semibold text-slate-600 transition-all">
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Open</span>
                      </a>
                      <button onClick={() => handleDelete(doc)} disabled={isDel}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 transition-all disabled:opacity-50">
                        {isDel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Empty state ── */}
      {filtered.length === 0 && !showForm && (
        <EmptyState icon={FileText} title="No documents"
          description="Upload registration, insurance, invoices and photos for this vehicle." />
      )}

      {/* ── Info banner ── */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50 border border-blue-100">
        <FileText className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-[12px] font-bold text-blue-700 mb-0.5">Important Vehicle Documents</p>
          <p className="text-[12px] text-blue-600 leading-relaxed">
            Keep Mulkiya (registration), insurance, and service invoices readily available.
            Dubai Police requires a valid registration card at all times. All files stored securely in the cloud.
          </p>
        </div>
      </div>
    </div>
  );
}
