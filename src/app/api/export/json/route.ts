import { NextRequest, NextResponse } from "next/server";
import { getEmpenhos } from "@/lib/dashboardQueries";
import { parseFiltersFromSearchParams } from "@/lib/formatters";

export async function GET(request: NextRequest) {
  const filters = parseFiltersFromSearchParams(request.nextUrl.searchParams);
  const { items, total } = await getEmpenhos({ ...filters, page: 1, pageSize: 500 });
  return NextResponse.json({
    fonte: "Portal Cidadão da Prefeitura Municipal de Itanhandu",
    modulo: "empenhos",
    total,
    items
  });
}

