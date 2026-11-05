import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function spaFallbackPlugin() {
  return {
    name: "spa-fallback-plugin",
    closeBundle() {
      const distDir = path.resolve(__dirname, "dist");
      const indexPath = path.join(distDir, "index.html");
      if (!fs.existsSync(indexPath)) return;
      const html = fs.readFileSync(indexPath, "utf-8");

      // 1. Create 404.html (Render static sites automatically serve 404.html on any unmatched route)
      fs.writeFileSync(path.join(distDir, "404.html"), html);

      // 2. Pre-generate physical route files & directories so Render serves them with HTTP 200 directly
      const routes = ["login", "dashboard", "projects", "pages", "bugs", "users"];
      for (const route of routes) {
        fs.writeFileSync(path.join(distDir, `${route}.html`), html);

        const routeDir = path.join(distDir, route);
        if (!fs.existsSync(routeDir)) {
          fs.mkdirSync(routeDir, { recursive: true });
        }
        fs.writeFileSync(path.join(routeDir, "index.html"), html);
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), spaFallbackPlugin()]
});
