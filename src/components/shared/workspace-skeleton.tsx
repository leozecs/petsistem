import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type WorkspaceSkeletonProps = {
  cards?: number;
  rows?: number;
  className?: string;
};

export function WorkspaceSkeleton({
  cards = 4,
  rows = 6,
  className,
}: WorkspaceSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)} aria-busy="true" aria-label="Carregando conteúdo">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 sm:w-64" />
          <Skeleton className="h-4 w-full max-w-80" />
        </div>
        <Skeleton className="h-11 w-full sm:w-36 lg:h-9" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: cards }).map((_, index) => (
          <div key={index} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="size-9" />
            </div>
            <Skeleton className="mt-4 h-8 w-20" />
            <Skeleton className="mt-3 h-3 w-28" />
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="divide-y divide-border/70">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="grid grid-cols-[1fr_auto] gap-4 p-4 sm:grid-cols-4">
              <Skeleton className="h-4 w-full max-w-44" />
              <Skeleton className="h-4 w-20 sm:order-4" />
              <Skeleton className="hidden h-4 w-full max-w-36 sm:block" />
              <Skeleton className="hidden h-4 w-full max-w-28 sm:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
