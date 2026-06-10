"use client";

import { useMapStore } from "@/store/mapStore";
import { usePathname } from "next/navigation";
import { Download } from "lucide-react";

export function ExportMapButton() {
  const pathname = usePathname();
  const requestExport = useMapStore((state) => state.requestExport);
  
  // Only show on the map page
  if (!pathname || !pathname.startsWith("/map")) return null;

  return (
    <button
      onClick={requestExport}
      className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1.5 active:scale-95 cursor-pointer focus:outline-none"
      title="Export Map as Image"
    >
      <Download className="w-4 h-4" />
      <span>Export</span>
    </button>
  );
}
