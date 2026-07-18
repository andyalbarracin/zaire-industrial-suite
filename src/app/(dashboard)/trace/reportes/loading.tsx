export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-32 bg-skeleton rounded" />
      <div className="h-10 w-full bg-skeleton rounded-lg" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 bg-skeleton rounded-xl" />
        <div className="h-64 bg-skeleton rounded-xl" />
      </div>
    </div>
  );
}
