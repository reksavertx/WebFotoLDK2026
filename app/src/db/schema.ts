import { int, mysqlEnum, mysqlTable, text, timestamp, unique, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

const formModeValues = ["list", "free"] as const;
const submissionStatusValues = ["uploaded", "blur"] as const;
export const formMode = mysqlEnum("form_mode", formModeValues);
export const submissionStatus = mysqlEnum("submission_status", submissionStatusValues);

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

export const eventSettings = mysqlTable("event_settings", {
  id: int("id").default(1).primaryKey(),
  draftMode: mysqlEnum("draft_mode", formModeValues).default("list").notNull(),
  activeMode: mysqlEnum("active_mode", formModeValues).default("list").notNull(),
  draftTitle: varchar("draft_title", { length: 160 }).default("Pengumpulan Foto LDK").notNull(),
  activeTitle: varchar("active_title", { length: 160 }).default("Pengumpulan Foto LDK").notNull(),
  draftYear: varchar("draft_year", { length: 4 }).default("2026").notNull(),
  activeYear: varchar("active_year", { length: 4 }).default("2026").notNull(),
  draftDescription: varchar("draft_description", { length: 500 }).default("Pengumpulan foto LDK SMK NEGERI 1 BATANG Tahun 2026").notNull(),
  activeDescription: varchar("active_description", { length: 500 }).default("Pengumpulan foto LDK SMK NEGERI 1 BATANG Tahun 2026").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const photoSubmissions = mysqlTable("photo_submissions", {
  id: int("id").autoincrement().primaryKey(),
  submissionKey: varchar("submission_key", { length: 64 }).notNull().unique(),
  sourceMode: mysqlEnum("source_mode", formModeValues).notNull(),
  studentId: int("student_id").references(() => students.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 160 }).notNull(),
  className: varchar("class_name", { length: 100 }),
  attendanceNumber: int("attendance_number"),
  nis: varchar("nis", { length: 32 }),
  storagePath: text("storage_path").notNull(),
  originalFilename: text("original_filename").notNull(),
  mimeType: varchar("mime_type", { length: 80 }).notNull(),
  fileSize: int("file_size").notNull(),
  status: mysqlEnum("status", submissionStatusValues).default("uploaded").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [uniqueIndex("photo_submissions_student_id_unique").on(table.studentId)]);

export const adminUsers = mysqlTable("admin_users", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 80 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
