#!/bin/bash

# Navigator n8n Quick Start Script
# This script sets up and starts n8n for the Navigator automation pipelines

set -e

echo "============================================"
echo "Navigator n8n Quick Start"
echo "============================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if n8n is installed
if ! command -v n8n &> /dev/null; then
    echo -e "${YELLOW}n8n not found. Installing...${NC}"
    npm install -g n8n
    echo -e "${GREEN}✓ n8n installed${NC}"
else
    echo -e "${GREEN}✓ n8n is already installed${NC}"
fi

# Create necessary directories
echo ""
echo "Creating directories..."
mkdir -p n8n/logs
mkdir -p n8n/workflows
mkdir -p ~/.n8n
echo -e "${GREEN}✓ Directories created${NC}"

# Check for .env file
if [ ! -f "n8n/.env" ]; then
    echo ""
    echo -e "${YELLOW}⚠ No .env file found${NC}"
    echo "Creating .env from template..."
    cp n8n/.env.template n8n/.env
    echo -e "${YELLOW}⚠ Please edit n8n/.env and add your API keys${NC}"
    echo ""
    read -p "Press Enter to continue after editing .env file..."
fi

# Load environment variables
if [ -f "n8n/.env" ]; then
    export $(cat n8n/.env | grep -v '^#' | xargs)
    echo -e "${GREEN}✓ Environment variables loaded${NC}"
fi

# Check for required API keys
echo ""
echo "Checking configuration..."
if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "your_openai_api_key_here" ]; then
    echo -e "${RED}✗ OpenAI API key not configured${NC}"
    echo "Please set OPENAI_API_KEY in n8n/.env"
    exit 1
fi
echo -e "${GREEN}✓ OpenAI API key configured${NC}"

if [ -z "$CONVEX_URL" ]; then
    echo -e "${RED}✗ Convex URL not configured${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Convex URL configured${NC}"

# Display configuration
echo ""
echo "============================================"
echo "Configuration Summary"
echo "============================================"
echo "n8n URL: http://${N8N_HOST}:${N8N_PORT}"
echo "Webhook URL: ${WEBHOOK_URL}"
echo "Convex URL: ${CONVEX_URL}"
echo "Frontend URL: ${NAVIGATOR_FRONTEND_URL}"
echo "Database: ${DB_SQLITE_DATABASE}"
echo "============================================"
echo ""

# Ask user if they want to start n8n
read -p "Start n8n now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Starting n8n..."
    echo -e "${GREEN}Access n8n at: http://${N8N_HOST}:${N8N_PORT}${NC}"
    echo ""
    echo "To import workflows:"
    echo "1. Open http://${N8N_HOST}:${N8N_PORT}"
    echo "2. Click 'Workflows' → 'Import from File'"
    echo "3. Select files from: n8n/workflows/"
    echo ""
    echo "Press Ctrl+C to stop n8n"
    echo ""
    
    # Start n8n
    cd n8n
    n8n start
else
    echo ""
    echo "To start n8n manually, run:"
    echo "  cd n8n && n8n start"
    echo ""
fi
