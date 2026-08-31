import { getActiveSettings } from "@/lib/settings";

export async function GET() {
  try {
    return Response.json(await getActiveSettings());
  } catch (error) {
    console.error("Get active settings failed:", error);
    return Response.json({ error: "Pengaturan tidak dapat dimuat." }, { status: 503 });
  }
}
