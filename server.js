const express = require('express');
const path = require('path');
const Ara6 = require('./scripts/ara6-engine');
const app = express();

// --- 10x CACHE BUSTER MIDDLEWARE ---
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

app.use(express.json());
// Fixed: use __dirname so static assets are served correctly
app.use(express.static(path.join(__dirname, 'public')));

let state = {
    balance: 50.75,
    ugx_rate: 3800,
    verified_phone: "+256 755 386 680"
};

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/payout', (req, res) => {
    const txnId = "MEMPHIS-" + Math.random().toString(36).substr(2, 9).toUpperCase();
    res.json({
        success: true,
        total_ugx: "192,850 UGX",
        recipient: state.verified_phone,
        txn: txnId
    });
});

// --- RENDER COMPATIBLE LISTEN BLOCK ---
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n[10X SYSTEM UPDATED]`);
    console.log(`SERVER LIVE ON PORT: ${PORT}`);
});
