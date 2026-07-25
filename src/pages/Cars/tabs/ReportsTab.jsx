import { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  Fuel, Gauge, Wrench, FileBarChart, Car, TrendingUp,
  ChevronDown, ChevronUp, Download, FileText, Filter,
  BarChart3, AlertCircle,
} from 'lucide-react';
import { useGetQuery } from '../../../api/apiSlice';
import { selectCurrentPropertyId, selectCurrentProperty } from '../../../store/slices/propertiesSlice';
import { CAR_EXPENSE_TYPES } from '../../../data/mockCars';
import { downloadFleetReportPDF } from '../../../utils/pdfReport';
import { cn } from '../../../utils/cn';

const fmt = (n) => Number(n ?? 0).toLocaleString('en-AE', { maximumFractionDigits: 0 });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const MONTHS = [
  { label: 'Full Year', value: '' },
  { label: 'January',   value: 1  }, { label: 'February',  value: 2  },
  { label: 'March',     value: 3  }, { label: 'April',     value: 4  },
  { label: 'May',       value: 5  }, { label: 'June',      value: 6  },
  { label: 'July',      value: 7  }, { label: 'August',    value: 8  },
  { label: 'September', value: 9  }, { label: 'October',   value: 10 },
  { label: 'November',  value: 11 }, { label: 'December',  value: 12 },
];

const TYPE_FILTERS = [
  { k: 'all',         l: 'All Costs',    color: '#0b1d3a' },
  { k: 'expenses',    l: 'Expenses',     color: '#2563eb' },
  { k: 'fuel',        l: 'Fuel',         color: '#d97706' },
  { k: 'maintenance', l: 'Maintenance',  color: '#7c3aed' },
];

const SEL = 'h-9 px-3 rounded-xl border border-slate-200 text-[12px] font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 cursor-pointer appearance-none pr-8';

