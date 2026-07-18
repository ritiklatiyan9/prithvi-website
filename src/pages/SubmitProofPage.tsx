import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, type OfferDetails } from "../lib/api";
import { AppPrompt, CoinIcon } from "../components/ui";
import { useAuth } from "../lib/auth";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif";
const ACCEPTED_TYPES = new Set(ACCEPT.split(","));
const MAX_FILES = 5;

/** A picked screenshot and its object-URL preview (plays animated GIFs natively). */
interface Shot {
  file: File;
  url: string;
}

export const SubmitProofPage = (): JSX.Element => {
  const { slug } = useParams<{ slug: string }>();
  const auth = useAuth();
  const navigate = useNavigate();

  const [offer, setOffer] = useState<OfferDetails | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  // Index of the shot currently uploading (sequential); null when idle.
  const [uploading, setUploading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const shotsRef = useRef<Shot[]>([]);
  shotsRef.current = shots;

  useEffect(() => {
    if (!slug) return;
    document.title = "Upload proof — Money Marathon";
    api.offer(slug).then(setOffer).catch(() => setError("Offer not found"));
  }, [slug]);

  // Revoke every outstanding object URL on unmount.
  useEffect(() => () => shotsRef.current.forEach((shot) => URL.revokeObjectURL(shot.url)), []);

  if (!auth) return <AppPrompt />;

  const pick = (picked: FileList | File[] | null | undefined): void => {
    const incoming = Array.from(picked ?? []);
    if (incoming.length === 0) return;
    if (incoming.some((file) => !ACCEPTED_TYPES.has(file.type))) {
      setError("Use PNG, JPEG, WebP or GIF screenshots.");
      return;
    }
    const room = MAX_FILES - shots.length;
    if (incoming.length > room) {
      setError(`You can attach up to ${MAX_FILES} screenshots.`);
      if (room === 0) return;
    } else {
      setError(null);
    }
    setShots((current) => [
      ...current,
      ...incoming.slice(0, room).map((file) => ({ file, url: URL.createObjectURL(file) })),
    ]);
  };

  const remove = (index: number): void => {
    URL.revokeObjectURL(shots[index].url);
    setShots((current) => current.filter((_, i) => i !== index));
    setError(null);
  };

  const submit = async (): Promise<void> => {
    if (shots.length === 0 || !offer || busy) return;
    setBusy(true);
    setError(null);
    try {
      // ponytail: sequential uploads — clear per-file state, no concurrency bugs
      const screenshotUrls: string[] = [];
      for (let index = 0; index < shots.length; index += 1) {
        setUploading(index);
        const { url } = await api.upload(shots[index].file);
        screenshotUrls.push(url);
      }
      setUploading(null);
      await api.submitProof({
        offerId: offer.id,
        screenshotUrls,
        note: note.trim() || undefined,
      });
      navigate("/submissions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your proof");
      setBusy(false);
      setUploading(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-20 pt-4">
      <Link to={offer ? `/offers/${offer.slug}` : "/"} className="text-sm font-semibold text-ink-soft">
        ← Back to offer
      </Link>

      <h1 className="mt-3 font-display text-2xl font-bold">Upload proof</h1>
      {offer ? (
        <div className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
          <span className="line-clamp-1">{offer.title}</span>
          <span className="flex shrink-0 items-center gap-1">
            <CoinIcon size={14} />
            <span className="font-numbers text-sm font-bold text-accent">
              +{offer.rewardLabel ?? offer.rewardAmount}
            </span>
          </span>
        </div>
      ) : !error ? (
        <div className="skeleton mt-2 h-5 w-2/3" />
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => {
          pick(event.target.files);
          event.target.value = ""; // re-picking the same file must fire onChange again
        }}
      />

      {shots.length === 0 ? (
        /* Empty state: the original full-width drop / tap zone */
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            pick(event.dataTransfer.files);
          }}
          className={`mt-5 cursor-pointer overflow-hidden rounded-card border-2 border-dashed p-4 text-center transition-colors ${
            dragging ? "border-accent bg-accent/10" : "border-accent/40 bg-surface/60"
          }`}
        >
          <div className="py-8">
            <svg
              width="34"
              height="34"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto text-accent"
              aria-hidden
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            <p className="mt-3 font-display text-sm font-bold">Tap or drop your screenshots</p>
            <p className="mt-1 text-xs text-ink-muted">PNG, JPEG, WebP or GIF · up to {MAX_FILES}</p>
          </div>
        </div>
      ) : (
        /* Thumbnail grid: previews with remove buttons + an add tile */
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            pick(event.dataTransfer.files);
          }}
          className={`mt-5 grid grid-cols-3 gap-3 rounded-card border-2 border-dashed p-3 transition-colors ${
            dragging ? "border-accent bg-accent/10" : "border-accent/40 bg-surface/60"
          }`}
        >
          {shots.map((shot, index) => (
            <div
              key={shot.url}
              className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-hairline bg-surface"
            >
              <img
                src={shot.url}
                alt={`Proof screenshot ${index + 1}`}
                className="h-full w-full object-contain"
              />
              {uploading !== null && (
                <div
                  className={`absolute inset-0 flex items-center justify-center bg-bgbottom/60 ${
                    index > uploading ? "opacity-40" : ""
                  }`}
                >
                  {index < uploading ? (
                    <span className="text-lg font-bold text-accent" aria-label="Uploaded">
                      ✓
                    </span>
                  ) : index === uploading ? (
                    <span
                      aria-label="Uploading"
                      className="h-5 w-5 animate-spin rounded-full border-2 border-accent/30 border-t-accent"
                    />
                  ) : null}
                </div>
              )}
              {!busy && (
                <button
                  onClick={() => remove(index)}
                  aria-label={`Remove screenshot ${index + 1}`}
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-hairline bg-bgbottom/80 text-xs text-ink backdrop-blur"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {shots.length < MAX_FILES && !busy && (
            <button
              onClick={() => inputRef.current?.click()}
              className="flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-accent/40 text-accent"
              aria-label="Add screenshot"
            >
              <span className="text-2xl leading-none">+</span>
              <span className="text-[11px] text-ink-muted">
                {shots.length}/{MAX_FILES}
              </span>
            </button>
          )}
        </div>
      )}

      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value.slice(0, 1000))}
        placeholder="Add a note for the reviewer (optional)"
        rows={3}
        className="field mt-4 resize-none"
      />

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <button
        onClick={() => void submit()}
        disabled={shots.length === 0 || !offer || busy}
        className="btn-accent mt-5 w-full py-3.5 text-sm tracking-wide"
      >
        {uploading !== null
          ? `UPLOADING ${uploading + 1}/${shots.length}…`
          : busy
            ? "SUBMITTING…"
            : "SUBMIT PROOF"}
      </button>
      <p className="mt-2 text-center text-[11px] text-ink-muted">
        Coins are credited after a quick manual review.
      </p>
    </div>
  );
};
