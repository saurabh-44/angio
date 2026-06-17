import { Donation } from '../../models/Donation.js';
import { Plant } from '../../models/Plant.js';
import { MaintenanceLog } from '../../models/MaintenanceLog.js';
import { User } from '../../models/User.js';
import { Site } from '../../models/Site.js';
import { Allocation } from '../../models/Allocation.js';
import { HttpError } from '../../utils/httpError.js';
import { buildWorkbook } from './excelService.js';

// Common columns reused across exports — kept here so a rename in one
// place propagates everywhere.
const COLS = {
  donations: [
    { key: 'donor_name', label: 'Donor name' },
    { key: 'donor_email', label: 'Donor email' },
    { key: 'amount', label: 'Amount' },
    { key: 'currency', label: 'Currency' },
    { key: 'method', label: 'Method' },
    { key: 'status', label: 'Status' },
    { key: 'tree_count', label: 'Trees sponsored' },
    { key: 'paid_at', label: 'Paid at' },
    { key: 'recorded_at', label: 'Recorded at' },
    { key: 'razorpay_order_id', label: 'Razorpay order' },
    { key: 'note', label: 'Note' },
  ],
  plants: [
    { key: 'public_code', label: 'Tree code' },
    { key: 'species', label: 'Species' },
    { key: 'status', label: 'Status' },
    { key: 'site_name', label: 'Site' },
    { key: 'site_address', label: 'Site address' },
    { key: 'donor_name', label: 'Donor' },
    { key: 'donor_email', label: 'Donor email' },
    { key: 'volunteer_name', label: 'Planted by' },
    { key: 'planted_at', label: 'Planted at' },
    { key: 'lat', label: 'Latitude' },
    { key: 'lng', label: 'Longitude' },
    { key: 'planting_photo', label: 'Planting photo URL' },
    { key: 'scan_count', label: 'QR scans' },
    { key: 'notes', label: 'Notes' },
  ],
  donorPlants: [
    { key: 'public_code', label: 'Tree code' },
    { key: 'species', label: 'Species' },
    { key: 'status', label: 'Status' },
    { key: 'site_name', label: 'Site' },
    { key: 'planted_at', label: 'Planted at' },
    { key: 'lat', label: 'Latitude' },
    { key: 'lng', label: 'Longitude' },
    { key: 'planting_photo', label: 'Planting photo URL' },
    { key: 'latest_height_cm', label: 'Latest height (cm)' },
    { key: 'latest_dbh_cm', label: 'Latest DBH (cm)' },
    { key: 'latest_health', label: 'Latest health' },
    { key: 'last_check_at', label: 'Last maintenance' },
  ],
  maintenance: [
    { key: 'tree_code', label: 'Tree code' },
    { key: 'species', label: 'Species' },
    { key: 'site_name', label: 'Site' },
    { key: 'week_of', label: 'Week of' },
    { key: 'volunteer_name', label: 'Volunteer' },
    { key: 'photo', label: 'Photo URL' },
    { key: 'health_status', label: 'Health' },
    { key: 'height_cm', label: 'Height (cm)' },
    { key: 'dbh_cm', label: 'DBH (cm)' },
    { key: 'note', label: 'Note' },
    { key: 'disease_notes', label: 'Disease notes' },
  ],
  donors: [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'is_active', label: 'Active' },
    { key: 'created_at', label: 'Joined' },
  ],
};

// ─── Admin: donations ──────────────────────────────────────────────
export async function exportDonationsForAdmin({ actor, filters = {} }) {
  if (actor.role !== 'ngo_admin') {
    throw HttpError.forbidden('Only the NGO admin can export donations');
  }
  const query = {};
  if (filters.donor) query.donor = filters.donor;
  if (filters.from || filters.to) {
    query.paidAt = {};
    if (filters.from) query.paidAt.$gte = new Date(filters.from);
    if (filters.to) query.paidAt.$lte = new Date(filters.to);
  }
  const docs = await Donation.find(query)
    .populate('donor', 'name email')
    .sort({ paidAt: -1 })
    .limit(10_000)
    .lean();

  const rows = docs.map((d) => ({
    donor_name: d.donor?.name ?? '',
    donor_email: d.donor?.email ?? '',
    amount: d.amount ?? 0,
    currency: d.currency ?? 'INR',
    method: d.method ?? '',
    status: d.status ?? 'paid',
    tree_count: d.treeCount ?? '',
    paid_at: d.paidAt,
    recorded_at: d.createdAt,
    razorpay_order_id: d.razorpay?.orderId ?? '',
    note: d.note ?? '',
  }));

  return buildWorkbook([
    { name: 'Donations', columns: COLS.donations, rows },
  ]);
}

