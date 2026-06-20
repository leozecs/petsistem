"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type ComboboxOption = { id: string; label: string; sublabel?: string };

type Props = {
  options: ComboboxOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Called when user picks "+ Criar <query>". Receives the typed query. */
  onCreate?: (query: string) => Promise<void> | void;
  createLabel?: (query: string) => string;
  emptyHint?: string;
  id?: string;
  className?: string;
};

/**
 * Typeahead combobox: type to filter the option list, click a row to pick, or
 * click the "+ Criar …" row to invoke `onCreate(query)`. Selection clears the
 * query and displays the chosen option's label.
 *
 * Why a custom component instead of Base UI Combobox: we need an inline-create
 * row that calls a server action and assigns the resulting id back into the
 * form — Base UI's autocomplete doesn't expose that hook cleanly here.
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder,
  disabled,
  onCreate,
  createLabel,
  emptyHint,
  id,
  className,
}: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selected = options.find((o) => o.id === value) ?? null;

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? options.filter((o) => o.label.toLowerCase().includes(normalizedQuery))
    : options.slice(0, 50);

  const exactMatch = filtered.some(
    (o) => o.label.toLowerCase() === normalizedQuery,
  );
  const showCreate =
    Boolean(onCreate) && normalizedQuery.length >= 2 && !exactMatch;

  async function handleCreate() {
    if (!onCreate || !normalizedQuery) return;
    setCreating(true);
    try {
      await onCreate(query.trim());
      setQuery("");
      setOpen(false);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        id={inputId}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-zinc-200 bg-white px-3 text-left text-sm transition",
          "hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <span className={cn("truncate", !selected && "text-zinc-400")}>
          {selected ? selected.label : (placeholder ?? "Selecione")}
        </span>
        <Search className="size-3.5 shrink-0 text-zinc-400" />
      </button>

      {open ? (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg">
          <div className="border-b border-zinc-100 p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Digite para buscar…"
              className="h-8 w-full rounded border border-zinc-200 bg-white px-2 text-sm outline-none focus:border-zinc-400"
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
                if (e.key === "Enter" && showCreate) {
                  e.preventDefault();
                  void handleCreate();
                }
              }}
            />
          </div>

          <ul className="max-h-60 overflow-auto py-1" role="listbox">
            {filtered.length === 0 && !showCreate ? (
              <li className="px-3 py-3 text-center text-xs text-zinc-500">
                {emptyHint ?? "Nenhum resultado."}
              </li>
            ) : null}

            {filtered.map((o) => {
              const active = o.id === value;
              return (
                <li key={o.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(o.id);
                      setQuery("");
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-100",
                      active && "bg-zinc-50",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-zinc-900">{o.label}</span>
                      {o.sublabel ? (
                        <span className="block truncate text-xs text-zinc-500">
                          {o.sublabel}
                        </span>
                      ) : null}
                    </span>
                    {active ? <Check className="size-3.5 text-zinc-900" /> : null}
                  </button>
                </li>
              );
            })}

            {showCreate ? (
              <li>
                <button
                  type="button"
                  disabled={creating}
                  onClick={handleCreate}
                  className="flex w-full items-center gap-2 border-t border-zinc-100 px-3 py-2 text-left text-sm font-medium text-zinc-900 hover:bg-emerald-50 disabled:opacity-60"
                >
                  <Plus className="size-3.5" />
                  {createLabel ? createLabel(query.trim()) : `Criar "${query.trim()}"`}
                  {creating ? <span className="ml-auto text-xs text-zinc-500">criando…</span> : null}
                </button>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
