#!/usr/bin/env python3
"""
Test the n8n workflow fix
"""
import requests
import json
import time

WEBHOOK_URL = "http://localhost:5678/webhook/navigator-screenshot"

def test_webhook():
    payload = {
        "session_id": f"test_{int(time.time())}",
        "timestamp": int(time.time() * 1000),
        "screenshot_url": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA",
        "viewport": {
            "width": 1920,
            "height": 1080,
            "url": "https://github.com"
        },
        "query": "how to create a repository"
    }
    
    print(f"Testing webhook: {WEBHOOK_URL}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    print("\nSending request...")
    
    try:
        response = requests.post(
            WEBHOOK_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print(f"Response Body:")
        
        try:
            data = response.json()
            print(json.dumps(data, indent=2))
        except:
            print(response.text[:500])
            
    except requests.exceptions.Timeout:
        print("ERROR: Request timed out - n8n workflow may be hanging")
    except requests.exceptions.ConnectionError as e:
        print(f"ERROR: Connection failed - {e}")
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}")

if __name__ == "__main__":
    test_webhook()
