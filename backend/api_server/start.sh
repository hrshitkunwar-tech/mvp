#!/bin/bash
# Navigator RAG API — start as background daemon
# Usage: ./start.sh          (start)
#        ./start.sh stop     (stop)
#        ./start.sh restart  (restart)
#        ./start.sh status   (check)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="/tmp/navigator-api.pid"
LOG_FILE="/tmp/navigator-api.log"

stop_server() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            echo "Stopping Navigator API (PID $PID)..."
            kill "$PID"
            rm -f "$PID_FILE"
            echo "Stopped."
        else
            echo "Process $PID not running. Cleaning up."
            rm -f "$PID_FILE"
        fi
    else
        # Fallback: kill any uvicorn on port 8000
        pkill -f "uvicorn main:app" 2>/dev/null && echo "Stopped." || echo "Nothing running."
    fi
}

start_server() {
    cd "$SCRIPT_DIR" || exit 1

    if [ ! -d "venv" ]; then
        echo "Creating virtual environment..."
        python3 -m venv venv
    fi

    source venv/bin/activate
    pip install -q -r requirements.txt

    # Kill any existing instance first
    stop_server 2>/dev/null

    echo "Starting Navigator RAG API..."

    # True daemon: double-fork so it outlives the shell
    python3 -c "
import os, sys
pid = os.fork()
if pid > 0:
    print('Navigator API started, PID:', pid)
    sys.exit(0)
os.setsid()
pid2 = os.fork()
if pid2 > 0:
    sys.exit(0)
# Redirect stdio to log
import sys
sys.stdout = open('$LOG_FILE', 'a')
sys.stderr = sys.stdout
import uvicorn
from main import app
uvicorn.run(app, host='127.0.0.1', port=8000, log_level='info')
" &

    sleep 2

    # Verify
    if curl -s http://127.0.0.1:8000/ > /dev/null 2>&1; then
        PID=$(lsof -ti :8000 2>/dev/null | head -1)
        echo "$PID" > "$PID_FILE"
        echo "✓ Running on http://127.0.0.1:8000 (PID $PID)"
    else
        echo "✗ Server failed to start. Check $LOG_FILE"
        exit 1
    fi
}

case "${1:-start}" in
    stop)    stop_server ;;
    restart) stop_server; sleep 1; start_server ;;
    status)
        if curl -s http://127.0.0.1:8000/ > /dev/null 2>&1; then
            echo "✓ Navigator API running on port 8000"
            curl -s http://127.0.0.1:8000/ | python3 -m json.tool 2>/dev/null
        else
            echo "✗ Navigator API not running"
        fi
        ;;
    *)       start_server ;;
esac
