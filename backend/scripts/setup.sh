#!/bin/bash

# Navigator Backend Setup Script

echo "🚀 Setting up Navigator Backend..."
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ required. Current version: $(node -v)"
    exit 1
fi
echo "✅ Node.js $(node -v) detected"
echo ""

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install
echo ""

# Install service dependencies
echo "📦 Installing service dependencies..."
cd services && npm install && cd ..
cd agents && npm install && cd ..
cd convex && npm install && cd ..
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env and add your API keys"
else
    echo "✅ .env file already exists"
fi
echo ""

# Check for required API keys
echo "🔑 Checking environment variables..."
source .env 2>/dev/null || true

if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "sk-..." ]; then
    echo "⚠️  OPENAI_API_KEY not configured in .env"
    echo "   Please add your OpenAI API key to .env"
else
    echo "✅ OPENAI_API_KEY configured"
fi
echo ""

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env and add your API keys"
echo "2. Run 'cd convex && npx convex dev' to start Convex"
echo "3. Run 'npm run dev' to start all services"
echo ""
echo "See QUICKSTART.md for detailed instructions."
