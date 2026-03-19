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
      <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
        {images.length > 0 ? (
          <>
            <img
              src={images[selectedIndex]}
              alt={title}
              className="w-full h-full object-cover"
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg transition-all"
                  aria-label={prevLabel}
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg transition-all"
                  aria-label={nextLabel}
                >
                  <ChevronRight size={24} />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                  {selectedIndex + 1} / {images.length}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <Package size={64} className="text-gray-300" />
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
              className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                selectedIndex === index
                  ? 'border-primary-600 ring-2 ring-primary-200'
                  : 'border-gray-200 hover:border-gray-300'
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
