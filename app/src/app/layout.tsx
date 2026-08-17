import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pengumpulan Foto LDK SMK NEGERI 1 BATANG Tahun 2026",
  description: "Pengumpulan foto LDK SMK NEGERI 1 BATANG Tahun 2026",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="id"><body>{children}</body></html>; }
