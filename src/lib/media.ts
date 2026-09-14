import { API_BASE } from "./auth";

/** Resolve legacy localhost upload URLs against the API serving this website. */
export const mediaUrl = (value: string | null | undefined): string | null => {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    if (!url.pathname.includes("/uploads/")) return value;
    const apiOrigin = new URL(API_BASE, window.location.origin).origin;
    return `${apiOrigin}${url.pathname}${url.search}`;
  } catch {
    return value;
  }
};
