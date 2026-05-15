/**
 * HROne Studio server-side HTTP client.
 * Handles login + auto-refresh. Used only in Next.js API routes (server-side).
 * Never import this in client components.
 */

const BASE = process.env.HRONE_BASE_URL!;
const ORG_ID = process.env.HRONE_ORG_ID!;
const APP_ID = process.env.HRONE_APP_ID!;
const EMAIL = process.env.HRONE_EMAIL!;
const PASSWORD = process.env.HRONE_PASSWORD!;

interface TokenCache {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// Module-level cache (survives across requests in the same Node process)
let _cache: TokenCache | null = null;

async function login(): Promise<TokenCache> {
  const res = await fetch(`${BASE}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ username: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`HROne login failed: ${res.status}`);

  const setCookies = res.headers.getSetCookie?.() ?? [];
  return extractTokens(setCookies);
}

async function refresh(refreshToken: string): Promise<TokenCache> {
  const res = await fetch(`${BASE}/admin/auth/refresh`, {
    headers: { Cookie: `refresh_token=${refreshToken}` },
  });
  if (!res.ok) throw new Error(`HROne refresh failed: ${res.status}`);

  const setCookies = res.headers.getSetCookie?.() ?? [];
  return extractTokens(setCookies, refreshToken);
}

function extractTokens(setCookies: string[], fallbackRefresh?: string): TokenCache {
  let accessToken = '';
  let refreshToken = fallbackRefresh ?? '';

  for (const cookie of setCookies) {
    const [pair] = cookie.split(';');
    const eqIdx = pair.indexOf('=');
    const name = pair.slice(0, eqIdx).trim();
    const value = pair.slice(eqIdx + 1).trim();
    if (name === 'access_token') accessToken = value;
    if (name === 'refresh_token') refreshToken = value;
  }

  if (!accessToken) throw new Error('No access_token in HROne auth response');
  return { accessToken, refreshToken, expiresAt: Date.now() + 25 * 60 * 1000 }; // 25 min
}

async function getToken(): Promise<string> {
  const BUFFER = 60_000;
  if (_cache && _cache.expiresAt - BUFFER > Date.now()) return _cache.accessToken;

  try {
    _cache = _cache?.refreshToken ? await refresh(_cache.refreshToken) : await login();
  } catch {
    _cache = await login();
  }
  return _cache.accessToken;
}

export async function hroneRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-org-id': ORG_ID,
      'x-app-id': APP_ID,
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HROne API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}
