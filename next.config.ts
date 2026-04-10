import type { NextConfig } from "next";

const NEGOCIOS_URL =
  process.env.NEXT_PUBLIC_NEGOCIOS_URL ||
  "https://eozliv55b6zunhgas3xe7y14.95.111.237.109.sslip.io";

const CAPACITACION_URL =
  process.env.NEXT_PUBLIC_CAPACITACION_URL ||
  "https://v9yt0f79ntxxikurez2rk2xc.95.111.237.109.sslip.io";

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
