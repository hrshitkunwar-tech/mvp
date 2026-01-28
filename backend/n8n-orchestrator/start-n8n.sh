#!/bin/bash

# Navigator n8n Orchestrator Startup Script

echo "🚀 Starting Navigator n8n Orchestrator..."
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Environment variables loaded from .env"
else
    echo "⚠️  No .env file found, using .env.example"
    cp .env.example .env
    echo "📝 Created .env file - please configure it"
fi
echo ""

# Check if n8n is installed
if ! command -v n8n &> /dev/null; then
    echo "📦 Installing n8n..."
    npm install
    echo "✅ n8n installed"
else
    echo "✅ n8n is already installed"
fi
echo ""

# Create .n8n directory if it doesn't exist
if [ ! -d ".n8n" ]; then
    mkdir -p .n8n
    echo "📁 Created .n8n data directory"
fi
echo ""

# Set environment variables for n8n
export N8N_PORT=${N8N_PORT:-5678}
export N8N_PROTOCOL=${N8N_PROTOCOL:-http}
export N8N_HOST=${N8N_HOST:-localhost}
export WEBHOOK_URL=${WEBHOOK_URL:-http://localhost:5678}
export N8N_USER_FOLDER="$(pwd)/.n8n"

echo "🔧 n8n Configuration:"
echo "   Port: $N8N_PORT"
echo "   Protocol: $N8N_PROTOCOL"
echo "   Host: $N8N_HOST"
echo "   Webhook URL: $WEBHOOK_URL"
echo "   Data Folder: $N8N_USER_FOLDER"
echo ""

echo "🌐 Starting n8n on http://$N8N_HOST:$N8N_PORT"
echo ""
echo "📋 After n8n starts:"
echo "   1. Open http://localhost:5678 in your browser"
echo "   2. Create an account (first time only)"
echo "   3. Import workflows from ./workflows/"
echo "   4. Configure environment variables in each workflow"
echo ""

# Start n8n
n8n start
