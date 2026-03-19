"""
scripts/selenium_kaggle.py
Bot flow:
  1. Sign into Kaggle with bot account
  2. Create new notebook via API (kaggle kernels push)
  3. Use Selenium to open the kernel page, enable GPU, run all cells
  4. Post notebook URL back to platform
  5. Heartbeat loop
"""

import os, time, json, requests, subprocess
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# ── Env ───────────────────────────────────────────────────────
INSTANCE_ID   = os.environ["INSTANCE_ID"]
GPU_TYPE      = os.environ["GPU_TYPE"]
API_KEY       = os.environ["USER_API_KEY"]
PLUGIN_CMDS   = os.environ.get("PLUGIN_CMDS", "")
CALLBACK_URL  = os.environ["CALLBACK_URL"]
BOT_EMAIL     = os.environ["BOT_KAGGLE_EMAIL"]
BOT_PASS      = os.environ["BOT_KAGGLE_PASSWORD"]
BOT_KG_USER   = os.environ["BOT_KAGGLE_USERNAME"]

KERNEL_SLUG   = f"gpu-instance-{INSTANCE_ID}"
KERNEL_TITLE  = f"GPU Platform – Instance {INSTANCE_ID}"
KERNEL_DIR    = f"/tmp/{KERNEL_SLUG}"
KAGGLE_URL    = f"https://www.kaggle.com/code/{BOT_KG_USER}/{KERNEL_SLUG}"

HEARTBEAT_INTERVAL = 300
MAX_HEARTBEATS     = 72

# ── Helpers ───────────────────────────────────────────────────
def cb(action, **kwargs):
    try:
        requests.post(CALLBACK_URL, json={
            "api_key": API_KEY,
            "instance_id": int(INSTANCE_ID),
            "action": action,
            **kwargs
        }, timeout=10)
    except Exception as e:
        print(f"[CB ERROR] {e}")

def log(msg, level="info"):
    print(f"[{level.upper()}] {msg}")
    cb("log", level=level, message=msg)

# ── Build notebook ────────────────────────────────────────────
plugin_cell = ""
if PLUGIN_CMDS.strip():
    lines = [
        f"import subprocess; subprocess.run('{c.strip()}', shell=True, check=False)"
        for c in PLUGIN_CMDS.split("&&") if c.strip()
    ]
    plugin_cell = "\n".join(lines) + "\nprint('✅ Plugins installed!')"

cells = [
    {"cell_type":"markdown","metadata":{},"source":[f"# GPU Instance {INSTANCE_ID} — {GPU_TYPE}\n\nManaged by GPU Cloud Platform"]},
    {"cell_type":"code","execution_count":None,"metadata":{},"outputs":[],"source":["!nvidia-smi"]},
]
if plugin_cell:
    cells.append({"cell_type":"code","execution_count":None,"metadata":{},"outputs":[],"source":[plugin_cell]})
cells.append({"cell_type":"code","execution_count":None,"metadata":{},"outputs":[],"source":[f"print('🚀 Instance {INSTANCE_ID} Ready!')"]})

os.makedirs(KERNEL_DIR, exist_ok=True)
nb = {
    "nbformat":4, "nbformat_minor":5,
    "metadata":{"kernelspec":{"display_name":"Python 3","language":"python","name":"python3"}},
    "cells": cells
}
nb_file = f"{KERNEL_DIR}/{KERNEL_SLUG}.ipynb"
with open(nb_file,"w") as f: json.dump(nb, f)

meta = {
    "id": f"{BOT_KG_USER}/{KERNEL_SLUG}",
    "title": KERNEL_TITLE,
    "code_file": f"{KERNEL_SLUG}.ipynb",
    "language": "python",
    "kernel_type": "notebook",
    "is_private": True,
    "enable_gpu": True,
    "enable_tpu": False,
    "enable_internet": True,
    "dataset_sources": [],
    "competition_sources": [],
    "kernel_sources": []
}
with open(f"{KERNEL_DIR}/kernel-metadata.json","w") as f: json.dump(meta, f)

log("Notebook + metadata created. Pushing via Kaggle API...")
result = subprocess.run(["kaggle","kernels","push","-p",KERNEL_DIR], capture_output=True, text=True)
print(result.stdout)
if result.returncode != 0:
    log(f"Kaggle push failed: {result.stderr}", "error")
    cb("status", status="failed")
    exit(1)

log(f"Kernel pushed. URL: {KAGGLE_URL}")
cb("notebook_url", url=KAGGLE_URL)

# Wait for kernel to be registered on Kaggle
time.sleep(8)

