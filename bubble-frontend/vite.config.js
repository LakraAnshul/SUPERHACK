import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const isProduction = mode === "production";
  const isGitHubPages = process.env.GITHUB_PAGES === "true";

  return {
    base: isProduction && isGitHubPages ? "/SUPERHACK/" : "/",
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
    },
    build: {
      outDir: "dist",
    },
  };
});
