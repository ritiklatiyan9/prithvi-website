import { useState } from "react";

/** Keep failed CMS images from leaving a broken-image glyph in an offer. */
export const OfferArtwork = ({ sources, title, className = "" }: {
  sources: (string | null | undefined)[];
  title: string;
  className?: string;
}): JSX.Element => {
  const [failed, setFailed] = useState<string[]>([]);
  const src = sources.find((url): url is string => Boolean(url) && !failed.includes(url!));
  return src ? (
    <img src={src} alt="" loading="lazy" decoding="async"
      className={`h-full w-full object-contain ${className}`}
      onError={() => setFailed((current) => [...current, src])} />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#fff3e6] to-[#f2ece3]">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#d9cbbb] bg-white/75 text-3xl font-extrabold text-accent" aria-label={`${title} artwork unavailable`}>
        {title.trim().charAt(0).toUpperCase() || 'M'}
      </span>
    </div>
  );
};
