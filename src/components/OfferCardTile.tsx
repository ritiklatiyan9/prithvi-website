import { Link } from "react-router-dom";
import { api, type OfferCard } from "../lib/api";
import { CoinIcon, FlameIcon } from "./ui";

/** 2-col grid card: art (crop-safe), 2-line title, coin row, START pill. */
export const OfferCardTile = ({
  offer,
  index,
}: {
  offer: OfferCard;
  index: number;
}): JSX.Element => (
  <Link
    to={`/offers/${offer.slug}`}
    onClick={() => api.track("CLICK", { offerId: offer.id })}
    className={`glass-card group flex flex-col overflow-hidden animate-float-up ${
      offer.featured ? "border-accent/40 shadow-glow-sm" : ""
    }`}
    style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
  >
    {/* Art — fixed ratio so any CMS image crops safely */}
    <div className="relative aspect-[4/3] overflow-hidden bg-surface-alt">
      {offer.thumbnailUrl ?? offer.logoUrl ? (
        <img
          src={offer.thumbnailUrl ?? offer.logoUrl ?? ""}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-active:scale-105"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-accent/60">
          <FlameIcon size={36} />
        </div>
      )}
      {offer.featured && (
        <span className="chip absolute left-2 top-2 bg-gradient-to-br from-accent to-accent-deep text-[10px] text-onaccent">
          FEATURED
        </span>
      )}
    </div>

    <div className="flex flex-1 flex-col gap-2 p-3">
      <h3 className="line-clamp-2 font-display text-sm font-bold leading-snug">{offer.title}</h3>
      <div className="flex items-center gap-1.5">
        <CoinIcon size={15} />
        <span className="font-numbers text-sm font-bold text-accent">
          +{offer.rewardLabel ?? offer.rewardAmount}
        </span>
        {offer.estimatedTime && (
          <span className="ml-auto truncate text-[11px] text-ink-muted">{offer.estimatedTime}</span>
        )}
      </div>
      <span className="btn-accent mt-auto w-full py-2 text-xs tracking-wider">START</span>
    </div>
  </Link>
);
