import ProductCardSkeleton from '@/components/ProductCardSkeleton';

export default function BrowseLoadingState() {
  return (
    <div className="app-page pb-12">
      <div className="container mx-auto px-4 pt-8 sm:pt-10">
        <div className="skeleton mx-auto h-14 w-full max-w-3xl rounded-[28px]" />
        <div className="mt-5 flex justify-center gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-8 w-20 rounded-full" />
          ))}
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          <div className="hidden w-64 flex-shrink-0 lg:block">
            <div className="surface-card p-5">
              <div className="skeleton mb-5 h-4 w-24" />
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="skeleton h-9" />
                ))}
              </div>
            </div>
          </div>
          <div className="grid flex-1 grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
