import {
  LayoutDashboard,
  Users,
  MapPin,
  HandCoins,
  Leaf,
  Droplets,
  Clipboard,
  Map,
  Sprout,
  Camera,
  Sparkles,
  ScanLine,
  FileSpreadsheet,
  TreePine,
  FolderKanban,
  UserRound,
} from 'lucide-react';

// Single source of truth for sidebar menus. Keys map to roles, values
// are ordered nav-item lists. Paths are absolute so the sidebar doesn't
// need to know which role mount it's under.
export const NAV_BY_ROLE = {
  ngo_admin: [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/sites', label: 'Sites', icon: MapPin },
    { to: '/admin/donations', label: 'Donations', icon: HandCoins },
    // Plants hub — each tree's location/map and weekly maintenance live in its detail.
    { to: '/admin/plants', label: 'Plants', icon: Leaf },
    { to: '/admin/assignments', label: 'Assignments', icon: Clipboard },
    { to: '/admin/species', label: 'Species', icon: TreePine },
    { to: '/admin/projects', label: 'Projects', icon: FolderKanban },
    { to: '/admin/import', label: 'Import', icon: FileSpreadsheet },
    { to: '/scan', label: 'Scan QR', icon: ScanLine },
  ],
  site_owner: [
    { to: '/site', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/site/sites', label: 'My Sites', icon: MapPin },
    { to: '/site/volunteers', label: 'Volunteers', icon: Users },
    { to: '/site/plants', label: 'Plants', icon: Leaf },
    { to: '/site/maintenance', label: 'Maintenance', icon: Droplets },
    { to: '/scan', label: 'Scan QR', icon: ScanLine },
  ],
  sponsor: [
    { to: '/sponsor', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/sponsor/sponsor', label: 'Sponsor trees', icon: Sparkles },
    { to: '/sponsor/orders', label: 'My Orders', icon: HandCoins },
    // Trees hub — each tree's map, QR, and weekly maintenance live in its detail.
    { to: '/sponsor/trees', label: 'My Trees', icon: Leaf },
    { to: '/sponsor/profile', label: 'Profile', icon: UserRound },
  ],
  volunteer: [
    { to: '/volunteer', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/volunteer/assignments', label: 'Assignments', icon: Clipboard },
    { to: '/volunteer/plant', label: 'Record planting', icon: Sprout },
    { to: '/volunteer/maintenance', label: 'Record watering', icon: Camera },
    { to: '/scan', label: 'Scan QR', icon: ScanLine },
  ],
};
