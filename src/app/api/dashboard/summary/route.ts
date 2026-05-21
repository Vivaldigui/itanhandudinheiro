import { NextRequest, NextResponse } from "next/server";
import { getDashboardSummary } from "@/lib/dashboardQueries";
import { parseFiltersFromSearchParams } from "@/lib/formatters";

export async function GET(request: NextRequest) {
  const filters = parseFiltersFromSearchParams(request.nextUrl.searchParams);
  const summary = await getDashboardSummary(filters);
  return NextResponse.json(summary);
}

