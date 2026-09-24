import {defineConfig} from "@playwright/test";
process.env.CLICK_COMPLETION_PRODUCTION="1";
export default defineConfig({testDir:"./tests",testMatch:"click-completion-ui-2026-09-12.spec.ts",workers:1,timeout:90000,use:{baseURL:"http://127.0.0.1:4194",viewport:{width:320,height:844}},outputDir:"output/click-completion-sept12-production",webServer:{command:"node ./node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4194 --strictPort",url:"http://127.0.0.1:4194/",reuseExistingServer:false}});
