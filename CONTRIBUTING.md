# Contributing to Ignis

Thanks for your interest in contributing. Here are some ways you can help.

## Reporting Plugin Compatibility Issues

Testing plugins and reporting what works (or doesn't) is one of the most valuable contributions right now. When a plugin doesn't work, the browser console usually contains the information needed to diagnose the problem.

### How to file a useful compatibility report

1. Open the browser dev tools (F12 or Ctrl+Shift+I)
2. Go to the **Console** tab
3. Enable the plugin or trigger the failing action
4. Look for errors, especially lines starting with:
   - `[ignis] Unshimmed require: <module>` - a Node.js module the plugin needs that Ignis doesn't provide yet
   - `[shim:MISS] <module>.<property>` - a property or method on a shimmed module that isn't implemented
   - `Plugin failure: <plugin-id>` - Obsidian caught a crash from the plugin
5. Copy the full error including the stack trace

### What to include in the issue

- Plugin name and version
- What you tried to do
- What happened (error, crash, nothing, partial functionality)
- The console output (errors and shim warnings)
- Whether the plugin loads at all or fails immediately

### Example of a useful report

> **Plugin:** Templater v1.18.4
> **Status:** Broken on load
>
> Console shows:
> ```
> [ignis] Unshimmed require: util
> [shim:MISS] UNKNOWN(util).promisify - property not found on shim
> Plugin failure: templater-obsidian TypeError: t is not a function
> ```
>
> The plugin needs `util.promisify` which isn't shimmed yet.

This kind of report makes it straightforward to add the missing shim.

## Code Contributions

If you want to contribute code:

1. Fork the repo and create a branch for your change
2. Run `npm run build` to verify everything builds
3. start the server with `npm run dev`.
4. Test your change in the browser with at least one vault open
5. Keep PRs focused - one fix or feature per PR

### Project structure

- `src/shims/` - Browser shims for Node.js and Electron APIs
- `src/ui/` - Svelte UI components (vault manager, dialogs)
- `plugin/` - The ignis-bridge Obsidian plugin (settings, file actions)
- `server/` - Express server (fs routes, WebSocket, plugin system)
- `server/plugins/` - Server plugin packages (e.g., headless-sync)

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for more detail.

### Adding a new shim

If a plugin needs a Node.js module that isn't shimmed:

1. Create the shim in `src/shims/node/<module>.js`
2. Export the functions the plugin needs (stub what you can't implement)
3. Register it in `src/shims/require.js` (import + add to `rawRegistry`)
4. Build and test with the plugin that needed it
