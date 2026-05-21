import { NextRequest, NextResponse } from "next/server";
import { sincronizarHistorico, sincronizarMes, sincronizarMesesFuturos } from "@/modules/empenhos/crawler";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const mode = body.mode ?? "mensal";

  if (mode === "historico") {
    const results = await sincronizarHistorico();
    return NextResponse.json({ mode, results });
  }

  if (mode === "futuros") {
    const results = await sincronizarMesesFuturos();
    return NextResponse.json({ mode, results });
  }

  const ano = Number(body.ano);
  const mes = Number(body.mes);
  if (!ano || !mes) {
    return NextResponse.json({ error: "Informe ano e mes, ou use mode=historico/futuros." }, { status: 400 });
  }

  const result = await sincronizarMes({ ano, mes });
  return NextResponse.json(result, { status: result.status === "ERRO" ? 500 : 200 });
}

