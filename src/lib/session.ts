const KEY = "rh-offers-session";

/**
 * UUID that works in ANY context. `crypto.randomUUID()` only exists in a
 * secure context (HTTPS / localhost) — on a phone opening the site over a LAN
 * IP on plain HTTP it's undefined, so we fall back to `getRandomValues`
 * (available on HTTP too) and finally to Math.random for an anonymous id.
 */
const uuid = (): string => {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
      const b = crypto.getRandomValues(new Uint8Array(16));
      b[6] = (b[6] & 0x0f) | 0x40; // version 4
      b[8] = (b[8] & 0x3f) | 0x80; // variant
      const hex = Array.from(b, (x) => x.toString(16).padStart(2, "0"));
      return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
        .slice(6, 8)
        .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
    }
  } catch {
    /* fall through to the Math.random id */
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}${Math.random()
    .toString(16)
    .slice(2)}`;
};

/** Anonymous visitor id, stable per browser — powers unique-user analytics. */
export const getSessionId = (): string => {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = `web-${uuid()}`;
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // localStorage can throw (private mode / blocked storage) — degrade to an
    // ephemeral id rather than break the page.
    return `web-${uuid()}`;
  }
};
