import { useRef, useState } from 'react';
import { FileText, Image, Download, Calendar, Upload, Trash2, Loader2, Plus } from 'lucide-react';
import EmptyState from '../../../components/ui/EmptyState';
import { cn } from '../../../utils/cn';
import { useGetQuery } from '../../../api/apiSlice';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL;

const CAT = {
  registration: { bg: '#e0f2fe', color: '#0891b2', label: 'Registration' },
  insurance:    { bg: '#f0fdf4', color: '#16a34a', label: 'Insurance'    },
  purchase:     { bg: '#fffbeb', color: '#d97706', label: 'Purchase'     },
  service:      { bg: '#f5f3ff', color: '#7c3aed', label: 'Service'      },
  photo:        { bg: '#ecfeff', color: '#0891b2', label: 'Photo'        },
  other:        { bg: '#f8fafc', color: '#64748b', label: 'Other'        },
};
const FILTERS = ['all', 'registration', 'insurance', 'purchase', 'service', 'photo', 'other'];
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

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
  const fileRef = useRef(null);

  const filtered = docs.filter((d) => filter === 'all' || d.category === filter);

  const handleFilePick = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPickedFile(file);
    if (!docName) setDocName(file.name.replace(/\.[^.]+$/, ''));
    setShowForm(true);
    e.target.value = '';
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
      setShowForm(false); setDocName(''); setDocCat('other'); setPickedFile(null);
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
    <div className="space-y-5">

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[12px] font-semibold capitalize transition-all',
                filter === f ? 'bg-navy-900 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300',
              )}>
              {f === 'all' ? `All (${docs.length})` : (CAT[f]?.label ?? f)}
            </button>
          ))}
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white shrink-0 transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #0b1d3a, #1e3a6e)' }}>
          <Upload className="w-3.5 h-3.5" />
          Upload Document
        </button>
        <input ref={fileRef} type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
          className="hidden" onChange={handleFilePick} />
      </div>

      {/* Upload form (shows after file picked) */}
      {showForm && pickedFile && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
          <p className="text-[12px] font-bold text-blue-700 uppercase tracking-wide">New Document</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Document Name</label>
              <input value={docName} onChange={(e) => setDocName(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:border-blue-400 bg-white"
                placeholder="e.g. Vehicle Registration" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Category</label>
              <select value={docCat} onChange={(e) => setDocCat(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:border-blue-400 bg-white">
                {Object.entries(CAT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200">
            <FileText className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-[12px] text-slate-600 truncate flex-1">{pickedFile.name}</span>
            <span className="text-[11px] text-slate-400 shrink-0">{fmtSize(pickedFile.size)}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setShowForm(false); setPickedFile(null); setDocName(''); setDocCat('other'); }}
              className="flex-1 py-2 rounded-xl text-[13px] font-semibold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 transition-all">
              Cancel
            </button>
            <button onClick={handleUpload} disabled={uploading || !docName.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[13px] font-bold text-white transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #0b1d3a, #1e3a6e)' }}>
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {uploading ? 'Uploading…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Doc list */}
      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No documents"
          description="Upload registration, insurance, invoices and photos for this vehicle." />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((doc) => {
            const cat     = CAT[doc.category] ?? CAT.other;
            const isImage = doc.fileType && ['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF'].includes(doc.fileType.toUpperCase());
            const isDel   = deleting === doc.id;
            return (
              <div key={doc.id}
                className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4 hover:shadow-sm transition-all"
                style={{ boxShadow: 'var(--shadow-card)' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: cat.bg }}>
                  {isImage
                    ? <Image    className="w-5 h-5" style={{ color: cat.color }} />
                    : <FileText className="w-5 h-5" style={{ color: cat.color }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800 truncate">{doc.name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: cat.bg, color: cat.color }}>{cat.label}</span>
                    {doc.fileType && <span className="text-[11px] text-slate-400">{doc.fileType}{doc.size ? ` · ${fmtSize(doc.size)}` : ''}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right hidden sm:block">
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-1">
                      <Calendar className="w-3 h-3" />
                      {fmtDate(doc.createdAt)}
                    </div>
                  </div>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[12px] font-semibold text-slate-600 transition-all">
                    <Download className="w-3 h-3" />
                    <span className="hidden sm:inline">Open</span>
                  </a>
                  <button onClick={() => handleDelete(doc)} disabled={isDel}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 transition-all disabled:opacity-50">
                    {isDel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info banner */}
      <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-start gap-3">
        <FileText className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-[12px] font-bold text-blue-700 mb-0.5">Important Vehicle Documents</p>
          <p className="text-[12px] text-blue-600 leading-relaxed">
            Keep Mulkiya (registration), insurance, and service invoices readily available.
            Dubai Police requires a valid registration card while driving at all times.
            Files are stored securely in the cloud.
          </p>
        </div>
      </div>
    </div>
  );
}
