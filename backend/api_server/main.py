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
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3:8b")

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

async def classify_query(query: str, tool_name: Optional[str], context_text: str) -> str:
    """
    Uses Ollama to classify if query is general or domain-specific.
    Returns: "general" or "domain-specific"
    """
    classification_prompt = f"""Analyze this user query and classify it as either "general" or "domain-specific".

General queries: Questions about general knowledge, concepts, programming basics that don't require specific tool documentation.
Domain-specific queries: Questions about specific tools, products, or features that would benefit from documentation/knowledge base.

User is currently on: {tool_name if tool_name else "unknown page"}
Page context: {context_text[:500]}

User query: "{query}"

Respond with ONLY one word: "general" or "domain-specific"
"""

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": classification_prompt,
                    "stream": False
                }
            )

            if response.status_code == 200:
                result = response.json()
                classification = result.get("response", "").strip().lower()

                # Validate response
                if "domain-specific" in classification or "domain" in classification:
                    return "domain-specific"
                elif "general" in classification:
                    return "general"
                else:
                    # Default to domain-specific if tool is detected
                    return "domain-specific" if tool_name else "general"
            else:
                print(f"Classification failed: {response.status_code}")
                return "domain-specific" if tool_name else "general"

    except Exception as e:
        print(f"Error classifying query: {e}")
        # Default: if tool detected, assume domain-specific
        return "domain-specific" if tool_name else "general"

