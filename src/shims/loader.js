import { installRequire } from "./require.js";
import { installGlobals } from "./globals.js";
import { initialize } from "./init.js";

installGlobals(); // process, Buffer, window overrides (before require so Buffer is available)
installRequire(); // shim registry, window.require
initialize(); // vault config, metadata cache, plugin prompt

console.log("[ignis] Shim loader initialized");
