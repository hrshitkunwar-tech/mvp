
import asyncio
import os
import json
from datetime import datetime, timezone
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode
from convex import ConvexClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

CONVEX_URL = os.getenv("CONVEX_URL")
if not CONVEX_URL:
    raise ValueError("CONVEX_URL not found in .env file")

client = ConvexClient(CONVEX_URL)

# Sample list of tools to crawl (Phase 1 test)
TOOLS_TO_CRAWL = [
    {
        "name": "Linear",
        "url": "https://linear.app",
        "docs_url": "https://linear.app/docs"
    },
    {
        "name": "Notion",
        "url": "https://www.notion.so/product",
        "docs_url": "https://www.notion.so/help"
    },
    {
        "name": "Figma",
        "url": "https://www.figma.com",
        "docs_url": "https://help.figma.com/hc/en-us"
    }
]

async def crawl_tool(crawler, tool):
    print(f"Crawling {tool['name']}...")
    
    urls = [tool['url']]
    if tool.get('docs_url'):
        urls.append(tool['docs_url'])

    for url in urls:
        try:
            # Configure crawl run
            run_config = CrawlerRunConfig(
                cache_mode=CacheMode.BYPASS,
                word_count_threshold=10,  # Minimum words to consider meaningful
            )

            result = await crawler.arun(url=url, config=run_config)
            
            if result.success:
                print(f"  Successfully crawled: {url} ({len(result.markdown)} chars)")
                
                # Store in Convex
                # Using 'scrapedata' table we just created
                client.mutation("scrapedata:insert", { # We'll need to define this mutation or use internal insert if using admin key, 
                                                       # but simpler to use generic 'insert' wrapper if available, 
                                                       # or standard convex client usually maps table access. 
                                                       # For now, let's assume we might need a mutation or direct db access.
                                                       # EDIT: Convex Python client fits 'mutation(name, args)' pattern. 
                                                       # We need to ensure a mutation exists or use 'any' generic if valid.
                                                       # Since we don't have a 'scrapedata:insert' mutation yet, I will write a simple one below 
                                                       # and ask you to add it, OORRRR allow me to add a quick mutation to your schema file first.
                    "tool_name": tool['name'],
                    "url": url,
                    "title": result.metadata.get("title", tool['name']),
                    "content": result.markdown,
                    "summary": f"Crawled content from {url}",
                    "crawled_at": int(datetime.now(timezone.utc).timestamp() * 1000),
                    "metadata": result.metadata
                })
                # Note: The above mutation call assumes 'scrapedata:insert' exists. 
                # I will add this mutation to your convex/scrapedata.ts file in a moment.
                
            else:
                print(f"  Failed: {url} - {result.error_message}")
                
        except Exception as e:
            print(f"  Error processing {url}: {e}")

async def main():
    browser_config = BrowserConfig(
        headless=True,
        verbose=True
    )
    
    async with AsyncWebCrawler(config=browser_config) as crawler:
        for tool in TOOLS_TO_CRAWL:
            await crawl_tool(crawler, tool)

if __name__ == "__main__":
    asyncio.run(main())
