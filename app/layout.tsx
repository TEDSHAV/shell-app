import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { SentrySessionSync } from "@/components/monitoring/sentry-session-sync";
import "./globals.css";

export const metadata: Metadata = {
  title: "SHA de Venezuela",
  description: "Portal centralizado de aplicaciones",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          disableTransitionOnChange
        >
          <SentrySessionSync />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
