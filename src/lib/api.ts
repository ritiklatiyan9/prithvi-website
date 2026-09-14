import { API_BASE, getSession, refreshAccessToken } from "./auth";
import { getSessionId } from "./session";

export interface OfferCategory {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  featured: boolean;
  offerCount: number;
}

export interface OfferCard {
  id: string;
  slug: string;
  title: string;
  appName: string | null;
  logoUrl: string | null;
  thumbnailUrl: string | null;
  shortDescription: string;
  rewardAmount: number;
  rewardLabel: string | null;
  estimatedTime: string | null;
  rating: number | null;
  isProduct: boolean;
  brandLogoUrl: string | null;
  featured: boolean;
  /** True when the signed-in caller's proof for this offer is APPROVED. */
  completed?: boolean;
  /** SHOW | HIDE | SHOW_COMPLETED — HIDE offers never reach signed-in lists. */
  completedBehavior?: "SHOW" | "HIDE" | "SHOW_COMPLETED";
  category: { id: string; slug: string; title: string };
}

export interface OfferDetails extends OfferCard {
  bannerUrl: string | null;
  description: string;
  features: string[];
  instructions: string[];
  requirements: string[];
  terms: string | null;
  warning: string | null;
  playStoreUrl: string;
}

export type SubmissionStatus =
  "PENDING" | "APPROVED" | "REJECTED" | "NEED_MORE_PROOF" | "CANCELLED";

export interface Submission {
  id: string;
  offerId: string;
  offerTitle: string;
  offerSlug: string;
  offerThumbnailUrl: string | null;
  screenshotUrl: string;
  screenshotUrls: string[];
  note: string | null;
  status: SubmissionStatus;
  reviewNote: string | null;
  rewardAmount: number;
  reviewedAt: string | null;
  createdAt: string;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PageMeta;
}

/**
 * Fetch wrapper: attaches the Bearer token when a web session exists, and on a
 * 401 runs one single-flight refresh then retries once. Anonymous requests
 * pass straight through.
 */
