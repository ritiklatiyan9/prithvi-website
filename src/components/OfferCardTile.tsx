import { OfferArtwork } from "./OfferArtwork";
import { memo } from "react";
import { Link } from "react-router-dom";
import { api, type OfferCard } from "../lib/api";
import { CoinIcon } from "./ui";

/** 2-col grid card: art (crop-safe), 2-line title, coin row, START pill. */
const OfferCardTileComponent = ({
  offer,
  index,
}: {
  offer: OfferCard;
  index: number;
}): JSX.Element => {
  const showAsCompleted =
    offer.completed === true && offer.completedBehavior === "SHOW_COMPLETED";
  return (
  <Link
    to={`/offers/${offer.slug}`}
    onClick={() => api.track("CLICK", { offerId: offer.id })}
    onPointerEnter={() => void api.offer(offer.slug).catch(() => undefined)}
    onFocus={() => void api.offer(offer.slug).catch(() => undefined)}
    className={`offer-card glass-card group flex flex-col overflow-hidden animate-float-up ${
      offer.featured ? "border-accent/40 shadow-glow-sm" : ""
    }`}
    style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
  >
    {/* Art — fixed ratio so any CMS image crops safely */}
    <div className="relative aspect-[3/2] overflow-hidden bg-surface-alt">
      <OfferArtwork sources={[offer.thumbnailUrl, offer.logoUrl]} title={offer.title}
        className="transition-transform duration-300 group-hover:scale-[1.025]" />
      {showAsCompleted ? (
        <span className="chip absolute left-2 top-2 bg-surface-alt/90 text-[10px] text-accent">
          Completed
        </span>
      ) : (
        offer.featured && (
          <span className="chip absolute left-2 top-2 bg-gradient-to-br from-accent to-accent-deep text-[10px] text-onaccent">
            Featured
          </span>
        )
      )}
    </div>

    <div className="flex flex-1 flex-col gap-2 p-3">
      <h3 className="line-clamp-2 font-display text-sm font-bold leading-snug">
        {offer.title}
      </h3>
      <div className="flex flex-wrap items-center gap-1.5">
        <CoinIcon size={15} />
        <span className="font-numbers text-sm font-bold text-accent">
          +{offer.rewardLabel ?? offer.rewardAmount}
        </span>
        {offer.estimatedTime && (
          <span className="ml-auto truncate text-[11px] text-ink-muted">
            {offer.estimatedTime}
          </span>
        )}
      </div>
      {showAsCompleted ? (
        <span className="mt-auto w-full rounded-full bg-surface-alt py-2 text-center text-xs font-bold tracking-normal text-ink-muted">
          Completed
        </span>
      ) : (
        <span className="btn-accent mt-auto w-full py-2 text-xs tracking-normal">
          Explore offer ↗
        </span>
      )}
    </div>
  </Link>
  );
};

// Existing offer objects remain referentially stable while the page toggles
// loading/error state, so memo prevents every visible card reconciling again.
export const OfferCardTile = memo(OfferCardTileComponent);
