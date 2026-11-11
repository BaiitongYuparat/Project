interface OutfitSkeletonProps {
  count?: number;
}

export default function OutfitSkeleton({ count = 8 }: OutfitSkeletonProps) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-7 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex animate-pulse flex-col gap-2">
          <div className="aspect-[3/4] w-full rounded-2xl bg-secondary/10" />
          <div className="h-4 w-3/4 rounded bg-secondary/10" />
          <div className="h-3 w-1/2 rounded bg-secondary/10" />
        </div>
      ))}
    </div>
  );
}
