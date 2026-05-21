import { NextResponse } from "next/server";
import { getAlertas } from "@/lib/dashboardQueries";

export async function GET() {
  return NextResponse.json({ items: await getAlertas() });
}

