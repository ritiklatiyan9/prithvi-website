import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { isEmbedded } from "../lib/bridge";

/**
 * Free HTML5 games from GameMonetize. Their SDK inside each game shows the ads
 * (between levels / "watch to continue"); revenue share is paid for traffic on
 * the domain registered in the GameMonetize dashboard (moneymarathon.in).
 * No coins for playing — paid play gets both Play and ad networks to flag us.
 */

interface Game {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  thumb: string;
  width: string;
  height: string;
}

const FEED = "https://gamemonetize.com/feed.php?format=0&num=50&page=";
// Only GameMonetize's own game host may be framed — the key comes from the URL.
const GAME_KEY = /^https:\/\/html5\.gamemonetize\.co\/([a-z0-9]+)\/?$/;
const gameKey = (url: string): string | null => GAME_KEY.exec(url)?.[1] ?? null;

/** The app keeps games out of its WebView (Play + ad-policy risk). */
const EmbeddedNotice = (): JSX.Element => (
  <div className="glass-card mx-auto mt-10 max-w-sm p-8 text-center">
    <p className="font-display font-bold">Games open in your browser</p>
    <p className="mt-1 text-sm text-ink-soft">
      Visit moneymarathon.in/games in Chrome to play.
    </p>
  </div>
);

export const GamesPage = (): JSX.Element => {
  const [games, setGames] = useState<Game[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  const loadMore = useCallback(async () => {
    if (busy.current || !hasMore) return;
    busy.current = true;
    setLoading(true);
    try {
      const response = await fetch(FEED + (page + 1));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const batch = ((await response.json()) as Game[]).filter((g) => gameKey(g.url));
      setGames((prev) => {
        const seen = new Set(prev.map((g) => g.id));
        return [...prev, ...batch.filter((g) => !seen.has(g.id))];
      });
      setPage((p) => p + 1);
      setHasMore(batch.length > 0);
      setError(null);
    } catch {
      setError("Couldn't load games. Check your connection.");
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [hasMore, page]);

  useEffect(() => {
    if (!isEmbedded() && page === 0) void loadMore();
  }, [loadMore, page]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && void loadMore(),
      { rootMargin: "600px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  const categories = useMemo(
    () => [...new Set(games.map((g) => g.category))].sort(),
    [games],
  );
  const shown = category ? games.filter((g) => g.category === category) : games;

  if (isEmbedded()) return <EmbeddedNotice />;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-20 sm:px-6">
      <header className="pb-4 pt-6">
        <p className="mb-2 text-xs font-bold text-accent">Free games</p>
        <h1 className="font-display text-[30px] font-bold tracking-tight">
          Take a quick break.
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          Hundreds of free games — no download, no sign-in. Just tap and play.
        </p>
      </header>

      {categories.length > 1 && (
        <div className="sticky top-16 z-10 -mx-4 bg-bgtop/80 px-4 py-3 backdrop-blur">
          <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[null, ...categories].map((item) => (
              <button
                key={item ?? "all"}
                onClick={() => setCategory(item)}
                className={`chip shrink-0 border transition-colors ${
                  category === item
                    ? "border-accent/60 bg-accent/10 text-accent"
                    : "border-hairline bg-surface-alt text-ink-soft"
                }`}
              >
                {item ?? "All"}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && games.length === 0 ? (
        <div className="glass-card mx-auto mt-6 max-w-sm p-8 text-center">
          <p className="font-display font-bold">Connection interrupted</p>
          <p className="mt-1 text-sm text-ink-soft">{error}</p>
          <button onClick={() => void loadMore()} className="btn-accent mt-5 px-6 py-2.5 text-sm">
            Try again
          </button>
        </div>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((game, index) => (
            <Link
              key={game.id}
              to={`/games/play/${gameKey(game.url)}`}
              state={{ game }}
              className="offer-card glass-card group flex flex-col overflow-hidden animate-float-up"
              style={{ animationDelay: `${Math.min(index % 50, 8) * 60}ms` }}
            >
              <div className="relative aspect-[3/2] overflow-hidden bg-surface-alt">
                <img
                  src={game.thumb}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.025]"
                />
                <span className="chip absolute left-2 top-2 bg-surface-alt/90 text-[10px] text-ink-soft">
                  {game.category}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <h3 className="line-clamp-2 font-display text-sm font-bold leading-snug">
                  {game.title}
                </h3>
                <span className="btn-accent mt-auto w-full py-2 text-xs tracking-normal">
                  Play free ▶
                </span>
              </div>
            </Link>
          ))}
          {loading &&
            Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton aspect-[3/4]" />)}
        </div>
      )}
      <div ref={sentinel} className="h-px" aria-hidden />
    </div>
  );
};

export const GamePlayerPage = (): JSX.Element => {
  const { key = "" } = useParams();
  const game = (useLocation().state as { game?: Game } | null)?.game;
  const frameBox = useRef<HTMLDivElement>(null);

  if (isEmbedded()) return <EmbeddedNotice />;
  if (!/^[a-z0-9]+$/.test(key)) {
    return (
      <div className="glass-card mx-auto mt-10 max-w-sm p-8 text-center">
        <p className="font-display font-bold">Game not found</p>
        <Link to="/games" className="btn-accent mt-5 inline-block px-6 py-2.5 text-sm">
          Browse games
        </Link>
      </div>
    );
  }

  const width = Number(game?.width) || 16;
  const height = Number(game?.height) || 9;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-4 sm:px-6">
      <div className="mb-3 flex items-center gap-3">
        <Link to="/games" className="btn-ghost px-3.5 py-2 text-xs">
          ← All games
        </Link>
        <h1 className="min-w-0 flex-1 truncate font-display text-lg font-bold">
          {game?.title ?? "Play"}
        </h1>
        <button
          type="button"
          onClick={() => void frameBox.current?.requestFullscreen?.().catch(() => undefined)}
          className="btn-accent shrink-0 px-4 py-2 text-xs"
        >
          Full screen
        </button>
      </div>

      <div
        ref={frameBox}
        className="overflow-hidden rounded-2xl border border-hairline bg-black"
        style={{ aspectRatio: `${width} / ${height}`, maxHeight: "80vh" }}
      >
        <iframe
          src={`https://html5.gamemonetize.co/${key}/`}
          title={game?.title ?? "Game"}
          className="h-full w-full"
          allow="autoplay; fullscreen; gamepad"
          allowFullScreen
        />
      </div>

      {game?.description && (
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">{game.description}</p>
      )}
    </div>
  );
};
