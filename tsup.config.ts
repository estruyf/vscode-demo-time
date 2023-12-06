import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/extension.ts"],
  clean: true,
  format: ["cjs"],
  minify: true,
  outDir: "./out",
  external: ["vscode"],
  sourcemap: true,
});
