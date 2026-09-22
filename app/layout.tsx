import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { cookies } from "next/headers";
import { ThemeProvider } from "next-themes";
import { SentrySessionSync } from "@/components/monitoring/sentry-session-sync";
import {
  DEV_DB_COOKIE,
  dev_db_snapshot,
  parse_dev_db_target,
} from "@/lib/supabase/dev-db";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const snapshot = dev_db_snapshot(
    parse_dev_db_target(cookieStore.get(DEV_DB_COOKIE)?.value),
  );
  const inject = snapshot.enabled
    ? JSON.stringify({
        target: snapshot.target,
        staging: snapshot.staging,
        production: snapshot.production,
      })
    : null;

  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        {inject ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `window.__SHA_DEV_SB=${inject};`,
            }}
          />
        ) : null}
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
