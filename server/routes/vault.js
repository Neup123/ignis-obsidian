const express = require('express');
const config = require('../config');
const path = require('path');

const router = express.Router();

// GET /api/vault/info
router.get('/info', (req, res) => {
  res.json({
    name: path.basename(config.vaultPath),
    platform: process.platform,
    version: '0.1.0',
  });
});

module.exports = router;
