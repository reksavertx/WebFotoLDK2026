import fs from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { db, pool } from "./index";
import { adminUsers, classes, eventSettings, students } from "./schema";
import { eq } from "drizzle-orm";
import { parseStudentCsv } from "../lib/domain";
import { defaultEventSettings } from "../lib/settings";

async function main() {
  const csvPath = process.env.STUDENTS_CSV ?? path.resolve(process.cwd(), "../data/daftar_siswa_kelas_x.csv");
  const rows = parseStudentCsv(await fs.readFile(csvPath, "utf8"));
  const classIds = new Map<string, number>();

  for (const row of rows) {
    let classId = classIds.get(row.className);
    if (!classId) {
      await db.insert(classes).values({ name: row.className }).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
      const [classRow] = await db.select({ id: classes.id }).from(classes).where(eq(classes.name, row.className)).limit(1);
      if (!classRow) throw new Error(`Class not found after upsert: ${row.className}`);
      classId = classRow.id;
      classIds.set(row.className, classId);
    }

    await db
      .insert(students)
      .values({ studentId: row.studentId, name: row.name, classId, attendanceNumber: row.attendanceNumber, nisn: row.nisn })
      .onDuplicateKeyUpdate({ set: { name: row.name, classId, attendanceNumber: row.attendanceNumber, nisn: row.nisn, updatedAt: new Date() } });
  }

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (username && password) {
    const passwordHash = await bcrypt.hash(password, 12);
    await db.insert(adminUsers).values({ username, passwordHash }).onDuplicateKeyUpdate({ set: { passwordHash, updatedAt: new Date() } });
  }

  await db.insert(eventSettings).values({
    id: 1,
    draftMode: defaultEventSettings.mode,
    activeMode: defaultEventSettings.mode,
    draftTitle: defaultEventSettings.title,
    activeTitle: defaultEventSettings.title,
    draftYear: defaultEventSettings.year,
    activeYear: defaultEventSettings.year,
    draftDescription: defaultEventSettings.description,
    activeDescription: defaultEventSettings.description,
  }).onDuplicateKeyUpdate({ set: { id: 1 } });

  console.log(`Seeded ${rows.length} students in ${classIds.size} classes.`);
  await pool.end();
}

main().catch(async (error) => {
  console.error("Seed failed:", error);
  await pool.end();
  process.exitCode = 1;
});