# ── Chrome setup ──────────────────────────────────────────────
opts = Options()
opts.add_argument("--headless=new")
opts.add_argument("--no-sandbox")
opts.add_argument("--disable-dev-shm-usage")
opts.add_argument("--disable-gpu")
opts.add_argument("--window-size=1920,1080")
opts.add_argument("--disable-blink-features=AutomationControlled")
opts.add_argument("--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36")
opts.add_experimental_option("excludeSwitches", ["enable-automation"])
opts.add_experimental_option("useAutomationExtension", False)

service = Service(ChromeDriverManager().install())
driver  = webdriver.Chrome(service=service, options=opts)
wait    = WebDriverWait(driver, 30)

driver.execute_script("Object.defineProperty(navigator,'webdriver',{get:()=>undefined})")

try:
    # ── STEP 1: Log into Kaggle ───────────────────────────────
    log("Logging into Kaggle...")
    driver.get("https://www.kaggle.com/account/login")
    time.sleep(4)

    # Click "Sign in with Email"
    try:
        email_tab = wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//span[contains(text(),'Email')] | //button[contains(.,'Sign in with email')]")
        ))
        email_tab.click()
        time.sleep(1)
    except:
        pass

    email_field = wait.until(EC.presence_of_element_located((By.NAME, "email")))
    email_field.clear()
    email_field.send_keys(BOT_EMAIL)

    pwd_field = driver.find_element(By.NAME, "password")
    pwd_field.clear()
    pwd_field.send_keys(BOT_PASS)
    pwd_field.send_keys(Keys.RETURN)
    time.sleep(6)

    log(f"Kaggle login done. URL: {driver.current_url[:60]}")

    # ── STEP 2: Open kernel editor ────────────────────────────
    log(f"Opening kernel: {KAGGLE_URL}/edit")
    driver.get(f"{KAGGLE_URL}/edit")
    time.sleep(8)

    # ── STEP 3: Enable GPU accelerator in Kaggle editor ───────
    log("Enabling GPU accelerator in Kaggle editor...")
    try:
        # Kaggle editor has a Settings/Accelerator panel
        # Look for Settings tab or gear icon
        settings_btn = wait.until(EC.element_to_be_clickable(
            (By.XPATH,
             "//button[contains(@aria-label,'Settings')] | "
             "//div[contains(@class,'settings-panel')] | "
             "//span[contains(text(),'Accelerator')]")
        ))
        settings_btn.click()
        time.sleep(2)

        # Find GPU option
        gpu_option = wait.until(EC.element_to_be_clickable(
            (By.XPATH,
             "//li[contains(text(),'GPU') and not(contains(text(),'None'))] | "
             "//label[contains(.,'GPU T4')] | "
             "//span[contains(.,'GPU T4 x2') or contains(.,'T4') or contains(.,'P100')]")
        ))
        gpu_option.click()
        time.sleep(2)
        log("GPU accelerator enabled in Kaggle.")
    except Exception as e:
        log(f"GPU accelerator UI: {e}", "warn")

    # ── STEP 4: Run all cells ─────────────────────────────────
    log("Running all cells in Kaggle notebook...")
    try:
        # Kaggle run all: button in top bar
        run_all = wait.until(EC.element_to_be_clickable(
            (By.XPATH,
             "//button[contains(@title,'Run All') or contains(.,'Run All') or contains(@aria-label,'Run All')]")
        ))
        run_all.click()
        time.sleep(5)
        log("All cells running!")
    except Exception as e:
        log(f"Run all error: {e}", "warn")
        # Fallback: Shift+Enter on each cell
        try:
            body = driver.find_element(By.TAG_NAME, "body")
            body.send_keys(Keys.SHIFT + Keys.RETURN)
            time.sleep(3)
        except:
            pass

    # ── STEP 5: Report running ────────────────────────────────
    cb("status", status="running")
    log("✅ Kaggle instance RUNNING. Heartbeat starting...")

    # ── STEP 6: Heartbeat loop ────────────────────────────────
    for i in range(MAX_HEARTBEATS):
        time.sleep(HEARTBEAT_INTERVAL)
        try:
            # Check Kaggle kernel status via API
            status_result = subprocess.run(
                ["kaggle","kernels","status",f"{BOT_KG_USER}/{KERNEL_SLUG}"],
                capture_output=True, text=True
            )
            status_out = status_result.stdout.lower()
            log(f"Heartbeat {i+1}/{MAX_HEARTBEATS} — kernel status: {status_out[:60]}")

            if "complete" in status_out or "error" in status_out:
                log("Kernel finished execution.")
                break

            # Keep browser alive
            ActionChains(driver).move_by_offset(1,0).move_by_offset(-1,0).perform()
        except Exception as e:
            log(f"Heartbeat error: {e}", "warn")

    log("Session complete.")
    cb("status", status="stopped")

except Exception as e:
    log(f"FATAL: {e}", "error")
    cb("status", status="failed")
    raise

finally:
    try: driver.quit()
    except: pass
