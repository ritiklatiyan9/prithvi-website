import { useEffect } from "react";
import { Link } from "react-router-dom";
import type { SubmissionStatus } from "../lib/api";
import { isEmbedded, requestSession } from "../lib/bridge";

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

  useEffect(() => {
    if (!embedded) return;
    requestSession();
    const timer = setInterval(requestSession, 3000);
    return () => clearInterval(timer);
  }, [embedded]);

  return (
    <div className="glass-card mx-auto mt-10 max-w-sm p-8 text-center animate-float-up">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-hairline bg-surface-alt text-accent">
        <FlameIcon />
      </span>
      <p className="mt-4 font-display text-lg font-bold">
        {embedded ? "Restoring your session…" : "Open this from the RewardHub app"}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        {embedded
          ? "One moment — signing you back in. If this doesn't finish, go back and reopen this screen."
          : "Proof uploads and your submission history need your account. Tap the offers link inside the RewardHub app — your session carries over automatically."}
      </p>
      <Link to="/" className="btn-ghost mt-6 px-6 py-2.5 text-sm">
        Browse offers
      </Link>
    </div>
  );
};
