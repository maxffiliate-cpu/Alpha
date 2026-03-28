import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Alpha - Controlador IA",
  description: "Panel de IA Empresarial Premium",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.variable} font-sans bg-slate-950 text-slate-200 min-h-screen flex`}>
        {children}
      </body>
    </html>
  );
}
