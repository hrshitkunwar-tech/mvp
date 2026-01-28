#!/usr/bin/env python3
import requests
import base64

WEBHOOK_URL = "http://localhost:5678/webhook/navigator-screenshot-event"

# Manual approach: Download from Convex dashboard
# 1. Go to https://dashboard.convex.dev/t/hrshit-kunwar/vision-guide/abundant-porpoise-181/files
# 2. Click on file kg2cjm106mn11514gxa8b7n7zx7ztc4d
# 3. Copy the "Public URL" shown

# Paste the public URL here:
FILE_URL = "PASTE_PUBLIC_URL_HERE"

def send_file():
    response = requests.get(FILE_URL)
    if response.status_code != 200:
        print(f"Failed to download: {response.status_code}")
        return
    
    image_b64 = base64.b64encode(response.content).decode('utf-8')
    data_uri = f"data:image/png;base64,{image_b64}"
    
    webhook_response = requests.post(
        WEBHOOK_URL,
        headers={"Content-Type": "application/json"},
        json={
            "action": "analyze_ui",
            "screenshot": data_uri
        }
    )
    
    print(f"✅ Sent to webhook: {webhook_response.status_code}")

send_file()
