"""
Navigator RAG API Server v2.1.0
FastAPI server that bridges the browser extension with an LLM.

Priority chain:
  1. Anthropic Claude (if ANTHROPIC_API_KEY is set)
  2. Ollama (if running on port 11434)
  3. Rule-based local knowledge (always works, no internet required)
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

app = FastAPI(title="Navigator RAG API", version="2.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Configuration ────────────────────────────────────────────────────────────
OLLAMA_URL    = os.getenv("OLLAMA_URL",    "http://127.0.0.1:11434")
CONVEX_URL    = os.getenv("CONVEX_URL",    "https://tremendous-canary-552.convex.cloud")
OLLAMA_MODEL  = os.getenv("OLLAMA_MODEL",  "qwen3:8b")
CLAUDE_MODEL  = os.getenv("CLAUDE_MODEL",  "claude-sonnet-4-5-20250929")
ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# ── Request models ────────────────────────────────────────────────────────────
class DetectToolRequest(BaseModel):
    url: str
    title: str

class ChatRequest(BaseModel):
    query: str
    tool_name: Optional[str] = None
    url: str
    context_text: str

# ── Tool detection ────────────────────────────────────────────────────────────
TOOL_PATTERNS = {
    "github.com":             "GitHub",
    "gitlab.com":             "GitLab",
    "bitbucket.org":          "Bitbucket",
    "linear.app":             "Linear",
    "figma.com":              "Figma",
    "notion.so":              "Notion",
    "slack.com":              "Slack",
    "trello.com":             "Trello",
    "jira.atlassian.com":     "Jira",
    "stackoverflow.com":      "Stack Overflow",
    "developer.mozilla.org":  "MDN",
    "aws.amazon.com":         "AWS",
    "cloud.google.com":       "Google Cloud",
    "azure.microsoft.com":    "Azure",
    "docker.com":             "Docker",
    "kubernetes.io":          "Kubernetes",
}

# ── Local knowledge base ──────────────────────────────────────────────────────
# Precise, step-by-step answers for common queries when no LLM is available.
# Keys are lowercase match strings; values are (display_answer, [ACTION directives]).
LOCAL_KB = {
    # ── GitHub: Pull Requests ─────────────────────────────────────────────────
    "create pr": (
        """**How to create a Pull Request on GitHub**

1. Push your branch to GitHub if you haven't already.
2. Open your repository and click the **Pull requests** tab.
3. Click the green **New pull request** button.
4. Set **base** = the branch you want to merge INTO (e.g. `main`).
5. Set **compare** = your feature branch with the changes.
6. Review the diff — confirm the right files are shown.
7. Click **Create pull request**.
8. Add a clear **title** and **description**, then click **Create pull request** again.""",
        [
            "ACTION:highlight_zone:arc-tl:.UnderlineNav-item[data-tab-item='pull-requests-tab']:3000",
            "ACTION:highlight_zone:center:a[href*='/compare'],a[href*='new'],a.btn-primary:2500",
        ],
    ),

    "open pr": (
        """**How to open / view Pull Requests on GitHub**

1. Go to your repository.
2. Click the **Pull requests** tab at the top.
3. You'll see all open PRs. Click any one to read it.
4. To filter: use the search bar or the **Filters** dropdown.""",
        [
            "ACTION:highlight_zone:arc-tl:.UnderlineNav-item[data-tab-item='pull-requests-tab']:3000",
        ],
    ),

    "merge pr": (
        """**How to merge a Pull Request on GitHub**

1. Open the Pull Request you want to merge.
2. Scroll to the bottom — check that all required checks pass (green ✓).
3. Click **Merge pull request**.
4. Choose a merge strategy (Create a merge commit / Squash / Rebase).
5. Confirm by clicking **Confirm merge**.
6. Delete the branch if you no longer need it.""",
        [],
    ),

    "close pr": (
        """**How to close a Pull Request without merging**

1. Open the Pull Request.
2. Scroll to the bottom.
3. Click **Close pull request** (below the comment box).
4. The PR is closed; it can be re-opened later.""",
        [],
    ),

    # ── GitHub: Issues ────────────────────────────────────────────────────────
    "create issue": (
        """**How to create an Issue on GitHub**

1. Open your repository.
2. Click the **Issues** tab.
3. Click **New issue** (green button, top-right).
4. Pick a template if prompted, or click **Open a blank issue**.
5. Fill in the **title** and **description**.
6. Optionally assign labels, milestone, and assignee on the right.
7. Click **Submit new issue**.""",
        [
            "ACTION:highlight_zone:arc-tl:.UnderlineNav-item[data-tab-item='issues-tab']:3000",
        ],
    ),

    # ── GitHub: Branches ─────────────────────────────────────────────────────
    "create branch": (
        """**How to create a branch on GitHub**

