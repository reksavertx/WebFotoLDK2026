import fs from "node:fs/promises";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { db } from "@/db";
import { photoSubmissions } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { storagePath } from "@/lib/storage";
import { imageVariant } from "@/lib/thumbnail";

export async function GET(request: Request, context: { params: Promise<{ submissionKey: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const { submissionKey } = await context.params;
  const [row] = await db.select({ path: photoSubmissions.storagePath, mimeType: photoSubmissions.mimeType }).from(photoSubmissions).where(eq(photoSubmissions.submissionKey, submissionKey)).limit(1);
  if (!row) return new Response("Not found", { status: 404 });

  try {
    const buffer = await fs.readFile(storagePath(row.path));
    const body = imageVariant(new URL(request.url).searchParams.get("variant")) === "thumb"
      ? await sharp(buffer).resize({ width: 240, height: 240, fit: "inside", withoutEnlargement: true }).toBuffer()
      : buffer;
    return new Response(new Uint8Array(body), { headers: { "content-type": row.mimeType, "cache-control": "private, max-age=60" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
