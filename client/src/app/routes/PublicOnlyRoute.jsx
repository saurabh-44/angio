import { Navigate } from 'react-router-dom';
import { ROLE_HOME, useAuth } from '@/lib/auth.jsx';
import { Spinner } from '@/components/ui/spinner.jsx';

// Wraps routes that should NOT be visible to an already-signed-in user
// (login, forgot-password, etc.). Sends them to their role home.
export default function PublicOnlyRoute({ children }) {
  const { status, isAuthenticated, role, mustChangePassword } = useAuth();
  if (status === 'pending') {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner label="Loading session" />
      </div>
    );
  }
  if (isAuthenticated) {
    if (mustChangePassword) return <Navigate to="/change-password" replace />;
    const home = ROLE_HOME[role];
    // Only redirect when we know the dashboard for this role. An unrecognized
    // role must NOT fall through to "/" — that ping-pongs with PublicRoot
    // ("/" → "/login" → "/" …) and locks the app in a redirect loop.
    if (home) return <Navigate to={home} replace />;
  }
  return children;
}
