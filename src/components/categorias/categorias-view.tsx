"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createCategory, deleteCategory, updateCategory } from "@/app/app/configuracoes/categorias/actions";
import { cn } from "@/lib/utils";

export type CategoryRow = {
  id: string;
  kind: "revenue" | "expense";
  name: string;
  description: string;
  position: number;
  active: boolean;
};

type Tab = "revenue" | "expense";

export function CategoriasView({ initialCategories }: { initialCategories: CategoryRow[] }) {
  const [tab, setTab] = useState<Tab>("revenue");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [pending, startTransition] = useTransition();
  const rows = useMemo(() => initialCategories.filter((category) => category.kind === tab), [initialCategories, tab]);

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    startTransition(async () => {
      const result = await createCategory({ kind: tab, name });
      if (!result.ok) { toast.error(result.error); return; }
      toast.success("Categoria criada.");
      setNewName("");
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/configuracoes" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900">
          <ArrowLeft className="size-3.5" /> Voltar para Configurações
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950">Categorias financeiras</h1>
        <p className="mt-1 text-sm text-zinc-600">Edite ou exclua permanentemente as categorias usadas em receitas e despesas.</p>
      </div>

      <div className="inline-flex rounded-md border border-zinc-200 bg-zinc-50 p-0.5">
        {(["revenue", "expense"] as const).map((kind) => (
          <button key={kind} type="button" onClick={() => { setTab(kind); setEditingId(null); }} className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition", tab === kind ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-600 hover:text-zinc-900")}>
            {kind === "revenue" ? "Receita" : "Despesa"}
          </button>
        ))}
      </div>

      <Card className="rounded-xl border-zinc-200 bg-white shadow-none">
        <CardContent className="p-0">
          <div className="flex items-center gap-2 border-b border-zinc-200 p-4">
            <Input placeholder={tab === "revenue" ? "Nova categoria de receita" : "Nova categoria de despesa"} value={newName} onChange={(event) => setNewName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); handleCreate(); } }} disabled={pending} maxLength={60} className="flex-1" />
            <Button onClick={handleCreate} disabled={pending || !newName.trim()}><Plus className="size-4" /> Adicionar</Button>
          </div>
          {rows.length === 0 ? <p className="p-8 text-center text-sm text-zinc-500">Nenhuma categoria. Cadastre a primeira acima.</p> : (
            <ul className="divide-y divide-zinc-100">
              {rows.map((category) => <EditableCategory key={category.id} row={category} editing={editingId === category.id} setEditing={(value) => setEditingId(value ? category.id : null)} />)}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EditableCategory({ row, editing, setEditing }: { row: CategoryRow; editing: boolean; setEditing: (value: boolean) => void }) {
  const [name, setName] = useState(row.name);
  const [pending, startTransition] = useTransition();

  const save = () => {
    const nextName = name.trim();
    if (!nextName) return;
    if (nextName === row.name) return setEditing(false);
    startTransition(async () => {
      const result = await updateCategory({ id: row.id, name: nextName });
      if (!result.ok) { toast.error(result.error); return; }
      toast.success("Categoria atualizada.");
      setEditing(false);
    });
  };

  const remove = () => {
    if (!confirm(`Excluir permanentemente a categoria "${row.name}"?`)) return;
    startTransition(async () => {
      const result = await deleteCategory({ id: row.id });
      if (!result.ok) { toast.error(result.error); return; }
      toast.success("Categoria excluída permanentemente.");
    });
  };

  return (
    <li className="flex items-center gap-3 p-4">
      {editing ? <>
        <Input value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); save(); } else if (event.key === "Escape") { setName(row.name); setEditing(false); } }} disabled={pending} autoFocus maxLength={60} className="flex-1" />
        <Button size="sm" onClick={save} disabled={pending}><Check className="size-4" /></Button>
        <Button size="sm" variant="outline" onClick={() => { setName(row.name); setEditing(false); }} disabled={pending}><X className="size-4" /></Button>
      </> : <>
        <span className="flex-1 text-sm font-medium text-zinc-900">{row.name}</span>
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)} disabled={pending} aria-label={`Editar ${row.name}`}><Pencil className="size-4" /></Button>
        <Button size="sm" variant="ghost" onClick={remove} disabled={pending} aria-label={`Excluir ${row.name}`}><Trash2 className="size-4 text-rose-600" /></Button>
      </>}
    </li>
  );
}
