export function LegalDocument({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-800">
        Documento legal
      </p>
      <h1
        className="mt-3 text-[2.5rem] font-medium leading-[1.05] tracking-tight text-zinc-950"
        style={{ fontFamily: "var(--font-bricolage)" }}
      >
        {title}
      </h1>
      <p className="mt-4 text-[13px] text-zinc-500">
        Atualizado em {updatedAt}.
      </p>

      <div
        className="prose-content mt-10 space-y-7 text-[15px] leading-7 text-zinc-700"
        style={{ fontFamily: "var(--font-hanken)" }}
      >
        {children}
      </div>
    </div>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2
        className="text-[20px] font-medium tracking-tight text-zinc-950"
        style={{ fontFamily: "var(--font-bricolage)" }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
