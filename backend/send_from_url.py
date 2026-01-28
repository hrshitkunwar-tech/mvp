#!/usr/bin/env python3
import requests
import base64

WEBHOOK_URL = "http://localhost:5678/webhook/navigator-screenshot-event"

FILE_URLS = [
    "https://abundant-porpoise-181.convex.cloud/api/storage/8bdd6f9b-002b-42a7-bba8-d9d6187054bd",
    # Add more URLs here
]

def send_file(file_url):
    print(f"\nFetching: {file_url}")
    response = requests.get(file_url)
    
    if response.status_code != 200:
        print(f"❌ Failed: {response.status_code}")
        return False
    
    image_b64 = base64.b64encode(response.content).decode('utf-8')
    data_uri = f"data:image/png;base64,{image_b64}"
    
    print(f"✅ Downloaded: {len(response.content) / 1024:.2f} KB")
    
    webhook_response = requests.post(
        WEBHOOK_URL,
        headers={"Content-Type": "application/json"},
        json={
            "action": "analyze_ui",
            "screenshot": data_uri,
            "context": {"source": "convex"}
        },
        timeout=60
    )
    
    print(f"✅ Webhook: {webhook_response.status_code}")
    return True

if __name__ == "__main__":
    success = 0
    for url in FILE_URLS:
        if send_file(url):
            success += 1
    
    print(f"\n📊 {success}/{len(FILE_URLS)} successful")
