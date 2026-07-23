import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { SubmissionStatus } from "../lib/api";
import { lastExchangeError } from "../lib/auth";
import { isEmbedded, requestSession } from "../lib/bridge";
import { signInWithGoogle } from "../lib/firebase";

/** Tiny coin glyph — the ONLY place coin gold appears (app rule). */
export const CoinIcon = ({ size = 16 }: { size?: number }): JSX.Element => (
  <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden className="shrink-0">
    <circle cx="8" cy="8" r="7" fill="#EAB308" />
    <circle cx="8" cy="8" r="4.5" fill="none" stroke="#A16207" strokeWidth="1.5" />
  </svg>
);

export const FlameIcon = ({ size = 20, className = "" }: { size?: number; className?: string }): JSX.Element => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
    <path d="M13.5 0.67s0.74 2.65 0.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l0.03-0.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5 0.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-0.36 3.6-1.21 4.62-2.58 0.39 1.29 0.59 2.65 0.59 4.04 0 2.65-2.15 4.8-4.8 4.8z" />
  </svg>
);

const GoogleGlyph = ({ size = 16 }: { size?: number }): JSX.Element => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden className="shrink-0">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.5l-6.6-5.6C29.6 34.6 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C41.9 36.1 44 30.6 44 24c0-1.3-.1-2.3-.4-3.5z" />
  </svg>
);

/** Standalone-browser Google sign-in button. Shows busy + error state inline. */
export const GoogleSignInButton = ({
  className = "btn-accent px-6 py-2.5 text-sm",
  label = "Continue with Google",
}: {
  className?: string;
  label?: string;
}): JSX.Element => {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const run = async (): Promise<void> => {
    setBusy(true);
    setFailed(false);
    try {
      await signInWithGoogle(); // signed-in re-render unmounts the gate; cancel is a no-op
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void run()}
      disabled={busy}
      className={`gap-2 ${failed ? "text-danger" : ""} ${className}`}
    >
      <GoogleGlyph />
      {busy ? "Signing in…" : failed ? "Try again" : label}
    </button>
  );
};

const STATUS: Record<SubmissionStatus, { label: string; text: string; dot: string }> = {
  PENDING: { label: "Pending review", text: "text-coin", dot: "bg-coin" },
  APPROVED: { label: "Approved", text: "text-accent", dot: "bg-accent" },
  REJECTED: { label: "Rejected", text: "text-danger", dot: "bg-danger" },
  NEED_MORE_PROOF: { label: "More proof needed", text: "text-coin", dot: "bg-coin" },
  CANCELLED: { label: "Cancelled", text: "text-ink-muted", dot: "bg-ink-muted" },
};

export const StatusChip = ({ status }: { status: SubmissionStatus }): JSX.Element => {
  const s = STATUS[status];
  return (
    <span className={`chip border border-hairline bg-surface-alt ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
};

/** Shown when a signed-out visitor hits an auth-only page. */
export const AppPrompt = (): JSX.Element => {
  // Embedded: already inside the app — ask it to re-run the code handover and
  // keep nudging until the session lands (the page re-renders signed-in via
  // useAuth the moment the exchange completes, unmounting this gate).
  const embedded = isEmbedded();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!embedded) return;
    requestSession();
    const timer = setInterval(() => {
      requestSession();
      setTick((t) => t + 1); // re-render so the diagnostic line updates
    }, 3000);
    return () => clearInterval(timer);
  }, [embedded]);

  return (
    <div className="glass-card mx-auto mt-10 max-w-sm p-8 text-center animate-float-up">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-hairline bg-surface-alt text-accent">
        <FlameIcon />
      </span>
      <p className="mt-4 font-display text-lg font-bold">
        {embedded ? "Restoring your session…" : "Sign in to continue"}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        {embedded
          ? "One moment — signing you back in. If this doesn't finish, go back and reopen this screen."
          : "Proof uploads and your submission history need your account. Sign in with Google to pick up right where the app leaves off."}
      </p>
      {embedded && (
        <p className="mt-3 text-xs text-ink-soft/70">
          {lastExchangeError
            ? `Sign-in error: ${lastExchangeError} (attempt ${tick + 1})`
            : `Waiting for the app… (attempt ${tick + 1})`}
        </p>
      )}
      <div className="mt-6 flex flex-col items-center gap-3">
        {!embedded && <GoogleSignInButton className="btn-accent px-6 py-2.5 text-sm" />}
        <Link to="/rewards" className="btn-ghost px-6 py-2.5 text-sm">
          Browse offers
        </Link>
      </div>
    </div>
  );
};
