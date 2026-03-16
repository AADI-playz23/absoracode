import os
import time
import json
from playwright.sync_api import sync_playwright

# Default to empty strings so it knows not to use a fake proxy
PROXY_SERVER = os.environ.get("PROXY_SERVER", "")
PROXY_USER = os.environ.get("PROXY_USER", "")
PROXY_PASS = os.environ.get("PROXY_PASS", "")

# **IMPORTANT: Put your exact Colab notebook URL here**
COLAB_URL = "https://colab.research.google.com/drive/1Z2-3rN_7OHlKaoHhoy2tm_9c-WVp-hxB#scrollTo=jig4wwVSTBL4"

def run_colab():
    cookie_data = os.environ.get("GOOGLE_COOKIES")
    if not cookie_data:
        print("❌ Error: GOOGLE_COOKIES secret not found!")
        return

    print("🧩 Parsing Cookies...")
    try:
        parsed_cookies = json.loads(cookie_data)
        final_json = {"cookies": parsed_cookies} if isinstance(parsed_cookies, list) else parsed_cookies
        with open("google_auth.json", "w") as f:
            json.dump(final_json, f, indent=2)
    except Exception as e:
        print(f"❌ CRITICAL JSON ERROR: {e}")
        return

    print("🚀 Booting Stealth Browser...")
    
    # Only configure proxy if a real URL was provided
    proxy_settings = {
        "server": PROXY_SERVER,
        "username": PROXY_USER,
        "password": PROXY_PASS
    } if PROXY_SERVER.startswith("http") else None

    if not proxy_settings:
        print("⚠️ No proxy detected. Running directly from GitHub IP.")

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"],
            proxy=proxy_settings
        )
        
        context = browser.new_context(
            storage_state="google_auth.json",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        print(f"🌐 Navigating to Colab...")
        page.goto(COLAB_URL)
        time.sleep(15) 

        print("⚡ Triggering Run All (Ctrl+F9)...")
        page.keyboard.press("Control+F9")
        time.sleep(10) 
        
        print("✅ Colab is waking up. Shutting down stealth browser.")
        browser.close()

    if os.path.exists("google_auth.json"):
        os.remove("google_auth.json")

if __name__ == "__main__":
    run_colab()
