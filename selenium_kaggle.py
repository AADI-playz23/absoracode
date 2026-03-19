"""
scripts/selenium_kaggle.py

Since the bot Kaggle account was created with "Continue with Google",
we can't use email/password on Kaggle directly.

Flow:
  1. Push notebook via Kaggle API (uses username + key)
  2. Open Kaggle login page in Selenium
  3. Click "Sign in with Google"
  4. Complete Google OAuth (email + password)
  5. Land on Kaggle → open kernel editor
  6. Enable GPU accelerator
  7. Run all cells
  8. Report URL + status back to platform
  9. Heartbeat loop
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

# One Google account for both Colab and Kaggle
BOT_GOOGLE_EMAIL = os.environ["BOT_GOOGLE_EMAIL"]
BOT_GOOGLE_PASS  = os.environ["BOT_GOOGLE_PASSWORD"]

# Kaggle API credentials (username + key from kaggle.json)
BOT_KAGGLE_USER  = os.environ["BOT_KAGGLE_USERNAME"]
BOT_KAGGLE_KEY   = os.environ["BOT_KAGGLE_KEY"]

KERNEL_SLUG  = f"gpu-instance-{INSTANCE_ID}"
KERNEL_TITLE = f"GPU Platform Instance {INSTANCE_ID}"
KERNEL_DIR   = f"/tmp/{KERNEL_SLUG}"
KAGGLE_URL   = f"https://www.kaggle.com/code/{BOT_KAGGLE_USER}/{KERNEL_SLUG}"

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

# ── Step 1: Push notebook via Kaggle API ─────────────────────
log("Building notebook and pushing via Kaggle API...")

plugin_lines = []
if PLUGIN_CMDS.strip():
    for cmd in PLUGIN_CMDS.split("&&"):
        cmd = cmd.strip()
        if cmd:
            plugin_lines.append(
                f"import subprocess; subprocess.run('{cmd}', shell=True, check=False)"
            )

cells = [
    {
        "cell_type": "markdown", "metadata": {},
        "source": [f"# GPU Instance {INSTANCE_ID} — {GPU_TYPE}\n\nManaged by GPU Cloud Platform"]
    },
    {
        "cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [],
        "source": ["!nvidia-smi"]
    },
]
if plugin_lines:
    cells.append({
        "cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [],
        "source": plugin_lines + ["print('✅ Plugins installed!')"]
    })
cells.append({
    "cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [],
    "source": [f"print('🚀 Instance {INSTANCE_ID} Ready! GPU: {GPU_TYPE}')"]
})

os.makedirs(KERNEL_DIR, exist_ok=True)
nb = {
    "nbformat": 4, "nbformat_minor": 5,
    "metadata": {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"}
    },
    "cells": cells
}
with open(f"{KERNEL_DIR}/{KERNEL_SLUG}.ipynb", "w") as f:
    json.dump(nb, f)

meta = {
    "id": f"{BOT_KAGGLE_USER}/{KERNEL_SLUG}",
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
with open(f"{KERNEL_DIR}/kernel-metadata.json", "w") as f:
    json.dump(meta, f)

# Write kaggle.json credentials
os.makedirs(os.path.expanduser("~/.kaggle"), exist_ok=True)
with open(os.path.expanduser("~/.kaggle/kaggle.json"), "w") as f:
    json.dump({"username": BOT_KAGGLE_USER, "key": BOT_KAGGLE_KEY}, f)
os.chmod(os.path.expanduser("~/.kaggle/kaggle.json"), 0o600)

push = subprocess.run(
    ["kaggle", "kernels", "push", "-p", KERNEL_DIR],
    capture_output=True, text=True
)
print(push.stdout)
if push.returncode != 0:
    log(f"Kaggle API push failed: {push.stderr}", "error")
    cb("status", status="failed")
    exit(1)

log(f"Kernel pushed via API. URL: {KAGGLE_URL}")
cb("notebook_url", url=KAGGLE_URL)
time.sleep(6)  # let Kaggle register the kernel

# ── Step 2: Chrome setup ──────────────────────────────────────
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
wait    = WebDriverWait(driver, 40)
driver.execute_script("Object.defineProperty(navigator,'webdriver',{get:()=>undefined})")

try:
    # ── Step 3: Open Kaggle login page ───────────────────────
    log("Opening Kaggle login page...")
    driver.get("https://www.kaggle.com/account/login")
    time.sleep(4)

    # ── Step 4: Click "Sign in with Google" ──────────────────
    log("Clicking 'Sign in with Google'...")
    google_btn = wait.until(EC.element_to_be_clickable((
        By.XPATH,
        "//button[contains(.,'Google')] | "
        "//a[contains(.,'Google')] | "
        "//*[@data-testid='google-sign-in-button']"
    )))
    google_btn.click()
    time.sleep(3)

    # ── Step 5: Handle Google OAuth popup/redirect ───────────
    # Kaggle opens Google auth either as redirect or new window
    log("Handling Google OAuth...")

    # Check if a new window opened
    if len(driver.window_handles) > 1:
        driver.switch_to.window(driver.window_handles[-1])
        log("Switched to Google OAuth popup window.")
    
    time.sleep(3)
    log(f"Current URL: {driver.current_url[:80]}")

    # Enter Google email
    try:
        email_field = wait.until(EC.presence_of_element_located((By.ID, "identifierId")))
        email_field.clear()
        email_field.send_keys(BOT_GOOGLE_EMAIL)
        time.sleep(0.5)
        driver.find_element(By.ID, "identifierNext").click()
        time.sleep(3)
        log("Google email entered.")
    except Exception as e:
        log(f"Email field issue: {e}", "warn")

    # Enter Google password
    try:
        pwd_field = wait.until(EC.element_to_be_clickable((By.NAME, "Passwd")))
        pwd_field.clear()
        pwd_field.send_keys(BOT_GOOGLE_PASS)
        time.sleep(0.5)
        driver.find_element(By.ID, "passwordNext").click()
        time.sleep(5)
        log("Google password entered.")
    except Exception as e:
        log(f"Password field issue: {e}", "warn")

    # Switch back to main window if popup
    if len(driver.window_handles) > 1:
        driver.switch_to.window(driver.window_handles[0])
        time.sleep(3)

    log(f"After Google auth, URL: {driver.current_url[:80]}")

    # ── Step 6: Navigate to kernel editor ────────────────────
    log(f"Opening kernel editor: {KAGGLE_URL}/edit")
    driver.get(f"{KAGGLE_URL}/edit")
    time.sleep(8)

    # ── Step 7: Enable GPU in Kaggle editor ──────────────────
    log("Enabling GPU accelerator...")
    try:
        # Kaggle editor right panel has Accelerator setting
        # Look for the accelerator dropdown or settings button
        accel_btn = wait.until(EC.element_to_be_clickable((
            By.XPATH,
            "//button[contains(@title,'Accelerator')] | "
            "//div[contains(@class,'Accelerator')] | "
            "//*[contains(text(),'Accelerator')]"
        )))
        accel_btn.click()
        time.sleep(2)

        # Select GPU T4 x2 or GPU option
        gpu_choice = wait.until(EC.element_to_be_clickable((
            By.XPATH,
            "//li[contains(.,'GPU T4') or contains(.,'GPU P100') or contains(.,'T4 x2')] | "
            "//span[contains(.,'GPU T4')] | "
            "//div[@role='option' and contains(.,'GPU')]"
        )))
        gpu_choice.click()
        time.sleep(2)
        log("GPU accelerator enabled.")
    except Exception as e:
        log(f"GPU accelerator UI step: {e}", "warn")
        # Kernel was pushed with enable_gpu:true so it may already be set

    # ── Step 8: Run all cells ─────────────────────────────────
    log("Running all cells...")
    try:
        run_all_btn = wait.until(EC.element_to_be_clickable((
            By.XPATH,
            "//button[@title='Run All' or contains(@aria-label,'Run All')] | "
            "//span[text()='Run All']/parent::button"
        )))
        run_all_btn.click()
        time.sleep(5)
        log("All cells triggered.")
    except Exception as e:
        log(f"Run All button: {e}", "warn")
        try:
            body = driver.find_element(By.TAG_NAME, "body")
            body.send_keys(Keys.SHIFT + Keys.RETURN)
            time.sleep(3)
            log("Used Shift+Enter fallback.")
        except:
            pass

    # ── Step 9: Report running ────────────────────────────────
    cb("status", status="running")
    log("✅ Kaggle instance RUNNING. Starting heartbeat...")

    # ── Step 10: Heartbeat loop ───────────────────────────────
    for i in range(MAX_HEARTBEATS):
        time.sleep(HEARTBEAT_INTERVAL)
        try:
            # Check via Kaggle API
            status_out = subprocess.run(
                ["kaggle", "kernels", "status", f"{BOT_KAGGLE_USER}/{KERNEL_SLUG}"],
                capture_output=True, text=True
            ).stdout.lower()

            log(f"Heartbeat {i+1}/{MAX_HEARTBEATS} — {status_out[:60].strip()}")

            if "complete" in status_out or "error" in status_out:
                log("Kernel execution finished.")
                break

            # Keep browser alive
            ActionChains(driver).move_by_offset(1, 0).move_by_offset(-1, 0).perform()
        except Exception as e:
            log(f"Heartbeat error: {e}", "warn")

    log("Session complete.")
    cb("status", status="stopped")

except Exception as e:
    log(f"FATAL: {e}", "error")
    cb("status", status="failed")
    raise

finally:
    try:
        driver.quit()
    except:
        pass
