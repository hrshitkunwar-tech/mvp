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
CONVEX_URL = os.getenv("CONVEX_URL", "https://tremendous-canary-552.convex.cloud")
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

@app.post("/save-workflow")
async def save_workflow(request: dict):
    """
    Saves a recorded workflow to Convex
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{CONVEX_URL}/api/mutation",
                json={
                    "path": "procedures:create",
                    "args": {
                        "procedure": request
                    }
                }
            )
            if response.status_code == 200:
                data = response.json()
                print(f"DEBUG: Convex Response: {json.dumps(data)}")
                if data.get("status") == "error":
                    error_msg = data.get("errorMessage", "Unknown Convex Error")
                    print(f"Convex Mutation Error: {error_msg}")
                    return {"success": False, "error": error_msg}
                
                # Extract value
                value = data.get("value")
                print(f"DEBUG: Extracted value: {value}")
                if isinstance(value, dict) and "id" in value:
                    print(f"DEBUG: Found 'id' in dict: {value['id']}")
                    return {"success": True, "id": str(value["id"])}
                elif isinstance(value, str):
                    print(f"DEBUG: value is string: {value}")
                    return {"success": True, "id": value}
                else:
                    print(f"Warning: Unexpected Convex value structure: {value}")
                    # Try to see if wait, maybe the ID is in _id?
                    if isinstance(value, dict) and "_id" in value:
                         return {"success": True, "id": str(value["_id"])}
                    return {"success": True, "id": str(value) if value else "unknown"}
            else:
                error_text = response.text
                print(f"Convex HTTP Error {response.status_code}: {error_text}")
                return {"success": False, "error": f"HTTP {response.status_code}: {error_text}"}
    except Exception as e:
        print(f"Error saving workflow to Convex: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/get-procedure")
async def get_procedure(request: dict):
    """
    Fetches a single procedure from Convex
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{CONVEX_URL}/api/query",
                json={
                    "path": "procedures:getById",
                    "args": {
                        "id": request.get("id")
                    }
                }
            )
            if response.status_code == 200:
                data = response.json()
                return {"success": True, "procedure": data.get("value")}
            else:
                raise HTTPException(status_code=response.status_code, detail=response.text)
    except Exception as e:
        print(f"Error fetching procedure from Convex: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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

# ACTION INSTRUCTIONS - Reusable constant for all prompt paths
ACTION_INSTRUCTIONS = """
🎯 CRITICAL REQUIREMENT - Visual Guidance System:

When users ask HOW to do something on GitHub, you MUST emit action directives to show them WHERE to click.

FORMAT (use EXACTLY this - no variations):
Your instruction text.
ACTION:highlight_zone:zone_name:css_selector:duration_ms

MANDATORY EXAMPLES (copy this pattern precisely):

Example 1 - Pull Requests Tab:
"First, navigate to the Pull Requests tab."
ACTION:highlight_zone:arc-tl:.UnderlineNav-item[data-tab-item="pull-requests-tab"]:3000

Example 2 - New PR Button:
"Click the green 'New pull request' button."
ACTION:highlight_zone:center:a[href*="/compare"]:2500

Example 3 - Issues Tab:
"Open the Issues tab to see all issues."
ACTION:highlight_zone:arc-tl:.UnderlineNav-item[data-tab-item="issues-tab"]:3000

Example 4 - Code Tab:
"Return to the Code tab."
ACTION:highlight_zone:arc-tl:.UnderlineNav-item[data-tab-item="code-tab"]:3000

ZONES (choose the right one):
- center: Main content area (primary action buttons, create/compare buttons)
- arc-tl: Top-left (navigation tabs: Code, Issues, Pull Requests, etc.)
- arc-tr: Top-right (repository actions: Fork, Star, Watch)
- arc-bl: Bottom-left
- arc-br: Bottom-right

RULES:
1. ALWAYS emit ACTION after navigation instructions ("click X", "go to Y", "open Z")
2. NEVER emit ACTION for explanations ("PR stands for Pull Request")
3. Use duration 2500-3000ms
4. Format must be EXACT - check examples above
5. For multi-step tasks, emit multiple ACTIONs (one per step)

DETECTION: If the user's query contains words like:
- "how do I..." / "how to..." / "how can I..."
- "where is..." / "where can I find..."
- "create" / "open" / "navigate" / "go to" / "click"
Then you MUST emit ACTION directives for each navigation step.
"""

def build_rag_prompt(query: str, tool_name: Optional[str], context_text: str, knowledge_chunks: list):
    """
    Builds the augmented prompt for Ollama with:
    - User query
    - Page context (UI elements, text)
    - Retrieved knowledge from database
    """

    # Base system prompt with ACTION instructions
    system = f"""You are Navigator, a contextual AI assistant that helps users understand and navigate tools.

Key principles:
1. Ground answers in the provided page context and knowledge base
2. If you don't see relevant information, say so clearly
3. Be concise and actionable
4. Consider the user's current screen context to understand their objective

{ACTION_INSTRUCTIONS}

EXAMPLE INTERACTION (study this pattern):
User: "How do I view pull requests?"
Assistant: "To view pull requests, click the Pull Requests tab at the top of the page.
ACTION:highlight_zone:arc-tl:.UnderlineNav-item[data-tab-item="pull-requests-tab"]:3000"
"""

    # Add tool-specific context
    if tool_name and knowledge_chunks:
        system += f"\n\nYou are currently helping with {tool_name}. Use the following knowledge base:\n\n"
        for i, chunk in enumerate(knowledge_chunks, 1):
            system += f"[Source {i}]\n{chunk.get('content', '')[:500]}...\n\n"

    # Add page context
    system += f"\n\nCurrent page context:\n{context_text[:2000]}\n"

    # User query with reinforcement
    user_prompt = f"\nUser question: {query}\n\nProvide a helpful answer. REMEMBER: If this is a navigation question, emit ACTION directives!"

    return system + user_prompt

# Common GitHub navigation patterns for action injection fallback
GITHUB_NAVIGATION_PATTERNS = {
    'pull request': {
        'keywords': ['pull request', 'pr tab', 'pull requests tab', 'view pr', 'view pull request', 'see pr', 'see pull request', 'find pr', 'find pull request'],
        'action': 'ACTION:highlight_zone:arc-tl:.UnderlineNav-item[data-tab-item="pull-requests-tab"]:3000'
    },
    'issues': {
        'keywords': ['issues tab', 'view issues', 'see issues'],
        'action': 'ACTION:highlight_zone:arc-tl:.UnderlineNav-item[data-tab-item="issues-tab"]:3000'
    },
    'code': {
        'keywords': ['code tab', 'back to code', 'return to code'],
        'action': 'ACTION:highlight_zone:arc-tl:.UnderlineNav-item[data-tab-item="code-tab"]:3000'
    },
    'new pr': {
        'keywords': ['new pull request', 'create pull request', 'create pr', 'make pr', 'create a pr', 'make a pull request', 'open pr', 'open pull request'],
        'action': 'ACTION:highlight_zone:center:a[href*="/compare"]:2500'
    },
    'star': {
        'keywords': ['star repo', 'star repository', 'star button'],
        'action': 'ACTION:highlight_zone:arc-tr:button[data-hydro-click*="star"]:2500'
    },
    'fork': {
        'keywords': ['fork repo', 'fork repository', 'fork button'],
        'action': 'ACTION:highlight_zone:arc-tr:form[action*="/fork"] button:2500'
    }
}

def inject_action_if_missing(text_chunk: str, query: str) -> str:
    """
    Safety net: Inject ACTION directive if model didn't generate one
    but the query clearly asks for navigation guidance.

    Only triggers if:
    1. Query contains navigation keywords (how, where, create, etc.)
    2. Response text doesn't already contain "ACTION:"
    3. Text mentions a known GitHub element
    """
    query_lower = query.lower()
    text_lower = text_chunk.lower()

    print(f"[ACTION DEBUG] Checking injection for query: '{query[:50]}...'")
    print(f"[ACTION DEBUG] Text length: {len(text_chunk)}, Has ACTION: {'ACTION:' in text_chunk}")

    # Skip if already has ACTION
    if "ACTION:" in text_chunk:
        print("[ACTION DEBUG] Skipping - ACTION already present")
        return text_chunk

    # Skip if not a navigation query (added 'pr' to catch PR queries)
    nav_keywords = ['how', 'where', 'create', 'open', 'navigate', 'find', 'pr', 'pull request']
    has_nav_keyword = any(keyword in query_lower for keyword in nav_keywords)
    print(f"[ACTION DEBUG] Has navigation keyword: {has_nav_keyword}")

    if not has_nav_keyword:
        print("[ACTION DEBUG] Skipping - not a navigation query")
        return text_chunk

    # Check for pattern matches in BOTH query and response
    for pattern_name, pattern_data in GITHUB_NAVIGATION_PATTERNS.items():
        for keyword in pattern_data['keywords']:
            # Check if keyword appears in query OR response
            if keyword in query_lower or keyword in text_lower:
                # Found match - inject action
                injected = f"{text_chunk}\n{pattern_data['action']}"
                print(f"[ACTION INJECTION] ✓ Added '{pattern_name}' action (keyword: '{keyword}')")
                print(f"[ACTION INJECTION] ✓ Full action: {pattern_data['action']}")
                return injected

    print("[ACTION DEBUG] No pattern match found")
    return text_chunk

async def stream_ollama_response(prompt: str, is_chat: bool = True, query: str = ""):
    """
    Streams response from Ollama.
    Yields JSON lines compatible with the extension's stream parser.
    Args:
        prompt: The prompt to send to Ollama
        is_chat: If True, use chat API. If False, use generate API.
        query: The original user query (for action injection fallback)
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

                    # Track accumulated text for ACTION parsing
                    accumulated_text = ""
                    import re

                    async for line in response.aiter_lines():
                        if line.strip():
                            try:
                                data = json.loads(line)

                                # Accumulate all content chunks
                                if data.get("message"):
                                    content = data["message"].get("content") or data["message"].get("thinking") or ""

                                    if content:
                                        accumulated_text += content
                                        # Stream text to user in real-time
                                        yield json.dumps({"message": {"content": content}}) + "\n"

                                # When stream completes, parse ALL ACTION directives from accumulated text
                                if data.get("done"):
                                    print(f"[ACTION PARSER] Stream done. Accumulated text length: {len(accumulated_text)}")
                                    print(f"[ACTION PARSER] Has ACTION: {'ACTION:' in accumulated_text}")

                                    # Try fallback injection first if no ACTION found
                                    if "ACTION:" not in accumulated_text and query:
                                        print(f"[ACTION PARSER] No ACTION found, trying fallback injection...")
                                        accumulated_text = inject_action_if_missing(accumulated_text, query)

                                    # Parse ALL ACTION directives from accumulated text
                                    if "ACTION:" in accumulated_text:
                                        print(f"[ACTION PARSER] Parsing ACTION directives...")
                                        parts = accumulated_text.split("ACTION:")

                                        # Process all ACTION directives (skip parts[0] - text before first ACTION)
                                        for i in range(1, len(parts)):
                                            action_part = parts[i].strip()
                                            if not action_part:
                                                continue

                                            try:
                                                # Extract action line (first line of the part)
                                                action_line = action_part.split('\n')[0].strip()

                                                # Split: type:zone:selector:duration
                                                # maxsplit=3 preserves colons in selector
                                                action_tokens = action_line.split(":", 3)

                                                if len(action_tokens) >= 4:
                                                    action_type = action_tokens[0].strip()
                                                    zone = action_tokens[1].strip()
                                                    selector = action_tokens[2].strip()
                                                    duration_str = action_tokens[3].strip()

                                                    # Extract duration (should be just a number)
                                                    duration_match = re.match(r'(\d+)', duration_str)
                                                    if duration_match:
                                                        duration = int(duration_match.group(1))

                                                        # Log success
                                                        selector_preview = selector[:50] + "..." if len(selector) > 50 else selector
                                                        print(f"[ACTION PARSER] ✓ Parsed: type={action_type}, zone={zone}, selector={selector_preview}, duration={duration}")

                                                        # Send action JSON
                                                        yield json.dumps({
                                                            "action": {
                                                                "type": action_type,
                                                                "zone": zone,
                                                                "selector": selector,
                                                                "duration": duration
                                                            }
                                                        }) + "\n"
                                                    else:
                                                        print(f"[ACTION PARSER] ✗ Could not extract duration from: {duration_str}")
                                                else:
                                                    print(f"[ACTION PARSER] ✗ Invalid format - got {len(action_tokens)} parts: {action_line}")
                                            except Exception as e:
                                                print(f"[ACTION PARSER] ✗ Parse error: {e} | Raw: {action_part[:100]}")

                                    # Send done signal
                                    yield json.dumps({"done": True}) + "\n"

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
            # No knowledge available, use general path WITH ACTION instructions
            prompt = f"""You are Navigator, a helpful AI assistant.

{ACTION_INSTRUCTIONS}

EXAMPLE:
User: "Where do I find issues?"
Assistant: "Click the Issues tab at the top.
ACTION:highlight_zone:arc-tl:.UnderlineNav-item[data-tab-item="issues-tab"]:3000"

Current page context:
{request.context_text[:1000]}

User question: {request.query}

Provide a helpful answer. If this asks HOW or WHERE to do something, emit ACTION directives:"""
    else:
        # General path: Direct Ollama (no RAG) but WITH page context AND ACTION instructions
        print(f"[GENERAL PATH] Responding directly from Ollama with page context")
        prompt = f"""You are Navigator, a helpful AI assistant.

{ACTION_INSTRUCTIONS}

Current page context:
{request.context_text[:2000]}

User question: {request.query}

Provide a clear answer. If this is a navigation question, include ACTION directives:"""

    # Step 4: Stream response from Ollama
    print(f"Streaming response from Ollama ({OLLAMA_MODEL})...")
    return StreamingResponse(
        stream_ollama_response(prompt, is_chat=True, query=request.query),
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
