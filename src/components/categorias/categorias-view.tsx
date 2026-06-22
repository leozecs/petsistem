"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Archive, Check, Pencil, Plus, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  archiveCategory,
  createCategory,
  restoreCategory,
  updateCategory,
} from "@/app/app/configuracoes/categorias/actions";
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
  const [showArchived, setShowArchived] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [pending, startTransition] = useTransition();

  const rows = useMemo(() => {
    return initialCategories
      .filter((c) => c.kind === tab)
      .filter((c) => (showArchived ? !c.active : c.active));
  }, [initialCategories, tab, showArchived]);

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    startTransition(async () => {
      const res = await createCategory({ kind: tab, name });
      if (res.ok) {
        toast.success("Categoria criada.");
        setNewName("");
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/app/configuracoes"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900"
        >
          <ArrowLeft className="size-3.5" />
          Voltar para Configurações
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950">
          Categorias financeiras
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Use no Financeiro pra agrupar receitas e despesas. Renomeie quando quiser. Arquivar não
          apaga histórico — só esconde da lista de cadastro.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border border-zinc-200 bg-zinc-50 p-0.5">
          {(["revenue", "expense"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setTab(k);
                setEditingId(null);
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition",
                tab === k ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-600 hover:text-zinc-900",
              )}
            >
              {k === "revenue" ? "Receita" : "Despesa"}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="size-4 rounded border-zinc-300"
          />
          Mostrar arquivadas
        </label>
      </div>

      <Card className="rounded-xl border-zinc-200 bg-white shadow-none">
        <CardContent className="p-0">
          {!showArchived && (
            <div className="flex items-center gap-2 border-b border-zinc-200 p-4">
              <Input
                placeholder={
                  tab === "revenue"
                    ? "Nova categoria de receita (ex: Hospedagem)"
                    : "Nova categoria de despesa (ex: Telefone)"
                }
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
                disabled={pending}
                maxLength={60}
                className="flex-1"
              />
              <Button onClick={handleCreate} disabled={pending || !newName.trim()}>
                <Plus className="size-4" />
                Adicionar
              </Button>
            </div>
          )}

          {rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-zinc-500">
              {showArchived
                ? "Nenhuma categoria arquivada."
                : "Nenhuma categoria. Cadastre a primeira acima."}
            </p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {rows.map((c) => (
                <CategoryRow
                  key={c.id}
                  row={c}
                  editing={editingId === c.id}
                  setEditing={(v) => setEditingId(v ? c.id : null)}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CategoryRow({
  row,
  editing,
  setEditing,
}: {
  row: CategoryRow;
  editing: boolean;
  setEditing: (v: boolean) => void;
}) {
  const [name, setName] = useState(row.name);
  const [pending, startTransition] = useTransition();

  const saveEdit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (trimmed === row.name) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const res = await updateCategory({ id: row.id, name: trimmed });
      if (res.ok) {
        toast.success("Categoria atualizada.");
        setEditing(false);
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleArchive = () => {
    startTransition(async () => {
      const res = await archiveCategory({ id: row.id });
      if (res.ok) toast.success("Categoria arquivada.");
      else toast.error(res.error);
    });
  };

  const handleRestore = () => {
    startTransition(async () => {
      const res = await restoreCategory({ id: row.id });
      if (res.ok) toast.success("Categoria restaurada.");
      else toast.error(res.error);
    });
  };

  return (
    <li className="flex items-center gap-3 p-4">
      {editing ? (
        <>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saveEdit();
              } else if (e.key === "Escape") {
                setName(row.name);
                setEditing(false);
              }
            }}
            disabled={pending}
            autoFocus
            maxLength={60}
            className="flex-1"
          />
          <Button size="sm" onClick={saveEdit} disabled={pending}>
            <Check className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setName(row.name);
              setEditing(false);
            }}
            disabled={pending}
          >
            <X className="size-4" />
          </Button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm font-medium text-zinc-900">{row.name}</span>
          {row.active ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(true)}
                disabled={pending}
              >
                <Pencil className="size-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleArchive} disabled={pending}>
                <Archive className="size-4 text-zinc-500" />
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={handleRestore} disabled={pending}>
              <RotateCcw className="size-4 text-emerald-700" />
            </Button>
          )}
        </>
      )}
    </li>
  );
}
