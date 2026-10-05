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
};

export default nextConfig;

