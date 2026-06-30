import { Navigate } from 'react-router-dom';
import { ROLE_HOME, useAuth } from '@/lib/auth.jsx';
import { Spinner } from '@/components/ui/spinner.jsx';

// Used by the auth router below. Gates a subtree on:
//   - the principal is signed in
//   - their role is allowed (if `roles` was passed)
//   - they aren't stuck on a forced password change
//
// `redirectIfForced` controls the forced-password gate. Most routes set
// it (so we redirect to /change-password). The /change-password page
// itself sets it to false so the user can actually clear the flag.
export default function PrivateRoute({ children, roles, redirectIfForced = true }) {
  const { status, isAuthenticated, role, mustChangePassword } = useAuth();

  if (status === 'pending') {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner label="Loading session" />
      </div>
    );
  }

  // Signed-out (incl. after Sign out) → public home/landing, not the login page.
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (redirectIfForced && mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  if (roles && !roles.includes(role)) {
    return <Navigate to={ROLE_HOME[role] ?? '/'} replace />;
  }

  return children;
}
