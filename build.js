const esbuild = require("esbuild");
const path = require("path");

const { version: ignisVersion } = require("./package.json");

Promise.all([
  // Build shim-loader.js
  esbuild.build({
    entryPoints: [path.join(__dirname, "src", "shims", "loader.js")],
    bundle: true,
    outfile: path.join(__dirname, "dist", "shim-loader.js"),
    format: "iife",
    platform: "browser",
    target: ["chrome90"],
    alias: {
      path: "path-browserify",
    },
    define: {
      __IGNIS_VERSION__: JSON.stringify(ignisVersion),
    },
    logLevel: "info",
  }),

  // Build ignis-ui.js (delegated to packages/ui)
  require("./packages/ui/build.js"),

  // Build ignis-bridge plugin
  esbuild.build({
    entryPoints: [path.join(__dirname, "plugin", "src", "main.js")],
    bundle: true,
    outfile: path.join(__dirname, "plugin", "main.js"),
    format: "cjs",
    platform: "browser",
    target: ["chrome90"],
    external: ["obsidian", "fs"],
    logLevel: "info",
  }),

  // Build headless-sync bundled plugin
  esbuild.build({
    entryPoints: [
      path.join(
        __dirname,
        "server",
        "plugins",
        "headless-sync",
        "plugin",
        "src",
        "main.js",
      ),
    ],
    bundle: true,
    outfile: path.join(
      __dirname,
      "server",
      "plugins",
      "headless-sync",
      "plugin",
      "main.js",
    ),
    format: "cjs",
    platform: "browser",
    target: ["chrome90"],
    external: ["obsidian", "fs"], //using fs shim
    logLevel: "info",
  }),
]).catch(() => process.exit(1));
