"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

/**
 * Mostra "Tente novamente em MM:SS" e atualiza por segundo até a janela
 * expirar. Quando zera, recarrega a página pra liberar o form sem o usuário
 * precisar mexer.
 */
export function RateLimitBanner({ untilIso }: { untilIso: string }) {
  const target = new Date(untilIso).getTime();
  const [remainingSec, setRemainingSec] = useState(() =>
    Math.max(0, Math.ceil((target - Date.now()) / 1000)),
  );

  useEffect(() => {
    if (remainingSec <= 0) {
      // Volta pra /login limpo pra retirar o erro e liberar o form.
      window.location.assign("/login");
      return;
    }
    const id = setInterval(() => {
      const next = Math.max(0, Math.ceil((target - Date.now()) / 1000));
      setRemainingSec(next);
    }, 1000);
    return () => clearInterval(id);
  }, [remainingSec, target]);

  const mm = Math.floor(remainingSec / 60);
  const ss = remainingSec % 60;
  const label = `${mm}:${String(ss).padStart(2, "0")}`;

  return (
    <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <div className="flex items-start gap-2">
        <Clock className="mt-0.5 size-4 shrink-0" />
        <div>
          <p className="font-semibold">Muitas tentativas seguidas</p>
          <p className="mt-1 text-xs">
            Por segurança, o login ficou bloqueado por alguns minutos. Tente
            novamente em{" "}
            <span className="font-mono font-bold">{label}</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
