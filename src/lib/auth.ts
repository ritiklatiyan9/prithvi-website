import { useSyncExternalStore } from "react";

/** Dev: Vite proxy forwards /api. Prod: VITE_API_BASE_URL = origin + /api/v1. */
export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

const KEY = "rh-web-auth";

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

// ---- tiny external store (React reads it via useSyncExternalStore) ----

const load = (): AuthSession | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    return parsed.accessToken && parsed.refreshToken ? parsed : null;
  } catch {
    return null;
  }
};

let session: AuthSession | null = load();
const listeners = new Set<() => void>();

const save = (next: AuthSession | null): void => {
  session = next;
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {
    /* private mode — keep the in-memory session */
  }
  listeners.forEach((listener) => listener());
};

export const getSession = (): AuthSession | null => session;
export const clearSession = (): void => save(null);

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Reactive session for components; null when browsing anonymously. */
export const useAuth = (): AuthSession | null => useSyncExternalStore(subscribe, getSession);

// ---- boot: exchange the one-time ?code= handed over by the app ----

/**
 * The app opens <websiteUrl>?code=<one-time>&category=<slug>. On boot we
 * exchange the code for the standard JWT pair and strip it from the URL
 * (leaving ?category= intact). Failure is silent — anonymous browsing works.
 */
/** Last exchange failure — surfaced by the embedded auth gate so a stuck
 *  "Restoring your session" names its own cause on screen. */
export let lastExchangeError: string | null = null;

export const exchangeCode = async (code: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE}/auth/web-exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const body = (await response.json()) as { success: boolean; data?: AuthSession };
    if (response.ok && body.success && body.data) {
      lastExchangeError = null;
      save(body.data);
    } else {
      lastExchangeError = `exchange HTTP ${response.status}`;
      console.error("[rh] web-exchange rejected", response.status, JSON.stringify(body).slice(0, 200));
    }
  } catch (error) {
    lastExchangeError = `network: ${String(error).slice(0, 120)}`;
    console.error("[rh] web-exchange network error", error);
  }
};

export const bootstrapAuth = async (): Promise<void> => {
  let code: string | null = null;
  try {
    const url = new URL(window.location.href);
    code = url.searchParams.get("code");
    if (!code) return;
    url.searchParams.delete("code");
    history.replaceState(null, "", url); // strip first: the code is single-use
  } catch {
    return;
  }
  await exchangeCode(code);
};

// ---- embedded: the app re-injects a fresh code after WebView reloads ----
// The one-time boot code dies with the first exchange; when the WebView
// reloads (Play Store round-trip, process restore) the app mints a new code
// and calls this instead of reloading the page.

declare global {
  interface Window {
    __rhExchangeCode?: (code: string) => void;
    __rhHasSession?: () => boolean;
    __rhSetSession?: (sessionJson: string) => void;
  }
}

if (typeof window !== "undefined") {
  window.__rhExchangeCode = (code) => void exchangeCode(code);
  window.__rhHasSession = () => session != null;
  // Direct hand-off: the app injects the full token pair it obtained from
  // POST /auth/web-session — no fetch happens inside the WebView, so there
  // is nothing network-ish left to fail on this side.
  window.__rhSetSession = (sessionJson) => {
    try {
      const next = JSON.parse(sessionJson) as AuthSession;
      if (next && next.accessToken && next.refreshToken) {
        lastExchangeError = null;
        save(next);
      } else {
        lastExchangeError = "inject: payload missing tokens";
      }
    } catch (error) {
      lastExchangeError = `inject: ${String(error).slice(0, 80)}`;
      console.error("[rh] session inject failed", error);
    }
  };
}

// ---- single-flight refresh ----

let refreshing: Promise<string | null> | null = null;

/**
 * Rotate tokens via POST /auth/refresh. Concurrent 401s share one flight.
 * A definitive rejection (4xx) clears the session; a network error keeps it.
 */
export const refreshAccessToken = (): Promise<string | null> => {
  refreshing ??= (async () => {
    const current = session;
    if (!current) return null;
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      });
      if (!response.ok) {
        save(null);
        return null;
      }
      const body = (await response.json()) as { success: boolean; data: AuthSession };
      save(body.data);
      return body.data.accessToken;
    } catch {
      return null; // offline — try again next request
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
};
