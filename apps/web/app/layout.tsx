import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Regionevel",
  description: "지역 방문 트래커",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <nav className="flex items-center gap-4 px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
          <span className="font-bold text-blue-700 text-lg tracking-tight">Regionevel</span>
          <Link
            href="/map"
            className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
          >
            지도
          </Link>
          <Link
            href="/list"
            className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
          >
            목록
          </Link>
        </nav>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
