import os, subprocess, time, requests, json, base64, re

GITHUB_TOKEN = os.environ.get("GH_TOKEN")
REPO = "AADI-playz23/absoracode"

print("🚀 Waking up AbsoraCloud Dual-Core Engine...")

# ⚡ OFFLINE INSTALLATION (15-second boot from your dataset)
print("📦 Installing vLLM from local wheels...")
os.system("pip install --no-index --find-links /kaggle/input/absoracloud-vllm-wheels vllm --no-cache-dir")

# ---------------------------------------------------------
# 🎯 THE AUTO-PATH FINDER
# Automatically hunts down the exact folder containing config.json
# ---------------------------------------------------------
def find_model_dir(keyword):
    print(f"🔍 Scanning Kaggle datasets for {keyword}...")
    for root, dirs, files in os.walk('/kaggle/input'):
        if 'config.json' in files and keyword.lower() in root.lower():
            return root
    return f"/kaggle/input/absoracloud-{keyword}-core" # Fallback

qwen_path = find_model_dir("qwen")
deepseek_path = find_model_dir("deepseek")

print(f"✅ Qwen locked at: {qwen_path}")
print(f"✅ DeepSeek locked at: {deepseek_path}")
# ---------------------------------------------------------

# Boot Qwen on GPU 0
print("💻 Loading Qwen Coder on GPU 0...")
subprocess.Popen(f"CUDA_VISIBLE_DEVICES=0 python -m vllm.entrypoints.openai.api_server --model {qwen_path} --gpu-memory-utilization 0.95 --max-model-len 4096 --enforce-eager --port 8000", shell=True)

# Boot DeepSeek on GPU 1
print("🧠 Loading DeepSeek R1 on GPU 1...")
subprocess.Popen(f"CUDA_VISIBLE_DEVICES=1 python -m vllm.entrypoints.openai.api_server --model {deepseek_path} --gpu-memory-utilization 0.95 --max-model-len 4096 --enforce-eager --port 8001", shell=True)

# Wait 90 seconds for models to load into VRAM
time.sleep(90) 

print("🚇 Opening Secure Cloudflare Tunnels...")
os.system("wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb")
os.system("dpkg -i cloudflared-linux-amd64.deb")

# Open tunnels in the background and pipe output to log files
os.system("cloudflared tunnel --url http://127.0.0.1:8000 > qwen_tunnel.log 2>&1 &")
os.system("cloudflared tunnel --url http://127.0.0.1:8001 > deepseek_tunnel.log 2>&1 &")

time.sleep(15) # Give Cloudflare time to generate the secure URLs

# Read the URLs from the logs
def get_url(filename):
    try:
        with open(filename, "r") as f:
            content = f.read()
            match = re.search(r"(https://[a-zA-Z0-9-]+\.trycloudflare\.com)", content)
            if match:
                return match.group(1)
    except:
        pass
    return None

qwen_url = get_url("qwen_tunnel.log")
deep_url = get_url("deepseek_tunnel.log")

api_url = f"https://api.github.com/repos/{REPO}/contents/status.json"
headers = {"Authorization": f"token {GITHUB_TOKEN}", "Accept": "application/vnd.github.v3+json"}

# Send URLs back to GitHub
if qwen_url and deep_url:
    try:
        curr = requests.get(api_url, headers=headers).json()
        content = json.loads(base64.b64decode(curr["content"]))
        content.update({"qwen_url": qwen_url, "deepseek_url": deep_url})
        
        requests.put(api_url, headers=headers, json={
            "message": "Update Kaggle Cloudflare URLs (Active)", 
            "content": base64.b64encode(json.dumps(content).encode()).decode(), 
            "sha": curr["sha"]
        })
        print(f"✅ Cloudflare Tunnels live! Qwen: {qwen_url} | DeepSeek: {deep_url}")
    except Exception as e:
        print(f"Registry error: {e}")

# ---------------------------------------------------------
# 🛡️ MAXIMUM QUOTA SAVER: 30-MINUTE CYCLES
# Auto-shuts down the Kaggle session after exactly 30 minutes.
# The frontend "thinking" animation will hide the reboot!
# ---------------------------------------------------------
print("⏱️ Quota Saver: Session will auto-terminate in 30 minutes (1800s).")
time.sleep(1800) 

print("🛑 30 minutes reached. Ghosting the server to save Kaggle GPU quota...")

# Clear the URLs from GitHub so the Node.js router knows it's dead
try:
    curr = requests.get(api_url, headers=headers).json()
    content = json.loads(base64.b64decode(curr["content"]))
    content.update({"qwen_url": "", "deepseek_url": ""})
    requests.put(api_url, headers=headers, json={
        "message": "Auto-Shutdown: Cleared URLs (30-Min Cycle)", 
        "content": base64.b64encode(json.dumps(content).encode()).decode(), 
        "sha": curr["sha"]
    })
except Exception as e:
    print(f"Failed to clear registry: {e}")
