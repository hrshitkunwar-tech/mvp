"""
Navigator RAG API Server
FastAPI server that bridges the browser extension with Ollama and Convex knowledge graphs.

Architecture:
1. Extension sends query + context
2. Server detects tool (1 of 89 knowledge graphs)
3. Determines if generic or tool-specific query
4. If tool-specific: RAG with Convex knowledge + UI context
5. Streams response from Ollama
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import httpx
import json
import asyncio
from typing import Optional
import os

app = FastAPI(title="Navigator RAG API", version="2.0.4")

# CORS middleware for extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434")
CONVEX_URL = os.getenv("CONVEX_URL", "https://abundant-porpoise-181.convex.cloud")

# Request models
class DetectToolRequest(BaseModel):
    url: str
    title: str

class ChatRequest(BaseModel):
    query: str
    tool_name: Optional[str] = None
    url: str
    context_text: str

# Tool detection database (maps URL patterns to tool names)
# This should ideally be loaded from Convex or a config file
TOOL_PATTERNS = {
    "github.com": "GitHub",
    "gitlab.com": "GitLab",
    "bitbucket.org": "Bitbucket",
    "stackoverflow.com": "Stack Overflow",
    "docs.python.org": "Python Docs",
    "developer.mozilla.org": "MDN",
    "reactjs.org": "React",
    "angular.io": "Angular",
    "vuejs.org": "Vue.js",
    "nodejs.org": "Node.js",
    "aws.amazon.com": "AWS",
    "cloud.google.com": "Google Cloud",
    "azure.microsoft.com": "Azure",
    "docker.com": "Docker",
    "kubernetes.io": "Kubernetes",
    "figma.com": "Figma",
    "notion.so": "Notion",
    "slack.com": "Slack",
    "trello.com": "Trello",
    "jira.atlassian.com": "Jira",
    # Add more tools as needed (89 total)
}

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "Navigator RAG API",
        "version": "2.0.4",
        "status": "online",
        "endpoints": ["/detect-tool", "/chat"]
    }

@app.post("/detect-tool")
async def detect_tool(request: DetectToolRequest):
    """
    Detects which tool/service the page belongs to.
    Returns tool information if detected, otherwise returns detected=False.
    """
    url = request.url.lower()

    # Check URL patterns
    for pattern, tool_name in TOOL_PATTERNS.items():
        if pattern in url:
            return {
                "detected": True,
                "tool_name": tool_name,
                "confidence": 0.95,
                "has_knowledge": True  # TODO: Check Convex for actual knowledge
            }

    # No tool detected
    return {
        "detected": False,
        "tool_name": None,
        "confidence": 0.0,
        "has_knowledge": False
    }

async def query_convex_knowledge(tool_name: str, query: str, limit: int = 5):
    """
    Queries Convex database for relevant knowledge chunks.
    Uses simple text search for now (can be upgraded to vector search).
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{CONVEX_URL}/api/query",
                json={
                    "path": "knowledge:searchKnowledge",
                    "args": {
                        "query": query,
                        "tool_name": tool_name,
                        "limit": limit
                    }
                }
            )

            if response.status_code == 200:
                data = response.json()
                return data.get("value", [])
            else:
                print(f"Convex query failed: {response.status_code}")
                return []
    except Exception as e:
        print(f"Error querying Convex: {e}")
        return []

def build_rag_prompt(query: str, tool_name: Optional[str], context_text: str, knowledge_chunks: list):
    """
    Builds the augmented prompt for Ollama with:
    - User query
    - Page context (UI elements, text)
    - Retrieved knowledge from database
    """

    # Base system prompt
    system = """You are Navigator, a contextual AI assistant that helps users understand and navigate tools.

Key principles:
1. Ground answers in the provided page context and knowledge base
2. If you don't see relevant information, say so clearly
3. Be concise and actionable
4. Consider the user's current screen context to understand their objective
"""

    # Add tool-specific context
    if tool_name and knowledge_chunks:
        system += f"\n\nYou are currently helping with {tool_name}. Use the following knowledge base:\n\n"
        for i, chunk in enumerate(knowledge_chunks, 1):
            system += f"[Source {i}]\n{chunk.get('content', '')[:500]}...\n\n"

    # Add page context
    system += f"\n\nCurrent page context:\n{context_text[:2000]}\n"

    # User query
    user_prompt = f"\nUser question: {query}\n\nProvide a helpful, grounded answer:"

    return system + user_prompt

async def stream_ollama_response(prompt: str):
    """
    Streams response from Ollama.
    Yields JSON lines compatible with the extension's stream parser.
    """
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            async with client.stream(
                "POST",
                f"{OLLAMA_URL}/api/chat",
                json={
                    "model": "qwen2.5-coder:7b",
                    "messages": [
                        {"role": "system", "content": prompt.split("User question:")[0]},
                        {"role": "user", "content": prompt.split("User question:")[1] if "User question:" in prompt else prompt}
                    ],
                    "stream": True
                }
            ) as response:
                if response.status_code != 200:
                    error_text = await response.aread()
                    yield json.dumps({"error": f"Ollama error: {error_text.decode()}"}) + "\n"
                    return

                async for line in response.aiter_lines():
                    if line.strip():
                        try:
                            data = json.loads(line)
                            # Forward the Ollama response format
                            yield json.dumps(data) + "\n"
                        except json.JSONDecodeError:
                            continue
        except httpx.ConnectError:
            yield json.dumps({"error": "Cannot connect to Ollama. Is it running on port 11434?"}) + "\n"
        except Exception as e:
            yield json.dumps({"error": f"Stream error: {str(e)}"}) + "\n"

@app.post("/chat")
async def chat(request: ChatRequest):
    """
    Main chat endpoint with RAG.

    Flow:
    1. Determine if query is generic or tool-specific
    2. If tool-specific and tool detected: Query Convex for relevant knowledge
    3. Build augmented prompt with context + knowledge
    4. Stream response from Ollama
    """

    # Step 1: Determine if tool-specific
    is_tool_specific = request.tool_name is not None

    # Step 2: Query knowledge base if tool-specific
    knowledge_chunks = []
    if is_tool_specific:
        print(f"Tool-specific query for {request.tool_name}: {request.query}")
        knowledge_chunks = await query_convex_knowledge(
            request.tool_name,
            request.query,
            limit=5
        )
        print(f"Retrieved {len(knowledge_chunks)} knowledge chunks from Convex")
    else:
        print(f"Generic query: {request.query}")

    # Step 3: Build augmented prompt
    prompt = build_rag_prompt(
        request.query,
        request.tool_name,
        request.context_text,
        knowledge_chunks
    )

    # Step 4: Stream response from Ollama
    return StreamingResponse(
        stream_ollama_response(prompt),
        media_type="application/x-ndjson"
    )

if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print("Navigator RAG API Server v2.0.4")
    print("=" * 60)
    print(f"Ollama URL: {OLLAMA_URL}")
    print(f"Convex URL: {CONVEX_URL}")
    print("Starting server on http://127.0.0.1:8000")
    print("=" * 60)
    uvicorn.run(app, host="127.0.0.1", port=8000)
