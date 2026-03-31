type SkeletonProps = {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  circle?: boolean;
};

export function Skeleton({ className = "", width, height, rounded = true, circle = false }: SkeletonProps) {
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height) style.height = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={`animate-pulse bg-gray-200 ${circle ? "rounded-full" : rounded ? "rounded-md" : ""} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="w-full aspect-square" />
      <Skeleton height={16} width="75%" />
      <Skeleton height={14} width="50%" />
      <Skeleton height={20} width="30%" />
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <Skeleton className="w-full aspect-square" />
      <div className="space-y-4">
        <Skeleton height={32} width="80%" />
        <Skeleton height={24} width="40%" />
        <Skeleton height={16} width="60%" />
        <div className="space-y-2 mt-6">
          <Skeleton height={14} width="100%" />
          <Skeleton height={14} width="90%" />
          <Skeleton height={14} width="70%" />
        </div>
        <Skeleton height={48} width="100%" className="mt-6" />
      </div>
    </div>
  );
}

export function CartSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton width={80} height={80} />
          <div className="flex-1 space-y-2">
            <Skeleton height={16} width="60%" />
            <Skeleton height={14} width="30%" />
            <Skeleton height={14} width="20%" />
          </div>
        </div>
      ))}
      <div className="border-t pt-4 space-y-2">
        <Skeleton height={16} width="40%" />
        <Skeleton height={24} width="30%" />
        <Skeleton height={48} width="100%" />
      </div>
    </div>
  );
}

export function NavBarSkeleton() {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <Skeleton width={120} height={24} />
      <div className="flex gap-4">
        <Skeleton width={60} height={16} />
        <Skeleton width={60} height={16} />
        <Skeleton width={60} height={16} />
      </div>
      <div className="flex gap-3">
        <Skeleton width={24} height={24} circle />
        <Skeleton width={24} height={24} circle />
      </div>
    </div>
  );
}
