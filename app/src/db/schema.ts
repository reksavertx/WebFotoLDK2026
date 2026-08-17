import { int, mysqlEnum, mysqlTable, text, timestamp, unique, varchar } from "drizzle-orm/mysql-core";

export const photoStatus = mysqlEnum("status", ["pending", "uploaded", "blur"]);

export const classes = mysqlTable("classes", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const students = mysqlTable("students", {
  id: int("id").autoincrement().primaryKey(),
  studentId: varchar("student_id", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  classId: int("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  attendanceNumber: int("attendance_number").notNull(),
  nisn: varchar("nisn", { length: 32 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [unique("students_class_attendance_unique").on(table.classId, table.attendanceNumber)]);

export const photos = mysqlTable("photos", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("student_id").notNull().references(() => students.id, { onDelete: "cascade" }).unique(),
  storagePath: text("storage_path").notNull(),
  originalFilename: text("original_filename").notNull(),
  mimeType: varchar("mime_type", { length: 80 }).notNull(),
  fileSize: int("file_size").notNull(),
  status: photoStatus.default("uploaded").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const adminUsers = mysqlTable("admin_users", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 80 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
