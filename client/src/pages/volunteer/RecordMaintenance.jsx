import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronDown,
  Droplets,
  Loader2,
  Ruler,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import PhotoCapture from '@/components/PhotoCapture.jsx';
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
import { HEALTH_OPTIONS } from '@/components/HealthBadge.jsx';
import { useToast } from '@/components/ui/toast.jsx';
import { useAssignments } from '@/queries/assignments.js';
import { usePlants } from '@/queries/plants.js';
import { useCreateMaintenance } from '@/queries/maintenance.js';
import { ApiError } from '@/lib/api.js';
import { cn } from '@/lib/utils';
import { BODY_FONT, HEADING_FONT } from '@/components/GlassAuthScreen.jsx';

function Header() {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-widest text-[#0B5000]">Field work</div>
      <h1 className="mt-1 text-3xl font-semibold text-[#001F00]" style={{ fontFamily: HEADING_FONT }}>
        Record watering
      </h1>
      <p className="mt-1 max-w-2xl text-base text-[#1E1E1E]/50">
        Snap a photo of the tree. Add measurements if you have a tape — it helps sponsors see the
        tree grow.
      </p>
    </div>
  );
}

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

  // Monitoring extensions — all optional, behind an expandable section so the
  // form stays quick for a basic watering check.
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [heightCm, setHeightCm] = useState('');
  const [dbhCm, setDbhCm] = useState('');
  const [healthStatus, setHealthStatus] = useState('');
  const [diseaseNotes, setDiseaseNotes] = useState('');

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
    const body = {
      plant: plantId,
      photo,
      note: note.trim() || undefined,
    };
    const heightNum = heightCm === '' ? null : Number(heightCm);
    if (heightNum != null && Number.isFinite(heightNum) && heightNum >= 0) body.heightCm = heightNum;
    const dbhNum = dbhCm === '' ? null : Number(dbhCm);
    if (dbhNum != null && Number.isFinite(dbhNum) && dbhNum >= 0) body.dbhCm = dbhNum;
    if (healthStatus) body.healthStatus = healthStatus;
    if (diseaseNotes.trim()) body.diseaseNotes = diseaseNotes.trim();

    try {
      await create.mutateAsync(body);
      success('Watering logged', 'Sponsors will see this in their feed.');
      navigate('/volunteer');
    } catch (err) {
      toastError("Couldn't save the log", err instanceof ApiError ? err.message : 'Try again.');
    }
  }

  if (loadingAssignments) {
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
            icon={Droplets}
            title="No sites assigned yet"
            description="Your NGO or site owner needs to add you to a site first."
          />
        </div>
      </div>
    );
  }

  const needsDiseaseNotes = healthStatus === 'diseased' || healthStatus === 'dying';

  return (
    <div style={{ fontFamily: BODY_FONT }}>
      <Header />

      <form onSubmit={submit} className="mt-6 max-w-2xl space-y-5">
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
              <p className="rounded-[10px] border border-[#E2E8F0] bg-[#F6FAF6] px-4 py-3 text-sm text-[#1E1E1E]/60">
                No alive plants on this site yet.
              </p>
            ) : (
              <Select value={plantId} onValueChange={setPlantId}>
                <SelectTrigger><SelectValue placeholder="Pick a tree" /></SelectTrigger>
                <SelectContent>
                  {plants.map((p) => (
                    <SelectItem key={p.id ?? p._id} value={p.id ?? p._id}>
                      {p.species ?? 'Tree'} ·{' '}
                      {p.geo ? `${p.geo.lat.toFixed(4)}, ${p.geo.lng.toFixed(4)}` : ''}
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

        {plantId && (
          <section className="overflow-hidden rounded-[10px] border border-[#E2E8F0] bg-white">
            <button
              type="button"
              onClick={() => setShowMeasurements((s) => !s)}
              className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-[#F6FAF6]"
              aria-expanded={showMeasurements}
            >
              <div className="flex items-center gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[#0B5000]/10 text-[#0B5000]">
                  <Ruler className="h-3.5 w-3.5" aria-hidden />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-[#001F00]">
                    Add measurements (optional)
                  </h2>
                  <p className="mt-0.5 text-xs text-[#1E1E1E]/50">
                    Height, trunk diameter, health, or disease notes
                  </p>
                </div>
              </div>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-[#1E1E1E]/50 transition-transform',
                  showMeasurements && 'rotate-180',
                )}
                aria-hidden
              />
            </button>

            {showMeasurements && (
              <div className="space-y-4 border-t border-[#E2E8F0] px-5 pb-5 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="heightCm">Height (cm)</Label>
                    <Input
                      id="heightCm"
                      type="number"
                      inputMode="decimal"
                      step="1"
                      min="0"
                      max="5000"
                      placeholder="e.g. 185"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                    />
                    <p className="text-[11px] text-[#1E1E1E]/50">From ground to top.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dbhCm">DBH (cm)</Label>
                    <Input
                      id="dbhCm"
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="0"
                      max="500"
                      placeholder="e.g. 4.5"
                      value={dbhCm}
                      onChange={(e) => setDbhCm(e.target.value)}
                    />
                    <p className="text-[11px] text-[#1E1E1E]/50">Trunk at chest-height.</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Health status</Label>
                  <Select value={healthStatus} onValueChange={setHealthStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="How does the tree look today?" />
                    </SelectTrigger>
                    <SelectContent>
                      {HEALTH_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {needsDiseaseNotes && (
                  <div className="space-y-1.5">
                    <Label htmlFor="diseaseNotes" className="inline-flex items-center gap-1.5">
                      <Stethoscope className="h-3.5 w-3.5 text-destructive" aria-hidden />
                      What does the disease look like?
                    </Label>
                    <Input
                      id="diseaseNotes"
                      value={diseaseNotes}
                      onChange={(e) => setDiseaseNotes(e.target.value)}
                      placeholder="e.g. leaves yellowing, brown spots on bark"
                    />
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        <div className="sticky bottom-4 sm:static">
          <div className="flex items-center gap-3 rounded-[10px] border border-[#E2E8F0] bg-white p-4 shadow-[0_0_20px_rgba(0,0,0,0.06)]">
            {ready ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[#346EC4]" aria-hidden />
            ) : (
              <Sparkles className="h-5 w-5 shrink-0 text-[#1E1E1E]/40" aria-hidden />
            )}
            <p className="flex-1 text-sm text-[#1E1E1E]/60">
              {ready ? 'All set — submit when ready.' : 'Pick a tree and upload a photo.'}
            </p>
            <button
              type="submit"
              disabled={!ready || create.isPending}
              className="inline-flex items-center gap-2 rounded-[10px] bg-[#346EC4] px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-[#2c5da6] disabled:opacity-50"
            >
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <Droplets className="h-4 w-4" /> Submit
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
