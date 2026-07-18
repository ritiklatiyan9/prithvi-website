import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type PageMeta, type Submission } from "../lib/api";
import { AppPrompt, CoinIcon, StatusChip } from "../components/ui";
import { useAuth } from "../lib/auth";

const Row = ({
  submission,
  onCancelled,
}: {
  submission: Submission;
  onCancelled: (updated: Submission) => void;
}): JSX.Element => {
  const [cancelling, setCancelling] = useState(false);

  const cancel = async (): Promise<void> => {
    if (cancelling || !window.confirm("Cancel this pending submission?")) return;
    setCancelling(true);
    try {
      onCancelled(await api.cancelSubmission(submission.id));
    } catch {
      setCancelling(false);
    }
  };

  return (
    <div className="glass-card p-3.5 animate-float-up">
      <div className="flex gap-3">
        <img
          src={submission.offerThumbnailUrl ?? submission.screenshotUrl}
          alt=""
          loading="lazy"
          className="h-14 w-14 shrink-0 rounded-2xl border border-hairline bg-surface-alt object-cover"
        />
        <div className="min-w-0 flex-1">
          <Link
            to={`/offers/${submission.offerSlug}`}
            className="line-clamp-1 font-display text-sm font-bold"
          >
            {submission.offerTitle}
          </Link>
          <div className="mt-1 flex items-center gap-1.5">
            <CoinIcon size={13} />
            <span className="font-numbers text-xs font-bold text-accent">
              +{submission.rewardAmount}
            </span>
            <span className="text-[11px] text-ink-muted">
              · {new Date(submission.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="mt-2">
            <StatusChip status={submission.status} />
          </div>
        </div>
        {submission.status === "PENDING" && (
          <button
            onClick={() => void cancel()}
            disabled={cancelling}
            className="btn-ghost h-8 shrink-0 self-start px-3 text-xs text-danger"
          >
            {cancelling ? "…" : "Cancel"}
          </button>
        )}
      </div>
      {submission.reviewNote &&
        (submission.status === "REJECTED" || submission.status === "NEED_MORE_PROOF") && (
          <p className="mt-2.5 rounded-xl border border-hairline bg-surface-alt p-3 text-xs leading-relaxed text-ink-soft">
            Reviewer: {submission.reviewNote}
          </p>
        )}
    </div>
  );
};

export const SubmissionsPage = (): JSX.Element => {
  const auth = useAuth();
  const [items, setItems] = useState<Submission[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = (page: number): void => {
    setLoading(true);
    setError(null);
    api
      .mySubmissions(page)
      .then((result) => {
        setItems((current) => (page === 1 ? result.items : [...current, ...result.items]));
        setMeta(result.meta);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Could not load your submissions"),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    document.title = "My proofs — Money Marathon";
    if (auth) load(1);
  }, [auth]);

  if (!auth) return <AppPrompt />;

  const replace = (updated: Submission): void =>
    setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-20 pt-4">
      <Link to="/" className="text-sm font-semibold text-ink-soft">
        ← All offers
      </Link>
      <h1 className="mt-3 font-display text-2xl font-bold">My proofs</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Every screenshot you've submitted and where it stands.
      </p>

      <div className="mt-5 space-y-3">
        {error && items.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="font-display font-bold">Something went wrong</p>
            <p className="mt-1 text-sm text-ink-soft">{error}</p>
            <button onClick={() => load(1)} className="btn-accent mt-5 px-6 py-2.5 text-sm">
              Try again
            </button>
          </div>
        ) : items.length === 0 && !loading ? (
          <div className="glass-card p-8 text-center">
            <p className="font-display font-bold">No proofs yet</p>
            <p className="mt-1 text-sm text-ink-soft">
              Complete an offer and upload a screenshot to start earning.
            </p>
            <Link to="/" className="btn-accent mt-5 inline-flex px-6 py-2.5 text-sm">
              Browse offers
            </Link>
          </div>
        ) : (
          items.map((submission) => (
            <Row key={submission.id} submission={submission} onCancelled={replace} />
          ))
        )}
        {loading && <div className="skeleton h-24" />}
      </div>

      {meta && meta.page < meta.totalPages && !loading && (
        <button onClick={() => load(meta.page + 1)} className="btn-ghost mt-5 w-full py-3 text-sm">
          Load more
        </button>
      )}
    </div>
  );
};
