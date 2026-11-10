import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // IPs de la red local desde las que se abre el servidor de desarrollo (móvil)
  allowedDevOrigins: ["192.168.1.69", "192.168.1.104"],
  experimental: {
    serverActions: {
      // las capturas de las fichas se suben por una acción; llegan comprimidas (< 3,8 MB)
      bodySizeLimit: "4mb",
    },
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
