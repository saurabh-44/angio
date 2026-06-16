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
const OtpVerify = lazy(() => import('@/pages/auth/OtpVerify.jsx'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword.jsx'));
const ChangePassword = lazy(() => import('@/pages/auth/ChangePassword.jsx'));

// NGO Admin chunks (also reused by Site Owner with role-aware UI)
const AdminHome = lazy(() => import('@/pages/admin/AdminHome.jsx'));
const UsersPage = lazy(() => import('@/pages/admin/UsersPage.jsx'));
const SitesPage = lazy(() => import('@/pages/admin/SitesPage.jsx'));
const DonationsPage = lazy(() => import('@/pages/admin/DonationsPage.jsx'));
const PlantsPage = lazy(() => import('@/pages/admin/PlantsPage.jsx'));
const MaintenancePage = lazy(() => import('@/pages/admin/MaintenancePage.jsx'));
const AssignmentsPage = lazy(() => import('@/pages/admin/AssignmentsPage.jsx'));

// Site Owner home (other site routes reuse the admin pages)
const SiteHome = lazy(() => import('@/pages/site/SiteHome.jsx'));

// Donor chunks
const DonorHome = lazy(() => import('@/pages/donor/DonorHome.jsx'));
const DonorTrees = lazy(() => import('@/pages/donor/DonorTrees.jsx'));
const DonorMap = lazy(() => import('@/pages/donor/DonorMap.jsx'));
const DonorMaintenance = lazy(() => import('@/pages/donor/DonorMaintenance.jsx'));
const DonorDonations = lazy(() => import('@/pages/donor/DonorDonations.jsx'));

// Volunteer chunks
const VolunteerHome = lazy(() => import('@/pages/volunteer/VolunteerHome.jsx'));
const VolunteerAssignments = lazy(() => import('@/pages/volunteer/VolunteerAssignments.jsx'));
const RecordPlanting = lazy(() => import('@/pages/volunteer/RecordPlanting.jsx'));
const RecordMaintenance = lazy(() => import('@/pages/volunteer/RecordMaintenance.jsx'));

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
          <Route path="donations" element={<DonationsPage />} />
          <Route path="plants" element={<PlantsPage />} />
          <Route path="maintenance" element={<MaintenancePage />} />
          <Route path="assignments" element={<AssignmentsPage />} />
          <Route path="map" element={<DonorMap />} />
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
          <Route path="volunteers" element={<AssignmentsPage />} />
          <Route path="plants" element={<PlantsPage />} />
          <Route path="maintenance" element={<MaintenancePage />} />
        </Route>

        {/* Donor tree */}
        <Route
          path="/donor"
          element={
            <PrivateRoute roles={['donor']}>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<DonorHome />} />
          <Route path="trees" element={<DonorTrees />} />
          <Route path="map" element={<DonorMap />} />
          <Route path="maintenance" element={<DonorMaintenance />} />
          <Route path="donations" element={<DonorDonations />} />
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

        {/* Index — marketing landing when signed out, role home when signed in. */}
        <Route path="/" element={<PublicRoot landing={<Landing />} />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
