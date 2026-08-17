import fs from "node:fs/promises";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { photos, students } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { storagePath } from "@/lib/storage";

export async function GET(_: Request, context: { params: Promise<{ studentId: string }> }) {
  try { await requireAdmin(); } catch { return new Response("Unauthorized", { status: 401 }); }
  const [row] = await db.select({ path: photos.storagePath, mimeType: photos.mimeType }).from(photos).innerJoin(students, eq(students.id, photos.studentId)).where(eq(students.studentId, (await context.params).studentId)).limit(1);
  if (!row) return new Response("Not found", { status: 404 });
  try { return new Response(await fs.readFile(storagePath(row.path)), { headers: { "content-type": row.mimeType, "cache-control": "private, max-age=60" } }); } catch { return new Response("Not found", { status: 404 }); }
}
