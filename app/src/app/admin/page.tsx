"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Row = { id: number; studentId: string; name: string; attendanceNumber: number; className: string; status: string; uploadedAt: string | null; photoId: number | null };
type ClassRow = { id: number; name: string };
type Stats = { total: number; uploaded: number; blur: number; submitted: number; pending: number; submittedPercentage: number; pendingPercentage: number; pendingByClass: { className: string; total: number; pending: number }[] };
type PendingRow = { className: string; total: number; pending: number };

export default function AdminPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState("");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState<Stats>({ total: 0, uploaded: 0, blur: 0, submitted: 0, pending: 0, submittedPercentage: 0, pendingPercentage: 0, pendingByClass: [] });
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState<Row | null>(null);

  async function load() {
    const response = await fetch(`/api/admin/students?classId=${classId}&status=${status}&search=${encodeURIComponent(search)}`);
    if (!response.ok) return;
    const data = await response.json();
    setRows(data.rows); setStats(data.stats);
  }

  useEffect(() => { fetch("/api/classes").then((response) => response.json()).then(setClasses); }, []);
  useEffect(() => { load(); }, [classId, status]);

  useEffect(() => {
    if (!preview) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setPreview(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);

  async function mark(photoId: number | null, next: "blur" | "uploaded") {
    if (!photoId) return;
    await fetch(`/api/admin/photos/${photoId}/status`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: next }) });
    load();
  }

  async function copyNames(type: "pending" | "blur") {
    const text = await (await fetch(`/api/admin/names?status=${type}`)).text();
    await navigator.clipboard.writeText(text);
    setNotice(`Daftar ${type === "pending" ? "belum upload" : "foto blur"} berhasil disalin.`);
  }

  async function logout() { await fetch("/api/admin/logout", { method: "POST" }); location.href = "/admin/login"; }
  function exportZip() { location.href = classId ? `/api/admin/export/${classId}` : "/api/admin/export/all"; }
  function exportAllZip() { location.href = "/api/admin/export/all"; }

  return <main className="min-h-screen bg-slate-50">
    <header className="border-b border-blue-100 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><div className="flex items-center gap-3"><Image src="/logo-sekolah.png" alt="Logo sekolah" width={48} height={48} className="rounded-xl object-contain" /><div><p className="text-xs font-bold uppercase tracking-widest text-blue-600">LDK SMK NEGERI 1 BATANG</p><h1 className="font-black text-slate-900">Pengumpulan Foto LDK 2026</h1></div></div><button onClick={logout} className="rounded-lg px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100">Keluar</button></div></header>
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div className="grid gap-4 sm:grid-cols-3"><Stat label="Total Siswa" value={stats.total} /><Stat label="Sudah Upload" value={stats.submitted} color="text-green-600" /><Stat label="Foto Blur" value={stats.blur} color="text-amber-600" /></div>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-slate-900">Persentase Upload Keseluruhan</p>
          <div className="mt-4 flex items-center gap-5">
            <Donut submitted={stats.submittedPercentage} pending={stats.pendingPercentage} />
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-blue-600" /><span className="font-semibold text-slate-700">{stats.submittedPercentage}% sudah upload</span> <span className="text-slate-500">({stats.submitted} siswa)</span></p>
              <p className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-slate-200" /><span className="font-semibold text-slate-700">{stats.pendingPercentage}% belum upload</span> <span className="text-slate-500">({stats.pending} siswa)</span></p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-slate-900">Kelas Belum Upload Terbanyak</p>
          <div className="mt-4 space-y-2.5">{stats.pendingByClass.map((row) => <ClassBar key={row.className} row={row} max={stats.pendingByClass[0]?.pending ?? 0} />)}</div>
        </div>
      </section>
      <section className="rounded-2xl bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row"><select value={classId} onChange={(event) => setClassId(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2"><option value="">Semua kelas</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2"><option value="all">Semua status</option><option value="pending">Belum upload</option><option value="uploaded">Sudah upload</option><option value="blur">Blur</option></select><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && load()} placeholder="Cari nama atau NIS" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2" /><button onClick={() => copyNames("pending")} className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">Copy Belum Upload</button><button onClick={() => copyNames("blur")} className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700">Copy Foto Blur</button><button onClick={exportZip} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white">Download ZIP</button><button onClick={exportAllZip} className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-white">Download ZIP Semua</button></div>{notice && <p className="mt-3 text-sm font-semibold text-green-700">{notice}</p>}</section>
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-blue-50 text-xs uppercase text-blue-800"><tr><th className="px-4 py-3">Absen</th><th className="px-4 py-3">Nama</th><th className="px-4 py-3">Kelas</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Waktu Upload</th><th className="px-4 py-3">Aksi</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id}><td className="px-4 py-3 font-bold">{String(row.attendanceNumber).padStart(2, "0")}</td><td className="px-4 py-3 font-semibold">{row.status === "uploaded" || row.status === "blur" ? <button onClick={() => setPreview(row)} className="font-bold text-blue-700 hover:underline">{row.name}</button> : <span>{row.name}</span>}</td><td className="px-4 py-3 text-slate-500">{row.className}</td><td className="px-4 py-3"><Status status={row.status} /></td><td className="px-4 py-3 text-slate-500">{row.uploadedAt ? new Date(row.uploadedAt).toLocaleString("id-ID") : "-"}</td><td className="px-4 py-3">{row.status === "uploaded" ? <button onClick={() => mark(row.photoId, "blur")} className="font-bold text-amber-700">Tandai Blur</button> : row.status === "blur" ? <button onClick={() => mark(row.photoId, "uploaded")} className="font-bold text-green-700">Tandai Valid</button> : <span className="text-slate-400">-</span>}</td></tr>)}</tbody></table></div>{!rows.length && <p className="p-10 text-center text-slate-500">Tidak ada data yang cocok.</p>}</section>
    </div>
    {preview && <PreviewModal row={preview} onClose={() => setPreview(null)} />}
  </main>;
}

