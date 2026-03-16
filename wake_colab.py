import os
import time
from playwright.sync_api import sync_playwright

PROXY_SERVER = os.environ.get("PROXY_SERVER", "http://your.proxy.ip:port")
PROXY_USER = os.environ.get("PROXY_USER", "username")
PROXY_PASS = os.environ.get("PROXY_PASS", "password")

# **IMPORTANT: Put your exact Colab notebook URL here**
COLAB_URL = "https://colab.research.google.com/drive/1Z2-3rN_7OHlKaoHhoy2tm_9c-WVp-hxB#scrollTo=jig4wwVSTBL4"

def run_colab():
    cookie_data = os.environ.get("GOOGLE_COOKIES")
    if not cookie_data:
        print("❌ Error: GOOGLE_COOKIES secret not found!")
        return

    with open("google_auth.json", "w") as f:
        f.write(cookie_data)

    print("🚀 Booting Stealth Browser...")
    with sync_playwright() as p:
        # Launch browser with native stealth arguments instead of broken libraries
        browser = p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"],
            proxy={
                "server": PROXY_SERVER,
                "username": PROXY_USER,
                "password": PROXY_PASS
            }
        )
        
        # Inject a real human User-Agent
        context = browser.new_context(
            storage_state="google_auth.json",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        print(f"🌐 Navigating to Colab through proxy...")
        page.goto(COLAB_URL)
        time.sleep(15) 

        print("⚡ Triggering Run All (Ctrl+F9)...")
        page.keyboard.press("Control+F9")
        time.sleep(10) 
        
        print("✅ Colab is waking up. Shutting down stealth browser.")
        browser.close()

    os.remove("google_auth.json")

if __name__ == "__main__":
    run_colab()
