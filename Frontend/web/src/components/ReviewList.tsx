import { useState } from 'react';
import RatingStars from './RatingStars';
import { User, ThumbsUp, MoreVertical, Trash2, Edit2 } from 'lucide-react';

interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  createdAt: string;
  helpful: number;
  isHelpful?: boolean;
  isOwn?: boolean;
}

interface ReviewListProps {
  reviews: Review[];
  currentUserId?: string;
  onMarkHelpful?: (reviewId: string) => void;
  onEdit?: (reviewId: string) => void;
  onDelete?: (reviewId: string) => void;
  loading?: boolean;
}

export default function ReviewList({
  reviews,
  currentUserId,
  onMarkHelpful,
  onEdit,
  onDelete,
  loading = false
}: ReviewListProps) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'اليوم';
    if (diffDays === 1) return 'أمس';
    if (diffDays < 7) return `منذ ${diffDays} أيام`;
    if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسابيع`;
    
    return date.toLocaleDateString('ar-SY', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-lg p-6 animate-pulse">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/3 mb-4" />
                <div className="h-20 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="bg-white rounded-lg p-12 text-center">
        <p className="text-gray-500 text-lg">لا توجد تقييمات بعد</p>
        <p className="text-gray-400 text-sm mt-2">كن أول من يقيّم هذا المنتج</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map(review => (
        <div key={review.id} className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 flex-1">
              {/* User Avatar */}
              <div className="flex-shrink-0">
                {review.userAvatar ? (
                  <img
                    src={review.userAvatar}
                    alt={review.userName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-500" />
                  </div>
                )}
              </div>

              {/* Review Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900">{review.userName}</h4>
                  {review.isOwn && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      أنت
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-3 mb-3">
                  <RatingStars rating={review.rating} size="sm" />
                  <span className="text-xs text-gray-500">{formatDate(review.createdAt)}</span>
                </div>

                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {review.comment}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-4 mt-4">
                  {onMarkHelpful && (
                    <button
                      onClick={() => onMarkHelpful(review.id)}
                      className={`flex items-center gap-1 text-sm transition-colors ${
                        review.isHelpful
                          ? 'text-primary font-medium'
                          : 'text-gray-500 hover:text-primary'
                      }`}
                    >
                      <ThumbsUp className={`w-4 h-4 ${review.isHelpful ? 'fill-current' : ''}`} />
                      <span>مفيد ({review.helpful})</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Menu for own reviews */}
            {review.isOwn && (onEdit || onDelete) && (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(menuOpen === review.id ? null : review.id)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <MoreVertical className="w-5 h-5 text-gray-500" />
                </button>

                {menuOpen === review.id && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setMenuOpen(null)}
                    />
                    
                    {/* Menu */}
                    <div className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 min-w-[150px]">
                      {onEdit && (
                        <button
                          onClick={() => {
                            onEdit(review.id);
                            setMenuOpen(null);
                          }}
                          className="w-full px-4 py-2 text-right text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Edit2 className="w-4 h-4" />
                          تعديل
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => {
                            onDelete(review.id);
                            setMenuOpen(null);
                          }}
                          className="w-full px-4 py-2 text-right text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          حذف
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
