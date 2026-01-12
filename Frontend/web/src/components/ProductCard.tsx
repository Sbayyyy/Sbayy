import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Heart, MapPin, Package } from 'lucide-react';
import { Product } from '@sbay/shared';
import { addFavorite, removeFavorite } from '@/lib/api/favorites';
import { useAuthStore } from '@/lib/store';

interface ProductCardProps {
  product: Product;
  onFavorite?: (id: string) => void;
  isFavorite?: boolean;
}

export default function ProductCard({ product, onFavorite, isFavorite = false }: ProductCardProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [isLiked, setIsLiked] = useState(isFavorite);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault(); // Verhindert Navigation
    
    // Check if user is authenticated
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=' + encodeURIComponent(router.asPath));
      return;
    }

    // Prevent multiple clicks
    if (isTogglingFavorite) return;

    try {
      setIsTogglingFavorite(true);
      
      if (isLiked) {
        // Remove from favorites
        await removeFavorite(product.id);
        setIsLiked(false);
      } else {
        // Add to favorites
        await addFavorite(product.id);
        setIsLiked(true);
      }

      // Call parent callback if provided
      onFavorite?.(product.id);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Revert optimistic update on error
      setIsLiked(isLiked);
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  const conditionLabels: Record<string, string> = {
    'New': 'جديد',
    'Used': 'مستعمل',
    'Refurbished': 'مجدد',
    'LikeNew': 'كالجديد',
    'Good': 'جيد',
    'Fair': 'مقبول',
    'Poor': 'سيئ'
  };

  const imageUrl = product.thumbnailUrl || product.imageUrls?.[0] || null;
  const formattedPrice = product.priceAmount.toLocaleString('ar-SY');
  const isAvailable = product.status === 'active' && 
    (product.stock === undefined || product.stock > 0);

  return (
    <Link href={`/listing/${product.id}`}>
      <div className="group bg-white rounded-lg shadow-sm hover:shadow-xl transition-all overflow-hidden cursor-pointer h-full flex flex-col">
        {/* Image */}
        <div className="relative aspect-square bg-gray-100 flex-shrink-0">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Package size={64} className="text-gray-300" />
            </div>
          )}

          {/* Condition Badge */}
          {product.condition && (
            <span className="absolute top-2 left-2 px-2 py-1 bg-white/90 rounded-full text-xs">
              {conditionLabels[product.condition]}
            </span>
          )}

          {/* Favorite Button */}
          <button
            onClick={handleFavoriteClick}
            disabled={isTogglingFavorite}
            className="absolute top-2 right-2 p-2 bg-white/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
            title={isLiked ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
          >
            <Heart 
              size={20} 
              className={`transition-colors ${
                isLiked ? 'text-red-500 fill-red-500' : 'text-gray-600'
              } ${isTogglingFavorite ? 'animate-pulse' : ''}`}
            />
          </button>

          {!isAvailable && (
            <span className="absolute bottom-2 left-2 px-2 py-1 bg-red-500 text-white text-xs rounded">
              غير متوفر
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col">
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 h-12">
            {product.title}
          </h3>

          <div className="flex items-center gap-1 text-sm text-gray-500 mb-3 h-5">
            {product.region && (
              <>
                <MapPin size={14} />
                <span>{product.region}</span>
              </>
            )}
          </div>

          <div className="flex items-center justify-between mt-auto">
            <span className="text-2xl font-bold text-primary-600">
              {formattedPrice} ل.س
            </span>
            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm opacity-0 group-hover:opacity-100 transition-opacity">
              عرض
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
