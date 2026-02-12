#!/bin/bash
# Quick start script for Navigator RAG API

echo "======================================"
echo "Navigator RAG API Server"
echo "======================================"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -q -r requirements.txt

# Check if Ollama is running
echo "Checking Ollama connection..."
if curl -s http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
    echo "✓ Ollama is running"
else
    echo "⚠ Ollama not detected. Make sure to run 'ollama serve'"
fi

# Start server
echo ""
echo "Starting Navigator RAG API..."
echo "======================================"
python main.py
