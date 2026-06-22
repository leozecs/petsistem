const BOOKABLE_PETSHOP_STATUSES = new Set(["active", "trial"]);

export function isPetshopAcceptingBookings(status: string): boolean {
  return BOOKABLE_PETSHOP_STATUSES.has(status);
}

export function isPetshopOperational(status: string): boolean {
  return BOOKABLE_PETSHOP_STATUSES.has(status);
}
