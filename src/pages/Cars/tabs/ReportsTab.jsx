import { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  Fuel, Gauge, Wrench, FileBarChart, Car, TrendingUp,
  ChevronDown, ChevronUp, Download, FileText, Filter,
  BarChart3, AlertCircle, Calendar, Hash,
} from 'lucide-react';
import { useGetQuery } from '../../../api/apiSlice';
import { selectCurrentPropertyId, selectCurrentProperty } from '../../../store/slices/propertiesSlice';
import { CAR_EXPENSE_TYPES } from '../../../data/mockCars';
import { downloadFleetReportPDF } from '../../../utils/pdfReport';
import { cn } from '../../../utils/cn';

const fmt     = (n) => Number(n ?? 0).toLocaleString('en-AE', { maximumFractionDigits: 0 });
const fmtFull = (n) => Number(n ?? 0).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  { k: 'all',         l: 'All',          icon: FileBarChart, color: '#0b1d3a' },
  { k: 'expenses',    l: 'Expenses',     icon: Gauge,        color: '#2563eb' },
  { k: 'fuel',        l: 'Fuel',         icon: Fuel,         color: '#d97706' },
  { k: 'maintenance', l: 'Maintenance',  icon: Wrench,       color: '#7c3aed' },
];

const SEL = 'w-full h-9 px-3 rounded-xl border border-slate-200 text-[12px] font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 cursor-pointer appearance-none';

