import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, Sparkles, Sprout } from 'lucide-react';
import PageHeader from '@/components/PageHeader.jsx';
import PhotoCapture from '@/components/PhotoCapture.jsx';
import GpsCapture from '@/components/GpsCapture.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import { Button } from '@/components/ui/button.jsx';
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
import { useAllocations } from '@/queries/donations.js';
import { useCreatePlant } from '@/queries/plants.js';
import { useSpeciesList } from '@/queries/species.js';
import { ApiError } from '@/lib/api.js';

const CUSTOM_SPECIES = '__custom__';
const GROWTH_STAGES = [
  { value: 'seedling', label: 'Seedling' },
  { value: 'sapling', label: 'Sapling' },
  { value: 'young', label: 'Young' },
  { value: 'mature', label: 'Mature' },
];

// Volunteer's planting-capture form. Each step is gated by the previous
// one so a volunteer in the field can't skip GPS or photo. Submit lands
// the {site, allocation, geo, plantingPhoto, species} on the server.
export default function RecordPlanting() {
  const location = useLocation();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const { data: assignmentsData, isLoading: loadingAssignments } = useAssignments({ kind: 'planting', limit: 50 });
  const assignments = assignmentsData?.items ?? [];
  // Dedupe by site
  const sites = useMemo(() => {
    const seen = new Map();
    for (const a of assignments) {
      const id = a.site?.id ?? a.site?._id;
      if (id && !seen.has(id)) seen.set(id, a.site);
    }
    return Array.from(seen.values());
  }, [assignments]);

  const [siteId, setSiteId] = useState(location.state?.siteId ?? '');
  const [allocationId, setAllocationId] = useState('');
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

  const { data: allocsData, isLoading: loadingAllocs } = useAllocations({
    site: siteId || undefined,
    enabled: !!siteId,
    limit: 100,
  });
  const allocations = allocsData?.items ?? [];

  const create = useCreatePlant();

  const ready = siteId && allocationId && geo.lat != null && geo.lng != null && photo;

  async function submit(e) {
    e.preventDefault();
    if (!ready) return;
    try {
      // If the volunteer picked from the dropdown, send both the
      // master ID and the denormalised name (so exports stay
      // self-contained). Free-text submissions only carry the name.
      const picked = speciesOptions.find(
        (s) => (s.id ?? s._id) === speciesRef,
      );
      const speciesName = picked ? picked.name : species.trim();
      await create.mutateAsync({
        site: siteId,
        allocation: allocationId,
        name: name.trim() || undefined,
        species: speciesName || undefined,
        speciesRef: picked ? (picked.id ?? picked._id) : undefined,
        heightCm: heightCm !== '' ? Number(heightCm) : undefined,
        growthStage: growthStage || undefined,
        dryBiomassKg: dryBiomassKg !== '' ? Number(dryBiomassKg) : undefined,
        geo,
        plantingPhoto: photo,
      });
      success('Tree recorded!', 'Thanks for your work — the sponsor will see it shortly.');
      navigate('/volunteer');
    } catch (err) {
      toastError(
        "Couldn't save the planting",
        err instanceof ApiError ? err.message : 'Try again.',
      );
    }
  }

  if (loadingAssignments) {
    return (
      <>
        <PageHeader eyebrow="Field work" title="Record a planting" />
        <Skeleton className="h-64 w-full" />
      </>
    );
  }

  if (sites.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Field work" title="Record a planting" />
        <EmptyState
          icon={Sprout}
          title="No planting sites assigned yet"
          description="Your NGO or site owner needs to add you to a site first."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Field work"
        title="Record a planting"
        description="Capture the location, snap a photo, and submit — the sponsor will see it right away."
      />

      <form onSubmit={submit} className="space-y-6 max-w-2xl">
        <Section step="1" title="Where are you planting?">
          <Select value={siteId} onValueChange={(v) => { setSiteId(v); setAllocationId(''); }}>
            <SelectTrigger><SelectValue placeholder="Pick a site" /></SelectTrigger>
            <SelectContent>
              {sites.map((s) => (
                <SelectItem key={s.id ?? s._id} value={s.id ?? s._id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Section>

        {siteId && (
          <Section step="2" title="Which sponsor's funding is this for?">
            {loadingAllocs ? (
              <Skeleton className="h-11 w-full" />
            ) : allocations.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-xl border border-border/60 bg-secondary/40 px-4 py-3">
                No active allocations on this site yet. Ask the NGO admin to allocate funding.
              </p>
            ) : (
              <Select value={allocationId} onValueChange={setAllocationId}>
                <SelectTrigger><SelectValue placeholder="Pick an allocation" /></SelectTrigger>
                <SelectContent>
                  {allocations.map((a) => (
                    <SelectItem key={a.id ?? a._id} value={a.id ?? a._id}>
                      {a.donor?.name ?? 'Sponsor'} — target {a.targetPlants} trees
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Section>
        )}

        {allocationId && (
          <Section step="3" title="What did you plant?">
            <div className="mb-3 space-y-1.5">
              <Label htmlFor="plant-name" className="text-xs text-muted-foreground">
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
                            <span className="text-muted-foreground italic">
                              {' '}· {s.scientificName}
                            </span>
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

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border/50 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="heightCm" className="text-xs text-muted-foreground">Height (cm)</Label>
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
                <Label className="text-xs text-muted-foreground">Growth stage</Label>
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
                <Label htmlFor="dryBiomassKg" className="text-xs text-muted-foreground">Dry biomass (kg)</Label>
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

        {allocationId && (
          <Section step="4" title="GPS location">
            <GpsCapture value={geo} onChange={setGeo} disabled={create.isPending} />
          </Section>
        )}

        {allocationId && geo.lat != null && (
          <Section step="5" title="Planting photo">
            <PhotoCapture
              purpose="plant"
              siteId={siteId}
              onUploaded={setPhoto}
              onCleared={() => setPhoto(null)}
            />
          </Section>
        )}

        <div className="sticky bottom-4 sm:static">
          <div className="bento-card p-4 flex items-center gap-3">
            {ready ? (
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" aria-hidden />
            ) : (
              <Sparkles className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden />
            )}
            <p className="flex-1 text-sm text-muted-foreground">
              {ready ? 'All set — submit when ready.' : 'Complete each step above to submit.'}
            </p>
            <Button type="submit" size="lg" disabled={!ready || create.isPending}>
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <Sprout className="h-4 w-4" /> Submit
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}

function Section({ step, title, children }) {
  return (
    <section className="bento-card p-5 space-y-3">
      <div className="flex items-center gap-3">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground font-mono text-xs font-semibold">
          {step}
        </span>
        <h2 className="font-heading text-base font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );
}
