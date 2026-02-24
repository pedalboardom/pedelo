import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vercel always serves the app at the root path, so no base override needed.
// For local dev run `vercel dev` (not `npm run dev`) so the /api/redis
// serverless function is available alongside the Vite dev server.
export default defineConfig({
  plugins: [react()],
});
