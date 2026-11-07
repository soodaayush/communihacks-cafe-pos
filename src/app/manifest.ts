import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest. TODO(dev2): service worker for offline (see public/sw.js).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KW Habilitation Café",
    short_name: "Café",
    start_url: "/register",
    display: "standalone",
    background_color: "#faf6ef",
    theme_color: "#faf6ef",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
