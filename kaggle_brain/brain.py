import os, subprocess, time, requests, json, base64, re

GITHUB_TOKEN = os.environ.get("GH_TOKEN")
REPO = "AADI-playz23/absoracode"

print("🚀 Waking up AbsoraCloud Dual-Core Engine...")
os.system("pip install vllm --no-cache-dir")

# Boot Qwen on GPU 0
# ⚠️ Updated path to match the exact Kaggle dataset mount
print("💻 Loading Qwen Coder from frozen dataset on GPU 0...")
subprocess.Popen("CUDA_VISIBLE_DEVICES=0 python -m vllm.entrypoints.openai.api_server --model /kaggle/input/absoracloud-qwen-core --gpu-memory-utilization 0.95 --max-model-len 4096 --port 8000", shell=True)

# Boot DeepSeek on GPU 1
# ⚠️ Updated path to match the exact Kaggle dataset mount
print("🧠 Loading DeepSeek R1 from frozen dataset on GPU 1...")
subprocess.Popen("CUDA_VISIBLE_DEVICES=1 python -m vllm.entrypoints.openai.api_server --model /kaggle/input/absoracloud-deepseek-core --gpu-memory-utilization 0.95 --max-model-len 4096 --port 8001", shell=True)

# Wait 3 minutes for the massive 14B models to load into VRAM
time.sleep(180) 

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

# Send URLs back to GitHub
if qwen_url and deep_url:
    api_url = f"https://api.github.com/repos/{REPO}/contents/status.json"
    headers = {"Authorization": f"token {GITHUB_TOKEN}", "Accept": "application/vnd.github.v3+json"}
    try:
        curr = requests.get(api_url, headers=headers).json()
        content = json.loads(base64.b64decode(curr["content"]))
        content.update({"qwen_url": qwen_url, "deepseek_url": deep_url})
        
        requests.put(api_url, headers=headers, json={
            "message": "Update Kaggle Cloudflare URLs", 
            "content": base64.b64encode(json.dumps(content).encode()).decode(), 
            "sha": curr["sha"]
        })
        print(f"✅ Cloudflare Tunnels live! Qwen: {qwen_url} | DeepSeek: {deep_url}")
    except Exception as e:
        print(f"Registry error: {e}")

# Keep Kaggle running for 12 hours max
time.sleep(43200)
