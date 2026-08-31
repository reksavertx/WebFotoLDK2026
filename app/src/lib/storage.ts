import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { validateImageSignature } from "./domain";

const maxSize = Number(process.env.UPLOAD_MAX_SIZE ?? 5 * 1024 * 1024);
const uploadDir = process.env.UPLOAD_DIR ?? path.resolve(process.cwd(), "../data/uploads");

export async function processUpload(file: File, submissionKey: string) {
  if (!file.size || file.size > maxSize) throw new Error("Ukuran foto terlalu besar atau kosong.");
  const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!allowed.has(file.type)) throw new Error("Format foto harus JPG, PNG, atau WEBP.");
  const input = Buffer.from(await file.arrayBuffer());
  if (!validateImageSignature(input, file.type)) throw new Error("File foto tidak valid atau rusak.");
  await fs.mkdir(uploadDir, { recursive: true });
  const filename = `${submissionKey}.jpg`;
  const absolutePath = storagePath(filename);
  try {
    await sharp(input).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toFile(absolutePath);
    const stat = await fs.stat(absolutePath);
    return { storagePath: filename, absolutePath, fileSize: stat.size, mimeType: "image/jpeg" };
  } catch (error) {
    await removeStoredFile(filename);
    throw error;
  }
}

export function storagePath(filename: string) {
  const root = path.resolve(uploadDir);
  const resolved = path.resolve(root, filename);
  if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error("Invalid storage path");
  return resolved;
}

export async function removeStoredFile(filename: string) {
  try {
    await fs.unlink(storagePath(filename));
  } catch {
    // Cleanup must not mask the upload or database result.
  }
}

export { uploadDir };
