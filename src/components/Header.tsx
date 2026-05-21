import Link from "next/link";
import Image from "next/image";
import { FileText, Home, LockKeyhole, Plane, Table2 } from "lucide-react";

const futureModules = ["Licitações", "Contratos", "Obras", "Receitas", "Fornecedores"];

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between lg:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-3 md:w-72">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded border border-cyan-300/40 bg-slate-950 shadow-neon">
            <Image src="/brand/icon.png" alt="" width={44} height={44} className="h-full w-full object-cover" />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-bold leading-tight text-slate-950">Onde vai o dinheiro de Itanhandu?</span>
            <span className="block text-xs text-slate-600">Transparencia municipal pesquisavel</span>
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-2 text-sm">
          <Link className="focus-ring inline-flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-slate-700 shadow-sm hover:border-folha-600 hover:text-folha-800" href="/">
            <Home size={16} aria-hidden="true" />
            Visão geral
          </Link>
          <Link className="focus-ring inline-flex items-center gap-2 rounded border border-folha-600 bg-folha-600 px-3 py-2 font-semibold text-white shadow-sm hover:bg-folha-800" href="/dashboard">
            <Table2 size={16} aria-hidden="true" />
            Empenhos
          </Link>
          <Link className="focus-ring inline-flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-slate-700 shadow-sm hover:border-folha-600 hover:text-folha-800" href="/diarias">
            <Plane size={16} aria-hidden="true" />
            Diárias
          </Link>
          {futureModules.map((module) => (
            <span key={module} className="inline-flex cursor-not-allowed items-center gap-1 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500" title={`${module} será incorporado em fase futura`}>
              <LockKeyhole size={14} aria-hidden="true" />
              {module}
              <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">em breve</span>
            </span>
          ))}
          <Link className="focus-ring inline-flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-slate-700 shadow-sm hover:border-folha-600 hover:text-folha-800" href="/api/briefing/mensal">
            <FileText size={16} aria-hidden="true" />
            Briefing
          </Link>
        </nav>
      </div>
    </header>
  );
}
