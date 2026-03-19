"""
scripts/selenium_kaggle.py

Uses the SAME Google account as Colab.
Kaggle was created with "Continue with Google" so:
  - Same Chrome profile (/tmp/chrome-google-bot) = Google session already active
  - Clicking "Sign in with Google" on Kaggle auto-confirms without password
  - No separate Kaggle email/password needed

GitHub Secrets required:
  BOT_GOOGLE_EMAIL
  BOT_GOOGLE_PASSWORD   (only used if Google session expires)
  BOT_KAGGLE_USERNAME   (your Kaggle username, e.g. "mybot123")
  BOT_KAGGLE_KEY        (from kaggle.com → Settings → API → Create New Token)
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
INSTANCE_ID  = os.environ["INSTANCE_ID"]
GPU_TYPE     = os.environ["GPU_TYPE"]
API_KEY      = os.environ["USER_API_KEY"]
PLUGIN_CMDS  = os.environ.get("PLUGIN_CMDS", "")
CALLBACK_URL = os.environ["CALLBACK_URL"]
BOT_EMAIL    = os.environ["BOT_GOOGLE_EMAIL"]
BOT_PASS     = os.environ["BOT_GOOGLE_PASSWORD"]
KG_USER      = os.environ["BOT_KAGGLE_USERNAME"]

KERNEL_SLUG  = f"gpu-instance-{INSTANCE_ID}"
KERNEL_TITLE = f"GPU Platform Instance {INSTANCE_ID}"
KERNEL_DIR   = f"/tmp/{KERNEL_SLUG}"
KAGGLE_URL   = f"https://www.kaggle.com/code/{KG_USER}/{KERNEL_SLUG}"
CHROME_PROFILE = "/tmp/chrome-google-bot"   # shared with selenium_colab.py

HEARTBEAT_INTERVAL = 300
MAX_HEARTBEATS = 72

def cb(action, **kwargs):
    try:
        requests.post(CALLBACK_URL, json={
            "api_key": API_KEY, "instance_id": int(INSTANCE_ID),
            "action": action, **kwargs
        }, timeout=10)
    except Exception as e:
        print(f"[CB ERROR] {e}")

def log(msg, level="info"):
    print(f"[{level.upper()}] {msg}")
    cb("log", level=level, message=msg)

def try_click(driver, *xpaths, timeout=15):
    for xp in xpaths:
        try:
            el = WebDriverWait(driver, timeout).until(
                EC.element_to_be_clickable((By.XPATH, xp)))
            el.click()
            return el
        except:
            continue
    raise Exception("Element not found")

def slow_type(el, text):
    for ch in text:
        el.send_keys(ch)
        time.sleep(0.04)

# ── Build & push notebook via Kaggle API ─────────────────────
plugin_cell = ""
if PLUGIN_CMDS.strip():
    lines = [f"import subprocess; subprocess.run('{c.strip()}',shell=True,check=False)"
             for c in PLUGIN_CMDS.split("&&") if c.strip()]
    lines.append("print('✅ Plugins installed!')")
    plugin_cell = "\n".join(lines)

cells = [
    {"cell_type":"markdown","metadata":{},"source":[f"# GPU Instance {INSTANCE_ID} — {GPU_TYPE}"]},
    {"cell_type":"code","execution_count":None,"metadata":{},"outputs":[],"source":["!nvidia-smi"]},
]
if plugin_cell:
    cells.append({"cell_type":"code","execution_count":None,"metadata":{},"outputs":[],"source":[plugin_cell]})
cells.append({"cell_type":"code","execution_count":None,"metadata":{},"outputs":[],"source":[f"print('🚀 Instance {INSTANCE_ID} Ready!')"]})

os.makedirs(KERNEL_DIR, exist_ok=True)
with open(f"{KERNEL_DIR}/{KERNEL_SLUG}.ipynb","w") as f:
    json.dump({"nbformat":4,"nbformat_minor":5,
               "metadata":{"kernelspec":{"display_name":"Python 3","language":"python","name":"python3"}},
               "cells":cells}, f)

with open(f"{KERNEL_DIR}/kernel-metadata.json","w") as f:
    json.dump({"id":f"{KG_USER}/{KERNEL_SLUG}","title":KERNEL_TITLE,
               "code_file":f"{KERNEL_SLUG}.ipynb","language":"python",
               "kernel_type":"notebook","is_private":True,
               "enable_gpu":True,"enable_tpu":False,"enable_internet":True,
               "dataset_sources":[],"competition_sources":[],"kernel_sources":[]}, f)

log("Pushing notebook via Kaggle API...")
r = subprocess.run(["kaggle","kernels","push","-p",KERNEL_DIR], capture_output=True, text=True)
print(r.stdout)
if r.returncode != 0:
    log(f"Push failed: {r.stderr}", "error")
    cb("status", status="failed"); exit(1)

log("Kernel pushed. Waiting for Kaggle to register it...")
time.sleep(10)

# ── Chrome (shared profile = Google already signed in) ───────
opts = Options()
opts.add_argument("--headless=new")
opts.add_argument("--no-sandbox")
opts.add_argument("--disable-dev-shm-usage")
opts.add_argument("--disable-gpu-sandbox")
opts.add_argument("--window-size=1920,1080")
opts.add_argument("--disable-blink-features=AutomationControlled")
opts.add_argument("--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36")
opts.add_argument(f"--user-data-dir={CHROME_PROFILE}")
opts.add_experimental_option("excludeSwitches", ["enable-automation"])
opts.add_experimental_option("useAutomationExtension", False)

service = Service(ChromeDriverManager().install())
driver  = webdriver.Chrome(service=service, options=opts)
driver.execute_script("Object.defineProperty(navigator,'webdriver',{get:()=>undefined})")

try:
    # ── STEP 1: Sign into Kaggle via Continue with Google ────
    log("Opening Kaggle login...")
    driver.get("https://www.kaggle.com/account/login")
    time.sleep(5)

    if "account/login" not in driver.current_url:
        log("✅ Already logged into Kaggle.")
    else:
        log("Clicking 'Sign in with Google'...")
        try:
            try_click(driver,
                "//button[contains(.,'Sign in with Google')]",
                "//a[contains(.,'Sign in with Google')]",
                "//span[contains(.,'Continue with Google')]/..",
                "//div[contains(@class,'google-login')]//button",
                timeout=15
            )
            time.sleep(5)

            # Google account chooser — pick the bot account
            try:
                acct = WebDriverWait(driver, 8).until(EC.element_to_be_clickable(
                    (By.XPATH, f"//div[contains(.,'{BOT_EMAIL}')] | //li[@data-authuser='0']")
                ))
                acct.click()
                time.sleep(5)
                log("✅ Google account selected for Kaggle OAuth.")
            except:
                log("No account chooser shown — auto-confirmed.")

            # Rare case: Google asks for password again
            try:
                pwd = WebDriverWait(driver, 5).until(
                    EC.presence_of_element_located((By.NAME, "Passwd")))
                slow_type(pwd, BOT_PASS)
                try_click(driver, "//div[@id='passwordNext']","//button[@id='passwordNext']", timeout=5)
                time.sleep(4)
            except:
                pass

            log(f"Kaggle URL after login: {driver.current_url[:60]}")

        except Exception as e:
            log(f"Kaggle Google auth: {e}", "warn")

    # ── STEP 2: Open kernel editor ───────────────────────────
    log(f"Opening kernel editor...")
    driver.get(f"{KAGGLE_URL}/edit")
    time.sleep(10)

    # Retry if not ready yet
    if "404" in driver.title or "not found" in driver.page_source.lower():
        log("Kernel not ready yet, waiting 20s...", "warn")
        time.sleep(20)
        driver.get(f"{KAGGLE_URL}/edit")
        time.sleep(8)

    log(f"Editor loaded: {driver.title[:50]}")

    # ── STEP 3: Enable GPU ───────────────────────────────────
    log("Enabling GPU accelerator...")
    try:
        try_click(driver,
            "//button[contains(@aria-label,'Accelerator') or contains(@aria-label,'Settings')]",
            "//div[contains(@data-component,'accelerator')]",
            "//span[text()='Accelerator']/..",
            timeout=15
        )
        time.sleep(2)
        try_click(driver,
            "//li[contains(.,'GPU T4 x2')]",
            "//li[contains(.,'GPU P100')]",
            "//li[contains(.,'T4')]",
            "//div[@role='option'][contains(.,'GPU')]",
            timeout=12
        )
        time.sleep(2)
        log("GPU enabled in Kaggle.")
    except Exception as e:
        log(f"GPU UI: {e} — GPU already set via API push.", "warn")

    # ── STEP 4: Run all cells ────────────────────────────────
    log("Running all cells...")
    try:
        try_click(driver,
            "//button[@title='Run All']",
            "//button[contains(@aria-label,'Run All')]",
            "//button[contains(.,'Run All')]",
            timeout=15
        )
        time.sleep(5)
        log("✅ Kaggle notebook running!")
    except Exception as e:
        log(f"Run All: {e}", "warn")

    # ── STEP 5: Report ───────────────────────────────────────
    cb("notebook_url", url=KAGGLE_URL)
    cb("status", status="running")
    log("🚀 Kaggle instance RUNNING. Heartbeat starting...")

    # ── STEP 6: Heartbeat ────────────────────────────────────
    for i in range(MAX_HEARTBEATS):
        time.sleep(HEARTBEAT_INTERVAL)
        try:
            status_r = subprocess.run(
                ["kaggle","kernels","status", f"{KG_USER}/{KERNEL_SLUG}"],
                capture_output=True, text=True
            )
            out = status_r.stdout.lower()
            log(f"Heartbeat {i+1}/{MAX_HEARTBEATS} | {status_r.stdout.strip()[:60]}")
            if "complete" in out or "error" in out:
                log("Kaggle kernel finished.")
                break
            try: ActionChains(driver).move_by_offset(1,0).move_by_offset(-1,0).perform()
            except: pass
        except Exception as e:
            log(f"Heartbeat: {e}", "warn")

    log("Session complete.")
    cb("status", status="stopped")

except Exception as e:
    log(f"FATAL: {e}", "error")
    cb("status", status="failed")
    raise

finally:
    try: driver.quit()
    except: pass
