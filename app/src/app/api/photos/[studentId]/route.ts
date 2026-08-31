import fs from "node:fs/promises";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { photoSubmissions, students } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { storagePath } from "@/lib/storage";

export async function GET(_: Request, context: { params: Promise<{ studentId: string }> }) {
  try { await requireAdmin(); } catch { return new Response("Unauthorized", { status: 401 }); }
  const [row] = await db.select({ path: photoSubmissions.storagePath, mimeType: photoSubmissions.mimeType }).from(photoSubmissions).innerJoin(students, eq(students.id, photoSubmissions.studentId)).where(eq(students.studentId, (await context.params).studentId)).limit(1);
  if (!row) return new Response("Not found", { status: 404 });
  try { return new Response(await fs.readFile(storagePath(row.path)), { headers: { "content-type": row.mimeType, "cache-control": "private, max-age=60" } }); } catch { return new Response("Not found", { status: 404 }); }
}
