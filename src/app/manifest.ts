import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SchoolDB School Management",
    short_name: "SchoolDB",
    description:
      "School management for administrators, teachers, students, and families.",
    id: "/",
    start_url: "/choose-school",
    scope: "/",
    display: "standalone",
    background_color: "#f5f7ff",
    theme_color: "#4f46e5",
    orientation: "portrait-primary",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/pwa-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
