import { requireAdmin } from "@/lib/auth";
import { activateSettings } from "@/lib/settings";

export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return Response.json(await activateSettings());
  } catch (error) {
    console.error("Activate settings failed:", error);
    return Response.json({ error: "Pengaturan tidak dapat diaktifkan." }, { status: 503 });
  }
}
