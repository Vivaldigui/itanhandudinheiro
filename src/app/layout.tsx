import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Onde vai o dinheiro de Itanhandu?",
  description: "Visualização cidadã dos empenhos públicos da Prefeitura Municipal de Itanhandu."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

