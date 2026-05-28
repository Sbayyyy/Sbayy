import Image from 'next/image';
import { ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { normalizeImageUrl, shouldBypassNextImageOptimizer } from '@/lib/images';

interface ImageGalleryProps {
  images: string[];
  title: string;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  prevLabel?: string;
  nextLabel?: string;
}

export default function ImageGallery({
  images,
  title,
  selectedIndex,
  onSelectIndex,
  prevLabel = 'Previous image',
  nextLabel = 'Next image',
}: ImageGalleryProps) {
  const normalizedImages = images.map(normalizeImageUrl).filter((image): image is string => Boolean(image));
  const safeSelectedIndex = normalizedImages[selectedIndex] ? selectedIndex : 0;
  const selectedImage = normalizedImages[safeSelectedIndex];

  const prevImage = () => {
    onSelectIndex(safeSelectedIndex === 0 ? normalizedImages.length - 1 : safeSelectedIndex - 1);
  };

  const nextImage = () => {
    onSelectIndex(safeSelectedIndex === normalizedImages.length - 1 ? 0 : safeSelectedIndex + 1);
  };

  return (
    <div>
      <div className="relative mb-4 aspect-square overflow-hidden rounded-2xl bg-slate-100">
        {selectedImage ? (
          <>
            <Image
              src={selectedImage}
              alt={title}
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="h-full w-full object-cover transition-transform duration-500"
              unoptimized={shouldBypassNextImageOptimizer(selectedImage)}
            />
            {normalizedImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevImage}
                  className="icon-button absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur"
                  aria-label={prevLabel}
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  type="button"
                  onClick={nextImage}
                  className="icon-button absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur"
                  aria-label={nextLabel}
                >
                  <ChevronRight size={24} />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-slate-950/60 px-3 py-1 text-sm font-semibold text-white backdrop-blur">
                  {safeSelectedIndex + 1} / {normalizedImages.length}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <Package size={64} className="text-slate-300" />
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {normalizedImages.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {normalizedImages.map((image, index) => (
            <button
              type="button"
              key={index}
              onClick={() => onSelectIndex(index)}
              className={`relative aspect-square overflow-hidden rounded-xl border-2 transition-all ${
                safeSelectedIndex === index
                  ? 'border-primary-600 ring-2 ring-primary-200'
                  : 'border-slate-200 hover:border-primary-200'
              }`}
            >
              <Image
                src={image}
                alt={`${title} ${index + 1}`}
                fill
                sizes="96px"
                className="h-full w-full object-cover"
                unoptimized={shouldBypassNextImageOptimizer(image)}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
