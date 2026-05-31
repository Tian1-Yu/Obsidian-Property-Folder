import esbuild from "esbuild";

const prod = process.argv[2] === "production";

const context = await esbuild.context({
  bundle: true,
  entryPoints: ["src/main.ts"],
  external: ["obsidian"],
  format: "cjs",
  logLevel: "info",
  outfile: "main.js",
  platform: "browser",
  sourcemap: false,
  target: "es2018",
  treeShaking: true,
  minify: prod
});

if (prod) {
  await context.rebuild();
  await context.dispose();
} else {
  await context.watch();
}
