import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  publicDir: false,
  resolve: { alias: { "@": resolve(import.meta.dirname, "./src") } },
  build: {
    outDir: "../backend/app/modules/mcp/ui",
    emptyOutDir: true,
    rollupOptions: { input: resolve(import.meta.dirname, "mcp-app.html") },
  },
})
