import { Navigate } from 'react-router-dom';
import { ROLE_HOME, useAuth } from '@/lib/auth.jsx';
import { Spinner } from '@/components/ui/spinner.jsx';

// "/" is special: signed-out users see the marketing landing page,
// signed-in users go to their role dashboard. We can't reuse
// PrivateRoute because we DON'T want to redirect anonymous visitors
// to /login — they should land on Landing.
export default function PublicRoot({ landing }) {
  const { status, isAuthenticated, role, mustChangePassword } = useAuth();

  if (status === 'pending') {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner label="Loading" />
      </div>
    );
  }

  if (isAuthenticated) {
    if (mustChangePassword) return <Navigate to="/change-password" replace />;
    const home = ROLE_HOME[role];
    if (home) return <Navigate to={home} replace />;
    // Unknown role → show the landing instead of bouncing to /login (which
    // would loop with PublicOnlyRoute).
  }

  return landing;
}
