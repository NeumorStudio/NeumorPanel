import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // IPs de la red local desde las que se abre el servidor de desarrollo (móvil)
  allowedDevOrigins: ["192.168.1.69", "192.168.1.104"],
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
