import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Images, FileText, Car, Home, Search, ExternalLink, Eye,
  Trash2, Loader2, FolderOpen, Upload, X, Plus, FileCheck, File, Download,
  FileSignature, ChevronDown, LayoutGrid, List, Camera,
} from 'lucide-react';
import { RiContractLine } from 'react-icons/ri';
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

const fmtSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
const fmtMonth = (d) => {
  if (!d) return 'Unknown';
  return new Date(d).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
};
const fmtDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const CAR_DOC_CATS      = ['insurance', 'registration', 'service', 'invoice', 'warranty', 'photo', 'other'];
const PROP_DOC_CATS     = ['deed', 'insurance', 'utility', 'permit', 'contract', 'invoice', 'photo', 'other'];
const CONTRACT_DOC_CATS = ['contract', 'amendment', 'invoice', 'insurance', 'permit', 'photo', 'other'];
const CAT_LABELS = {
  deed: 'Title Deed', insurance: 'Insurance', registration: 'Registration',
  utility: 'Utility', permit: 'Permit', contract: 'Contract',
  invoice: 'Invoice', service: 'Service', warranty: 'Warranty',
  amendment: 'Amendment', photo: 'Photo', other: 'Other',
};

const SOURCE_CFG = {
  car:      { bg: 'bg-sky-100',    text: 'text-sky-700',    border: 'border-sky-200',    icon: Car,              label: 'Car'      },
  property: { bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-200',  icon: Home,             label: 'Property' },
  contract: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200', icon: FileSignature,    label: 'Contract' },
};

const TABS = [
  { id: 'all',       label: 'All',       icon: FolderOpen    },
  { id: 'images',    label: 'Images',    icon: Camera        },
  { id: 'docs',      label: 'Documents', icon: FileText      },
  { id: 'car',       label: 'Car',       icon: Car           },
  { id: 'property',  label: 'Property',  icon: Home          },
  { id: 'contract',  label: 'Contracts', icon: FileSignature },
];

function FileThumb({ fileType, url }) {
  if (isImg(fileType) && url) return <img src={url} alt="" className="w-full h-full object-cover" />;
  if (isPdf(fileType)) return (
    <div className="flex flex-col items-center justify-center gap-1 w-full h-full bg-red-50">
      <FileCheck className="w-6 h-6 text-red-500" />
      <span className="text-[9px] font-black text-red-500 tracking-widest">PDF</span>
    </div>
  );
  const ext = (fileType ?? '').toUpperCase();
  if (['DOC','DOCX'].includes(ext)) return (
    <div className="flex flex-col items-center justify-center gap-1 w-full h-full bg-blue-50">
      <FileText className="w-6 h-6 text-blue-500" />
      <span className="text-[9px] font-black text-blue-500 tracking-widest">DOC</span>
    </div>
  );
  if (['XLS','XLSX'].includes(ext)) return (
    <div className="flex flex-col items-center justify-center gap-1 w-full h-full bg-green-50">
      <File className="w-6 h-6 text-green-600" />
      <span className="text-[9px] font-black text-green-600 tracking-widest">XLS</span>
    </div>
  );
  return (
    <div className="flex flex-col items-center justify-center gap-1 w-full h-full bg-slate-50">
      <FileText className="w-6 h-6 text-slate-400" />
      <span className="text-[9px] font-bold text-slate-400 uppercase">{ext || 'FILE'}</span>
    </div>
  );
}

function SourceBadge({ source, sourceName }) {
  const cfg = SOURCE_CFG[source] ?? SOURCE_CFG.property;
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold', cfg.bg, cfg.text, cfg.border)}>
      <Icon className="w-2.5 h-2.5" />
      {sourceName}
    </span>
  );
}

