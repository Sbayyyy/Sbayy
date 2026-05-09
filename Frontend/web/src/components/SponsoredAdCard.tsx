import { useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import type { SponsoredAd } from '@/lib/api/ads';
import { trackAdClick, trackAdImpression } from '@/lib/api/ads';

interface SponsoredAdCardProps {
  ad: SponsoredAd;
}

export default function SponsoredAdCard({ ad }: SponsoredAdCardProps) {
  useEffect(() => {
    void trackAdImpression(ad.id).catch(() => undefined);
  }, [ad.id]);

  const isExternal = /^https?:\/\//i.test(ad.targetUrl);

  return (
    <article className="surface-card surface-card-hover group overflow-hidden border-amber-200/80 bg-amber-50/40">
      <div className="relative aspect-square overflow-hidden bg-amber-100/70">
        {ad.imageUrl ? (
          <img
            src={ad.imageUrl}
            alt={ad.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-amber-700">
            Sponsored
          </div>
        )}
        <span className="status-pill absolute left-3 top-3 border-amber-200 bg-white/95 text-amber-700 shadow-sm">
          Sponsored
        </span>
      </div>
      <div className="flex min-h-[11rem] flex-col p-4">
        <h3 className="mb-2 line-clamp-2 min-h-[3rem] font-semibold leading-6 text-slate-950">
          {ad.title}
        </h3>
        <p className="mb-4 line-clamp-3 text-sm leading-6 text-slate-600">
          {ad.description}
        </p>
        <a
          href={ad.targetUrl}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          onClick={() => void trackAdClick(ad.id).catch(() => undefined)}
          className="btn btn-outline mt-auto w-full border-amber-200 bg-white/90 text-amber-800 hover:bg-amber-50"
        >
          {ad.ctaText}
          {isExternal && <ExternalLink size={15} />}
        </a>
      </div>
    </article>
  );
}
