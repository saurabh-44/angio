import { env } from '../../config/env.js';
import { tokenTtl } from './tokens.js';

export const ACCESS_COOKIE = 'angio_access';
export const REFRESH_COOKIE = 'angio_refresh';

function baseOptions(maxAgeMs) {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
    path: '/',
    maxAge: maxAgeMs,
  };
}

export function setAccessCookie(res, token) {
  res.cookie(ACCESS_COOKIE, token, baseOptions(tokenTtl.accessSec * 1000));
}

export function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, baseOptions(tokenTtl.refreshSec * 1000));
}

export function clearAuthCookies(res) {
  const opts = { ...baseOptions(0), maxAge: 0 };
  res.clearCookie(ACCESS_COOKIE, opts);
  res.clearCookie(REFRESH_COOKIE, opts);
}
