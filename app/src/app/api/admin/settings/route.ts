import { requireAdmin } from "@/lib/auth";
import { getSettings, SettingsValidationError, updateDraftSettings } from "@/lib/settings";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return Response.json(await getSettings());
  } catch (error) {
    console.error("Get admin settings failed:", error);
    return Response.json({ error: "Pengaturan tidak dapat dimuat." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Payload pengaturan tidak valid." }, { status: 400 });
  }

  try {
    await updateDraftSettings(body);
    return Response.json(await getSettings());
  } catch (error) {
    if (error instanceof SettingsValidationError) return Response.json({ error: error.message }, { status: 400 });
    console.error("Update draft settings failed:", error);
    return Response.json({ error: "Pengaturan tidak dapat disimpan." }, { status: 503 });
  }
}
