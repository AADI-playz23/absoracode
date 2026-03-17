const express = require('express');
const fetch = require('node-fetch');
const { exec } = require('child_process');

const app = express();
app.use(express.json());

// Make sure 'main' is your actual default branch name. If it's 'master', change it below!
const REPO = "AADI-playz23/absoracode";
const BRANCH = "main"; 
let isWaking = false;

app.post('/api/chat', async (req, res) => {
    try {
        const requestedModel = req.body.model ? req.body.model.toLowerCase() : 'qwen';
        
        // 1. FETCH LIVE URLS FROM GITHUB (With the 404 Safety Net)
        const statusRes = await fetch(`https://raw.githubusercontent.com/${REPO}/${BRANCH}/status.json?t=${Date.now()}`);
        
        if (!statusRes.ok) {
            console.error(`❌ GitHub Fetch Failed: ${statusRes.status} ${statusRes.statusText}`);
            return res.status(500).json({ 
                error: `Could not read status.json. Ensure your repo is PUBLIC and the branch '${BRANCH}' exists.` 
            });
        }

        const statusData = await statusRes.json();

        // 2. WAKE KAGGLE IF OFFLINE
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

        // 3. ROUTE TO THE CORRECT GPU
        const targetUrl = requestedModel.includes('deepseek') || requestedModel.includes('reasoning') 
            ? statusData.deepseek_url 
            : statusData.qwen_url;

        console.log(`🔀 Routing request to: ${targetUrl}`);

        // 4. SEND TO KAGGLE
        const response = await fetch(`${targetUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
            body: JSON.stringify(req.body)
        });
        
        const data = await response.json();
        res.json(data);

    } catch (err) {
        console.error("❌ Router Crash:", err);
        res.status(500).json({ error: "Connection to the AI Engine was lost or timed out." });
    }
});

app.listen(8000, () => console.log('🚀 AbsoraCloud Smart Router is Live and Protected!'));
