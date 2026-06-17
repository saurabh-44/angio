import { Plant } from '../../models/Plant.js';
import { Donation } from '../../models/Donation.js';
import { MaintenanceLog } from '../../models/MaintenanceLog.js';

// All time-series buckets are pre-computed so the client can render
// without doing date math. Months use the first-of-month as the anchor;
// weeks use Monday 00:00:00 UTC (matching MaintenanceLog.weekOf).

function ymKey(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function lastNMonths(n) {
  const out = [];
  const now = new Date();
  const anchor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - i, 1));
    out.push({
      key: ymKey(d),
      label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
      iso: d.toISOString(),
    });
  }
  return out;
}

function startOfWeekUTC(d) {
  const date = new Date(d);
  const day = (date.getUTCDay() + 6) % 7; // Monday = 0
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - day);
  return date;
}

function lastNWeeks(n) {
  const out = [];
  const now = new Date();
  const thisWeekMonday = startOfWeekUTC(now);
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(thisWeekMonday);
    d.setUTCDate(d.getUTCDate() - i * 7);
    out.push({
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
    });
  }
  return out;
}

// One round-trip overview the admin home renders against.
//
// We deliberately keep the heavy lifting on the server so the client
// just spreads `data.<chart>` into a recharts component. Each section
// returns its own zero-baseline structure so empty datasets render an
// "empty chart" rather than a broken one.
export async function adminOverview() {
  const months = lastNMonths(12);
  const monthIndex = Object.fromEntries(months.map((m, i) => [m.key, i]));

  const weeks = lastNWeeks(12);
  const weekIndex = Object.fromEntries(weeks.map((w, i) => [w.key, i]));

  const [
    plants,
    donations,
    maintenance,
    siteAgg,
    topDonorsAgg,
    topVolunteersAgg,
    healthLogs,
  ] = await Promise.all([
    Plant.find({}).select('status plantedAt').lean(),
    Donation.find({ status: { $ne: 'pending' } })
      .select('amount paidAt status')
      .lean(),
    MaintenanceLog.find({}).select('weekOf').lean(),
    Plant.aggregate([
      { $group: { _id: '$site', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
      {
        $lookup: {
          from: 'sites',
          localField: '_id',
          foreignField: '_id',
          as: 'site',
        },
      },
      { $unwind: '$site' },
      { $project: { _id: 0, name: '$site.name', count: 1 } },
    ]),
    Donation.aggregate([
      { $match: { status: { $ne: 'pending' } } },
      {
        $group: {
          _id: '$donor',
          amount: { $sum: '$amount' },
          donations: { $sum: 1 },
        },
      },
      { $sort: { amount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'donor',
        },
      },
      { $unwind: '$donor' },
      {
        $project: {
          _id: 0,
          name: '$donor.name',
          email: '$donor.email',
          amount: 1,
          donations: 1,
        },
      },
    ]),
    Plant.aggregate([
      { $group: { _id: '$plantedBy', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'volunteer',
        },
      },
      { $unwind: '$volunteer' },
      { $project: { _id: 0, name: '$volunteer.name', count: 1 } },
    ]),
    // Most-recent log per plant — used for the live health pie. Sorted
    // by weekOf desc so the first record we see per plant is the latest.
    MaintenanceLog.aggregate([
      { $match: { healthStatus: { $ne: null } } },
      { $sort: { weekOf: -1 } },
      { $group: { _id: '$plant', healthStatus: { $first: '$healthStatus' } } },
    ]),
  ]);

  // ── Trees by status ───────────────────────────────────────────
  const treesByStatus = { alive: 0, dead: 0, removed: 0 };
  for (const p of plants) {
    if (treesByStatus[p.status] != null) treesByStatus[p.status] += 1;
  }

  // ── Trees planted per month (last 12) ─────────────────────────
  const treesByMonth = months.map((m) => ({ month: m.label, planted: 0 }));
  for (const p of plants) {
    if (!p.plantedAt) continue;
    const key = ymKey(new Date(p.plantedAt));
    const idx = monthIndex[key];
    if (idx != null) treesByMonth[idx].planted += 1;
  }

  // ── Donations per month (paid only) ───────────────────────────
  const donationsByMonth = months.map((m) => ({
    month: m.label,
    amount: 0,
    count: 0,
  }));
  for (const d of donations) {
    if (!d.paidAt) continue;
    const key = ymKey(new Date(d.paidAt));
    const idx = monthIndex[key];
    if (idx != null) {
      donationsByMonth[idx].amount += d.amount ?? 0;
      donationsByMonth[idx].count += 1;
    }
  }

  // ── Maintenance logs per week (last 12 weeks) ─────────────────
  const maintenanceByWeek = weeks.map((w) => ({ week: w.label, count: 0 }));
  for (const m of maintenance) {
    if (!m.weekOf) continue;
    const key = new Date(m.weekOf).toISOString().slice(0, 10);
    const idx = weekIndex[key];
    if (idx != null) maintenanceByWeek[idx].count += 1;
  }

  // ── Health distribution from latest log per plant ─────────────
  const healthDistribution = { healthy: 0, stressed: 0, diseased: 0, dying: 0 };
  for (const row of healthLogs) {
    if (healthDistribution[row.healthStatus] != null) {
      healthDistribution[row.healthStatus] += 1;
    }
  }

  return {
    treesByStatus,
    treesByMonth,
    donationsByMonth,
    maintenanceByWeek,
    topSites: siteAgg,
    topDonors: topDonorsAgg,
    topVolunteers: topVolunteersAgg,
    healthDistribution,
    // Echo the totals so the client doesn't need a second roundtrip just
    // to render the row of stat tiles.
    totals: {
      treesTotal: plants.length,
      donationsTotal: donations.reduce((s, d) => s + (d.amount ?? 0), 0),
      donationCount: donations.length,
      maintenanceCount: maintenance.length,
    },
  };
}
