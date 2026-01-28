#!/bin/bash

# Navigator - Start All Services
# Launches Vision, Agents, Convex, and n8n in parallel

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                  Navigator Backend System                    ║"
echo "║              Starting All Services in Parallel               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check if running from correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the backend directory"
    echo "   cd /Users/harshit/Downloads/Navigator_Ultimate_Blueprint/backend"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check API keys
if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "sk-..." ]; then
    echo "⚠️  WARNING: OPENAI_API_KEY not configured in .env"
    echo "   Services will start but vision features won't work"
    echo ""
fi

# Function to check if port is in use
check_port() {
    lsof -ti:$1 > /dev/null 2>&1
}

# Kill existing processes on our ports
echo "🧹 Cleaning up existing processes..."
for port in 3001 3002 5678; do
    if check_port $port; then
        echo "   Killing process on port $port..."
        lsof -ti:$port | xargs kill -9 2>/dev/null
    fi
done
echo ""

# Create log directory
mkdir -p logs

echo "🚀 Starting services..."
echo ""

# Start Vision Service
echo "📸 Starting Vision Service (Port 3001)..."
cd services
npm run dev > ../logs/vision.log 2>&1 &
VISION_PID=$!
cd ..
echo "   PID: $VISION_PID"
echo "   Log: logs/vision.log"
sleep 2

# Start Agent Service
echo "🤖 Starting Agent Service (Port 3002)..."
cd agents
npm run dev > ../logs/agents.log 2>&1 &
AGENTS_PID=$!
cd ..
echo "   PID: $AGENTS_PID"
echo "   Log: logs/agents.log"
sleep 2

# Start Convex
echo "💾 Starting Convex Database..."
cd convex
npx convex dev > ../logs/convex.log 2>&1 &
CONVEX_PID=$!
cd ..
echo "   PID: $CONVEX_PID"
echo "   Log: logs/convex.log"
sleep 3

# Start n8n
echo "🔄 Starting n8n Orchestrator (Port 5678)..."
cd n8n-orchestrator
./start-n8n.sh > ../logs/n8n.log 2>&1 &
N8N_PID=$!
cd ..
echo "   PID: $N8N_PID"
echo "   Log: logs/n8n.log"
echo ""

# Wait for services to start
echo "⏳ Waiting for services to initialize..."
sleep 5

# Check if services are running
echo ""
echo "🔍 Checking service health..."
echo ""

# Check Vision Service
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Vision Service: Running"
else
    echo "❌ Vision Service: Not responding (check logs/vision.log)"
fi

# Check Agent Service
if curl -s http://localhost:3002/health > /dev/null 2>&1; then
    echo "✅ Agent Service: Running"
else
    echo "❌ Agent Service: Not responding (check logs/agents.log)"
fi

# Check n8n
if curl -s http://localhost:5678/healthz > /dev/null 2>&1; then
    echo "✅ n8n Orchestrator: Running"
else
    echo "❌ n8n Orchestrator: Not responding (check logs/n8n.log)"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    🎉 All Services Started!                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Service URLs:"
echo "   Vision Service:   http://localhost:3001"
echo "   Agent Service:    http://localhost:3002"
echo "   n8n Dashboard:    http://localhost:5678"
echo ""
echo "📊 Process IDs:"
echo "   Vision:  $VISION_PID"
echo "   Agents:  $AGENTS_PID"
echo "   Convex:  $CONVEX_PID"
echo "   n8n:     $N8N_PID"
echo ""
echo "📝 Logs:"
echo "   tail -f logs/vision.log   # Vision service"
echo "   tail -f logs/agents.log   # Agent service"
echo "   tail -f logs/convex.log   # Convex database"
echo "   tail -f logs/n8n.log      # n8n orchestrator"
echo ""
echo "🛑 To stop all services:"
echo "   kill $VISION_PID $AGENTS_PID $CONVEX_PID $N8N_PID"
echo "   Or use: ./scripts/stop-all.sh"
echo ""
echo "📋 Next Steps:"
echo "   1. Open http://localhost:5678 to access n8n"
echo "   2. Create an n8n account (first time only)"
echo "   3. Import workflows: npm run import:workflows"
echo "   4. Configure workflow environment variables"
echo "   5. Activate workflows and test"
echo ""

# Save PIDs to file for stop script
echo "$VISION_PID $AGENTS_PID $CONVEX_PID $N8N_PID" > .pids

# Keep script running and show logs
echo "Press Ctrl+C to stop all services and exit"
echo ""

# Trap Ctrl+C
trap 'echo ""; echo "🛑 Stopping all services..."; kill $VISION_PID $AGENTS_PID $CONVEX_PID $N8N_PID 2>/dev/null; rm -f .pids; echo "✅ All services stopped"; exit 0' INT

# Tail all logs in parallel
tail -f logs/*.log
