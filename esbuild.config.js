require("esbuild").buildSync({
  entryPoints: ["src/entrypoints/browser/index.tsx"],
  bundle: true,
  minify: true,
  format: "cjs",
  sourcemap: true,
  outfile: "dist/public/browser.js",
});
