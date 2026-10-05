import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig(({ mode }) => {
  const base = mode === "development" ? "/" : "/dodepecho/";
  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: "prompt",
        includeAssets: ["favicon.svg", "icon-192.png", "icon-512.png"],
        manifest: {
          name: "Dodepecho · Tu piano de práctica",
          short_name: "Dodepecho",
          lang: "es",
          description:
            "Ejercicios de vocalización y rutinas con acompañamiento de piano, sin conexión.",
          theme_color: "#284c3f",
          background_color: "#f6f7f2",
          display: "standalone",
          start_url: base,
          scope: base,
          icons: [
            { src: `${base}icon-192.png`, sizes: "192x192", type: "image/png" },
            {
              src: `${base}icon-512.png`,
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: `${base}icon-512.png`,
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,png,svg,woff2,mp3}"],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          navigateFallback: `${base}index.html`,
        },
      }),
    ],
  };
});
