import { NextRequest, NextResponse } from "next/server";
import { getDiarias } from "@/lib/diariasQueries";
import { parseFiltersFromSearchParams } from "@/lib/formatters";

export async function GET(request: NextRequest) {
  const filters = parseFiltersFromSearchParams(request.nextUrl.searchParams);
  const result = await getDiarias(filters);
  return NextResponse.json(result);
}
