import { eq } from "drizzle-orm";
import { db } from "@/db";
import { photos } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }
  const id = Number((await context.params).id); const body = await request.json().catch(() => ({})); const status = body.status === "blur" ? "blur" : "uploaded";
  await db.update(photos).set({ status, updatedAt: new Date() }).where(eq(photos.id, id));
  return Response.json({ ok: true });
}