const request = async <T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiSuccess<T>> => {
  const exec = async (token: string | null): Promise<Response> => {
    const controller = new AbortController();
    const forwardAbort = (): void => controller.abort(init.signal?.reason);
    init.signal?.addEventListener("abort", forwardAbort, { once: true });
    const timeout = window.setTimeout(
      () =>
        controller.abort(new DOMException("Request timed out", "TimeoutError")),
      init.body instanceof FormData ? 60_000 : 20_000,
    );
    try {
      return await fetch(`${API_BASE}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          ...(init.body && !(init.body instanceof FormData)
            ? { "Content-Type": "application/json" }
            : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    } catch (error) {
      if (controller.signal.aborted && !init.signal?.aborted) {
        throw new Error("The server took too long to respond. Please retry.");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
      init.signal?.removeEventListener("abort", forwardAbort);
    }
  };

  let response = await exec(getSession()?.accessToken ?? null);
  if (response.status === 401 && getSession()) {
    const token = await refreshAccessToken(); // clears the session on rejection
    if (token) response = await exec(token);
  }

  const body = (await response.json().catch(() => null)) as
    (ApiSuccess<T> & { error?: { message?: string } }) | null;
  if (!response.ok || !body?.success) {
    throw new Error(
      body?.error?.message ?? `Request failed (${response.status})`,
    );
  }
  return body;
};

interface CacheEntry<T> {
  expiresAt: number;
  promise: Promise<T>;
}

const publicCache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();
const CACHE_PREFIX = "rh-public-cache:";

const readSessionCache = <T>(
  key: string,
): { expiresAt: number; value: T } | null => {
  try {
    const raw = sessionStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { expiresAt?: number; value?: T };
    if (
      !parsed.expiresAt ||
      parsed.expiresAt <= Date.now() ||
      parsed.value === undefined
    ) {
      sessionStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }
    return { expiresAt: parsed.expiresAt, value: parsed.value };
  } catch {
    return null;
  }
};

const writeSessionCache = <T>(
  key: string,
  expiresAt: number,
  value: T,
): void => {
  try {
    sessionStorage.setItem(
      `${CACHE_PREFIX}${key}`,
      JSON.stringify({ expiresAt, value }),
    );
  } catch {
    /* Storage-disabled/private WebViews keep the memory cache only. */
  }
};

/** Small bounded stale-safe cache for public GETs; failed requests never stick. */
const cached = <T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
): Promise<T> => {
  const existing = publicCache.get(key) as CacheEntry<T> | undefined;
  if (existing && existing.expiresAt > Date.now()) return existing.promise;

  const stored = readSessionCache<T>(key);
  if (stored) {
    const promise = Promise.resolve(stored.value);
    publicCache.set(key, { expiresAt: stored.expiresAt, promise });
    return promise;
  }

  const expiresAt = Date.now() + ttlMs;
  const promise = load()
    .then((value) => {
      writeSessionCache(key, expiresAt, value);
      return value;
    })
    .catch((error: unknown) => {
      if (publicCache.get(key)?.promise === promise) publicCache.delete(key);
      throw error;
    });
  publicCache.set(key, { expiresAt, promise });
  if (publicCache.size > 100)
    publicCache.delete(publicCache.keys().next().value!);
  return promise;
};

/** Coalesce simultaneous focus/visibility refetches without caching user data. */
const singleFlight = <T>(key: string, load: () => Promise<T>): Promise<T> => {
  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const promise = load().finally(() => {
    if (inFlight.get(key) === promise) inFlight.delete(key);
  });
  inFlight.set(key, promise);
  return promise;
};

// ---- Roulette ----

export type RouletteBetType = "ODD" | "EVEN" | "RED" | "BLACK" | "NUMBER";

export interface RouletteStatus {
  walletBalance: number;
  freeGamesEnabled: boolean;
  freeGamesPerDay: number;
  freeGamesRemaining: number;
  freeGameStake: number;
  totalPlayedToday: number;
  paidPlayedToday: number;
  maxGamesPerDay: number;
  maxPaidGamesPerDay: number;
  dailyPayoutRemaining: number;
  cooldownRemainingMs: number;
  canPlay: boolean;
}

export interface RouletteConfig {
  enabled: boolean;
  maintenanceMode: boolean;
  title: string;
  subtitle: string;
  instructions: string;
  minBet: number;
  maxBet: number;
  defaultBet: number;
  betStep: number;
  animationDurationMs: number;
  resultModalMs: number;
  cooldownSeconds: number;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  probabilityMode: "FAIR" | "WEIGHTED";
  estimatedRtp: number;
  payouts: {
    number: number;
    odd: number;
    even: number;
    red: number;
    black: number;
  };
  betTypesEnabled: {
    number: boolean;
    odd: boolean;
    even: boolean;
    red: boolean;
    black: boolean;
  };
  wheelSequence: number[];
  redNumbers: number[];
  maxPayoutPerGame: number;
  status: RouletteStatus;
}

export interface RoulettePlayResult {
  roundId: string;
  betType: RouletteBetType;
  selectedNumber: number | null;
  betAmount: number;
  usedFreeGame: boolean;
  winningNumber: number;
  winningColour: "RED" | "BLACK" | "GREEN";
  parity: "ODD" | "EVEN" | "NONE";
  won: boolean;
  payoutMultiplier: number;
  payoutAmount: number;
  netResult: number;
  walletBalance: number;
  freeGamesRemaining: number;
  wheelIndex: number;
  animationDurationMs: number;
  fairness: {
    serverSeed: string;
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
  };
  status: RouletteStatus;
}

export interface RouletteHistoryItem {
  id: string;
  betType: RouletteBetType;
  selectedNumber: number | null;
  betAmount: number;
  usedFreeGame: boolean;
  winningNumber: number;
  winningColour: string;
  won: boolean;
  payoutAmount: number;
  netResult: number;
  createdAt: string;
}

export interface RoulettePlayInput {
  betType: RouletteBetType;
  selectedValue?: number | null;
  betAmount: number;
  useFreeGame: boolean;
  clientSeed?: string;
  idempotencyKey: string;
}

export type SortOption = "priority" | "newest" | "reward";

export const api = {
  categories: async (): Promise<OfferCategory[]> =>
    cached(
      "categories",
      5 * 60_000,
      async () =>
        (await request<OfferCategory[]>("/hot-offers/categories")).data,
    ),

  offers: async (params: {
    page: number;
    category?: string;
    search?: string;
    sort?: SortOption;
  }): Promise<{ items: OfferCard[]; meta: PageMeta }> => {
    const query = new URLSearchParams({
      page: String(params.page),
      limit: "12",
    });
    if (params.category) query.set("category", params.category);
    if (params.search) query.set("search", params.search);
    if (params.sort) query.set("sort", params.sort);
    // Signed-in responses are personalized (completed offers hidden/flagged),
    // so they must not share cache entries with the anonymous catalog.
    // ponytail: keyed by signed-in yes/no, not user id — sessionStorage is per
    // tab, so cross-user bleed needs a login switch inside one tab within TTL.
    return cached(
      `offers:${getSession() ? "u" : "a"}:${query}`,
      30_000,
      async () => {
        const result = await request<OfferCard[]>(
          `/hot-offers/offers?${query}`,
        );
        return { items: result.data, meta: result.meta! };
      },
    );
  },

  offer: async (slug: string): Promise<OfferDetails> =>
    cached(
      `offer:${getSession() ? "u" : "a"}:${slug}`,
      2 * 60_000,
      async () =>
        (await request<OfferDetails>(`/hot-offers/offers/${slug}`)).data,
    ),

  // ---- proof submissions (require the app-handed-over session) ----

  mySubmissionForOffer: async (offerId: string): Promise<Submission | null> =>
    singleFlight(
      `submission:${getSession()?.user.id ?? "anonymous"}:${offerId}`,
      async () =>
        (
          await request<Submission | null>(
            `/hot-offers/offers/${offerId}/my-submission`,
          )
        ).data,
    ),

  mySubmissions: async (
    page = 1,
  ): Promise<{ items: Submission[]; meta: PageMeta }> => {
    return singleFlight(
      `submissions:${getSession()?.user.id ?? "anonymous"}:${page}`,
      async () => {
        const result = await request<Submission[]>(
          `/hot-offers/submissions/mine?page=${page}&limit=20`,
        );
        return { items: result.data, meta: result.meta! };
      },
    );
  },

  submitProof: async (input: {
    offerId: string;
    screenshotUrls: string[]; // 1..5; backend also accepts legacy screenshotUrl
    note?: string;
  }): Promise<Submission> =>
    (
      await request<Submission>("/hot-offers/submissions", {
        method: "POST",
        body: JSON.stringify(input),
      })
    ).data,

  cancelSubmission: async (id: string): Promise<Submission> =>
    (
      await request<Submission>(`/hot-offers/submissions/${id}/cancel`, {
        method: "POST",
      })
    ).data,

  /** Multipart image upload (field name "file"); returns the hosted URL. */
  upload: async (file: File): Promise<{ url: string }> => {
    const form = new FormData();
    form.append("file", file);
    return (
      await request<{ url: string }>("/uploads?purpose=PROOF", {
        method: "POST",
        body: form,
      })
    ).data;
  },

  // ---- roulette (requires a signed-in web session) ----

  rouletteConfig: async (): Promise<RouletteConfig> =>
    (await request<RouletteConfig>("/game/roulette/config")).data,

  rouletteStatus: async (): Promise<RouletteStatus> =>
    (await request<RouletteStatus>("/game/roulette/status")).data,

  roulettePlay: async (input: RoulettePlayInput): Promise<RoulettePlayResult> =>
    (
      await request<RoulettePlayResult>("/game/roulette/play", {
        method: "POST",
        body: JSON.stringify(input),
      })
    ).data,

  rouletteHistory: async (
    page = 1,
  ): Promise<{ items: RouletteHistoryItem[]; meta: PageMeta }> => {
    const result = await request<RouletteHistoryItem[]>(
      `/game/roulette/history?page=${page}&limit=20`,
    );
    return { items: result.data, meta: result.meta! };
  },

  rouletteRecent: async (): Promise<
    { winningNumber: number; colour: string }[]
  > =>
    (
      await request<{ winningNumber: number; colour: string }[]>(
        "/game/roulette/recent-results",
      )
    ).data,

  /** Fire-and-forget analytics; never throws, never blocks or breaks the funnel. */
  track: (
    type: "VIEW" | "CLICK" | "DOWNLOAD",
    target: { offerId?: string; categoryId?: string },
  ): void => {
    try {
      const token = getSession()?.accessToken;
      void fetch(`${API_BASE}/hot-offers/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // optionalAuth on /events links the event to the user when signed in.
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type,
          source: "WEBSITE",
          sessionId: getSessionId(),
          ...target,
        }),
        keepalive: true, // survives the Play Store redirect
      }).catch(() => undefined);
    } catch {
      /* analytics must never break the page */
    }
  },
};
