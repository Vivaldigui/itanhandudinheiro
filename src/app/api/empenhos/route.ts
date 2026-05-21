import { NextRequest, NextResponse } from "next/server";
import { getEmpenhos } from "@/lib/dashboardQueries";
import { parseFiltersFromSearchParams } from "@/lib/formatters";

export async function GET(request: NextRequest) {
  const filters = parseFiltersFromSearchParams(request.nextUrl.searchParams);
  const result = await getEmpenhos(filters);
  return NextResponse.json(result);
}

