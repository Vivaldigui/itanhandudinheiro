import { NextResponse } from "next/server";
import { getSyncStatus } from "@/lib/dashboardQueries";

export async function GET() {
  return NextResponse.json(await getSyncStatus());
}

