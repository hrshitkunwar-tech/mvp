#!/bin/bash

# Navigator - Stop All Services

echo "🛑 Stopping Navigator Backend Services..."
echo ""

# Check if PID file exists
if [ -f .pids ]; then
    PIDS=$(cat .pids)
    echo "📋 Found running services (PIDs: $PIDS)"
    echo ""

    for pid in $PIDS; do
        if ps -p $pid > /dev/null 2>&1; then
            echo "   Stopping PID $pid..."
            kill $pid 2>/dev/null
        fi
    done

    rm -f .pids
    echo ""
    echo "✅ All services stopped"
else
    echo "⚠️  No PID file found. Stopping by port..."
    echo ""

    # Kill by port
    for port in 3001 3002 5678; do
        if lsof -ti:$port > /dev/null 2>&1; then
            echo "   Stopping service on port $port..."
            lsof -ti:$port | xargs kill -9 2>/dev/null
        fi
    done

    # Kill Convex dev process
    pkill -f "convex dev" 2>/dev/null

    echo ""
    echo "✅ All services stopped"
fi

echo ""
echo "📝 To restart services:"
echo "   ./scripts/start-all.sh"
