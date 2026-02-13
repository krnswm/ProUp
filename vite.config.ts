import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createServer } from "./server";
import { setupSocketServer } from "./server/socket";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    watch: {
      ignored: [
        "**/*.db",
        "**/*.db-journal",
        "**/*.db-wal",
        "**/*.db-shm",
        "**/dev.db*",
        "**/prisma/**",
        "**/node_modules/.prisma/**",
      ],
    },
    fs: {
      allow: [".", "./client", "./shared"],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
  },
  build: {
    outDir: "dist/spa",
  },
  plugins: [react(), expressPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    configureServer(server) {
      const app = createServer();

      if (server.httpServer) {
        setupSocketServer(server.httpServer);
      }

      // Add Express app as middleware to Vite dev server
      server.middlewares.use(app);
    },
  };
}
