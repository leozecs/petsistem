"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LoginSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={cn(
        buttonVariants(),
        "h-12 w-full rounded-lg bg-zinc-950 text-base font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-80",
      )}
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Entrando…
        </>
      ) : (
        "Entrar"
      )}
    </button>
  );
}
