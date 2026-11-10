import type { MetadataRoute } from "next";

// Lo que hace falta para instalar el panel como app (móvil y ordenador).
// En iPhone los avisos solo llegan si el panel está añadido a la pantalla de inicio.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NeumorPanel",
    short_name: "NeumorPanel",
    description: "Los proyectos de NeumorStudio, en un vistazo",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: "es",
    background_color: "#f6f7fa",
    theme_color: "#f6f7fa",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
