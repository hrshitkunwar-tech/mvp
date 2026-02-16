import httpx
import json

CONVEX_URL = "https://abundant-porpoise-181.convex.cloud"

async def check_procedures():
    async with httpx.AsyncClient() as client:
        # Try to query procedures
        response = await client.post(
            f"{CONVEX_URL}/api/query",
            json={
                "path": "procedures:getByProduct",
                "args": {"product": "github.com"}
            }
        )
        print("Procedures for github.com:")
        print(json.dumps(response.json(), indent=2))

        # Try to get all procedures (we don't have a direct query for all, but let's try searching)
        # Or just use the 'findByIntent' with an empty string or something
        response = await client.post(
            f"{CONVEX_URL}/api/query",
            json={
                "path": "procedures:findByIntent",
                "args": {"intent": {"intent_description": ""}}
            }
        )
        print("\nAll Active Procedures (via findByIntent):")
        print(json.dumps(response.json(), indent=2))

if __name__ == "__main__":
    import asyncio
    asyncio.run(check_procedures())
