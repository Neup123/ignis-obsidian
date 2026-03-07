const esbuild = require('esbuild');
const path = require('path');

esbuild.build({
  entryPoints: [path.join(__dirname, 'shims', 'loader.js')],
  bundle: true,
  outfile: path.join(__dirname, 'dist', 'shim-loader.js'),
  format: 'iife',
  platform: 'browser',
  target: ['chrome90'],
  alias: {
    'path': 'path-browserify',
  },
  logLevel: 'info',
}).catch(() => process.exit(1));
