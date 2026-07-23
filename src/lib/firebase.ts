import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { API_BASE, clearSession, setSession, type AuthSession } from "./auth";

// ponytail: public Firebase web config reused verbatim from prithvi-admin
// (project rewardhub-99c60). Not a secret — it ships in the client bundle
// regardless and never changes, so no env indirection. The backend's
// POST /auth/firebase only accepts tokens minted for this exact project.
const firebaseApp = initializeApp({
  apiKey: "AIzaSyAOTxCaAZdELfFBnV0zK7g4FrrYyksL9so",
  authDomain: "rewardhub-99c60.firebaseapp.com",
  projectId: "rewardhub-99c60",
  appId: "1:465456699734:web:77b7b036bcf4d98edd9ef7",
});

const auth = getAuth(firebaseApp);

/**
 * Standalone-browser sign-in: Google popup → Firebase ID token → exchange it
 * with the backend for our JWT pair → feed it into the existing auth store.
 * Resolves with `false` when the user simply closes/cancels the popup (no
 * error), throws a friendly message on a real failure.
 */
export const signInWithGoogle = async (): Promise<boolean> => {
  let idToken: string;
  try {
    const credential = await signInWithPopup(auth, new GoogleAuthProvider());
    idToken = await credential.user.getIdToken();
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
      return false; // user backed out — not an error
    }
    throw new Error("Couldn't reach Google. Please try again.");
  }

  const response = await fetch(`${API_BASE}/auth/firebase`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const body = (await response.json().catch(() => null)) as
    | { success?: boolean; data?: AuthSession }
    | null;
  if (!response.ok || !body?.success || !body.data) {
    throw new Error("Sign-in couldn't be completed. Please try again.");
  }
  setSession(body.data);
  return true;
};

/** Clear our session and best-effort sign the Firebase user out. */
export const signOutWeb = (): void => {
  clearSession();
  void signOut(auth).catch(() => undefined);
};
