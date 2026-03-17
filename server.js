const express = require('express');
const fetch = require('node-fetch');
const { exec } = require('child_process');

const app = express();
app.use(express.json());

const REPO = "AADI-playz23/absoracode";
let isWaking = false;

app.post('/api/chat', async (req, res) => {
    const requestedModel = req.body.model ? req.body.model.toLowerCase() : 'qwen';
    
    // Fetch live URLs from GitHub
    const statusRes = await fetch(`https://raw.githubusercontent.com/${REPO}/main/status.json?t=${Date.now()}`);
    const statusData = await statusRes.json();

    // 1. WAKE KAGGLE IF OFFLINE
    if (!statusData.qwen_url && !isWaking) {
        isWaking = true;
        console.log("🛠️ Brain offline. Triggering GitHub Action to wake Kaggle...");
        exec(`gh workflow run wake_brain.yml --repo ${REPO}`); 
        return res.status(503).json({ status: "waking", message: "AbsoraCloud AI is booting. Please wait 3-5 minutes and try again." });
    }
    if (isWaking && !statusData.qwen_url) {
        return res.status(503).json({ status: "waking", message: "Still booting... almost there." });
    }
    isWaking = false; 

    // 2. ROUTE TO THE CORRECT GPU
    const targetUrl = requestedModel.includes('deepseek') || requestedModel.includes('reasoning') 
        ? statusData.deepseek_url 
        : statusData.qwen_url;

    console.log(`🔀 Routing request to: ${targetUrl}`);

    // 3. SEND TO KAGGLE
    try {
        const response = await fetch(`${targetUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Connection to the AI Engine was lost." });
    }
});

app.listen(8000, () => console.log('🚀 AbsoraCloud Smart Router is Live!'));
