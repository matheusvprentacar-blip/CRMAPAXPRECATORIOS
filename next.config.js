/** @type {import('next').NextConfig} */
const isProdBuild = process.env.NODE_ENV === "production";
const isVercelBuild = process.env.VERCEL === "1";
const appVersion = process.env.npm_package_version || "0.0.0";
const nextConfig = {
  reactStrictMode: false,
  // Em dev mantemos server features (ex.: route handlers).
  // Em produção na Vercel precisamos de runtime server para /api/*.
  // O export estático continua para builds locais/Tauri.
  output: isProdBuild && !isVercelBuild ? "export" : undefined,
  images: { unoptimized: true },

  // 👉 Otimizações de produção (mantidas, mas simples)
  poweredByHeader: false,         // Remove cabeçalho X-Powered-By
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
  turbopack: {
    resolveAlias: {
      canvas: "./lib/shims/empty.js",
    },
  },

  // Fix for PDF.js in Next.js 15
  webpack: (config) => {
    config.resolve.alias.canvas = "./lib/shims/empty.js";
    return config;
  },
};

module.exports = nextConfig;
