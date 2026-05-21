"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/formatters";
import type { DiariasSummary } from "@/modules/diarias/analyzer";

const palette = ["#22d3ee", "#a3e635", "#f59e0b", "#f472b6", "#38bdf8", "#c084fc"];

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4 shadow-soft">
      <h2 className="mb-3 text-base font-bold text-slate-900">{title}</h2>
      <div className="h-72">{children}</div>
    </div>
  );
}

export function DiariasCharts({ summary }: { summary: DiariasSummary }) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <ChartPanel title="Diárias e deslocamentos por mês">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={summary.porMes}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.25)" />
            <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#cbd5e1" }} />
            <YAxis tickFormatter={(value) => formatCurrency(Number(value)).replace("R$", "")} width={82} tick={{ fontSize: 12, fill: "#cbd5e1" }} />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ background: "#07111f", border: "1px solid rgba(34,211,238,.35)", color: "#e2f8ff" }} />
            <Legend />
            <Bar dataKey="valor" name="Valor" fill="#22d3ee" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Tipos de despesa de viagem">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ background: "#07111f", border: "1px solid rgba(34,211,238,.35)", color: "#e2f8ff" }} />
            <Legend />
            <Pie data={summary.porTipo} dataKey="value" nameKey="name" outerRadius={94} innerRadius={50} paddingAngle={2}>
              {summary.porTipo.map((_, index) => (
                <Cell key={index} fill={palette[index % palette.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Quem mais gastou">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={summary.topCredores} layout="vertical" margin={{ left: 18, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.25)" />
            <XAxis type="number" tickFormatter={(value) => formatCurrency(Number(value)).replace("R$", "")} tick={{ fontSize: 12, fill: "#cbd5e1" }} />
            <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 11, fill: "#cbd5e1" }} />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ background: "#07111f", border: "1px solid rgba(34,211,238,.35)", color: "#e2f8ff" }} />
            <Bar dataKey="value" name="Valor" fill="#a3e635" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Destinos mais citados">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={summary.topDestinos} layout="vertical" margin={{ left: 18, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.25)" />
            <XAxis type="number" tickFormatter={(value) => formatCurrency(Number(value)).replace("R$", "")} tick={{ fontSize: 12, fill: "#cbd5e1" }} />
            <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 11, fill: "#cbd5e1" }} />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ background: "#07111f", border: "1px solid rgba(34,211,238,.35)", color: "#e2f8ff" }} />
            <Bar dataKey="value" name="Valor" fill="#f472b6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>
    </section>
  );
}
