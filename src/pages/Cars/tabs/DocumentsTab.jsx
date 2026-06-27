import { useState } from 'react';
import { FileText, Plus, Image, Download, Calendar } from 'lucide-react';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
import { cn } from '../../../utils/cn';

const MOCK_DOCS = {
  'car-1': [
    { id: 'd1', name: 'Vehicle Registration Certificate (Mulkiya)', type: 'PDF', size: '245 KB', date: '2025-08-15', category: 'registration' },
    { id: 'd2', name: 'AXA Comprehensive Insurance Policy',          type: 'PDF', size: '1.2 MB', date: '2025-09-01', category: 'insurance'   },
    { id: 'd3', name: 'Al Futtaim Purchase Invoice',                 type: 'PDF', size: '380 KB', date: '2022-03-10', category: 'purchase'    },
    { id: 'd4', name: 'AC Compressor Repair Invoice',                type: 'PDF', size: '92 KB',  date: '2026-02-05', category: 'service'     },
    { id: 'd5', name: 'Vehicle Photos — Front & Side',               type: 'JPG', size: '3.4 MB', date: '2022-03-10', category: 'photo'       },
  ],
  'car-2': [
    { id: 'd6', name: 'Vehicle Registration Certificate (Mulkiya)', type: 'PDF', size: '238 KB', date: '2025-07-10', category: 'registration' },
    { id: 'd7', name: 'Emirates Insurance Policy',                   type: 'PDF', size: '1.1 MB', date: '2025-08-20', category: 'insurance'   },
    { id: 'd8', name: 'Mercedes Purchase Invoice',                   type: 'PDF', size: '410 KB', date: '2021-06-15', category: 'purchase'    },
  ],
  'car-3': [
    { id: 'd9',  name: 'Vehicle Registration Certificate (Mulkiya)', type: 'PDF', size: '251 KB', date: '2025-06-30', category: 'registration' },
    { id: 'd10', name: 'Oman Insurance Policy',                      type: 'PDF', size: '980 KB', date: '2025-07-15', category: 'insurance'   },
  ],
};

const CAT = {
  registration: { bg: '#eff6ff', color: '#2563eb', label: 'Registration' },
  insurance:    { bg: '#f0fdf4', color: '#16a34a', label: 'Insurance'    },
  purchase:     { bg: '#fffbeb', color: '#d97706', label: 'Purchase'     },
  service:      { bg: '#f5f3ff', color: '#7c3aed', label: 'Service'      },
  photo:        { bg: '#ecfeff', color: '#0891b2', label: 'Photo'        },
  other:        { bg: '#f8fafc', color: '#64748b', label: 'Other'        },
};

const FILTERS = ['all', 'registration', 'insurance', 'purchase', 'service', 'photo'];

const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function DocumentsTab({ car }) {
  const [filter, setFilter] = useState('all');
  const docs = (MOCK_DOCS[car.id] ?? []).filter((d) => filter === 'all' || d.category === filter);

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
              {f === 'all' ? 'All' : CAT[f]?.label ?? f}
            </button>
          ))}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" icon={Image}>Add Photo</Button>
          <Button size="sm" icon={Plus}>Upload Document</Button>
        </div>
      </div>

      {/* Doc list */}
      {docs.length === 0 ? (
        <EmptyState icon={FileText} title="No documents" description="Upload registration, insurance, invoices and photos for this vehicle." />
      ) : (
        <div className="space-y-2.5">
          {docs.map((doc) => {
            const cat = CAT[doc.category] ?? CAT.other;
            const isImage = doc.type === 'JPG' || doc.type === 'PNG';
            return (
              <div key={doc.id}
                className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4 hover:shadow-sm transition-all"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: cat.bg }}>
                  {isImage
                    ? <Image  className="w-5 h-5" style={{ color: cat.color }} />
                    : <FileText className="w-5 h-5" style={{ color: cat.color }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800 truncate">{doc.name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: cat.bg, color: cat.color }}>{cat.label}</span>
                    <span className="text-[11px] text-slate-400">{doc.type} · {doc.size}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-1">
                    <Calendar className="w-3 h-3" />
                    {fmtDate(doc.date)}
                  </div>
                  <button className="text-[12px] text-accent-600 font-semibold hover:text-accent-700 flex items-center gap-1 ml-auto">
                    <Download className="w-3 h-3" /> Download
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
          </p>
        </div>
      </div>
    </div>
  );
}
