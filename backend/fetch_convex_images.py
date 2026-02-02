#!/usr/bin/env python3
import requests
import json
from datetime import datetime

CONVEX_URL = "https://abundant-porpoise-181.convex.cloud"
WEBHOOK_URL = "http://localhost:5678/webhook/navigator-screenshot"  # Correct n8n webhook path

FILE_IDS = [
    "kg2cjm106mn11514gxa8b7n7zx7ztc4d",
    "kg2a9zdpzkgtp3m2t1t9akjqc57ztfzb"
]

def get_file_url(storage_id):
    """
    NOTE: This endpoint requires a signed URL from ctx.storage.getUrl() in Convex backend.
    Direct /api/storage/{id} access is NOT supported - see Convex docs:
    https://docs.convex.dev/file-storage/serve-files
    
    To fetch files correctly:
    1. Call a Convex query that uses ctx.storage.getUrl(storageId)
    2. Use the returned signed URL
    3. This ensures proper authentication and access control
    """
    return f"{CONVEX_URL}/api/storage/{storage_id}"

def get_file_url_via_convex_query(storage_id):
    """
    Fetch signed URL from Convex backend using the getUrl query.
    Requires a getUrl query function in Convex backend.
    """
    query_url = f"{CONVEX_URL}/api/query/files:getUrl"
    payload = {"storageId": storage_id}
    try:
        response = requests.post(query_url, json=payload)
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Failed to get signed URL: {response.status_code} - {response.text}")
    except Exception as e:
        raise Exception(f"Cannot get signed URL via Convex query: {str(e)}")

def fetch_and_convert_to_base64(storage_id):
    import base64
    print(f"Fetching {storage_id}...")
    
    # Try via direct URL first (will fail with 400 - this is expected)
    file_url = get_file_url(storage_id)
    print(f"  Attempting direct URL: {file_url}")
    response = requests.get(file_url)
    
    if response.status_code == 400:
        error_data = response.json()
        print(f"  ❌ Direct URL failed (expected): {error_data.get('message', response.text)}")
        print(f"  💡 Solution: Use signed URLs from Convex backend via ctx.storage.getUrl()")
        raise Exception(f"Invalid storage path. Must use signed URLs from Convex backend.")
    
    if response.status_code != 200:
        raise Exception(f"Failed: {response.status_code} - {response.text}")
    
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
        return {"error": str(e), "storage_id": storage_id}

def process_all_files():
    results = []
    print(f"Processing {len(FILE_IDS)} files")
    print("\n⚠️  NOTE: This script attempts direct /api/storage/{id} URLs, which")
    print("   requires signed URLs from Convex backend. See error details below.\n")
    
    for storage_id in FILE_IDS:
        result = process_file(storage_id)
        results.append(result)
    
    success = sum(1 for r in results if 'error' not in r)
    errors = sum(1 for r in results if 'error' in r)
    print(f"\nSummary: {success}/{len(results)} successful, {errors} failed")
    
    if errors > 0:
        print("\n📋 DIAGNOSIS:")
        print("  Status: 400 Bad Request - Invalid storage path")
        print("  Cause: Convex /api/storage/ endpoint requires signed URLs")
        print("  Fix: Use ctx.storage.getUrl(storageId) in Convex backend")
        print("\n  Correct approach:")
        print("  1. In Convex backend (convex/files.ts):")
        print("     export const getUrl = query({")
        print("       args: { storageId: v.id('_storage') },")
        print("       handler: async (ctx, args) => {")
        print("         return await ctx.storage.getUrl(args.storageId);")
        print("       }")
        print("     })")
        print("  2. Call the Convex query from frontend/backend to get signed URL")
        print("  3. Use signed URL to fetch file content")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        process_file(sys.argv[1])
    else:
        process_all_files()
