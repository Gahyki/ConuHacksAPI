const express = require('express');
const router = express();

const db = require('../helpers/db');

const now = new Date();

router.get('/', (_, res) => {
    res.json({
        name: 'cloud-code-api',
        version: '1.0',
        date: now.toLocaleString()
    })
});

module.exports = router;