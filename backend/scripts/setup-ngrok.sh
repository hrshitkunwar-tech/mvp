#!/bin/bash

# Setup ngrok tunnels for Navigator services

echo "🌐 Navigator - ngrok Tunnel Setup"
echo ""
echo "This script helps expose your local services to n8n cloud"
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed"
    echo ""
    echo "Install ngrok:"
    echo "  brew install ngrok"
    echo "  OR download from https://ngrok.com/download"
    echo ""
    exit 1
fi

echo "✅ ngrok is installed"
echo ""

# Check if services are running
echo "🔍 Checking if services are running..."
echo ""

VISION_RUNNING=false
AGENT_RUNNING=false

if lsof -ti:3001 > /dev/null 2>&1; then
    echo "✅ Vision Service (3001) is running"
    VISION_RUNNING=true
else
    echo "❌ Vision Service (3001) is NOT running"
fi

if lsof -ti:3002 > /dev/null 2>&1; then
    echo "✅ Agent Service (3002) is running"
    AGENT_RUNNING=true
else
    echo "❌ Agent Service (3002) is NOT running"
fi

echo ""

if [ "$VISION_RUNNING" = false ] || [ "$AGENT_RUNNING" = false ]; then
    echo "⚠️  Please start your services first:"
    echo "   cd /Users/harshit/Downloads/Navigator_Ultimate_Blueprint/backend"
    echo "   ./scripts/start-all.sh"
    echo ""
    exit 1
fi

echo "🚀 Starting ngrok tunnels..."
echo ""
echo "This will open 2 terminal windows with ngrok tunnels."
echo "Keep these windows open while testing n8n cloud workflows."
echo ""

# Create a temporary script for each tunnel
cat > /tmp/ngrok-vision.sh << 'EOF'
#!/bin/bash
echo "🔗 Vision Service Tunnel"
echo ""
echo "Copy the HTTPS Forwarding URL below and use it in your n8n workflow"
echo "Replace http://localhost:3001 with this URL"
echo ""
ngrok http 3001
EOF

cat > /tmp/ngrok-agent.sh << 'EOF'
#!/bin/bash
echo "🔗 Agent Service Tunnel"
echo ""
echo "Copy the HTTPS Forwarding URL below and use it in your n8n workflow"
echo "Replace http://localhost:3002 with this URL"
echo ""
ngrok http 3002
EOF

chmod +x /tmp/ngrok-vision.sh /tmp/ngrok-agent.sh

echo "Opening terminal windows with ngrok tunnels..."
echo ""

# Open terminals based on OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    osascript -e 'tell application "Terminal" to do script "/tmp/ngrok-vision.sh"'
    osascript -e 'tell application "Terminal" to do script "/tmp/ngrok-agent.sh"'
else
    # Linux - try different terminal emulators
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- /tmp/ngrok-vision.sh &
        gnome-terminal -- /tmp/ngrok-agent.sh &
    elif command -v xterm &> /dev/null; then
        xterm -e /tmp/ngrok-vision.sh &
        xterm -e /tmp/ngrok-agent.sh &
    else
        echo "⚠️  Could not open terminals automatically"
        echo ""
        echo "Run these commands in separate terminals:"
        echo "  Terminal 1: ngrok http 3001"
        echo "  Terminal 2: ngrok http 3002"
        echo ""
    fi
fi

echo "✅ ngrok tunnels starting..."
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Wait for ngrok tunnels to start (2-3 seconds)"
echo "2. Copy the HTTPS Forwarding URLs from the new terminal windows"
echo "   - Example: https://abc123.ngrok.io"
echo ""
echo "3. In your n8n cloud workflow:"
echo "   - Open the 'Vision Service' node"
echo "   - Replace 'http://localhost:3001' with the Vision tunnel URL"
echo "   - Add '/interpret' at the end"
echo "   - Example: https://abc123.ngrok.io/interpret"
echo ""
echo "4. Save and activate your workflow"
echo ""
echo "5. Test with:"
echo "   curl -X POST <YOUR-N8N-WEBHOOK-URL> -d @test/sample-event.json"
echo ""
echo "⚠️  Keep the ngrok terminal windows open while testing!"
echo "   Closing them will stop the tunnels."
echo ""
