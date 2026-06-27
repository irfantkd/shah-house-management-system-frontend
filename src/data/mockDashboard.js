// ── Stats ─────────────────────────────────────────────────────────
export const dashboardStats = {
  activeContracts:     { value: 12, trend: { direction: 'up',   value: 2 } },
  upcomingMaintenance: { value: 5,  trend: { direction: 'up',   value: 1 } },
  expiringSoon:        { value: 3,  trend: { direction: 'down', value: 1 } },
  pendingRepairs:      { value: 2,  trend: { direction: 'neutral', value: '0' } },
  monthlyExpense:      { value: 'AED 4,850', trend: { direction: 'down', value: '8%' } },
};

// ── Upcoming schedule ─────────────────────────────────────────────
export const upcomingSchedule = [
  { id: 1, title: 'AC Filter Replacement',     date: '2026-06-28', company: 'Cool Air LLC',         type: 'maintenance', area: 'All Rooms',    priority: 'high' },
  { id: 2, title: 'Pool Chemical Treatment',   date: '2026-06-30', company: 'AquaBlue Pool Co.',    type: 'service',     area: 'Swimming Pool', priority: 'medium' },
  { id: 3, title: 'Garden Trimming',           date: '2026-07-01', company: 'Green Thumb Gardens',  type: 'service',     area: 'Garden',        priority: 'low' },
  { id: 4, title: 'CCTV System Inspection',    date: '2026-07-03', company: 'SecureVision LLC',     type: 'inspection',  area: 'Full Property', priority: 'medium' },
  { id: 5, title: 'Generator Service',         date: '2026-07-05', company: 'PowerPro Services',    type: 'maintenance', area: 'Garage',        priority: 'high' },
  { id: 6, title: 'Painting Touch-up',         date: '2026-07-08', company: 'Al Fares Painting',    type: 'service',     area: 'Exterior',      priority: 'low' },
];

// ── Recent activities ─────────────────────────────────────────────
export const recentActivities = [
  { id: 1, type: 'contract',    title: 'Contract Renewed',       detail: 'Pool Maintenance — AquaBlue Pool Co.',       time: '2 hours ago',  color: 'blue' },
  { id: 2, type: 'repair',      title: 'Repair Completed',       detail: 'Kitchen Faucet Fixed — Al Fares Plumbing',   time: 'Yesterday',    color: 'green' },
  { id: 3, type: 'document',    title: 'Invoice Uploaded',       detail: 'AC Service — Cool Air LLC — AED 650',        time: '2 days ago',   color: 'blue' },
  { id: 4, type: 'warranty',    title: 'Warranty Expiring Soon', detail: 'Washing Machine — Expires in 30 days',       time: '3 days ago',   color: 'orange' },
  { id: 5, type: 'maintenance', title: 'Maintenance Completed',  detail: 'Monthly Garden Service — Green Thumb',       time: '4 days ago',   color: 'green' },
  { id: 6, type: 'contract',    title: 'New Contract Added',     detail: 'Pest Control — Pest Guard LLC',              time: '5 days ago',   color: 'blue' },
];

// ── Expiring items ────────────────────────────────────────────────
export const expiringItems = [
  { id: 1, type: 'contract',  name: 'Pest Control Service',     company: 'Pest Guard LLC',       expiresIn: 8,  status: 'danger' },
  { id: 2, type: 'contract',  name: 'Cleaning Service',         company: 'Clean Masters',         expiresIn: 15, status: 'warning' },
  { id: 3, type: 'warranty',  name: 'Dishwasher Warranty',      company: 'Samsung',               expiresIn: 22, status: 'warning' },
  { id: 4, type: 'contract',  name: 'AC Maintenance Contract',  company: 'Cool Air LLC',          expiresIn: 42, status: 'info' },
];

// ── Monthly expenses ──────────────────────────────────────────────
export const monthlyExpenses = [
  { category: 'Maintenance',  amount: 1850, color: '#2563eb', percent: 38 },
  { category: 'Repairs',      amount: 1200, color: '#0b1d3a', percent: 25 },
  { category: 'Cleaning',     amount: 750,  color: '#7a8ea8', percent: 15 },
  { category: 'Garden',       amount: 600,  color: '#22c55e', percent: 12 },
  { category: 'Pool',         amount: 450,  color: '#f59e0b', percent: 9  },
  { category: 'Other',        amount: 0,    color: '#e2e8f0', percent: 1  },
];

// ── Property status ───────────────────────────────────────────────
export const propertyStatus = [
  { label: 'Active Contracts',  value: 12, status: 'good'    },
  { label: 'Tracked Assets',    value: 18, status: 'good'    },
  { label: 'Open Repairs',      value: 2,  status: 'warning' },
  { label: 'Pending Documents', value: 5,  status: 'warning' },
];

// ── Quick links ───────────────────────────────────────────────────
export const quickLinks = [
  { label: 'Add Contract',    icon: 'FileText',     path: '/contracts',   color: 'blue'   },
  { label: 'Log Repair',      icon: 'Wrench',       path: '/repairs',     color: 'orange' },
  { label: 'Upload Document', icon: 'Upload',       path: '/documents',   color: 'green'  },
  { label: 'Add Reminder',    icon: 'BellPlus',     path: '/calendar',    color: 'purple' },
];
