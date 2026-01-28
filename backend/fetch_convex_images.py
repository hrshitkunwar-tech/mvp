#!/usr/bin/env python3
import requests
import json
from datetime import datetime

CONVEX_URL = "https://abundant-porpoise-181.convex.cloud"
WEBHOOK_URL = "http://localhost:5678/webhook/navigator-screenshot-event"

FILE_IDS = [
    "kg2cjm106mn11514gxa8b7n7zx7ztc4d",
    "kg2a9zdpzkgtp3m2t1t9akjqc57ztfzb"
]

def get_file_url(storage_id):
    return f"{CONVEX_URL}/api/storage/{storage_id}"

def fetch_and_convert_to_base64(storage_id):
    import base64
    file_url = get_file_url(storage_id)
    print(f"Fetching {storage_id}...")
    response = requests.get(file_url)
    if response.status_code != 200:
        raise Exception(f"Failed: {response.status_code}")
    image_base64 = base64.b64encode(response.content).decode('utf-8')
    data_uri = f"data:image/png;base64,{image_base64}"
    return data_uri, len(response.content)

def send_to_webhook(storage_id, image_data_uri):
    payload = {
        "action": "analyze_ui",
        "screenshot": image_data_uri,
        "context": {
            "storage_id": storage_id,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    }
    print(f"Sending to webhook...")
    response = requests.post(WEBHOOK_URL, headers={"Content-Type": "application/json"}, json=payload, timeout=60)
    return {"status_code": response.status_code}

def process_file(storage_id):
    try:
        print(f"\nProcessing: {storage_id}")
        image_data_uri, file_size = fetch_and_convert_to_base64(storage_id)
        print(f"Fetched: {file_size / 1024:.2f} KB")
        result = send_to_webhook(storage_id, image_data_uri)
        print(f"Success: {result['status_code']}")
        return result
    except Exception as e:
        print(f"Error: {str(e)}")
        return {"error": str(e)}

def process_all_files():
    results = []
    print(f"Processing {len(FILE_IDS)} files")
    for storage_id in FILE_IDS:
        result = process_file(storage_id)
        results.append(result)
    success = sum(1 for r in results if 'error' not in r)
    print(f"\nSummary: {success}/{len(results)} successful")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        process_file(sys.argv[1])
    else:
        process_all_files()
