import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        /* Recharts is ~3x the size of everything else in the app put
           together. Splitting it out means it's fetched once, cached across
           deploys that only touch app code, and never blocks first paint —
           the tabs and charts that need it already load lazily. */
        manualChunks: {
          recharts: ["recharts"],
        },
      },
    },
  },
});
