import { NextResponse } from "next/server";
import { getEmpenhoById } from "@/lib/dashboardQueries";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const empenho = await getEmpenhoById(id);
  if (!empenho) return NextResponse.json({ error: "Empenho não encontrado" }, { status: 404 });
  return NextResponse.json(empenho);
}

