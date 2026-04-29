import type { Metadata } from "next";
import { Sofia_Sans } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

// Sofia Sans is a variable-weight font (axes: wght 1–1000).
// Using weight: "variable" loads a single optimized file instead of 4 separate ones.
// The CSS variable "--font-sofia-sans" is mapped to --font-sans in globals.css @theme inline.
const sofiaSans = Sofia_Sans({
  variable: "--font-sofia-sans",
  subsets: ["latin"],
  weight: "variable",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aute Meet",
  description: "Agenda reuniones con el equipo de Aute",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${sofiaSans.variable} ${geistMono.variable} font-sans h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
