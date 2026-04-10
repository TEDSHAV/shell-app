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

export default nextConfig;
