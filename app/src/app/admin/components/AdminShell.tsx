"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { appPath } from "@/lib/paths";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/form", label: "Pengaturan Form" },
  { href: "/admin/reuse", label: "Gunakan Kembali" },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  async function logout() {
    try {
      await fetch(appPath("/api/admin/logout"), { method: "POST" });
    } finally {
      router.replace("/admin/login");
    }
  }

  if (pathname === "/admin/login") return <>{children}</>;

  return <div className="min-h-screen bg-slate-50 md:flex">
    <aside className="hidden w-72 shrink-0 flex-col border-r border-blue-100 bg-white md:flex">
      <ShellContent pathname={pathname} onNavigate={() => undefined} onLogout={logout} />
    </aside>

    <header className="flex items-center justify-between border-b border-blue-100 bg-white px-4 py-3 md:hidden">
      <Link href="/admin" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
        <Image src={appPath("/logo-sekolah.png")} alt="Logo sekolah" width={40} height={40} className="rounded-xl object-contain" />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">LDK SMK NEGERI 1 BATANG</p>
          <p className="font-black text-slate-900">Admin Foto</p>
        </div>
      </Link>
      <button type="button" aria-label="Buka menu admin" aria-expanded={mobileOpen} aria-controls="admin-mobile-menu" onClick={() => setMobileOpen(true)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
        Menu
      </button>
    </header>

    {mobileOpen && <>
      <button type="button" aria-label="Tutup menu admin" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-slate-900/40 md:hidden" />
      <aside id="admin-mobile-menu" aria-label="Menu admin" className="fixed inset-y-0 left-0 z-50 flex w-[min(20rem,88vw)] flex-col bg-white shadow-2xl md:hidden">
        <ShellContent pathname={pathname} onNavigate={() => setMobileOpen(false)} onLogout={logout} />
      </aside>
    </>}

    <div className="min-w-0 flex-1">
      <main>{children}</main>
    </div>
  </div>;
}

function ShellContent({ pathname, onNavigate, onLogout }: { pathname: string; onNavigate: () => void; onLogout: () => void }) {
  return <>
    <div className="flex items-center gap-3 border-b border-blue-50 px-5 py-5">
      <Image src={appPath("/logo-sekolah.png")} alt="Logo sekolah" width={48} height={48} className="rounded-xl object-contain" />
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">LDK SMK NEGERI 1 BATANG</p>
        <p className="font-black text-slate-900">Admin Foto</p>
      </div>
    </div>
    <nav aria-label="Navigasi admin" className="flex-1 space-y-1 p-4">
      {links.map((link) => {
        const active = pathname === link.href;
        return <Link key={link.href} href={link.href} onClick={onNavigate} className={`block rounded-xl px-4 py-3 text-sm font-bold transition ${active ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"}`} aria-current={active ? "page" : undefined}>
          {link.label}
        </Link>;
      })}
    </nav>
    <div className="border-t border-slate-100 p-4">
      <button type="button" onClick={onLogout} className="w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800">
        Keluar
      </button>
    </div>
  </>;
}
