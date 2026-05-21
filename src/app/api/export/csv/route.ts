import { NextRequest, NextResponse } from "next/server";
import { getEmpenhos } from "@/lib/dashboardQueries";
import { parseFiltersFromSearchParams } from "@/lib/formatters";
import { empenhosToCsv } from "@/modules/empenhos/exports";

export async function GET(request: NextRequest) {
  const filters = parseFiltersFromSearchParams(request.nextUrl.searchParams);
  const { items } = await getEmpenhos({ ...filters, page: 1, pageSize: 500 });
  const csv = empenhosToCsv(items);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=empenhos-itanhandu.csv"
    }
  });
}

