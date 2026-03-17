const express = require('express');
const fetch = require('node-fetch');
const { exec } = require('child_process');

const app = express();
app.use(express.json());

// Make sure 'main' is your actual default branch. Change to 'master' if needed!
const REPO = "AADI-playz23/absoracode";
const BRANCH = "main"; 
let isWaking = false;

app.post('/api/chat', async (req, res) => {
    try {
        const requestedModel = req.body.model ? req.body.model.toLowerCase() : 'qwen';
        
        // 1. FETCH LIVE URLS FROM GITHUB
        const statusRes = await fetch(`https://raw.githubusercontent.com/${REPO}/${BRANCH}/status.json?t=${Date.now()}`);
        if (!statusRes.ok) {
            console.error(`❌ GitHub Fetch Failed: ${statusRes.status}`);
            return res.status(500).json({ error: "Could not read status.json from GitHub." });
        }
        
        const statusData = await statusRes.json();

        // 2. CHECK IF BOOTING IS ALREADY HAPPENING
        if (!statusData.qwen_url && !isWaking) {
            isWaking = true;
            console.log("🛠️ Brain offline. Triggering GitHub Action to wake Kaggle...");
            exec(`gh workflow run wake_brain.yml --repo ${REPO}`); 
            return res.status(503).json({ status: "waking", message: "AI is booting. Wait 3 mins." });
        }
        if (isWaking && !statusData.qwen_url) {
            return res.status(503).json({ status: "waking", message: "Still booting..." });
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        
        // 5. BULLETPROOF TEXT PARSING (The Cloudflare Fix)
        const responseText = await response.text();
        
        try {
            // Try to parse it as normal JSON
            const data = JSON.parse(responseText);
            if (!response.ok) return res.status(response.status).json(data);
            return res.json(data);
            
        } catch (parseError) {
            // CATCH CLOUDFLARE 1033 or 502: Models are still loading into VRAM
            if (responseText.includes("1033") || responseText.includes("502")) {
                console.log("⚠️ Cloudflare 1033/502: AI still booting into VRAM...");
                return res.status(503).json({ 
                    status: "waking", 
                    message: "The Cloudflare tunnel is connected, but the 14B AI is still loading into the Kaggle GPU. Give it 60 more seconds!" 
                });
            }
            
            // CATCH DEAD TUNNEL: Kaggle went to sleep
            if (responseText.includes("404") || responseText.includes("Tunnel not found")) {
                console.log("⚠️ Tunnel is dead! Waking Kaggle...");
                exec(`gh workflow run wake_brain.yml --repo ${REPO}`);
                return res.status(503).json({ 
                    status: "waking", 
                    message: "The AI session expired. Rebooting the cluster now, please wait 3 minutes..." 
                });
            }

            // Catch any other weird HTML/Text
            console.error("❌ Non-JSON Response:", responseText.substring(0, 100));
            return res.status(500).json({ error: "AI Engine Error: " + responseText.substring(0, 50) });
        }

    } catch (err) {
        console.error("❌ Router Crash:", err);
        res.status(500).json({ error: "Connection to the AI Engine was lost." });
    }
});

app.listen(8000, () => console.log('🚀 AbsoraCloud Smart Router is Live and Protected!'));
