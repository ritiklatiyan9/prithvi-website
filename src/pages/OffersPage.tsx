import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, type OfferCard, type OfferCategory, type SortOption } from "../lib/api";
import { OfferCardTile } from "../components/OfferCardTile";

const SORTS: { value: SortOption; label: string }[] = [
  { value: "priority", label: "Recommended" },
  { value: "newest", label: "Newest" },
  { value: "reward", label: "Highest reward" },
];

export const OffersPage = (): JSX.Element => {
  const [categories, setCategories] = useState<OfferCategory[]>([]);
  const [offers, setOffers] = useState<OfferCard[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  // Initial category comes from ?category=<slug> — the app's hand-over link is
  // <websiteUrl>?code=<code>&category=<slug> (code is stripped at boot).
  const [category, setCategory] = useState<string | null>(searchParams.get("category"));
  const [sort, setSort] = useState<SortOption>("priority");

  const sentinel = useRef<HTMLDivElement>(null);

  // Keep the URL in sync so the filter is shareable and survives refresh.
  const selectCategory = (slug: string | null): void => {
    setCategory(slug);
    setSearchParams(slug ? { category: slug } : {}, { replace: true });
  };

  useEffect(() => {
    document.title = "Reward Zone — Money Marathon";
    void api.categories().then(setCategories).catch(() => undefined);
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const loadPage = useCallback(
    async (pageToLoad: number, replace: boolean): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const result = await api.offers({
          page: pageToLoad,
          search: debounced || undefined,
          category: category ?? undefined,
          sort,
        });
        setOffers((current) => (replace ? result.items : [...current, ...result.items]));
        setHasMore(pageToLoad < result.meta.totalPages);
        setPage(pageToLoad);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    [debounced, category, sort],
  );

  // Reload from page 1 whenever filters change.
  useEffect(() => {
    void loadPage(1, true);
  }, [loadPage]);

  // Infinite scroll
  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          void loadPage(page + 1, false);
        }
      },
      { rootMargin: "600px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, page, loadPage]);

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-20">
      {/* Heading — app's Hot Offers screen tone */}
      <header className="pb-4 pt-6">
        <h1 className="font-display text-[28px] font-bold tracking-tight">Hot Offers</h1>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          Complete an eligible task and upload proof — approved coins land in your Money Marathon
          wallet.
        </p>
      </header>

      {/* Controls */}
      <div className="sticky top-14 z-10 -mx-4 space-y-2.5 bg-bgtop/80 px-4 py-3 backdrop-blur">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search offers…"
          className="field"
        />
        <div className="flex items-center gap-2">
          <div className="flex flex-1 gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => selectCategory(null)}
              className={`chip shrink-0 border transition-colors ${
                category === null
                  ? "border-accent/60 bg-accent/10 text-accent"
                  : "border-hairline bg-surface-alt text-ink-soft"
              }`}
            >
              All
            </button>
            {categories.map((item) => (
              <button
                key={item.id}
                onClick={() => selectCategory(category === item.slug ? null : item.slug)}
                className={`chip shrink-0 border transition-colors ${
                  category === item.slug
                    ? "border-accent/60 bg-accent/10 text-accent"
                    : "border-hairline bg-surface-alt text-ink-soft"
                }`}
              >
                {item.title}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortOption)}
            className="shrink-0 rounded-full border border-hairline bg-surface-alt px-3 py-1.5 text-xs font-semibold text-ink-soft outline-none focus:border-accent"
          >
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      {error && offers.length === 0 ? (
        <div className="glass-card mx-auto mt-6 max-w-sm p-8 text-center">
          <p className="font-display font-bold">Connection interrupted</p>
          <p className="mt-1 text-sm text-ink-soft">{error}</p>
          <button onClick={() => void loadPage(1, true)} className="btn-accent mt-5 px-6 py-2.5 text-sm">
            Try again
          </button>
        </div>
      ) : offers.length === 0 && !loading ? (
        <div className="glass-card mx-auto mt-6 max-w-sm p-8 text-center">
          <p className="font-display font-bold">No offers match</p>
          <p className="mt-1 text-sm text-ink-soft">
            Try a different search or category — fresh offers drop weekly.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {offers.map((offer, index) => (
            <OfferCardTile key={offer.id} offer={offer} index={index} />
          ))}
          {loading &&
            Array.from({ length: offers.length === 0 ? 6 : 2 }).map((_, index) => (
              <div key={`skeleton-${index}`} className="skeleton h-64" />
            ))}
        </div>
      )}

      <div ref={sentinel} className="h-2" />
      {!hasMore && offers.length > 0 && (
        <p className="mt-8 text-center text-xs text-ink-muted">
          You've seen every live offer — check back soon.
        </p>
      )}
    </div>
  );
};
