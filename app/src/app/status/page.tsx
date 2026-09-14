"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { appPath } from "@/lib/paths";
import { publicStatusApiPath, publicStatusLabel } from "@/lib/public-status-ui";
import type { PublicClassSummary, PublicFreeRow, PublicFreeStats, PublicListStats, PublicListRow, PublicStatus, PublicStatusSettings } from "@/lib/public-status";

type ListResponse = {
  mode: "list";
  settings: PublicStatusSettings;
  stats: Omit<PublicListStats, "classes">;
  classes: PublicClassSummary[];
};

type FreeResponse = {
  mode: "free";
  settings: PublicStatusSettings;
  stats: Omit<PublicFreeStats, "rows">;
  submissions: PublicFreeRow[];
};

type StatusResponse = ListResponse | FreeResponse;

export default function StatusPage() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(signal?: AbortSignal) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(publicStatusApiPath(), { signal });
      const responseData = await response.json().catch(() => null) as { error?: string } | StatusResponse | null;
      if (!response.ok) throw new Error(responseData && "error" in responseData ? responseData.error : "Status upload tidak dapat dimuat.");
      if (!responseData || !("mode" in responseData)) throw new Error("Data status upload tidak valid.");
      if (!signal?.aborted) setData(responseData);
    } catch (loadError) {
      if (signal?.aborted || (loadError instanceof Error && loadError.name === "AbortError")) return;
      setData(null);
      setError(loadError instanceof Error ? loadError.message : "Status upload tidak dapat dimuat.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, []);

  if (!data) return <StatusState loading={loading} error={error} onRetry={() => void load()} />;

  return <main className="min-h-screen bg-blue-50 px-4 py-6 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="rounded-3xl bg-white p-6 shadow-xl shadow-blue-100 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Status Upload Publik</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl">{data.settings.title}</h1>
            <p className="mt-2 text-lg font-bold text-blue-700">Tahun {data.settings.year}</p>
            <p className="mt-3 max-w-3xl text-slate-500">{data.settings.description}</p>
          </div>
          <nav aria-label="Navigasi status" className="flex flex-wrap gap-2">
            <Link href={appPath("/")} className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-50">Kembali ke Form</Link>
          </nav>
        </div>
      </header>

      {data.mode === "list" ? <ListStatus data={data} /> : <FreeStatus data={data} />}
    </div>
  </main>;
}

function ListStatus({ data }: { data: ListResponse }) {
  const [search, setSearch] = useState("");
  const { stats, classes } = data;
  const filteredClasses = classes.filter((item) => item.className.toLowerCase().includes(search.trim().toLowerCase()));

  return <>
    <section aria-label="Ringkasan upload" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total Siswa" value={stats.total} />
      <StatCard label="Sudah Upload" value={stats.submitted} color="text-green-600" />
      <StatCard label="Belum Upload" value={stats.pending} color="text-slate-600" />
      <StatCard label="Progress" value={`${stats.progress}%`} color="text-blue-700" />
    </section>

    <ProgressSection progress={stats.progress} submitted={stats.submitted} blur={stats.blur} total={stats.total} />
    <ClassChart classes={classes} />

    <section className="space-y-4" aria-labelledby="class-details-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Rincian</p><h2 id="class-details-title" className="text-2xl font-black text-slate-900">Detail Per Kelas</h2></div>
        <label className="w-full sm:max-w-xs"><span className="sr-only">Cari kelas</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama kelas" className="w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm outline-none ring-blue-500 focus:ring-2" /></label>
      </div>
      {filteredClasses.length ? filteredClasses.map((item) => <ClassDetails key={item.className} summary={item} />) : <EmptyPanel>{classes.length ? "Tidak ada kelas yang cocok dengan pencarian." : "Belum ada data kelas untuk ditampilkan."}</EmptyPanel>}
    </section>
  </>;
}

function FreeStatus({ data }: { data: FreeResponse }) {
  const { stats, submissions } = data;

  return <>
    <section aria-label="Ringkasan submission" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total Submission" value={stats.total} />
      <StatCard label="Sudah Upload" value={stats.submitted} color="text-green-600" />
      <StatCard label="Foto Blur" value={stats.blur} color="text-amber-600" />
      <StatCard label="Progress Submission" value={`${stats.progress}%`} color="text-blue-700" />
    </section>

    <ProgressSection progress={stats.progress} submitted={stats.submitted} blur={stats.blur} total={stats.total} />
    <section aria-labelledby="free-details-title" className="space-y-4">
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Rincian</p><h2 id="free-details-title" className="text-2xl font-black text-slate-900">Nama Bebas</h2></div>
      {submissions.length ? <div className="overflow-hidden rounded-2xl bg-white shadow-sm"><div className="divide-y divide-slate-100">{submissions.map((row, index) => <SubmissionRow key={`${row.name}-${row.uploadedAt ?? index}`} row={row} />)}</div></div> : <EmptyPanel>Belum ada submission nama bebas.</EmptyPanel>}
    </section>
  </>;
}

function StatCard({ label, value, color = "text-blue-600" }: { label: string; value: number | string; color?: string }) {
  return <article className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-500">{label}</p><p className={`mt-2 text-3xl font-black ${color}`}>{value}</p></article>;
}

function ProgressSection({ progress, submitted, blur, total }: { progress: number; submitted: number; blur: number; total: number }) {
  const width = Math.max(0, Math.min(100, progress));
  return <section aria-label="Progress keseluruhan" className="rounded-2xl bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-end justify-between gap-2"><div><p className="text-sm font-bold text-slate-900">Progress Upload Keseluruhan</p><p className="mt-1 text-sm text-slate-500">{submitted} dari {total} data sudah masuk - {blur} foto blur.</p></div><p className="text-2xl font-black text-blue-700">{progress}%</p></div><div className="mt-4 h-4 overflow-hidden rounded-full bg-blue-100" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progress upload"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${width}%` }} /></div></section>;
}

function ClassChart({ classes }: { classes: PublicClassSummary[] }) {
  const chartWidth = 640;
  const chartHeight = 190;
  const max = Math.max(...classes.map((item) => item.total), 1);
  const slot = chartWidth / Math.max(classes.length, 1);
  const barWidth = Math.max(8, Math.min(42, slot - 14));

  return <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6" aria-labelledby="class-chart-title">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-bold text-slate-900">Status Upload Per Kelas</p><h2 id="class-chart-title" className="mt-1 text-lg font-black text-blue-700">Grafik ringkas</h2></div><div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-600"><span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-blue-600" />Sudah upload</span><span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-amber-400" />Blur</span><span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-slate-200" />Belum upload</span></div></div>
    {classes.length ? <div className="mt-5 overflow-x-auto"><svg role="img" aria-label="Grafik status upload per kelas" viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-52 min-w-[36rem] w-full"><line x1="20" y1="150" x2="620" y2="150" stroke="#dbeafe" strokeWidth="2" />{classes.map((item, index) => { const x = index * slot + (slot - barWidth) / 2; const totalHeight = (item.total / max) * 118; const submittedHeight = (item.uploaded / Math.max(item.total, 1)) * totalHeight; const blurHeight = (item.blur / Math.max(item.total, 1)) * totalHeight; const pendingHeight = totalHeight - submittedHeight - blurHeight; return <g key={item.className}><title>{`${item.className}: ${item.uploaded} upload, ${item.blur} blur, ${item.pending} belum`}</title><rect x={x} y={150 - totalHeight} width={barWidth} height={totalHeight} rx="5" fill="#e2e8f0" /><rect x={x} y={150 - submittedHeight} width={barWidth} height={submittedHeight} rx="5" fill="#2563eb" /><rect x={x} y={150 - submittedHeight - blurHeight} width={barWidth} height={blurHeight} fill="#fbbf24" /><rect x={x} y={150 - totalHeight} width={barWidth} height={pendingHeight} rx="5" fill="#e2e8f0" /><text x={x + barWidth / 2} y="170" textAnchor="middle" fontSize="10" fill="#475569">{item.className.length > 10 ? `${item.className.slice(0, 9)}...` : item.className}</text></g>; })}</svg></div> : <EmptyPanel>Belum ada data kelas untuk dibuatkan grafik.</EmptyPanel>}
  </section>;
}

function ClassDetails({ summary }: { summary: PublicClassSummary }) {
  return <article className="overflow-hidden rounded-2xl bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-lg font-black text-slate-900">{summary.className}</h3><p className="mt-1 text-sm text-slate-500">{summary.uploaded + summary.blur} dari {summary.total} sudah upload - {summary.progress}%</p></div><div className="w-full sm:max-w-xs"><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(0, Math.min(100, summary.progress))}%` }} /></div></div></div></div><div className="divide-y divide-slate-100">{summary.students.length ? summary.students.map((row, index) => <StudentRow key={`${row.name}-${row.attendanceNumber}-${index}`} row={row} />) : <p className="p-5 text-sm text-slate-500">Belum ada siswa di kelas ini.</p>}</div></article>;
}

function StudentRow({ row }: { row: PublicListRow }) {
  const nameColor = row.status === "uploaded" ? "text-green-700" : row.status === "pending" ? "text-red-700" : "text-amber-700";
  return <div className="flex flex-col gap-2 border-b border-slate-100 p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"><div className="min-w-0"><p className={`truncate font-bold ${nameColor}`}>{row.name}</p><p className="mt-1 text-xs font-semibold text-slate-500">Absen {String(row.attendanceNumber).padStart(2, "0")}</p></div><div className="flex items-center justify-between gap-3 sm:justify-end"><StatusPill status={row.status} /><span className="text-right text-xs text-slate-500">{formatUploadTime(row.uploadedAt)}</span></div></div>;
}

function SubmissionRow({ row }: { row: PublicFreeRow }) {
  return <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"><p className="font-bold text-slate-900">{row.name}</p><div className="flex items-center justify-between gap-3 sm:justify-end"><StatusPill status={row.status} /><span className="text-right text-xs text-slate-500">{formatUploadTime(row.uploadedAt)}</span></div></div>;
}

function StatusPill({ status }: { status: PublicStatus }) {
  const style = status === "uploaded" ? "bg-green-100 text-green-800" : status === "blur" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-700";
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${style}`}>{publicStatusLabel(status)}</span>;
}

function EmptyPanel({ children }: { children: string }) {
  return <div className="rounded-2xl bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm">{children}</div>;
}

function StatusState({ loading, error, onRetry }: { loading: boolean; error: string; onRetry: () => void }) {
  return <main className="flex min-h-screen items-center justify-center bg-blue-50 px-4 py-8"><section className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl shadow-blue-100"><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Status Upload Publik</p><h1 className="mt-2 text-2xl font-black text-slate-900">Status Upload</h1>{loading ? <p role="status" className="mt-3 text-sm text-slate-500">Memuat status upload...</p> : <><p role="alert" className="mt-3 text-sm font-semibold text-red-700">{error || "Status upload tidak dapat dimuat."}</p><button type="button" onClick={onRetry} className="mt-6 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700">Coba lagi</button></>}</section></main>;
}

function formatUploadTime(value: Date | string | null): string {
  if (!value) return "Belum upload";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Waktu tidak tersedia";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
