// Native (Capacitor) token store.
//
// On web this whole module is inert: `isNative` is false, every function
// short-circuits, and auth keeps flowing through httpOnly cookies. On a
// native build the JWTs can't live in cookies (the API is a different
// origin from the webview), so we keep them in Capacitor Preferences
// (Keychain on iOS, encrypted prefs on Android) and attach them as
// `Authorization: Bearer` headers from api.js.
//
// A synchronous in-memory cache mirrors the persisted values so api.js
// can read the access token without awaiting on every request. Call
// `hydrateTokens()` once at startup to populate it from storage.
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

export const isNative = Capacitor.isNativePlatform();

const ACCESS_KEY = 'angio_access';
const REFRESH_KEY = 'angio_refresh';

let cache = { access: null, refresh: null };

// Load persisted tokens into the in-memory cache. No-op on web.
export async function hydrateTokens() {
  if (!isNative) return;
  const [access, refresh] = await Promise.all([
    Preferences.get({ key: ACCESS_KEY }),
    Preferences.get({ key: REFRESH_KEY }),
  ]);
  cache = { access: access.value || null, refresh: refresh.value || null };
}

export function getAccessToken() {
  return cache.access;
}

export function getRefreshToken() {
  return cache.refresh;
}

// Persist a fresh token pair (from any auth response). Partial updates
// keep the existing value for whichever field is absent.
export async function setTokens(tokens) {
  if (!isNative || !tokens) return;
  if (tokens.accessToken) cache.access = tokens.accessToken;
  if (tokens.refreshToken) cache.refresh = tokens.refreshToken;
  const ops = [];
  if (tokens.accessToken) ops.push(Preferences.set({ key: ACCESS_KEY, value: tokens.accessToken }));
  if (tokens.refreshToken) {
    ops.push(Preferences.set({ key: REFRESH_KEY, value: tokens.refreshToken }));
  }
  await Promise.all(ops);
}

export async function clearTokens() {
  cache = { access: null, refresh: null };
  if (!isNative) return;
  await Promise.all([
    Preferences.remove({ key: ACCESS_KEY }),
    Preferences.remove({ key: REFRESH_KEY }),
  ]);
}
