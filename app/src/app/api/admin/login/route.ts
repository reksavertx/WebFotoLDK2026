import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");
    if (!username || !password) return Response.json({ error: "Username dan password wajib diisi." }, { status: 400 });
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.username, username)).limit(1);
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) return Response.json({ error: "Username atau password salah." }, { status: 401 });
    await createSession(admin.username);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Admin login failed:", error);
    return Response.json({ error: "Login tidak dapat diproses. Periksa koneksi database dan konfigurasi server." }, { status: 503 });
  }
}
