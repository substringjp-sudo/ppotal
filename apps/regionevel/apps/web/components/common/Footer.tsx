"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();
  // Hide footer on map and list views to keep them fullscreen
  if (pathname === "/" || pathname === "/map" || pathname === "/list") return null;

  return (
    <footer className="bg-white border-t border-gray-200 py-6 px-4 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex gap-3 text-sm text-gray-500 flex-wrap justify-center">
          <span>© {new Date().getFullYear()} Regionevel. All rights reserved.</span>
          <span className="text-gray-350 hidden sm:inline">|</span>
          <Link href="/privacy" className="hover:underline text-blue-500">
            Privacy Policy
          </Link>
        </div>
        <div className="text-xs text-gray-400 text-center md:text-right">
          Boundary data provided by{" "}
          <Link
            href="https://www.geoboundaries.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            geoBoundaries
          </Link>
          , licensed under{" "}
          <Link
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            CC BY 4.0
          </Link>
          .
          <br className="md:hidden" />
          <span className="md:ml-2">
            Citation: Runfola, D. et al. (2020) PLoS ONE 15(4).
          </span>
        </div>
      </div>
    </footer>
  );
}
