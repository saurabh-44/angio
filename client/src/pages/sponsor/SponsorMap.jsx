import { useState } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import MapView from '@/components/MapView.jsx';
import PlantDetailSheet from '@/components/PlantDetailSheet.jsx';
import { usePlants } from '@/queries/plants.js';

export default function SponsorMap() {
  // 500 is high enough to fit the biggest realistic sponsor — most will
  // be far below it. We use a single page rather than paginating
  // because the map needs all pins at once to fit-bounds.
  const { data, isLoading } = usePlants({ limit: 500 });
  const plants = (data?.items ?? []).filter((p) => p.geo?.lat != null && p.geo?.lng != null);
  const [open, setOpen] = useState(null);

  return (
    <>
      <PageHeader
        eyebrow="Where your trees grow"
        title="Your forest, mapped"
        description="Every tree your donation funded — pin-dropped from the field where it was planted."
      />
      <MapView plants={plants} isLoading={isLoading} onSelect={setOpen} />
      <PlantDetailSheet plant={open} onClose={() => setOpen(null)} />
    </>
  );
}
