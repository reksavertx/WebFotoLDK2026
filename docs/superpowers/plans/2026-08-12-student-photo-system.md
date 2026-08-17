# Student Photo System Implementation Plan

> **For agentic workers:** Execute task-by-task with verification after each task.

**Goal:** Build a mobile-friendly Indonesian student photo collection system with public upload flow, protected admin dashboard, persistent PostgreSQL data, and ZIP/structured exports.

**Architecture:** A single Next.js App Router application owns UI and route handlers. Drizzle ORM accesses PostgreSQL; photos are processed with Sharp and stored on a persistent filesystem outside the database. Admin sessions use signed HTTP-only cookies.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Drizzle ORM, PostgreSQL, Sharp, Archiver, Zod, bcryptjs, jose, Vitest.

## Global Constraints

- UI is light, simple, mobile-friendly, and predominantly blue.
- Use `data/Logo-SMK.png` on student, admin login, and admin dashboard screens.
- Student identity is selected from database records; student ID is the CSV NIS.
- Upload accepts JPEG, PNG, and WEBP up to 5 MB and stores one active photo per student.
- Photo statuses are `pending`, `uploaded`, and `blur`.
- Admin endpoints and photo previews are protected.
- Uploads and generated ZIP files use persistent `data/uploads` and `data/generated` paths.

## Tasks

### Task 1: Scaffold and infrastructure
- Create the Next.js app under `app/` with package scripts, Tailwind, TypeScript, Vitest, env example, Docker Compose, and Nginx configuration.
- Add Drizzle schema and migration scripts for classes, students, photos, and admin users.

### Task 2: Domain and seed
- Parse `data/daftar_siswa_kelas_x.csv`, map `NO/NIS/NISN/NAMA/KELAS`, validate duplicates, and seed classes/students/admin credentials.
- Add pure tests for CSV parsing, status transitions, filename sanitization, and file signature validation.

### Task 3: Public upload flow
- Add public class/student APIs and a light-blue upload page with school logo, preview, client validation, and Indonesian error/success states.
- Add server-side upload validation, Sharp normalization to WebP, persistent storage, and idempotent photo upsert.

### Task 4: Admin authentication/dashboard
- Add login, signed HTTP-only session cookie, route protection, statistics, filters, pagination, thumbnails, status actions, delete action, and copy-name controls.

### Task 5: Import and exports
- Add CSV preview/commit import, class ZIP export with attendance-based names and missing-photo warning, and JSON/CSV structured export.

### Task 6: Verification and documentation
- Run tests, lint, typecheck, and production build; update README with local, Docker, seed, admin, storage, and backup instructions.
