import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/extension.ts"],
  format: ["cjs"],
  outDir: "./out",
  external: ["vscode"],
  sourcemap: true,
});
