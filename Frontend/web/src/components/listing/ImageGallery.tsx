import { ChevronLeft, ChevronRight, Package } from 'lucide-react';

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
  const prevImage = () => {
    onSelectIndex(selectedIndex === 0 ? images.length - 1 : selectedIndex - 1);
  };

  const nextImage = () => {
    onSelectIndex(selectedIndex === images.length - 1 ? 0 : selectedIndex + 1);
  };

  return (
    <div>
      <div className="relative mb-4 aspect-square overflow-hidden rounded-2xl bg-slate-100">
        {images.length > 0 ? (
          <>
            <img
              src={images[selectedIndex]}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-500"
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="icon-button absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur"
                  aria-label={prevLabel}
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={nextImage}
                  className="icon-button absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur"
                  aria-label={nextLabel}
                >
                  <ChevronRight size={24} />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-slate-950/60 px-3 py-1 text-sm font-semibold text-white backdrop-blur">
                  {selectedIndex + 1} / {images.length}
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
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => onSelectIndex(index)}
              className={`aspect-square overflow-hidden rounded-xl border-2 transition-all ${
                selectedIndex === index
                  ? 'border-primary-600 ring-2 ring-primary-200'
                  : 'border-slate-200 hover:border-primary-200'
              }`}
            >
              <img
                src={image}
                alt={`${title} ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