// ── Summary stat card ─────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, bg, border, icon: Icon }) {
  return (
    <div className="bg-white rounded-2xl p-4 border" style={{ borderColor: border, boxShadow: '0 1px 10px rgba(0,0,0,0.06)' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
          <Icon className="w-4.5 h-4.5" style={{ color }} />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest mt-1 text-right leading-tight" style={{ color }}>{label}</p>
      </div>
      <p className="text-[22px] font-black leading-none tabular-nums text-slate-900">AED {fmt(value)}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-1.5">{sub}</p>}
    </div>
  );
}

// ── Horizontal fill bar ───────────────────────────────────────────────────────
function FillBar({ value, max, color }) {
  const pct = max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0;
  return (
    <div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-1">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ── Vehicle cost card (expandable) ────────────────────────────────────────────
function VehicleCard({ car, fleetTotal, typeFilter, rank }) {
  const [open, setOpen] = useState(false);

  const showExp  = typeFilter === 'all' || typeFilter === 'expenses';
  const showFuel = typeFilter === 'all' || typeFilter === 'fuel';
  const showMnt  = typeFilter === 'all' || typeFilter === 'maintenance';

  const displayTotal = typeFilter === 'expenses' ? car.totals.expenses
    : typeFilter === 'fuel'        ? car.totals.fuel
    : typeFilter === 'maintenance' ? car.totals.maintenance
    : car.totals.combined;

  const pctFleet = fleetTotal > 0 ? (displayTotal / fleetTotal) * 100 : 0;
  const carColor = car.color || '#2563eb';
  const carLabel = car.nickname || `${car.make} ${car.model}`;

  const hasRecords = (showExp && car.expenses.length > 0)
    || (showFuel && car.fuelLogs.length > 0)
    || (showMnt  && car.maintenance.length > 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

      {/* ── Card header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3.5 px-5 py-4" style={{ background: 'linear-gradient(135deg, #0b1d3a 0%, #152d5e 100%)' }}>
        {/* Rank badge */}
        <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-[13px] font-black text-white"
          style={{ background: `${carColor}35`, border: '1.5px solid rgba(255,255,255,0.18)' }}>
          #{rank}
        </div>

        {/* Car info */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-[15px] leading-tight truncate">{carLabel}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-white/55 text-[11px] font-medium">{car.plateNumber}</span>
            {car.driverName && <span className="text-white/35 text-[10px]">· {car.driverName}</span>}
            {car.year && <span className="text-white/35 text-[10px]">· {car.year}</span>}
          </div>
        </div>

        {/* Amount */}
        <div className="text-right shrink-0">
          <p className="text-white font-black text-[20px] leading-none tabular-nums">AED {fmt(displayTotal)}</p>
          <p className="text-white/40 text-[10px] mt-1">{pctFleet.toFixed(1)}% of fleet</p>
        </div>

        {/* Expand toggle */}
        {hasRecords && (
          <button onClick={() => setOpen((o) => !o)}
            className="ml-1 w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center transition-all shrink-0">
            {open ? <ChevronUp className="w-4 h-4 text-white" /> : <ChevronDown className="w-4 h-4 text-white" />}
          </button>
        )}
      </div>

      {/* Fleet share bar */}
      <div className="h-1 bg-slate-100">
        <div className="h-full transition-all duration-700" style={{ width: `${pctFleet}%`, background: carColor }} />
      </div>

      {/* ── Cost breakdown strip ─────────────────────────────────────────────── */}
      <div className={cn('grid divide-x divide-slate-100', typeFilter === 'all' ? 'grid-cols-4' : 'grid-cols-2')}>
        {typeFilter === 'all' ? (
          <>
            <CostCell label="Expenses"    value={car.totals.expenses}    sub={`${car.totals.expenseCount} records`}      color="#2563eb" max={car.totals.combined} />
            <CostCell label="Fuel"        value={car.totals.fuel}        sub={`${Number(car.totals.liters).toFixed(0)}L · ${car.totals.fuelCount} fills`} color="#d97706" max={car.totals.combined} />
            <CostCell label="Maintenance" value={car.totals.maintenance} sub={`${car.totals.maintenanceCount} records`}  color="#7c3aed" max={car.totals.combined} />
            <CostCell label="Total Cost"  value={car.totals.combined}    sub={`${pctFleet.toFixed(1)}% of fleet`}        color={carColor} max={fleetTotal} />
          </>
        ) : (
          <>
            {typeFilter === 'expenses'    && <CostCell label="Expenses"    value={car.totals.expenses}    sub={`${car.totals.expenseCount} records`}      color="#2563eb" max={fleetTotal} />}
            {typeFilter === 'fuel'        && <CostCell label="Fuel"        value={car.totals.fuel}        sub={`${Number(car.totals.liters).toFixed(0)}L · ${car.totals.fuelCount} fills`} color="#d97706" max={fleetTotal} />}
            {typeFilter === 'maintenance' && <CostCell label="Maintenance" value={car.totals.maintenance} sub={`${car.totals.maintenanceCount} records`}  color="#7c3aed" max={fleetTotal} />}
            <CostCell label="Fleet Share" value={displayTotal} sub={`${pctFleet.toFixed(1)}% of total`} color={carColor} max={fleetTotal} />
          </>
        )}
      </div>

      {/* ── Expanded records ─────────────────────────────────────────────────── */}
      {open && hasRecords && (
        <div className="border-t border-slate-100 divide-y divide-slate-100">

          {/* Expenses */}
          {showExp && car.expenses.length > 0 && (
            <RecordSection
              title="Expenses"
              color="#2563eb"
              bg="#eff6ff"
              icon={<Gauge className="w-3.5 h-3.5" style={{ color: '#2563eb' }} />}
              total={car.totals.expenses}
              records={car.expenses.map((e) => {
                const cfg = CAR_EXPENSE_TYPES[e.type] ?? { label: e.type || 'Expense', color: '#64748b', bg: '#f8fafc' };
                return {
                  badge: { label: cfg.label, color: cfg.color, bg: cfg.bg },
                  primary: e.description || cfg.label,
                  secondary: e.vendor ? `@ ${e.vendor}` : '',
                  date: e.date,
                  amount: e.amount,
                  amountColor: '#1d4ed8',
                };
              })}
            />
          )}

          {/* Fuel */}
          {showFuel && car.fuelLogs.length > 0 && (
            <RecordSection
              title="Fuel Fill-ups"
              color="#d97706"
              bg="#fffbeb"
              icon={<Fuel className="w-3.5 h-3.5" style={{ color: '#d97706' }} />}
              total={car.totals.fuel}
              records={car.fuelLogs.map((f) => ({
                badge: null,
                primary: f.liters ? `${Number(f.liters).toFixed(1)} Litres` : 'Fill-up',
                secondary: [f.station, f.mileage ? `${Number(f.mileage).toLocaleString()} km` : ''].filter(Boolean).join(' · '),
                date: f.date,
                amount: f.totalPrice,
                amountColor: '#92400e',
              }))}
            />
          )}

          {/* Maintenance */}
          {showMnt && car.maintenance.length > 0 && (
            <RecordSection
              title="Maintenance"
              color="#7c3aed"
              bg="#f5f3ff"
              icon={<Wrench className="w-3.5 h-3.5" style={{ color: '#7c3aed' }} />}
              total={car.totals.maintenance}
              records={car.maintenance.map((m) => ({
                badge: null,
                primary: m.type || 'Maintenance',
                secondary: m.vendor ? `@ ${m.vendor}` : '',
                date: m.date,
                amount: m.cost,
                amountColor: '#5b21b6',
              }))}
            />
          )}
        </div>
      )}

      {/* No records state */}
      {open && !hasRecords && (
        <div className="px-5 py-6 text-center border-t border-slate-100">
          <p className="text-[12px] text-slate-400">No records for this period</p>
        </div>
      )}
    </div>
  );
}

// ── Single cost cell in the strip ─────────────────────────────────────────────
function CostCell({ label, value, sub, color, max }) {
  return (
    <div className="px-4 py-3">
      <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color }}>{label}</p>
      <p className="text-[15px] font-black tabular-nums" style={{ color: value > 0 ? '#0f172a' : '#cbd5e1' }}>
        {value > 0 ? `AED ${fmt(value)}` : '—'}
      </p>
      <p className="text-[10px] text-slate-400 mt-0.5 truncate">{sub}</p>
      <FillBar value={value} max={max} color={color} />
    </div>
  );
}

// ── Expanded record section (expenses / fuel / maintenance) ───────────────────
function RecordSection({ title, color, bg, icon, total, records }) {
  return (
    <div className="bg-slate-50/50">
      {/* Section header */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: bg }}>
            {icon}
          </div>
          <p className="text-[11px] font-bold" style={{ color }}>{title}</p>
          <span className="text-[9px] font-semibold text-slate-400">{records.length} record{records.length !== 1 ? 's' : ''}</span>
        </div>
        <p className="text-[13px] font-black tabular-nums" style={{ color }}>AED {fmt(total)}</p>
      </div>

      {/* Column header */}
      <div className="grid px-5 py-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-400"
        style={{ gridTemplateColumns: '1fr 90px 80px' }}>
        <span>Description</span>
        <span className="text-right">Date</span>
        <span className="text-right">Amount</span>
      </div>

      {/* Records */}
      <div className="divide-y divide-slate-100">
        {records.map((r, i) => (
          <div key={i} className="grid items-center px-5 py-2.5 gap-2 hover:bg-white/80 transition-colors"
            style={{ gridTemplateColumns: '1fr 90px 80px' }}>
            <div className="min-w-0">
              {r.badge && (
                <span className="inline-flex text-[9px] font-bold px-1.5 py-0.5 rounded-full mr-1.5"
                  style={{ background: r.badge.bg, color: r.badge.color }}>
                  {r.badge.label}
                </span>
              )}
              <span className="text-[12px] text-slate-700 font-medium">{r.primary}</span>
              {r.secondary && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{r.secondary}</p>}
            </div>
            <p className="text-[10px] text-slate-400 text-right">{fmtDate(r.date)}</p>
            <p className="text-[13px] font-bold tabular-nums text-right" style={{ color: r.amountColor }}>
              AED {fmt(r.amount)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ReportsTab ───────────────────────────────────────────────────────────
export default function ReportsTab() {
  const propertyId = useSelector(selectCurrentPropertyId);
  const property   = useSelector(selectCurrentProperty);
  const now        = new Date();

  const [year,    setYear]    = useState(now.getFullYear());
  const [month,   setMonth]   = useState('');
  const [vehicleF, setVehicleF] = useState('all');
  const [typeF,   setTypeF]   = useState('all');
  const [pdfBusy, setPdfBusy] = useState(false);

  const params = { propertyId, year };
  if (month) params.month = month;

  const { data: report, isLoading } = useGetQuery(
    { path: '/cars/report', params },
    { skip: !propertyId },
  );

  const { filteredCars, filteredTotals } = useMemo(() => {
    if (!report) return { filteredCars: [], filteredTotals: {} };

    const cars = vehicleF === 'all'
      ? [...report.perCar]
      : report.perCar.filter((c) => c.carId === vehicleF);

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

    return { filteredCars: cars, filteredTotals: totals };
  }, [report, vehicleF, typeF]);

  const periodLabel = month
    ? `${MONTHS.find((m) => m.value === Number(month))?.label} ${year}`
    : `Year ${year}`;

  const displayTotal = typeF === 'expenses' ? filteredTotals.expenses
    : typeF === 'fuel'        ? filteredTotals.fuel
    : typeF === 'maintenance' ? filteredTotals.maintenance
    : filteredTotals.combined;

  const handleDownloadPDF = async () => {
    if (!report || pdfBusy) return;
    setPdfBusy(true);
    try {
      downloadFleetReportPDF({ report, periodLabel, propertyName: property?.name, propertyType: property?.type, vehicleFilter: vehicleF, typeFilter: typeF });
    } finally { setPdfBusy(false); }
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-28 rounded-2xl bg-slate-100" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-slate-100" />)}
      </div>
      {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-slate-100" />)}
    </div>
  );

  if (!report) return null;

  const { monthlyTrend } = report;
  const maxBarVal = Math.max(...(monthlyTrend ?? []).map((m) => {
    const showE = typeF === 'all' || typeF === 'expenses';
    const showF = typeF === 'all' || typeF === 'fuel';
    const showM = typeF === 'all' || typeF === 'maintenance';
    return (showE ? m.expenses : 0) + (showF ? m.fuel : 0) + (showM ? m.maintenance : 0);
  }), 1);

  return (
    <div className="space-y-5">

      {/* ── Filter bar ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4" style={{ boxShadow: '0 1px 10px rgba(0,0,0,0.05)' }}>
        <div className="flex flex-wrap gap-3 items-end">

          {/* Year */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Year</label>
            <div className="relative">
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={SEL} style={{ width: 90 }}>
                {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
            </div>
          </div>

          {/* Month */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Month</label>
            <div className="relative">
              <select value={month} onChange={(e) => setMonth(e.target.value)} className={SEL} style={{ width: 130 }}>
                {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
            </div>
          </div>

          {/* Vehicle */}
          <div className="flex flex-col gap-1 flex-1 min-w-40">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vehicle</label>
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
          </div>

          {/* Cost type pills */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cost Type</label>
            <div className="flex bg-slate-50 border border-slate-100 rounded-xl p-1 gap-0.5">
              {TYPE_FILTERS.map((t) => {
                const Icon = t.icon;
                return (
                  <button key={t.k} onClick={() => setTypeF(t.k)}
                    className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all',
                      typeF === t.k ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700')}
                    style={typeF === t.k ? { background: t.k === 'all' ? 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' : t.color } : {}}>
                    <Icon className="w-3 h-3" />
                    {t.l}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1" />

          {/* Download */}
          <button onClick={handleDownloadPDF} disabled={pdfBusy}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-[12px] font-bold hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-50 h-9"
            style={{ background: 'linear-gradient(135deg,#0b1d3a,#1e3a6e)' }}>
            <Download className="w-3.5 h-3.5" />
            {pdfBusy ? 'Generating…' : 'PDF Report'}
          </button>
        </div>

        {/* Period label */}
        <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-slate-300" />
          <p className="text-[11px] text-slate-500 font-semibold">
            Showing <span className="text-slate-700">{periodLabel}</span>
            {vehicleF !== 'all' && (
              <> for <span className="text-slate-700">{(() => { const c = report.perCar.find((c) => c.carId === vehicleF); return c?.nickname || `${c?.make} ${c?.model}`; })()}</span></>
            )}
            {' '}· <span className="text-slate-700">AED {fmt(displayTotal)}</span> total
          </p>
        </div>
      </div>

      {/* ── Fleet summary cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(typeF === 'all' || typeF === 'expenses') && (
          <StatCard label="Fleet Expenses"   value={filteredTotals.expenses}    sub={`${filteredTotals.expenseCount ?? 0} expense records`}       color="#2563eb" bg="#eff6ff" border="#bfdbfe" icon={Gauge}        />
        )}
        {(typeF === 'all' || typeF === 'fuel') && (
          <StatCard label="Fuel Cost"        value={filteredTotals.fuel}        sub={`${Number(filteredTotals.liters ?? 0).toFixed(0)}L · ${filteredTotals.fuelCount ?? 0} fill-ups`} color="#d97706" bg="#fffbeb" border="#fde68a" icon={Fuel}         />
        )}
        {(typeF === 'all' || typeF === 'maintenance') && (
          <StatCard label="Maintenance"      value={filteredTotals.maintenance} sub={`${filteredTotals.maintenanceCount ?? 0} service records`}     color="#7c3aed" bg="#f5f3ff" border="#ddd6fe" icon={Wrench}       />
        )}
        <StatCard label="Total Fleet Cost"   value={displayTotal}              sub={`${filteredCars.length} vehicle${filteredCars.length !== 1 ? 's' : ''} · ${periodLabel}`} color="#0b1d3a" bg="#f1f5f9" border="#cbd5e1" icon={FileBarChart} />
      </div>

      {/* ── Per-vehicle breakdown ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-[14px] font-bold text-slate-800">Vehicle Breakdown</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {vehicleF === 'all' ? `${filteredCars.length} vehicles sorted by spend` : 'Showing selected vehicle'} · Tap a row to see individual records
            </p>
          </div>
          {filteredCars.length > 0 && (
            <p className="text-[11px] font-bold text-slate-500 hidden sm:block">
              Fleet total: <span className="text-slate-800 text-[13px]">AED {fmt(displayTotal)}</span>
            </p>
          )}
        </div>

        {filteredCars.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-100">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-[14px] font-semibold text-slate-500">No data for {periodLabel}</p>
            <p className="text-[12px] text-slate-400 mt-1">Try a different period or vehicle filter</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCars.map((car, i) => (
              <VehicleCard key={car.carId} car={car} fleetTotal={displayTotal} typeFilter={typeF} rank={i + 1} />
            ))}
          </div>
        )}
      </div>

      {/* ── Monthly trend ─────────────────────────────────────────────────────── */}
      {vehicleF === 'all' && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-[14px] font-bold text-slate-800">Monthly Trend</p>
                <p className="text-[10px] text-slate-400">Fleet costs by month — {year}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {(typeF === 'all' || typeF === 'expenses')    && <LegendDot color="#2563eb" label="Expenses" />}
              {(typeF === 'all' || typeF === 'fuel')        && <LegendDot color="#d97706" label="Fuel" />}
              {(typeF === 'all' || typeF === 'maintenance') && <LegendDot color="#7c3aed" label="Maintenance" />}
            </div>
          </div>

          {/* Bar chart — taller and labeled */}
          <div className="px-5 pt-6 pb-3">
            <div className="flex items-end gap-1.5" style={{ height: 120 }}>
              {monthlyTrend.map((m, i) => {
                const showE = typeF === 'all' || typeF === 'expenses';
                const showF = typeF === 'all' || typeF === 'fuel';
                const showM = typeF === 'all' || typeF === 'maintenance';
                const total = (showE ? m.expenses : 0) + (showF ? m.fuel : 0) + (showM ? m.maintenance : 0);
                const h     = total > 0 ? Math.max((total / maxBarVal) * 88, 4) : 0;
                const isCur = m.month === now.getMonth() + 1 && report.year === now.getFullYear();
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1"
                    title={`${m.label} ${year}: AED ${Number(total).toLocaleString()}`}>
                    {total > 0 && (
                      <p className="text-[8px] font-bold text-slate-400 text-center leading-none hidden sm:block">
                        {total >= 1000 ? `${(total / 1000).toFixed(0)}k` : fmt(total)}
                      </p>
                    )}
                    <div className="w-full" style={{ height: h > 0 ? h : 2 }}>
                      {h > 0 ? (
                        <div className="w-full h-full rounded-t-md overflow-hidden flex flex-col justify-end">
                          {showE && m.expenses    > 0 && <div style={{ height: `${(m.expenses    / total) * 100}%`, background: '#2563eb', minHeight: 2 }} />}
                          {showF && m.fuel        > 0 && <div style={{ height: `${(m.fuel        / total) * 100}%`, background: '#d97706', minHeight: 2 }} />}
                          {showM && m.maintenance > 0 && <div style={{ height: `${(m.maintenance / total) * 100}%`, background: '#7c3aed', minHeight: 2 }} />}
                        </div>
                      ) : (
                        <div className="w-full h-0.5 bg-slate-100 rounded-full" />
                      )}
                    </div>
                    <span className={cn('text-[9px] font-semibold', isCur ? 'text-blue-500 font-bold' : 'text-slate-400')}>
                      {m.label.slice(0, 3)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly breakdown table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Month</th>
                  {(typeF === 'all' || typeF === 'expenses')    && <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: '#2563eb' }}>Expenses</th>}
                  {(typeF === 'all' || typeF === 'fuel')        && <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: '#d97706' }}>Fuel</th>}
                  {(typeF === 'all' || typeF === 'maintenance') && <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: '#7c3aed' }}>Maintenance</th>}
                  <th className="text-right px-5 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total</th>
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
                    <tr key={i} className={cn('border-b border-slate-50 transition-colors', isCur ? 'bg-blue-50/50' : 'hover:bg-slate-50/70')}>
                      <td className="px-5 py-3 text-[12px] font-semibold text-slate-700">
                        {m.label} {year}
                        {isCur && <span className="ml-2 text-[9px] font-bold text-blue-500 bg-blue-100 px-2 py-0.5 rounded-full">Current</span>}
                      </td>
                      {showE && <td className="px-4 py-3 text-right text-[12px] font-medium" style={{ color: m.expenses > 0 ? '#2563eb' : '#e2e8f0' }}>{m.expenses > 0 ? `AED ${fmt(m.expenses)}` : '—'}</td>}
                      {showF && <td className="px-4 py-3 text-right text-[12px] font-medium" style={{ color: m.fuel > 0 ? '#d97706' : '#e2e8f0' }}>{m.fuel > 0 ? `AED ${fmt(m.fuel)}` : '—'}</td>}
                      {showM && <td className="px-4 py-3 text-right text-[12px] font-medium" style={{ color: m.maintenance > 0 ? '#7c3aed' : '#e2e8f0' }}>{m.maintenance > 0 ? `AED ${fmt(m.maintenance)}` : '—'}</td>}
                      <td className="px-5 py-3 text-right text-[12px] font-bold text-slate-900">{total > 0 ? `AED ${fmt(total)}` : <span className="text-slate-200">—</span>}</td>
                    </tr>
                  );
                })}
                {/* Year total row */}
                <tr style={{ background: '#0b1d3a' }}>
                  <td className="px-5 py-3 text-[12px] font-black text-white">Year Total — {year}</td>
                  {(typeF === 'all' || typeF === 'expenses')    && <td className="px-4 py-3 text-right text-[12px] font-black" style={{ color: '#93c5fd' }}>AED {fmt(filteredTotals.expenses)}</td>}
                  {(typeF === 'all' || typeF === 'fuel')        && <td className="px-4 py-3 text-right text-[12px] font-black" style={{ color: '#fcd34d' }}>AED {fmt(filteredTotals.fuel)}</td>}
                  {(typeF === 'all' || typeF === 'maintenance') && <td className="px-4 py-3 text-right text-[12px] font-black" style={{ color: '#c4b5fd' }}>AED {fmt(filteredTotals.maintenance)}</td>}
                  <td className="px-5 py-3 text-right text-[13px] font-black text-white">AED {fmt(displayTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-t border-slate-100">
            <p className="text-[10px] text-slate-400">{filteredCars.length} vehicle{filteredCars.length !== 1 ? 's' : ''} · {periodLabel}</p>
            <button onClick={handleDownloadPDF} disabled={pdfBusy}
              className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-40">
              <FileText className="w-3.5 h-3.5" />
              {pdfBusy ? 'Generating…' : `Download ${periodLabel} Report`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div className="hidden sm:flex items-center gap-1.5">
      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
      <span className="text-[10px] font-semibold text-slate-500">{label}</span>
    </div>
  );
}