1. Open your repository.
2. Click the branch selector dropdown (shows current branch name, top-left of the file list).
3. Type the new branch name in the text field.
4. Click **Create branch: your-name from 'main'** (or current branch).

To create a branch locally and push:
```
git checkout -b my-feature
git push -u origin my-feature
```""",
        [],
    ),

    # ── GitHub: Forks / Stars ─────────────────────────────────────────────────
    "fork repo": (
        """**How to fork a repository on GitHub**

1. Open the repository you want to fork.
2. Click **Fork** (top-right, next to Star).
3. Choose your account (or an org) as the destination.
4. Click **Create fork**.
5. You'll land on your copy at `github.com/<you>/<repo>`.""",
        [
            "ACTION:highlight_zone:arc-tr:form[action*='/fork'] button:2500",
        ],
    ),

    "star repo": (
        """**How to star a repository on GitHub**

1. Open the repository page.
2. Click the **⭐ Star** button in the top-right area.
3. That's it — the star count increments and the repo is saved to your starred list.""",
        [
            "ACTION:highlight_zone:arc-tr:button[data-hydro-click*='star']:2500",
        ],
    ),

    # ── GitHub: Code search ───────────────────────────────────────────────────
    "search code": (
        """**How to search code on GitHub**

1. Click the 🔍 search bar at the very top of any GitHub page.
2. Type your query and press Enter.
3. On the results page, click **Code** in the left sidebar to filter to code results.
4. Use `repo:owner/name keyword` to search within a specific repo.""",
        [],
    ),

    # ── Linear ────────────────────────────────────────────────────────────────
    "create issue linear": (
        """**How to create an Issue in Linear**

1. Press **C** (keyboard shortcut) from anywhere in Linear, or
2. Click the **+** icon next to your team name in the left sidebar.
3. Choose **New issue**.
4. Fill in the **title**, set **status**, **priority**, and **assignee**.
5. Click **Save issue** (or press **Cmd/Ctrl + Enter**).""",
        [],
    ),

    # ── Figma ─────────────────────────────────────────────────────────────────
    "create frame figma": (
        """**How to create a Frame in Figma**

1. Select the **Frame tool**: press **F** or click the Frame icon in the toolbar.
2. Click and drag on the canvas to draw your frame.
3. Or pick a preset size from the right panel (iPhone, Desktop, etc.).""",
        [],
    ),

    # ── Generic Git ───────────────────────────────────────────────────────────
    "git commit": (
        """**How to make a git commit**

```bash
git add .                        # stage all changes
git commit -m "your message"     # commit
git push origin your-branch      # push to remote
```

For a specific file:
```bash
git add path/to/file.js
git commit -m "fix: update logic in file.js"
```""",
        [],
    ),
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def find_local_answer(query: str):
    """Return (answer_text, [action_strings]) or None if no match."""
    q = query.lower()
    # Strip the 'SYSTEM: ... USER QUERY:' wrapper that background.js prepends
    if "user query:" in q:
        q = q.split("user query:")[-1].strip()
    # Try longest key match first
    for key in sorted(LOCAL_KB.keys(), key=len, reverse=True):
        if key in q:
            return LOCAL_KB[key]
    return None


async def stream_local_answer(answer_text: str, actions: list):
    """Yield ndjson lines that the extension's stream parser understands."""
    # Stream the answer word-by-word for a natural feel
    words = answer_text.split(" ")
    for i, word in enumerate(words):
        token = word + (" " if i < len(words) - 1 else "")
        yield json.dumps({"message": {"content": token}}) + "\n"
        await asyncio.sleep(0.008)   # ~125 tokens/sec — feels fast but readable

    # Emit action directives
    import re
    for action_str in actions:
        action_str = action_str.strip()
        if action_str.startswith("ACTION:"):
            action_str = action_str[len("ACTION:"):]
        tokens = action_str.split(":", 3)
        if len(tokens) >= 4:
            dur_match = re.match(r"(\d+)", tokens[3])
            if dur_match:
                yield json.dumps({
                    "action": {
                        "type":     tokens[0],
                        "zone":     tokens[1],
                        "selector": tokens[2],
                        "duration": int(dur_match.group(1)),
                    }
                }) + "\n"

    yield json.dumps({"done": True}) + "\n"


