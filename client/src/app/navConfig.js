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
    { to: '/admin/plants', label: 'Plants', icon: Leaf },
    { to: '/admin/maintenance', label: 'Maintenance', icon: Droplets },
    { to: '/admin/assignments', label: 'Assignments', icon: Clipboard },
    { to: '/admin/map', label: 'Map', icon: Map },
  ],
  site_owner: [
    { to: '/site', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/site/sites', label: 'My Sites', icon: MapPin },
    { to: '/site/volunteers', label: 'Volunteers', icon: Users },
    { to: '/site/plants', label: 'Plants', icon: Leaf },
    { to: '/site/maintenance', label: 'Maintenance', icon: Droplets },
  ],
  donor: [
    { to: '/donor', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/donor/trees', label: 'My Trees', icon: Leaf },
    { to: '/donor/map', label: 'Map view', icon: Map },
    { to: '/donor/maintenance', label: 'Maintenance', icon: Droplets },
    { to: '/donor/donations', label: 'Donations', icon: HandCoins },
  ],
  volunteer: [
    { to: '/volunteer', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/volunteer/assignments', label: 'Assignments', icon: Clipboard },
    { to: '/volunteer/plant', label: 'Record planting', icon: Sprout },
    { to: '/volunteer/maintenance', label: 'Record watering', icon: Camera },
  ],
};
