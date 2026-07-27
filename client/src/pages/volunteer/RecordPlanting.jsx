import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, Sparkles, Sprout } from 'lucide-react';
import PhotoCapture from '@/components/PhotoCapture.jsx';
import GpsCapture from '@/components/GpsCapture.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.jsx';
import { useToast } from '@/components/ui/toast.jsx';
import { useAssignments } from '@/queries/assignments.js';
import { useCreatePlant } from '@/queries/plants.js';
import { useSpeciesList } from '@/queries/species.js';
import { useSites } from '@/queries/sites.js';
import { useAuth } from '@/lib/auth.jsx';
import { ApiError } from '@/lib/api.js';
import { BODY_FONT, HEADING_FONT } from '@/components/GlassAuthScreen.jsx';
import { PageHeading } from '@/components/PageHeading.jsx';

const CUSTOM_SPECIES = '__custom__';
const GROWTH_STAGES = [
  { value: 'seedling', label: 'Seedling' },
  { value: 'sapling', label: 'Sapling' },
  { value: 'young', label: 'Young' },
  { value: 'mature', label: 'Mature' },
];

function Header() {
  return (
    <PageHeading>
      <div className="text-xs font-medium uppercase tracking-widest text-[#0B5000]">Field work</div>
      <h1 className="mt-1 text-3xl font-semibold text-[#001F00]" style={{ fontFamily: HEADING_FONT }}>
        Record a planting
      </h1>
      <p className="mt-1 text-base text-[#1E1E1E]/50">
        Capture the location, snap a photo, and submit. Your site incharge links trees to sponsor
        orders afterwards.
      </p>
    </PageHeading>
  );
}

