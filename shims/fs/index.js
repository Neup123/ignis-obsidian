// Filesystem shim  -  the core piece
// Returned for both require('original-fs') and require('fs')
//
// Strategy: metadata cache + on-demand content fetch + write-through
// Server sync mechanism (REST vs WebSocket) is TBD  -  abstracted behind
// the transport layer in ./transport.js

import { MetadataCache } from './metadata-cache.js';
import { ContentCache } from './content-cache.js';
import { transport } from './transport.js';
import { createFsPromises } from './promises.js';
import { createFsSync } from './sync.js';
import { createFsWatch } from './watch.js';
import { constants } from './constants.js';

const metadataCache = new MetadataCache();
const contentCache = new ContentCache();

const fsPromises = createFsPromises(metadataCache, contentCache, transport);
const fsSync = createFsSync(metadataCache, contentCache, transport);
const fsWatch = createFsWatch(transport);

export const fsShim = {
  // Async promise-based API (this.fsPromises = this.fs.promises)
  promises: fsPromises,

  // Sync methods
  existsSync: fsSync.existsSync,
  readFileSync: fsSync.readFileSync,
  writeFileSync: fsSync.writeFileSync,
  unlinkSync: fsSync.unlinkSync,
  accessSync: fsSync.accessSync,
  statSync: fsSync.statSync,
  readdirSync: fsSync.readdirSync,

  // Watch
  watch: fsWatch.watch,

  // Constants
  constants,

  // Internal: for initialization
  _metadataCache: metadataCache,
  _contentCache: contentCache,

  // Initialize the caches by fetching the full tree from server
  async _init(basePath) {
    const tree = await transport.fetchTree(basePath);
    metadataCache.populate(tree);
    console.log(`[shim:fs] Initialized with ${metadataCache.size} entries`);
  },
};
