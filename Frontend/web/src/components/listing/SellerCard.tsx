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
    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden">
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
      <p className="font-medium">{seller.name}</p>
      {seller.rating !== undefined && (
        <div className="flex items-center gap-1 text-sm">
          <Star size={14} className="text-yellow-400 fill-yellow-400" />
          <span className="text-gray-600">{seller.rating.toFixed(1)}</span>
        </div>
      )}
      {seller.reviewCount !== undefined && (
        <p className="text-xs text-gray-500">{reviewsLabel(seller.reviewCount)}</p>
      )}
      {seller.city && (
        <p className="text-xs text-gray-500 flex items-center gap-1">
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
    <div className="border-t pt-4 mb-6">
      <h2 className="text-xl font-semibold mb-3">{sectionTitle}</h2>
      {profileId ? (
        <button
          type="button"
          onClick={() => router.push(`/seller/${profileId}`)}
          className="flex w-full items-center gap-4 rounded-lg border border-transparent hover:border-gray-200 hover:bg-gray-50 p-3 -m-3 transition-colors text-left"
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
