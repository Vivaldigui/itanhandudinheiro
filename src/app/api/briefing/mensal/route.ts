import { NextRequest, NextResponse } from "next/server";
import { getEmpenhos } from "@/lib/dashboardQueries";
import { parseFiltersFromSearchParams } from "@/lib/formatters";
import { generateMonthlyBriefing } from "@/modules/empenhos/exports";

export async function GET(request: NextRequest) {
  const filters = parseFiltersFromSearchParams(request.nextUrl.searchParams);
  const now = new Date();
  const ano = filters.ano ?? now.getFullYear();
  const mes = filters.mes ?? now.getMonth() + 1;
  const { items } = await getEmpenhos({ ...filters, ano, mes, page: 1, pageSize: 500 });
  const markdown = generateMonthlyBriefing({ ano, mes, empenhos: items });
  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename=briefing-empenhos-${ano}-${String(mes).padStart(2, "0")}.md`
    }
  });
}

