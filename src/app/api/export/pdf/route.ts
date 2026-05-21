import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { getEmpenhos } from "@/lib/dashboardQueries";
import { formatCurrency, formatDate, parseFiltersFromSearchParams } from "@/lib/formatters";

export const runtime = "nodejs";

async function pdfToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));
  doc.end();
  return done;
}

export async function GET(request: NextRequest) {
  const filters = parseFiltersFromSearchParams(request.nextUrl.searchParams);
  const { items } = await getEmpenhos({ ...filters, page: 1, pageSize: 120 });
  const doc = new PDFDocument({ size: "A4", margin: 42 });

  doc.fontSize(18).text("Onde vai o dinheiro de Itanhandu?", { align: "left" });
  doc.moveDown(0.3);
  doc.fontSize(12).fillColor("#475569").text("Relatório simplificado de empenhos públicos", { align: "left" });
  doc.moveDown();
  doc.fillColor("#111827").fontSize(10).text("Pontos de atenção são indicativos para conferência documental e não significam conclusão de irregularidade.");
  doc.moveDown();

  for (const item of items) {
    if (doc.y > 730) doc.addPage();
    doc.fontSize(11).fillColor("#111827").text(`Empenho ${item.numeroEmpenho} - ${item.credor}`, { continued: false });
    doc.fontSize(9).fillColor("#475569").text(`Data: ${formatDate(item.dataEmpenho ?? item.dataEmpenhoIso)} | Categoria: ${item.categoria} | Risco: ${item.riskLevel}`);
    doc.text(`Empenhado: ${formatCurrency(item.valorEmpenhado)} | Liquidado: ${formatCurrency(item.valorLiquidado)} | Pago: ${formatCurrency(item.valorPago)} | A pagar: ${formatCurrency(item.valorAPagar + item.valorLiquidadoAPagar)}`);
    if (item.alertas.length) doc.text(`Pontos de atenção: ${item.alertas.map((alerta) => alerta.tipo).join(", ")}`);
    doc.moveDown(0.7);
  }

  const buffer = await pdfToBuffer(doc);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=relatorio-empenhos-itanhandu.pdf"
    }
  });
}
