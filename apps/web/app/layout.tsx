import type { Metadata } from "next";
import Link from "next/link";
import { FirebaseProvider } from "@/components/auth/FirebaseProvider";
import { AuthButton } from "@/components/auth/AuthButton";
import { Footer } from "@/components/common/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Regionevel",
  description: "Regional Travel Tracker",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased min-h-screen flex flex-col">
        <FirebaseProvider>
          <nav className="flex items-center gap-4 px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
            <Link href="/" className="font-bold text-blue-700 text-lg tracking-tight">
              Regionevel
            </Link>
            <Link
              href="/map"
              className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
            >
              Map
            </Link>
            <Link
              href="/list"
              className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
            >
              List
            </Link>
            <div className="ml-auto">
              <AuthButton />
            </div>
          </nav>
          <main className="flex-1">{children}</main>
          <Footer />
        </FirebaseProvider>
      </body>
    </html>
  );
}
