import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function KpiCard({
  label,
  value,
  trend,
  icon: Icon,
}: {
  label: string;
  value: string;
  trend?: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="rounded-lg border-zinc-200 shadow-none">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-zinc-500">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">{value}</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-700">
            <Icon className="size-5" />
          </div>
        </div>
        {trend ? <p className="mt-4 text-sm font-medium text-emerald-700">{trend}</p> : null}
      </CardContent>
    </Card>
  );
}
