import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: string;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50/70 p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700">
        <Icon className="size-5" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-zinc-950">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-zinc-600">{description}</p>
      {action ? (
        <Button className="mt-5 rounded-md" size="sm">
          {action}
        </Button>
      ) : null}
    </div>
  );
}
