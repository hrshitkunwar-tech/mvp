# RAG Prompt Customization Guide

## Location
File: `backend/api_server/main.py`
Function: `build_rag_prompt()` (lines 140-170)

---

## Customization Options

### 1. Change System Personality

**Current (Line 149):**
```python
system = """You are Navigator, a contextual AI assistant that helps users understand and navigate tools."""
```

**Make it more technical:**
```python
system = """You are Navigator, an expert technical assistant with deep knowledge of developer tools and workflows."""
```

**Make it more conversational:**
```python
system = """You are Navigator, a friendly guide helping you master your favorite tools step-by-step."""
```

---

### 2. Adjust Response Style

**Current (Lines 151-156):**
```python
Key principles:
1. Ground answers in the provided page context and knowledge base
2. If you don't see relevant information, say so clearly
3. Be concise and actionable
4. Consider the user's current screen context to understand their objective
```

**Add more specificity:**
```python
Key principles:
1. ALWAYS cite sources using [Source N] references
2. Provide step-by-step instructions when possible
3. Include keyboard shortcuts and tips
4. Warn about common pitfalls
5. If uncertain, ask clarifying questions
6. Never hallucinate - only use provided knowledge
```

---

### 3. Customize Knowledge Formatting

**Current (Lines 161-162):**
```python
for i, chunk in enumerate(knowledge_chunks, 1):
    system += f"[Source {i}]\n{chunk.get('content', '')[:500]}...\n\n"
```

**Show more context per chunk:**
```python
for i, chunk in enumerate(knowledge_chunks, 1):
    system += f"[Source {i} - {chunk.get('source_type', 'docs')}]\n"
    system += f"{chunk.get('content', '')[:1000]}\n\n"  # Changed from 500 to 1000 chars
```

**Add source URLs:**
```python
for i, chunk in enumerate(knowledge_chunks, 1):
    system += f"[Source {i}]\n"
    system += f"URL: {chunk.get('source_url', 'N/A')}\n"
    system += f"{chunk.get('content', '')[:500]}...\n\n"
```

---

### 4. Enhance Page Context Understanding

**Current (Line 165):**
```python
system += f"\n\nCurrent page context:\n{context_text[:2000]}\n"
```

**Add structured context parsing:**
```python
# Parse structured context (assuming it includes headings, buttons, etc.)
system += f"\n\n=== CURRENT PAGE CONTEXT ===\n"
system += f"What you see on screen:\n{context_text[:2000]}\n"
system += f"\nAnalyze this context to understand:\n"
system += f"- What task is the user trying to accomplish?\n"
system += f"- What UI elements are available?\n"
system += f"- What's the current state of the page?\n"
```

---

### 5. Add Tool-Specific Instructions

**After line 162, add:**
```python
# Tool-specific guidance
if tool_name == "GitHub":
    system += "\nGitHub-specific tips:\n"
    system += "- Always mention if actions require permissions\n"
    system += "- Reference exact button/menu names from page context\n"
    system += "- Explain git concepts when relevant\n\n"
elif tool_name == "AWS":
    system += "\nAWS-specific tips:\n"
    system += "- Warn about cost implications\n"
    system += "- Mention security best practices\n"
    system += "- Reference AWS service names correctly\n\n"
# Add more tools...
```

---

### 6. Change Knowledge Retrieval Count

**Location:** Line 111 in `query_convex_knowledge()`

**Current:**
```python
async def query_convex_knowledge(tool_name: str, query: str, limit: int = 5):
```

**Retrieve more chunks for better context:**
```python
async def query_convex_knowledge(tool_name: str, query: str, limit: int = 10):
```

Then in line 228, change the call:
```python
knowledge_chunks = await query_convex_knowledge(tool_name, query, limit=10)
```

---

### 7. Add Citation Requirements

**After line 168, add:**
```python
user_prompt = f"\nUser question: {query}\n\n"
user_prompt += "Important: When referencing knowledge sources, cite them as [Source N].\n"
user_prompt += "Format your answer with:\n"
user_prompt += "1. Direct answer\n"
user_prompt += "2. Step-by-step guidance (if applicable)\n"
user_prompt += "3. Related tips\n\n"
user_prompt += "Your answer:"
```

---

### 8. Add Confidence Scoring

**Before return statement (line 170), add:**
```python
# Add confidence instruction
system += f"\n\nAt the end of your response, indicate confidence level:\n"
system += f"[Confidence: High/Medium/Low based on available knowledge]\n"
```

---

## Complete Example: Enhanced RAG Prompt

