import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Images, FileText, Car, Home, Search, ExternalLink, Eye,
  Trash2, Loader2, FolderOpen, Upload, X, Plus, FileCheck, File, Download,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { useGetQuery } from '../../api/apiSlice';
import { selectCurrentPropertyId } from '../../store/slices/propertiesSlice';
import ImageLightbox from '../../components/ui/ImageLightbox';
import EmptyState from '../../components/ui/EmptyState';
import { compressImage } from '../../utils/compressImage';
import { downloadFile } from '../../utils/downloadFile';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL;

const IMAGE_EXTS = ['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF'];
const isImg = (ft) => IMAGE_EXTS.includes((ft ?? '').toUpperCase());
const isPdf = (ft) => (ft ?? '').toUpperCase() === 'PDF';

const fmtDate  = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtSize  = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const CAR_DOC_CATS  = ['insurance', 'registration', 'service', 'invoice', 'warranty', 'photo', 'other'];
const PROP_DOC_CATS = ['deed', 'insurance', 'utility', 'permit', 'contract', 'invoice', 'photo', 'other'];
const CAT_LABELS    = {
  deed: 'Title Deed', insurance: 'Insurance', registration: 'Registration',
  utility: 'Utility', permit: 'Permit', contract: 'Contract',
  invoice: 'Invoice', service: 'Service', warranty: 'Warranty',
  photo: 'Photo', other: 'Other',
};

const TABS = [
  { id: 'all',      label: 'All Media', icon: FolderOpen },
  { id: 'images',   label: 'Images',    icon: Images     },
  { id: 'docs',     label: 'Documents', icon: FileText   },
  { id: 'cars',     label: 'Car Media', icon: Car        },
  { id: 'property', label: 'Property',  icon: Home       },
];

function FileThumb({ fileType, url }) {
  if (isImg(fileType) && url) return <img src={url} alt="" className="w-full h-full object-cover rounded-xl" />;
  if (isPdf(fileType)) return (
    <div className="flex flex-col items-center justify-center gap-0.5 w-full h-full">
      <FileCheck className="w-5 h-5 text-red-500" /><span className="text-[8px] font-black text-red-500">PDF</span>
    </div>
  );
  const ext = (fileType ?? '').toUpperCase();
  if (['DOC','DOCX'].includes(ext)) return (
    <div className="flex flex-col items-center justify-center gap-0.5 w-full h-full">
      <FileText className="w-5 h-5 text-blue-500" /><span className="text-[8px] font-black text-blue-500">DOC</span>
    </div>
  );
  if (['XLS','XLSX'].includes(ext)) return (
    <div className="flex flex-col items-center justify-center gap-0.5 w-full h-full">
      <File className="w-5 h-5 text-green-600" /><span className="text-[8px] font-black text-green-600">XLS</span>
    </div>
  );
  return <div className="flex items-center justify-center w-full h-full"><FileText className="w-5 h-5 text-slate-400" /></div>;
}

