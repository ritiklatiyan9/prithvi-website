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
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "NEED_MORE_PROOF"
  | "CANCELLED";

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
const request = async <T>(path: string, init: RequestInit = {}): Promise<ApiSuccess<T>> => {
  const exec = (token: string | null): Promise<Response> =>
    fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...(init.body && !(init.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  let response = await exec(getSession()?.accessToken ?? null);
  if (response.status === 401 && getSession()) {
    const token = await refreshAccessToken(); // clears the session on rejection
    if (token) response = await exec(token);
  }

  const body = (await response.json().catch(() => null)) as
    | (ApiSuccess<T> & { error?: { message?: string } })
    | null;
  if (!response.ok || !body?.success) {
    throw new Error(body?.error?.message ?? `Request failed (${response.status})`);
  }
  return body;
};

export type SortOption = "priority" | "newest" | "reward";

export const api = {
  categories: async (): Promise<OfferCategory[]> =>
    (await request<OfferCategory[]>("/hot-offers/categories")).data,

  offers: async (params: {
    page: number;
    category?: string;
    search?: string;
    sort?: SortOption;
  }): Promise<{ items: OfferCard[]; meta: PageMeta }> => {
    const query = new URLSearchParams({ page: String(params.page), limit: "12" });
    if (params.category) query.set("category", params.category);
    if (params.search) query.set("search", params.search);
    if (params.sort) query.set("sort", params.sort);
    const result = await request<OfferCard[]>(`/hot-offers/offers?${query}`);
    return { items: result.data, meta: result.meta! };
  },

  offer: async (slug: string): Promise<OfferDetails> =>
    (await request<OfferDetails>(`/hot-offers/offers/${slug}`)).data,

  // ---- proof submissions (require the app-handed-over session) ----

  mySubmissionForOffer: async (offerId: string): Promise<Submission | null> =>
    (await request<Submission | null>(`/hot-offers/offers/${offerId}/my-submission`)).data,

  mySubmissions: async (page = 1): Promise<{ items: Submission[]; meta: PageMeta }> => {
    const result = await request<Submission[]>(
      `/hot-offers/submissions/mine?page=${page}&limit=20`,
    );
    return { items: result.data, meta: result.meta! };
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
    (await request<Submission>(`/hot-offers/submissions/${id}/cancel`, { method: "POST" }))
      .data,

  /** Multipart image upload (field name "file"); returns the hosted URL. */
  upload: async (file: File): Promise<{ url: string }> => {
    const form = new FormData();
    form.append("file", file);
    return (await request<{ url: string }>("/uploads", { method: "POST", body: form })).data;
  },

  /** Fire-and-forget analytics; never throws, never blocks or breaks the funnel. */
  track: (type: "VIEW" | "CLICK" | "DOWNLOAD", target: { offerId?: string; categoryId?: string }): void => {
    try {
      const token = getSession()?.accessToken;
      void fetch(`${API_BASE}/hot-offers/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // optionalAuth on /events links the event to the user when signed in.
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ type, source: "WEBSITE", sessionId: getSessionId(), ...target }),
        keepalive: true, // survives the Play Store redirect
      }).catch(() => undefined);
    } catch {
      /* analytics must never break the page */
    }
  },
};
