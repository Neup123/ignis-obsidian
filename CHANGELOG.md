# Changelog

All notable changes to this project will be documented in this file.

## [0.5.0] - (2026-03-22)

### Added

- Compression middleware (gzip/brotli) for API responses to reduce bandwidth
- Plugin installation prompt system with per-vault trust flags
- Versioning system with cache-busting query parameters on script URLs
- Option to install ignis-bridge plugin to vaults imported at runtime

### Changed

- Auto-creation of default vault now requires `AUTO_CREATE_DEFAULT=true` environment variable
- Script URLs (`ignis-ui.js`, `shim-loader.js`) now include version query params for automatic cache invalidation
- Cache headers: versioned assets cached for 1 year, non-versioned for 5 minutes

### Fixed

- Vault manager not displaying when no vaults exist
- `window.close()` now shows vault manager when no vault is configured

### Removed

- Unused `VAULT_PATH` environment variable fallback logic

## [0.4.0] - Basil (2026-03-18)

### Added

- Vault management: create, rename, delete vaults
- Last active vault persistence: remembers which vault was open
- Plugin trust preservation: keeps plugin trust status when renaming vaults

### Changed

- Refactored vault operations into shared service

### Fixed

- Issues with dialogs and vault rename operations

---

_Changelog tracking started at version 0.4.0. For earlier versions, please refer to commit history._
