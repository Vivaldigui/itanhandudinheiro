import { NextRequest, NextResponse } from "next/server";
import { getDiariasSummary } from "@/lib/diariasQueries";
import { parseFiltersFromSearchParams } from "@/lib/formatters";

export async function GET(request: NextRequest) {
  const filters = parseFiltersFromSearchParams(request.nextUrl.searchParams);
  const summary = await getDiariasSummary(filters);
  return NextResponse.json(summary);
}
