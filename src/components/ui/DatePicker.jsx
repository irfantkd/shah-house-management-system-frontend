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
const YEARS_PAST   = 12;
const YEARS_FUTURE = 10;
const YEARS = Array.from({ length: YEARS_PAST + YEARS_FUTURE + 1 }, (_, i) => NOW - YEARS_PAST + i);

/**
 * Date picker that displays Day / Month / Year dropdowns.
 * Props:
 *   value     — string in YYYY-MM-DD (same as <input type="date">)
 *   onChange  — called with YYYY-MM-DD once all three fields are selected
 *   required  — passed to each <select>
 *   className — class applied to each <select> (include border/ring overrides for error state)
 *   hasError  — when true, overrides border to red
 */
export default function DatePicker({ value, onChange, required, className = '', hasError = false }) {
  const [d, setD] = useState('');
  const [m, setM] = useState('');
  const [y, setY] = useState('');

  // Sync selects when parent changes the value
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
    const maxD = daysInMonth(newM, newY);
    const safeD = Math.min(parseInt(newD, 10), maxD);
    onChange(
      `${String(newY).padStart(4, '0')}-${String(newM).padStart(2, '0')}-${String(safeD).padStart(2, '0')}`
    );
  };

  const onDay = (v) => { setD(v); emit(v, m, y); };
  const onMon = (v) => {
    setM(v);
    // If selected day exceeds days in new month, clamp it
    if (d && parseInt(d, 10) > daysInMonth(v, y)) {
      const clamped = String(daysInMonth(v, y));
      setD(clamped);
      emit(clamped, v, y);
    } else {
      emit(d, v, y);
    }
  };
  const onYear = (v) => { setY(v); emit(d, m, v); };

  const maxDay = daysInMonth(m, y);
  const dayOptions = Array.from({ length: maxDay }, (_, i) => i + 1);

  const errorCls = hasError
    ? 'border-red-400 focus:ring-red-400/30 focus:border-red-400'
    : '';
  const sel = `${className} ${errorCls} appearance-none bg-white`.replace(
    hasError ? /focus:ring-accent-500\/30 focus:border-accent-500/g : /$/,
    '',
  ).trim();

  return (
    <div className="grid grid-cols-3 gap-2">
      {/* Day */}
      <select value={d} onChange={(e) => onDay(e.target.value)} required={required} className={sel}>
        <option value="">Day</option>
        {dayOptions.map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>

      {/* Month */}
      <select value={m} onChange={(e) => onMon(e.target.value)} required={required} className={sel}>
        <option value="">Month</option>
        {MONTHS.map((name, i) => (
          <option key={i + 1} value={i + 1}>{name}</option>
        ))}
      </select>

      {/* Year */}
      <select value={y} onChange={(e) => onYear(e.target.value)} required={required} className={sel}>
        <option value="">Year</option>
        {YEARS.map((yr) => (
          <option key={yr} value={yr}>{yr}</option>
        ))}
      </select>
    </div>
  );
}
