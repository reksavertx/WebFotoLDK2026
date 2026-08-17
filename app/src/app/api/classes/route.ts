import { asc } from "drizzle-orm";
import { db } from "@/db";
import { classes } from "@/db/schema";

export async function GET() {
  return Response.json(await db.select({ id: classes.id, name: classes.name }).from(classes).orderBy(asc(classes.name)));
}