async def stream_claude_response(system_prompt: str, user_message: str, query: str = ""):
    """Stream a response from the Anthropic Claude API."""
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
        with client.messages.stream(
            model=CLAUDE_MODEL,
            max_tokens=1024,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        ) as stream:
            accumulated = ""
            for text in stream.text_stream:
                accumulated += text
                yield json.dumps({"message": {"content": text}}) + "\n"

            # Inject action directives if model didn't emit any
            if "ACTION:" not in accumulated and query:
                local = find_local_answer(query)
                if local:
                    _, actions = local
                    import re
                    for action_str in actions:
                        if action_str.startswith("ACTION:"):
                            action_str = action_str[len("ACTION:"):]
                        tokens = action_str.split(":", 3)
                        if len(tokens) >= 4:
                            dur_match = re.match(r"(\d+)", tokens[3])
                            if dur_match:
                                yield json.dumps({
                                    "action": {
                                        "type":     tokens[0],
                                        "zone":     tokens[1],
                                        "selector": tokens[2],
                                        "duration": int(dur_match.group(1)),
                                    }
                                }) + "\n"
        yield json.dumps({"done": True}) + "\n"

    except Exception as e:
        yield json.dumps({"error": f"Claude error: {str(e)}"}) + "\n"
        yield json.dumps({"done": True}) + "\n"


async def stream_ollama_response(prompt: str, query: str = ""):
    """Stream a response from a local Ollama instance."""
    import re
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            async with client.stream(
                "POST",
                f"{OLLAMA_URL}/api/chat",
                json={
                    "model": OLLAMA_MODEL,
                    "messages": [
                        {
                            "role": "system",
                            "content": prompt.split("User question:")[0]
                                if "User question:" in prompt
                                else SYSTEM_PROMPT,
                        },
                        {
                            "role": "user",
                            "content": prompt.split("User question:")[1]
                                if "User question:" in prompt
                                else prompt,
                        },
                    ],
                    "stream": True,
                },
            ) as response:
                if response.status_code != 200:
                    error_text = await response.aread()
                    yield json.dumps({"error": f"Ollama error: {error_text.decode()}"}) + "\n"
                    return

                accumulated = ""
                async for line in response.aiter_lines():
                    if not line.strip():
                        continue
                    try:
                        data = json.loads(line)
                        if data.get("message"):
                            content = data["message"].get("content") or ""
                            if content:
                                accumulated += content
                                yield json.dumps({"message": {"content": content}}) + "\n"
                        if data.get("done"):
                            # Inject action if missing
                            if "ACTION:" not in accumulated and query:
                                local = find_local_answer(query)
                                if local:
                                    _, actions = local
                                    for action_str in actions:
                                        if action_str.startswith("ACTION:"):
                                            action_str = action_str[len("ACTION:"):]
                                        tokens = action_str.split(":", 3)
                                        if len(tokens) >= 4:
                                            dur_match = re.match(r"(\d+)", tokens[3])
                                            if dur_match:
                                                yield json.dumps({
                                                    "action": {
                                                        "type":     tokens[0],
                                                        "zone":     tokens[1],
                                                        "selector": tokens[2],
                                                        "duration": int(dur_match.group(1)),
                                                    }
                                                }) + "\n"
                            yield json.dumps({"done": True}) + "\n"
                    except json.JSONDecodeError:
                        continue

        except (httpx.ConnectError, httpx.TimeoutException):
            yield None   # Signal caller that Ollama is unavailable
        except Exception as e:
            yield json.dumps({"error": f"Ollama stream error: {str(e)}"}) + "\n"


# ── System prompt ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are Navigator, a concise AI assistant embedded in a browser extension.

Rules:
- Respond with ONLY a clean numbered step-by-step guide. No preamble, no filler.
- Use **bold** for UI element names.
- When answering navigation questions (how to / where to / click), emit ACTION directives.
- ACTION format (EXACT): ACTION:highlight_zone:zone:css_selector:duration_ms
  Zones: center (main content), arc-tl (top-left tabs), arc-tr (top-right repo actions)
- Emit one ACTION per step that involves clicking a UI element.

