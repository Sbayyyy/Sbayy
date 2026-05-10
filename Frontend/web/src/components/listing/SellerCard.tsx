import { useRouter } from 'next/router';
import { MapPin, Star } from 'lucide-react';

interface SellerInfo {
  id?: string;
  name: string;
  avatar?: string;
  rating?: number;
  reviewCount?: number;
  city?: string;
}

interface SellerCardProps {
  seller: SellerInfo;
  profileId?: string;
  sectionTitle: string;
  reviewsLabel: (count: number) => string;
}

function SellerAvatar({ seller }: { seller: SellerInfo }) {
  return (
    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-white shadow-sm">
      {seller.avatar ? (
        <img
          src={seller.avatar}
          alt={seller.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-primary-600 font-bold text-lg">
          {seller.name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function SellerDetails({ seller, reviewsLabel }: { seller: SellerInfo; reviewsLabel: (count: number) => string }) {
  return (
    <div>
      <p className="font-semibold text-slate-950">{seller.name}</p>
      {seller.rating !== undefined && (
        <div className="flex items-center gap-1 text-sm">
          <Star size={14} className="text-yellow-400 fill-yellow-400" />
          <span className="text-slate-600">{seller.rating.toFixed(1)}</span>
        </div>
      )}
      {seller.reviewCount !== undefined && (
        <p className="text-xs text-slate-500">{reviewsLabel(seller.reviewCount)}</p>
      )}
      {seller.city && (
        <p className="text-xs text-slate-500 flex items-center gap-1">
          <MapPin size={12} />
          {seller.city}
        </p>
      )}
    </div>
  );
}

export default function SellerCard({ seller, profileId, sectionTitle, reviewsLabel }: SellerCardProps) {
  const router = useRouter();

  return (
    <div className="mb-6 border-t border-slate-200 pt-4">
      <h2 className="mb-3 text-xl font-bold text-slate-950">{sectionTitle}</h2>
      {profileId ? (
        <button
          type="button"
          onClick={() => router.push(`/seller/${profileId}`)}
          className="-m-3 flex w-full items-center gap-4 rounded-2xl border border-transparent p-3 text-left transition-all hover:border-primary-100 hover:bg-primary-50/40"
        >
          <SellerAvatar seller={seller} />
          <SellerDetails seller={seller} reviewsLabel={reviewsLabel} />
        </button>
      ) : (
        <div className="flex items-center gap-4">
          <SellerAvatar seller={seller} />
          <SellerDetails seller={seller} reviewsLabel={reviewsLabel} />
        </div>
      )}
    </div>
  );
}
