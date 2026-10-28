import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // alamat lama sebelum panel dipindah ke /back-office
  async redirects() {
    return [
      { source: "/login", destination: "/back-office/login", permanent: false },
      { source: "/landing", destination: "/", permanent: false },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
