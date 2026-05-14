import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { config } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: `Setter Dashboard — ${config.agentName}`,
  description: `CRM agent setter IA pour ${config.agentName}`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
