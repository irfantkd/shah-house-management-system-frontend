export const DOC_CATEGORIES = ['All', 'Property', 'Contracts', 'Warranties', 'Invoices', 'Insurance', 'Manuals', 'Reports'];

export const FILE_TYPE_CFG = {
  pdf:  { bg: 'bg-danger-50',   text: 'text-danger-600',  label: 'PDF'  },
  xlsx: { bg: 'bg-success-50',  text: 'text-success-700', label: 'XLSX' },
  docx: { bg: 'bg-accent-50',   text: 'text-accent-700',  label: 'DOCX' },
  jpg:  { bg: 'bg-warning-50',  text: 'text-warning-700', label: 'JPG'  },
  png:  { bg: 'bg-purple-50',   text: 'text-purple-700',  label: 'PNG'  },
  dwg:  { bg: 'bg-navy-50',     text: 'text-navy-700',    label: 'DWG'  },
};

export const CAT_CFG = {
  Property:   { bg: 'bg-navy-50',    text: 'text-navy-700'    },
  Contracts:  { bg: 'bg-accent-50',  text: 'text-accent-700'  },
  Warranties: { bg: 'bg-success-50', text: 'text-success-700' },
  Invoices:   { bg: 'bg-warning-50', text: 'text-warning-700' },
  Insurance:  { bg: 'bg-purple-50',  text: 'text-purple-700'  },
  Manuals:    { bg: 'bg-cyan-50',    text: 'text-cyan-700'    },
  Reports:    { bg: 'bg-orange-50',  text: 'text-orange-700'  },
};

