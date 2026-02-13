#!/usr/bin/env python3
import requests
import base64
import sys
import json

CONVEX_URL = "https://abundant-porpoise-181.convex.cloud"

def upload_screenshot(image_path, metadata=None):
    """Upload screenshot and auto-trigger n8n"""
    
    # Read and encode image
    with open(image_path, 'rb') as f:
        image_data = base64.b64encode(f.read()).decode('utf-8')
    
    data_uri = f"data:image/png;base64,{image_data}"
    
    # Upload to Convex
    response = requests.post(
        f"{CONVEX_URL}/upload-screenshot",
        headers={"Content-Type": "application/json"},
        json={
            "screenshot": data_uri,
            "metadata": metadata or {}
        },
        timeout=60
    )
    
    result = response.json()
    
    if response.status_code == 200:
        print(f"✅ Success!")
        print(f"   Storage ID: {result['storageId']}")
        print(f"   Webhook Status: {result['webhookStatus']}")
    else:
        print(f"❌ Error: {result.get('error', 'Unknown error')}")
    
    return result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 upload_screenshot.py <image-path>")
    else:
        upload_screenshot(sys.argv[1])
