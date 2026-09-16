import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { trimReferenceMedia } from "./scripts/trim-reference-media.mjs";

export default defineConfig({
  build: {
    outDir: "dist/client",
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "react-core",
              test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/,
              priority: 30,
            },
            {
              name: "radix-ui",
              test: /node_modules[\\/]@radix-ui[\\/]/,
              priority: 20,
            },
            {
              name: "motion-gesture",
              test: /node_modules[\\/](?:motion|motion-dom|motion-utils|@use-gesture)[\\/]/,
              priority: 10,
            },
            {
              name: "teacher-feedback",
              test: /src[\\/]features[\\/]feedback[\\/]/,
              priority: 15,
            },
          ],
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    // Office holds temporary output files open while validating exports on Windows.
    watch: { ignored: ["**/output/**", "**/test-results/**", "**/playwright-report/**"] },
  },
  plugins: [react(), {
    name: "lightweight-reference-text",
    apply: "build",
    closeBundle() { trimReferenceMedia("dist/client"); },
  }],
});
