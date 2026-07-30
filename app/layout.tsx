import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Sans_Condensed, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import ThemeSync from "@/components/ThemeSync";

/**
 * Superfamília única (decisão D1 do frontend-redesign-plan).
 * Antes: Geist + Geist Mono + Inter + JetBrains Mono — 4 famílias para
 * 2 papéis reais. IBM Plex cobre os 3 papéis com desenho de contexto
 * técnico, que é o vocabulário do produto.
 *
 * Regra: mono nunca como display. Só dado tabular (R$, código de OS,
 * SKU, datas, protocolo).
 */
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const plexCondensed = IBM_Plex_Sans_Condensed({
  variable: "--font-plex-condensed",
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trust Care | Sistema de Gestão para Assistências Técnicas",
  description: "Gerencie ordens de serviço, clientes, estoque e financeiro da sua assistência técnica em um só lugar. Experimente grátis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${plexSans.variable} ${plexCondensed.variable} ${plexMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('os-theme');
                  if (theme === 'light') {
                    document.documentElement.classList.add('light');
                  } else if (theme === 'dark') {
                    document.documentElement.classList.remove('light');
                  } else {
                    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
                      document.documentElement.classList.add('light');
                    }
                  }
                } catch (e) {}
              })();
            `
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
