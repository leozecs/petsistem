import { PawPrint, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/app/section-heading";
import { pets } from "@/lib/data/demo";

export default function PetsPage() {
  return (
    <div>
      <SectionHeading
        title="Pets"
        description="Cadastro de pets com espécie, raça, sexo, peso, idade, tutor e foto."
        action={<Button className="rounded-md bg-zinc-950 text-white hover:bg-zinc-800"><Plus className="size-4" />Novo pet</Button>}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {pets.map((pet) => (
          <Card key={pet.name} className="rounded-lg border-zinc-200 bg-white shadow-none">
            <CardContent className="p-5">
              <div className="flex size-12 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
                <PawPrint className="size-5" />
              </div>
              <h2 className="mt-5 text-lg font-semibold">{pet.name}</h2>
              <p className="mt-1 text-sm text-zinc-500">{pet.species} - {pet.breed}</p>
              <div className="mt-5 rounded-lg bg-zinc-50 p-3 text-sm">
                <p className="font-medium text-zinc-950">{pet.tutor}</p>
                <p className="mt-1 text-zinc-500">Peso: {pet.weight}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
