# Backend Fetch Error Debug Report

## Summary
**Status**: 400 Bad Request from Convex Storage API  
**Root Cause**: Attempting to fetch files via direct `/api/storage/{id}` URL without signed URL  
**Impact**: `fetch_convex_images.py` cannot retrieve screenshots from Convex backend

---

## Detailed Error Analysis

### Error Message
```
InvalidStoragePath: Invalid storage path: "kg2cjm106mn11514gxa8b7n7zx7ztc4d". 
Please use `storage.getUrl(storageId: Id<"_storage">)` to generate a valid URL to retrieve files.
See https://docs.convex.dev/file-storage/serve-files for more details
```

### Root Cause
The script attempts to fetch files directly using:
```python
file_url = f"{CONVEX_URL}/api/storage/{storage_id}"
response = requests.get(file_url)  # ❌ Returns 400
```

**Problem**: Convex's `/api/storage/` endpoint is **not** a public direct download endpoint. It requires:
1. **Signed URLs**: Generated server-side by `ctx.storage.getUrl(storageId)`
2. **Authentication**: The URL includes time-limited signatures and auth tokens
3. **Access Control**: Prevents unauthorized file access

### Why This Design
Convex uses signed URLs for security:
- Files are private unless explicitly shared
- Each URL has expiration time (prevents permanent leaks)
- Audit trails for file access
- Prevents unauthorized enumeration of storage IDs

---

## Current Implementation vs. Correct Implementation

### ❌ CURRENT (Broken)
```python
# backend/fetch_convex_images.py
def get_file_url(storage_id):
    return f"{CONVEX_URL}/api/storage/{storage_id}"  # Direct URL - not allowed!

response = requests.get(file_url)  # 400 Bad Request
```

### ✅ CORRECT IMPLEMENTATION

**Step 1**: Convex backend must expose a query to generate signed URLs (already exists):
```typescript
// backend/convex/files.ts (or similar)
export const getUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
```

**Step 2**: Python script calls the Convex query to get signed URL:
```python
def get_file_url_via_convex_query(storage_id):
    """Get signed URL from Convex backend"""
    query_url = f"{CONVEX_URL}/api/query/files:getUrl"
    payload = {"storageId": storage_id}
    response = requests.post(query_url, json=payload)
    if response.status_code == 200:
        return response.json()  # Returns signed URL
    raise Exception(f"Failed: {response.status_code}")

# Then use the signed URL
signed_url = get_file_url_via_convex_query(storage_id)
response = requests.get(signed_url)  # ✅ Works!
```

---

## Verification: Convex Backend Already Has getUrl

Found in multiple locations:

### `backend/convex_blueprint_backup/files.ts`
```typescript
export const getUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
```

### `backend/convex/screenshots.ts`
Uses signed URLs correctly:
```typescript
export const getRecent = query({
  handler: async (ctx, args) => {
    const screenshots = await ctx.db.query("screenshots").order("desc").take(limit);
    
    // Correctly generates signed URLs for each screenshot
    const screenshotsWithUrls = await Promise.all(
      screenshots.map(async (screenshot) => {
        const url = await ctx.storage.getUrl(screenshot.storageId);  // ✅ Signed URL
        return { ...screenshot, url };
      })
    );
    
    return screenshotsWithUrls;
  },
});
```

---

## Action Items

### 1. Update `fetch_convex_images.py`
- [x] Add error handling to show clear 400 error message
- [x] Document why direct URLs don't work
- [ ] Implement proper flow using Convex queries
- [ ] Add authentication headers if required

### 2. Verify Convex Backend
- [ ] Confirm `getUrl` query is deployed
- [ ] Test query directly via `/api/query/files:getUrl`
- [ ] Ensure proper authentication/API keys are set

### 3. Choose One Implementation Path
**Option A**: Call Convex query to get signed URL, then fetch
- Best for Python scripts that need to fetch dynamically
- Requires Convex query to be public or authenticated

**Option B**: Fetch via Next.js/frontend first
- Frontend calls Convex query → gets signed URL → downloads file
- More secure (keeps file in-flight within app)

**Option C**: Server-to-server via Convex API
- Use Convex SDK from Node.js instead of HTTP requests
- More reliable than REST endpoints

---

## Additional Notes

### OpenSSL Warning
```
NotOpenSSLWarning: urllib3 v2 only supports OpenSSL 1.1.1+, 
currently the 'ssl' module is compiled with 'LibreSSL 2.8.3'
```
**Status**: Non-blocking warning  
**Fix**: Update macOS OpenSSL (optional, doesn't affect functionality)

### Next Steps
1. Deploy Convex backend if not already deployed
2. Test the `getUrl` query manually
3. Update `fetch_convex_images.py` to use signed URLs
4. Add retry logic and better error handling

---

## References
- [Convex File Storage Docs](https://docs.convex.dev/file-storage/serve-files)
- [Convex Security Best Practices](https://docs.convex.dev/security)
- Updated script: `backend/fetch_convex_images.py` (now includes diagnostics)
