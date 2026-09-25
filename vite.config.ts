import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { trimReferenceMedia } from "./scripts/trim-reference-media.mjs";
import { createBuildIdentity } from "./scripts/build-identity.mjs";

const buildIdentity = createBuildIdentity(import.meta.dirname);
const analyzeBundle = process.env.MAARIF_BUNDLE_ANALYZE === "1";

export default defineConfig({
  // MaarifOS is deployed at the origin root. Absolute asset URLs keep the
  // app-shell valid when a cached SPA route such as /gunum/... starts offline.
  base: "/",
  define: { __MAARIF_BUILD__: JSON.stringify(buildIdentity) },
  build: {
    outDir: "dist/client",
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "react-core",
              test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/,
              priority: 100,
            },
            {
              name: "radix-ui",
              test: /node_modules[\\/]@radix-ui[\\/]/,
              priority: 100,
            },
            {
              name: "motion-gesture",
              test: /node_modules[\\/](?:motion|motion-dom|motion-utils|@use-gesture)[\\/]/,
              priority: 100,
            },
            {
              name: "spreadsheet-vendor",
              test: /node_modules[\\/]xlsx[\\/]/,
              priority: 100,
            },
            {
              name: "teacher-feedback",
              test: /src[\\/]features[\\/]feedback[\\/]/,
              priority: 15,
            },
            {
              name: "official-forms",
              test: /src[\\/]features[\\/]official-forms[\\/]/,
              priority: 15,
            },
            {
              name: "prototype-runtime",
              test: /src[\\/]Prototype\.tsx$/,
              // Keep shared dependencies in their own groups; a high priority folds them into this chunk.
              priority: 1,
            },
            {
              name: "tymm-textbook-catalog",
              test: /src[\\/]features[\\/]official-forms[\\/]tymm-textbook-catalog\.ts$/,
              priority: 95,
            },
            {
              name: "tymm-plan-library",
              test: /src[\\/]features[\\/]official-forms[\\/](?:tymm-domain-chips|ek15-catalog|MEBOfficialSkillsPortal)\.(?:ts|tsx)$/,
              priority: 95,
            },
            {
              name: "tymm-plan-workflows",
              test: /src[\\/]features[\\/]official-forms[\\/](?:TYMMPlanHub|SmartDailyPlanWizard)\.(?:ts|tsx)$/,
              priority: 90,
            },
            {
              name: "local-vault-runtime",
              test: /src[\\/]core[\\/]security[\\/]/,
              priority: 85,
            },
            {
              name: "local-repository-runtime",
              test: /src[\\/]core[\\/]repository[\\/]/,
              priority: 85,
            },
            {
              name: "local-data-runtime",
              test: /src[\\/]features[\\/](?:dashboard|today|day-closure|students|evidence)[\\/]/,
              priority: 80,
            },
            {
              name: "landing-site",
              test: /src[\\/]features[\\/]landing[\\/]/,
              priority: 75,
            },
            {
              name: "optional-workspaces",
              test: /src[\\/]features[\\/](?:anecdote|curriculum|portfolio|district|chatgpt-bridge|accreditation|vision|ambient|commercial)[\\/]/,
              priority: 70,
            },
          ],
        },
      },
    },
  },
  server: {
    hmr: process.env.MOBILE_RUNTIME_EXTERNAL_SERVER === "1" ? false : undefined,
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    // Office holds temporary output files open while validating exports on Windows.
    watch: { ignored: ["**/output/**", "**/test-results/**", "**/playwright-report/**"] },
  },
  plugins: [react(), {
    name: "build-identity",
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "build-info.json", source: JSON.stringify(buildIdentity, null, 2) });
    },
  }, {
    name: "lightweight-reference-text",
    apply: "build",
    closeBundle() { trimReferenceMedia("dist/client"); },
  }, {
    name: "bundle-composition-receipt",
    apply: "build",
    generateBundle(_options, bundle) {
      if (!analyzeBundle) return;
      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk" || (!output.isEntry && output.code.length < 500_000)) continue;
        const largestModules = Object.entries(output.modules)
          .map(([id, details]) => ({ id, bytes: details.renderedLength }))
          .sort((left, right) => right.bytes - left.bytes)
          .slice(0, 40);
        console.log(`BUNDLE_ENTRY ${output.fileName}`);
        for (const module of largestModules) {
          console.log(`${module.bytes}\t${module.id}`);
        }
      }
    },
  }],
});
