import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/extension.ts"],
  clean: true,
  format: ["cjs"],
  outDir: "./out",
  external: ["vscode"],
  sourcemap: true,
});
