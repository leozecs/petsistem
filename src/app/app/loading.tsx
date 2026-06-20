export default function AppLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 space-y-2">
        <div className="h-8 w-56 rounded-md bg-zinc-200" />
        <div className="h-4 w-80 rounded-md bg-zinc-100" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-zinc-200 bg-white p-5">
            <div className="h-3 w-24 rounded-md bg-zinc-200" />
            <div className="mt-3 h-8 w-20 rounded-md bg-zinc-200" />
            <div className="mt-4 h-3 w-16 rounded-md bg-zinc-100" />
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-5">
        <div className="h-4 w-40 rounded-md bg-zinc-200" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-4 w-12 rounded-md bg-zinc-100" />
              <div className="h-4 flex-1 rounded-md bg-zinc-100" />
              <div className="h-4 w-24 rounded-md bg-zinc-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
