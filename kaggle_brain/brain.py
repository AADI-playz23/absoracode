import os, subprocess, time, requests, json, base64

GITHUB_TOKEN = os.environ.get("GH_TOKEN")
REPO = "AADI-playz23/absoracode"

print("🚀 Waking up AbsoraCloud Dual-Core Engine...")
os.system("pip install vllm --no-cache-dir")

# Boot Qwen on GPU 0
print("💻 Loading Qwen Coder from frozen dataset on GPU 0...")
subprocess.Popen("CUDA_VISIBLE_DEVICES=0 python -m vllm.entrypoints.openai.api_server --model /kaggle/input/absoracloud-qwen/qwen-coder --gpu-memory-utilization 0.95 --max-model-len 4096 --port 8000", shell=True)

# Boot DeepSeek on GPU 1
print("🧠 Loading DeepSeek R1 from frozen dataset on GPU 1...")
subprocess.Popen("CUDA_VISIBLE_DEVICES=1 python -m vllm.entrypoints.openai.api_server --model /kaggle/input/absoracloud-deepseek/deepseek-r1 --gpu-memory-utilization 0.95 --max-model-len 4096 --port 8001", shell=True)

# Wait for 14B models to load
time.sleep(180) 

print("🚇 Opening Secure Localtunnels...")
os.system("npm install -g localtunnel > /dev/null 2>&1")
proc_qwen = subprocess.Popen(["lt", "--port", "8000"], stdout=subprocess.PIPE, text=True)
proc_deep = subprocess.Popen(["lt", "--port", "8001"], stdout=subprocess.PIPE, text=True)

qwen_url = proc_qwen.stdout.readline().split("url is:")[-1].strip()
deep_url = proc_deep.stdout.readline().split("url is:")[-1].strip()

# Send URLs back to GitHub
if qwen_url and deep_url:
    api_url = f"https://api.github.com/repos/{REPO}/contents/status.json"
    headers = {"Authorization": f"token {GITHUB_TOKEN}", "Accept": "application/vnd.github.v3+json"}
    try:
        curr = requests.get(api_url, headers=headers).json()
        content = json.loads(base64.b64decode(curr["content"]))
        content.update({"qwen_url": qwen_url, "deepseek_url": deep_url})
        
        requests.put(api_url, headers=headers, json={
            "message": "Update Kaggle URLs", 
            "content": base64.b64encode(json.dumps(content).encode()).decode(), 
            "sha": curr["sha"]
        })
        print(f"✅ URLs registered! Qwen: {qwen_url} | DeepSeek: {deep_url}")
    except Exception as e:
        print(f"Registry error: {e}")

# Keep Kaggle running for 12 hours
time.sleep(43200)
