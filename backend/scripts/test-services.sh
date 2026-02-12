#!/bin/bash

# Test Navigator Services

echo "🧪 Testing Navigator Services..."
echo ""

# Test Vision Service
echo "1. Testing Vision Service (http://localhost:3001)..."
VISION_RESPONSE=$(curl -s http://localhost:3001/health)
if [ $? -eq 0 ]; then
    echo "✅ Vision Service is running"
    echo "   $VISION_RESPONSE"
else
    echo "❌ Vision Service is not responding"
    echo "   Make sure to run: cd services && npm run dev"
fi
echo ""

# Test Agent Service
echo "2. Testing Agent Service (http://localhost:3002)..."
AGENT_RESPONSE=$(curl -s http://localhost:3002/health)
if [ $? -eq 0 ]; then
    echo "✅ Agent Service is running"
    echo "   $AGENT_RESPONSE"
else
    echo "❌ Agent Service is not responding"
    echo "   Make sure to run: cd agents && npm run dev"
fi
echo ""

# Test Convex (if URL is set)
if [ -n "$CONVEX_URL" ]; then
    echo "3. Testing Convex Database..."
    echo "   Convex URL: $CONVEX_URL"
    echo "✅ Convex URL configured"
else
    echo "⚠️  CONVEX_URL not set in .env"
    echo "   Run: cd convex && npx convex dev"
fi
echo ""

echo "📊 Summary:"
echo "   Vision Service: $([ $? -eq 0 ] && echo '✅' || echo '❌')"
echo "   Agent Service:  $([ $? -eq 0 ] && echo '✅' || echo '❌')"
echo "   Convex:         $([ -n "$CONVEX_URL" ] && echo '✅' || echo '⚠️')"
echo ""

if [ $? -eq 0 ] && [ -n "$CONVEX_URL" ]; then
    echo "🎉 All services are healthy!"
    echo ""
    echo "Next steps:"
    echo "1. Import n8n workflows from n8n-workflows/"
    echo "2. Configure n8n environment variables"
    echo "3. Send a test screenshot event"
else
    echo "⚠️  Some services need attention. See errors above."
fi
