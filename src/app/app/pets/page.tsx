import { redirect } from "next/navigation";

// Pets are managed inline within the Tutores & Pets page (unified CRUD).
// Keep this route as a redirect so existing bookmarks and the nav link of
// veterinarian-role users still land on a valid page.
export default function PetsRedirectPage() {
  redirect("/app/clientes");
}
