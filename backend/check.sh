#!/bin/bash

echo "🔍 Checking Services..."
echo ""

lsof -i :5678 >/dev/null 2>&1 && echo "✅ n8n (5678)" || echo "❌ n8n (5678)"
lsof -i :3001 >/dev/null 2>&1 && echo "✅ Vision (3001)" || echo "❌ Vision (3001)"
lsof -i :3002 >/dev/null 2>&1 && echo "✅ Agent (3002)" || echo "❌ Agent (3002)"
lsof -i :3003 >/dev/null 2>&1 && echo "✅ Extension (3003)" || echo "❌ Extension (3003)"

echo ""
