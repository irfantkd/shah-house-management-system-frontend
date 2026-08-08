import { useState, useEffect } from 'react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function daysInMonth(m, y) {
  if (!m) return 31;
  if (!y) return new Date(2000, Number(m), 0).getDate();
  return new Date(Number(y), Number(m), 0).getDate();
}

const NOW = new Date().getFullYear();

/**
 * Date picker with Day / Month / Year dropdowns.
 * Props:
 *   value     — YYYY-MM-DD string
 *   onChange  — called with YYYY-MM-DD once all three fields are selected
 *   required  — passed to each <select>
 *   className — class applied to each <select>
 *   hasError  — when true, overrides border to red
 *   minYear   — earliest year in the Year dropdown (default 1900)
 *   maxYear   — latest  year in the Year dropdown (default current + 10)
 */
export default function DatePicker({
  value,
  onChange,
  required,
  className = '',
  hasError = false,
  minYear  = 1900,
  maxYear  = NOW + 10,
}) {
  const [d, setD] = useState('');
  const [m, setM] = useState('');
  const [y, setY] = useState('');

  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [yy, mm, dd] = value.split('-');
      setY(yy);
      setM(String(parseInt(mm, 10)));
      setD(String(parseInt(dd, 10)));
    } else if (!value) {
      setD(''); setM(''); setY('');
    }
  }, [value]);

  const emit = (newD, newM, newY) => {
    if (!newD || !newM || !newY) return;
    const maxD  = daysInMonth(newM, newY);
    const safeD = Math.min(parseInt(newD, 10), maxD);
    onChange(
      `${String(newY).padStart(4, '0')}-${String(newM).padStart(2, '0')}-${String(safeD).padStart(2, '0')}`
    );
  };

  const onDay  = (v) => { setD(v); emit(v, m, y); };
  const onMon  = (v) => {
    setM(v);
    if (d && parseInt(d, 10) > daysInMonth(v, y)) {
      const clamped = String(daysInMonth(v, y));
      setD(clamped);
      emit(clamped, v, y);
    } else {
      emit(d, v, y);
    }
  };
  const onYear = (v) => {
    setY(v);
    // Only emit when the value is a plausible complete year (4 digits within range)
    const n = parseInt(v, 10);
    if (v.length === 4 && n >= minYear && n <= maxYear) emit(d, m, v);
  };
  const onYearBlur = () => {
    // On blur clamp to range and emit
    if (!y) return;
    const n      = parseInt(y, 10);
    const clamped = String(Math.max(minYear, Math.min(maxYear, n)));
    if (clamped !== y) setY(clamped);
    emit(d, m, clamped);
  };

  const maxDay     = daysInMonth(m, y);
  const dayOptions = Array.from({ length: maxDay }, (_, i) => i + 1);

  const errorCls = hasError ? 'border-red-400 focus:ring-red-400/30 focus:border-red-400' : '';
  const sel      = `${className} ${errorCls} appearance-none`.trim();
  const inp      = `${className} ${errorCls}`.trim();

  return (
    <div className="grid grid-cols-3 gap-2">
      <select value={d} onChange={(e) => onDay(e.target.value)} required={required} className={sel}>
        <option value="">Day</option>
        {dayOptions.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>

      <select value={m} onChange={(e) => onMon(e.target.value)} required={required} className={sel}>
        <option value="">Month</option>
        {MONTHS.map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
      </select>

      {/* Year — free-type number input */}
      <input
        type="number"
        value={y}
        onChange={(e) => onYear(e.target.value)}
        onBlur={onYearBlur}
        min={minYear}
        max={maxYear}
        placeholder="Year"
        required={required}
        className={inp}
        style={{ MozAppearance: 'textfield', WebkitAppearance: 'none' }}
      />
    </div>
  );
}
