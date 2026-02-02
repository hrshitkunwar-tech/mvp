#!/usr/bin/env python3
"""
Test script: Send local test image to Navigator webhook
Tests the complete flow: load image → convert to base64 → send to webhook
"""
import requests
import base64
import json
from datetime import datetime

WEBHOOK_URL = "http://localhost:5678/webhook/navigator-screenshot"  # Correct n8n webhook path

def send_test_image_to_webhook():
    """Test workflow: Load local test image and send to webhook"""
    
    # 1. Load test image
    test_image_path = 'extension/icon.png'
    try:
        with open(test_image_path, 'rb') as f:
            image_data = f.read()
        print(f"✅ Loaded test image: {test_image_path} ({len(image_data)} bytes)")
    except Exception as e:
        print(f"❌ Failed to load test image: {e}")
        return
    
    # 2. Convert to base64 data URI
    image_base64 = base64.b64encode(image_data).decode('utf-8')
    data_uri = f"data:image/png;base64,{image_base64}"
    print(f"✅ Converted to base64 data URI ({len(data_uri)} chars)")
    
    # 3. Create payload for webhook
    payload = {
        "action": "analyze_ui",
        "screenshot": data_uri,
        "context": {
            "source": "test_image",
            "storage_id": "test-local-image",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    }
    print(f"✅ Created webhook payload")
    
    # 4. Send to webhook
    print(f"\n📤 Sending to webhook: {WEBHOOK_URL}")
    try:
        response = requests.post(
            WEBHOOK_URL,
            headers={"Content-Type": "application/json"},
            json=payload,
            timeout=60
        )
        print(f"✅ Response status: {response.status_code}")
        
        if response.status_code == 200:
            print(f"✅ SUCCESS! Webhook received and processed image")
            try:
                print(f"   Response: {response.json()}")
            except:
                print(f"   Response: {response.text[:200]}")
        elif response.status_code >= 400:
            print(f"❌ Webhook error: {response.status_code}")
            print(f"   {response.text[:300]}")
        else:
            print(f"⚠️  Unexpected status: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print(f"❌ Connection error: Webhook not running at {WEBHOOK_URL}")
        print(f"   Make sure n8n webhook is accessible or webhook service is running")
    except Exception as e:
        print(f"❌ Error sending to webhook: {e}")

if __name__ == "__main__":
    print("=" * 70)
    print("TEST: Send local image to Navigator webhook")
    print("=" * 70 + "\n")
    send_test_image_to_webhook()
    print("\n" + "=" * 70)
