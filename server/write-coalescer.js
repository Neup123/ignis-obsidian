// Write coalescer for slow filesystems (rclone, FUSE, NFS, SMB).
//
// First write to a path goes to disk immediately. Subsequent writes within
// the coalesce window are buffered; the timer resets on each write. After
// the window elapses with no new writes, the buffered data is flushed.
//
// This prevents rapid-fire writes (e.g. workspace.json saved 20x/min)
// from overwhelming network-mounted filesystems.

const fs = require("fs");
const config = require("./config");

const FLUSH_TIMEOUT_MS = 10000;

// absPath -> timestamp of last completed write
const lastWriteTime = new Map();

// absPath -> { data, encoding, timer, resolvers: [{ resolve, reject }] }
const pending = new Map();

async function writeToDisk(absPath, data, encoding) {
  await fs.promises.writeFile(
    absPath,
    data,
    encoding === "binary" ? undefined : encoding,
  );

  lastWriteTime.set(absPath, Date.now());
  const stat = await fs.promises.stat(absPath);

  return { mtime: stat.mtimeMs, size: stat.size };
}

function flushEntry(absPath) {
  const entry = pending.get(absPath);

  if (!entry) {
    return;
  }

  clearTimeout(entry.timer);
  pending.delete(absPath);

  writeToDisk(absPath, entry.data, entry.encoding).then(
    (result) => {
      for (const r of entry.resolvers) {
        r.resolve(result);
      }
    },
    (err) => {
      for (const r of entry.resolvers) {
        r.reject(err);
      }
    },
  );
}

function scheduleFlush(absPath) {
  const entry = pending.get(absPath);

  if (!entry) {
    return;
  }

  clearTimeout(entry.timer);
  entry.timer = setTimeout(() => flushEntry(absPath), config.writeCoalesceMs);
}

/**
 * Write file content, coalescing rapid writes.
 * The returned promise resolves with { mtime, size } once data hits disk.
 */
async function writeCoalesced(absPath, data, encoding) {
  const windowMs = config.writeCoalesceMs;

  // Coalescing disabled or first write to this path
  const last = lastWriteTime.get(absPath);

  if (windowMs <= 0 || !last || Date.now() - last >= windowMs) {
    // Resolve any pending write for this path first
    if (pending.has(absPath)) {
      clearTimeout(pending.get(absPath).timer);
      pending.delete(absPath);
    }

    return writeToDisk(absPath, data, encoding);
  }

  // Within the coalesce window: buffer the write
  return new Promise((resolve, reject) => {
    const existing = pending.get(absPath);

    if (existing) {
      // Update data and add another resolver
      existing.data = data;
      existing.encoding = encoding;
      existing.resolvers.push({ resolve, reject });
      scheduleFlush(absPath);
    } else {
      const entry = {
        data,
        encoding,
        timer: null,
        resolvers: [{ resolve, reject }],
      };

      pending.set(absPath, entry);
      scheduleFlush(absPath);
    }
  });
}

/**
 * Get pending (not yet flushed) data for a path, or null.
 * Used by readFile to serve buffered content instead of stale disk data.
 */
function getPending(absPath) {
  const entry = pending.get(absPath);

  if (entry) {
    return { data: entry.data, encoding: entry.encoding };
  }

  return null;
}

/**
 * Flush all pending writes to disk. Called on graceful shutdown.
 */
async function flushAll() {
  const paths = [...pending.keys()];

  if (paths.length === 0) {
    return;
  }

  console.log(`[write-coalesce] Flushing ${paths.length} pending write(s)...`);

  // Clear all timers
  for (const entry of pending.values()) {
    clearTimeout(entry.timer);
  }

  const writes = paths.map((absPath) => {
    const entry = pending.get(absPath);
    pending.delete(absPath);

    return writeToDisk(absPath, entry.data, entry.encoding).then(
      (result) => {
        for (const r of entry.resolvers) {
          r.resolve(result);
        }
      },
      (err) => {
        console.error(`[write-coalesce] Failed to flush ${absPath}:`, err);

        for (const r of entry.resolvers) {
          r.reject(err);
        }
      },
    );
  });

  const timeout = new Promise((resolve) => {
    setTimeout(() => {
      console.warn(
        "[write-coalesce] Flush timeout -- some writes may be lost",
      );
      resolve();
    }, FLUSH_TIMEOUT_MS);
  });

  await Promise.race([Promise.allSettled(writes), timeout]);
}

module.exports = { writeCoalesced, getPending, flushAll };
