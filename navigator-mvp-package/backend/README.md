# Navigator RAG API Server

FastAPI server that bridges the browser extension with Ollama LLM and Convex knowledge graphs.

## Architecture

```
Extension → FastAPI (port 8000) → Ollama (port 11434)
                ↓
         Convex Database (89 tool knowledge graphs)
```

## Features

- **Tool Detection**: Identifies which of 89 tools the user is currently viewing
- **RAG Pipeline**: Retrieves relevant knowledge from Convex database
- **Context-Aware**: Uses page UI context to understand user objectives
- **Streaming Responses**: Real-time token streaming to extension
- **Hybrid Intelligence**:
  - Generic queries → Ollama directly
  - Tool-specific queries → RAG with knowledge graphs

## Quick Start

### 1. Install Dependencies

```bash
cd /home/user/mvp/backend/api_server
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env if needed (default values should work)
```

### 3. Start the Server

```bash
python main.py
```

Server will start on `http://127.0.0.1:8000`

### 4. Verify It's Working

```bash
# Health check
curl http://127.0.0.1:8000

# Test tool detection
curl -X POST http://127.0.0.1:8000/detect-tool \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/user/repo", "title": "GitHub Repo"}'

# Test chat (generic)
curl -X POST http://127.0.0.1:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is Python?",
    "url": "https://example.com",
    "context_text": "Some page content"
  }'
```

## Prerequisites

### 1. Ollama Running

Make sure Ollama is running on port 11434:

```bash
# Check if Ollama is running
curl http://127.0.0.1:11434/api/tags

# If not running, start it
ollama serve

# Pull the model (if not already downloaded)
ollama pull qwen2.5-coder:7b
```

### 2. Convex Database

The server expects a Convex database with the `tool_knowledge` table.

- **URL**: `https://abundant-porpoise-181.convex.cloud`
- **Schema**: See `/backend/convex-backend/convex/schema.ts`

## Endpoints

### `GET /`
Health check and service info.

**Response:**
```json
{
  "service": "Navigator RAG API",
  "version": "2.0.4",
  "status": "online",
  "endpoints": ["/detect-tool", "/chat"]
}
```

### `POST /detect-tool`
Detects which tool the page belongs to.

**Request:**
```json
{
  "url": "https://github.com/user/repo",
  "title": "GitHub Repository"
}
```

**Response:**
```json
{
  "detected": true,
  "tool_name": "GitHub",
  "confidence": 0.95,
  "has_knowledge": true
}
```

### `POST /chat` (Streaming)
Main chat endpoint with RAG.

**Request:**
```json
{
  "query": "How do I create a pull request?",
  "tool_name": "GitHub",
  "url": "https://github.com/user/repo",
  "context_text": "Page context with headings, buttons, text..."
}
```

**Response:** Streaming NDJSON
```json
{"message": {"content": "To"}}
{"message": {"content": " create"}}
{"message": {"content": " a"}}
...
```

## How It Works

### Generic Query Flow
1. Extension sends query without tool_name
2. Server builds simple prompt with page context
3. Ollama generates response using its base knowledge
4. Response streams back to extension

### Tool-Specific Query Flow
1. Extension detects tool via `/detect-tool`
2. Extension sends query with tool_name
3. Server queries Convex for relevant knowledge chunks:
   ```
   knowledge:searchKnowledge(query, tool_name, limit=5)
   ```
4. Server builds RAG prompt:
   - System instructions
   - Retrieved knowledge chunks
   - Page UI context
   - User query
5. Ollama generates grounded response
6. Response streams back to extension

### RAG Prompt Structure

```
You are Navigator, a contextual AI assistant...

You are currently helping with GitHub. Use the following knowledge base:

[Source 1]
GitHub Pull Requests allow you to...

[Source 2]
To create a PR, navigate to...

Current page context:
Headings: Repository, Code, Issues, Pull Requests
Buttons: New pull request, Compare & pull request
Text: This repository has 3 open pull requests...

User question: How do I create a pull request?

Provide a helpful, grounded answer:
```

## Configuration

### Adding More Tools

Edit `TOOL_PATTERNS` in `main.py`:

```python
TOOL_PATTERNS = {
    "github.com": "GitHub",
    "gitlab.com": "GitLab",
    # Add your 89 tools here...
}
```

### Changing the Model

Edit the model name in `stream_ollama_response()`:

```python
"model": "llama3.1:8b",  # or any Ollama model
```

### Vector Search (Future Enhancement)

Current implementation uses simple text search. For better RAG:

1. Add vector embeddings to Convex schema
2. Use Pinecone/ChromaDB (already in package-lock.json)
3. Replace `searchKnowledge` with vector similarity search

## Troubleshooting

### "Cannot connect to Ollama"
- Ensure Ollama is running: `ollama serve`
- Check port: `curl http://127.0.0.1:11434/api/tags`

### "Convex query failed"
- Verify Convex URL is correct in `.env`
- Check if knowledge is imported: Use Convex dashboard
- Import knowledge: `node backend/convex-backend/import_to_convex.js`

### CORS errors
- Server allows all origins by default
- Check browser console for specific CORS issues

### No knowledge returned
- Verify tool_name matches database entries
- Check Convex dashboard: `knowledge:getKnowledgeStats`
- Ensure knowledge was imported from ScrapeData

## Development

### Run with auto-reload
```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Enable debug logging
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Test with extension
1. Start this server: `python main.py`
2. Load extension in Chrome
3. Navigate to a supported tool page (e.g., GitHub)
4. Ask a question in the side panel

## Production Deployment

For production, consider:
1. Use environment variables for all configs
2. Add authentication/rate limiting
3. Upgrade to vector search for better RAG
4. Cache Convex queries
5. Deploy with Docker/Railway/Fly.io
6. Use production ASGI server (Gunicorn + Uvicorn)

## License

Part of the Navigator project.
