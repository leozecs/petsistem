export function TableSkeleton({
  title,
  rows = 6,
}: {
  title?: string;
  rows?: number;
}) {
  return (
    <div className="animate-pulse">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded-md bg-zinc-200" />
          <div className="h-4 w-72 rounded-md bg-zinc-100" />
        </div>
        <div className="h-9 w-36 rounded-md bg-zinc-200" />
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white">
        {title ? (
          <div className="border-b border-zinc-200 p-4">
            <div className="h-4 w-32 rounded-md bg-zinc-200" />
          </div>
        ) : null}
        <div className="divide-y divide-zinc-100">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="h-4 w-32 rounded-md bg-zinc-100" />
              <div className="h-4 w-40 rounded-md bg-zinc-100" />
              <div className="h-4 w-24 rounded-md bg-zinc-100" />
              <div className="ml-auto h-7 w-16 rounded-md bg-zinc-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
