export const DEFAULT_TIME_ZONE = "America/Sao_Paulo";

export const PETSHOP_TIME_ZONES = [
  { value: "America/Noronha", label: "Fernando de Noronha (UTC-2)" },
  { value: "America/Sao_Paulo", label: "Brasília / São Paulo (UTC-3)" },
  { value: "America/Fortaleza", label: "Fortaleza (UTC-3)" },
  { value: "America/Manaus", label: "Manaus (UTC-4)" },
  { value: "America/Cuiaba", label: "Cuiabá (UTC-4)" },
  { value: "America/Rio_Branco", label: "Rio Branco (UTC-5)" },
] as const;

export type PetshopTimeZone = (typeof PETSHOP_TIME_ZONES)[number]["value"];

export function isPetshopTimeZone(value: string): value is PetshopTimeZone {
  return PETSHOP_TIME_ZONES.some((item) => item.value === value);
}
