import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/app/section-heading";
import { reportItems } from "@/lib/data/demo";

export default function ReportsPage() {
  return (
    <div>
      <SectionHeading title="Relatórios" description="Indicadores comerciais, operacionais e financeiros da loja." />
      <div className="grid gap-4 md:grid-cols-3">
        {reportItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="rounded-lg border-zinc-200 bg-white shadow-none">
              <CardContent className="p-6">
                <Icon className="size-5 text-zinc-700" />
                <p className="mt-5 text-sm font-medium text-zinc-500">{item.label}</p>
                <h2 className="mt-2 text-xl font-semibold">{item.value}</h2>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
