/**
 * WebView bridge to the RewardHub app (contract: RewardHubBridge / __rhInstallResult).
 * The app loads the site with &embedded=1 and injects window.RewardHubBridge.
 */

export interface InstallResult {
  offerId: string;
  packageId: string;
  installed: boolean;
}

declare global {
  interface Window {
    /** Injected by the app's WebView JavaScript channel. */
    RewardHubBridge?: { postMessage(message: string): void };
    /** Set by the web; the app invokes it via runJavaScript. */
    __rhInstallResult?: (result: InstallResult) => void;
  }
}

const KEY = "rh-embedded";

/** Embedded when the app injected the bridge, or ?embedded=1 (persisted for the tab session). */
export const isEmbedded = (): boolean => {
  if (window.RewardHubBridge) return true;
  try {
    if (new URLSearchParams(window.location.search).get("embedded") === "1") {
      sessionStorage.setItem(KEY, "1");
      return true;
    }
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

/** Same ?id= parse the app uses on the Play Store URL. */
export const parsePackageId = (playStoreUrl: string): string | null => {
  try {
    return new URL(playStoreUrl).searchParams.get("id");
  } catch {
    return null;
  }
};

<<<<<<< HEAD
/** Ask the app to re-run the session handover (mint + inject a fresh code).
 *  Fired by the auth gate when an embedded visitor lands without a session —
 *  closes the gap where the app's page-load handshake timed out and SPA
 *  navigation never triggers another one. */
export const requestSession = (): boolean => {
  if (!window.RewardHubBridge) return false;
  window.RewardHubBridge.postMessage(JSON.stringify({ type: "needSession" }));
  return true;
};

=======
>>>>>>> origin/main
/** Ask the app to open the Play Store natively. Returns false when no bridge is present. */
export const openStore = (msg: {
  offerId: string;
  slug: string;
  packageId: string;
  url: string;
}): boolean => {
  if (!window.RewardHubBridge) return false;
  window.RewardHubBridge.postMessage(JSON.stringify({ type: "openStore", ...msg }));
  return true;
};

/** Wire the app's install-result callback; returns an unsubscribe. Single subscriber (the offer page). */
export const onInstallResult = (cb: (result: InstallResult) => void): (() => void) => {
  window.__rhInstallResult = cb;
  return () => {
    if (window.__rhInstallResult === cb) window.__rhInstallResult = undefined;
  };
};
