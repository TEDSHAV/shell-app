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

const SERVICIOS_URL =
  process.env.SERVICIOS_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_SERVICIOS_URL ||
  "https://st.shadevenezuela.com.ve";

const nextConfig: NextConfig = {
  output: "standalone",
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
      {
        source: "/servicios-tecnicos/_next/:path*",
        destination: `${SERVICIOS_URL}/_next/:path*`,
      },
      {
        source: "/servicios-tecnicos/api/:path*",
        destination: `${SERVICIOS_URL}/api/:path*`,
      },
    ];
  },
};

const sentry_org = process.env.SENTRY_ORG ?? "sha-de-venezuela";
const sentry_project = process.env.SENTRY_PROJECT ?? "shell-app";
const sentry_auth_token = process.env.SENTRY_AUTH_TOKEN;
const has_valid_sentry_token =
  sentry_auth_token && !sentry_auth_token.includes("...");

export default withSentryConfig(nextConfig, {
  org: sentry_org,
  project: sentry_project,
  authToken: has_valid_sentry_token ? sentry_auth_token : undefined,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
  sourcemaps: {
    disable: !has_valid_sentry_token,
  },
});
