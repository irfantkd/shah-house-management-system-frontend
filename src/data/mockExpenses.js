// Segments: 'property' = home services & utilities, 'household' = grocery/daily
export const EXPENSE_CATEGORIES = {
  // ── Property & Services ───────────────────────────────────────────
  'Cleaning':          { color: '#9333ea', bg: '#f5f3ff', segment: 'property' },
  'Garden':            { color: '#16a34a', bg: '#f0fdf4', segment: 'property' },
  'Pool & Water':      { color: '#0891b2', bg: '#ecfeff', segment: 'property' },
  'Climate / AC':      { color: '#2563eb', bg: '#eff6ff', segment: 'property' },
  'Security / CCTV':   { color: '#1e3a6e', bg: '#f0f5ff', segment: 'property' },
  'Plumbing':          { color: '#3b82f6', bg: '#dbeafe', segment: 'property' },
  'Pest Control':      { color: '#ea580c', bg: '#fff7ed', segment: 'property' },
  'Power':             { color: '#ca8a04', bg: '#fefce8', segment: 'property' },
  'Electricity Bill':  { color: '#f59e0b', bg: '#fffbeb', segment: 'property' },
  'Water Bill':        { color: '#0ea5e9', bg: '#f0f9ff', segment: 'property' },
  'Repairs':           { color: '#dc2626', bg: '#fef2f2', segment: 'property' },
  // ── Household & Daily ────────────────────────────────────────────
  'Groceries':         { color: '#15803d', bg: '#dcfce7', segment: 'household' },
  'Fruits & Veg':      { color: '#059669', bg: '#d1fae5', segment: 'household' },
  'Household Items':   { color: '#7c3aed', bg: '#ede9fe', segment: 'household' },
  'Daily Essentials':  { color: '#d97706', bg: '#fef9c3', segment: 'household' },
};

export const PROPERTY_CATS  = new Set(Object.entries(EXPENSE_CATEGORIES).filter(([,v]) => v.segment === 'property').map(([k]) => k));
export const HOUSEHOLD_CATS = new Set(Object.entries(EXPENSE_CATEGORIES).filter(([,v]) => v.segment === 'household').map(([k]) => k));