export default function MediaPage() {
  const token      = useSelector((s) => s.auth?.token);
  const propertyId = useSelector(selectCurrentPropertyId);

  const { data: carsRaw = [],  isLoading: carsLoading,  refetch: refetchCars }      = useGetQuery({ path: '/cars', params: { propertyId } }, { skip: !propertyId });
  const { data: property,      isLoading: propLoading,  refetch: refetchProp }      = useGetQuery({ path: `/properties/${propertyId}` }, { skip: !propertyId });
  const { data: contractsRaw = [], isLoading: contractsLoading, refetch: refetchContracts } = useGetQuery({ path: '/contracts', params: { propertyId } }, { skip: !propertyId });

  // normalise contracts list — API may return { items } or []
  const contracts = Array.isArray(contractsRaw) ? contractsRaw : (contractsRaw?.items ?? []);
  const cars      = Array.isArray(carsRaw)      ? carsRaw      : [];

  const [tab,         setTab]        = useState('all');
  const [search,      setSearch]     = useState('');
  const [lightbox,    setLightbox]   = useState({ open: false, items: [], idx: 0 });
  const [deleting,    setDeleting]   = useState(null);
  const [showUpload,  setShowUpload] = useState(false);
  const [viewMode,    setViewMode]   = useState('grid'); // 'grid' | 'list'

  // upload form
  const [pickedFile,      setPickedFile]      = useState(null);
  const [preview,         setPreview]         = useState(null);
  const [destSource,      setDestSource]      = useState('property');
  const [destCarId,       setDestCarId]       = useState('');
  const [destCarType,     setDestCarType]     = useState('document');
  const [destContractId,  setDestContractId]  = useState('');
  const [uploadName,      setUploadName]      = useState('');
  const [uploadCat,       setUploadCat]       = useState('other');
  const [uploading,       setUploading]       = useState(false);
  const fileRef = useRef(null);

  // ── Build unified media list ──────────────────────────────────────────────
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
          kind: 'image',
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
          kind: isImg(doc.fileType) ? 'image' : 'doc',
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
        kind: isImg(doc.fileType) ? 'image' : 'doc',
        category: doc.category, size: doc.size, createdAt: doc.createdAt,
        deleteEndpoint: `/properties/${propertyId}/documents/${doc.id ?? doc._id}`,
      });
    });

    contracts.forEach((contract) => {
      (contract.documents ?? []).forEach((doc) => {
        list.push({
          id: doc.id ?? doc._id, url: doc.url,
          name: doc.name ?? 'Contract Document',
          fileType: doc.fileType, source: 'contract',
          sourceId: contract.id ?? contract._id,
          sourceName: contract.title ?? 'Contract',
          kind: isImg(doc.fileType) ? 'image' : 'doc',
          category: doc.category, size: doc.size, createdAt: doc.createdAt,
          deleteEndpoint: `/contracts/${contract.id ?? contract._id}/documents/${doc.id ?? doc._id}`,
        });
      });
    });

    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [cars, property, propertyId, contracts]);

  const filtered = useMemo(() => {
    let list = allMedia;
    if (tab === 'images')   list = list.filter((m) => m.kind === 'image');
    if (tab === 'docs')     list = list.filter((m) => m.kind === 'doc');
    if (tab === 'car')      list = list.filter((m) => m.source === 'car');
    if (tab === 'property') list = list.filter((m) => m.source === 'property');
    if (tab === 'contract') list = list.filter((m) => m.source === 'contract');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((m) =>
        m.name.toLowerCase().includes(q) ||
        m.sourceName?.toLowerCase().includes(q) ||
        m.category?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [allMedia, tab, search]);

  const imageItems = filtered.filter((m) => m.kind === 'image');
  const docItems   = filtered.filter((m) => m.kind === 'doc');

  // Group images by month for event gallery
  const imagesByMonth = useMemo(() => {
    const groups = new Map();
    imageItems.forEach((img) => {
      const key = fmtMonth(img.createdAt);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(img);
    });
    return [...groups.entries()];
  }, [imageItems]);

  const openLightbox = (item) => {
    const idx = imageItems.findIndex((m) => m.id === item.id);
    setLightbox({
      open: true,
      items: imageItems.map((m) => ({ url: m.url, name: m.name, fileType: m.fileType })),
      idx: Math.max(idx, 0),
    });
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    setDeleting(item.id);
    try {
      const res  = await fetch(`${API_URL}${item.deleteEndpoint}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Delete failed');
      toast.success('Deleted');
      if (item.source === 'car')      refetchCars();
      else if (item.source === 'contract') refetchContracts();
      else                            refetchProp();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  // ── Upload ────────────────────────────────────────────────────────────────
  const resetUpload = () => {
    setPickedFile(null); setPreview(null);
    setUploadName(''); setUploadCat('other');
    setDestSource('property'); setDestCarId(''); setDestCarType('document');
    setDestContractId('');
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
    let endpoint;
    if (destSource === 'property') {
      endpoint = `/properties/${propertyId}/documents`;
    } else if (destSource === 'contract') {
      endpoint = `/contracts/${destContractId}/documents`;
    } else if (destCarType === 'image') {
      endpoint = `/cars/${destCarId}/images`;
    } else {
      endpoint = `/cars/${destCarId}/documents`;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', pickedFile);
      if (destSource !== 'car' || destCarType === 'document') {
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
      if (destSource === 'car')           refetchCars();
      else if (destSource === 'contract') refetchContracts();
      else                                refetchProp();
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDestSourceChange = (val) => {
    setDestSource(val);
    if (val === 'car' && !destCarId && cars.length > 0)
      setDestCarId(cars[0].id ?? cars[0]._id);
    if (val === 'contract' && !destContractId && contracts.length > 0)
      setDestContractId(contracts[0].id ?? contracts[0]._id);
  };

  const activeCats = destSource === 'property'
    ? PROP_DOC_CATS
    : destSource === 'contract'
    ? CONTRACT_DOC_CATS
    : destCarType === 'document'
    ? CAR_DOC_CATS : [];

  const canSubmit = pickedFile && uploadName.trim() &&
    (destSource === 'property' ||
     (destSource === 'car' && destCarId) ||
     (destSource === 'contract' && destContractId));

  const isLoading = carsLoading || propLoading || contractsLoading;

  // Stats
  const totalImgs = allMedia.filter((m) => m.kind === 'image').length;
  const totalDocs = allMedia.filter((m) => m.kind === 'doc').length;
  const totalContracts = allMedia.filter((m) => m.source === 'contract').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
      className="space-y-4 pb-8">

      {/* ── Hero Header ─────────────────────────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#060f1e] via-[#0b1d3a] to-[#0d2449]" />
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg,transparent,#C9A227 35%,#e8c547 50%,#C9A227 65%,transparent)' }} />
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle,#C9A227 0%,transparent 70%)' }} />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle,#60a5fa 0%,transparent 70%)' }} />

        <div className="relative z-10 px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div className="flex-1 min-w-0">
              <p className="text-white/35 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Shah House</p>
              <h1 className="text-[26px] sm:text-[32px] font-black text-white tracking-tight leading-none">
                Media Library
              </h1>
              <p className="text-white/40 text-[12px] mt-2">
                {allMedia.length} files · {totalImgs} photos · {totalDocs} documents
              </p>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { label: 'Photos',    count: totalImgs,     color: '#C9A227' },
                { label: 'Documents', count: totalDocs,     color: '#60a5fa' },
                { label: 'Contracts', count: totalContracts, color: '#a78bfa' },
              ].map((s) => (
                <div key={s.label}
                  className="rounded-2xl px-3.5 py-2.5 text-center min-w-[64px]"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <p className="text-[20px] font-black tabular-nums leading-none" style={{ color: s.color }}>{s.count}</p>
                  <p className="text-white/35 text-[10px] font-semibold mt-0.5">{s.label}</p>
                </div>
              ))}
              <button onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl text-[13px] font-bold text-white transition-all hover:opacity-90 active:scale-95"
                style={{ background: 'linear-gradient(135deg,rgba(201,162,39,0.28),rgba(201,162,39,0.16))', border: '1px solid rgba(201,162,39,0.45)' }}>
                <Upload className="w-4 h-4" /> Upload
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {/* Tab chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {TABS.map((t) => {
            const count = t.id === 'all'      ? allMedia.length
              : t.id === 'images'   ? totalImgs
              : t.id === 'docs'     ? totalDocs
              : t.id === 'car'      ? allMedia.filter(m => m.source === 'car').length
              : t.id === 'property' ? allMedia.filter(m => m.source === 'property').length
              : t.id === 'contract' ? totalContracts : 0;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={cn(
                  'shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all',
                  tab === t.id
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-700',
                )}>
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
                {count > 0 && (
                  <span className={cn(
                    'text-[10px] font-black px-1.5 py-0.5 rounded-md leading-none',
                    tab === t.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400',
                  )}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search + view toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2.5 bg-white rounded-xl border border-slate-200 flex-1">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, source or category…"
              className="flex-1 text-[13px] outline-none bg-transparent placeholder-slate-400 min-w-0" />
            {search && (
              <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white shrink-0">
            {[{ id: 'grid', icon: LayoutGrid }, { id: 'list', icon: List }].map(({ id, icon: Icon }) => (
              <button key={id} onClick={() => setViewMode(id)}
                className={cn(
                  'w-9 h-9 flex items-center justify-center transition-all',
                  viewMode === id ? 'bg-navy-900 text-white' : 'text-slate-400 hover:text-slate-600',
                )}>
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
        </div>
      )}

      {/* ── Empty ── */}
      {!isLoading && filtered.length === 0 && (
        <EmptyState icon={FolderOpen} title="No media found"
          description={<span>Click <strong>Upload</strong> to add photos and documents.</span>} />
      )}

      {/* ── Event Gallery (Images) ────────────────────────────────────────── */}
      {!isLoading && imageItems.length > 0 && (
        <div className="space-y-6">
          {imagesByMonth.map(([month, monthImages]) => (
            <div key={month}>
              {/* Month divider */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-slate-400" />
                  <p className="text-[13px] font-bold text-slate-600">{month}</p>
                  <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {monthImages.length}
                  </span>
                </div>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              {/* Mosaic grid — first image of first group is large */}
              {viewMode === 'grid' ? (
                <MosaicGrid items={monthImages} onOpen={openLightbox} onDelete={handleDelete} deleting={deleting} />
              ) : (
                <div className="space-y-2">
                  {monthImages.map((item) => (
                    <DocRow key={item.id} item={item} onOpen={openLightbox} onDelete={handleDelete} deleting={deleting} isImage />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Documents ────────────────────────────────────────────────────── */}
      {!isLoading && docItems.length > 0 && (
        <div>
          {imageItems.length > 0 && <div className="h-2" />}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <p className="text-[13px] font-bold text-slate-600">Documents</p>
              <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {docItems.length}
              </span>
            </div>
            <div className="flex-1 h-px bg-slate-100" />
          </div>
          <div className="space-y-2">
            {docItems.map((item) => (
              <DocRow key={item.id} item={item} onOpen={null} onDelete={handleDelete} deleting={deleting} isImage={false} />
            ))}
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

      {/* ── Upload Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            key="upload-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
            onClick={closeUpload}>
            <motion.div
              key="upload-panel"
              initial={{ opacity: 0, y: 50, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden"
              style={{ boxShadow: '0 40px 100px rgba(11,29,58,0.4)', maxHeight: '96vh' }}
              onClick={(e) => e.stopPropagation()}>

              {/* Modal header */}
              <div className="relative px-5 pt-5 pb-4 shrink-0"
                style={{ background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' }}>
                <div style={{ position:'absolute',top:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#C9A227,#e8c547)',opacity:0.9 }} />
                {/* Drag indicator for mobile */}
                <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4 sm:hidden" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/35 mb-0.5">Media Library</p>
                    <h2 className="text-[18px] font-black text-white">Upload Media</h2>
                  </div>
                  <button onClick={closeUpload}
                    className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto" style={{ scrollbarWidth: 'none', maxHeight: 'calc(96vh - 100px)' }}>

                {/* File pick */}
                {!pickedFile ? (
                  <button onClick={() => fileRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-200 hover:border-blue-300 rounded-2xl p-7 flex flex-col items-center gap-3 transition-all group bg-slate-50 hover:bg-blue-50/60 active:scale-[0.99]">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 group-hover:border-blue-200 group-hover:shadow-md flex items-center justify-center shadow-sm transition-all">
                      <Upload className="w-6 h-6 text-slate-400 group-hover:text-blue-400 transition-colors" />
                    </div>
                    <div className="text-center">
                      <p className="text-[14px] font-bold text-slate-600 group-hover:text-blue-600 transition-colors">
                        Tap to choose a file
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Images, PDF, Word, Excel — max 20 MB
                      </p>
                    </div>
                  </button>
                ) : (
                  <div className="rounded-2xl border border-blue-200 overflow-hidden bg-blue-50/60">
                    {preview && (
                      <div className="w-full h-40 overflow-hidden">
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

                {/* Destination */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">Upload To</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { v: 'property', l: 'Property', Icon: Home },
                      { v: 'car',      l: 'Car',      Icon: Car  },
                      { v: 'contract', l: 'Contract', Icon: FileSignature },
                    ].map(({ v, l, Icon }) => (
                      <button key={v} onClick={() => handleDestSourceChange(v)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 transition-all',
                          destSource === v
                            ? 'border-navy-800 bg-navy-50 text-navy-900'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300',
                        )}>
                        <Icon className="w-4 h-4" />
                        <p className="text-[11px] font-bold leading-tight">{l}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Car selector */}
                {destSource === 'car' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Select Car</label>
                      <div className="relative">
                        <select value={destCarId} onChange={(e) => setDestCarId(e.target.value)}
                          className="w-full appearance-none border border-slate-200 rounded-xl px-3 py-2.5 pr-8 text-[13px] bg-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all">
                          <option value="">— pick a car —</option>
                          {cars.map((c) => (
                            <option key={c.id ?? c._id} value={c.id ?? c._id}>
                              {c.name ?? `${c.make ?? ''} ${c.model ?? ''}`.trim()}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Type</label>
                      <div className="flex gap-2">
                        {[{ v: 'image', l: 'Photo' }, { v: 'document', l: 'Doc' }].map(({ v, l }) => (
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

                {/* Contract selector */}
                {destSource === 'contract' && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Select Contract</label>
                    <div className="relative">
                      <select value={destContractId} onChange={(e) => setDestContractId(e.target.value)}
                        className="w-full appearance-none border border-slate-200 rounded-xl px-3 py-2.5 pr-8 text-[13px] bg-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all">
                        <option value="">— pick a contract —</option>
                        {contracts.map((c) => (
                          <option key={c.id ?? c._id} value={c.id ?? c._id}>
                            {c.title ?? 'Contract'}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* Name + category */}
                {(destSource === 'property' || destSource === 'contract' || destCarType === 'document') && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">File Name</label>
                      <input value={uploadName} onChange={(e) => setUploadName(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[13px] bg-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                        placeholder="e.g. Signed Contract 2024" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Category</label>
                      <div className="flex flex-wrap gap-1.5">
                        {activeCats.map((c) => (
                          <button key={c} onClick={() => setUploadCat(c)}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all',
                              uploadCat === c ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                            )}>
                            {CAT_LABELS[c] ?? c}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Car image caption */}
                {destSource === 'car' && destCarType === 'image' && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Caption (optional)</label>
                    <input value={uploadName} onChange={(e) => setUploadName(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-[13px] bg-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                      placeholder="e.g. Front view" />
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1 pb-safe">
                  <button onClick={closeUpload}
                    className="flex-1 py-3.5 rounded-2xl text-[13px] font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95">
                    Cancel
                  </button>
                  <button onClick={handleUpload} disabled={uploading || !canSubmit}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[13px] font-bold text-white transition-all disabled:opacity-50 active:scale-95"
                    style={{ background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' }}>
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploading ? 'Uploading…' : 'Upload Now'}
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

// ── Mosaic Grid ───────────────────────────────────────────────────────────────
// Uses a CSS grid where every 5th image (index % 5 === 0) spans 2 columns.
function MosaicGrid({ items, onOpen, onDelete, deleting }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 auto-rows-[120px] sm:auto-rows-[140px]">
      {items.map((item, i) => {
        const isDel = deleting === item.id;
        const big   = i % 5 === 0; // first in each row of 5 is a feature tile
        return (
          <div key={item.id}
            className={cn(
              'relative group rounded-2xl overflow-hidden bg-slate-100 cursor-pointer',
              big ? 'col-span-2 row-span-2' : 'col-span-1 row-span-1',
            )}
            onClick={() => onOpen(item)}>
            <img
              src={item.url}
              alt={item.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

            {/* Source badge — always visible on big, hover on small */}
            <div className={cn(
              'absolute top-2 left-2 transition-opacity duration-200',
              big ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            )}>
              <SourceBadge source={item.source} sourceName={item.sourceName} />
            </div>

            {/* Action buttons */}
            <div className="absolute bottom-2 inset-x-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
              <button
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-[11px] font-bold text-slate-800 bg-white/90 hover:bg-white transition-all"
                onClick={(e) => { e.stopPropagation(); onOpen(item); }}>
                <Eye className="w-3 h-3" /> View
              </button>
              <button
                className="w-8 flex items-center justify-center rounded-xl bg-white/90 hover:bg-white text-slate-700 transition-all"
                onClick={(e) => { e.stopPropagation(); downloadFile(item.url, item.name); }}
                title="Download">
                <Download className="w-3 h-3" />
              </button>
              <button
                className="w-8 flex items-center justify-center rounded-xl bg-red-500/90 hover:bg-red-500 text-white transition-all disabled:opacity-50"
                onClick={(e) => { e.stopPropagation(); onDelete(item); }}
                disabled={isDel}
                title="Delete">
                {isDel ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              </button>
            </div>

            {/* Name on bottom (when not hovered) */}
            {big && (
              <p className="absolute bottom-0 inset-x-0 px-3 py-2 text-[11px] font-semibold text-white truncate group-hover:opacity-0 transition-opacity"
                style={{ background: 'linear-gradient(transparent,rgba(0,0,0,0.7))' }}>
                {item.name}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Document / Image list row ─────────────────────────────────────────────────
function DocRow({ item, onOpen, onDelete, deleting, isImage }) {
  const isDel = deleting === item.id;
  return (
    <motion.div
      layout
      className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 p-3 sm:p-3.5 hover:shadow-md hover:border-slate-200 transition-all"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>

      {/* Thumbnail */}
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl shrink-0 overflow-hidden border border-slate-100">
        <FileThumb fileType={item.fileType} url={item.url} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] sm:text-[14px] font-semibold text-slate-800 truncate leading-tight">{item.name}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <SourceBadge source={item.source} sourceName={item.sourceName} />
          {item.category && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 capitalize">
              {CAT_LABELS[item.category] ?? item.category}
            </span>
          )}
          {item.size ? <span className="text-[11px] text-slate-400">{fmtSize(item.size)}</span> : null}
        </div>
        {item.createdAt && (
          <p className="text-[10px] text-slate-300 mt-0.5 hidden sm:block">{fmtDate(item.createdAt)}</p>
        )}
      </div>

      {/* Actions — always visible on mobile, no hover needed */}
      <div className="flex items-center gap-1 shrink-0">
        {(isImage || isPdf(item.fileType)) && onOpen && (
          <button onClick={() => onOpen(item)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-all"
            title="View">
            <Eye className="w-4 h-4" />
          </button>
        )}
        <button onClick={() => downloadFile(item.url, item.name)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-all"
          title="Download">
          <Download className="w-4 h-4" />
        </button>
        <a href={item.url} target="_blank" rel="noopener noreferrer"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-all"
          title="Open">
          <ExternalLink className="w-4 h-4" />
        </a>
        <button onClick={() => onDelete(item)} disabled={isDel}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 transition-all disabled:opacity-50"
          title="Delete">
          {isDel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      </div>
    </motion.div>
  );
}
