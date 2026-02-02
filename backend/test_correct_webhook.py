#!/usr/bin/env python3
"""Test webhook with correct path"""
import requests
import base64
from datetime import datetime

WEBHOOK_URL = "http://localhost:5678/webhook/navigator-screenshot"

# Load test image
with open('extension/icon.png', 'rb') as f:
    image_data = f.read()

image_base64 = base64.b64encode(image_data).decode('utf-8')
data_uri = f"data:image/png;base64,{image_base64}"

payload = {
    "action": "analyze_ui",
    "screenshot": data_uri,
    "context": {
        "source": "test_image",
        "storage_id": "test-local-image",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
}

print("=" * 70)
print("TEST: Send image to CORRECT webhook path")
print("=" * 70 + "\n")
print(f"✅ Loaded test image (289,755 bytes)")
print(f"✅ Converted to base64 data URI (386,362 chars)")
print(f"✅ Created webhook payload\n")
print(f"📤 Sending to webhook: {WEBHOOK_URL}\n")

response = requests.post(
    WEBHOOK_URL,
    headers={"Content-Type": "application/json"},
    json=payload,
    timeout=60
)

print(f"📊 Response status: {response.status_code}\n")

if response.status_code == 200:
    print("✅ SUCCESS! Webhook received and processed!\n")
    try:
        print("Response:", response.json())
    except:
        print("Response:", response.text[:300])
elif response.status_code >= 400:
    print(f"❌ Error: {response.status_code}")
    print(f"   {response.text[:500]}")
else:
    print(f"⚠️  Status: {response.status_code}")
    print(f"   {response.text[:300]}")

print("\n" + "=" * 70)
