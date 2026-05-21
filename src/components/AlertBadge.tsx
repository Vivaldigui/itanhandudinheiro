import clsx from "clsx";

export function RiskBadge({ level }: { level: string }) {
  const className = clsx("inline-flex items-center rounded px-2.5 py-1 text-xs font-semibold", {
    "bg-slate-100 text-slate-700": level === "Baixo",
    "bg-amber-100 text-amber-800": level === "Médio",
    "bg-orange-100 text-orange-800": level === "Alto",
    "bg-rose-100 text-rose-800": level === "Crítico"
  });
  return <span className={className}>{level === "Crítico" ? "Prioridade de análise" : level}</span>;
}

export function CategoryBadge({ category }: { category: string }) {
  return <span className="inline-flex rounded bg-folha-100 px-2.5 py-1 text-xs font-semibold text-folha-800">{category}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  return <span className="inline-flex rounded bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">{status}</span>;
}

export function AlertCountBadge({ count }: { count: number }) {
  if (count === 0) return <span className="text-xs text-slate-500">Sem ponto</span>;
  return <span className="inline-flex rounded bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">{count} ponto{count > 1 ? "s" : ""}</span>;
}

