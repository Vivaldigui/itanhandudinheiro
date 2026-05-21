import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Database, FileSearch, ShieldCheck, Table2 } from "lucide-react";
import { Layout } from "@/components/Layout";

export default function HomePage() {
  return (
    <Layout>
      <section className="grid min-h-[calc(100vh-7rem)] gap-8 py-8 lg:grid-cols-[0.98fr_1.02fr] lg:items-center">
        <div>
          <p className="mb-3 inline-flex rounded bg-folha-100 px-3 py-1 text-sm font-semibold text-folha-800">MVP 1: módulo de Empenhos</p>
          <h1 className="max-w-3xl text-4xl font-black tracking-normal text-slate-950 md:text-6xl">Onde vai o dinheiro de Itanhandu?</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-700">
            Uma ferramenta para transformar dados públicos em informação clara para cidadãos e vereadores.
          </p>
          <p className="mt-4 max-w-2xl leading-7 text-slate-600">
            O Onde vai o dinheiro de Itanhandu? começa pelos empenhos públicos, que mostram os compromissos de despesa assumidos pela Prefeitura. Futuramente, a plataforma poderá incorporar outros dados públicos, como contratos, licitações, diárias, obras e receitas.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/dashboard" className="inline-flex items-center gap-2 rounded bg-folha-600 px-5 py-3 font-semibold text-white shadow-soft hover:bg-folha-800">
              Ver dashboard
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link href="/empenhos" className="inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 shadow-sm hover:border-folha-600 hover:text-folha-800">
              Ver empenhos
            </Link>
            <Link href="/api/export/json" className="inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 shadow-sm hover:border-folha-600 hover:text-folha-800">
              Baixar dados abertos
            </Link>
          </div>
        </div>

        <div className="rounded border border-slate-200 bg-white p-5 shadow-soft">
          <Image src="/brand/logo-transparent.png" alt="Onde vai o dinheiro de Itanhandu?" width={1500} height={844} priority className="mx-auto mb-5 h-auto w-full max-w-xl rounded" />
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <div className="text-sm font-bold text-slate-950">Empenhos públicos</div>
              <div className="text-xs text-slate-500">Portal Cidadão de Itanhandu</div>
            </div>
            <span className="rounded bg-folha-100 px-2.5 py-1 text-xs font-bold text-folha-800">ativo</span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {["Empenhado", "Pago", "A pagar"].map((label, index) => (
              <div key={label} className="rounded border border-slate-200 p-3">
                <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
                <div className="mt-2 h-7 rounded bg-slate-100">
                  <div className="h-7 rounded bg-folha-600" style={{ width: `${82 - index * 18}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-3">
            {[
              ["1120/2026", "Saúde", "Ponto de atenção"],
              ["1188/2026", "Merenda", "Sem ponto"],
              ["1211/2026", "Frota", "Verificar documentos"]
            ].map(([empenho, categoria, alerta]) => (
              <div key={empenho} className="grid grid-cols-[1fr_1fr_1.2fr] gap-3 rounded border border-slate-100 bg-slate-50 px-3 py-3 text-sm">
                <span className="font-semibold text-slate-900">{empenho}</span>
                <span className="text-slate-700">{categoria}</span>
                <span className="text-slate-600">{alerta}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 pb-10 md:grid-cols-4">
        <InfoCard icon={<Table2 size={20} />} title="O que são empenhos" text="Empenhos registram compromissos de despesa assumidos pela administração antes do pagamento." />
        <InfoCard icon={<Database size={20} />} title="De onde vêm os dados" text="Os PDFs são baixados do Portal Cidadão, na área pública de Analítico de Empenhos." />
        <InfoCard icon={<FileSearch size={20} />} title="Como os alertas são gerados" text="O sistema cruza valor, credor, processo, histórico e saldos para criar pontos de atenção." />
        <InfoCard icon={<ShieldCheck size={20} />} title="Limitação importante" text="Alerta não significa irregularidade. É apenas uma sugestão de conferência documental." />
      </section>
    </Layout>
  );
}

function InfoCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4 shadow-soft">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded bg-folha-100 text-folha-800">{icon}</div>
      <h2 className="font-bold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}
