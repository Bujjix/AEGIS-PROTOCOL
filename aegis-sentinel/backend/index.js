const express = require('express');
const cors = require('cors');
const { runCreScan } = require('./cre-bridge');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

// In-memory cache for the latest scan
let latestScan = {
    status: 'initialising',
    data: null,
    lastUpdate: null
};

// ── GET /api/risk ────────────────────────────────────────────────────────────
app.get('/api/risk', (req, res) => {
    res.json(latestScan);
});

// ── POST /api/scan ───────────────────────────────────────────────────────────
app.post('/api/scan', async (req, res) => {
    console.log(`[API] Triggering manual CRE scan...`);
    try {
        const result = await runCreScan();
        latestScan = {
            status: 'ready',
            data: result,
            lastUpdate: new Date().toISOString()
        };
        res.json(latestScan);
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// ── GET /api/cre/status ──────────────────────────────────────────────────────
app.get('/api/cre/status', (req, res) => {
    res.json({
        status: 'ready',
        engine: 'Chainlink Runtime Environment v1.1.0',
        backend: 'Express.js'
    });
});

app.listen(PORT, () => {
    console.log(`\n=================================================`);
    console.log(`  AEGIS SENTINEL BACKEND RUNNING ON PORT ${PORT}  `);
    console.log(`  CRE CLI BRIDGE READY                          `);
    console.log(`=================================================\n`);

    // Initial scan on startup
    runCreScan().then(result => {
        latestScan = {
            status: 'ready',
            data: result,
            lastUpdate: new Date().toISOString()
        };
        console.log(`[API] Initial CRE scan completed.`);
    });
});
