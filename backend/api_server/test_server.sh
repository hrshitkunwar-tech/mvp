#!/bin/bash
# Test script for Navigator RAG API

echo "======================================"
echo "Testing Navigator RAG API Server"
echo "======================================"

BASE_URL="http://127.0.0.1:8000"

# Test 1: Health check
echo ""
echo "Test 1: Health Check"
echo "--------------------"
response=$(curl -s $BASE_URL)
if echo "$response" | grep -q "online"; then
    echo "✓ Health check passed"
else
    echo "✗ Health check failed"
    echo "Response: $response"
fi

# Test 2: Tool detection - GitHub
echo ""
echo "Test 2: Tool Detection (GitHub)"
echo "-------------------------------"
response=$(curl -s -X POST $BASE_URL/detect-tool \
    -H "Content-Type: application/json" \
    -d '{"url": "https://github.com/user/repo", "title": "GitHub Repo"}')
if echo "$response" | grep -q "GitHub"; then
    echo "✓ GitHub detection passed"
    echo "Response: $response"
else
    echo "✗ GitHub detection failed"
    echo "Response: $response"
fi

# Test 3: Tool detection - Unknown site
echo ""
echo "Test 3: Tool Detection (Unknown)"
echo "--------------------------------"
response=$(curl -s -X POST $BASE_URL/detect-tool \
    -H "Content-Type: application/json" \
    -d '{"url": "https://example.com", "title": "Example"}')
if echo "$response" | grep -q '"detected":false'; then
    echo "✓ Unknown site detection passed"
    echo "Response: $response"
else
    echo "✗ Unknown site detection failed"
    echo "Response: $response"
fi

# Test 4: Generic chat query
echo ""
echo "Test 4: Generic Chat Query"
echo "--------------------------"
echo "Sending: 'What is Python?'"
curl -s -X POST $BASE_URL/chat \
    -H "Content-Type: application/json" \
    -d '{
        "query": "What is Python?",
        "url": "https://example.com",
        "context_text": "Example page"
    }' | head -c 200
echo ""
echo "✓ Chat endpoint responding (showing first 200 chars)"

# Test 5: Tool-specific chat query
echo ""
echo ""
echo "Test 5: Tool-Specific Query (GitHub)"
echo "------------------------------------"
echo "Sending: 'How do I create a pull request?'"
curl -s -X POST $BASE_URL/chat \
    -H "Content-Type: application/json" \
    -d '{
        "query": "How do I create a pull request?",
        "tool_name": "GitHub",
        "url": "https://github.com/user/repo",
        "context_text": "Repository page with branches and commits"
    }' | head -c 200
echo ""
echo "✓ Tool-specific chat responding (showing first 200 chars)"

echo ""
echo ""
echo "======================================"
echo "All tests completed!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Install the extension in Chrome"
echo "2. Navigate to a supported tool page"
echo "3. Open the Navigator side panel"
echo "4. Ask questions about the page"