```python
def build_rag_prompt(query: str, tool_name: Optional[str], context_text: str, knowledge_chunks: list):
    """Enhanced RAG prompt with citations, structured output, and confidence scoring"""

    # Enhanced system prompt
    system = """You are Navigator, an expert technical assistant specializing in developer tools and workflows.

Core principles:
1. ALWAYS cite sources using [Source N] format
2. Provide step-by-step instructions when applicable
3. Include keyboard shortcuts and pro tips
4. Never hallucinate - only use provided knowledge
5. If information is missing, clearly state what you don't know
6. Understand user intent from page context
"""

    # Tool-specific knowledge with metadata
    if tool_name and knowledge_chunks:
        system += f"\n\n=== {tool_name.upper()} KNOWLEDGE BASE ===\n\n"

        for i, chunk in enumerate(knowledge_chunks, 1):
            source_type = chunk.get('source_type', 'docs')
            source_url = chunk.get('source_url', 'N/A')
            content = chunk.get('content', '')[:800]

            system += f"[Source {i} - {source_type}]\n"
            system += f"URL: {source_url}\n"
            system += f"{content}...\n\n"

        # Tool-specific guidance
        if tool_name == "GitHub":
            system += "\n💡 GitHub Tips: Reference exact UI elements, mention permission requirements, explain git concepts.\n"
        elif tool_name == "AWS":
            system += "\n💡 AWS Tips: Warn about costs, emphasize security, use correct service names.\n"

    # Enhanced page context
    system += f"\n\n=== CURRENT PAGE STATE ===\n"
    system += f"{context_text[:2500]}\n"
    system += f"\nFrom this context, infer:\n"
    system += f"• User's current task/objective\n"
    system += f"• Available UI elements and actions\n"
    system += f"• Current workflow state\n"

    # Structured response format
    user_prompt = f"\n\n=== USER QUESTION ===\n{query}\n\n"
    user_prompt += "=== YOUR RESPONSE ===\n"
    user_prompt += "Format:\n"
    user_prompt += "1. **Direct Answer** (cite sources as [Source N])\n"
    user_prompt += "2. **Step-by-Step Guide** (if applicable)\n"
    user_prompt += "3. **Pro Tips** (shortcuts, best practices)\n"
    user_prompt += "4. **Related Actions** (what to do next)\n\n"
    user_prompt += "[Confidence: High/Medium/Low]\n\n"
    user_prompt += "Begin your response:\n"

    return system + user_prompt
```

---

## Testing Your Changes

After editing `main.py`:

1. **Restart the server:**
   ```bash
   cd /home/user/mvp/backend/api_server
   # Stop current server (Ctrl+C)
   bash start.sh
   ```

2. **Test a query:**
   ```bash
   curl -X POST http://127.0.0.1:8000/chat \
     -H "Content-Type: application/json" \
     -d '{
       "query": "How do I create a pull request?",
       "tool_name": "GitHub",
       "context_text": "Current page: github.com/user/repo"
     }'
   ```

3. **Test in extension:**
   - Navigate to GitHub
   - Ask the same question
   - Verify new prompt style appears

---

## Advanced: Dynamic Prompts

For user-specific or context-adaptive prompts, add logic before building:

```python
def build_rag_prompt(query: str, tool_name: Optional[str], context_text: str, knowledge_chunks: list):
    # Detect query type
    is_how_to = query.lower().startswith(("how", "what", "when", "where"))
    is_troubleshooting = any(word in query.lower() for word in ["error", "not working", "broken", "issue"])

    # Adapt system prompt
    if is_troubleshooting:
        system = """You are Navigator in troubleshooting mode. Focus on:
        1. Diagnosing the problem
        2. Common causes
        3. Step-by-step fixes
        4. Prevention tips
        """
    elif is_how_to:
        system = """You are Navigator in tutorial mode. Focus on:
        1. Clear step-by-step instructions
        2. Prerequisites
        3. Expected outcomes
        4. What to do next
        """
    else:
        system = """You are Navigator in Q&A mode. Provide concise, accurate answers."""

    # Continue building prompt...
```

---

## Tips

- **Test incrementally**: Change one thing at a time
- **Monitor token usage**: Longer prompts = higher latency
- **Balance context vs specificity**: More context helps, but can dilute focus
- **Use examples**: Add few-shot examples for consistent formatting
- **Log prompts**: Add `print(system)` to debug what's sent to Ollama

---

## Related Files

- `main.py` (line 140-170) - Main prompt builder
- `main.py` (line 183) - Ollama model selection
- `main.py` (line 111-138) - Knowledge retrieval logic
- `tools_config.json` - Tool patterns and descriptions