export const expenses = [
  // ── June 2026 — Property & Services ──────────────────────────────
  { id: 'e-001', date: '2026-06-22', category: 'Garden',         description: 'Garden Monthly Service',          vendor: 'Green Thumb Gardens', amount: 550,  contractId: 'cnt-003' },
  { id: 'e-002', date: '2026-06-20', category: 'Pool & Water',   description: 'Pool Monthly Service',            vendor: 'AquaBlue Pool Co.',   amount: 450,  contractId: 'cnt-002' },
  { id: 'e-003', date: '2026-06-18', category: 'Cleaning',       description: 'Bi-weekly Villa Clean',           vendor: 'Clean Masters',       amount: 400,  contractId: 'cnt-004' },
  { id: 'e-004', date: '2026-06-15', category: 'Repairs',        description: 'Pool Filter Media Replacement',   vendor: 'AquaBlue Pool Co.',   amount: 450,  repairId: 'r-008'    },
  { id: 'e-005', date: '2026-06-10', category: 'Repairs',        description: 'Water Heater Thermocouple',       vendor: 'Al Fares Plumbing',   amount: 380,  repairId: 'r-007'    },
  { id: 'e-006', date: '2026-06-04', category: 'Cleaning',       description: 'Bi-weekly Villa Clean',           vendor: 'Clean Masters',       amount: 400,  contractId: 'cnt-004' },

  // ── June 2026 — Household & Daily ────────────────────────────────
  { id: 'h-001', date: '2026-06-26', category: 'Groceries',        description: 'Weekly grocery shop',            vendor: 'Lulu Hypermarket',    amount: 912  },
  { id: 'h-002', date: '2026-06-24', category: 'Fruits & Veg',     description: 'Fresh produce — weekly',         vendor: 'Waterfront Market',   amount: 185  },
  { id: 'h-003', date: '2026-06-21', category: 'Groceries',        description: 'Groceries & toiletries',         vendor: 'Carrefour City',      amount: 756  },
  { id: 'h-004', date: '2026-06-19', category: 'Fruits & Veg',     description: 'Fruits & vegetables',            vendor: 'Waterfront Market',   amount: 210  },
  { id: 'h-005', date: '2026-06-17', category: 'Household Items',  description: 'Cleaning products & storage',    vendor: 'IKEA',                amount: 340  },
  { id: 'h-006', date: '2026-06-14', category: 'Groceries',        description: 'Weekend grocery & pantry top-up',vendor: 'Spinneys',            amount: 1085 },
  { id: 'h-007', date: '2026-06-12', category: 'Daily Essentials', description: 'Pharmacy & personal care',       vendor: 'Life Pharmacy',       amount: 195  },
  { id: 'h-008', date: '2026-06-09', category: 'Fruits & Veg',     description: 'Fresh fruits (mangoes, dates)',  vendor: 'Waterfront Market',   amount: 165  },
  { id: 'h-009', date: '2026-06-07', category: 'Groceries',        description: 'Grocery top-up & drinks',        vendor: 'Lulu Hypermarket',    amount: 624  },

  // ── May 2026 — Property & Services ───────────────────────────────
  { id: 'e-007', date: '2026-05-22', category: 'Garden',         description: 'Garden Monthly Service',          vendor: 'Green Thumb Gardens', amount: 550,  contractId: 'cnt-003' },
  { id: 'e-008', date: '2026-05-21', category: 'Cleaning',       description: 'Monthly Deep Clean',              vendor: 'Clean Masters',       amount: 800,  contractId: 'cnt-004' },
  { id: 'e-009', date: '2026-05-20', category: 'Pool & Water',   description: 'Pool Monthly Service',            vendor: 'AquaBlue Pool Co.',   amount: 450,  contractId: 'cnt-002' },
  { id: 'e-010', date: '2026-05-07', category: 'Cleaning',       description: 'Bi-weekly Villa Clean',           vendor: 'Clean Masters',       amount: 400,  contractId: 'cnt-004' },

  // ── May 2026 — Household & Daily ─────────────────────────────────
  { id: 'h-010', date: '2026-05-27', category: 'Groceries',        description: 'Weekly grocery shop',            vendor: 'Spinneys',            amount: 985  },
  { id: 'h-011', date: '2026-05-24', category: 'Fruits & Veg',     description: 'Fresh produce',                  vendor: 'Waterfront Market',   amount: 220  },
  { id: 'h-012', date: '2026-05-20', category: 'Groceries',        description: 'Monthly bulk shopping',          vendor: 'Lulu Hypermarket',    amount: 1420 },
  { id: 'h-013', date: '2026-05-17', category: 'Household Items',  description: 'Bathroom & cleaning supplies',   vendor: 'Ace Hardware',        amount: 280  },
  { id: 'h-014', date: '2026-05-12', category: 'Daily Essentials', description: 'Medicine & vitamins',            vendor: 'Aster Pharmacy',      amount: 145  },
  { id: 'h-015', date: '2026-05-10', category: 'Groceries',        description: 'Weekly grocery',                 vendor: 'Carrefour City',      amount: 873  },

  // ── April 2026 ────────────────────────────────────────────────────
  { id: 'e-011', date: '2026-04-22', category: 'Garden',         description: 'Garden Monthly Service',          vendor: 'Green Thumb Gardens', amount: 550,  contractId: 'cnt-003' },
  { id: 'e-012', date: '2026-04-20', category: 'Pool & Water',   description: 'Pool Monthly Service',            vendor: 'AquaBlue Pool Co.',   amount: 450,  contractId: 'cnt-002' },
  { id: 'e-013', date: '2026-04-17', category: 'Cleaning',       description: 'Monthly Deep Clean',              vendor: 'Clean Masters',       amount: 800,  contractId: 'cnt-004' },
  { id: 'e-014', date: '2026-04-15', category: 'Climate / AC',   description: 'AC Filter Cleaning',              vendor: 'Cool Air LLC',        amount: 350,  contractId: 'cnt-001' },
  { id: 'e-015', date: '2026-04-03', category: 'Cleaning',       description: 'Bi-weekly Villa Clean',           vendor: 'Clean Masters',       amount: 400,  contractId: 'cnt-004' },
  { id: 'h-016', date: '2026-04-25', category: 'Groceries',       description: 'Weekly grocery shop',            vendor: 'Lulu Hypermarket',    amount: 930  },
  { id: 'h-017', date: '2026-04-18', category: 'Fruits & Veg',   description: 'Fresh produce',                   vendor: 'Waterfront Market',   amount: 195  },
  { id: 'h-018', date: '2026-04-11', category: 'Groceries',       description: 'Grocery & household',            vendor: 'Spinneys',            amount: 1150 },
  { id: 'h-019', date: '2026-04-05', category: 'Household Items', description: 'Home & kitchen items',           vendor: 'IKEA',                amount: 410  },

  // ── March 2026 ────────────────────────────────────────────────────
  { id: 'e-016', date: '2026-03-22', category: 'Garden',         description: 'Garden Monthly Service',          vendor: 'Green Thumb Gardens', amount: 550,  contractId: 'cnt-003' },
  { id: 'e-017', date: '2026-03-19', category: 'Cleaning',       description: 'Monthly Deep Clean',              vendor: 'Clean Masters',       amount: 800,  contractId: 'cnt-004' },
  { id: 'e-018', date: '2026-03-20', category: 'Pool & Water',   description: 'Pool Monthly Service',            vendor: 'AquaBlue Pool Co.',   amount: 450,  contractId: 'cnt-002' },
  { id: 'e-019', date: '2026-03-05', category: 'Cleaning',       description: 'Bi-weekly Villa Clean',           vendor: 'Clean Masters',       amount: 400,  contractId: 'cnt-004' },
  { id: 'e-020', date: '2026-03-01', category: 'Power',          description: 'Generator 6-Month Service',       vendor: 'PowerPro Services',   amount: 1200, contractId: null       },
  { id: 'h-020', date: '2026-03-28', category: 'Groceries',       description: 'Weekly grocery shop',            vendor: 'Carrefour',           amount: 860  },
  { id: 'h-021', date: '2026-03-14', category: 'Groceries',       description: 'Monthly bulk shop',              vendor: 'Lulu Hypermarket',    amount: 1280 },
  { id: 'h-022', date: '2026-03-07', category: 'Fruits & Veg',   description: 'Fresh produce',                   vendor: 'Waterfront Market',   amount: 175  },

  // ── February 2026 ─────────────────────────────────────────────────
  { id: 'e-021', date: '2026-02-22', category: 'Garden',         description: 'Garden Monthly Service',          vendor: 'Green Thumb Gardens', amount: 550,  contractId: 'cnt-003' },
  { id: 'e-022', date: '2026-02-20', category: 'Pool & Water',   description: 'Pool Monthly Service',            vendor: 'AquaBlue Pool Co.',   amount: 450,  contractId: 'cnt-002' },
  { id: 'e-023', date: '2026-02-19', category: 'Cleaning',       description: 'Monthly Deep Clean',              vendor: 'Clean Masters',       amount: 800,  contractId: 'cnt-004' },
  { id: 'e-024', date: '2026-02-15', category: 'Plumbing',       description: 'Water Tank Annual Cleaning',      vendor: 'Al Fares Plumbing',   amount: 350,  contractId: 'cnt-008' },
  { id: 'e-025', date: '2026-02-15', category: 'Plumbing',       description: 'Water Heater Descaling',          vendor: 'Al Fares Plumbing',   amount: 450,  contractId: 'cnt-008' },
  { id: 'e-026', date: '2026-02-05', category: 'Cleaning',       description: 'Bi-weekly Villa Clean',           vendor: 'Clean Masters',       amount: 400,  contractId: 'cnt-004' },

  // ── January 2026 ──────────────────────────────────────────────────
  { id: 'e-027', date: '2026-01-22', category: 'Garden',         description: 'Garden Monthly Service',          vendor: 'Green Thumb Gardens', amount: 550,  contractId: 'cnt-003' },
  { id: 'e-028', date: '2026-01-20', category: 'Pool & Water',   description: 'Pool Monthly Service',            vendor: 'AquaBlue Pool Co.',   amount: 450,  contractId: 'cnt-002' },
  { id: 'e-029', date: '2026-01-19', category: 'Cleaning',       description: 'Monthly Deep Clean',              vendor: 'Clean Masters',       amount: 800,  contractId: 'cnt-004' },
  { id: 'e-030', date: '2026-01-15', category: 'Security / CCTV', description: 'CCTV 6-Month Inspection',       vendor: 'SecureVision LLC',    amount: 800,  contractId: 'cnt-005' },
  { id: 'e-031', date: '2026-01-10', category: 'Climate / AC',   description: 'AC Full Annual Service',          vendor: 'Cool Air LLC',        amount: 700,  contractId: 'cnt-001' },
  { id: 'e-032', date: '2026-01-05', category: 'Pest Control',   description: 'Q1 Pest Control Treatment',       vendor: 'Pest Guard LLC',      amount: 600,  contractId: 'cnt-006' },
  { id: 'e-033', date: '2026-01-05', category: 'Cleaning',       description: 'Bi-weekly Villa Clean',           vendor: 'Clean Masters',       amount: 400,  contractId: 'cnt-004' },
];
