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
        "h-12 w-full rounded-lg bg-emerald-800 text-base font-semibold text-[#f7f5ef] shadow-sm transition hover:bg-emerald-900 disabled:opacity-80",
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
