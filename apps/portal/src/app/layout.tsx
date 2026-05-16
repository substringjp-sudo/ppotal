import { constructMetadata, Analytics } from "@ppotal/ui";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = constructMetadata({
  title: "PPLANER - Unified Travel Hub",
  description: "Access your personalized travel tools: Rail Map, Regional Tracker, and Smart Planner.",
  url: "https://www.pplaner.com",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <Analytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
