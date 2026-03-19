"""
scripts/selenium_colab.py
Bot flow:
  1. Sign into Google with bot account
  2. Open Colab → new notebook
  3. Set runtime to GPU (T4/P100)
  4. Connect runtime
  5. Inject & run cells (nvidia-smi + plugins)
  6. Post notebook URL back to platform
  7. Heartbeat loop to keep session alive
"""

import os, time, json, requests
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# ── Env ──────────────────────────────────────────────────────
INSTANCE_ID  = os.environ["INSTANCE_ID"]
GPU_TYPE     = os.environ["GPU_TYPE"]          # T4 or P100
API_KEY      = os.environ["USER_API_KEY"]
PLUGIN_CMDS  = os.environ.get("PLUGIN_CMDS", "")
CALLBACK_URL = os.environ["CALLBACK_URL"]
BOT_EMAIL    = os.environ["BOT_GOOGLE_EMAIL"]
BOT_PASS     = os.environ["BOT_GOOGLE_PASSWORD"]

HEARTBEAT_INTERVAL = 300   # 5 minutes
MAX_HEARTBEATS     = 72    # 6 hours max

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

def wait_click(wait, by, selector, timeout=20):
    el = WebDriverWait(wait, timeout).until(EC.element_to_be_clickable((by, selector)))
    el.click()
    return el

# ── Build cells ───────────────────────────────────────────────
code_cells = ["!nvidia-smi\nprint('GPU:', '"+GPU_TYPE+"')"]

if PLUGIN_CMDS.strip():
    plugin_code = "\n".join(
        f"import subprocess; subprocess.run('{c.strip()}', shell=True, check=False)"
        for c in PLUGIN_CMDS.split("&&") if c.strip()
    )
    plugin_code += "\nprint('✅ Plugins installed!')"
    code_cells.append(plugin_code)

code_cells.append("print('🚀 GPU Instance Ready! Instance ID: " + INSTANCE_ID + "')")

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
    # ── STEP 1: Google Sign In ────────────────────────────────
    log("Navigating to Google sign-in...")
    driver.get("https://accounts.google.com/signin/v2/identifier")
    time.sleep(3)

    email_input = wait.until(EC.presence_of_element_located((By.ID, "identifierId")))
    email_input.clear()
    email_input.send_keys(BOT_EMAIL)
    time.sleep(0.5)
    driver.find_element(By.ID, "identifierNext").click()
    time.sleep(3)

    pwd_input = wait.until(EC.element_to_be_clickable((By.NAME, "Passwd")))
    pwd_input.clear()
    pwd_input.send_keys(BOT_PASS)
    time.sleep(0.5)
    driver.find_element(By.ID, "passwordNext").click()
    time.sleep(6)

    log(f"Google login done. Current URL: {driver.current_url[:60]}")

    # ── STEP 2: Open new Colab notebook ──────────────────────
    log("Opening Colab new notebook...")
    driver.get("https://colab.research.google.com/notebook#create=true&language=python3")
    time.sleep(8)

    colab_url = driver.current_url
    log(f"Colab URL: {colab_url}")

    # ── STEP 3: Set runtime to GPU ────────────────────────────
    log("Opening Runtime menu to set GPU...")
    try:
        # Click Runtime in menu bar
        runtime_btn = wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//div[@id='runtime-menu-button'] | //span[text()='Runtime']")
        ))
        runtime_btn.click()
        time.sleep(1.5)

        # Click "Change runtime type"
        change_rt = wait.until(EC.element_to_be_clickable(
            (By.XPATH, "//li[contains(.,'Change runtime type')] | //div[contains(.,'Change runtime type')]")
        ))
        change_rt.click()
        time.sleep(2)

        # Select GPU accelerator
        try:
            accel_select = driver.find_element(
                By.XPATH, "//select[@id='accelerator-dropdown'] | //select[contains(@aria-label,'accelerator')]"
            )
            Select(accel_select).select_by_visible_text("GPU")
            log("Selected GPU from dropdown.")
        except:
            # New Colab UI: chip buttons
            gpu_chip = driver.find_element(
                By.XPATH, "//label[contains(.,'GPU')] | //span[contains(@class,'chip') and contains(.,'GPU')]"
            )
            gpu_chip.click()
            log("Clicked GPU chip.")
        time.sleep(1)

        # Save
        save = driver.find_element(
            By.XPATH, "//paper-button[contains(.,'Save')] | //button[contains(.,'Save')]"
        )
        save.click()
        time.sleep(3)
        log("Runtime type saved as GPU.")

    except Exception as e:
        log(f"Runtime set warning (may already be GPU): {e}", "warn")

    # ── STEP 4: Connect to runtime ────────────────────────────
    log("Connecting to GPU runtime...")
    try:
        connect = wait.until(EC.element_to_be_clickable(
            (By.XPATH,
             "//colab-connect-button | "
             "//*[@id='connect'] | "
             "//paper-button[@title='Connect to a hosted runtime'] | "
             "//div[contains(@class,'connect-button')]")
        ))
        connect.click()
        time.sleep(10)
        log("Runtime connected!")
    except Exception as e:
        log(f"Connect step: {e}", "warn")

    # ── STEP 5: Inject cells ──────────────────────────────────
    log("Injecting code cells...")
    try:
        for i, cell_code in enumerate(code_cells):
            # Click + Code button or use keyboard shortcut
            if i == 0:
                # Focus first cell
                first_cell = driver.find_element(
                    By.CSS_SELECTOR, ".cell.code .inputarea, .codecell .view-line"
                )
                first_cell.click()
                time.sleep(0.5)
                active = driver.switch_to.active_element
                active.send_keys(Keys.CONTROL + "a")
                active.send_keys(Keys.DELETE)
                active.send_keys(cell_code)
            else:
                # Insert new cell below: Alt+Enter or toolbar
                active = driver.switch_to.active_element
                active.send_keys(Keys.ESCAPE)
                time.sleep(0.3)
                # Ctrl+M then B = insert cell below
                ActionChains(driver).key_down(Keys.CONTROL).send_keys('m').key_up(Keys.CONTROL).perform()
                time.sleep(0.2)
                ActionChains(driver).send_keys('b').perform()
                time.sleep(0.5)
                active = driver.switch_to.active_element
                active.send_keys(cell_code)

            time.sleep(0.5)

        log("All cells injected. Running all cells...")

        # Ctrl+F9 = Run all
        ActionChains(driver)\
            .key_down(Keys.CONTROL)\
            .send_keys(Keys.F9)\
            .key_up(Keys.CONTROL)\
            .perform()
        time.sleep(5)
        log("Cells running!")

    except Exception as e:
        log(f"Cell injection error: {e}", "warn")

    # ── STEP 6: Report live URL & status ─────────────────────
    cb("notebook_url", url=colab_url)
    cb("status", status="running")
    log("✅ Instance RUNNING. Heartbeat starting...")

    # ── STEP 7: Heartbeat loop ────────────────────────────────
    for i in range(MAX_HEARTBEATS):
        time.sleep(HEARTBEAT_INTERVAL)
        try:
            # Simulate mouse move to prevent idle timeout
            ActionChains(driver).move_by_offset(1, 0).move_by_offset(-1, 0).perform()
            title = driver.title[:50]
            log(f"Heartbeat {i+1}/{MAX_HEARTBEATS} — {title}")
        except Exception as e:
            log(f"Heartbeat error: {e}", "warn")
            break

    log("Session time reached. Shutting down.", "warn")
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
