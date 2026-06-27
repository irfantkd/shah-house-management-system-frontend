import { useState } from 'react';
import { Upload, Grid3X3, List, ImageIcon, X, ZoomIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import { cn } from '../../../utils/cn';

const CATEGORIES = ['All', 'Exterior', 'Interior', 'Garden'];

export default function ImagesTab({ images }) {
  const [filter, setFilter]     = useState('All');
  const [selected, setSelected] = useState(null);
  const [view, setView]         = useState('grid');

  const filtered = filter === 'All' ? images : images.filter((i) => i.category === filter);

  return (
    <div className="space-y-5">

      {/* Toolbar */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all',
                  filter === cat
                    ? 'bg-navy-900 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setView('grid')}
                className={cn('w-7 h-7 rounded-md flex items-center justify-center transition-all', view === 'grid' ? 'bg-white shadow-sm text-navy-900' : 'text-slate-400')}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setView('list')}
                className={cn('w-7 h-7 rounded-md flex items-center justify-center transition-all', view === 'list' ? 'bg-white shadow-sm text-navy-900' : 'text-slate-400')}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
            <Button variant="primary" size="sm" icon={Upload}>Upload</Button>
          </div>
        </div>
      </Card>

      {/* Grid view */}
      {view === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((img, i) => (
            <motion.button
              key={img.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setSelected(img)}
              className="relative aspect-square rounded-2xl overflow-hidden group"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${img.gradient}`} />
              <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 transition-all duration-200">
                <ZoomIn className="w-6 h-6 text-white mb-1" />
                <span className="text-white text-[11px] font-medium">View</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 px-2.5 py-2 bg-gradient-to-t from-black/70 to-transparent">
                <p className="text-white text-[11px] font-semibold">{img.label}</p>
                <Badge variant="default" size="sm" className="mt-0.5 !text-[9px] !h-4 bg-white/20 text-white border-0">
                  {img.category}
                </Badge>
              </div>
            </motion.button>
          ))}

          {/* Upload tile */}
          <button className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 hover:border-accent-300 hover:bg-accent-50/30 transition-all group">
            <Upload className="w-6 h-6 text-slate-300 group-hover:text-accent-400 transition-colors" />
            <span className="text-[11px] text-slate-400 group-hover:text-accent-500 font-medium transition-colors">Add photo</span>
          </button>
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <Card padding={false}>
          {filtered.map((img, i) => (
            <div
              key={img.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 cursor-pointer group"
              onClick={() => setSelected(img)}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${img.gradient} flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-slate-800">{img.label}</p>
                <p className="text-[11px] text-slate-400">{img.category}</p>
              </div>
              <Badge variant="default" size="sm">{img.category}</Badge>
              <ZoomIn className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
            </div>
          ))}
        </Card>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl rounded-2xl overflow-hidden relative"
            >
              <div className={`h-80 bg-gradient-to-br ${selected.gradient}`} />
              <div className="bg-white px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-navy-900">{selected.label}</p>
                  <p className="text-[12px] text-slate-400">{selected.category}</p>
                </div>
                <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