Example – "how to view pull requests":
1. Click the **Pull requests** tab.
ACTION:highlight_zone:arc-tl:.UnderlineNav-item[data-tab-item='pull-requests-tab']:3000
"""

# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    ollama_up = False
    try:
        async with httpx.AsyncClient(timeout=2.0) as c:
            r = await c.get(f"{OLLAMA_URL}/")
            ollama_up = r.status_code == 200
    except Exception:
        pass

    return {
        "service": "Navigator RAG API",
        "version": "2.1.0",
        "status":  "online",
        "llm":     "claude" if ANTHROPIC_KEY else ("ollama" if ollama_up else "local-kb"),
    }


@app.post("/detect-tool")
async def detect_tool(request: DetectToolRequest):
    url = request.url.lower()
    for pattern, tool_name in TOOL_PATTERNS.items():
        if pattern in url:
            return {"detected": True, "tool_name": tool_name, "confidence": 0.95}
    return {"detected": False, "tool_name": None, "confidence": 0.0}


@app.post("/save-workflow")
async def save_workflow(request: dict):
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{CONVEX_URL}/api/mutation",
                json={"path": "procedures:create", "args": {"procedure": request}},
            )
            if response.status_code == 200:
                data = response.json()
                value = data.get("value")
                if isinstance(value, dict):
                    return {"success": True, "id": str(value.get("id") or value.get("_id", "unknown"))}
                return {"success": True, "id": str(value) if value else "unknown"}
            return {"success": False, "error": f"HTTP {response.status_code}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/get-procedure")
async def get_procedure(request: dict):
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{CONVEX_URL}/api/query",
                json={"path": "procedures:getById", "args": {"id": request.get("id")}},
            )
            if response.status_code == 200:
                data = response.json()
                return {"success": True, "procedure": data.get("value")}
            raise HTTPException(status_code=response.status_code, detail=response.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat")
async def chat(request: ChatRequest):
    """
    Priority:
      1. Claude API  (if ANTHROPIC_API_KEY set)
      2. Ollama      (if reachable on 11434)
      3. Local KB    (always available)
    """
    raw_query = request.query
    # Strip the SYSTEM prefix that background.js prepends
    user_query = raw_query
    if "USER QUERY:" in raw_query:
        user_query = raw_query.split("USER QUERY:")[-1].strip()

    print(f"\n{'='*60}\nQuery: {user_query}\nTool: {request.tool_name}\n{'='*60}")

    # ── Path 1: Claude ────────────────────────────────────────────────────────
    if ANTHROPIC_KEY:
        print("[LLM] Using Claude API")
        context_snippet = request.context_text[:3000] if request.context_text else "No context."
        user_message = (
            f"Page context:\n{context_snippet}\n\n"
            f"User question: {user_query}\n\n"
            f"Respond with a precise, numbered step-by-step answer. No fluff."
        )
        return StreamingResponse(
            stream_claude_response(SYSTEM_PROMPT, user_message, query=user_query),
            media_type="application/x-ndjson",
        )

    # ── Path 2: Ollama ────────────────────────────────────────────────────────
    ollama_up = False
    try:
        async with httpx.AsyncClient(timeout=2.0) as c:
            r = await c.get(f"{OLLAMA_URL}/")
            ollama_up = r.status_code == 200
    except Exception:
        pass

    if ollama_up:
        print("[LLM] Using Ollama")
        context_snippet = request.context_text[:2000] if request.context_text else "No context."
        prompt = (
            f"{SYSTEM_PROMPT}\n\n"
            f"Current page context:\n{context_snippet}\n\n"
            f"User question: {user_query}\n\n"
            "Provide a precise numbered answer with ACTION directives for navigation steps:"
        )

        async def _ollama_or_fallback():
            got_response = False
            async for chunk in stream_ollama_response(prompt, query=user_query):
                if chunk is None:
                    break   # Ollama went away mid-stream; fall to local KB
                got_response = True
                yield chunk
            if not got_response:
                async for chunk in _local_stream():
                    yield chunk

        return StreamingResponse(_ollama_or_fallback(), media_type="application/x-ndjson")

    # ── Path 3: Local knowledge base ─────────────────────────────────────────
    print("[LLM] Using local knowledge base")

    async def _local_stream():
        local = find_local_answer(user_query)
        if local:
            answer_text, actions = local
            async for chunk in stream_local_answer(answer_text, actions):
                yield chunk
        else:
            # Generic fallback
            msg = (
                "I couldn't find a specific answer for that in my local knowledge base.\n\n"
                "**To get full AI answers**, start the Ollama server:\n"
                "```\nollama serve\n```\n"
                "or set the `ANTHROPIC_API_KEY` environment variable."
            )
            async for chunk in stream_local_answer(msg, []):
                yield chunk

    return StreamingResponse(_local_stream(), media_type="application/x-ndjson")


if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print("Navigator RAG API Server v2.1.0")
    print(f"LLM: {'Claude (' + CLAUDE_MODEL + ')' if ANTHROPIC_KEY else 'Local KB (no Ollama/Claude key found)'}")
    print(f"Ollama URL:  {OLLAMA_URL}")
    print(f"Convex URL:  {CONVEX_URL}")
    print("Starting on http://127.0.0.1:8000")
    print("=" * 60)
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
