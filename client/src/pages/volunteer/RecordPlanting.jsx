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
import { ApiError } from '@/lib/api.js';

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
  const [species, setSpecies] = useState('');
  const [geo, setGeo] = useState({ lat: null, lng: null });
  const [photo, setPhoto] = useState(null);

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
      await create.mutateAsync({
        site: siteId,
        allocation: allocationId,
        species: species.trim() || undefined,
        geo,
        plantingPhoto: photo,
      });
      success('Tree recorded!', 'Thanks for your work — the donor will see it shortly.');
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
        description="Capture the location, snap a photo, and submit — the donor will see it right away."
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
          <Section step="2" title="Which donor's funding is this for?">
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
                      {a.donor?.name ?? 'Donor'} — target {a.targetPlants} trees
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Section>
        )}

        {allocationId && (
          <Section step="3" title="What did you plant?">
            <Label htmlFor="species" className="sr-only">Species</Label>
            <Input
              id="species"
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              placeholder="e.g. Mango, Neem, Banyan (optional)"
            />
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
