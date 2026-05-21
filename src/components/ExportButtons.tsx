"use client";

import { Download, FileJson, FileText } from "lucide-react";

function currentQuery() {
  if (typeof window === "undefined") return "";
  return window.location.search;
}

export function ExportButtons() {
  const query = currentQuery();
  const items = [
    { href: `/api/export/csv${query}`, label: "Exportar CSV", icon: Download },
    { href: `/api/export/json${query}`, label: "Exportar JSON", icon: FileJson },
    { href: `/api/briefing/mensal${query}`, label: "Briefing mensal", icon: FileText },
    { href: `/api/export/pdf${query}`, label: "Relatório PDF", icon: FileText }
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <a key={item.href} href={item.href} className="inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-folha-600 hover:text-folha-800">
            <Icon size={16} aria-hidden="true" />
            {item.label}
          </a>
        );
      })}
    </div>
  );
}

