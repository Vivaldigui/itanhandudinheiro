import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EmpenhoDetailDrawer } from "@/components/EmpenhoDetailDrawer";
import { Layout } from "@/components/Layout";
import { getEmpenhoById } from "@/lib/dashboardQueries";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EmpenhoDetailPage({ params }: PageProps) {
  const { id } = await params;
  const empenho = await getEmpenhoById(id);
  if (!empenho) notFound();

  return (
    <Layout>
      <div className="mb-4">
        <Link href="/empenhos" className="inline-flex items-center gap-2 rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-folha-600 hover:text-folha-800">
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar para empenhos
        </Link>
      </div>
      <EmpenhoDetailDrawer empenho={empenho} />
    </Layout>
  );
}

