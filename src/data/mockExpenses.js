export const EXPENSE_CATEGORIES = {
  'Cleaning':        { color: 'bg-purple-500', light: 'bg-purple-50',  text: 'text-purple-700',  bar: 'bg-purple-500'  },
  'Garden':          { color: 'bg-success-500', light: 'bg-success-50', text: 'text-success-700', bar: 'bg-success-500' },
  'Pool & Water':    { color: 'bg-cyan-500',    light: 'bg-cyan-50',    text: 'text-cyan-700',    bar: 'bg-cyan-500'    },
  'Climate / AC':    { color: 'bg-accent-500',  light: 'bg-accent-50',  text: 'text-accent-700',  bar: 'bg-accent-500'  },
  'Security / CCTV': { color: 'bg-navy-700',    light: 'bg-navy-50',    text: 'text-navy-700',    bar: 'bg-navy-700'    },
  'Plumbing':        { color: 'bg-blue-500',    light: 'bg-blue-50',    text: 'text-blue-700',    bar: 'bg-blue-500'    },
  'Pest Control':    { color: 'bg-orange-500',  light: 'bg-orange-50',  text: 'text-orange-700',  bar: 'bg-orange-500'  },
  'Power':           { color: 'bg-warning-500', light: 'bg-warning-50', text: 'text-warning-700', bar: 'bg-warning-500' },
  'Repairs':         { color: 'bg-danger-400',  light: 'bg-danger-50',  text: 'text-danger-700',  bar: 'bg-danger-400'  },
};

