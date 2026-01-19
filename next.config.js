/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: "export",               // SSG para Tauri
  images: { unoptimized: true },

  // 👉 Otimizações de produção (mantidas, mas simples)
  poweredByHeader: false,         // Remove cabeçalho X-Powered-By
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // Fix for PDF.js in Next.js 15
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

module.exports = nextConfig;