export default function MediaPage() {
  const token      = useSelector((s) => s.auth?.token);
  const propertyId = useSelector(selectCurrentPropertyId);

  const { data: cars = [],  isLoading: carsLoading, refetch: refetchCars } =
    useGetQuery({ path: '/cars', params: { propertyId } }, { skip: !propertyId });
  const { data: property,   isLoading: propLoading, refetch: refetchProp } =
    useGetQuery({ path: `/properties/${propertyId}` },    { skip: !propertyId });

  const [tab,      setTab]      = useState('all');
  const [search,   setSearch]   = useState('');
  const [lightbox, setLightbox] = useState({ open: false, items: [], idx: 0 });
  const [deleting, setDeleting] = useState(null);
  const [showUpload, setShowUpload] = useState(false);

  // ── Upload form state ──
  const [pickedFile,   setPickedFile]   = useState(null);
  const [preview,      setPreview]      = useState(null);
  const [destSource,   setDestSource]   = useState('property'); // 'property' | 'car'
  const [destCarId,    setDestCarId]    = useState('');
  const [destCarType,  setDestCarType]  = useState('document'); // 'image' | 'document'
  const [uploadName,   setUploadName]   = useState('');
  const [uploadCat,    setUploadCat]    = useState('other');
  const [uploading,    setUploading]    = useState(false);
  const fileRef = useRef(null);

  // ── Build unified media list ──
  const allMedia = useMemo(() => {
    const list = [];
    cars.forEach((car) => {
      (car.images ?? []).forEach((img) => {
        const url = typeof img === 'string' ? img : img.url;
        list.push({
          id: img.id ?? img._id ?? url, url,
          name: `${car.name ?? car.make ?? 'Car'} photo`,
          fileType: 'JPG', source: 'car',
          sourceId: car.id ?? car._id,
          sourceName: car.name ?? `${car.make ?? ''} ${car.model ?? ''}`.trim(),
          sourceIcon: 'car', kind: 'image',
          createdAt: img.createdAt ?? car.createdAt,
          deleteEndpoint: `/cars/${car.id ?? car._id}/images/${img.id ?? img._id}`,
        });
      });
      (car.documents ?? []).forEach((doc) => {
        list.push({
          id: doc.id ?? doc._id, url: doc.url,
          name: doc.name ?? 'Document',
          fileType: doc.fileType, source: 'car',
          sourceId: car.id ?? car._id,
          sourceName: car.name ?? `${car.make ?? ''} ${car.model ?? ''}`.trim(),
          sourceIcon: 'car', kind: isImg(doc.fileType) ? 'image' : 'doc',
          category: doc.category, size: doc.size, createdAt: doc.createdAt,
          deleteEndpoint: `/cars/${car.id ?? car._id}/documents/${doc.id ?? doc._id}`,
        });
      });
    });
    (property?.documents ?? []).forEach((doc) => {
      list.push({
        id: doc.id ?? doc._id, url: doc.url,
        name: doc.name ?? 'Document',
        fileType: doc.fileType, source: 'property',
        sourceId: propertyId,
        sourceName: property?.name ?? 'Property',
        sourceIcon: 'home', kind: isImg(doc.fileType) ? 'image' : 'doc',
        category: doc.category, size: doc.size, createdAt: doc.createdAt,
        deleteEndpoint: `/properties/${propertyId}/documents/${doc.id ?? doc._id}`,
      });
    });
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [cars, property, propertyId]);

  const filtered = useMemo(() => {
    let list = allMedia;
    if (tab === 'images')   list = list.filter((m) => m.kind === 'image');
    if (tab === 'docs')     list = list.filter((m) => m.kind === 'doc');
    if (tab === 'cars')     list = list.filter((m) => m.source === 'car');
    if (tab === 'property') list = list.filter((m) => m.source === 'property');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((m) => m.name.toLowerCase().includes(q) || m.sourceName?.toLowerCase().includes(q));
    }
    return list;
  }, [allMedia, tab, search]);

  const imageItems = filtered.filter((m) => m.kind === 'image');
  const images     = imageItems;
  const docs       = filtered.filter((m) => m.kind === 'doc');

  const openLightbox = (item) => {
    const idx = imageItems.findIndex((m) => m.id === item.id);
    setLightbox({ open: true, items: imageItems.map((m) => ({ url: m.url, name: m.name, fileType: m.fileType })), idx: Math.max(idx, 0) });
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    setDeleting(item.id);
    try {
      const res  = await fetch(`${API_URL}${item.deleteEndpoint}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Delete failed');
      toast.success('Deleted');
      item.source === 'car' ? refetchCars() : refetchProp();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  // ── Upload helpers ──
  const resetUpload = () => {
    setPickedFile(null); setPreview(null);
    setUploadName(''); setUploadCat('other');
    setDestSource('property'); setDestCarId(''); setDestCarType('document');
  };
  const closeUpload = () => { setShowUpload(false); resetUpload(); };

  const handleFilePick = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setPickedFile(compressed);
    if (!uploadName) setUploadName(file.name.replace(/\.[^.]+$/, ''));
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target.result);
      reader.readAsDataURL(compressed);
    } else {
      setPreview(null);
    }
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (!pickedFile || !uploadName.trim()) return;
    // Determine endpoint
    let endpoint;
    if (destSource === 'property') {
      endpoint = `/properties/${propertyId}/documents`;
    } else if (destCarType === 'image') {
      endpoint = `/cars/${destCarId}/images`;
    } else {
      endpoint = `/cars/${destCarId}/documents`;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', pickedFile);
      if (destSource === 'property' || destCarType === 'document') {
        fd.append('name', uploadName);
        fd.append('category', uploadCat);
      }
      const res  = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Upload failed');
      toast.success('Uploaded successfully');
      closeUpload();
      destSource === 'car' ? refetchCars() : refetchProp();
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Auto-set first car when switching to car source
  const handleDestSourceChange = (val) => {
    setDestSource(val);
    if (val === 'car' && !destCarId && cars.length > 0) {
      setDestCarId(cars[0].id ?? cars[0]._id);
    }
  };

  const activeCats = destSource === 'property' ? PROP_DOC_CATS
    : destCarType === 'document' ? CAR_DOC_CATS : [];
  const canSubmit = pickedFile && uploadName.trim() &&
    (destSource === 'property' || (destSource === 'car' && destCarId));

  const isLoading = carsLoading || propLoading;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
      className="space-y-5">

      {/* ── Header ── */}
      <div className="relative rounded-3xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#060f1e] via-[#0b1d3a] to-[#0d2449]" />
        <div className="absolute top-0 left-0 right-0 h-0.5"
          style={{ background: 'linear-gradient(90deg,transparent,#C9A227 40%,#C9A227 60%,transparent)' }} />
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #C9A227 0%, transparent 70%)' }} />
        <div className="relative z-10 p-7 sm:p-9 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest mb-1">Media Library</p>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Media &amp; Documents</h1>
            <p className="text-white/40 text-[13px] mt-1">{allMedia.length} files across all cars &amp; property</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { label: 'Images',    count: allMedia.filter((m) => m.kind === 'image').length, color: '#C9A227' },
              { label: 'Documents', count: allMedia.filter((m) => m.kind === 'doc').length,   color: '#60a5fa' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl px-4 py-3 text-center"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p className="text-[22px] font-black" style={{ color: s.color }}>{s.count}</p>
                <p className="text-white/40 text-[11px] font-semibold">{s.label}</p>
              </div>
            ))}
            <button onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl text-[13px] font-bold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'linear-gradient(135deg,rgba(201,162,39,0.25),rgba(201,162,39,0.15))', border: '1px solid rgba(201,162,39,0.4)' }}>
              <Upload className="w-4 h-4" /> Upload
            </button>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                'shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all',
                tab === t.id ? 'bg-navy-900 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300',
              )}>
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 px-3 py-2.5 bg-white rounded-xl border border-slate-200 sm:ml-auto w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files…"
            className="flex-1 text-[13px] outline-none bg-transparent placeholder-slate-400" />
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <EmptyState icon={FolderOpen} title="No media found"
          description={<span>Click <strong>Upload</strong> to add photos and documents.</span>} />
      )}

      {/* ── Image grid ── */}
      {!isLoading && images.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
            Photos &amp; Images — {images.length}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {images.map((item) => {
              const isDel = deleting === item.id;
              return (
                <div key={item.id}
                  className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-square cursor-pointer"
                  onClick={() => openLightbox(item)}>
                  <img src={item.url} alt={item.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all" />
                  <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-all">
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 text-white text-[10px] font-bold">
                      {item.sourceIcon === 'car' ? <Car className="w-3 h-3" /> : <Home className="w-3 h-3" />}
                      {item.sourceName}
                    </span>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 p-2 opacity-0 group-hover:opacity-100 transition-all flex gap-1.5">
                    <button className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl bg-white/90 text-[11px] font-bold text-slate-700 hover:bg-white"
                      onClick={(e) => { e.stopPropagation(); openLightbox(item); }}>
                      <Eye className="w-3 h-3" /> View
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); downloadFile(item.url, item.name); }}
                      className="w-8 flex items-center justify-center rounded-xl bg-white/90 hover:bg-white text-slate-700">
                      <Download className="w-3 h-3" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(item); }} disabled={isDel}
                      className="w-8 flex items-center justify-center rounded-xl bg-red-500/90 hover:bg-red-500 text-white disabled:opacity-50">
                      {isDel ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </button>
                  </div>
                  <p className="absolute bottom-0 inset-x-0 px-2 py-1.5 text-[10px] font-semibold text-white truncate opacity-100 group-hover:opacity-0 transition-all"
                    style={{ background: 'linear-gradient(transparent,rgba(0,0,0,0.65))' }}>
                    {item.name}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Documents list ── */}
      {!isLoading && docs.length > 0 && (
        <div>
          {images.length > 0 && <div className="h-2" />}
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Documents — {docs.length}</p>
          <div className="space-y-2">
            {docs.map((item) => {
              const isDel = deleting === item.id;
              return (
                <div key={item.id}
                  className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 p-3 sm:p-4 hover:shadow-sm transition-all"
                  style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl shrink-0 overflow-hidden flex items-center justify-center bg-slate-100">
                    <FileThumb fileType={item.fileType} url={item.url} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] sm:text-[14px] font-semibold text-slate-800 truncate">{item.name}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        {item.sourceIcon === 'car' ? <Car className="w-3 h-3" /> : <Home className="w-3 h-3" />}
                        {item.sourceName}
                      </span>
                      {item.category && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 capitalize">
                          {CAT_LABELS[item.category] ?? item.category}
                        </span>
                      )}
                      {item.size ? <span className="text-[11px] text-slate-400">{fmtSize(item.size)}</span> : null}
                      {item.createdAt && <span className="text-[11px] text-slate-400 hidden sm:block">{fmtDate(item.createdAt)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isImg(item.fileType) && (
                      <button onClick={() => openLightbox(item)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[12px] font-semibold text-slate-600 transition-all">
                        <Eye className="w-3.5 h-3.5" /><span className="hidden sm:inline">View</span>
                      </button>
                    )}
                    <button onClick={() => downloadFile(item.url, item.name)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-all"
                      title="Download">
                      <Download className="w-4 h-4" />
                    </button>
                    <a href={item.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[12px] font-semibold text-slate-600 transition-all">
                      <ExternalLink className="w-3.5 h-3.5" /><span className="hidden sm:inline">Open</span>
                    </a>
                    <button onClick={() => handleDelete(item)} disabled={isDel}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 transition-all disabled:opacity-50">
                      {isDel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Lightbox ── */}
      <ImageLightbox
        open={lightbox.open}
        items={lightbox.items}
        startIndex={lightbox.idx}
        onClose={() => setLightbox((s) => ({ ...s, open: false }))}
      />

      {/* ── Upload Modal ── */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
            onClick={closeUpload}>
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden"
              style={{ boxShadow: '0 32px 80px rgba(11,29,58,0.35)' }}
              onClick={(e) => e.stopPropagation()}>

              {/* Modal header */}
              <div className="relative px-5 pt-5 pb-4 overflow-hidden"
                style={{ background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' }}>
                <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#C9A227,#e8c547)', opacity:0.9 }} />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/35 mb-0.5">Media Library</p>
                    <h2 className="text-[18px] font-black text-white">Upload Media</h2>
                  </div>
                  <button onClick={closeUpload}
                    className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto" style={{ scrollbarWidth: 'none' }}>

                {/* ── File pick area ── */}
                {!pickedFile ? (
                  <button onClick={() => fileRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-200 hover:border-blue-300 rounded-2xl p-8 flex flex-col items-center gap-3 transition-all group bg-slate-50 hover:bg-blue-50">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 group-hover:border-blue-200 flex items-center justify-center shadow-sm transition-all">
                      <Upload className="w-6 h-6 text-slate-400 group-hover:text-blue-400 transition-colors" />
                    </div>
                    <div className="text-center">
                      <p className="text-[14px] font-bold text-slate-600 group-hover:text-blue-600 transition-colors">
                        Tap to choose a file
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Images, PDFs, Word, Excel — max 20 MB
                      </p>
                    </div>
                  </button>
                ) : (
                  <div className="rounded-2xl border border-blue-200 overflow-hidden bg-blue-50">
                    {preview && (
                      <div className="w-full h-36 overflow-hidden">
                        <img src={preview} alt="preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-700 truncate">{pickedFile.name}</p>
                        <p className="text-[11px] text-slate-400">{fmtSize(pickedFile.size)}</p>
                      </div>
                      <button onClick={() => { setPickedFile(null); setPreview(null); }}
                        className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
                <input ref={fileRef} type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.gif"
                  className="hidden" onChange={handleFilePick} />

                {/* ── Destination ── */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Upload To</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleDestSourceChange('property')}
                      className={cn(
                        'flex items-center gap-2 px-3 py-3 rounded-xl border-2 text-left transition-all',
                        destSource === 'property' ? 'border-navy-800 bg-navy-50 text-navy-900' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300',
                      )}>
                      <Home className="w-4 h-4 shrink-0" />
                      <div>
                        <p className="text-[12px] font-bold leading-tight">Property</p>
                        <p className="text-[10px] opacity-60">Documents</p>
                      </div>
                    </button>
                    <button onClick={() => handleDestSourceChange('car')}
                      className={cn(
                        'flex items-center gap-2 px-3 py-3 rounded-xl border-2 text-left transition-all',
                        destSource === 'car' ? 'border-navy-800 bg-navy-50 text-navy-900' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300',
                      )}>
                      <Car className="w-4 h-4 shrink-0" />
                      <div>
                        <p className="text-[12px] font-bold leading-tight">Car</p>
                        <p className="text-[10px] opacity-60">Photos / Docs</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Car selector */}
                {destSource === 'car' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Select Car</label>
                      <select value={destCarId} onChange={(e) => setDestCarId(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] bg-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all">
                        <option value="">— pick a car —</option>
                        {cars.map((c) => (
                          <option key={c.id ?? c._id} value={c.id ?? c._id}>
                            {c.name ?? `${c.make ?? ''} ${c.model ?? ''}`.trim()}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Type</label>
                      <div className="flex gap-2">
                        {[{ v: 'image', l: 'Photo' }, { v: 'document', l: 'Document' }].map(({ v, l }) => (
                          <button key={v} onClick={() => setDestCarType(v)}
                            className={cn(
                              'flex-1 py-2.5 rounded-xl text-[12px] font-bold border transition-all',
                              destCarType === v ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300',
                            )}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Name + category */}
                {(destSource === 'property' || destCarType === 'document') && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">File Name</label>
                      <input value={uploadName} onChange={(e) => setUploadName(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] bg-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                        placeholder="e.g. Title Deed 2024" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
                      <select value={uploadCat} onChange={(e) => setUploadCat(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] bg-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all">
                        {activeCats.map((c) => <option key={c} value={c}>{CAT_LABELS[c] ?? c}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {/* Car image name (optional) */}
                {destSource === 'car' && destCarType === 'image' && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Caption (optional)</label>
                    <input value={uploadName} onChange={(e) => setUploadName(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] bg-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                      placeholder="e.g. Front view" />
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button onClick={closeUpload}
                    className="flex-1 py-3 rounded-2xl text-[13px] font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all">
                    Cancel
                  </button>
                  <button onClick={handleUpload} disabled={uploading || !canSubmit}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[13px] font-bold text-white transition-all disabled:opacity-50 active:scale-95"
                    style={{ background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' }}>
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {uploading ? 'Uploading…' : 'Upload'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