export const expenses = [
  // ── June 2026 ──
  { id: 'e-001', date: '2026-06-22', category: 'Garden',         description: 'Garden Monthly Service',       company: 'Green Thumb Gardens', amount: 550,  contractId: 'cnt-003' },
  { id: 'e-002', date: '2026-06-20', category: 'Pool & Water',   description: 'Pool Monthly Service',         company: 'AquaBlue Pool Co.',   amount: 450,  contractId: 'cnt-002' },
  { id: 'e-003', date: '2026-06-18', category: 'Cleaning',       description: 'Bi-weekly Villa Clean',        company: 'Clean Masters',       amount: 400,  contractId: 'cnt-004' },
  { id: 'e-004', date: '2026-06-15', category: 'Repairs',        description: 'Pool Filter Media Replacement',company: 'AquaBlue Pool Co.',   amount: 450,  repairId: 'r-008'    },
  { id: 'e-005', date: '2026-06-10', category: 'Repairs',        description: 'Water Heater Thermocouple',    company: 'Al Fares Plumbing',   amount: 380,  repairId: 'r-007'    },
  { id: 'e-006', date: '2026-06-04', category: 'Cleaning',       description: 'Bi-weekly Villa Clean',        company: 'Clean Masters',       amount: 400,  contractId: 'cnt-004' },

  // ── May 2026 ──
  { id: 'e-007', date: '2026-05-22', category: 'Garden',         description: 'Garden Monthly Service',       company: 'Green Thumb Gardens', amount: 550,  contractId: 'cnt-003' },
  { id: 'e-008', date: '2026-05-21', category: 'Cleaning',       description: 'Monthly Deep Clean',           company: 'Clean Masters',       amount: 800,  contractId: 'cnt-004' },
  { id: 'e-009', date: '2026-05-20', category: 'Pool & Water',   description: 'Pool Monthly Service',         company: 'AquaBlue Pool Co.',   amount: 450,  contractId: 'cnt-002' },
  { id: 'e-010', date: '2026-05-07', category: 'Cleaning',       description: 'Bi-weekly Villa Clean',        company: 'Clean Masters',       amount: 400,  contractId: 'cnt-004' },

  // ── April 2026 ──
  { id: 'e-011', date: '2026-04-22', category: 'Garden',         description: 'Garden Monthly Service',       company: 'Green Thumb Gardens', amount: 550,  contractId: 'cnt-003' },
  { id: 'e-012', date: '2026-04-20', category: 'Pool & Water',   description: 'Pool Monthly Service',         company: 'AquaBlue Pool Co.',   amount: 450,  contractId: 'cnt-002' },
  { id: 'e-013', date: '2026-04-17', category: 'Cleaning',       description: 'Monthly Deep Clean',           company: 'Clean Masters',       amount: 800,  contractId: 'cnt-004' },
  { id: 'e-014', date: '2026-04-15', category: 'Climate / AC',   description: 'AC Filter Cleaning',           company: 'Cool Air LLC',        amount: 350,  contractId: 'cnt-001' },
  { id: 'e-015', date: '2026-04-03', category: 'Cleaning',       description: 'Bi-weekly Villa Clean',        company: 'Clean Masters',       amount: 400,  contractId: 'cnt-004' },

  // ── March 2026 ──
  { id: 'e-016', date: '2026-03-22', category: 'Garden',         description: 'Garden Monthly Service',       company: 'Green Thumb Gardens', amount: 550,  contractId: 'cnt-003' },
  { id: 'e-017', date: '2026-03-19', category: 'Cleaning',       description: 'Monthly Deep Clean',           company: 'Clean Masters',       amount: 800,  contractId: 'cnt-004' },
  { id: 'e-018', date: '2026-03-20', category: 'Pool & Water',   description: 'Pool Monthly Service',         company: 'AquaBlue Pool Co.',   amount: 450,  contractId: 'cnt-002' },
  { id: 'e-019', date: '2026-03-05', category: 'Cleaning',       description: 'Bi-weekly Villa Clean',        company: 'Clean Masters',       amount: 400,  contractId: 'cnt-004' },
  { id: 'e-020', date: '2026-03-01', category: 'Power',          description: 'Generator 6-Month Service',    company: 'PowerPro Services',   amount: 1200, contractId: null       },

  // ── February 2026 ──
  { id: 'e-021', date: '2026-02-22', category: 'Garden',         description: 'Garden Monthly Service',       company: 'Green Thumb Gardens', amount: 550,  contractId: 'cnt-003' },
  { id: 'e-022', date: '2026-02-20', category: 'Pool & Water',   description: 'Pool Monthly Service',         company: 'AquaBlue Pool Co.',   amount: 450,  contractId: 'cnt-002' },
  { id: 'e-023', date: '2026-02-19', category: 'Cleaning',       description: 'Monthly Deep Clean',           company: 'Clean Masters',       amount: 800,  contractId: 'cnt-004' },
  { id: 'e-024', date: '2026-02-15', category: 'Plumbing',       description: 'Water Tank Annual Cleaning',   company: 'Al Fares Plumbing',   amount: 350,  contractId: 'cnt-008' },
  { id: 'e-025', date: '2026-02-15', category: 'Plumbing',       description: 'Water Heater Descaling',       company: 'Al Fares Plumbing',   amount: 450,  contractId: 'cnt-008' },
  { id: 'e-026', date: '2026-02-05', category: 'Cleaning',       description: 'Bi-weekly Villa Clean',        company: 'Clean Masters',       amount: 400,  contractId: 'cnt-004' },

  // ── January 2026 ──
  { id: 'e-027', date: '2026-01-22', category: 'Garden',         description: 'Garden Monthly Service',       company: 'Green Thumb Gardens', amount: 550,  contractId: 'cnt-003' },
  { id: 'e-028', date: '2026-01-20', category: 'Pool & Water',   description: 'Pool Monthly Service',         company: 'AquaBlue Pool Co.',   amount: 450,  contractId: 'cnt-002' },
  { id: 'e-029', date: '2026-01-19', category: 'Cleaning',       description: 'Monthly Deep Clean',           company: 'Clean Masters',       amount: 800,  contractId: 'cnt-004' },
  { id: 'e-030', date: '2026-01-15', category: 'Security / CCTV', description: 'CCTV 6-Month Inspection',    company: 'SecureVision LLC',    amount: 800,  contractId: 'cnt-005' },
  { id: 'e-031', date: '2026-01-10', category: 'Climate / AC',   description: 'AC Full Annual Service',       company: 'Cool Air LLC',        amount: 700,  contractId: 'cnt-001' },
  { id: 'e-032', date: '2026-01-05', category: 'Pest Control',   description: 'Q1 Pest Control Treatment',    company: 'Pest Guard LLC',      amount: 600,  contractId: 'cnt-006' },
  { id: 'e-033', date: '2026-01-05', category: 'Cleaning',       description: 'Bi-weekly Villa Clean',        company: 'Clean Masters',       amount: 400,  contractId: 'cnt-004' },
];

// ── Derived aggregates ──────────────────────────────────────────────────

export const monthlyTotals = (() => {
  const map = {};
  expenses.forEach((e) => {
    const key = e.date.slice(0, 7); // 'YYYY-MM'
    map[key] = (map[key] ?? 0) + e.amount;
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, total]) => {
      const [year, monthNum] = key.split('-');
      return {
        key,
        month: new Date(Number(year), Number(monthNum) - 1, 1)
          .toLocaleDateString('en-AE', { month: 'short' }),
        year: Number(year),
        total,
      };
    });
})();

export const categoryTotals = (() => {
  const map = {};
  expenses.forEach((e) => {
    map[e.category] = (map[e.category] ?? 0) + e.amount;
  });
  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .map(([category, total]) => ({ category, total }));
})();

export const ytdTotal    = expenses.reduce((s, e) => s + e.amount, 0);
export const monthlyAvg  = Math.round(ytdTotal / monthlyTotals.length);
export const topCategory = categoryTotals[0];
export const lastMonthTotal = monthlyTotals[monthlyTotals.length - 1]?.total ?? 0;
