import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Weekly Planner",
    short_name: "Planner",
    description: "A gamified weekly planner and habit tracker.",
    start_url: "/",
    display: "standalone",
    background_color: "#ececec",
    theme_color: "#090909",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
