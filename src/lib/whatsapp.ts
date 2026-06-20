/**
 * Build a `wa.me` deep-link for a Brazilian phone number with a pre-filled
 * message. Returns `null` when no usable number was provided.
 *
 * Number normalisation: keep digits only. If the result already starts with the
 * country code `55` we trust it; otherwise we prefix `55`. This handles the
 * common operator habits of typing "(19) 99999-0000", "5519999990000", or
 * "+55 19 99999-0000" — all collapse to the same E.164-without-plus form
 * wa.me expects.
 *
 * Hardcoded BR. When the SaaS targets other countries, swap this for a per-tenant
 * country setting.
 */
export function buildWhatsappUrl(
  rawPhone: string | null | undefined,
  message: string,
): string | null {
  if (!rawPhone) return null;
  const digits = rawPhone.replace(/\D+/g, "");
  if (digits.length < 10) return null; // shorter than a Brazilian landline → unusable
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}

type ConfirmationContext = {
  tutorName: string | null;
  petName: string | null;
  serviceName: string | null;
  startIso: string;
  petshopName: string;
};

const HHMM_BR = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Sao_Paulo",
});

const DATE_BR = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Sao_Paulo",
});

/**
 * Confirmation template. Kept short so operators can paste edits if needed.
 * Variables that are missing collapse silently rather than leaving a literal
 * `{placeholder}` in the outgoing message.
 */
export function buildConfirmationMessage(ctx: ConfirmationContext): string {
  const start = new Date(ctx.startIso);
  const time = HHMM_BR.format(start);
  const date = DATE_BR.format(start);

  const tutor = ctx.tutorName?.trim() || "tutor";
  const petPart = ctx.petName ? ` do(a) ${ctx.petName}` : "";
  const servicePart = ctx.serviceName ? ` (${ctx.serviceName})` : "";

  return [
    `Olá ${tutor}!`,
    `Agendamento confirmado${petPart}${servicePart}`,
    `Dia ${date} às ${time} — ${ctx.petshopName}.`,
    "Qualquer coisa é só chamar por aqui.",
  ].join("\n");
}
