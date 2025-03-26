import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/preview/webcomponents/index.ts"],
  clean: true,
  minify: true,
  platform: "browser",
  format: "iife",
  outDir: "./out/webcomponents",
  sourcemap: true,
});
