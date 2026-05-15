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
      className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md border border-slate-700 transition-all text-xs font-bold uppercase tracking-widest group active:scale-95"
      title="Export Map as Image"
    >
      <Download size={14} className="group-hover:translate-y-0.5 transition-transform" />
      <span>Export Map</span>
    </button>
  );
}
