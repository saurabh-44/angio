import { Navigate } from 'react-router-dom';
import { ROLE_HOME, useAuth } from '@/lib/auth.jsx';

// Bounces "/" to the right dashboard for the current role. Used as the
// root index so users never see a 404 after login.
export default function RoleHome() {
  const { role } = useAuth();
  return <Navigate to={ROLE_HOME[role] ?? '/login'} replace />;
}