function Stat({ label, value, color = "text-blue-600" }: { label: string; value: number; color?: string }) { return <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-500">{label}</p><p className={`mt-2 text-3xl font-black ${color}`}>{value}</p></div>; }
function Donut({ submitted, pending }: { submitted: number; pending: number }) {
  const size = 120; const stroke = 14; const radius = (size - stroke) / 2; const circumference = 2 * Math.PI * radius;
  const filled = Math.max(0, Math.min(1, submitted / 100));
  return <div className="relative" style={{ width: size, height: size }}>
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#2563eb" strokeWidth={stroke} strokeDasharray={`${filled * circumference} ${circumference}`} strokeLinecap="round" />
    </svg>
    <div className="absolute inset-0 flex items-center justify-center"><p className="text-2xl font-black text-blue-700">{Math.round(submitted)}%</p></div>
  </div>;
}
function ClassBar({ row, max }: { row: PendingRow; max: number }) {
  const width = max ? Math.round((row.pending / max) * 100) : 0;
  const pct = row.total ? Math.round((row.pending / row.total) * 100) : 0;
  return <div>
    <div className="flex items-center justify-between text-xs font-semibold text-slate-600"><span>{row.className}</span><span>{row.pending} belum <span className="text-slate-400">({pct}%)</span></span></div>
    <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-500" style={{ width: `${width}%` }} /></div>
  </div>;
}
function Status({ status }: { status: string }) { const label = status === "blur" ? "⚠ Blur" : status === "uploaded" ? "✓ Sudah upload" : "○ Belum upload"; const style = status === "blur" ? "bg-amber-100 text-amber-800" : status === "uploaded" ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"; return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${style}`}>{label}</span>; }
function PreviewModal({ row, onClose }: { row: Row; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4" onClick={onClose}>
    <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
      <div className="mb-4 flex items-start justify-between gap-4"><div><h2 className="text-xl font-black text-slate-900">{row.name}</h2><p className="text-sm text-slate-500">{row.className} — Absen {String(row.attendanceNumber).padStart(2, "0")} · <Status status={row.status} /></p></div><button onClick={onClose} aria-label="Tutup" className="rounded-lg px-3 py-1.5 text-sm font-bold text-slate-500 hover:bg-slate-100">✕</button></div>
      <img src={`/api/photos/${row.studentId}`} alt={`Foto ${row.name}`} className="mx-auto max-h-[75vh] rounded-xl object-contain" />
    </div>
  </div>;
}