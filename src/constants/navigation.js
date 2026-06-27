import {
  RiLayoutGridLine,
  RiHome4Line,
  RiMapPin2Line,
  RiBox3Line,
  RiCarLine,
  RiBuildingLine,
  RiFileList3Line,
  RiCalendarCheckLine,
  RiHammerLine,
  RiHistoryLine,
  RiShieldCheckLine,
  RiBankCardLine,
  RiFolderOpenLine,
  RiCalendarLine,
  RiBellLine,
  RiPhoneLine,
  RiSettingsLine,
  RiToolsLine,
} from 'react-icons/ri';

export const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', icon: RiLayoutGridLine, path: '/' },
    ],
  },
  {
    label: 'Property',
    items: [
      { label: 'Home Information', icon: RiHome4Line,    path: '/home-info' },
      { label: 'Areas & Rooms',    icon: RiMapPin2Line,  path: '/areas'     },
      { label: 'Assets',           icon: RiBox3Line,     path: '/assets'    },
      { label: 'Fleet / Cars',     icon: RiCarLine,      path: '/cars'      },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Service Companies', icon: RiBuildingLine,      path: '/companies'   },
      { label: 'Contracts',         icon: RiFileList3Line,     path: '/contracts'   },
      { label: 'Maintenance',       icon: RiCalendarCheckLine, path: '/maintenance' },
      { label: 'Repairs',           icon: RiHammerLine,        path: '/repairs'     },
    ],
  },
  {
    label: 'Records',
    items: [
      { label: 'History',    icon: RiHistoryLine,          path: '/history'    },
      { label: 'Warranties', icon: RiShieldCheckLine,      path: '/warranties' },
      { label: 'Expenses',   icon: RiBankCardLine,         path: '/expenses'   },
      { label: 'Documents',  icon: RiFolderOpenLine,       path: '/documents'  },
      { label: 'Calendar',   icon: RiCalendarLine,         path: '/calendar'   },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Notifications', icon: RiBellLine,     path: '/notifications' },
      { label: 'Emergency',     icon: RiPhoneLine,    path: '/emergency'     },
      { label: 'Settings',      icon: RiSettingsLine, path: '/settings'      },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export const getNavLabel = (pathname) => {
  if (pathname === '/') return 'Dashboard';
  const item = ALL_NAV_ITEMS.find((i) => pathname.startsWith(i.path) && i.path !== '/');
  return item?.label ?? 'Page';
};
