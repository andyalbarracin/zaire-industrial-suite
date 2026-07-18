export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div>
          <div className="h-8 w-52 bg-skeleton rounded mb-2" />
          <div className="h-4 w-32 bg-skeleton rounded" />
        </div>
        <div className="h-10 w-36 bg-skeleton rounded" />
      </div>
      <div className="h-12 w-full bg-skeleton rounded-lg" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 w-full bg-skeleton rounded" />
        ))}
      </div>
    </div>
  );
}
