import PageHeader from '@/components/PageHeader.jsx';
import MaintenancePage from '@/pages/admin/MaintenancePage.jsx';

// Donor sees only their own logs (server-scoped). The admin page is
// rich enough already — we wrap with a donor-flavoured header.
export default function DonorMaintenance() {
  return (
    <>
      <PageHeader
        eyebrow="Weekly proof"
        title="Watering updates"
        description="Photos uploaded each week by volunteers caring for your trees."
        className="mb-0"
      />
      <div className="mt-2">
        <MaintenancePage />
      </div>
    </>
  );
}
