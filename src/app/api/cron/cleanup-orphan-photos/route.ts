import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Cron diário (configurado em vercel.json). Limpa fotos do bucket
// `appointment-photos` cujos appointments estão soft-deleted há mais de 30 dias.
// Sequência:
//   1) acha appointments com deleted_at < now-30d
//   2) coleta checklists.id desses appointments
//   3) coleta photo_path de appointment_step_photos vinculados
//   4) remove objetos do storage em batches de 100
//   5) HARD DELETE dos appointments (cascade limpa checklists + photos rows)
//
// Gate: header `Authorization: Bearer ${CRON_SECRET}`. Vercel manda esse header
// automaticamente quando CRON_SECRET tá setada nas envs.

const RETENTION_DAYS = 30;
const STORAGE_BATCH = 100;

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return new NextResponse(null, { status: 404 });
  }
  const got = req.headers.get("authorization");
  if (got !== `Bearer ${expected}`) {
    return new NextResponse(null, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Service role indisponível." }, { status: 500 });
  }

  const cutoffIso = new Date(Date.now() - RETENTION_DAYS * 24 * 3600 * 1000).toISOString();

  // 1) Appointments soft-deleted há mais de RETENTION_DAYS
  const { data: stale, error: staleErr } = await admin
    .from("appointments")
    .select("id")
    .not("deleted_at", "is", null)
    .lt("deleted_at", cutoffIso);
  if (staleErr) {
    return NextResponse.json({ ok: false, error: staleErr.message }, { status: 500 });
  }
  const apptIds = (stale ?? []).map((a) => a.id);
  if (apptIds.length === 0) {
    return NextResponse.json({ ok: true, apptsDeleted: 0, photosRemoved: 0 });
  }

  // 2) Checklists desses appointments
  const { data: cks } = await admin
    .from("checklists")
    .select("id")
    .in("appointment_id", apptIds);
  const ckIds = (cks ?? []).map((c) => c.id);

  // 3) Photos
  let photoPaths: string[] = [];
  if (ckIds.length > 0) {
    const { data: photos } = await admin
      .from("appointment_step_photos")
      .select("photo_path")
      .in("checklist_id", ckIds);
    photoPaths = (photos ?? []).map((p) => p.photo_path).filter(Boolean);
  }

  // 4) Storage batch remove
  let photosRemoved = 0;
  for (let i = 0; i < photoPaths.length; i += STORAGE_BATCH) {
    const chunk = photoPaths.slice(i, i + STORAGE_BATCH);
    const { error } = await admin.storage.from("appointment-photos").remove(chunk);
    if (!error) photosRemoved += chunk.length;
  }

  // 5) HARD DELETE appointments — cascade cuida de checklists/photos/charges
  const { error: delErr } = await admin
    .from("appointments")
    .delete()
    .in("id", apptIds);
  if (delErr) {
    return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    apptsDeleted: apptIds.length,
    photosRemoved,
  });
}
