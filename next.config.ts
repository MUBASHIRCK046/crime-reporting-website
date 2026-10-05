import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "sonner",
      "jspdf",
      "jspdf-autotable",
      "leaflet",
      "react-leaflet",
      "@base-ui/react",
      "animejs",
      "qrcode.react",
      "clsx",
      "tailwind-merge",
    ],
  },
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 8,
  },
  async redirects() {
    return [
      { source: "/dashboard", destination: "/citizen", permanent: false },
      { source: "/admin/dashboard", destination: "/admin", permanent: false },
      { source: "/police/dashboard", destination: "/police", permanent: false },
      { source: "/report", destination: "/citizen/report", permanent: false },
      { source: "/fir", destination: "/citizen/report", permanent: false },
      { source: "/csr", destination: "/citizen/csr", permanent: false },
      { source: "/signin", destination: "/login", permanent: false },
      { source: "/signup", destination: "/register", permanent: false },
      { source: "/sos-history", destination: "/admin/sos-history", permanent: false },
      { source: "/sos/history", destination: "/admin/sos-history", permanent: false },
    ];
  },
};

export default nextConfig;

