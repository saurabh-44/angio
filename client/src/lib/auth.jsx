import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { api, ApiError } from './api.js';

const AuthContext = createContext(null);

// Maps a server role onto the root path for that role's dashboard. The
// router uses this for the post-login redirect and the "home" link.
export const ROLE_HOME = {
  ngo_admin: '/admin',
  site_owner: '/site',
  sponsor: '/sponsor',
  volunteer: '/volunteer',
};

export const ROLE_LABEL = {
  ngo_admin: 'NGO Admin',
  site_owner: 'Site Owner',
  sponsor: 'Sponsor',
  volunteer: 'Volunteer',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // 'pending' = first /me call hasn't returned yet (show full-page splash).
  // 'idle'    = settled (either signed in or not).
  const [status, setStatus] = useState('pending');
  // Tracks an in-flight login step 1 — used by the OTP page to know which
  // email it's verifying without sticking it in the URL.
  const [pendingOtpEmail, setPendingOtpEmail] = useState(null);
  const fetchedOnce = useRef(false);

  const refetchMe = useCallback(async () => {
    try {
      const data = await api.get('/api/auth/me');
      setUser(data.user);
      return data.user;
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setUser(null);
        return null;
      }
      throw err;
    }
  }, []);

  useEffect(() => {
    if (fetchedOnce.current) return;
    fetchedOnce.current = true;
    refetchMe().finally(() => setStatus('idle'));
  }, [refetchMe]);

  // Step 1: password. If the role triggers OTP (ngo_admin/site_owner) the
  // server responds requiresOtp:true and we stash the email so the OTP
  // step doesn't need to ask for it again. Otherwise we're already signed
  // in — refetch /me to hydrate the user.
  const login = useCallback(async ({ email, password }) => {
    const res = await api.post('/api/auth/login', { email, password });
    if (res?.requiresOtp) {
      setPendingOtpEmail(email);
      return { requiresOtp: true };
    }
    const me = await refetchMe();
    setPendingOtpEmail(null);
    return { requiresOtp: false, user: me ?? res?.user ?? null };
  }, [refetchMe]);

  // Public sponsor self-registration. Creates the account, then runs the
  // normal login (which, for sponsors, triggers the email-OTP step) so the
  // caller gets the same { requiresOtp } shape as login().
  const register = useCallback(async (input) => {
    await api.post('/api/auth/register', input);
    return login({ email: input.email, password: input.password });
  }, [login]);

  const verifyLoginOtp = useCallback(async ({ otp }) => {
    if (!pendingOtpEmail) throw new Error('No pending login — start over.');
    await api.post('/api/auth/login/verify', { email: pendingOtpEmail, otp });
    const me = await refetchMe();
    setPendingOtpEmail(null);
    return me;
  }, [pendingOtpEmail, refetchMe]);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // Already-expired session is fine.
    }
    setUser(null);
    setPendingOtpEmail(null);
  }, []);

  const resetPasswordComplete = useCallback(async ({ email, otp, newPassword }) => {
    // Server sets cookies on success, so we re-hydrate /me right after.
    await api.post('/api/auth/reset-password', { email, otp, newPassword });
    return refetchMe();
  }, [refetchMe]);

  const changePassword = useCallback(async ({ currentPassword, newPassword }) => {
    await api.post('/api/auth/change-password', { currentPassword, newPassword });
    return refetchMe();
  }, [refetchMe]);

  const value = useMemo(
    () => ({
      user,
      status,
      pendingOtpEmail,
      isAuthenticated: !!user,
      role: user?.role ?? null,
      mustChangePassword: !!user?.forcePasswordChange,
      login,
      register,
      verifyLoginOtp,
      logout,
      resetPasswordComplete,
      changePassword,
      refetchMe,
    }),
    [
      user,
      status,
      pendingOtpEmail,
      login,
      register,
      verifyLoginOtp,
      logout,
      resetPasswordComplete,
      changePassword,
      refetchMe,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
