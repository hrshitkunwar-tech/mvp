#!/usr/bin/env python3
import requests
import time
import base64
from datetime import datetime

CONVEX_URL = "https://abundant-porpoise-181.convex.cloud"
WEBHOOK_URL = "http://localhost:5678/webhook/navigator-screenshot-event"

processed_ids = set()

def get_recent_files():
    """Get recent files from Convex (you'll need to implement the API call)"""
    # For now, manually add file IDs as they're uploaded
    return [
        "kg2cjm106mn11514gxa8b7n7zx7ztc4d",
        "kg2a9zdpzkgtp3m2t1t9akjqc57ztfzb"
    ]

def process_file(storage_id):
    if storage_id in processed_ids:
        return
    
    print(f"\n🆕 New file detected: {storage_id}")
    
    # Fetch file
    file_url = f"{CONVEX_URL}/api/storage/{storage_id}"
    response = requests.get(file_url)
    
    if response.status_code != 200:
        print(f"❌ Failed to fetch: {response.status_code}")
        return
    
    # Convert to base64
    image_b64 = base64.b64encode(response.content).decode('utf-8')
    data_uri = f"data:image/png;base64,{image_b64}"
    
    # Send to webhook
    webhook_response = requests.post(
        WEBHOOK_URL,
        headers={"Content-Type": "application/json"},
        json={
            "action": "analyze_ui",
            "screenshot": data_uri,
            "context": {
                "storage_id": storage_id,
                "source": "convex_watcher",
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        },
        timeout=60
    )
    
    if webhook_response.status_code == 200:
        processed_ids.add(storage_id)
        print(f"✅ Processed successfully")
    else:
        print(f"❌ Webhook failed: {webhook_response.status_code}")

def watch():
    print("👀 Watching Convex for new files... (Ctrl+C to stop)")
    
    while True:
        try:
            file_ids = get_recent_files()
            for file_id in file_ids:
                process_file(file_id)
            time.sleep(10)  # Check every 10 seconds
        except KeyboardInterrupt:
            print("\n🛑 Stopped watching")
            break
        except Exception as e:
            print(f"❌ Error: {e}")
            time.sleep(10)

if __name__ == "__main__":
    watch()
