#!/usr/bin/env python3
import requests
import subprocess
import json
from datetime import datetime

WEBHOOK_URL = "http://localhost:5678/webhook/navigator-screenshot-event"
CONVEX_DIR = "/Users/harshit/Downloads/Navigator_Ultimate_Blueprint/backend/convex"

FILE_IDS = [
    "kg2cjm106mn11514gxa8b7n7zx7ztc4d",
    "kg2a9zdpzkgtp3m2t1t9akjqc57ztfzb"
]

def get_file_url_from_convex(storage_id):
    """Use Convex CLI to get file URL"""
    args = json.dumps({"storageId": storage_id})
    cmd = f'cd {CONVEX_DIR} && npx convex run files:getUrl \'{args}\''
    
    print(f"Running: {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    
    if result.returncode != 0:
        raise Exception(f"Convex CLI failed: {result.stderr}")
    
    output = result.stdout.strip()
    print(f"Convex output: {output}")
    
    # Parse the URL from output
    if 'https://' in output:
        # Extract URL from output
        for line in output.split('\n'):
            if 'https://' in line:
                # Clean up any quotes or extra characters
                url = line.strip().strip('"').strip("'")
                if url.startswith('https://'):
                    return url
    
    raise Exception(f"No valid URL found in: {output}")

def fetch_and_send(storage_id):
    import base64
    
    print(f"\n{'='*60}")
    print(f"Processing: {storage_id}")
    print(f"{'='*60}")
    
    try:
        # Get URL from Convex
        print("Getting file URL from Convex...")
        file_url = get_file_url_from_convex(storage_id)
        print(f"✅ Got URL: {file_url[:60]}...")
        
        # Fetch file
        print("Downloading file...")
        response = requests.get(file_url)
        if response.status_code != 200:
            raise Exception(f"Download failed: {response.status_code}")
        
        # Convert to base64
        image_b64 = base64.b64encode(response.content).decode('utf-8')
        data_uri = f"data:image/png;base64,{image_b64}"
        
        print(f"✅ File size: {len(response.content) / 1024:.2f} KB")
        
        # Send to webhook
        print("Sending to n8n webhook...")
        webhook_response = requests.post(
            WEBHOOK_URL,
            headers={"Content-Type": "application/json"},
            json={
                "action": "analyze_ui",
                "screenshot": data_uri,
                "context": {
                    "storage_id": storage_id,
                    "timestamp": datetime.utcnow().isoformat() + "Z"
                }
            },
            timeout=60
        )
        
        print(f"✅ Webhook responded: {webhook_response.status_code}")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        fetch_and_send(sys.argv[1])
    else:
        print(f"🚀 Processing {len(FILE_IDS)} files...\n")
        success = 0
        for file_id in FILE_IDS:
            if fetch_and_send(file_id):
                success += 1
        
        print(f"\n{'='*60}")
        print(f"📊 SUMMARY: {success}/{len(FILE_IDS)} successful")
        print(f"{'='*60}")
