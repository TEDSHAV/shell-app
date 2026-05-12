import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const NEGOCIOS_URL =
  process.env.NEGOCIOS_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_NEGOCIOS_URL ||
  "https://negocios.shadevenezuela.com.ve";

const CAPACITACION_URL =
  process.env.CAPACITACION_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_CAPACITACION_URL ||
  "https://capacitacion.shadevenezuela.com.ve";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/negocios/_next/:path*",
        destination: `${NEGOCIOS_URL}/_next/:path*`,
      },
      {
        source: "/negocios/api/:path*",
        destination: `${NEGOCIOS_URL}/api/:path*`,
      },
      {
        source: "/capacitacion/_next/:path*",
        destination: `${CAPACITACION_URL}/_next/:path*`,
      },
      {
        source: "/capacitacion/api/:path*",
        destination: `${CAPACITACION_URL}/api/:path*`,
      },
    ];
  },
};

const sentry_org = process.env.SENTRY_ORG ?? "sha-de-venezuela";
const sentry_project = process.env.SENTRY_PROJECT ?? "shell-app";

export default withSentryConfig(nextConfig, {
  org: sentry_org,
  project: sentry_project,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
});
