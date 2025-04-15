import { defineConfig } from "vite";
import { resolve } from "path";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const filesNeedToExclude: string[] = [
  // "src/services/ScriptExecutor.ts",
  // "src/services/PdfExportService.ts",
  // "src/utils/bringToFront.ts",
  // "src/utils/evaluateCommand.ts",
];

// const filesPathToExclude = filesNeedToExclude.map((src) => {
//   return fileURLToPath(new URL(src, import.meta.url));
// });

// https://vitejs.dev/config/
export default defineConfig({
  mode: "development",
  build: {
    outDir: resolve(__dirname, "out/web"),
    rollupOptions: {
      input: resolve(__dirname, "src/web/extension.ts"),
      output: {
        format: "cjs",
        entryFileNames: "webext.js",
      },
      external: ["vscode"],
    },
  },
  resolve: {
    alias: {
      // Add any necessary aliases here
    },
    dedupe: ["vscode"], // Dedupe vscode if necessary
  },
  define: {
    "process.env": {},
  },
  plugins: [nodePolyfills()],
});