// ─── Admin / site_owner: plants ────────────────────────────────────
export async function exportPlantsForAdmin({ actor, filters = {} }) {
  const filter = {};
  if (actor.role === 'ngo_admin') {
    // unrestricted
  } else if (actor.role === 'site_owner') {
    const ownSites = await Site.find({ owner: actor.userId }).select('_id').lean();
    filter.site = { $in: ownSites.map((s) => s._id) };
  } else {
    throw HttpError.forbidden('You do not have permission to export plants');
  }
  if (filters.site) filter.site = filters.site;
  if (filters.status) filter.status = filters.status;

  const docs = await Plant.find(filter)
    .populate('site', 'name address')
    .populate('donor', 'name email')
    .populate('plantedBy', 'name')
    .sort({ plantedAt: -1 })
    .limit(20_000)
    .lean();

  const rows = docs.map((p) => ({
    public_code: p.publicCode ?? '',
    species: p.species ?? '',
    status: p.status,
    site_name: p.site?.name ?? '',
    site_address: p.site?.address ?? '',
    donor_name: p.donor?.name ?? '',
    donor_email: p.donor?.email ?? '',
    volunteer_name: p.plantedBy?.name ?? '',
    planted_at: p.plantedAt,
    lat: p.geo?.lat ?? '',
    lng: p.geo?.lng ?? '',
    planting_photo: p.plantingPhoto?.url ?? '',
    scan_count: p.scanCount ?? 0,
    notes: p.notes ?? '',
  }));

  return buildWorkbook([
    { name: 'Plants', columns: COLS.plants, rows },
  ]);
}

// ─── Donor: my-trees ───────────────────────────────────────────────
export async function exportMyTreesForDonor({ actor }) {
  if (actor.role !== 'sponsor') {
    throw HttpError.forbidden('Only sponsors can export their own trees');
  }
  const plants = await Plant.find({ donor: actor.userId })
    .populate('site', 'name')
    .sort({ plantedAt: -1 })
    .lean();

  // Latest maintenance log per plant — single aggregation rather than
  // N+1 queries.
  const ids = plants.map((p) => p._id);
  const latestLogs = await MaintenanceLog.aggregate([
    { $match: { plant: { $in: ids } } },
    { $sort: { weekOf: -1 } },
    {
      $group: {
        _id: '$plant',
        weekOf: { $first: '$weekOf' },
        heightCm: { $first: '$heightCm' },
        dbhCm: { $first: '$dbhCm' },
        healthStatus: { $first: '$healthStatus' },
      },
    },
  ]);
  const latestByPlant = Object.fromEntries(latestLogs.map((l) => [String(l._id), l]));

  const rows = plants.map((p) => {
    const latest = latestByPlant[String(p._id)] ?? {};
    return {
      public_code: p.publicCode ?? '',
      species: p.species ?? '',
      status: p.status,
      site_name: p.site?.name ?? '',
      planted_at: p.plantedAt,
      lat: p.geo?.lat ?? '',
      lng: p.geo?.lng ?? '',
      planting_photo: p.plantingPhoto?.url ?? '',
      latest_height_cm: latest.heightCm ?? '',
      latest_dbh_cm: latest.dbhCm ?? '',
      latest_health: latest.healthStatus ?? '',
      last_check_at: latest.weekOf ?? '',
    };
  });

  return buildWorkbook([
    { name: 'My trees', columns: COLS.donorPlants, rows },
  ]);
}

// ─── Maintenance logs ──────────────────────────────────────────────
export async function exportMaintenance({ actor, filters = {} }) {
  const filter = {};
  if (actor.role === 'ngo_admin') {
    // unrestricted
  } else if (actor.role === 'site_owner') {
    const ownSites = await Site.find({ owner: actor.userId }).select('_id').lean();
    filter.site = { $in: ownSites.map((s) => s._id) };
  } else if (actor.role === 'sponsor') {
    filter.donor = actor.userId;
  } else {
    throw HttpError.forbidden('You do not have permission to export maintenance');
  }
  if (filters.site) filter.site = filters.site;
  if (filters.from || filters.to) {
    filter.weekOf = {};
    if (filters.from) filter.weekOf.$gte = new Date(filters.from);
    if (filters.to) filter.weekOf.$lte = new Date(filters.to);
  }

  const docs = await MaintenanceLog.find(filter)
    .populate('plant', 'publicCode species')
    .populate('site', 'name')
    .populate('volunteer', 'name')
    .sort({ weekOf: -1 })
    .limit(20_000)
    .lean();

  const rows = docs.map((m) => ({
    tree_code: m.plant?.publicCode ?? '',
    species: m.plant?.species ?? '',
    site_name: m.site?.name ?? '',
    week_of: m.weekOf,
    volunteer_name: m.volunteer?.name ?? '',
    photo: m.photo?.url ?? '',
    health_status: m.healthStatus ?? '',
    height_cm: m.heightCm ?? '',
    dbh_cm: m.dbhCm ?? '',
    note: m.note ?? '',
    disease_notes: m.diseaseNotes ?? '',
  }));

  return buildWorkbook([
    { name: 'Maintenance', columns: COLS.maintenance, rows },
  ]);
}

