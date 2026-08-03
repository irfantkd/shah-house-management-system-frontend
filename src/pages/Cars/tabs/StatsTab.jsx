import { BarChart2, Fuel, Gauge, TrendingUp, Calendar } from 'lucide-react';
import { useGetQuery } from '../../../api/apiSlice';
import { CAR_EXPENSE_TYPES } from '../../../data/mockCars';

const fmt = (n) => Number(n ?? 0).toLocaleString('en-AE', { maximumFractionDigits: 0 });
const fmtDec = (n, d = 1) => Number(n ?? 0).toFixed(d);

export default function StatsTab({ carId }) {
  const { data: stats, isLoading } = useGetQuery({ path: `/cars/${carId}/stats` }, { skip: !carId });

  if (isLoading) return (
    <div className="space-y-4 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-24 rounded-2xl bg-slate-100" />
      ))}
    </div>
  );
  if (!stats) return null;

  const { allTime, thisMonth, expenseByType, monthlyTrend } = stats;

  return (
    <div className="space-y-6">

      {/* ── All-time stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Total Expenses', value: allTime.expenses, icon: Gauge,     color: '#2563eb', bg: '#eff6ff', sub: `${allTime.expenseCount} records` },
          { label: 'Total Fuel',     value: allTime.fuel,     icon: Fuel,      color: '#d97706', bg: '#fffbeb', sub: `${fmtDec(allTime.liters, 0)}L · ${allTime.fillCount} fills` },
          { label: 'Total Spent',    value: allTime.combined, icon: BarChart2, color: '#0b1d3a', bg: '#f1f5f9', sub: 'All categories' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-slate-100" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: s.bg }}>
              <s.icon className="w-4.5 h-4.5" style={{ color: s.color }} />
            </div>
            <p className="text-[20px] font-black text-slate-900 leading-none">AED {fmt(s.value)}</p>
            <p className="text-[12px] font-semibold text-slate-700 mt-1">{s.label}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── This month snapshot ── */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <p className="text-[13px] font-bold text-slate-700">This Month</p>
          {(thisMonth.expenses + thisMonth.fuel) > 0 && (
            <span className="ml-auto text-[11px] font-bold text-slate-500">
              AED {fmt(thisMonth.expenses + thisMonth.fuel)} total
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 divide-x divide-slate-100">
          {[
            { label: 'Expenses', value: thisMonth.expenses, color: '#2563eb' },
            { label: 'Fuel',     value: thisMonth.fuel,     color: '#d97706' },
          ].map((s) => (
            <div key={s.label} className="px-5 py-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">{s.label}</p>
              <p className="text-[18px] font-black leading-none" style={{ color: s.value > 0 ? s.color : '#cbd5e1' }}>
                {s.value > 0 ? `AED ${fmt(s.value)}` : '—'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Monthly trend — last 12 months ── */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-slate-400" />
          <p className="text-[13px] font-bold text-slate-700">Monthly History — Last 12 Months</p>
        </div>

        {/* Mini bar chart */}
        <MiniBarChart months={monthlyTrend} />

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Month</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-bold text-blue-400 uppercase tracking-wide">Expenses</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-bold text-amber-500 uppercase tracking-wide">Fuel</th>
                <th className="text-right px-5 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total</th>
              </tr>
            </thead>
            <tbody>
              {[...monthlyTrend].reverse().map((m, i) => {
                const total = m.expenses + m.fuel;
                return (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 text-[12px] font-semibold text-slate-700">{m.label}</td>
                    <td className="px-4 py-3 text-right text-[12px] font-medium text-blue-600">
                      {m.expenses > 0 ? `AED ${fmt(m.expenses)}` : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-[12px] font-medium text-amber-600">
                      {m.fuel > 0 ? `AED ${fmt(m.fuel)}` : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right text-[12px] font-bold text-slate-900">
                      {total > 0 ? `AED ${fmt(total)}` : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Expense breakdown by type ── */}
      {Object.keys(expenseByType).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
          <div className="px-5 py-3.5 border-b border-slate-100">
            <p className="text-[13px] font-bold text-slate-700">Expenses by Type — All Time</p>
          </div>
          <div className="p-5 space-y-3.5">
            {Object.entries(expenseByType)
              .sort((a, b) => b[1] - a[1])
              .map(([type, amount]) => {
                const cfg = CAR_EXPENSE_TYPES[type] ?? { label: type, color: '#64748b' };
                const pct = allTime.expenses > 0 ? (amount / allTime.expenses) * 100 : 0;
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.color }} />
                        <span className="text-[12px] font-semibold text-slate-700">{cfg.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400">{pct.toFixed(0)}%</span>
                        <span className="text-[12px] font-bold text-slate-900">AED {fmt(amount)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: cfg.color }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── Avg fill cost ── */}
      {allTime.fillCount > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Avg Fill Cost',  value: `AED ${fmt(allTime.avgFill)}`,        color: '#d97706' },
            { label: 'Total Fills',    value: allTime.fillCount,                    color: '#0b1d3a' },
            { label: 'Total Liters',   value: `${fmtDec(allTime.liters, 0)}L`,      color: '#2563eb' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 text-center border border-slate-100" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
              <p className="text-[18px] font-black leading-none mb-1" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[11px] font-semibold text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniBarChart({ months }) {
  const maxVal = Math.max(...months.map((m) => m.expenses + m.fuel), 1);
  return (
    <div className="px-5 pt-4 pb-2 flex items-end gap-1.5 h-20">
      {months.map((m, i) => {
        const total = m.expenses + m.fuel;
        const h = total > 0 ? Math.max((total / maxVal) * 52, 4) : 0;
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5" title={`${m.label}: AED ${Number(total).toLocaleString()}`}>
            {total > 0 ? (
              <div className="w-full rounded-t-sm overflow-hidden" style={{ height: h }}>
                <div className="w-full" style={{ height: `${(m.fuel / total) * 100}%`, background: '#d97706', minHeight: m.fuel > 0 ? 2 : 0 }} />
                <div className="w-full" style={{ height: `${(m.expenses / total) * 100}%`, background: '#2563eb', minHeight: m.expenses > 0 ? 2 : 0 }} />
              </div>
            ) : (
              <div className="w-full h-0.5 bg-slate-100 rounded" />
            )}
            <span className="text-[8px] text-slate-400 font-medium">{m.label.split(' ')[0]}</span>
          </div>
        );
      })}
    </div>
  );
}
