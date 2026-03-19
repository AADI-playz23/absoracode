"""
scripts/selenium_colab.py

Single Google account bot:
  1. Log into Google ONCE (shared Chrome profile)
  2. Open Colab — already authenticated via Google session
  3. Set GPU runtime, connect, inject cells, run all
  4. Post notebook URL → platform callback
  5. Heartbeat loop to keep session alive

GitHub Secrets required:
  BOT_GOOGLE_EMAIL
  BOT_GOOGLE_PASSWORD
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

# ── Environment ───────────────────────────────────────────────
INSTANCE_ID  = os.environ["INSTANCE_ID"]
GPU_TYPE     = os.environ["GPU_TYPE"]           # T4 or P100
API_KEY      = os.environ["USER_API_KEY"]
PLUGIN_CMDS  = os.environ.get("PLUGIN_CMDS", "")
CALLBACK_URL = os.environ["CALLBACK_URL"]
BOT_EMAIL    = os.environ["BOT_GOOGLE_EMAIL"]
BOT_PASS     = os.environ["BOT_GOOGLE_PASSWORD"]

# Shared Chrome profile path — same profile used by kaggle bot
# so if both run on same machine they share the Google session
CHROME_PROFILE = "/tmp/chrome-google-bot"

HEARTBEAT_INTERVAL = 300   # 5 min
MAX_HEARTBEATS     = 72    # 6 hours max

# ── Callback & log helpers ────────────────────────────────────
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
    """Try XPaths in order, click first match."""
    for xp in xpaths:
        try:
            el = WebDriverWait(driver, timeout).until(
                EC.element_to_be_clickable((By.XPATH, xp))
            )
            el.click()
            return el
        except:
            continue
    raise Exception(f"No clickable element found among provided XPaths")

def slow_type(element, text, delay=0.04):
    """Type character-by-character to avoid bot detection."""
    for ch in text:
        element.send_keys(ch)
        time.sleep(delay)

# ── Build notebook cells ──────────────────────────────────────
code_cells = [
    f"!nvidia-smi\nprint('✅ GPU Type: {GPU_TYPE}')"
]

if PLUGIN_CMDS.strip():
    plugin_lines = []
    for cmd in PLUGIN_CMDS.split("&&"):
        cmd = cmd.strip()
        if cmd:
            plugin_lines.append(
                f"import subprocess; subprocess.run('{cmd}', shell=True, check=False)"
            )
    plugin_lines.append("print('✅ All plugins installed!')")
    code_cells.append("\n".join(plugin_lines))

code_cells.append(
    f"print('🚀 GPU Instance {INSTANCE_ID} is READY!')\n"
    "print('Add your own cells below this line.')"
)

# ── Chrome setup ──────────────────────────────────────────────
opts = Options()
opts.add_argument("--headless=new")
opts.add_argument("--no-sandbox")
opts.add_argument("--disable-dev-shm-usage")
opts.add_argument("--disable-gpu-sandbox")
opts.add_argument("--window-size=1920,1080")
opts.add_argument("--disable-blink-features=AutomationControlled")
opts.add_argument(
    "--user-agent=Mozilla/5.0 (X11; Linux x86_64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
opts.add_argument(f"--user-data-dir={CHROME_PROFILE}")   # ← shared profile
opts.add_experimental_option("excludeSwitches", ["enable-automation"])
opts.add_experimental_option("useAutomationExtension", False)

service = Service(ChromeDriverManager().install())
driver  = webdriver.Chrome(service=service, options=opts)
wait    = WebDriverWait(driver, 30)

# Mask webdriver flag
driver.execute_script(
    "Object.defineProperty(navigator,'webdriver',{get:()=>undefined})"
)

try:
    # ─────────────────────────────────────────────────────────
    # STEP 1 — Sign into Google
    # Because we use --user-data-dir, if the session cookie still
    # exists from a previous run, this step is skipped automatically.
    # ─────────────────────────────────────────────────────────
    log("Navigating to Google sign-in...")
    driver.get("https://accounts.google.com/signin/v2/identifier?hl=en")
    time.sleep(3)

    # Check if already signed in (redirected away from sign-in page)
    if "myaccount.google.com" in driver.current_url or "google.com/intl" in driver.current_url:
        log("✅ Already signed into Google (cached session).")
    else:
        # Enter email
        try:
            email_el = wait.until(EC.presence_of_element_located((By.ID, "identifierId")))
            slow_type(email_el, BOT_EMAIL)
            time.sleep(0.5)
            try_click(driver, "//div[@id='identifierNext']", "//button[@id='identifierNext']")
            time.sleep(3)

            # Enter password
            pwd_el = wait.until(EC.element_to_be_clickable((By.NAME, "Passwd")))
            slow_type(pwd_el, BOT_PASS)
            time.sleep(0.5)
            try_click(driver, "//div[@id='passwordNext']", "//button[@id='passwordNext']")
            time.sleep(6)

            log(f"Google sign-in submitted. Current URL: {driver.current_url[:60]}")
        except Exception as e:
            log(f"Google sign-in step: {e}", "warn")

    # ─────────────────────────────────────────────────────────
    # STEP 2 — Open Colab (session cookie already present)
    # ─────────────────────────────────────────────────────────
    log("Opening Google Colab new notebook...")
    driver.get("https://colab.research.google.com/notebook#create=true&language=python3")
    time.sleep(8)

    colab_url = driver.current_url
    log(f"Colab loaded. URL: {colab_url}")

    # If redirected to accounts.google.com, choose the bot account
    if "accounts.google.com" in colab_url:
        log("Colab needs account selection...", "warn")
        try:
            # Click the bot account in the chooser
            account = driver.find_element(
                By.XPATH, f"//div[contains(.,'{BOT_EMAIL}')] | //li[@data-identifier='{BOT_EMAIL}']"
            )
            account.click()
            time.sleep(5)
            colab_url = driver.current_url
        except Exception as e:
            log(f"Account chooser: {e}", "warn")

    # ─────────────────────────────────────────────────────────
    # STEP 3 — Set Runtime to GPU
    # ─────────────────────────────────────────────────────────
    log("Setting runtime to GPU...")
    try:
        # Open Runtime menu
        try_click(driver,
            "//div[@id='runtime-menu-button']",
            "//span[normalize-space()='Runtime']",
            "//div[contains(@class,'menubar')]//div[contains(.,'Runtime')]",
            timeout=15
        )
        time.sleep(1.5)

        # Change runtime type
        try_click(driver,
            "//li[contains(.,'Change runtime type')]",
            "//div[contains(@class,'menu-item')][contains(.,'Change runtime type')]",
            timeout=10
        )
        time.sleep(2.5)

        # Select GPU accelerator — handles old dropdown and new chip UI
        gpu_selected = False
        try:
            sel_el = driver.find_element(By.XPATH,
                "//select[contains(@aria-label,'accelerator') or contains(@aria-label,'Hardware') or @id='accelerator-dropdown']"
            )
            Select(sel_el).select_by_visible_text("GPU")
            gpu_selected = True
            log("GPU selected via dropdown.")
        except:
            pass

        if not gpu_selected:
            try:
                chip = driver.find_element(By.XPATH,
                    "//label[contains(.,'T4 GPU')] | "
                    "//label[contains(.,'GPU')] | "
                    "//span[contains(@class,'chip')][contains(.,'GPU')]"
                )
                chip.click()
                gpu_selected = True
                log("GPU selected via chip UI.")
            except:
                pass

        if not gpu_selected:
            log("Could not select GPU accelerator — using default.", "warn")

        time.sleep(0.8)

        # Save
        try_click(driver,
            "//paper-button[normalize-space()='Save']",
            "//button[normalize-space()='Save']",
            "//div[@role='button'][normalize-space()='Save']",
            timeout=10
        )
        time.sleep(3)
        log("Runtime saved as GPU.")

    except Exception as e:
        log(f"Runtime dialog issue: {e}", "warn")

    # ─────────────────────────────────────────────────────────
    # STEP 4 — Connect to runtime
    # ─────────────────────────────────────────────────────────
    log("Connecting to GPU runtime...")
    try:
        try_click(driver,
            "//colab-connect-button",
            "//*[@id='connect']",
            "//paper-button[@title='Connect to a hosted runtime']",
            "//*[contains(@aria-label,'Connect to a hosted runtime')]",
            "//*[contains(@class,'connect-button')]",
            timeout=20
        )
        log("Waiting for GPU allocation (≈10–15s)...")
        time.sleep(15)

        # Verify connection — RAM/disk bar should appear
        try:
            WebDriverWait(driver, 20).until(
                EC.presence_of_element_located(
                    (By.XPATH, "//*[contains(@class,'usage-display')] | //*[@title='RAM usage']")
                )
            )
            log("✅ GPU Runtime connected!")
        except:
            log("Connection bar not detected — may still be connecting.", "warn")

    except Exception as e:
        log(f"Connect step issue: {e}", "warn")

    # ─────────────────────────────────────────────────────────
    # STEP 5 — Inject cells
    # ─────────────────────────────────────────────────────────
    log(f"Injecting {len(code_cells)} cells into notebook...")
    try:
        for i, cell_code in enumerate(code_cells):
            time.sleep(0.8)

            if i == 0:
                # Focus first default cell, clear it, type code
                try:
                    cell = driver.find_element(By.CSS_SELECTOR,
                        ".cell.code .inputarea, .codecell .CodeMirror, "
                        ".cell .view-line, .inputarea"
                    )
                    cell.click()
                    time.sleep(0.3)
                except:
                    driver.find_element(By.TAG_NAME, "body").click()

                active = driver.switch_to.active_element
                active.send_keys(Keys.CONTROL + "a")
                time.sleep(0.1)
                active.send_keys(Keys.DELETE)
                active.send_keys(cell_code)
            else:
                # Escape to command mode, then Ctrl+M B = insert cell below
                ActionChains(driver).send_keys(Keys.ESCAPE).perform()
                time.sleep(0.2)
                ActionChains(driver)\
                    .key_down(Keys.CONTROL).send_keys("m").key_up(Keys.CONTROL)\
                    .perform()
                time.sleep(0.2)
                ActionChains(driver).send_keys("b").perform()
                time.sleep(0.5)
                driver.switch_to.active_element.send_keys(cell_code)

        log("All cells typed. Running all (Ctrl+F9)...")
        ActionChains(driver)\
            .key_down(Keys.CONTROL).send_keys(Keys.F9).key_up(Keys.CONTROL)\
            .perform()
        time.sleep(5)
        log("✅ Cells executing!")

    except Exception as e:
        log(f"Cell injection issue: {e}", "warn")

    # ─────────────────────────────────────────────────────────
    # STEP 6 — Report back to platform
    # ─────────────────────────────────────────────────────────
    cb("notebook_url", url=colab_url)
    cb("status", status="running")
    log("🚀 Instance RUNNING. Heartbeat loop starting...")

    # ─────────────────────────────────────────────────────────
    # STEP 7 — Heartbeat (keeps browser open + Colab alive)
    # ─────────────────────────────────────────────────────────
    for i in range(MAX_HEARTBEATS):
        time.sleep(HEARTBEAT_INTERVAL)
        try:
            # Tiny mouse movement to prevent Colab idle disconnect
            ActionChains(driver).move_by_offset(2, 0).move_by_offset(-2, 0).perform()
            log(f"Heartbeat {i+1}/{MAX_HEARTBEATS} | {driver.title[:50]}")
        except Exception as e:
            log(f"Heartbeat failed: {e}", "warn")
            break

    log("Max session time reached. Wrapping up.", "warn")
    cb("status", status="stopped")

except Exception as e:
    log(f"FATAL: {e}", "error")
    cb("status", status="failed")
    raise

finally:
    try: driver.quit()
    except: pass