// ─── Templates for import ──────────────────────────────────────────
export function buildDonorImportTemplate() {
  return buildWorkbook([
    {
      name: 'Donors',
      columns: COLS.donors,
      rows: [
        {
          name: 'Aarav Sharma',
          email: 'aarav@example.com',
          phone: '+91 90000 00000',
          is_active: 'true',
          created_at: '',
        },
      ],
    },
  ]);
}

export function buildDonationImportTemplate() {
  const cols = [
    { key: 'donor_email', label: 'Donor email' },
    { key: 'amount', label: 'Amount' },
    { key: 'method', label: 'Method (cash/upi/bank_transfer/cheque/online/other)' },
    { key: 'paid_at', label: 'Paid at (YYYY-MM-DD)' },
    { key: 'tree_count', label: 'Trees sponsored (optional)' },
    { key: 'note', label: 'Note (optional)' },
  ];
  return buildWorkbook([
    {
      name: 'Donations',
      columns: cols,
      rows: [
        {
          donor_email: 'aarav@example.com',
          amount: 10000,
          method: 'upi',
          paid_at: '2026-06-12',
          tree_count: 50,
          note: 'In honour of …',
        },
      ],
    },
  ]);
}

// Used internally for audits.
export async function exportAuditBundle({ actor }) {
  if (actor.role !== 'ngo_admin') {
    throw HttpError.forbidden('Only the NGO admin can export the full audit');
  }
  const [donations, plants, maintenance, donors] = await Promise.all([
    Donation.find({}).populate('donor', 'name email').sort({ paidAt: -1 }).lean(),
    Plant.find({})
      .populate('site', 'name address')
      .populate('donor', 'name email')
      .populate('plantedBy', 'name')
      .sort({ plantedAt: -1 })
      .lean(),
    MaintenanceLog.find({})
      .populate('plant', 'publicCode species')
      .populate('site', 'name')
      .populate('volunteer', 'name')
      .sort({ weekOf: -1 })
      .lean(),
    User.find({ role: 'sponsor' }).sort({ createdAt: -1 }).lean(),
  ]);

  const sheets = [
    {
      name: 'Donations',
      columns: COLS.donations,
      rows: donations.map((d) => ({
        donor_name: d.donor?.name ?? '',
        donor_email: d.donor?.email ?? '',
        amount: d.amount ?? 0,
        currency: d.currency ?? 'INR',
        method: d.method ?? '',
        status: d.status ?? 'paid',
        tree_count: d.treeCount ?? '',
        paid_at: d.paidAt,
        recorded_at: d.createdAt,
        razorpay_order_id: d.razorpay?.orderId ?? '',
        note: d.note ?? '',
      })),
    },
    {
      name: 'Plants',
      columns: COLS.plants,
      rows: plants.map((p) => ({
        public_code: p.publicCode ?? '',
        species: p.species ?? '',
        status: p.status,
        site_name: p.site?.name ?? '',
        site_address: p.site?.address ?? '',
        donor_name: p.donor?.name ?? '',
        donor_email: p.donor?.email ?? '',
        volunteer_name: p.plantedBy?.name ?? '',
        planted_at: p.plantedAt,
        lat: p.geo?.lat ?? '',
        lng: p.geo?.lng ?? '',
        planting_photo: p.plantingPhoto?.url ?? '',
        scan_count: p.scanCount ?? 0,
        notes: p.notes ?? '',
      })),
    },
    {
      name: 'Maintenance',
      columns: COLS.maintenance,
      rows: maintenance.map((m) => ({
        tree_code: m.plant?.publicCode ?? '',
        species: m.plant?.species ?? '',
        site_name: m.site?.name ?? '',
        week_of: m.weekOf,
        volunteer_name: m.volunteer?.name ?? '',
        photo: m.photo?.url ?? '',
        health_status: m.healthStatus ?? '',
        height_cm: m.heightCm ?? '',
        dbh_cm: m.dbhCm ?? '',
        note: m.note ?? '',
        disease_notes: m.diseaseNotes ?? '',
      })),
    },
    {
      name: 'Donors',
      columns: COLS.donors,
      rows: donors.map((u) => ({
        name: u.name,
        email: u.email,
        phone: u.phone ?? '',
        is_active: u.isActive ? 'true' : 'false',
        created_at: u.createdAt,
      })),
    },
  ];

  return buildWorkbook(sheets);
}
