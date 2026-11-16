import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

const repoRoot = resolve(import.meta.dirname, "../..")

export default defineConfig(({ mode }) => {
  // Ports of the local services, from the root `.env`.
  const env = loadEnv(mode, repoRoot, "")

  return {
    plugins: [
      tanstackRouter({ target: "react", autoCodeSplitting: true }),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": resolve(import.meta.dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      // Same routing as Traefik in production, so the app is same-origin everywhere.
      proxy: {
        "/api": `http://localhost:${env.UVICORN_PORT}`,
      },
    },
  }
})
