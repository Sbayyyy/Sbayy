import { useState } from 'react';
import RatingStars from './RatingStars';
import { Send, X } from 'lucide-react';

interface ReviewFormProps {
  productId: string;
  orderId?: string;
  existingReview?: {
    id: string;
    rating: number;
    comment: string;
  };
  onSubmit: (data: { rating: number; comment: string }) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

export default function ReviewForm({
  productId,
  orderId,
  existingReview,
  onSubmit,
  onCancel,
  loading = false
}: ReviewFormProps) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (rating === 0) {
      setError('يرجى اختيار التقييم');
      return;
    }

    if (comment.trim().length < 10) {
      setError('يرجى كتابة تعليق (10 أحرف على الأقل)');
      return;
    }

    if (comment.trim().length > 1000) {
      setError('التعليق طويل جداً (الحد الأقصى 1000 حرف)');
      return;
    }

    try {
      await onSubmit({ rating, comment: comment.trim() });
      
      // Reset form if new review (not editing)
      if (!existingReview) {
        setRating(0);
        setComment('');
      }
    } catch (err) {
      console.error('Failed to submit review:', err);
      setError('حدث خطأ في إرسال التقييم. حاول مرة أخرى.');
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">
          {existingReview ? 'تعديل التقييم' : 'أضف تقييمك'}
        </h3>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Rating Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            التقييم <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-4">
            <RatingStars
              rating={rating}
              size="lg"
              interactive
              onChange={setRating}
            />
            {rating > 0 && (
              <span className="text-sm text-gray-600">
                {rating === 1 && 'سيء جداً'}
                {rating === 2 && 'سيء'}
                {rating === 3 && 'متوسط'}
                {rating === 4 && 'جيد'}
                {rating === 5 && 'ممتاز'}
              </span>
            )}
          </div>
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            التعليق <span className="text-red-500">*</span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="شارك تجربتك مع هذا المنتج..."
            rows={5}
            className="input w-full resize-none"
            disabled={loading}
          />
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-gray-500">
              الحد الأدنى 10 أحرف
            </p>
            <p className={`text-xs ${
              comment.length > 1000 ? 'text-red-500' : 'text-gray-500'
            }`}>
              {comment.length} / 1000
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading || rating === 0 || comment.trim().length < 10}
            className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>جاري الإرسال...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>{existingReview ? 'تحديث التقييم' : 'إرسال التقييم'}</span>
              </>
            )}
          </button>
          
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="btn-outline"
              disabled={loading}
            >
              إلغاء
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
