const PIX_BY_PLAN = {
  starter: "00020126650014BR.GOV.BCB.PIX0114+55119728716160225Plano Starter - PetSistem520400005303986540549.995802BR5925LEONARDO RODRIGUES TAVARE6007VINHEDO622605226xsktGCGc5hcmXmymvjaHN63042E57",
  professional: "00020126700014BR.GOV.BCB.PIX0114+55119728716160230Plano Profissional - PetSistem520400005303986540599.995802BR5925LEONARDO RODRIGUES TAVARE6007VINHEDO622605225XAMo9tyDnnPLEee1qmOZk63047482",
  premium: "00020126650014BR.GOV.BCB.PIX0114+55119728716160225Plano Premium - PetSistem5204000053039865406139.995802BR5925LEONARDO RODRIGUES TAVARE6007VINHEDO622605227CTc7YYMVKq8KhlJZhaJuQ6304FF8E",
} as const;

export function pixPayloadForPlan(planName: string) {
  const normalized = planName.toLocaleLowerCase("pt-BR");
  if (normalized.includes("premium")) return PIX_BY_PLAN.premium;
  if (normalized.includes("profissional") || normalized.includes("professional")) return PIX_BY_PLAN.professional;
  return PIX_BY_PLAN.starter;
}
