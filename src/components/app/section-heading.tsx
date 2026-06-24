export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">{description}</p> : null}
      </div>
      {action ? (
        <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto [&>*]:max-sm:flex-1">
          {action}
        </div>
      ) : null}
    </div>
  );
}
