#!/bin/bash

# Navigator MVP - Quick Start Script
# This script starts the FastAPI backend server

clear
echo "===================================="
echo "Navigator Backend Server Starting..."
echo "===================================="
echo ""

# Check Python installation
echo "Checking requirements..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found!"
    echo "   Please install Python 3.8 or higher"
    echo "   Visit: https://www.python.org/downloads/"
    exit 1
fi

PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
echo "✓ Python found ($PYTHON_VERSION)"

# Navigate to backend directory
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo ""
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment ready"
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo ""
echo "Installing dependencies..."
pip install -q -r requirements.txt 2>&1 | grep -v "already satisfied" | grep -v "Requirement already"
if [ $? -eq 0 ]; then
    echo "✓ Dependencies installed"
else
    echo "✓ Dependencies verified"
fi

# Check if Ollama is running
echo ""
echo "Checking Ollama connection..."
if curl -s http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
    echo "✓ Ollama is running (port 11434)"
    OLLAMA_MODELS=$(curl -s http://127.0.0.1:11434/api/tags | python3 -c "import sys, json; data=json.load(sys.stdin); print(', '.join([m['name'] for m in data.get('models', [])]))" 2>/dev/null)
    if [ ! -z "$OLLAMA_MODELS" ]; then
        echo "  Available models: $OLLAMA_MODELS"
    fi
else
    echo "⚠️  Ollama not detected (optional)"
    echo "   The extension will work but responses may be limited"
    echo "   To install: https://ollama.ai"
    echo "   To start: ollama serve"
fi

# Copy .env.example to .env if it doesn't exist
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo ""
    echo "✓ Configuration file created (.env)"
fi

echo ""
echo "===================================="
echo "Starting FastAPI server..."
echo "===================================="
echo ""

# Start the server
python3 main.py &
SERVER_PID=$!

# Wait a moment for server to start
sleep 2

# Check if server is running
if curl -s http://127.0.0.1:8000 > /dev/null 2>&1; then
    echo ""
    echo "===================================="
    echo "✅ Backend is ready!"
    echo "===================================="
    echo ""
    echo "Server running on: http://127.0.0.1:8000"
    echo "Process ID: $SERVER_PID"
    echo ""
    echo "===================================="
    echo "Next Steps:"
    echo "===================================="
    echo ""
    echo "1. Open Chrome and go to:"
    echo "   chrome://extensions/"
    echo ""
    echo "2. Enable 'Developer mode' (toggle top-right)"
    echo ""
    echo "3. Click 'Load unpacked' and select:"
    echo "   $(cd .. && pwd)/extension/"
    echo ""
    echo "4. Navigate to GitHub, AWS, or any supported site"
    echo ""
    echo "5. Click the Navigator icon in Chrome toolbar"
    echo ""
    echo "6. Ask questions and see responses stream!"
    echo ""
    echo "===================================="
    echo ""
    echo "📖 For detailed instructions, see:"
    echo "   $(cd .. && pwd)/START_HERE.md"
    echo ""
    echo "🛑 To stop the server:"
    echo "   Press Ctrl+C"
    echo ""
    echo "===================================="
    echo ""

    # Keep server running and show logs
    wait $SERVER_PID
else
    echo ""
    echo "❌ Server failed to start"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check if port 8000 is already in use:"
    echo "   lsof -i :8000"
    echo ""
    echo "2. Try running manually:"
    echo "   cd backend && source venv/bin/activate && python3 main.py"
    echo ""
    echo "3. Check the logs above for errors"
    echo ""
    kill $SERVER_PID 2>/dev/null
    exit 1
fi
