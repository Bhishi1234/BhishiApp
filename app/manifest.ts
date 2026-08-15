import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bhishi",
    short_name: "Bhishi",
    description: "Record-keeping for Bhishi, Kameti, and Committee groups.",
    start_url: "/groups",
    display: "standalone",
    background_color: "#fff8f1",
    theme_color: "#c45c26",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