async def query_convex_knowledge(tool_name: str, query: str, limit: int = 5):
    """
    Queries Convex scrapedata database for relevant knowledge chunks.
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
                chunks = data.get("value", [])
                print(f"Retrieved {len(chunks)} chunks from scrapedata for {tool_name}")
                return chunks
            else:
                print(f"Convex query failed: {response.status_code} - {response.text}")
                return []
    except Exception as e:
        print(f"Error querying Convex scrapedata: {e}")
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

CRITICAL - Visual Guidance for GitHub:
When guiding users through GitHub UI tasks, you MUST emit action directives to highlight elements visually.
This is MANDATORY for all navigation instructions.

Action format (use EXACTLY this format):
Your text instruction here.
ACTION:highlight_zone:zone_name:css_selector:duration_ms

MANDATORY EXAMPLES - Follow this pattern precisely:

Example 1:
"First, click the Pull Requests tab at the top of the page."
ACTION:highlight_zone:arc-tl:.UnderlineNav-item[data-tab-item="pull-requests-tab"]:3000

Example 2:
"Next, click the green New Pull Request button."
ACTION:highlight_zone:center:a[href*="/compare"]:2500

Example 3:
"Click on the Issues tab to view all issues."
ACTION:highlight_zone:arc-tl:.UnderlineNav-item[data-tab-item="issues-tab"]:3000

Example 4:
"Now click the Code tab to return to the repository."
ACTION:highlight_zone:arc-tl:.UnderlineNav-item[data-tab-item="code-tab"]:3000

Available zones:
- center: Main content area (for primary action buttons)
- arc-tl: Top-left (for navigation tabs like Pull Requests, Issues, Code)
- arc-tr: Top-right (for repository actions like Fork, Star, Watch)
- arc-bl: Bottom-left
- arc-br: Bottom-right

RULES:
1. ALWAYS emit ACTION directive immediately after each navigation instruction
2. Use EXACT format: ACTION:highlight_zone:zone:selector:duration
3. Duration should be 2500-3000ms
4. Only emit actions for GitHub navigation tasks
5. For general questions or explanations, just provide text (no actions)
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

async def stream_ollama_response(prompt: str, is_chat: bool = True):
    """
    Streams response from Ollama.
    Yields JSON lines compatible with the extension's stream parser.
    Args:
        prompt: The prompt to send to Ollama
        is_chat: If True, use chat API. If False, use generate API.
    """
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            if is_chat:
                # Use chat API for structured prompts
                async with client.stream(
                    "POST",
                    f"{OLLAMA_URL}/api/chat",
                    json={
                        "model": OLLAMA_MODEL,
                        "messages": [
                            {"role": "system", "content": prompt.split("User question:")[0] if "User question:" in prompt else "You are Navigator, a helpful AI assistant."},
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

                                # Check if message contains ACTION directive
                                # Handle both normal mode (content) and thinking mode (thinking)
                                if data.get("message"):
                                    content = data["message"].get("content") or data["message"].get("thinking") or ""

                                    if content and "ACTION:" in content:
                                        # Split text and action
                                        parts = content.split("ACTION:")
                                        text_part = parts[0].strip()
                                        action_part = parts[1].strip() if len(parts) > 1 else ""

                                        # Send text first (if any)
                                        if text_part:
                                            yield json.dumps({"message": {"content": text_part}}) + "\n"

                                        # Parse and send action
                                        if action_part:
                                            action_tokens = action_part.split(":")
                                            if len(action_tokens) >= 4:
                                                try:
                                                    yield json.dumps({
                                                        "action": {
                                                            "type": action_tokens[0],  # e.g., "highlight_zone"
                                                            "zone": action_tokens[1],   # e.g., "arc-tl"
                                                            "selector": action_tokens[2], # e.g., ".repo-nav a"
                                                            "duration": int(action_tokens[3])  # e.g., 3000
                                                        }
                                                    }) + "\n"
                                                except (ValueError, IndexError):
                                                    # Invalid action format, skip
                                                    pass
                                    else:
                                        # Normal text chunk - convert thinking to content for compatibility
                                        if content:
                                            yield json.dumps({"message": {"content": content}}) + "\n"
                                        else:
                                            yield json.dumps(data) + "\n"
                                else:
                                    # No message content, forward as-is (done, etc.)
                                    yield json.dumps(data) + "\n"
                            except json.JSONDecodeError:
                                continue
            else:
                # Use generate API for simple prompts
                async with client.stream(
                    "POST",
                    f"{OLLAMA_URL}/api/generate",
                    json={
                        "model": OLLAMA_MODEL,
                        "prompt": prompt,
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
                                # Convert generate API response to chat API format for compatibility
                                if "response" in data:
                                    yield json.dumps({"message": {"content": data["response"]}}) + "\n"
                            except json.JSONDecodeError:
                                continue

        except httpx.ConnectError:
            yield json.dumps({"error": "Cannot connect to Ollama. Is it running on port 11434?"}) + "\n"
        except Exception as e:
            yield json.dumps({"error": f"Stream error: {str(e)}"}) + "\n"

@app.post("/chat")
async def chat(request: ChatRequest):
    """
    Main chat endpoint with intelligent RAG.

    Flow:
    1. Classify query: general or domain-specific (using Ollama)
    2. If domain-specific: Query Convex scrapedata for relevant knowledge
    3. Build augmented prompt with context + knowledge (RAG)
    4. If general: Send query directly to Ollama (no RAG)
    5. Stream response from Ollama
    """

    print(f"\n{'='*60}")
    print(f"New query: {request.query}")
    print(f"Tool: {request.tool_name}")
    print(f"{'='*60}")

    # Step 1: Classify query using Ollama
    classification = await classify_query(
        request.query,
        request.tool_name,
        request.context_text
    )

    print(f"Classification: {classification}")

    # Step 2 & 3: Handle based on classification
    if classification == "domain-specific" and request.tool_name:
        # Domain-specific path: Use RAG
        print(f"[RAG PATH] Querying scrapedata for {request.tool_name}")

        knowledge_chunks = await query_convex_knowledge(
            request.tool_name,
            request.query,
            limit=5
        )

        if knowledge_chunks:
            print(f"[RAG PATH] Found {len(knowledge_chunks)} knowledge chunks")
            # Build RAG prompt with knowledge
            prompt = build_rag_prompt(
                request.query,
                request.tool_name,
                request.context_text,
                knowledge_chunks
            )
        else:
            print(f"[RAG PATH] No knowledge found, falling back to general path")
            # No knowledge available, use general path
            prompt = f"""You are Navigator, a helpful AI assistant.

Current page context:
{request.context_text[:1000]}

User question: {request.query}

Provide a helpful answer:"""
    else:
        # General path: Direct Ollama (no RAG) but WITH page context
        print(f"[GENERAL PATH] Responding directly from Ollama with page context")
        prompt = f"""You are Navigator, a helpful AI assistant.

Current page context:
{request.context_text[:2000]}

User question: {request.query}

Provide a clear, helpful answer based on the page context when relevant:"""

    # Step 4: Stream response from Ollama
    print(f"Streaming response from Ollama ({OLLAMA_MODEL})...")
    return StreamingResponse(
        stream_ollama_response(prompt, is_chat=True),
        media_type="application/x-ndjson"
    )

if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print("Navigator RAG API Server v2.0.4")
    print("=" * 60)
    print(f"Ollama URL: {OLLAMA_URL}")
    print(f"Ollama Model: {OLLAMA_MODEL}")
    print(f"Convex URL: {CONVEX_URL}")
    print(f"Knowledge Database: scrapedata (89 tools)")
    print("Starting server on http://127.0.0.1:8000")
    print("=" * 60)
    uvicorn.run(app, host="127.0.0.1", port=8000)
