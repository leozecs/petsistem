import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const toneMap = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  neutral: "border-zinc-200 bg-zinc-50 text-zinc-700",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
};

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: keyof typeof toneMap;
}) {
  return (
    <Badge variant="outline" className={cn("rounded-md font-medium", toneMap[tone])}>
      {children}
    </Badge>
  );
}
