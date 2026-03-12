#!/bin/bash

# APHELION Backend Startup Script
# For desktop app integration

echo "========================================="
echo "APHELION Options Platform - Backend Server"
echo "========================================="
echo ""
echo "Starting backend server for desktop app..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v18 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be 18 or higher. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

echo "✅ npm $(npm -v) detected"

# Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ Created .env from template"
        echo "⚠️  Please edit .env file with your configuration"
    else
        echo "❌ .env.example not found. Cannot create .env file."
        exit 1
    fi
fi

echo "✅ Environment configuration ready"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi

# Build TypeScript if dist doesn't exist
if [ ! -d "dist" ]; then
    echo "🔨 Building TypeScript..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ Failed to build TypeScript"
        exit 1
    fi
    echo "✅ TypeScript built successfully"
else
    echo "✅ Already built"
fi

echo ""
echo "========================================="
echo "Starting Server..."
echo "========================================="
echo ""
echo "API Server: http://localhost:3000"
echo "API Docs:   http://localhost:3000/api-docs"
echo "WebSocket:  ws://localhost:3001/ws"
echo "Health:     http://localhost:3000/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server
npm start