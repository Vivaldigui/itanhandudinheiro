"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { DashboardSummary } from "@/modules/empenhos/types";
import { formatCurrency } from "@/lib/formatters";

const palette = ["#1f7a68", "#2563eb", "#b7791f", "#7c3aed", "#be123c", "#475569", "#0f766e", "#9333ea"];

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4 shadow-soft">
      <h2 className="mb-3 text-base font-bold text-slate-900">{title}</h2>
      <div className="h-72">{children}</div>
    </div>
  );
}

export function Charts({ summary }: { summary: DashboardSummary }) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <ChartPanel title="Empenhado x Liquidado x Pago por mês">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={summary.seriesMensal}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(value) => formatCurrency(Number(value)).replace("R$", "")} width={82} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Legend />
            <Bar dataKey="valorEmpenhado" name="Empenhado" fill="#1f7a68" radius={[4, 4, 0, 0]} />
            <Bar dataKey="valorLiquidado" name="Liquidado" fill="#2563eb" radius={[4, 4, 0, 0]} />
            <Bar dataKey="valorPago" name="Pago" fill="#64748b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Despesas por categoria">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Legend />
            <Pie data={summary.porCategoria} dataKey="value" nameKey="name" outerRadius={92} innerRadius={48} paddingAngle={2}>
              {summary.porCategoria.map((_, index) => (
                <Cell key={index} fill={palette[index % palette.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Top 10 credores por valor empenhado">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={summary.topCredores} layout="vertical" margin={{ left: 18, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" tickFormatter={(value) => formatCurrency(Number(value)).replace("R$", "")} tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Bar dataKey="value" name="Valor empenhado" fill="#1f7a68" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Top 10 processos de compra por valor">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={summary.topProcessos} layout="vertical" margin={{ left: 18, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" tickFormatter={(value) => formatCurrency(Number(value)).replace("R$", "")} tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Bar dataKey="value" name="Valor empenhado" fill="#2563eb" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Distribuição por nível de risco">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={summary.porRisco}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" name="Quantidade" fill="#b7791f" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Valores a pagar e a liquidar por mês">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={summary.seriesMensal}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(value) => formatCurrency(Number(value)).replace("R$", "")} width={82} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Legend />
            <Bar dataKey="valorALiquidar" name="A liquidar" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            <Bar dataKey="valorAPagar" name="A pagar" fill="#b7791f" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>
    </section>
  );
}

