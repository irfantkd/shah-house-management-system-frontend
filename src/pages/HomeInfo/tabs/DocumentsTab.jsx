import { useState } from 'react';
import { FileText, Download, Eye, Upload, Search, Trash2, FolderOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import EmptyState from '../../../components/ui/EmptyState';
import { cn } from '../../../utils/cn';

const CATEGORIES = ['All', 'Legal', 'Plans', 'Insurance', 'Utilities'];

const TYPE_COLORS = {
  pdf: 'bg-danger-50 text-danger-600',
  jpg: 'bg-accent-50 text-accent-600',
  png: 'bg-success-50 text-success-600',
  doc: 'bg-accent-50 text-accent-600',
};

export default function DocumentsTab({ documents }) {
  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState('All');

  const filtered = documents.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
    const matchCat    = category === 'All' || d.category === category;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-5">

      {/* Search + upload bar */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents…"
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-[13px] text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 focus:bg-white transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  'px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap',
                  category === cat ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                )}
              >
                {cat}
              </button>
            ))}
          </div>
          <Button variant="primary" size="sm" icon={Upload} className="flex-shrink-0">Upload</Button>
        </div>
      </Card>

      {/* Document list */}
      {filtered.length > 0 ? (
        <Card padding={false}>
          {filtered.map((doc, i) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 group"
            >
              {/* File type icon */}
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-[11px]', TYPE_COLORS[doc.type] ?? 'bg-slate-100 text-slate-500')}>
                {doc.type.toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-slate-800 truncate">{doc.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-slate-400">{doc.size}</span>
                  <span className="text-slate-200">·</span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(doc.uploaded).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Category */}
              <Badge variant="default" size="sm" className="hidden sm:flex">{doc.category}</Badge>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-danger-50 hover:text-danger-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon={FolderOpen}
            title="No documents found"
            description={search ? `No results for "${search}"` : 'Upload your property documents to keep them organized.'}
            action={() => {}}
            actionLabel="Upload document"
          />
        </Card>
      )}

    </div>
  );
}
