export default function ProductCardSkeleton() {
  return (
    <div className="surface-card overflow-hidden" aria-hidden="true">
      <div className="skeleton aspect-square rounded-none"></div>
      <div className="p-4">
        <div className="skeleton mb-3 h-6 w-1/2"></div>
        <div className="skeleton mb-2 h-4"></div>
        <div className="skeleton mb-3 h-4 w-2/3"></div>
        <div className="skeleton mb-2 h-3 w-3/5"></div>
        <div className="skeleton mb-4 h-3 w-1/3"></div>
        <div className="flex justify-end">
          <div className="skeleton h-8 w-16"></div>
        </div>
      </div>
    </div>
  );
}
