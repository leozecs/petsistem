export default function CalendariosLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-44 rounded-md bg-zinc-200" />
          <div className="h-4 w-72 rounded-md bg-zinc-100" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-44 rounded-md bg-zinc-100" />
          <div className="h-9 w-28 rounded-md bg-zinc-200" />
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-md bg-zinc-100" />
          <div className="h-5 w-40 rounded-md bg-zinc-200" />
          <div className="size-9 rounded-md bg-zinc-100" />
        </div>
        <div className="h-8 w-16 rounded-md bg-zinc-100" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="px-2 py-2">
                <div className="mx-auto h-3 w-8 rounded-md bg-zinc-200" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: 42 }).map((_, i) => (
              <div
                key={i}
                className="flex h-24 flex-col gap-2 border-b border-r border-zinc-100 p-2 sm:h-28"
              >
                <div className="h-4 w-6 rounded-md bg-zinc-200" />
                {i % 5 === 0 ? <div className="mt-auto h-3 w-3/4 rounded bg-zinc-100" /> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <div className="h-3 w-12 rounded-md bg-zinc-200" />
          <div className="mt-2 h-5 w-56 rounded-md bg-zinc-200" />
          <div className="mt-6 h-3 w-32 rounded-md bg-zinc-200" />
          <div className="mt-3 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-md border border-zinc-200 p-3">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-10 rounded-md bg-zinc-200" />
                  <div className="h-4 w-20 rounded-full bg-zinc-100" />
                </div>
                <div className="mt-2 h-4 w-36 rounded-md bg-zinc-200" />
                <div className="mt-1 h-3 w-24 rounded-md bg-zinc-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