export const documents = [
  // ── Property ──
  { id: 'doc-001', name: 'Villa Title Deed',           category: 'Property',   type: 'pdf',  size: '2.4 MB', date: '2022-03-15', description: 'Original title deed — Villa Al Marfa, Palm Jumeirah.'       },
  { id: 'doc-002', name: 'Floor Plan – Ground Floor',   category: 'Property',   type: 'pdf',  size: '5.2 MB', date: '2022-03-15', description: 'Architectural floor plan, ground level.'                    },
  { id: 'doc-003', name: 'Floor Plan – First Floor',    category: 'Property',   type: 'pdf',  size: '4.8 MB', date: '2022-03-15', description: 'Architectural floor plan, upper level.'                     },
  { id: 'doc-004', name: 'Site Plan & Elevation',       category: 'Property',   type: 'dwg',  size: '8.1 MB', date: '2022-03-15', description: 'Full site plan with elevation drawings.'                   },

  // ── Insurance ──
  { id: 'doc-005', name: 'Home Insurance Policy 2026',  category: 'Insurance',  type: 'pdf',  size: '1.8 MB', date: '2026-01-01', description: 'AED 2.5M coverage. Valid Jan 2026 – Dec 2026.'               },
  { id: 'doc-006', name: 'Insurance Summary Certificate',category: 'Insurance', type: 'pdf',  size: '0.5 MB', date: '2026-01-01', description: 'One-page summary certificate for insurance.'                 },

  // ── Reports ──
  { id: 'doc-007', name: 'Pre-Purchase Survey Report',  category: 'Reports',    type: 'pdf',  size: '3.1 MB', date: '2022-04-01', description: 'Structural inspection report by Al Bayan Engineers.'         },
  { id: 'doc-008', name: 'CCTV Installation Report',    category: 'Reports',    type: 'pdf',  size: '3.2 MB', date: '2023-01-20', description: 'SecureVision LLC system installation documentation.'          },
  { id: 'doc-009', name: 'Annual Home Inspection 2025', category: 'Reports',    type: 'pdf',  size: '4.5 MB', date: '2025-12-10', description: 'Full villa condition report by home inspector.'               },

  // ── Contracts ──
  { id: 'doc-010', name: 'AC Maintenance Contract',     category: 'Contracts',  type: 'pdf',  size: '1.4 MB', date: '2024-01-01', description: 'Cool Air LLC – 3-year AMC for all 5 AC units.'               },
  { id: 'doc-011', name: 'Pool Service Agreement',      category: 'Contracts',  type: 'pdf',  size: '1.2 MB', date: '2024-06-01', description: 'AquaBlue Pool Co. – 3-year monthly pool service.'             },
  { id: 'doc-012', name: 'Garden Service Contract',     category: 'Contracts',  type: 'pdf',  size: '1.0 MB', date: '2025-03-01', description: 'Green Thumb Gardens – 18-month landscaping.'                  },
  { id: 'doc-013', name: 'Villa Cleaning Contract',     category: 'Contracts',  type: 'pdf',  size: '0.9 MB', date: '2025-07-15', description: 'Clean Masters – 1-year bi-weekly cleaning.'                  },
  { id: 'doc-014', name: 'CCTV Monitoring Contract',    category: 'Contracts',  type: 'pdf',  size: '1.1 MB', date: '2024-01-20', description: 'SecureVision LLC – 3-year monitoring agreement.'              },
  { id: 'doc-015', name: 'Plumbing Maintenance Contract',category: 'Contracts', type: 'pdf',  size: '1.0 MB', date: '2025-01-01', description: 'Al Fares Plumbing – 2-year annual maintenance.'               },

  // ── Warranties ──
  { id: 'doc-016', name: 'Daikin AC Warranty Card',     category: 'Warranties', type: 'pdf',  size: '0.5 MB', date: '2023-03-20', description: 'Master Bedroom AC – 5-year parts & labor.'                   },
  { id: 'doc-017', name: 'Carrier AC Warranty',         category: 'Warranties', type: 'pdf',  size: '0.4 MB', date: '2021-09-10', description: 'Living Room AC – 5-year manufacturer warranty.'               },
  { id: 'doc-018', name: 'Caterpillar Generator Warranty',category: 'Warranties',type: 'pdf', size: '1.2 MB', date: '2022-05-01', description: 'CAT C4.4 – 3-year manufacturer warranty.'                     },
  { id: 'doc-019', name: 'Pentair Pool Pump Warranty',  category: 'Warranties', type: 'pdf',  size: '0.6 MB', date: '2022-06-15', description: 'Pool pump & filter – 2-year parts warranty.'                  },
  { id: 'doc-020', name: 'Samsung Washing Machine Warranty',category:'Warranties',type:'pdf', size: '0.4 MB', date: '2022-11-20', description: 'Samsung WW90TA046AE – 2-year warranty.'                       },

  // ── Invoices ──
  { id: 'doc-021', name: 'AC Service Invoice Apr 2026', category: 'Invoices',   type: 'pdf',  size: '0.3 MB', date: '2026-04-15', description: 'Cool Air LLC – filter cleaning AED 350.'                     },
  { id: 'doc-022', name: 'Pool Service Invoice Jun 2026',category: 'Invoices',  type: 'pdf',  size: '0.3 MB', date: '2026-06-20', description: 'AquaBlue Pool Co. – monthly service AED 450.'                 },
  { id: 'doc-023', name: 'CCTV Inspection Invoice 2026',category: 'Invoices',   type: 'pdf',  size: '0.3 MB', date: '2026-01-15', description: 'SecureVision LLC – 6-month inspection AED 800.'               },
  { id: 'doc-024', name: 'Generator Service Invoice',   category: 'Invoices',   type: 'pdf',  size: '0.3 MB', date: '2026-03-01', description: 'PowerPro Services – 6-month service AED 1,200.'               },

  // ── Manuals ──
  { id: 'doc-025', name: 'Daikin AC User Manual',       category: 'Manuals',    type: 'pdf',  size: '8.2 MB', date: '2023-03-20', description: 'FTKM50TVMF operation and maintenance guide.'                  },
  { id: 'doc-026', name: 'Rinnai Water Heater Manual',  category: 'Manuals',    type: 'pdf',  size: '4.5 MB', date: '2022-08-10', description: 'RU-V2432FFUD installation and user guide.'                    },
  { id: 'doc-027', name: 'FAAC Gate Motor Manual',      category: 'Manuals',    type: 'pdf',  size: '3.8 MB', date: '2021-11-05', description: 'FAAC 7PCB452652 programming and troubleshooting.'             },
  { id: 'doc-028', name: 'Pentair Pool Equipment Manual',category: 'Manuals',   type: 'pdf',  size: '5.1 MB', date: '2022-06-15', description: 'Pump, filter, and heater operational guide.'                  },
  { id: 'doc-029', name: 'Hikvision CCTV Manual',       category: 'Manuals',    type: 'pdf',  size: '6.3 MB', date: '2023-01-20', description: 'DS-2CD2185G1-I camera setup and configuration.'               },
];

export const docStats = {
  total:      documents.length,
  categories: DOC_CATEGORIES.length - 1,
  totalSizeMB: 102.4,
  lastUpload: documents.sort((a, b) => b.date.localeCompare(a.date))[0]?.date,
};
