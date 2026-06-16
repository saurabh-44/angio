import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Droplets, Loader2, Sparkles } from 'lucide-react';
import PageHeader from '@/components/PageHeader.jsx';
import PhotoCapture from '@/components/PhotoCapture.jsx';
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
import { usePlants } from '@/queries/plants.js';
import { useCreateMaintenance } from '@/queries/maintenance.js';
import { ApiError } from '@/lib/api.js';

export default function RecordMaintenance() {
  const location = useLocation();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const { data: assignmentsData, isLoading: loadingAssignments } = useAssignments({ limit: 50 });
  const assignments = assignmentsData?.items ?? [];
  const sites = useMemo(() => {
    const seen = new Map();
    for (const a of assignments) {
      const id = a.site?.id ?? a.site?._id;
      if (id && !seen.has(id)) seen.set(id, a.site);
    }
    return Array.from(seen.values());
  }, [assignments]);

  const [siteId, setSiteId] = useState(location.state?.siteId ?? '');
  const [plantId, setPlantId] = useState('');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState(null);

  const { data: plantsData, isLoading: loadingPlants } = usePlants({
    site: siteId || undefined,
    status: 'alive',
    limit: 200,
  });
  const plants = plantsData?.items ?? [];

  const create = useCreateMaintenance();
  const ready = siteId && plantId && photo;

  async function submit(e) {
    e.preventDefault();
    if (!ready) return;
    try {
      await create.mutateAsync({
        plant: plantId,
        photo,
        note: note.trim() || undefined,
      });
      success('Watering logged', 'Donors will see this in their feed.');
      navigate('/volunteer');
    } catch (err) {
      toastError(
        "Couldn't save the log",
        err instanceof ApiError ? err.message : 'Try again.',
      );
    }
  }

  if (loadingAssignments) {
    return (
      <>
        <PageHeader eyebrow="Field work" title="Record watering" />
        <Skeleton className="h-64 w-full" />
      </>
    );
  }

  if (sites.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Field work" title="Record watering" />
        <EmptyState
          icon={Droplets}
          title="No sites assigned yet"
          description="Your NGO or site owner needs to add you to a site first."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Field work"
        title="Record watering"
        description="One photo per tree per week — that's the weekly proof donors see."
      />

      <form onSubmit={submit} className="space-y-6 max-w-2xl">
        <Section step="1" title="Which site?">
          <Select value={siteId} onValueChange={(v) => { setSiteId(v); setPlantId(''); }}>
            <SelectTrigger><SelectValue placeholder="Pick a site" /></SelectTrigger>
            <SelectContent>
              {sites.map((s) => (
                <SelectItem key={s.id ?? s._id} value={s.id ?? s._id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Section>

        {siteId && (
          <Section step="2" title="Which tree?">
            {loadingPlants ? (
              <Skeleton className="h-11 w-full" />
            ) : plants.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-xl border border-border/60 bg-secondary/40 px-4 py-3">
                No alive plants on this site yet.
              </p>
            ) : (
              <Select value={plantId} onValueChange={setPlantId}>
                <SelectTrigger><SelectValue placeholder="Pick a tree" /></SelectTrigger>
                <SelectContent>
                  {plants.map((p) => (
                    <SelectItem key={p.id ?? p._id} value={p.id ?? p._id}>
                      {p.species ?? 'Tree'} · {p.geo ? `${p.geo.lat.toFixed(4)}, ${p.geo.lng.toFixed(4)}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Section>
        )}

        {plantId && (
          <Section step="3" title="Today's photo">
            <PhotoCapture
              purpose="maintenance"
              plantId={plantId}
              onUploaded={setPhoto}
              onCleared={() => setPhoto(null)}
            />
          </Section>
        )}

        {plantId && (
          <Section step="4" title="Note (optional)">
            <Label htmlFor="note" className="sr-only">Note</Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. soil dry, mulch refreshed"
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
              {ready ? 'All set — submit when ready.' : 'Pick a tree and upload a photo.'}
            </p>
            <Button type="submit" size="lg" disabled={!ready || create.isPending}>
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <Droplets className="h-4 w-4" /> Submit
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
