import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type OfferDetails, type Submission } from "../lib/api";
import { CoinIcon, FlameIcon, StatusChip } from "../components/ui";
import { useAuth } from "../lib/auth";
import { isEmbedded, onInstallResult, openStore, parsePackageId } from "../lib/bridge";

/** Statuses that allow submitting (again). */
const RESUBMITTABLE = new Set(["REJECTED", "NEED_MORE_PROOF", "CANCELLED"]);

/** Download CTA states in embedded mode; non-embedded stays "idle" forever. */
type InstallState = "idle" | "waiting" | "installed" | "retry";

export const OfferDetailsPage = (): JSX.Element => {
  const { slug } = useParams<{ slug: string }>();
  const auth = useAuth();
  const embedded = isEmbedded();
  const [offer, setOffer] = useState<OfferDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [install, setInstall] = useState<InstallState>("idle");
  const proofRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug) return;
    setOffer(null);
    setError(null);
    setSubmission(null);
    setInstall("idle");
    api
      .offer(slug)
      .then((data) => {
        setOffer(data);
        document.title = `${data.title} — RewardHub Offers`;
        api.track("VIEW", { offerId: data.id });
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Offer not found"),
      );
  }, [slug]);

  // My submission status — only when the app handed a session over. Failed
  // refetches keep the last known state so the sticky bar never flickers back
  // to Download on a flaky connection.
  const refetchSubmission = useCallback((): void => {
    if (!offer || !auth) return;
    api.mySubmissionForOffer(offer.id).then(setSubmission).catch(() => undefined);
  }, [offer, auth]);

  // Fetch on mount (also covers returning from /submit/:slug — route change
  // remounts) and on focus/visibility, which embedded WebView resumes fire.
  useEffect(() => {
    refetchSubmission();
    const onFocus = (): void => refetchSubmission();
    const onVisibility = (): void => {
      if (!document.hidden) refetchSubmission();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refetchSubmission]);

  // Poll only while a review is pending so approval flips the bar unprompted.
  useEffect(() => {
    if (submission?.status !== "PENDING") return;
    const timer = setInterval(refetchSubmission, 20_000);
    return () => clearInterval(timer);
  }, [submission?.status, refetchSubmission]);

  // Embedded: the app pushes the install result via window.__rhInstallResult.
  useEffect(() => {
    if (!embedded || !offer) return;
    return onInstallResult((result) => {
      if (result.offerId !== offer.id) return;
      refetchSubmission();
      setInstall(result.installed ? "installed" : "retry");
      if (result.installed) {
        // Reveal the proof uploader once the card is on screen.
        setTimeout(
          () => proofRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
          350,
        );
      }
    });
  }, [embedded, offer, refetchSubmission]);

  const download = (): void => {
    if (!offer) return;
    api.track("DOWNLOAD", { offerId: offer.id });
    const packageId = parsePackageId(offer.playStoreUrl);
    if (embedded && packageId) {
      // openStore is false when the bridge isn't injected — fall through to the redirect.
      if (openStore({ offerId: offer.id, slug: offer.slug, packageId, url: offer.playStoreUrl })) {
        setInstall("waiting");
        return;
      }
    }
    // keepalive on the tracking request lets it complete through the redirect.
    window.location.href = offer.playStoreUrl;
  };

  if (error) {
    return (
      <div className="mx-auto max-w-sm px-4 py-24 text-center">
        <p className="font-display text-lg font-bold">This offer has moved on</p>
        <p className="mt-1 text-sm text-ink-soft">{error}</p>
        <Link to="/" className="btn-accent mt-6 inline-flex px-6 py-2.5 text-sm">
          Browse live offers
        </Link>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="mx-auto w-full max-w-lg space-y-4 px-4 py-6">
        <div className="skeleton h-48" />
        <div className="skeleton h-24" />
        <div className="skeleton h-40" />
      </div>
    );
  }

  const canSubmit = !submission || RESUBMITTABLE.has(submission.status);

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-32 pt-4">
      <Link to="/" className="text-sm font-semibold text-ink-soft">
        ← All offers
      </Link>

      {/* Hero art */}
      <div className="glass-card relative mt-3 h-44 overflow-hidden animate-float-up">
        {offer.bannerUrl ?? offer.thumbnailUrl ? (
          <img
            src={offer.bannerUrl ?? offer.thumbnailUrl ?? ""}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-surface-alt text-accent/60">
            <FlameIcon size={44} />
          </div>
        )}
      </div>

      {/* Identity + reward */}
      <div className="glass-card relative z-10 -mt-7 mx-3 p-4 animate-float-up">
        <div className="flex items-center gap-3">
          {offer.logoUrl && (
            <img
              src={offer.logoUrl}
              alt=""
              className="h-12 w-12 rounded-2xl border border-hairline object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-lg font-bold leading-snug">{offer.title}</h1>
            <p className="truncate text-xs text-ink-soft">
              {offer.appName ?? offer.category.title}
              {offer.rating != null && <span className="ml-2">★ {offer.rating.toFixed(1)}</span>}
            </p>
          </div>
        </div>
        {/* Brand chip — products carry a brand identity (isProduct/brandLogoUrl) */}
        {offer.brandLogoUrl && (
          <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-hairline bg-surface-alt/80 py-1.5 pl-1.5 pr-3 backdrop-blur">
            {/* plain <img> keeps animated GIF logos playing */}
            <img
              src={offer.brandLogoUrl}
              alt=""
              className="h-6 w-6 shrink-0 rounded-full border border-hairline bg-surface object-contain p-0.5"
            />
            <span className="truncate text-xs font-semibold">
              {offer.appName ?? offer.title}
            </span>
          </div>
        )}
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-hairline bg-surface-alt px-4 py-3">
          <CoinIcon size={26} />
          <div className="min-w-0 flex-1">
            <p className="font-numbers text-xl font-bold text-accent">
              +{offer.rewardLabel ?? offer.rewardAmount}
            </p>
            <p className="text-xs text-ink-soft">
              Reward for completing this offer
              {offer.estimatedTime ? ` · ~${offer.estimatedTime}` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Proof status / upload CTA */}
      {auth ? (
        <div ref={proofRef} className="glass-card mt-4 p-4 animate-float-up">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-sm font-bold">Proof of completion</p>
            {submission && <StatusChip status={submission.status} />}
          </div>
          {submission?.reviewNote && (
            <p className="mt-2 rounded-xl border border-hairline bg-surface-alt p-3 text-xs leading-relaxed text-ink-soft">
              Reviewer: {submission.reviewNote}
            </p>
          )}
          {canSubmit ? (
            <Link to={`/submit/${offer.slug}`} className="btn-accent mt-3 w-full py-3 text-sm">
              {submission ? "Upload new proof" : "Upload proof"}
            </Link>
          ) : (
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-ink-soft">
                {submission?.status === "PENDING"
                  ? "We're reviewing your screenshot — coins drop on approval."
                  : "You've been rewarded for this offer."}
              </p>
              <Link to="/submissions" className="shrink-0 text-xs font-semibold text-accent">
                My proofs →
              </Link>
            </div>
          )}
        </div>
      ) : embedded ? null : (
        // "Open in app" prompt — pointless inside the app's own webview.
        <div className="glass-card mt-4 p-4 text-xs leading-relaxed text-ink-soft animate-float-up">
          Complete the task, then open this page from the RewardHub app to upload proof and
          claim the reward.
        </div>
      )}

      {/* Content */}
      <section className="mt-6 space-y-5">
        <div>
          <h2 className="font-display text-sm font-bold text-accent">About this offer</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
            {offer.description}
          </p>
        </div>

        {offer.instructions.length > 0 && (
          <div className="glass-card p-4">
            <h2 className="font-display text-sm font-bold">How to complete it</h2>
            <ol className="mt-3 space-y-3">
              {offer.instructions.map((step, index) => (
                <li key={step} className="flex gap-3 text-sm text-ink-soft">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-deep font-numbers text-xs font-bold text-onaccent">
                    {index + 1}
                  </span>
                  <span className="pt-0.5 leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {offer.features.length > 0 && (
          <div className="glass-card p-4">
            <h2 className="font-display text-sm font-bold">Why you'll love it</h2>
            <ul className="mt-3 space-y-2">
              {offer.features.map((feature) => (
                <li key={feature} className="flex gap-2 text-sm leading-relaxed text-ink-soft">
                  <span className="text-accent">✓</span> {feature}
                </li>
              ))}
            </ul>
          </div>
        )}

        {offer.requirements.length > 0 && (
          <div className="glass-card p-4">
            <h2 className="font-display text-sm font-bold">Requirements</h2>
            <ul className="mt-3 space-y-2">
              {offer.requirements.map((requirement) => (
                <li key={requirement} className="flex gap-2 text-sm leading-relaxed text-ink-muted">
                  <span className="text-ink-soft">•</span> {requirement}
                </li>
              ))}
            </ul>
          </div>
        )}

        {offer.warning && (
          <div className="rounded-card border border-danger/40 bg-danger/10 p-4 text-sm leading-relaxed text-danger">
            {offer.warning}
          </div>
        )}

        {offer.terms && (
          <details className="glass-card p-4 text-sm text-ink-soft">
            <summary className="cursor-pointer font-display font-bold text-ink">
              Terms & conditions
            </summary>
            <p className="mt-2 whitespace-pre-line leading-relaxed">{offer.terms}</p>
          </details>
        )}
      </section>

      {/* Sticky CTA — submission status outranks local install state, so a
          submitted proof never resurfaces the Download button. CANCELLED falls
          through to the normal install flow (the user chose to start over). */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-bgbottom/90 p-4 backdrop-blur">
        <div className="mx-auto max-w-lg">
          {submission?.status === "PENDING" ? (
            <div className="glass-card flex items-center justify-between gap-3 p-4">
              <p className="text-sm leading-snug text-ink-soft">
                Proof under review — coins drop on approval
              </p>
              <Link to="/submissions" className="shrink-0 text-xs font-semibold text-accent">
                View my proofs →
              </Link>
            </div>
          ) : submission?.status === "APPROVED" ? (
            <div className="glass-card flex items-center justify-center gap-2 p-4">
              <span aria-hidden className="font-bold text-accent">
                ✓
              </span>
              <p className="text-sm font-semibold">Reward earned</p>
            </div>
          ) : submission?.status === "REJECTED" || submission?.status === "NEED_MORE_PROOF" ? (
            <>
              <Link
                to={`/submit/${offer.slug}`}
                className="btn-accent block w-full py-3.5 text-center text-sm tracking-wide"
              >
                UPDATE YOUR PROOF
              </Link>
              {/* Reinstalling only matters for app offers, not products. */}
              {!offer.isProduct && (
                <button
                  onClick={download}
                  className="mx-auto mt-1.5 block text-[11px] font-semibold text-ink-muted underline"
                >
                  Need the app again? Reinstall from Google Play
                </button>
              )}
            </>
          ) : (
            <>
              {install === "waiting" ? (
                <div className="btn-accent w-full animate-pulse py-3.5 text-sm tracking-wide">
                  <span
                    aria-hidden
                    className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-onaccent/30 border-t-onaccent"
                  />
                  WAITING FOR INSTALL...
                </div>
              ) : install === "installed" ? (
                // Direct action: go to the uploader. Scrolling to proofRef broke
                // when the proof card wasn't rendered (no session -> null ref).
                <Link
                  to={`/submit/${offer.slug}`}
                  className="btn-accent block w-full py-3.5 text-center text-sm tracking-wide"
                >
                  INSTALLED — UPLOAD YOUR PROOF
                </Link>
              ) : (
                <button onClick={download} className="btn-accent w-full py-3.5 text-sm tracking-wide">
                  DOWNLOAD ON GOOGLE PLAY
                </button>
              )}
              <p className="mt-1.5 text-center text-[11px] text-ink-muted">
                {install === "waiting"
                  ? "Finish the install in the Play Store, then come back here"
                  : install === "installed"
                    ? "Take a screenshot of the completed task as your proof"
                    : install === "retry"
                      ? "We couldn't spot the app yet — install it, then tap Download again"
                      : "Opens the official Play Store listing"}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
