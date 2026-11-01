import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Images, FileText, Car, Home, Search, Filter, ExternalLink, Eye, Trash2, Loader2, FolderOpen } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useGetQuery } from '../../api/apiSlice';
import { selectCurrentPropertyId } from '../../store/slices/propertiesSlice';
import ImageLightbox from '../../components/ui/ImageLightbox';
import EmptyState from '../../components/ui/EmptyState';
import { cn } from '../../utils/cn';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL;

const IMAGE_EXTS = ['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF'];
const isImg = (ft) => IMAGE_EXTS.includes((ft ?? '').toUpperCase());

const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const TABS = [
  { id: 'all',      label: 'All Media',  icon: FolderOpen },
  { id: 'images',   label: 'Images',     icon: Images     },
  { id: 'docs',     label: 'Documents',  icon: FileText   },
  { id: 'cars',     label: 'Car Media',  icon: Car        },
  { id: 'property', label: 'Property',   icon: Home       },
];

export default function MediaPage() {
  const token       = useSelector((s) => s.auth?.token);
  const propertyId  = useSelector(selectCurrentPropertyId);

  const { data: cars        = [], isLoading: carsLoading    } = useGetQuery({ path: '/cars',                    params: { propertyId } }, { skip: !propertyId });
  const { data: property,          isLoading: propLoading   } = useGetQuery({ path: `/properties/${propertyId}` }, { skip: !propertyId });

  const [tab,        setTab]        = useState('all');
  const [search,     setSearch]     = useState('');
  const [lightbox,   setLightbox]   = useState({ open: false, items: [], idx: 0 });
  const [deleting,   setDeleting]   = useState(null);

  // Build unified media list
  const allMedia = useMemo(() => {
    const list = [];

    cars.forEach((car) => {
      // Car images
      (car.images ?? []).forEach((img) => {
        const url = typeof img === 'string' ? img : img.url;
        list.push({
          id:       img.id ?? img._id ?? url,
          url,
          publicId: img.publicId,
          name:     `${car.name ?? car.make ?? 'Car'} photo`,
          fileType: 'JPG',
          source:   'car',
          sourceId: car.id ?? car._id,
          sourceName: car.name ?? `${car.make} ${car.model}`,
          sourceIcon: 'car',
          kind:     'image',
          createdAt: img.createdAt ?? car.createdAt,
          deleteEndpoint: `/cars/${car.id ?? car._id}/images/${img.id ?? img._id}`,
        });
      });
      // Car documents
      (car.documents ?? []).forEach((doc) => {
        list.push({
          id:       doc.id ?? doc._id,
          url:      doc.url,
          name:     doc.name ?? 'Document',
          fileType: doc.fileType,
          source:   'car',
          sourceId: car.id ?? car._id,
          sourceName: car.name ?? `${car.make} ${car.model}`,
          sourceIcon: 'car',
          kind:     isImg(doc.fileType) ? 'image' : 'doc',
          category: doc.category,
          size:     doc.size,
          createdAt: doc.createdAt,
          deleteEndpoint: `/cars/${car.id ?? car._id}/documents/${doc.id ?? doc._id}`,
        });
      });
    });

    // Property documents
    (property?.documents ?? []).forEach((doc) => {
      list.push({
        id:       doc.id ?? doc._id,
        url:      doc.url,
        name:     doc.name ?? 'Document',
        fileType: doc.fileType,
        source:   'property',
        sourceId: propertyId,
        sourceName: property?.name ?? 'Property',
        sourceIcon: 'home',
        kind:     isImg(doc.fileType) ? 'image' : 'doc',
        category: doc.category,
        size:     doc.size,
        createdAt: doc.createdAt,
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

  const openLightbox = (item) => {
    const items = imageItems.map((m) => ({ url: m.url, name: m.name, fileType: m.fileType }));
    const idx   = imageItems.findIndex((m) => m.id === item.id);
    setLightbox({ open: true, items, idx: Math.max(idx, 0) });
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    setDeleting(item.id);
    try {
      const res = await fetch(`${API_URL}${item.deleteEndpoint}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Delete failed');
      toast.success('Deleted');
      // force refetch via page reload of query caches — RTK Query cache will update via tag invalidation
      window.location.reload();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  const isLoading = carsLoading || propLoading;
  const images    = filtered.filter((m) => m.kind === 'image');
  const docs      = filtered.filter((m) => m.kind === 'doc');

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
      className="space-y-5">

      {/* ── Header ── */}
      <div className="relative rounded-3xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#060f1e] via-[#0b1d3a] to-[#0d2449]" />
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg,transparent,#C9A227 40%,#C9A227 60%,transparent)' }} />
        <div className="relative z-10 p-7 sm:p-9 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-white/40 text-[11px] font-bold uppercase tracking-widest mb-1">Media Library</p>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Media & Documents</h1>
            <p className="text-white/40 text-[13px] mt-1">{allMedia.length} files across all cars &amp; property</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {[
              { label: 'Images',    count: allMedia.filter((m) => m.kind === 'image').length, color: '#C9A227' },
              { label: 'Documents', count: allMedia.filter((m) => m.kind === 'doc').length,   color: '#60a5fa' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl px-4 py-3 text-center" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p className="text-[22px] font-black" style={{ color: s.color }}>{s.count}</p>
                <p className="text-white/40 text-[11px] font-semibold">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                'shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all',
                tab === t.id
                  ? 'bg-navy-900 text-white shadow-sm'
                  : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300',
              )}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>
        {/* Search */}
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
          description="Upload photos and documents from the Car detail or Home Info pages." />
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
                <div key={item.id} className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-square cursor-pointer"
                  onClick={() => openLightbox(item)}>
                  <img src={item.url} alt={item.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all" />

                  {/* Source badge */}
                  <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-all">
                    <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 text-white text-[10px] font-bold">
                      {item.sourceIcon === 'car' ? <Car className="w-3 h-3" /> : <Home className="w-3 h-3" />}
                      {item.sourceName}
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="absolute bottom-0 inset-x-0 p-2 opacity-0 group-hover:opacity-100 transition-all flex gap-1.5">
                    <button className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl bg-white/90 text-[11px] font-bold text-slate-700 hover:bg-white"
                      onClick={(e) => { e.stopPropagation(); openLightbox(item); }}>
                      <Eye className="w-3 h-3" /> View
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(item); }} disabled={isDel}
                      className="w-8 flex items-center justify-center rounded-xl bg-red-500/90 hover:bg-red-500 text-white disabled:opacity-50">
                      {isDel ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </button>
                  </div>

                  <p className="absolute bottom-0 inset-x-0 px-2 py-1.5 text-[10px] font-semibold text-white truncate opacity-100 group-hover:opacity-0 transition-all"
                    style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.65))' }}>
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
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
            Documents — {docs.length}
          </p>
          <div className="space-y-2">
            {docs.map((item) => {
              const isDel = deleting === item.id;
              return (
                <div key={item.id}
                  className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 p-3 sm:p-4 hover:shadow-sm transition-all"
                  style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl shrink-0 overflow-hidden flex items-center justify-center bg-slate-100">
                    {isImg(item.fileType)
                      ? <img src={item.url} alt={item.name} className="w-full h-full object-cover rounded-xl" />
                      : <div className="flex flex-col items-center justify-center gap-0.5">
                          <FileText className="w-6 h-6 text-slate-400" />
                          <span className="text-[9px] font-black text-slate-400 tracking-wider">
                            {(item.fileType ?? '').toUpperCase()}
                          </span>
                        </div>
                    }
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
                          {item.category}
                        </span>
                      )}
                      {item.size ? <span className="text-[11px] text-slate-400">{fmtSize(item.size)}</span> : null}
                      {item.createdAt && (
                        <span className="text-[11px] text-slate-400 hidden sm:block">{fmtDate(item.createdAt)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isImg(item.fileType) && (
                      <button onClick={() => openLightbox(item)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[12px] font-semibold text-slate-600 transition-all">
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">View</span>
                      </button>
                    )}
                    <a href={item.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[12px] font-semibold text-slate-600 transition-all">
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Open</span>
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
    </motion.div>
  );
}
