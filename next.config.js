/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export", // ✅ SSG para Tauri
  images: { unoptimized: true },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Otimizações de produção
  productionBrowserSourceMaps: false, // Desabilitar source maps

  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? {
      exclude: ["error", "warn"], // Manter apenas error e warn
    } : false,
  },



  // Otimizar bundle
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      'lucide-react',
    ],
  },
};

module.exports = nextConfig;
