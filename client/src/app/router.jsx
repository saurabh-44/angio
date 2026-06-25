import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import PrivateRoute from './routes/PrivateRoute.jsx';
import PublicOnlyRoute from './routes/PublicOnlyRoute.jsx';
import PublicRoot from './routes/PublicRoot.jsx';
import AppLayout from '@/components/AppLayout.jsx';
import { Spinner } from '@/components/ui/spinner.jsx';

// Public marketing landing page (not lazy — first paint of "/" should
// be instant for cold visitors).
import Landing from '@/pages/Landing.jsx';

// Every page is code-split via React.lazy so the initial bundle stays
// small. Heavy deps (Google Maps on the map pages, the photo-upload
// + camera widgets on the volunteer wizard) land only when the user
// navigates there.

// Auth chunks
const Login = lazy(() => import('@/pages/auth/Login.jsx'));
const Register = lazy(() => import('@/pages/auth/Register.jsx'));
const OtpVerify = lazy(() => import('@/pages/auth/OtpVerify.jsx'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword.jsx'));
const ChangePassword = lazy(() => import('@/pages/auth/ChangePassword.jsx'));

// NGO Admin chunks (also reused by Site Owner with role-aware UI)
const AdminHome = lazy(() => import('@/pages/admin/AdminHome.jsx'));
const UsersPage = lazy(() => import('@/pages/admin/UsersPage.jsx'));
const SitesPage = lazy(() => import('@/pages/admin/SitesPage.jsx'));
const SiteDetailPage = lazy(() => import('@/pages/admin/SiteDetailPage.jsx'));
const DonationsPage = lazy(() => import('@/pages/admin/DonationsPage.jsx'));
const PlantsPage = lazy(() => import('@/pages/admin/PlantsPage.jsx'));
const PlantDetailPage = lazy(() => import('@/pages/admin/PlantDetailPage.jsx'));
const MaintenancePage = lazy(() => import('@/pages/admin/MaintenancePage.jsx'));
const AssignmentsPage = lazy(() => import('@/pages/admin/AssignmentsPage.jsx'));
const ImportPage = lazy(() => import('@/pages/admin/ImportPage.jsx'));
const SpeciesPage = lazy(() => import('@/pages/admin/SpeciesPage.jsx'));

// Site Owner home (other site routes reuse the admin pages)
const SiteHome = lazy(() => import('@/pages/site/SiteHome.jsx'));

// Sponsor chunks
const SponsorHome = lazy(() => import('@/pages/sponsor/SponsorHome.jsx'));
const SponsorTrees = lazy(() => import('@/pages/sponsor/SponsorTrees.jsx'));
const SponsorMap = lazy(() => import('@/pages/sponsor/SponsorMap.jsx'));
const SponsorMaintenance = lazy(() => import('@/pages/sponsor/SponsorMaintenance.jsx'));
const SponsorDonations = lazy(() => import('@/pages/sponsor/SponsorDonations.jsx'));
const SponsorOrders = lazy(() => import('@/pages/sponsor/SponsorOrders.jsx'));
const SponsorTree = lazy(() => import('@/pages/sponsor/SponsorTree.jsx'));
const SponsorProfile = lazy(() => import('@/pages/sponsor/SponsorProfile.jsx'));

// Volunteer chunks
const VolunteerHome = lazy(() => import('@/pages/volunteer/VolunteerHome.jsx'));
const VolunteerAssignments = lazy(() => import('@/pages/volunteer/VolunteerAssignments.jsx'));
const RecordPlanting = lazy(() => import('@/pages/volunteer/RecordPlanting.jsx'));
const RecordMaintenance = lazy(() => import('@/pages/volunteer/RecordMaintenance.jsx'));

// Public no-auth tree verification page — destination of QR scans.
const PublicTree = lazy(() => import('@/pages/PublicTree.jsx'));

// Shared in-app QR scanner used by ngo_admin, site_owner, volunteer.
const Scan = lazy(() => import('@/pages/Scan.jsx'));

// Full-page spinner for public auth routes (which don't render AppLayout).
function FullPageSpinner() {
  return (
    <div className="grid min-h-screen place-items-center">
      <Spinner label="Loading" />
    </div>
  );
}

// Wraps a public auth page in both the gate + a Suspense fallback so
// the lazy chunk shows a clean splash on first navigation.
function PublicAuth({ element }) {
  return (
    <PublicOnlyRoute>
      <Suspense fallback={<FullPageSpinner />}>{element}</Suspense>
    </PublicOnlyRoute>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public auth tree */}
        <Route path="/login" element={<PublicAuth element={<Login />} />} />
        <Route path="/register" element={<PublicAuth element={<Register />} />} />
        <Route path="/login/verify" element={<PublicAuth element={<OtpVerify />} />} />
        <Route path="/forgot-password" element={<PublicAuth element={<ForgotPassword />} />} />
        <Route path="/reset-password" element={<PublicAuth element={<ResetPassword />} />} />

        {/* Forced password change — auth required, forced-flag gate skipped. */}
        <Route
          path="/change-password"
          element={
            <PrivateRoute redirectIfForced={false}>
              <Suspense fallback={<FullPageSpinner />}>
                <ChangePassword />
              </Suspense>
            </PrivateRoute>
          }
        />

        {/* NGO Admin tree */}
        <Route
          path="/admin"
          element={
            <PrivateRoute roles={['ngo_admin']}>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<AdminHome />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="sites" element={<SitesPage />} />
          <Route path="sites/:id" element={<SiteDetailPage />} />
          <Route path="donations" element={<DonationsPage />} />
          <Route path="plants" element={<PlantsPage />} />
          <Route path="plants/:id" element={<PlantDetailPage />} />
          <Route path="maintenance" element={<MaintenancePage />} />
          <Route path="assignments" element={<AssignmentsPage />} />
          <Route path="species" element={<SpeciesPage />} />
          <Route path="map" element={<SponsorMap />} />
          {/* Import hidden per client request — uncomment to re-enable */}
          {/* <Route path="import" element={<ImportPage />} /> */}
        </Route>

        {/* Site Owner tree — admin pages used as-is, scoped by backend. */}
        <Route
          path="/site"
          element={
            <PrivateRoute roles={['site_owner']}>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<SiteHome />} />
          <Route path="sites" element={<SitesPage />} />
          <Route path="sites/:id" element={<SiteDetailPage />} />
          <Route path="volunteers" element={<AssignmentsPage />} />
          <Route path="plants" element={<PlantsPage />} />
          <Route path="plants/:id" element={<PlantDetailPage />} />
          <Route path="maintenance" element={<MaintenancePage />} />
        </Route>

        {/* Sponsor tree */}
        <Route
          path="/sponsor"
          element={
            <PrivateRoute roles={['sponsor']}>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<SponsorHome />} />
          <Route path="sponsor" element={<SponsorTree />} />
          <Route path="orders" element={<SponsorOrders />} />
          <Route path="trees" element={<SponsorTrees />} />
          <Route path="map" element={<SponsorMap />} />
          <Route path="maintenance" element={<SponsorMaintenance />} />
          <Route path="donations" element={<SponsorDonations />} />
          <Route path="profile" element={<SponsorProfile />} />
        </Route>

        {/* Volunteer tree */}
        <Route
          path="/volunteer"
          element={
            <PrivateRoute roles={['volunteer']}>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<VolunteerHome />} />
          <Route path="assignments" element={<VolunteerAssignments />} />
          <Route path="plant" element={<RecordPlanting />} />
          <Route path="maintenance" element={<RecordMaintenance />} />
        </Route>

        {/* Public no-auth QR-scan destination. Not gated; cached at the
            page level to be fast for someone scanning in the field. */}
        <Route
          path="/tree/:code"
          element={
            <Suspense fallback={<FullPageSpinner />}>
              <PublicTree />
            </Suspense>
          }
        />

        {/* In-app QR scanner. Available to every field role; donor never
            needs it (their dashboard already lists their trees). */}
        <Route
          path="/scan"
          element={
            <PrivateRoute roles={['ngo_admin', 'site_owner', 'volunteer']}>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Scan />} />
        </Route>

        {/* Index — marketing landing when signed out, role home when signed in. */}
        <Route path="/" element={<PublicRoot landing={<Landing />} />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