// ── Small inline stat card ────────────────────────────────────────────────────
function MiniStat({ label, value, sub, color, bg, border, icon: Icon }) {
  return (
    <div className="bg-white rounded-2xl p-4 border flex flex-col gap-1" style={{ borderColor: border, boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</p>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: bg }}>
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
      </div>
      <p className="text-[20px] font-black leading-none tabular-nums" style={{ color: '#0b1d3a' }}>AED {fmt(value)}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Horizontal bar ────────────────────────────────────────────────────────────
function HBar({ value, max, color }) {
  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0;
  return (
    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ── Per-vehicle expandable card ───────────────────────────────────────────────
function VehicleCard({ car, fleetTotal, typeFilter, rank }) {
  const [open, setOpen] = useState(false);

  const showExp  = typeFilter === 'all' || typeFilter === 'expenses';
  const showFuel = typeFilter === 'all' || typeFilter === 'fuel';
  const showMnt  = typeFilter === 'all' || typeFilter === 'maintenance';

  const displayTotal = typeFilter === 'all'         ? car.totals.combined
    : typeFilter === 'expenses'    ? car.totals.expenses
    : typeFilter === 'fuel'        ? car.totals.fuel
    : car.totals.maintenance;

  const pctFleet = fleetTotal > 0 ? (displayTotal / fleetTotal) * 100 : 0;
  const carColor = car.color || '#2563eb';

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5" style={{ background: 'linear-gradient(135deg, #0b1d3a 0%, #152d5e 100%)' }}>
        <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-[11px] font-black text-white"
          style={{ background: `${carColor}30`, border: '1px solid rgba(255,255,255,0.15)' }}>
          {rank}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-[13px] leading-tight truncate">
            {car.nickname || `${car.make} ${car.model}`}
          </p>
          <p className="text-white/40 text-[10px] truncate">{car.plateNumber} · {car.driverName || 'No driver'} · {car.year}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-white font-black text-[16px] leading-none tabular-nums">AED {fmt(displayTotal)}</p>
          <p className="text-white/35 text-[10px] mt-0.5">{pctFleet.toFixed(1)}% of fleet</p>
        </div>
        <button onClick={() => setOpen((o) => !o)}
          className="ml-1 w-7 h-7 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all shrink-0">
          {open ? <ChevronUp className="w-3.5 h-3.5 text-white" /> : <ChevronDown className="w-3.5 h-3.5 text-white" />}
        </button>
      </div>

      {/* Fleet share bar */}
      <div className="h-0.5 bg-slate-100">
        <div className="h-full transition-all duration-500" style={{ width: `${pctFleet}%`, background: carColor }} />
      </div>

      {/* Cost summary strip */}
      <div className="grid divide-x divide-slate-100" style={{ gridTemplateColumns: `repeat(${[showExp, showFuel, showMnt].filter(Boolean).length + 1}, 1fr)` }}>
        {showExp && (
          <div className="px-3.5 py-2.5">
            <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wide mb-0.5">Expenses</p>
            <p className="text-[13px] font-black text-blue-600 tabular-nums">{car.totals.expenses > 0 ? `AED ${fmt(car.totals.expenses)}` : '—'}</p>
            <p className="text-[9px] text-slate-400">{car.totals.expenseCount} records</p>
            <HBar value={car.totals.expenses} max={car.totals.combined} color="#2563eb" />
          </div>
        )}
        {showFuel && (
          <div className="px-3.5 py-2.5">
            <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wide mb-0.5">Fuel</p>
            <p className="text-[13px] font-black text-amber-600 tabular-nums">{car.totals.fuel > 0 ? `AED ${fmt(car.totals.fuel)}` : '—'}</p>
            <p className="text-[9px] text-slate-400">{car.totals.fuelCount} fills · {Number(car.totals.liters).toFixed(0)}L</p>
            <HBar value={car.totals.fuel} max={car.totals.combined} color="#d97706" />
          </div>
        )}
        {showMnt && (
          <div className="px-3.5 py-2.5">
            <p className="text-[9px] font-bold text-purple-400 uppercase tracking-wide mb-0.5">Maintenance</p>
            <p className="text-[13px] font-black text-purple-600 tabular-nums">{car.totals.maintenance > 0 ? `AED ${fmt(car.totals.maintenance)}` : '—'}</p>
            <p className="text-[9px] text-slate-400">{car.totals.maintenanceCount} records</p>
            <HBar value={car.totals.maintenance} max={car.totals.combined} color="#7c3aed" />
          </div>
        )}
        <div className="px-3.5 py-2.5">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Total</p>
          <p className="text-[13px] font-black text-slate-800 tabular-nums">AED {fmt(displayTotal)}</p>
          <p className="text-[9px] text-slate-400">{pctFleet.toFixed(1)}% of fleet</p>
          <HBar value={displayTotal} max={fleetTotal} color={carColor} />
        </div>
      </div>

      {/* Expanded detail */}
      {open && (
        <div className="border-t border-slate-100 bg-slate-50/60 divide-y divide-slate-100">
          {/* Expenses */}
          {showExp && car.expenses.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-[9px] font-bold text-blue-500 uppercase tracking-wider mb-2.5">Expense Records</p>
              <div className="space-y-1.5">
                {car.expenses.map((e, i) => {
                  const cfg = CAR_EXPENSE_TYPES[e.type] ?? { label: e.type, color: '#64748b', bg: '#f8fafc' };
                  return (
                    <div key={i} className="flex items-center justify-between gap-3 py-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                        <p className="text-[11px] text-slate-600 truncate">{e.description || cfg.label}</p>
                        {e.vendor && <p className="text-[10px] text-slate-400 truncate hidden sm:block">@ {e.vendor}</p>}
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-[10px] text-slate-400">{fmtDate(e.date)}</span>
                        <span className="text-[12px] font-bold text-blue-700 tabular-nums">AED {fmt(e.amount)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* Fuel */}
          {showFuel && car.fuelLogs.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wider mb-2.5">Fuel Fill-ups</p>
              <div className="space-y-1.5">
                {car.fuelLogs.map((f, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-1">
                    <div className="flex items-center gap-2">
                      <Fuel className="w-3 h-3 text-amber-400 shrink-0" />
                      <p className="text-[11px] text-slate-600">
                        {f.liters ? `${Number(f.liters).toFixed(1)}L` : 'Fill-up'}
                        {f.station ? ` · ${f.station}` : ''}
                        {f.mileage ? ` · ${Number(f.mileage).toLocaleString()} km` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-[10px] text-slate-400">{fmtDate(f.date)}</span>
                      <span className="text-[12px] font-bold text-amber-700 tabular-nums">AED {fmt(f.totalPrice)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Maintenance */}
          {showMnt && car.maintenance.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-[9px] font-bold text-purple-500 uppercase tracking-wider mb-2.5">Maintenance Records</p>
              <div className="space-y-1.5">
                {car.maintenance.map((m, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <Wrench className="w-3 h-3 text-purple-400 shrink-0" />
                      <p className="text-[11px] text-slate-600 truncate">{m.type || 'Maintenance'}</p>
                      {m.vendor && <p className="text-[10px] text-slate-400 hidden sm:block">@ {m.vendor}</p>}
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-[10px] text-slate-400">{fmtDate(m.date)}</span>
                      <span className="text-[12px] font-bold text-purple-700 tabular-nums">AED {fmt(m.cost)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {car.expenses.length === 0 && car.fuelLogs.length === 0 && car.maintenance.length === 0 && (
            <div className="px-4 py-4 text-center text-[11px] text-slate-400">No records for this period</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ReportsTab ───────────────────────────────────────────────────────────
export default function ReportsTab() {
  const propertyId = useSelector(selectCurrentPropertyId);
  const property   = useSelector(selectCurrentProperty);
  const now        = new Date();

  const [year,      setYear]      = useState(now.getFullYear());
  const [month,     setMonth]     = useState('');
  const [vehicleF,  setVehicleF]  = useState('all');
  const [typeF,     setTypeF]     = useState('all');
  const [pdfBusy,   setPdfBusy]   = useState(false);

  const params = { propertyId, year };
  if (month) params.month = month;

  const { data: report, isLoading } = useGetQuery(
    { path: '/cars/report', params },
    { skip: !propertyId },
  );

  // Derive per-car list, applying vehicle filter client-side
  const { filteredCars, filteredTotals, maxVal } = useMemo(() => {
    if (!report) return { filteredCars: [], filteredTotals: {}, maxVal: 1 };

    const cars = vehicleF === 'all'
      ? [...report.perCar]
      : report.perCar.filter((c) => c.carId === vehicleF);

    // Sort by whichever column the type filter shows
    const sortKey = typeF === 'expenses' ? 'expenses' : typeF === 'fuel' ? 'fuel' : typeF === 'maintenance' ? 'maintenance' : 'combined';
    cars.sort((a, b) => b.totals[sortKey] - a.totals[sortKey]);

    const totals = cars.reduce(
      (acc, c) => ({
        expenses:    acc.expenses    + c.totals.expenses,
        fuel:        acc.fuel        + c.totals.fuel,
        maintenance: acc.maintenance + c.totals.maintenance,
        combined:    acc.combined    + c.totals.combined,
        liters:      acc.liters      + c.totals.liters,
        expenseCount:     acc.expenseCount     + c.totals.expenseCount,
        fuelCount:        acc.fuelCount        + c.totals.fuelCount,
        maintenanceCount: acc.maintenanceCount + c.totals.maintenanceCount,
      }),
      { expenses: 0, fuel: 0, maintenance: 0, combined: 0, liters: 0, expenseCount: 0, fuelCount: 0, maintenanceCount: 0 },
    );

    const mv = Math.max(...(report.monthlyTrend ?? []).map((m) => m.expenses + m.fuel + m.maintenance), 1);

    return { filteredCars: cars, filteredTotals: totals, maxVal: mv };
  }, [report, vehicleF, typeF]);

  const periodLabel = month
    ? `${MONTHS.find((m) => m.value === Number(month))?.label} ${year}`
    : `Year ${year}`;

  const displayTotal = typeF === 'all'         ? filteredTotals.combined
    : typeF === 'expenses'    ? filteredTotals.expenses
    : typeF === 'fuel'        ? filteredTotals.fuel
    : filteredTotals.maintenance;

  const handleDownloadPDF = async () => {
    if (!report || pdfBusy) return;
    setPdfBusy(true);
    try {
      downloadFleetReportPDF({
        report,
        periodLabel,
        propertyName: property?.name,
        propertyType: property?.type,
        vehicleFilter: vehicleF,
        typeFilter:    typeF,
      });
    } finally {
      setPdfBusy(false);
    }
  };

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-14 rounded-2xl bg-slate-100" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-100" />)}
      </div>
      {[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-slate-100" />)}
    </div>
  );

  if (!report) return null;

  const { monthlyTrend } = report;

  return (
    <div className="space-y-5">

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />

          {/* Year */}
          <div className="relative">
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={SEL}>
              {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
          </div>

          {/* Month */}
          <div className="relative">
            <select value={month} onChange={(e) => setMonth(e.target.value)} className={SEL}>
              {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
          </div>

          {/* Vehicle */}
          <div className="relative">
            <select value={vehicleF} onChange={(e) => setVehicleF(e.target.value)} className={SEL}>
              <option value="all">All Vehicles ({report.perCar.length})</option>
              {report.perCar.map((c) => (
                <option key={c.carId} value={c.carId}>
                  {c.nickname || `${c.make} ${c.model}`} · {c.plateNumber}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
          </div>

          {/* Type filter pills */}
          <div className="flex bg-slate-50 border border-slate-100 rounded-xl p-1 gap-0.5">
            {TYPE_FILTERS.map((t) => (
              <button key={t.k} onClick={() => setTypeF(t.k)}
                className={cn('px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all',
                  typeF === t.k ? 'text-white' : 'text-slate-500 hover:text-slate-700')}
                style={typeF === t.k ? { background: t.k === 'all' ? 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' : t.color } : {}}>
                {t.l}
              </button>
            ))}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Period label */}
          <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">{periodLabel}</span>

          {/* Download PDF */}
          <button onClick={handleDownloadPDF} disabled={pdfBusy}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-[11px] font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' }}>
            <Download className="w-3.5 h-3.5" />
            {pdfBusy ? 'Generating…' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* ── Fleet totals ───────────────────────────────────────────────────── */}
      {typeF === 'all' ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MiniStat label="Fleet Expenses"   value={filteredTotals.expenses}    sub={`${filteredTotals.expenseCount} records`}        color="#2563eb" bg="#eff6ff" border="#bfdbfe" icon={Gauge}        />
          <MiniStat label="Fleet Fuel"       value={filteredTotals.fuel}        sub={`${Number(filteredTotals.liters ?? 0).toFixed(0)} litres · ${filteredTotals.fuelCount} fills`} color="#d97706" bg="#fffbeb" border="#fde68a" icon={Fuel}         />
          <MiniStat label="Maintenance"      value={filteredTotals.maintenance} sub={`${filteredTotals.maintenanceCount} records`}    color="#7c3aed" bg="#f5f3ff" border="#ddd6fe" icon={Wrench}       />
          <MiniStat label="Total Fleet Cost" value={filteredTotals.combined}    sub={periodLabel}                                     color="#0b1d3a" bg="#f1f5f9" border="#cbd5e1" icon={FileBarChart} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {typeF === 'expenses'    && <MiniStat label="Fleet Expenses"  value={filteredTotals.expenses}    sub={`${filteredTotals.expenseCount} records`}        color="#2563eb" bg="#eff6ff" border="#bfdbfe" icon={Gauge}  />}
          {typeF === 'fuel'        && <MiniStat label="Fleet Fuel"      value={filteredTotals.fuel}        sub={`${Number(filteredTotals.liters ?? 0).toFixed(0)} litres`} color="#d97706" bg="#fffbeb" border="#fde68a" icon={Fuel}   />}
          {typeF === 'maintenance' && <MiniStat label="Maintenance"     value={filteredTotals.maintenance} sub={`${filteredTotals.maintenanceCount} records`}    color="#7c3aed" bg="#f5f3ff" border="#ddd6fe" icon={Wrench} />}
          <MiniStat label="Fleet Total" value={displayTotal} sub={`${filteredCars.length} vehicle${filteredCars.length !== 1 ? 's' : ''}`} color="#0b1d3a" bg="#f1f5f9" border="#cbd5e1" icon={FileBarChart} />
        </div>
      )}

      {/* ── Per-vehicle breakdown ───────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {vehicleF === 'all' ? `${filteredCars.length} Vehicles` : 'Vehicle Detail'} · Sorted by Spend
          </p>
          {filteredCars.length > 0 && (
            <p className="text-[11px] font-semibold text-slate-500">
              Fleet total: <span className="font-black text-slate-700">AED {fmt(displayTotal)}</span>
            </p>
          )}
        </div>

        {filteredCars.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-100">
            <AlertCircle className="w-9 h-9 mb-3 text-slate-200" />
            <p className="text-[13px] font-semibold text-slate-400">No data for {periodLabel}</p>
            <p className="text-[11px] text-slate-300 mt-1">Try a different period or vehicle</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCars.map((car, i) => (
              <VehicleCard
                key={car.carId}
                car={car}
                fleetTotal={displayTotal}
                typeFilter={typeF}
                rank={i + 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Monthly trend ───────────────────────────────────────────────────── */}
      {vehicleF === 'all' && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-400" />
            <p className="text-[13px] font-bold text-slate-700">Monthly Trend — {year}</p>
          </div>

          {/* Bar chart */}
          <div className="px-5 pt-5 pb-2 flex items-end gap-1 h-22">
            {monthlyTrend.map((m, i) => {
              const showE = typeF === 'all' || typeF === 'expenses';
              const showF = typeF === 'all' || typeF === 'fuel';
              const showM = typeF === 'all' || typeF === 'maintenance';
              const total = (showE ? m.expenses : 0) + (showF ? m.fuel : 0) + (showM ? m.maintenance : 0);
              const maxForBar = Math.max(...monthlyTrend.map((x) => (showE ? x.expenses : 0) + (showF ? x.fuel : 0) + (showM ? x.maintenance : 0)), 1);
              const h = total > 0 ? Math.max((total / maxForBar) * 56, 4) : 0;
              const isCur = m.month === now.getMonth() + 1 && report.year === now.getFullYear();
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5"
                  title={`${m.label} ${year}: AED ${Number(total).toLocaleString()}`}>
                  {total > 0 ? (
                    <div className="w-full rounded-t overflow-hidden" style={{ height: h }}>
                      {showM && m.maintenance > 0 && <div style={{ height: `${((showM ? m.maintenance : 0) / total) * 100}%`, background: '#7c3aed', minHeight: 2 }} />}
                      {showF && m.fuel        > 0 && <div style={{ height: `${((showF ? m.fuel        : 0) / total) * 100}%`, background: '#d97706', minHeight: 2 }} />}
                      {showE && m.expenses    > 0 && <div style={{ height: `${((showE ? m.expenses    : 0) / total) * 100}%`, background: '#2563eb', minHeight: 2 }} />}
                    </div>
                  ) : (
                    <div className="w-full h-0.5 bg-slate-100 rounded" />
                  )}
                  <span className={cn('text-[8px] font-medium', isCur ? 'text-blue-500 font-bold' : 'text-slate-400')}>{m.label}</span>
                </div>
              );
            })}
          </div>

          {/* Trend table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wide">Month</th>
                  {(typeF === 'all' || typeF === 'expenses')    && <th className="text-right px-4 py-2 text-[9px] font-bold text-blue-400 uppercase tracking-wide">Expenses</th>}
                  {(typeF === 'all' || typeF === 'fuel')        && <th className="text-right px-4 py-2 text-[9px] font-bold text-amber-500 uppercase tracking-wide">Fuel</th>}
                  {(typeF === 'all' || typeF === 'maintenance') && <th className="text-right px-4 py-2 text-[9px] font-bold text-purple-500 uppercase tracking-wide">Maintenance</th>}
                  <th className="text-right px-5 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wide">Total</th>
                </tr>
              </thead>
              <tbody>
                {[...monthlyTrend].reverse().map((m, i) => {
                  const showE = typeF === 'all' || typeF === 'expenses';
                  const showF = typeF === 'all' || typeF === 'fuel';
                  const showM = typeF === 'all' || typeF === 'maintenance';
                  const total = (showE ? m.expenses : 0) + (showF ? m.fuel : 0) + (showM ? m.maintenance : 0);
                  const isCur = m.month === now.getMonth() + 1 && report.year === now.getFullYear();
                  return (
                    <tr key={i} className={cn('border-b border-slate-50 transition-colors', isCur ? 'bg-blue-50/40' : 'hover:bg-slate-50/60')}>
                      <td className="px-5 py-2.5 text-[11px] font-semibold text-slate-700">
                        {m.label} {year}
                        {isCur && <span className="ml-2 text-[8px] font-bold text-blue-500 bg-blue-100 px-1.5 py-0.5 rounded-full">Current</span>}
                      </td>
                      {showE && <td className="px-4 py-2.5 text-right text-[11px] font-medium text-blue-600">{m.expenses > 0 ? `AED ${fmt(m.expenses)}` : <span className="text-slate-200">—</span>}</td>}
                      {showF && <td className="px-4 py-2.5 text-right text-[11px] font-medium text-amber-600">{m.fuel > 0 ? `AED ${fmt(m.fuel)}` : <span className="text-slate-200">—</span>}</td>}
                      {showM && <td className="px-4 py-2.5 text-right text-[11px] font-medium text-purple-600">{m.maintenance > 0 ? `AED ${fmt(m.maintenance)}` : <span className="text-slate-200">—</span>}</td>}
                      <td className="px-5 py-2.5 text-right text-[11px] font-bold text-slate-900">{total > 0 ? `AED ${fmt(total)}` : <span className="text-slate-200">—</span>}</td>
                    </tr>
                  );
                })}
                {/* Year total */}
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td className="px-5 py-3 text-[11px] font-black text-slate-800">Year Total</td>
                  {(typeF === 'all' || typeF === 'expenses')    && <td className="px-4 py-3 text-right text-[11px] font-black text-blue-700">AED {fmt(filteredTotals.expenses)}</td>}
                  {(typeF === 'all' || typeF === 'fuel')        && <td className="px-4 py-3 text-right text-[11px] font-black text-amber-700">AED {fmt(filteredTotals.fuel)}</td>}
                  {(typeF === 'all' || typeF === 'maintenance') && <td className="px-4 py-3 text-right text-[11px] font-black text-purple-700">AED {fmt(filteredTotals.maintenance)}</td>}
                  <td className="px-5 py-3 text-right text-[11px] font-black text-slate-900">AED {fmt(displayTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-5 py-3 border-t border-slate-50">
            {(typeF === 'all' || typeF === 'expenses')    && <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500"><div className="w-2.5 h-2.5 rounded-sm bg-blue-500" />Expenses</div>}
            {(typeF === 'all' || typeF === 'fuel')        && <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500"><div className="w-2.5 h-2.5 rounded-sm bg-amber-500" />Fuel</div>}
            {(typeF === 'all' || typeF === 'maintenance') && <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500"><div className="w-2.5 h-2.5 rounded-sm bg-purple-500" />Maintenance</div>}
            <div className="flex-1" />
            <button onClick={handleDownloadPDF} disabled={pdfBusy}
              className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-40">
              <FileText className="w-3 h-3" />
              {pdfBusy ? 'Generating…' : `Download ${periodLabel} Report`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