// Volunteer's planting-capture form. Each step is gated by the previous one
// so a volunteer in the field can't skip GPS or photo.
export default function RecordPlanting() {
  const location = useLocation();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { role } = useAuth();
  // A site owner can plant just like a volunteer — but they own sites rather
  // than being assigned to them, so their planting sites are their own sites.
  const isOwner = role === 'site_owner';

  const { data: assignmentsData, isLoading: loadingAssignments } = useAssignments({
    kind: 'planting',
    limit: 50,
  });
  const { data: ownedSitesData, isLoading: loadingOwnedSites } = useSites({
    limit: 200,
    enabled: isOwner,
  });
  const sites = useMemo(() => {
    if (isOwner) return ownedSitesData?.items ?? [];
    const seen = new Map();
    for (const a of assignmentsData?.items ?? []) {
      const id = a.site?.id ?? a.site?._id;
      if (id && !seen.has(id)) seen.set(id, a.site);
    }
    return Array.from(seen.values());
  }, [isOwner, ownedSitesData, assignmentsData]);
  const loadingSites = isOwner ? loadingOwnedSites : loadingAssignments;

  const [siteId, setSiteId] = useState(location.state?.siteId ?? '');
  const [speciesRef, setSpeciesRef] = useState('');
  const [species, setSpecies] = useState('');
  const [name, setName] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [growthStage, setGrowthStage] = useState('');
  const [dryBiomassKg, setDryBiomassKg] = useState('');
  const [geo, setGeo] = useState({ lat: null, lng: null });
  const [photo, setPhoto] = useState(null);

  const { data: speciesData } = useSpeciesList({ limit: 200, isActive: true });
  const speciesOptions = speciesData?.items ?? [];

  const create = useCreatePlant();
  const ready = siteId && geo.lat != null && geo.lng != null && photo;

  async function submit(e) {
    e.preventDefault();
    if (!ready) return;
    try {
      const picked = speciesOptions.find((s) => (s.id ?? s._id) === speciesRef);
      const speciesName = picked ? picked.name : species.trim();
      await create.mutateAsync({
        site: siteId,
        name: name.trim() || undefined,
        species: speciesName || undefined,
        speciesRef: picked ? (picked.id ?? picked._id) : undefined,
        heightCm: heightCm !== '' ? Number(heightCm) : undefined,
        growthStage: growthStage || undefined,
        dryBiomassKg: dryBiomassKg !== '' ? Number(dryBiomassKg) : undefined,
        geo,
        plantingPhoto: photo,
      });
      success('Tree recorded!', 'Thanks for your work — it’s now on the site record.');
      navigate(isOwner ? '/site' : '/volunteer');
    } catch (err) {
      toastError("Couldn't save the planting", err instanceof ApiError ? err.message : 'Try again.');
    }
  }

  if (loadingSites) {
    return (
      <div style={{ fontFamily: BODY_FONT }}>
        <Header />
        <Skeleton className="mt-6 h-64 w-full rounded-[10px]" />
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div style={{ fontFamily: BODY_FONT }}>
        <Header />
        <div className="mt-10">
          <EmptyState
            icon={Sprout}
            title={isOwner ? 'No sites to plant on yet' : 'No planting sites assigned yet'}
            description={
              isOwner
                ? 'Create a site first, then record the trees planted on it.'
                : 'Your NGO or site owner needs to add you to a site first.'
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: BODY_FONT }}>
      <Header />

      <form onSubmit={submit} className="mt-6 max-w-2xl space-y-5">
        <Section step="1" title="Where are you planting?">
          <Select value={siteId} onValueChange={setSiteId}>
            <SelectTrigger><SelectValue placeholder="Pick a site" /></SelectTrigger>
            <SelectContent>
              {sites.map((s) => (
                <SelectItem key={s.id ?? s._id} value={s.id ?? s._id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Section>

        {siteId && (
          <Section step="2" title="What did you plant?">
            <div className="mb-3 space-y-1.5">
              <Label htmlFor="plant-name" className="text-xs text-[#1E1E1E]/60">
                Tree name (optional)
              </Label>
              <Input
                id="plant-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Defaults to the species name"
              />
            </div>
            {speciesOptions.length > 0 ? (
              <div className="space-y-3">
                <div>
                  <Label className="sr-only">Species</Label>
                  <Select
                    value={speciesRef || (species ? CUSTOM_SPECIES : '')}
                    onValueChange={(v) => {
                      if (v === CUSTOM_SPECIES) {
                        setSpeciesRef('');
                      } else {
                        setSpeciesRef(v);
                        setSpecies('');
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a species (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {speciesOptions.map((s) => (
                        <SelectItem key={s.id ?? s._id} value={s.id ?? s._id}>
                          {s.name}
                          {s.scientificName && (
                            <span className="italic text-muted-foreground"> · {s.scientificName}</span>
                          )}
                        </SelectItem>
                      ))}
                      <SelectItem value={CUSTOM_SPECIES}>Type a custom name…</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!speciesRef && (
                  <div>
                    <Label htmlFor="species" className="sr-only">Custom species name</Label>
                    <Input
                      id="species"
                      value={species}
                      onChange={(e) => setSpecies(e.target.value)}
                      placeholder="e.g. Mango, Neem, Banyan (optional)"
                    />
                  </div>
                )}
              </div>
            ) : (
              <>
                <Label htmlFor="species" className="sr-only">Species</Label>
                <Input
                  id="species"
                  value={species}
                  onChange={(e) => setSpecies(e.target.value)}
                  placeholder="e.g. Mango, Neem, Banyan (optional)"
                />
              </>
            )}

            <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[#E2E8F0] pt-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="heightCm" className="text-xs text-[#1E1E1E]/60">Height (cm)</Label>
                <Input
                  id="heightCm"
                  type="number"
                  min="0"
                  step="any"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-[#1E1E1E]/60">Growth stage</Label>
                <Select value={growthStage || undefined} onValueChange={setGrowthStage}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    {GROWTH_STAGES.map((g) => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dryBiomassKg" className="text-xs text-[#1E1E1E]/60">Dry biomass (kg)</Label>
                <Input
                  id="dryBiomassKg"
                  type="number"
                  min="0"
                  step="any"
                  value={dryBiomassKg}
                  onChange={(e) => setDryBiomassKg(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
          </Section>
        )}

        {siteId && (
          <Section step="3" title="GPS location">
            <GpsCapture value={geo} onChange={setGeo} disabled={create.isPending} />
          </Section>
        )}

        {siteId && geo.lat != null && (
          <Section step="4" title="Planting photo">
            <PhotoCapture
              purpose="plant"
              siteId={siteId}
              onUploaded={setPhoto}
              onCleared={() => setPhoto(null)}
            />
          </Section>
        )}

        <div className="sticky bottom-4 sm:static">
          <div className="flex items-center gap-3 rounded-[10px] border border-[#E2E8F0] bg-white p-4 shadow-[0_0_20px_rgba(0,0,0,0.06)]">
            {ready ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[#0B5000]" aria-hidden />
            ) : (
              <Sparkles className="h-5 w-5 shrink-0 text-[#1E1E1E]/40" aria-hidden />
            )}
            <p className="flex-1 text-sm text-[#1E1E1E]/60">
              {ready ? 'All set — submit when ready.' : 'Complete each step above to submit.'}
            </p>
            <button
              type="submit"
              disabled={!ready || create.isPending}
              className="inline-flex items-center gap-2 rounded-[10px] bg-[#0B5000] px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-[#094200] disabled:opacity-50"
            >
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <Sprout className="h-4 w-4" /> Submit
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Section({ step, title, children }) {
  return (
    <section className="space-y-3 rounded-[10px] border border-[#E2E8F0] bg-white p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[#0B5000] text-xs font-semibold text-white">
          {step}
        </span>
        <h2 className="text-base font-semibold text-[#001F00]">{title}</h2>
      </div>
      {children}
    </section>
  );
}
