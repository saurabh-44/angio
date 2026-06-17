import { Plant } from '../../models/Plant.js';

// CO₂ absorption is hard to estimate without species + growth stage data
// and an audited inventory tool. For our donor-facing dashboard a
// directional estimate is more honest than nothing: we say "estimated"
// everywhere and use a conservative default rate.
//
// Default rate per IPCC / forestry handbooks: ~22 kg CO₂/year for a
// mature broadleaf. When a Species master row exists for a plant we use
// its co2PerYearKg field instead, giving the NGO admin a single place
// to refine these estimates without code changes.
//
// All inputs are kg unless stated; outputs round to 1 decimal so the UI
// can show "47.3 kg" without doing its own rounding.

const DEFAULT_KG_PER_TREE_PER_YEAR = 22;
const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

function ratePerYearFor(plant) {
  const ref = plant?.speciesRef;
  if (ref && typeof ref === 'object' && typeof ref.co2PerYearKg === 'number') {
    return ref.co2PerYearKg;
  }
  return DEFAULT_KG_PER_TREE_PER_YEAR;
}

// CO₂ accumulated by a single plant since it was planted, in kg.
// Dead / removed plants stopped sequestering — credit nothing further.
// `plant` may have `speciesRef` populated; if it does, that row's
// `co2PerYearKg` overrides the default.
export function co2KgForPlant(plant, asOf = new Date()) {
  if (!plant || plant.status !== 'alive') return 0;
  if (!plant.plantedAt) return 0;
  const ms = asOf.getTime() - new Date(plant.plantedAt).getTime();
  if (ms <= 0) return 0;
  const years = ms / MS_PER_YEAR;
  return Math.max(0, years * ratePerYearFor(plant));
}

// Donor-facing summary: counts + total CO₂ in kg and tonnes.
export async function summaryForDonor({ donorId }) {
  const plants = await Plant.find({ donor: donorId })
    .select('plantedAt status speciesRef')
    .populate('speciesRef', 'co2PerYearKg')
    .lean();
  return aggregate(plants);
}

export async function summaryForSystem() {
  const plants = await Plant.find({})
    .select('plantedAt status speciesRef')
    .populate('speciesRef', 'co2PerYearKg')
    .lean();
  return aggregate(plants);
}

function aggregate(plants) {
  let alive = 0;
  let kg = 0;
  let annualKg = 0;
  for (const p of plants) {
    if (p.status === 'alive') {
      alive += 1;
      annualKg += ratePerYearFor(p);
    }
    kg += co2KgForPlant(p);
  }
  return {
    treesAlive: alive,
    treesTotal: plants.length,
    co2Kg: Math.round(kg * 10) / 10,
    co2Tonnes: Math.round(kg) / 1000,
    annualRateKg: Math.round(annualKg * 10) / 10,
  };
}

export const CO2_RATE = {
  kgPerTreePerYear: DEFAULT_KG_PER_TREE_PER_YEAR,
};
