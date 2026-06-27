export const EMERGENCY_CATEGORIES = [
  { id: 'emergency', label: 'Emergency Services', icon: 'ShieldAlert' },
  { id: 'medical',   label: 'Medical',            icon: 'Heart'       },
  { id: 'utilities', label: 'Utilities',           icon: 'Zap'         },
  { id: 'services',  label: 'Home Services',       icon: 'Wrench'      },
];

export const emergencyContacts = [
  // ── Emergency Services ──
  { id: 'ec-001', name: 'Dubai Police',          role: 'Emergency / Crime',    phone: '999',               category: 'emergency', avatar: 'bg-danger-600',   notes: '24/7 emergency response' },
  { id: 'ec-002', name: 'Dubai Civil Defense',   role: 'Fire & Safety',        phone: '997',               category: 'emergency', avatar: 'bg-orange-600',   notes: 'Fire, gas, structural emergencies' },
  { id: 'ec-003', name: 'Ambulance',             role: 'Medical Emergency',    phone: '998',               category: 'emergency', avatar: 'bg-danger-700',   notes: 'Emergency ambulance services' },

  // ── Medical ──
  { id: 'ec-004', name: 'American Hospital Dubai', role: 'Hospital – A&E',   phone: '+971 4 336 7777',   category: 'medical',   avatar: 'bg-blue-600',     notes: '24/7 accident & emergency department' },
  { id: 'ec-005', name: 'Dr. Khalid Hassan',     role: 'Family Doctor',        phone: '+971 50 234 5678',  category: 'medical',   avatar: 'bg-blue-500',     notes: 'American Hospital, Bldg 25, Oud Metha' },
  { id: 'ec-006', name: 'Pharmacy – Aster',      role: '24hr Pharmacy',        phone: '+971 4 704 0000',   category: 'medical',   avatar: 'bg-teal-600',     notes: 'Nearest 24-hour pharmacy' },

  // ── Utilities ──
  { id: 'ec-007', name: 'DEWA',                  role: 'Electricity & Water',  phone: '991',               category: 'utilities', avatar: 'bg-warning-600',  notes: 'Power outages, water faults, 24/7' },
  { id: 'ec-008', name: 'Du Telecom',            role: 'Internet / Phone',     phone: '155',               category: 'utilities', avatar: 'bg-purple-600',   notes: 'Internet and phone service faults' },
  { id: 'ec-009', name: 'Dubai Gas',             role: 'Gas Supply',           phone: '+971 4 338 3300',   category: 'utilities', avatar: 'bg-orange-500',   notes: 'LPG gas supply issues and leaks' },

  // ── Home Services ──
  { id: 'ec-010', name: 'Cool Air LLC',          role: 'AC Emergency',         phone: '+971 50 321 7654',  category: 'services',  avatar: 'bg-accent-600',   notes: 'Ahmed Al Farsi — 24hr AC emergency service' },
  { id: 'ec-011', name: 'Al Fares Plumbing',     role: 'Plumbing Emergency',   phone: '+971 55 123 4567',  category: 'services',  avatar: 'bg-navy-700',     notes: 'Rami Hassan — available 7 days/week' },
  { id: 'ec-012', name: 'SecureVision LLC',      role: 'Security / Gate',      phone: '+971 50 890 1234',  category: 'services',  avatar: 'bg-success-700',  notes: 'Mark Chen — gate motor, CCTV issues' },
  { id: 'ec-013', name: 'AquaBlue Pool Co.',     role: 'Pool Emergency',       phone: '+971 50 234 5678',  category: 'services',  avatar: 'bg-cyan-600',     notes: 'Carlos Mendes — chemical / pump issues' },
  { id: 'ec-014', name: 'Property Manager',      role: 'Villa Management',     phone: '+971 50 111 2233',  category: 'services',  avatar: 'bg-navy-800',     notes: 'For urgent property issues — available 8am–10pm' },
];
