import { parseStudentCsv } from "@/lib/domain";
import { requireAdmin } from "@/lib/auth";

export async function POST(request: Request) {
  try { await requireAdmin(); } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }
  try {
    const file = (await request.formData()).get("file");
    if (!(file instanceof File)) return Response.json({ error: "File CSV wajib dipilih." }, { status: 400 });
    const rows = parseStudentCsv(await file.text());
    return Response.json({ count: rows.length, classes: [...new Set(rows.map((row) => row.className))] });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "CSV tidak valid." }, { status: 400 });
  }
}
